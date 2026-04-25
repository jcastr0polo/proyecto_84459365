'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Link as LinkIcon } from 'lucide-react';
import ScoreInput from '@/components/grades/ScoreInput';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface GradeRow {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attachmentsCount: number;
  linksCount: number;
  isLate: boolean;
  submittedAt: string;
  version: number;
  existingGradeId?: string;
  score: number | null;
  feedback: string;
}

interface GradeTableProps {
  rows: GradeRow[];
  activityId: string;
  courseId: string;
  maxScore: number;
  onSave: (row: GradeRow) => Promise<void>;
  onSaveAll: (rows: GradeRow[]) => Promise<void>;
  saving: boolean;
}

/**
 * GradeTable — Rapid grading table (spreadsheet-like)
 * Tab key flows between score inputs
 * Inline score + feedback editing
 * Batch save all changes
 */
export default function GradeTable({
  rows: initialRows,
  maxScore,
  onSaveAll,
  saving,
}: GradeTableProps) {
  const [rows, setRows] = useState<GradeRow[]>(initialRows);
  const scoreRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track which rows have been modified
  const [modified, setModified] = useState<Set<number>>(new Set());

  // Sync rows from parent when they change (e.g. after reloadGrades)
  useEffect(() => {
    setRows(initialRows);
    setModified(new Set());
  }, [initialRows]);

  const updateRow = useCallback((index: number, field: 'score' | 'feedback', value: number | null | string) => {
    setRows((prev) => {
      const next = [...prev];
      if (field === 'score') {
        next[index] = { ...next[index], score: value as number | null };
      } else {
        next[index] = { ...next[index], feedback: value as string };
      }
      return next;
    });
    setModified((prev) => new Set(prev).add(index));
  }, []);

  const handleTab = useCallback((currentIndex: number) => {
    const next = currentIndex + 1;
    if (next < scoreRefs.current.length) {
      const el = scoreRefs.current[next];
      if (el) {
        const input = el.querySelector('input');
        input?.focus();
      }
    }
  }, []);

  const modifiedRows = rows.filter((_, i) => modified.has(i));
  const gradedCount = rows.filter((r) => r.score !== null).length;

  return (
    <div>
      {/* Counter bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-sm text-muted">
          <span className="text-cyan-400 font-semibold">{gradedCount}</span> /{' '}
          <span className="text-foreground/80">{rows.length}</span> calificados
        </p>
        <div className="flex items-center gap-2">
          {modified.size > 0 && (
            <span className="text-xs text-amber-400">
              {modified.size} cambio{modified.size !== 1 ? 's' : ''} sin guardar
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-foreground/[0.08]">
        <table className="w-full text-sm text-left">
          <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06]">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">#</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Estudiante</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted text-center">Entrega</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted text-center">Archivos</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted text-center">
                Nota <span className="text-subtle normal-case">/ {maxScore}</span>
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Feedback</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, idx) => (
              <tr
                key={row.submissionId}
                className={`
                  hover:bg-foreground/[0.02] transition-colors
                  ${modified.has(idx) ? 'bg-cyan-500/[0.03]' : ''}
                `}
              >
                {/* # */}
                <td className="px-4 py-3 text-xs text-subtle tabular-nums">{idx + 1}</td>

                {/* Estudiante */}
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground/90 font-medium">{row.studentName}</p>
                  <p className="text-[11px] text-subtle">{row.studentEmail}</p>
                </td>

                {/* Entrega info */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs text-muted">v{row.version}</span>
                    {row.isLate && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                        Tardía
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-subtle mt-0.5">
                    {new Date(row.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </p>
                </td>

                {/* Archivos / Enlaces */}
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-muted flex items-center justify-center gap-1">
                    {row.attachmentsCount > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{row.attachmentsCount}</span>}
                    {row.linksCount > 0 && <span className="flex items-center gap-0.5"><LinkIcon className="w-3 h-3" />{row.linksCount}</span>}
                    {row.attachmentsCount === 0 && row.linksCount === 0 && '—'}
                  </span>
                </td>

                {/* Score input */}
                <td className="px-4 py-3">
                  <div className="flex justify-center" ref={(el) => { scoreRefs.current[idx] = el; }}>
                    <ScoreInput
                      value={row.score}
                      maxScore={maxScore}
                      onChange={(v) => updateRow(idx, 'score', v)}
                      onTab={() => handleTab(idx)}
                    />
                  </div>
                </td>

                {/* Feedback textarea */}
                <td className="px-4 py-3">
                  <textarea
                    value={row.feedback}
                    onChange={(e) => updateRow(idx, 'feedback', e.target.value)}
                    placeholder="Retroalimentación..."
                    rows={1}
                    className="w-full min-w-[160px] px-2.5 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground/80 placeholder:text-faint outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 resize-y"
                  />
                </td>

                {/* Estado */}
                <td className="px-4 py-3 text-center">
                  {row.score !== null ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      ✓ Calificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/10 text-subtle border border-foreground/10">
                      Pendiente
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between mt-4 p-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]">
        <p className="text-xs text-subtle">
          Usa <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-muted text-[10px] font-mono">Tab</kbd> o{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-muted text-[10px] font-mono">Enter</kbd> para avanzar rápidamente
        </p>
        <button
          onClick={() => onSaveAll(modifiedRows.length > 0 ? modifiedRows : rows.filter((r) => r.score !== null))}
          disabled={saving || (modifiedRows.length === 0 && gradedCount === 0)}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : (
            <>Guardar {modifiedRows.length > 0 ? `(${modifiedRows.length})` : 'todo'}</>
          )}
        </button>
      </div>
    </div>
  );
}

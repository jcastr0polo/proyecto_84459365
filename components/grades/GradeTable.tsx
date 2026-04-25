'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Paperclip, Link as LinkIcon } from 'lucide-react';
import ScoreInput from '@/components/grades/ScoreInput';
import SearchInput from '@/components/ui/SearchInput';
import Pagination, { usePagination } from '@/components/ui/Pagination';

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
 * GradeTable — Rapid grading with desktop table + mobile cards
 * Features: search, pagination, tab-key flow, batch save
 */
export default function GradeTable({
  rows: initialRows,
  maxScore,
  onSaveAll,
  saving,
}: GradeTableProps) {
  const [rows, setRows] = useState<GradeRow[]>(initialRows);
  const [search, setSearch] = useState('');
  const scoreRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track which rows have been modified (by submissionId for stability)
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());

  // Sync rows from parent when they change (e.g. after reloadGrades)
  useEffect(() => {
    setRows(initialRows);
    setModifiedIds(new Set());
  }, [initialRows]);

  const updateRow = useCallback((submissionId: string, field: 'score' | 'feedback', value: number | null | string) => {
    setRows((prev) => prev.map((r) => {
      if (r.submissionId !== submissionId) return r;
      return field === 'score'
        ? { ...r, score: value as number | null }
        : { ...r, feedback: value as string };
    }));
    setModifiedIds((prev) => new Set(prev).add(submissionId));
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

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.studentName.toLowerCase().includes(q) ||
      r.studentEmail.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Pagination
  const { page, setPage, totalPages, paginated, totalItems, pageSize } = usePagination(filtered, 15);

  const modifiedRows = rows.filter((r) => modifiedIds.has(r.submissionId));
  const gradedCount = rows.filter((r) => r.score !== null).length;

  return (
    <div>
      {/* Toolbar: counter + search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-1">
        <p className="text-sm text-muted">
          <span className="text-cyan-400 font-semibold">{gradedCount}</span> /{' '}
          <span className="text-foreground/80">{rows.length}</span> calificados
          {modifiedIds.size > 0 && (
            <span className="text-xs text-amber-400 ml-3">
              {modifiedIds.size} sin guardar
            </span>
          )}
        </p>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar estudiante..."
          className="w-full sm:w-64"
        />
      </div>

      {/* ─── Desktop Table (hidden on mobile) ─── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-foreground/[0.08]">
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
            {paginated.map((row, idx) => {
              const globalIdx = (page - 1) * pageSize + idx;
              return (
                <tr
                  key={row.submissionId}
                  className={`hover:bg-foreground/[0.02] transition-colors ${modifiedIds.has(row.submissionId) ? 'bg-cyan-500/[0.03]' : ''}`}
                >
                  <td className="px-4 py-3 text-xs text-subtle tabular-nums">{globalIdx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground/90 font-medium">{row.studentName}</p>
                    <p className="text-[11px] text-subtle">{row.studentEmail}</p>
                  </td>
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
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted flex items-center justify-center gap-1">
                      {row.attachmentsCount > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{row.attachmentsCount}</span>}
                      {row.linksCount > 0 && <span className="flex items-center gap-0.5"><LinkIcon className="w-3 h-3" />{row.linksCount}</span>}
                      {row.attachmentsCount === 0 && row.linksCount === 0 && '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center" ref={(el) => { scoreRefs.current[globalIdx] = el; }}>
                      <ScoreInput
                        value={row.score}
                        maxScore={maxScore}
                        onChange={(v) => updateRow(row.submissionId, 'score', v)}
                        onTab={() => handleTab(globalIdx)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={row.feedback}
                      onChange={(e) => updateRow(row.submissionId, 'feedback', e.target.value)}
                      placeholder="Retroalimentación..."
                      rows={1}
                      className="w-full min-w-[160px] px-2.5 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground/80 placeholder:text-faint outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 resize-y"
                    />
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile Cards (visible only on mobile) ─── */}
      <div className="md:hidden space-y-3">
        {paginated.map((row) => (
          <div
            key={row.submissionId}
            className={`rounded-xl border p-4 space-y-3 transition-colors ${
              modifiedIds.has(row.submissionId)
                ? 'border-cyan-500/30 bg-cyan-500/[0.03]'
                : 'border-foreground/[0.08] bg-foreground/[0.02]'
            }`}
          >
            {/* Student header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                  {row.studentName.split(',').map(s => s.trim()[0]).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/90 truncate">{row.studentName}</p>
                  <p className="text-[11px] text-subtle truncate">{row.studentEmail}</p>
                </div>
              </div>
              {row.score !== null ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                  ✓
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/10 text-subtle border border-foreground/10 shrink-0">
                  —
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-[11px] text-subtle">
              <span>v{row.version}</span>
              <span>{new Date(row.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
              {row.isLate && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                  Tardía
                </span>
              )}
              {row.attachmentsCount > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{row.attachmentsCount}</span>}
              {row.linksCount > 0 && <span className="flex items-center gap-0.5"><LinkIcon className="w-3 h-3" />{row.linksCount}</span>}
            </div>

            {/* Score input — full width on mobile */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted shrink-0">Nota / {maxScore}</label>
              <div className="flex-1">
                <ScoreInput
                  value={row.score}
                  maxScore={maxScore}
                  onChange={(v) => updateRow(row.submissionId, 'score', v)}
                />
              </div>
            </div>

            {/* Feedback */}
            <textarea
              value={row.feedback}
              onChange={(e) => updateRow(row.submissionId, 'feedback', e.target.value)}
              placeholder="Retroalimentación..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground/80 placeholder:text-faint outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 resize-y"
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />

      {/* Save bar */}
      <div className="flex items-center justify-between mt-4 p-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]">
        <p className="text-xs text-subtle hidden sm:block">
          Usa <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-muted text-[10px] font-mono">Tab</kbd> para avanzar
        </p>
        <p className="text-xs text-subtle sm:hidden">
          {gradedCount} / {rows.length} calificados
        </p>
        <button
          onClick={() => onSaveAll(modifiedRows.length > 0 ? modifiedRows : rows.filter((r) => r.score !== null))}
          disabled={saving || (modifiedRows.length === 0 && gradedCount === 0)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

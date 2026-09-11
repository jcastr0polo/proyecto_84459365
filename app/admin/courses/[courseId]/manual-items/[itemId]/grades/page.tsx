'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import ScoreInput from '@/components/grades/ScoreInput';
import SearchInput from '@/components/ui/SearchInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedGuard } from '@/lib/useUnsavedGuard';
import { gradeText, normalize, formatScore } from '@/lib/gradeScale';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { ManualGradeItem, ManualGrade } from '@/lib/types';

/**
 * Calificación de un ítem manual, en página completa.
 *
 * Antes esto vivía en una ventana modal. Calificar a un curso entero dentro
 * de un modal es incómodo: el alto es limitado, hay dos zonas de desplazamiento
 * y cerrar por accidente —clic fuera o Escape— se lleva todo lo escrito.
 * Las actividades ya tenían su página de calificación; esto la iguala.
 */

interface Student { id: string; firstName: string; lastName: string; email: string; documentNumber?: string }
interface Row { student: Student; score: string; feedback: string }

export default function ManualItemGradingPage() {
  const { courseId, itemId } = useParams<{ courseId: string; itemId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [item, setItem] = useState<ManualGradeItem | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [initial, setInitial] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unpublished, setUnpublished] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [search, setSearch] = useState('');
  const scoreRefs = useRef<(HTMLDivElement | null)[]>([]);

  const load = useCallback(async () => {
    try {
      const [itemsRes, enrollRes, gradesRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/manual-items`),
        fetch(`/api/courses/${courseId}/enrollments`),
        fetch(`/api/courses/${courseId}/manual-items/${itemId}/grades`),
      ]);

      const items: ManualGradeItem[] = itemsRes.ok ? (await itemsRes.json()).items ?? [] : [];
      const found = items.find((i) => i.id === itemId) ?? null;
      if (!found) {
        toast('Ítem no encontrado', 'error');
        router.push(`/admin/courses/${courseId}/manual-items`);
        return;
      }
      setItem(found);

      if (!enrollRes.ok) {
        toast('No se pudieron cargar los estudiantes del curso', 'error');
      }
      const students: Student[] = enrollRes.ok
        ? ((await enrollRes.json()).enrollments ?? [])
            .filter((e: { status: string }) => e.status === 'active')
            .map((e: { student: Student }) => e.student)
            .filter(Boolean)
            .sort((a: Student, b: Student) => a.lastName.localeCompare(b.lastName, 'es'))
        : [];

      const grades: ManualGrade[] = gradesRes.ok ? (await gradesRes.json()).grades ?? [] : [];
      setUnpublished(grades.filter((g) => g.isPublished === false).length);
      setPublishedCount(grades.filter((g) => g.isPublished !== false).length);

      const built: Row[] = students.map((student) => {
        const g = grades.find((x) => x.studentId === student.id);
        return {
          student,
          score: g ? String(g.score) : '',
          feedback: g?.feedback ?? '',
        };
      });
      setRows(built);
      setInitial(Object.fromEntries(built.map((r) => [r.student.id, { ...r }])));
    } catch {
      toast('Error al cargar', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, itemId, router, toast]);

  useEffect(() => { load(); }, [load]);

  const dirtyIds = useMemo(() => new Set(
    rows.filter((r) => {
      const base = initial[r.student.id];
      return base && (base.score !== r.score || base.feedback !== r.feedback);
    }).map((r) => r.student.id)
  ), [rows, initial]);

  useUnsavedGuard(dirtyIds.size > 0);

  const visible = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.student.firstName} ${r.student.lastName}`.toLowerCase().includes(q) ||
      r.student.email.toLowerCase().includes(q));
  }, [rows, search]);

  function update(studentId: string, field: 'score' | 'feedback', value: string) {
    setRows((prev) => prev.map((r) => r.student.id === studentId ? { ...r, [field]: value } : r));
  }

  const graded = rows.filter((r) => r.score !== '').length;

  async function save() {
    if (!item) return;
    const payload = rows
      .filter((r) => r.score !== '')
      .map((r) => ({ studentId: r.student.id, score: parseFloat(r.score), feedback: r.feedback || undefined }));

    if (payload.length === 0) { toast('No hay notas para guardar', 'info'); return; }

    const bad = payload.find((g) => isNaN(g.score) || g.score < 0 || g.score > item.maxScore);
    if (bad) { toast(`Nota inválida: debe estar entre 0 y ${item.maxScore}`, 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/manual-items/${itemId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: payload }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Error al guardar');
      }
      toast(`${payload.length} ${payload.length === 1 ? 'nota guardada' : 'notas guardadas'}`, 'success');
      setInitial(Object.fromEntries(rows.map((r) => [r.student.id, { ...r }])));
      // Guardar no publica: se recarga el conteo de lo pendiente.
      const g = await fetch(`/api/courses/${courseId}/manual-items/${itemId}/grades`);
      if (g.ok) {
        const list: ManualGrade[] = (await g.json()).grades ?? [];
        setUnpublished(list.filter((x) => x.isPublished === false).length);
        setPublishedCount(list.filter((x) => x.isPublished !== false).length);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function setPublication(publish: boolean) {
    setPublishing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/manual-items/${itemId}/grades`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error');
      toast(d.message, 'success');
      const total = unpublished + publishedCount;
      setUnpublished(publish ? 0 : total);
      setPublishedCount(publish ? total : 0);
      setConfirmPublish(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al publicar', 'error');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!item) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28">
      <Link href={`/admin/courses/${courseId}/manual-items`}
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors py-2 pr-3">
        <ArrowLeft className="w-4 h-4" /> Notas manuales
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
            {item.title}
          </h1>
          <p className="text-sm text-subtle mt-1">
            Nota máxima {item.maxScore} · Peso {item.weight}%
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch}
          placeholder="Buscar estudiante..." className="w-full sm:w-64" />
      </div>

      {/*
        El estado de publicación se muestra siempre, no solo cuando hay algo
        pendiente. Antes el panel aparecía únicamente si había notas sin
        publicar, así que en un ítem ya publicado la pantalla no decía nada y
        parecía que la función no existiera.
      */}
      {(unpublished > 0 || publishedCount > 0) && (
        <div className={`flex items-center justify-between gap-4 flex-wrap rounded-xl border p-4
          ${unpublished > 0
            ? 'border-amber-500/25 bg-amber-500/[0.07]'
            : 'border-emerald-500/25 bg-emerald-500/[0.06]'}`}>
          <div>
            {unpublished > 0 ? (
              <>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {unpublished} sin publicar
                  {publishedCount > 0 && <span className="text-subtle font-normal"> · {publishedCount} ya visibles</span>}
                </p>
                <p className="text-xs text-subtle mt-0.5">
                  Los estudiantes todavía no ven esas notas. Puedes seguir ajustándolas antes de publicar.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {publishedCount} {publishedCount === 1 ? 'nota publicada' : 'notas publicadas'}
                </p>
                <p className="text-xs text-subtle mt-0.5">
                  Los estudiantes ya las ven y cuentan en su nota definitiva.
                </p>
              </>
            )}
          </div>

          {unpublished > 0 ? (
            <button
              onClick={() => setConfirmPublish(true)}
              disabled={publishing}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium
                         hover:bg-amber-400 transition-colors duration-[var(--dur-fast)]
                         active:scale-[0.98] motion-reduce:active:scale-100
                         disabled:opacity-50 cursor-pointer shrink-0"
            >
              {publishing ? 'Publicando…' : `Publicar ${unpublished}`}
            </button>
          ) : (
            /* Sin esto no habría forma de corregir un error tras publicar. */
            <button
              onClick={() => setPublication(false)}
              disabled={publishing}
              className="px-4 py-2 rounded-lg border border-surface-border text-sm font-medium
                         text-muted hover:text-foreground hover:bg-surface-hover
                         transition-colors duration-[var(--dur-fast)]
                         active:scale-[0.98] motion-reduce:active:scale-100
                         disabled:opacity-50 cursor-pointer shrink-0"
            >
              {publishing ? 'Ocultando…' : 'Ocultar a estudiantes'}
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => setPublication(true)}
        variant="warning"
        title="¿Publicar estas notas?"
        message={`${unpublished} ${unpublished === 1 ? 'nota quedará visible' : 'notas quedarán visibles'} para los estudiantes de inmediato, y entrarán en su nota definitiva.`}
        confirmLabel="Publicar"
        loading={publishing}
      />

      <p className="text-sm text-muted">
        <span className="text-cyan-500 font-semibold">{graded}</span> / {rows.length} calificados
        {dirtyIds.size > 0 && (
          <span className="text-amber-600 dark:text-amber-400 ml-3">{dirtyIds.size} sin guardar</span>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="py-10 text-center space-y-2 rounded-xl border border-surface-border bg-surface">
          <p className="text-sm text-muted">Este curso no tiene estudiantes con inscripción activa.</p>
          <Link href={`/admin/courses/${courseId}/students`}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">
            Ver inscritos del curso →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border divide-y divide-foreground/[0.06] overflow-hidden">
          {visible.map((r, i) => {
            const n = r.score === '' ? null : normalize(parseFloat(r.score), item.maxScore);
            return (
              <div key={r.student.id}
                className={`flex items-start gap-3 p-3.5 bg-surface transition-colors duration-[var(--dur-fast)]
                  ${dirtyIds.has(r.student.id) ? 'bg-amber-500/[0.04]' : ''}`}>
                <div className="min-w-0 w-48 sm:w-56 shrink-0">
                  <p className="text-sm text-foreground/90 truncate">
                    {r.student.lastName}, {r.student.firstName}
                  </p>
                  <p className="text-meta text-subtle truncate">{r.student.email}</p>
                </div>

                <div ref={(el) => { scoreRefs.current[i] = el; }} className="shrink-0">
                  <ScoreInput
                    value={r.score === '' ? null : parseFloat(r.score)}
                    maxScore={item.maxScore}
                    onChange={(v) => update(r.student.id, 'score', v === null ? '' : String(v))}
                    onTab={() => {
                      const next = scoreRefs.current[i + 1]?.querySelector('input');
                      next?.focus();
                    }}
                  />
                </div>

                <span className={`text-sm font-semibold tabular-nums w-10 shrink-0 pt-2 ${gradeText(n)}`}>
                  {formatScore(n)}
                </span>

                <input
                  type="text"
                  value={r.feedback}
                  onChange={(e) => update(r.student.id, 'feedback', e.target.value)}
                  placeholder="Retroalimentación (opcional)"
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-surface-border
                             bg-foreground/[0.04] text-sm text-foreground placeholder:text-faint
                             outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
                             transition-colors duration-[var(--dur-fast)]"
                />
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="text-sm text-subtle p-6 text-center">Ningún estudiante coincide con la búsqueda.</p>
          )}
        </div>
      )}

      {/* Barra fija: en una lista larga el botón no debe quedar al final del scroll. */}
      {rows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border
                        bg-base/95 backdrop-blur-md px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-xs text-subtle">
              {dirtyIds.size > 0 ? `${dirtyIds.size} sin guardar` : 'Todo guardado'}
            </p>
            <button
              onClick={save}
              disabled={saving || dirtyIds.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-white
                         text-sm font-medium hover:bg-cyan-400 transition-colors duration-[var(--dur-fast)]
                         active:scale-[0.98] motion-reduce:active:scale-100
                         disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando…' : `Guardar${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

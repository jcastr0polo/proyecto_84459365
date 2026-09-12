'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GradeTable, { type GradeRow } from '@/components/grades/GradeTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toneBox } from '@/lib/semantics';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { ManualGradeItem, ManualGrade } from '@/lib/types';
import BackLink from '@/components/ui/BackLink';
import Button from '@/components/ui/Button';

/**
 * Calificación de un ítem manual, en página completa.
 *
 * Usa la MISMA tabla que las actividades. La primera versión de esta pantalla
 * traía su propio diseño de filas, y eso hacía que calificar se viera distinto
 * según qué estuvieras calificando: un sistema que parece hecho a trozos.
 * Lo único que cambia son las columnas de entrega y archivos, que en una nota
 * manual no significan nada.
 */
export default function ManualItemGradingPage() {
  const { courseId, itemId } = useParams<{ courseId: string; itemId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [item, setItem] = useState<ManualGradeItem | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unpublished, setUnpublished] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const countPublication = useCallback((grades: ManualGrade[]) => {
    setUnpublished(grades.filter((g) => g.isPublished === false).length);
    setPublishedCount(grades.filter((g) => g.isPublished !== false).length);
  }, []);

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

      if (!enrollRes.ok) toast('No se pudieron cargar los estudiantes del curso', 'error');
      const students: { id: string; firstName: string; lastName: string; email: string }[] =
        enrollRes.ok
          ? ((await enrollRes.json()).enrollments ?? [])
              .filter((e: { status: string }) => e.status === 'active')
              .map((e: { student: { id: string; firstName: string; lastName: string; email: string } }) => e.student)
              .filter(Boolean)
              .sort((a: { lastName: string }, b: { lastName: string }) => a.lastName.localeCompare(b.lastName, 'es'))
          : [];

      const grades: ManualGrade[] = gradesRes.ok ? (await gradesRes.json()).grades ?? [] : [];
      countPublication(grades);

      setRows(students.map((student) => {
        const g = grades.find((x) => x.studentId === student.id);
        return {
          // La tabla identifica cada fila por submissionId; una nota manual no
          // tiene entrega, así que la clave es el propio estudiante.
          submissionId: student.id,
          studentId: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          studentEmail: student.email,
          attachmentsCount: 0,
          linksCount: 0,
          isLate: false,
          submittedAt: '',
          version: 0,
          score: g ? g.score : null,
          feedback: g?.feedback ?? '',
        };
      }));
    } catch {
      toast('Error al cargar', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, itemId, router, toast, countPublication]);

  useEffect(() => { load(); }, [load]);

  const saveRows = useCallback(async (changed: GradeRow[] | GradeRow) => {
    if (!item) return;
    const list = Array.isArray(changed) ? changed : [changed];
    const payload = list
      .filter((r) => r.score !== null)
      .map((r) => ({ studentId: r.studentId, score: r.score as number, feedback: r.feedback || undefined }));

    if (payload.length === 0) { toast('No hay notas para guardar', 'info'); return; }

    const bad = payload.find((g) => g.score < 0 || g.score > item.maxScore);
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

      // Guardar no publica: se recarga el estado de publicación.
      const g = await fetch(`/api/courses/${courseId}/manual-items/${itemId}/grades`);
      if (g.ok) countPublication((await g.json()).grades ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [item, courseId, itemId, toast, countPublication]);

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
      toast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (!item) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <BackLink href={`/admin/courses/${courseId}/manual-items`}>Notas manuales</BackLink>

      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          {item.title}
        </h1>
        <p className="text-sm text-subtle mt-1">
          Nota máxima {item.maxScore} · Peso {item.weight}%
        </p>
      </div>

      {/* El estado de publicación se muestra siempre, también cuando ya está
          todo publicado: si no, la pantalla no dice nada y la función parece
          no existir. */}
      {/* "Sin publicar" es estado del ciclo de vida, no urgencia: va en
          neutro. El ámbar queda reservado para lo que pide actuar pronto. */}
      {(unpublished > 0 || publishedCount > 0) && (
        <div className={`flex items-center justify-between gap-4 flex-wrap rounded-xl border p-4
          ${unpublished > 0 ? toneBox.lifecycle : toneBox.ok}`}>
          <div>
            {unpublished > 0 ? (
              <>
                <p className="text-sm font-medium text-foreground">
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
            <Button variant="primary" size="md" className="shrink-0"
              onClick={() => setConfirmPublish(true)} loading={publishing}>
              {publishing ? 'Publicando…' : `Publicar ${unpublished}`}
            </Button>
          ) : (
            /* Sin esto no habría forma de corregir un error tras publicar. */
            <Button variant="secondary" size="md" className="shrink-0"
              onClick={() => setPublication(false)} disabled={publishing}>
              {publishing ? 'Ocultando…' : 'Ocultar a estudiantes'}
            </Button>
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

      {rows.length === 0 ? (
        <div className="py-10 text-center space-y-2 rounded-xl border border-surface-border bg-surface">
          <p className="text-sm text-muted">Este curso no tiene estudiantes con inscripción activa.</p>
          <Link href={`/admin/courses/${courseId}/students`}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">
            Ver inscritos del curso →
          </Link>
        </div>
      ) : (
        <GradeTable
          rows={rows}
          activityId={itemId}
          courseId={courseId}
          maxScore={item.maxScore}
          onSave={saveRows}
          onSaveAll={saveRows}
          saving={saving}
          showSubmissionColumns={false}
        />
      )}
    </div>
  );
}

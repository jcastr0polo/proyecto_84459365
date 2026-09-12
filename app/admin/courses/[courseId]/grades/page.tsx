'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import GradeSummaryTable, { type Adjustment } from '@/components/grades/GradeSummaryTable';
import AdjustGradeModal, { type AdjustTarget } from '@/components/grades/AdjustGradeModal';
import GradeStats, { calculateStats } from '@/components/grades/GradeStats';
import SearchInput from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import type { CourseGradeSummary } from '@/lib/types';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import OrphanItemsNotice from '@/components/grades/OrphanItemsNotice';
import Link from 'next/link';
import BackLink from '@/components/ui/BackLink';

/**
 * Admin — Course Grade Summary Page
 * /admin/courses/[courseId]/grades
 *
 * Pivot table (wireframe §13.5): students × activities × definitiva
 * Statistics footer, CSV export
 */
export default function AdminGradeSummaryPage() {
  const params = useParams<{ courseId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseGradeSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [target, setTarget] = useState<AdjustTarget | null>(null);
  const [savingAdj, setSavingAdj] = useState(false);

  const courseId = params.courseId;

  const load = useCallback(async () => {
    try {
      const [gradesRes, adjRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/grades`, { credentials: 'include' }),
        fetch(`/api/courses/${courseId}/grades/adjustments`, { credentials: 'include' }),
      ]);
      if (!gradesRes.ok) throw new Error('No se pudieron cargar las notas');
      setData(await gradesRes.json());
      if (adjRes.ok) setAdjustments((await adjRes.json()).adjustments ?? []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error cargando notas', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { load(); }, [load]);

  /*
   * Ajustar una nota calculada.
   *
   * La nota que se le muestra al docente en el modal es la que ya trae la
   * tabla, que YA incluye un ajuste anterior si lo hay. Para que "calculada"
   * signifique de verdad "sin ajustar", se le resta el ajuste vigente.
   */
  const openAdjust = useCallback((studentId: string, corteId: string | null) => {
    if (!data) return;
    const student = data.students.find((s) => s.id === studentId);
    if (!student) return;
    const current = adjustments.find((a) => a.studentId === studentId && a.corteId === corteId) ?? null;
    const corte = corteId ? data.cortes.find((c) => c.id === corteId) : null;
    // Siempre la nota SIN ajustar: si se usara la mostrada, al reeditar el
    // ajuste anterior pasaría por base y cada edición partiría de otro punto.
    const base = corteId === null
      ? student.finalScoreRaw
      : (student.corteScoresRaw[corteId] ?? null);

    setTarget({
      studentId,
      studentName: `${student.lastName}, ${student.firstName}`,
      corteId,
      label: corte ? corte.name : 'Definitiva',
      calculated: base,
      current,
    });
  }, [data, adjustments]);

  const saveAdjust = useCallback(async (score: number, reason: string, publish: boolean) => {
    if (!target) return;
    setSavingAdj(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/adjustments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: target.studentId, corteId: target.corteId, score, reason, publish }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar el ajuste');
      toast(d.message ?? 'Ajuste guardado', 'success');
      setTarget(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar el ajuste', 'error');
    } finally {
      setSavingAdj(false);
    }
  }, [target, courseId, toast, load]);

  const removeAdjust = useCallback(async () => {
    if (!target) return;
    setSavingAdj(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/adjustments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: target.studentId, corteId: target.corteId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo quitar el ajuste');
      toast(d.message ?? 'Ajuste quitado', 'success');
      setTarget(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo quitar el ajuste', 'error');
    } finally {
      setSavingAdj(false);
    }
  }, [target, courseId, toast, load]);

  // CSV export via server-side endpoint (Fase 17)
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/export`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al exportar' }));
        throw new Error(err.error ?? 'Error al exportar');
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `notas-${courseId}-${new Date().toISOString().slice(0, 10)}.csv`;

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast('Archivo CSV descargado', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al exportar', 'error');
    } finally {
      setExporting(false);
    }
  }, [courseId, toast]);

  // Hooks MUST be called before any conditional return
  const filteredData = useMemo(() => {
    if (!data || !search.trim()) return data;
    const q = search.toLowerCase();
    return {
      ...data,
      students: data.students.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.documentNumber.toLowerCase().includes(q)
      ),
    };
  }, [data, search]);

  /*
   * Un esqueleto con la forma de la tabla que viene, no una rueda girando.
   * La rueda no dice nada: ni cuánto falta ni qué va a aparecer, y la página
   * da un salto cuando por fin llega.
   */
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-full sm:w-72" />
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (!data || !filteredData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-subtle">No se pudieron cargar los datos del curso.</p>
      </div>
    );
  }

  const stats = calculateStats(data.students);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <BackLink href={`/admin/courses/${courseId}`} className="mb-2">Volver al curso</BackLink>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
            Resumen de Notas
          </h1>
          <p className="text-sm text-muted mt-1">
            {data.courseName} · {data.students.length} estudiantes · {data.activities.length} actividades
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exportando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </>
          )}
        </button>
      </div>

      {/* Statistics */}
      <GradeStats stats={stats} className="mb-6" />

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar estudiante..."
          className="w-full sm:w-72"
        />
      </div>

      {data.finalBasis === 'flat' && data.cortes.length > 0 && (
        <OrphanItemsNotice items={data.orphanItems} />
      )}

      <AdjustGradeModal
        target={target}
        onClose={() => setTarget(null)}
        onSave={saveAdjust}
        onRemove={removeAdjust}
        saving={savingAdj}
      />

      {/* Pivot Table */}
      {data.students.length > 0 ? (
        <GradeSummaryTable data={filteredData} onAdjust={openAdjust} adjustments={adjustments} />
      ) : (
        <div className="rounded-xl border border-surface-border bg-surface">
          <EmptyState
            kind="empty"
            title="Sin estudiantes inscritos"
            description="Cuando inscribas estudiantes en este curso, aquí verás su tabla de notas."
            action={
              <Link href={`/admin/courses/${courseId}/students/new`}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline
                           inline-flex items-center min-h-11 px-3">
                Inscribir un estudiante →
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}

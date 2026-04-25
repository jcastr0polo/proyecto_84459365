'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GradeSummaryTable from '@/components/grades/GradeSummaryTable';
import GradeStats, { calculateStats } from '@/components/grades/GradeStats';
import SearchInput from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import type { CourseGradeSummary } from '@/lib/types';

/**
 * Admin — Course Grade Summary Page
 * /admin/courses/[courseId]/grades
 *
 * Pivot table (wireframe §13.5): students × activities × definitiva
 * Statistics footer, CSV export
 */
export default function AdminGradeSummaryPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseGradeSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');

  const courseId = params.courseId;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}/grades`, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudieron cargar las notas');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error cargando notas', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, toast]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-subtle">No se pudieron cargar los datos del curso.</p>
      </div>
    );
  }

  const stats = calculateStats(data.students);

  // Filter students by search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
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

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors mb-2 cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
          >
            ← Volver al curso
          </button>
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

      {/* Pivot Table */}
      {data.students.length > 0 ? (
        <GradeSummaryTable data={filteredData} />
      ) : (
        <div className="text-center py-16 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
          <p className="text-subtle">No hay estudiantes inscritos en este curso.</p>
        </div>
      )}
    </div>
  );
}

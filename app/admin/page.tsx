'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AdminDashboardView from '@/components/admin/AdminDashboardView';
import type { Course, Semester, Activity, Enrollment, Submission } from '@/lib/types';

/* ─── Types for aggregated data ─── */

interface CourseData {
  course: Course;
  enrollments: Enrollment[];
  activities: Activity[];
  submissions: Submission[];
}

/**
 * Admin Dashboard — Fase 20
 * Executive dashboard with widgets, metrics, deadlines, and activity timeline
 * Inspired by Vercel/Linear dashboards
 */
export default function AdminDashboardPage() {
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courseData, setCourseData] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * Una petición, no once.
   *
   * Antes el panel se armaba encadenando desde el navegador: semestres y
   * cursos, luego inscripciones y actividades por cada curso, y luego
   * entregas por cada actividad publicada. El número de peticiones crecía
   * con cada curso abierto y cada actividad publicada, y cada una volvía a
   * leer tablas que las otras ya habían leído.
   */
  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo cargar el panel');
      const data = await res.json();
      setSemester(data.semester ?? null);
      setCourseData(data.courseData ?? []);
    } catch {
      // Fallo silencioso: se muestra el panel vacío, como antes.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Computed Stats ─── */

  /* ─── Deadlines ─── */

  /* ─── Activity Timeline ─── */

  /* ─── Per-course metrics ─── */

  /* ─── Enrollment breakdown by course for stat card ─── */

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-9 w-64 rounded bg-foreground/[0.06] animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-surface-border bg-surface animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl border border-surface-border bg-surface animate-pulse" />
      </div>
    );
  }

  return <AdminDashboardView semester={semester} courseData={courseData} />;
}

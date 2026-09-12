'use client';

import React, { useCallback, useEffect, useState } from 'react';
import StudentDashboardView from '@/components/student/StudentDashboardView';
import type { CourseWithMeta, UserInfo, ActiveQuiz } from '@/components/student/types';
import type { Semester } from '@/lib/types';

/* ─── Types ─── */

/**
 * Student Dashboard — Fase 21
 * Following wireframe section 13.3:
 * - Personalized greeting
 * - My Courses grid
 * - Pending activities with urgency indicators
 * - Recent grades
 */
export default function StudentDashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [coursesData, setCoursesData] = useState<CourseWithMeta[]>([]);
  const [activeQuizzes, setActiveQuizzes] = useState<ActiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * Una petición, no treinta y pico.
   *
   * Antes esto pedía inscripciones y actividades de TODOS los cursos del
   * sistema para averiguar en cuáles estaba inscrito, luego entregas por
   * actividad, luego /grades por curso —que por dentro lee diez tablas cada
   * vez— y luego parciales por curso.
   */
  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/student/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo cargar el panel');
      const data = await res.json();
      setUser(data.user ?? null);
      setSemester(data.semester ?? null);
      setCoursesData(data.coursesData ?? []);
      setActiveQuizzes(data.activeQuizzes ?? []);
    } catch {
      // Fallo silencioso: se muestra el panel vacío, como antes.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Skeleton ─── */
  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Greeting skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-foreground/[0.06] mb-2" />
          <div className="h-4 w-40 rounded bg-foreground/[0.04]" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
          <div className="h-48 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardView
      user={user}
      semester={semester}
      coursesData={coursesData}
      activeQuizzes={activeQuizzes}
    />
  );
}

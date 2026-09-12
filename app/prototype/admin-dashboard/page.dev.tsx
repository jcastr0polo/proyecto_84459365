'use client';

import React from 'react';
import AdminDashboardView, { type CourseData } from '@/components/admin/AdminDashboardView';
import { MOCK_COURSES, MOCK_SEMESTER } from '../student-dashboard/mockData';

/** Taller — panel del docente. Datos falsos, solo desarrollo. */
export default function PrototypeAdminDashboard() {
  // Se reaprovechan los cursos y actividades del panel del estudiante y se
  // les añaden inscripciones y entregas de varios estudiantes.
  const data: CourseData[] = MOCK_COURSES.map((cd, ci) => ({
    course: cd.course,
    enrollments: Array.from({ length: ci === 0 ? 16 : 12 }, (_, i) => ({
      id: `e${ci}-${i}`, courseId: cd.course.id, studentId: `stu-${ci}-${i}`,
      status: 'active' as const, enrolledAt: '', enrolledBy: 'admin',
    })),
    activities: ci === 0
      ? [...cd.activities, { ...cd.activities[0], id: 'draft-1', title: 'Rúbrica de evaluación final', status: 'draft' as const }]
      : cd.activities,
    submissions: cd.activities.flatMap((a, ai) =>
      Array.from({ length: ai === 0 ? 14 : ai === 1 ? 9 : 3 }, (_, i) => ({
        id: `s${ci}-${ai}-${i}`, activityId: a.id, courseId: cd.course.id,
        studentId: `stu-${ci}-${i}`, attachments: [], links: [],
        submittedAt: new Date('2026-09-05T10:00:00-05:00').toISOString(),
        isLate: false,
        status: (i % 3 === 0 ? 'reviewed' : 'submitted') as 'reviewed' | 'submitted',
        version: 1, createdAt: '', updatedAt: '',
      }))),
  }));


  const prioridades = {
    reportDeadlines: [
      { courseId: 'c1', courseName: 'LÓGICA Y PROGRAMACIÓN', corteId: 'k2', corteName: 'Corte 2',
        deadline: '2026-09-16', days: 3, itemsTotal: 4, pendingItems: 2, missingGrades: 27,
        worst: [{ title: 'Parcial 2', missing: 21 }, { title: 'Taller de recursión', missing: 6 }] },
      { courseId: 'c2', courseName: 'TALLER DISEÑO INTERACTIVO', corteId: 'k2', corteName: 'Corte 2',
        deadline: '2026-09-20', days: 7, itemsTotal: 3, pendingItems: 0, missingGrades: 0, worst: [] },
      { courseId: 'c3', courseName: 'GERENCIA DE PROYECTOS', corteId: 'k1', corteName: 'Corte 1',
        deadline: '2026-09-09', days: -4, itemsTotal: 3, pendingItems: 1, missingGrades: 4,
        worst: [{ title: 'Exposición final', missing: 4 }] },
    ],
    gradingQueue: [
      { activityId: 'a1', title: 'Taller de recursión', courseId: 'c1', courseName: 'LÓGICA Y PROGRAMACIÓN',
        corteName: 'Corte 2', pending: 6, reportInDays: 3, dueInDays: -9, urgencyDays: -9 },
      { activityId: 'a2', title: 'Exposición final', courseId: 'c3', courseName: 'GERENCIA DE PROYECTOS',
        corteName: 'Corte 1', pending: 4, reportInDays: -4, dueInDays: -12, urgencyDays: -12 },
      { activityId: 'a3', title: 'Prototipo navegable en Figma', courseId: 'c2', courseName: 'TALLER DISEÑO INTERACTIVO',
        corteName: 'Corte 3', pending: 18, reportInDays: 41, dueInDays: 5, urgencyDays: 5 },
    ],
    atRisk: [
      { studentId: 's1', studentName: 'Ramírez Soto, Camilo', courseId: 'c1', courseName: 'LÓGICA Y PROGRAMACIÓN', score: 1.8, progressPct: 60 },
      { studentId: 's2', studentName: 'González Pérez, Gabriela', courseId: 'c1', courseName: 'LÓGICA Y PROGRAMACIÓN', score: 2.4, progressPct: 60 },
      { studentId: 's3', studentName: 'Ochoa Lara, Daniela', courseId: 'c3', courseName: 'GERENCIA DE PROYECTOS', score: 2.9, progressPct: 30 },
    ],
    distribution: [
      { label: '0–1.9', min: 0, count: 2 },
      { label: '2.0–2.9', min: 2, count: 5 },
      { label: '3.0–3.4', min: 3, count: 9 },
      { label: '3.5–3.9', min: 3.5, count: 7 },
      { label: '4.0–4.4', min: 4, count: 4 },
      { label: '4.5–5.0', min: 4.5, count: 1 },
    ],
    average: 3.4,
    scoredCount: 28,
    rosterCount: 34,
  };

  return (
    <div className="px-4 py-8">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400 block max-w-6xl mx-auto mb-4">
        Taller de diseño · datos falsos
      </span>
      <AdminDashboardView semester={MOCK_SEMESTER} courseData={data} {...prioridades} />
    </div>
  );
}

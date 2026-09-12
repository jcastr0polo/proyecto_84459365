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

  return (
    <div className="px-4 py-8">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400 block max-w-6xl mx-auto mb-4">
        Taller de diseño · datos falsos
      </span>
      <AdminDashboardView semester={MOCK_SEMESTER} courseData={data} />
    </div>
  );
}

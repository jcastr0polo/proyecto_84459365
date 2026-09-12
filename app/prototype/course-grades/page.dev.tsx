'use client';

import React from 'react';
import GradeSummaryTable from '@/components/grades/GradeSummaryTable';
import type { CourseGradeSummary } from '@/lib/types';

/** Taller — tabla de notas del curso, con su vista de tarjetas en móvil. */
export default function PrototypeCourseGrades() {
  const cortes = [
    { id: 'c1', name: 'Corte 1', weight: 30, order: 1 },
    { id: 'c2', name: 'Corte 2', weight: 30, order: 2 },
    { id: 'c3', name: 'Corte 3', weight: 40, order: 3 },
  ];
  const activities = [
    { id: 'a1', title: 'Moodboard y referentes', type: 'document' as const, maxScore: 5, weight: 50, corteId: 'c1' },
    { id: 'a2', title: 'Wireframes', type: 'exercise' as const, maxScore: 5, weight: 50, corteId: 'c1' },
    { id: 'a3', title: 'Sistema de diseño', type: 'project' as const, maxScore: 5, weight: 100, corteId: 'c2' },
    { id: 'a4', title: 'Entrega final', type: 'project' as const, maxScore: 5, weight: 100, corteId: 'c3' },
  ];
  const mk = (ln: string, fn: string, scores: (number | null)[]) => {
    const grades: CourseGradeSummary['students'][number]['grades'] = {};
    activities.forEach((a, i) => {
      grades[a.id] = scores[i] === null ? null
        : { score: scores[i] as number, maxScore: 5, isPublished: i !== 2 };
    });
    const got = scores.filter((x) => x !== null) as number[];
    const final = got.length ? got.reduce((a, b) => a + b, 0) / got.length : null;
    return {
      id: `s-${ln}`, firstName: fn, lastName: ln, documentNumber: '1000',
      email: `${fn.toLowerCase()}@ejemplo.edu.co`, grades,
      corteScores: { c1: scores[0], c2: scores[2], c3: scores[3] },
      finalScore: final === null ? null : Math.round(final * 10) / 10,
      isPartial: got.length < activities.length,
      isApproved: final === null ? null : final >= 3,
    };
  };

  const data: CourseGradeSummary = {
    courseId: 'c', courseName: 'Taller de Diseño Interactivo',
    cortes, activities,
    students: [
      mk('González Pérez', 'Gabriela', [4.5, 4.0, 2.8, null]),
      mk('Restrepo Ochoa', 'Valentina', [3.4, 3.6, null, null]),
      mk('Zapata Ríos', 'Andrés', [null, null, null, null]),
    ],
  };

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-4">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño · datos falsos
      </span>
      <GradeSummaryTable data={data} />
    </div>
  );
}

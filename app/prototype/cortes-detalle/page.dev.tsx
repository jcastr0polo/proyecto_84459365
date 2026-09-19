'use client';

import React from 'react';
import CorteCard, { type CorteOverview } from '@/components/admin/CorteCard';

/** Taller — la tarjeta de corte desplegable y sus casos límite. Datos falsos. */
export default function PrototypeCortesDetalle() {
  const base = { studentsTotal: 21, order: 1, canDelete: false };

  const cortes: CorteOverview[] = [
    {
      ...base, id: 'c1', name: 'Corte 1', weight: 30, order: 1,
      startDate: '2026-08-04', endDate: '2026-09-12', reportDeadline: '2026-09-16',
      items: [
        { id: 'a1', title: 'Moodboard y referentes visuales', kind: 'activity', weight: 30, status: 'closed', dueDate: null, graded: 21 },
        { id: 'a2', title: 'Wireframes de baja fidelidad', kind: 'activity', weight: 30, status: 'published', dueDate: null, graded: 21 },
        { id: 'q1', title: 'Parcial 1 — Fundamentos', kind: 'quiz', weight: 40, status: 'published', dueDate: null, graded: 19 },
      ],
      internalWeight: 100, studentsWithScore: 21, average: 4.1, failing: 2,
      daysToReport: -3, daysToEnd: -7, pendingItems: 1,
    },
    {
      ...base, id: 'c2', name: 'Corte 2', weight: 30, order: 2,
      startDate: '2026-09-15', endDate: '2026-10-24', reportDeadline: '2026-10-28',
      items: [
        { id: 'a3', title: 'Sistema de diseño', kind: 'activity', weight: 60, status: 'published', dueDate: null, graded: 8 },
        { id: 'm1', title: 'Participación', kind: 'manual', weight: 15, status: 'published', dueDate: null, graded: 0 },
      ],
      internalWeight: 75, studentsWithScore: 8, average: 3.4, failing: 3,
      daysToReport: 5, daysToEnd: 1, pendingItems: 2,
    },
    {
      ...base, id: 'c3', name: 'Corte 3', weight: 40, order: 3,
      reportDeadline: '2026-12-05',
      items: [], internalWeight: 0, studentsWithScore: 0, average: null, failing: 0,
      daysToReport: 43, daysToEnd: null, pendingItems: 0, canDelete: true,
    },
  ];

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto space-y-3">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
      <p className="text-xs text-subtle">Vencido · vence en 5 días con pesos mal sumados · vacío y borrable</p>
      {cortes.map((c) => (
        <CorteCard key={c.id} corte={c} onEdit={() => {}} onDelete={() => {}} onToggleReported={() => {}} />
      ))}
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { nowColombia } from '@/lib/dateUtils';
import { STATUS_META, startOfTodayColombia, type DeliveryStatus } from '@/lib/activityStatus';
import ActivityList, { useActivityRows } from '@/components/student/ActivityList';
import FilterChip from '@/components/ui/FilterChip';
import { MOCK_COURSES } from '../student-dashboard/mockData';
import type { Submission } from '@/lib/types';

/** Taller de diseño — lista de actividades con filtro. Datos falsos. */
export default function PrototypeActivitiesPage() {
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const cd = MOCK_COURSES[0];
  const submissions: Record<string, Submission> = Object.fromEntries(
    cd.submissions.map((s) => [s.activityId, s])
  );

  const now = useMemo(() => nowColombia(), []);
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);
  const rows = useActivityRows(cd.activities, submissions, now);

  const counts = useMemo(() => {
    const c: Partial<Record<DeliveryStatus, number>> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="px-4 py-8">
      <div className="space-y-6 max-w-3xl mx-auto">
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
          Taller de diseño · datos falsos
        </span>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mis actividades
        </h1>

        {/* Cómo quedan los filtros del docente en la pantalla de entregas */}
        <div>
          <p className="text-meta uppercase tracking-wider text-faint mb-2">Filtros de entregas (admin)</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active onClick={() => {}} dot="bg-cyan-500">Por calificar (7)</FilterChip>
            <FilterChip active={false} onClick={() => {}}>Todas (24)</FilterChip>
            <FilterChip active={false} onClick={() => {}} dot="bg-emerald-500">Calificadas (15)</FilterChip>
            <FilterChip active={false} onClick={() => {}} dot="bg-amber-500">Devueltas (2)</FilterChip>
            <FilterChip active={false} onClick={() => {}} dot="bg-red-500">Tardías (4)</FilterChip>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas ({rows.length})
          </FilterChip>
          {(Object.keys(counts) as DeliveryStatus[]).map((st) => (
            <FilterChip key={st} active={filter === st} onClick={() => setFilter(st)} dot={STATUS_META[st].dot}>
              {STATUS_META[st].label} ({counts[st]})
            </FilterChip>
          ))}
        </div>
        <ActivityList rows={visible} courseId={cd.course.id} today={today} />
        {rows.length > 0 && visible.length === 0 && (
          <p className="text-sm text-subtle px-1">No hay actividades en ese estado.</p>
        )}
      </div>
    </div>
  );
}

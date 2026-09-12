'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { nowColombia } from '@/lib/dateUtils';
import { STATUS_META, startOfTodayColombia, type DeliveryStatus } from '@/lib/activityStatus';
import ActivityList, { useActivityRows } from '@/components/student/ActivityList';
import Chip from '@/components/ui/Chip';
import type { Activity, Submission } from '@/lib/types';
import EmptyState from '@/components/ui/EmptyState';
import BackLink from '@/components/ui/BackLink';

/**
 * Lista de actividades del curso.
 *
 * Comparte ActivityList y la lógica de estado con la vista de curso: antes
 * cada una tenía su copia y ya habían divergido en el orden y en las
 * etiquetas. Lo propio de esta pantalla es el filtro por estado.
 */
export default function StudentActivitiesPage() {
  const params = useParams();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      const actRes = await fetch(`/api/courses/${courseId}/activities`);
      if (!actRes.ok) {
        toast('Error al cargar actividades', 'error');
        return;
      }
      const acts: Activity[] = (await actRes.json()).activities ?? [];
      setActivities(acts);

      const subMap: Record<string, Submission> = {};
      await Promise.all(acts.map(async (a) => {
        try {
          const res = await fetch(`/api/activities/${a.id}/submissions`);
          if (res.ok) {
            const data = await res.json();
            if (data.submissions?.length > 0) subMap[a.id] = data.submissions[0];
          }
        } catch { /* ignore */ }
      }));
      setSubmissions(subMap);
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = useMemo(() => nowColombia(), []);
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);
  const rows = useActivityRows(activities, submissions, now);

  const counts = useMemo(() => {
    const c: Partial<Record<DeliveryStatus, number>> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <BackLink href={`/student/courses/${courseId}`}>Volver al curso</BackLink>

      <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
        Mis actividades
      </h1>

      {/* Filtro por estado: los contadores ahora también filtran, que es lo
          que un estudiante intenta hacer al verlos. */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas ({rows.length})
          </Chip>
          {(Object.keys(counts) as DeliveryStatus[]).map((st) => (
            <Chip key={st} active={filter === st} onClick={() => setFilter(st)} dot={STATUS_META[st].dot}>
              {STATUS_META[st].label} ({counts[st]})
            </Chip>
          ))}
        </div>
      )}

      <ActivityList rows={visible} courseId={courseId} today={today} />

      {rows.length > 0 && visible.length === 0 && (
        <EmptyState compact kind="filtered" title="Sin actividades en ese estado"
          description="Prueba con otro filtro para ver el resto." />
      )}
    </div>
  );
}


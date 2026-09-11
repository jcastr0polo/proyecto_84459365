'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { formatDateShort } from '@/lib/dateUtils';
import { gradeText, normalize } from '@/lib/gradeScale';
import {
  deliveryStatus, needsAction, dueLabel,
  PRIORITY, STATUS_META, TYPE_LABELS, type DeliveryStatus,
} from '@/lib/activityStatus';
import type { Activity, Submission, StudentGradeSummary } from '@/lib/types';

/**
 * ActivityList — la lista de actividades del estudiante.
 *
 * Una sola implementación para la vista de curso y para /activities, que
 * antes tenían cada una su copia y ya habían divergido en orden y etiquetas.
 */

export interface ActivityRow {
  activity: Activity;
  sub: Submission | undefined;
  status: DeliveryStatus;
}

/** Ordena por urgencia real y, dentro de cada grupo, por fecha límite. */
export function useActivityRows(
  activities: Activity[],
  submissions: Record<string, Submission>,
  now: Date,
): ActivityRow[] {
  return useMemo(() => activities
    .filter((a) => a.status !== 'draft')
    .map((a) => ({ activity: a, sub: submissions[a.id], status: deliveryStatus(a, submissions[a.id], now) }))
    .sort((x, y) => {
      const p = PRIORITY[x.status] - PRIORITY[y.status];
      if (p !== 0) return p;
      return +new Date(x.activity.dueDate) - +new Date(y.activity.dueDate);
    }), [activities, submissions, now]);
}

export default function ActivityList({
  rows, courseId, today, gradeData,
}: {
  rows: ActivityRow[];
  courseId: string;
  today: Date;
  gradeData?: StudentGradeSummary | null;
}) {
  const gradeFor = (id: string) => gradeData?.activities.find((a) => a.id === id)?.grade ?? null;

  if (rows.length === 0) {
    return <p className="text-sm text-subtle px-1 py-6">No hay actividades publicadas todavía.</p>;
  }

  return (
    <div className="rounded-xl border border-surface-border divide-y divide-foreground/[0.06] overflow-hidden">
      {rows.map(({ activity, sub, status }) => {
        const g = gradeFor(activity.id);
        const st = STATUS_META[status];
        const pendiente = needsAction(status);
        return (
          <Link
            key={activity.id}
            href={`/student/courses/${courseId}/activities/${activity.id}`}
            className="flex items-center gap-3 p-3.5 bg-surface
                       transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground/90 leading-snug">{activity.title}</p>
              <p className="text-meta text-subtle mt-0.5">
                {TYPE_LABELS[activity.type] ?? activity.type}
                {' · '}{activity.weight}%
                {' · '}<span className={st.text}>{st.label}</span>
                {pendiente && <> · {dueLabel(activity.dueDate, today)}</>}
                {!pendiente && sub?.submittedAt && <> · entregada {formatDateShort(sub.submittedAt)}</>}
              </p>
            </div>

            <div className="shrink-0 text-right min-w-[3rem]">
              {g ? (
                <>
                  <p className={`text-lg font-semibold tabular-nums leading-none ${gradeText(normalize(g.score, g.maxScore))}`}>
                    {normalize(g.score, g.maxScore).toFixed(1)}
                  </p>
                  <p className="text-micro text-faint mt-0.5">{g.score}/{g.maxScore}</p>
                </>
              ) : (
                <span className="text-meta text-faint">Máx {activity.maxScore}</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

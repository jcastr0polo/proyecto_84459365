'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateShort as formatDate, parseDateColombia, parseDateTimeColombia } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import Countdown from '@/components/ui/Countdown';
import { TYPE_LABELS, TYPE_VARIANTS } from '@/components/activities/ActivityCard';
import type { Activity, Submission } from '@/lib/types';

type DeliveryStatus = 'delivered' | 'pending' | 'overdue' | 'graded' | 'returned';

function getDeliveryStatus(activity: Activity, submission: Submission | undefined): DeliveryStatus {
  if (submission) {
    if (submission.status === 'reviewed') return 'graded';
    if (submission.status === 'returned') return 'returned';
    return 'delivered';
  }
  const now = new Date();
  const due = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59');
  if (now > due) return 'overdue';
  return 'pending';
}

const DELIVERY_BADGES: Record<DeliveryStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
  delivered: { label: 'Entregada', variant: 'success', icon: <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> },
  pending: { label: 'Pendiente', variant: 'warning', icon: <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> },
  overdue: { label: 'Vencida', variant: 'danger', icon: <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> },
  graded: { label: 'Calificada', variant: 'info', icon: <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> },
  returned: { label: 'Devuelta', variant: 'warning', icon: <span className="text-xs">↩</span> },
};

/**
 * Student — Activities List Page
 * Shows all published activities for a course with delivery status
 */
export default function StudentActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const actRes = await fetch(`/api/courses/${courseId}/activities`);
      if (!actRes.ok) {
        toast('Error al cargar actividades', 'error');
        return;
      }
      const actData = await actRes.json();
      const acts = actData.activities ?? [];
      setActivities(acts);

      // Fetch submissions for each activity
      const subMap: Record<string, Submission> = {};
      const subPromises = acts.map(async (a: Activity) => {
        try {
          const res = await fetch(`/api/activities/${a.id}/submissions`);
          if (res.ok) {
            const data = await res.json();
            if (data.submissions?.length > 0) {
              subMap[a.id] = data.submissions[0];
            }
          }
        } catch { /* ignore */ }
      });
      await Promise.all(subPromises);
      setSubmissions(subMap);
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sort: pending first, then by due date
  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => {
      const statusA = getDeliveryStatus(a, submissions[a.id]);
      const statusB = getDeliveryStatus(b, submissions[b.id]);
      const priority: Record<DeliveryStatus, number> = {
        returned: 0, pending: 1, overdue: 2, delivered: 3, graded: 4,
      };
      const pDiff = priority[statusA] - priority[statusB];
      if (pDiff !== 0) return pDiff;
      return parseDateColombia(a.dueDate).getTime() - parseDateColombia(b.dueDate).getTime();
    });
  }, [activities, submissions]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push(`/student/courses/${courseId}`)}
        className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver al curso
      </button>

      <h1 className="text-2xl font-bold text-foreground tracking-tight">Mis Actividades</h1>

      {/* Summary counters */}
      {activities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(
            sorted.reduce<Record<DeliveryStatus, number>>((acc, a) => {
              const s = getDeliveryStatus(a, submissions[a.id]);
              acc[s] = (acc[s] || 0) + 1;
              return acc;
            }, {} as Record<DeliveryStatus, number>)
          ).map(([status, count]) => {
            const cfg = DELIVERY_BADGES[status as DeliveryStatus];
            return (
              <Badge key={status} variant={cfg.variant} size="sm" dot>
                {count} {cfg.label.toLowerCase()}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Activities list */}
      {activities.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-subtle" />}
          title="Sin actividades"
          description="No hay actividades publicadas para este curso."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((activity) => {
            const sub = submissions[activity.id];
            const deliveryStatus = getDeliveryStatus(activity, sub);
            const badge = DELIVERY_BADGES[deliveryStatus];
            const isPastDue = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59') < new Date();

            return (
              <div
                key={activity.id}
                onClick={() => router.push(`/student/courses/${courseId}/activities/${activity.id}`)}
                className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03]
                         hover:border-foreground/15 hover:bg-foreground/[0.06] transition-all cursor-pointer"
              >
                {/* Top row: type + delivery status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={TYPE_VARIANTS[activity.type]} size="sm">
                    {TYPE_LABELS[activity.type]}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Badge variant={badge.variant} size="sm" dot>
                      {badge.icon} {badge.label}
                    </Badge>
                    {sub && (
                      <span className="text-[10px] text-faint font-mono">v{sub.version}</span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-1 line-clamp-1">
                  {activity.title}
                </h3>

                {/* Info row */}
                <div className="flex items-center justify-between gap-3 text-xs mt-2">
                  <div className="flex items-center gap-3 text-subtle">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline mr-1 align-[-2px]">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDate(activity.dueDate)}
                    </span>
                    <span>{activity.weight}%</span>
                    <span>Nota: {activity.maxScore}</span>
                  </div>

                  {/* Countdown or delivered date */}
                  {!isPastDue && deliveryStatus === 'pending' && (
                    <Countdown targetDate={activity.dueDate} compact className="text-xs" />
                  )}
                  {sub && (
                    <span className="text-[11px] text-subtle">
                      {sub.isLate ? <><AlertTriangle className="w-3 h-3 inline" /> tardía</> : ''} {formatDate(sub.submittedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

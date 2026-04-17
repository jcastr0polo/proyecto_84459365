'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import ActivityDetail from '@/components/activities/ActivityDetail';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import type { Activity, Submission } from '@/lib/types';

/**
 * Student — Activity Detail Page
 * Siguiendo wireframe del plan sección 13.4
 * Muestra actividad con descripción, adjuntos, prompt y sección "Mi Entrega"
 */
export default function StudentActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const actId = params.actId as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [actRes, subRes] = await Promise.all([
        fetch(`/api/activities/${actId}`),
        fetch(`/api/activities/${actId}/submissions`),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data.activity);
      } else {
        toast('Actividad no disponible', 'error');
        router.push(`/student/courses/${courseId}`);
        return;
      }

      if (subRes.ok) {
        const data = await subRes.json();
        if (data.submissions?.length > 0) {
          setSubmission(data.submissions[0]);
        }
      }
    } catch {
      toast('Error al cargar actividad', 'error');
    } finally {
      setLoading(false);
    }
  }, [actId, courseId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !activity) return <PageLoader />;

  const isPastDue = new Date(activity.dueDate) < new Date();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push(`/student/courses/${courseId}/activities`)}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a actividades
      </button>

      <ActivityDetail
        activity={activity}
        isAdmin={false}
        submissionSlot={
          <SubmissionSection
            activity={activity}
            submission={submission}
            isPastDue={isPastDue}
            courseId={courseId}
            actId={actId}
          />
        }
      />
    </div>
  );
}

/**
 * SubmissionSection — Sección "Mi Entrega" del estudiante
 * Muestra estado de entrega o botón para enviar
 */
function SubmissionSection({
  activity,
  submission,
  isPastDue,
  courseId,
  actId,
}: {
  activity: Activity;
  submission: Submission | null;
  isPastDue: boolean;
  courseId: string;
  actId: string;
}) {
  const router = useRouter();
  const canSubmit = !isPastDue || activity.allowLateSubmission;
  const isClosed = activity.status === 'closed';
  const canResubmit = submission && (submission.status === 'submitted' || submission.status === 'returned' || submission.status === 'resubmitted');

  return (
    <Card padding="lg">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
        Mi Entrega
      </h3>

      {/* Show existing submission */}
      {submission && (
        <div className="mb-4">
          <SubmissionDetail submission={submission} />
        </div>
      )}

      {isClosed ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <Badge variant="neutral" size="md">Actividad cerrada</Badge>
          <span className="text-sm text-white/40">Ya no se aceptan entregas</span>
        </div>
      ) : !submission ? (
        <div className="space-y-4">
          {/* No submission yet */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white/70 font-medium">Sin entrega</p>
              <p className="text-xs text-white/35">
                {canSubmit
                  ? 'Aún puedes enviar tu trabajo'
                  : 'El plazo ha vencido y no se permiten entregas tardías'
                }
              </p>
            </div>
          </div>

          {/* Requirements */}
          {(activity.requiresFileUpload || activity.requiresLinkSubmission) && (
            <div className="text-xs text-white/30 space-y-1">
              {activity.requiresFileUpload && <p>📎 Debes adjuntar un archivo</p>}
              {activity.requiresLinkSubmission && <p>🔗 Debes enviar un enlace</p>}
            </div>
          )}

          {/* Submit button */}
          {canSubmit && (
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/student/courses/${courseId}/activities/${actId}/submit`)}
            >
              Enviar Entrega
            </Button>
          )}

          {isPastDue && activity.allowLateSubmission && (
            <p className="text-[11px] text-amber-400/70">
              ⚠ Entrega tardía: se aplicará una penalización del {activity.latePenaltyPercent ?? 0}%
            </p>
          )}
        </div>
      ) : canResubmit && canSubmit ? (
        <div className="pt-3 border-t border-white/[0.06]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/student/courses/${courseId}/activities/${actId}/submit`)}
          >
            Re-enviar Entrega
          </Button>
          {submission.status === 'returned' && (
            <p className="text-xs text-amber-400 mt-1">El docente devolvió tu entrega para que la mejores.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { Paperclip, Link as LinkIcon, AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import ActivityDetail from '@/components/activities/ActivityDetail';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import PromptViewer from '@/components/prompts/PromptViewer';
import type { Activity, Submission, AIPrompt } from '@/lib/types';

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
  const [prompt, setPrompt] = useState<AIPrompt | null>(null);
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

        // Fetch linked prompt if exists
        if (data.activity?.promptId) {
          try {
            const promptRes = await fetch(`/api/prompts/${data.activity.promptId}`);
            if (promptRes.ok) {
              const promptData = await promptRes.json();
              setPrompt(promptData.prompt);
            }
          } catch {
            // Prompt fetch failure is non-critical
          }
        }
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
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a actividades
      </button>

      <ActivityDetail
        activity={activity}
        isAdmin={false}
        promptSlot={
          prompt ? (
            <Card padding="lg">
              <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
                Prompt de IA
              </h3>
              <PromptViewer
                title={prompt.title}
                content={prompt.content}
                version={prompt.version}
                tags={prompt.tags}
              />
            </Card>
          ) : undefined
        }
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
      <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
        Mi Entrega
      </h3>

      {isClosed && !submission ? (
        /* ─── Closed + no submission ─── */
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/[0.06] border border-red-500/20">
          <Badge variant="danger" size="md">Actividad cerrada</Badge>
          <span className="text-sm text-red-300">No entregaste esta actividad</span>
        </div>
      ) : isClosed && submission ? (
        /* ─── Closed + has submission ─── */
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <Badge variant="neutral" size="md">Actividad cerrada</Badge>
            <span className="text-sm text-subtle">Ya no se aceptan entregas</span>
          </div>
          <SubmissionDetail submission={submission} />
        </div>
      ) : !submission ? (
        /* ─── NO SUBMISSION — Prominent CTA ─── */
        <div className="space-y-4">
          {/* Big warning banner */}
          <div className="p-5 rounded-xl bg-amber-500/[0.08] border-2 border-amber-500/30 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-base font-bold text-amber-300 mb-1">No has entregado esta actividad</p>
            <p className="text-xs text-amber-400/70">
              {canSubmit
                ? isPastDue && activity.allowLateSubmission
                  ? `El plazo venció. Aún puedes entregar con penalización del ${activity.latePenaltyPercent ?? 0}%`
                  : 'Envía tu trabajo antes de la fecha límite'
                : 'El plazo ha vencido y no se permiten entregas tardías'
              }
            </p>
          </div>

          {/* Submit button — BIG and first */}
          {canSubmit && (
            <button
              onClick={() => router.push(`/student/courses/${courseId}/activities/${actId}/submit`)}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl
                         bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm
                         transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Upload className="w-5 h-5" />
              Enviar Entrega
            </button>
          )}

          {/* Requirements (secondary info) */}
          {(activity.requiresFileUpload || activity.requiresLinkSubmission) && (
            <div className="text-xs text-subtle space-y-1 pt-2 border-t border-foreground/[0.06]">
              {activity.requiresFileUpload && <p className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> Debes adjuntar un archivo</p>}
              {activity.requiresLinkSubmission && <p className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Debes enviar un enlace</p>}
            </div>
          )}
        </div>
      ) : (
        /* ─── HAS SUBMISSION — Success banner first, then details ─── */
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Entrega cargada</p>
              <p className="text-xs text-emerald-400/70">
                Versión {submission.version} · {new Date(submission.submittedAt).toLocaleString('es-CO')}
                {submission.isLate && ' · Tardía'}
              </p>
            </div>
            <Badge
              variant={submission.status === 'reviewed' ? 'success' : submission.status === 'returned' ? 'warning' : 'info'}
              size="sm"
              className="ml-auto shrink-0"
            >
              {submission.status === 'reviewed' ? 'Calificada' : submission.status === 'returned' ? 'Devuelta' : 'Enviada'}
            </Badge>
          </div>

          {/* Submission details */}
          <SubmissionDetail submission={submission} />

          {/* Re-submit option */}
          {canResubmit && canSubmit && (
            <div className="pt-3 border-t border-foreground/[0.06]">
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
          )}
        </div>
      )}
    </Card>
  );
}

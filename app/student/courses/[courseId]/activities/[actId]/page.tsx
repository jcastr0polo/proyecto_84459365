'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ActivityDetail from '@/components/activities/ActivityDetail';
import SubmissionStatus from '@/components/student/SubmissionStatus';
import { nowColombia } from '@/lib/dateUtils';
import { startOfTodayColombia } from '@/lib/activityStatus';
import PromptViewer from '@/components/prompts/PromptViewer';
import type { Activity, Submission, AIPrompt } from '@/lib/types';
import { parseDateTimeColombia } from '@/lib/dateUtils';
import BackLink from '@/components/ui/BackLink';
import { ListChecks } from 'lucide-react';

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

  // Una marca de tiempo estable por render, no `new Date()` dentro del JSX.
  const now = useMemo(() => nowColombia(), []);
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);

  if (loading || !activity) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (!activity) return null;

  const isPastDue = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59') < now;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <BackLink href={`/student/courses/${courseId}/activities`}>Volver a actividades</BackLink>

      {activity.type === 'checklist' && (
        <Link
          href={`/student/courses/${courseId}/activities/${actId}/lista`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/40
                     bg-cyan-500/[0.1] px-5 py-5 transition-colors duration-[var(--dur-fast)]
                     hover:bg-cyan-500/[0.1] active:scale-[0.99] motion-reduce:active:scale-100
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">Abrir mi lista</span>
            <span className="block text-sm text-subtle mt-0.5">
              Aquí no se entrega nada: ve marcando lo que termines y tu docente lo ve al momento.
            </span>
          </span>
          <ListChecks className="w-5 h-5 text-cyan-500 shrink-0" aria-hidden="true" />
        </Link>
      )}

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
        /* En una lista de tareas no hay nada que entregar: el bloque de
           entrega les decía "Aún no has entregado" con un botón «Entregar»
           que lleva a un formulario vacío, y grita más que el acceso a la
           lista. Lo que hacen aquí es marcar, y eso ya está arriba. */
        submissionSlot={activity.type === 'checklist' ? undefined : (
          <SubmissionStatus
            activity={activity}
            submission={submission}
            isPastDue={isPastDue}
            courseId={courseId}
            actId={actId}
            today={today}
          />
        )}
      />
    </div>
  );
}

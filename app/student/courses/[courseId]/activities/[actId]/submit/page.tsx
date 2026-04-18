'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import SubmitForm from '@/components/submissions/SubmitForm';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import type { Activity, Submission, SubmissionLink } from '@/lib/types';

/**
 * Student — Submit Delivery Page
 * Full submit experience: form → progress → success screen
 */
export default function StudentSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const actId = params.actId as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [existing, setExisting] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newSubmission, setNewSubmission] = useState<Submission | null>(null);

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
          setExisting(data.submissions[0]);
        }
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [actId, courseId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit(data: { files: File[]; links: SubmissionLink[]; content?: string }) {
    setSubmitting(true);
    try {
      const formData = new FormData();

      // Add files
      for (const file of data.files) {
        formData.append('files', file);
      }

      // Add JSON data (content + links)
      formData.append('data', JSON.stringify({
        content: data.content,
        links: data.links,
      }));

      const res = await fetch(`/api/activities/${actId}/submissions`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast(result.error || 'Error al enviar entrega', 'error');
        return;
      }

      setNewSubmission(result.submission);
      setSuccess(true);
      toast(result.message || 'Entrega enviada', 'success');
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !activity) return <PageLoader />;

  // Block: reviewed submission
  if (existing && existing.status === 'reviewed') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <BackLink courseId={courseId} actId={actId} router={router} />
        <Card padding="lg">
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Entrega Calificada</h2>
            <p className="text-sm text-muted">
              Esta entrega ya fue calificada. No puedes re-enviar a menos que el docente la devuelva.
            </p>
          </div>
        </Card>
        <SubmissionDetail submission={existing} />
      </div>
    );
  }

  // Success screen
  if (success && newSubmission) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <BackLink courseId={courseId} actId={actId} router={router} />
        <Card padding="lg">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {newSubmission.version > 1 ? 'Re-entrega Registrada' : 'Entrega Registrada'}
            </h2>
            <p className="text-sm text-muted mb-1">
              Versión {newSubmission.version} · {new Date(newSubmission.submittedAt).toLocaleString('es-CO')}
            </p>
            {newSubmission.isLate && (
              <p className="text-xs text-amber-400 mt-2 flex items-center justify-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Marcada como entrega tardía</p>
            )}
          </div>
        </Card>

        {/* Submission summary */}
        <SubmissionDetail submission={newSubmission} />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/student/courses/${courseId}/activities/${actId}`)}
          >
            Ver Actividad
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/student/courses/${courseId}/activities`)}
          >
            Volver a actividades
          </Button>
        </div>
      </div>
    );
  }

  // Submit form
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <BackLink courseId={courseId} actId={actId} router={router} />

      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        {existing ? 'Re-enviar Entrega' : 'Enviar Entrega'}
      </h1>

      <SubmitForm
        activity={activity}
        onSubmit={handleSubmit}
        loading={submitting}
        existingVersion={existing?.version}
      />
    </div>
  );
}

function BackLink({ courseId, actId, router }: { courseId: string; actId: string; router: ReturnType<typeof useRouter> }) {
  return (
    <button
      onClick={() => router.push(`/student/courses/${courseId}/activities/${actId}`)}
      className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Volver a la actividad
    </button>
  );
}

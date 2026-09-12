'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Skeleton, SkeletonForm } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import SubmitForm from '@/components/submissions/SubmitForm';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import type { Activity, Submission, SubmissionLink } from '@/lib/types';
import BackLink from '@/components/ui/BackLink';

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
  const [progress, setProgress] = useState<number | undefined>(undefined);

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

      // XHR y no fetch: es la única forma de saber el progreso real de la
      // subida. Antes la barra la movía un temporizador que no sabía nada
      // del envío y trepaba hasta el 85% aunque no hubiera salido nada.
      const result = await new Promise<{ ok: boolean; body: { error?: string; message?: string; submission?: Submission } }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/activities/${actId}/submissions`);
        xhr.withCredentials = true;

        if (data.files.length > 0) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
          };
        }
        xhr.onload = () => {
          let body: { error?: string; message?: string; submission?: Submission } = {};
          try { body = JSON.parse(xhr.responseText); } catch { /* respuesta no JSON */ }
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, body });
        };
        xhr.onerror = () => reject(new Error('network'));
        xhr.onabort = () => reject(new Error('abort'));
        xhr.send(formData);
      });

      if (!result.ok || !result.body.submission) {
        toast(result.body.error || 'Error al enviar entrega', 'error');
        return;
      }

      setNewSubmission(result.body.submission);
      setSuccess(true);
      toast(result.body.message || 'Entrega enviada', 'success');
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
      setProgress(undefined);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-64" />
        <SkeletonForm fields={5} />
      </div>
    );
  }
  // El guard original era compuesto: sin esto se renderiza con datos nulos.
  if (!activity) return null;

  // Block: reviewed submission
  if (existing && existing.status === 'reviewed') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <BackLink href={`/student/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>
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
        <BackLink href={`/student/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>
        <Card padding="lg">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {newSubmission.version > 1 ? 'Re-entrega Registrada' : 'Entrega Registrada'}
            </h2>
            <p className="text-sm text-muted mb-1">
              Versión {newSubmission.version} · {formatDateTimeColombia(newSubmission.submittedAt)}
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
      <BackLink href={`/student/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>

      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        {existing ? 'Re-enviar Entrega' : 'Enviar Entrega'}
      </h1>

      <SubmitForm
        activity={activity}
        onSubmit={handleSubmit}
        loading={submitting}
        existingVersion={existing?.version}
        progress={progress}
      />
    </div>
  );
}


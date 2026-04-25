'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import ActivityForm from '@/components/activities/ActivityForm';
import type { ActivityFormData } from '@/components/activities/ActivityForm';
import type { Course, ActivityAttachment } from '@/lib/types';

/**
 * Admin — Create New Activity Page
 * Formulario dividido en secciones con soporte de upload y publicación directa
 */
export default function NewActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<ActivityAttachment[]>([]);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      } else {
        toast('Curso no encontrado', 'error');
        router.push('/admin/courses');
      }
    } catch {
      toast('Error al cargar curso', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  async function handleUploadFile(file: File): Promise<ActivityAttachment | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('destination', `activities/course-${courseId}`);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Error al subir archivo', 'error');
        return null;
      }

      toast('Archivo subido', 'success');
      const attachment = data.attachment as ActivityAttachment;
      setUploadedAttachments((prev) => [...prev, attachment]);
      return attachment;
    } catch {
      toast('Error de conexión al subir archivo', 'error');
      return null;
    }
  }

  async function handleSubmit(data: ActivityFormData, publish = false) {
    setSubmitting(true);
    try {
      // Create the activity
      const res = await fetch(`/api/courses/${courseId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al crear actividad', 'error');
        return;
      }

      const activityId = result.activity.id;

      // If there are attachments, update the activity to include them
      if (uploadedAttachments.length > 0) {
        await fetch(`/api/activities/${activityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      // Publish if requested
      if (publish) {
        const pubRes = await fetch(`/api/activities/${activityId}/publish`, { method: 'POST' });
        if (pubRes.ok) {
          toast('Actividad creada y publicada', 'success');
        } else {
          const pubData = await pubRes.json();
          toast(`Actividad creada pero no publicada: ${pubData.error}`, 'error');
        }
      } else {
        toast('Actividad guardada como borrador', 'success');
      }

      router.push(`/admin/courses/${courseId}/activities/${activityId}`);
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/activities`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a actividades
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Nueva Actividad</h1>
        {course && (
          <p className="text-sm text-subtle mt-1">
            {course.name} · <span className="font-mono">{course.code}</span>
          </p>
        )}
      </div>

      {/* Form */}
      <Card padding="lg">
        <ActivityForm
          courseId={courseId}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/admin/courses/${courseId}/activities`)}
          onUploadFile={handleUploadFile}
          loading={submitting}
        />
      </Card>
    </div>
  );
}

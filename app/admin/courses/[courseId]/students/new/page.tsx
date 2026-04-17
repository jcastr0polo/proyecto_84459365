'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import EnrollForm from '@/components/students/EnrollForm';
import type { EnrollFormData } from '@/components/students/EnrollForm';
import type { Course } from '@/lib/types';

export default function NewStudentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    message: string;
    created: boolean;
    studentName: string;
  } | null>(null);

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

  async function handleSubmit(data: EnrollFormData) {
    setSubmitting(true);
    setLastResult(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === 'ALREADY_ENROLLED') {
          toast(`${data.firstName} ya está inscrito en este curso`, 'info');
        } else {
          toast(result.error || 'Error al inscribir', 'error');
        }
        return;
      }

      const studentName = `${data.firstName} ${data.lastName}`;
      toast(result.message ?? `${studentName} inscrito exitosamente`, 'success');

      setLastResult({
        message: result.created
          ? `✅ Se creó la cuenta de ${studentName} y se inscribió al curso.`
          : `✅ ${studentName} ya tenía cuenta. Se vinculó al curso.`,
        created: result.created,
        studentName,
      });
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/students`)}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a estudiantes
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Inscribir Estudiante
        </h1>
        {course && (
          <p className="text-sm text-white/40 mt-1">
            {course.name} · <span className="font-mono">{course.code}</span>
          </p>
        )}
      </div>

      {/* Success result */}
      {lastResult && (
        <Card padding="md" className="border-emerald-500/20 bg-emerald-500/[0.04]">
          <p className="text-sm text-emerald-300 mb-3">{lastResult.message}</p>
          {!lastResult.created && (
            <p className="text-xs text-white/40 mb-3">
              ℹ️ El usuario ya existía en el sistema. Solo se creó la inscripción al curso.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLastResult(null)}
            >
              Inscribir otro
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/students`)}
            >
              Volver a la lista
            </Button>
          </div>
        </Card>
      )}

      {/* Form */}
      {!lastResult && (
        <Card padding="lg">
          <EnrollForm onSubmit={handleSubmit} loading={submitting} />
        </Card>
      )}

      {/* Help text */}
      <p className="text-xs text-white/20 leading-relaxed">
        Al inscribir un estudiante, se crea automáticamente su cuenta con la contraseña igual
        al número de documento. El estudiante deberá cambiarla en su primer inicio de sesión.
      </p>
    </div>
  );
}

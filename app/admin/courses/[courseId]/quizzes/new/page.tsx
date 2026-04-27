'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import QuizForm from '@/components/quizzes/QuizForm';
import type { Course } from '@/lib/types';

export default function NewQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al crear parcial', 'error');
        return;
      }
      toast('Parcial creado exitosamente', 'success');
      router.push(`/admin/courses/${courseId}/quizzes/${result.quiz.id}`);
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver a parciales
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Nuevo Parcial</h1>
        {course && <p className="text-sm text-subtle mt-1">{course.name} · <span className="font-mono">{course.code}</span></p>}
      </div>

      <Card padding="lg">
        <QuizForm onSubmit={handleSubmit} loading={submitting} courseId={courseId} />
      </Card>
    </div>
  );
}

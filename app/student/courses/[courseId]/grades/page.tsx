'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import StudentGradesView from '@/components/grades/StudentGradesView';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import type { StudentGradeSummary } from '@/lib/types';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import BackLink from '@/components/ui/BackLink';

/**
 * Student — My Grades Page
 * /student/courses/[courseId]/grades
 *
 * List of activities with grade (if published), feedback
 * Animated progress bar for acumulada
 * Large definitiva at the bottom
 */
export default function StudentGradesPage() {
  const params = useParams<{ courseId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentGradeSummary | null>(null);

  const courseId = params.courseId;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}/grades`, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudieron cargar las notas');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error cargando notas', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, toast]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
        {/* El bloque de la definitiva, que es lo primero que el estudiante busca */}
        <Skeleton className="h-44 rounded-xl" />
        <SkeletonList rows={3} />
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-subtle">No se pudieron cargar tus notas.</p>
        <Button variant="primary" size="md"
          onClick={() => { setLoading(true); setData(null); window.location.reload(); }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <BackLink href={`/student/courses/${courseId}`} className="mb-2">Volver al curso</BackLink>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mis Notas
        </h1>
        <p className="text-sm text-muted mt-1">{data.courseName}</p>
      </div>

      <StudentGradesView data={data} />
    </div>
  );
}

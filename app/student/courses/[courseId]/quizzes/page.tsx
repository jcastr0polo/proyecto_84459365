'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { formatDateShort } from '@/lib/dateUtils';
import type { Quiz } from '@/lib/types';
import { ClipboardList, Clock, Shield } from 'lucide-react';

export default function StudentQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes ?? []);
      }
    } catch {
      toast('Error al cargar parciales', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.push(`/student/courses/${courseId}`)}
        className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver al curso
      </button>

      <h1 className="text-2xl font-bold text-foreground tracking-tight">Parciales</h1>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-subtle" />}
          title="Sin parciales"
          description="No hay parciales disponibles para este curso."
        />
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quiz.id}`)}
              className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] hover:border-foreground/15 hover:bg-foreground/[0.06] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant={quiz.type === 'training' ? 'warning' : 'success'} size="sm">
                  {quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
                </Badge>
                <div className="flex items-center gap-2">
                  {quiz.timeLimit && (
                    <span className="text-xs text-subtle flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.timeLimit} min</span>
                  )}
                  {quiz.lockBrowser && (
                    <span className="text-xs text-amber-400 flex items-center gap-1"><Shield className="w-3 h-3" /></span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-foreground/90 mb-1">{quiz.title}</h3>
              {quiz.description && (
                <p className="text-xs text-subtle line-clamp-2 mb-2">{quiz.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-subtle">
                <span>{quiz.questions.length} preguntas</span>
                {quiz.maxAttempts > 0 && <span>{quiz.maxAttempts} intento{quiz.maxAttempts !== 1 ? 's' : ''}</span>}
                {quiz.endDate && (
                  <span>Hasta {formatDateShort(quiz.endDate)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

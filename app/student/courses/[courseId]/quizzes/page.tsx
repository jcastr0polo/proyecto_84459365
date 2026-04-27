'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { formatDateShort } from '@/lib/dateUtils';
import type { Quiz } from '@/lib/types';
import { ClipboardList, Clock, Shield, CheckCircle2, BarChart3 } from 'lucide-react';

interface QuizWithAttemptInfo extends Quiz {
  attemptCount: number;
  canAttempt: boolean;
  resultsAvailable: boolean;
}

export default function StudentQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [quizzes, setQuizzes] = useState<QuizWithAttemptInfo[]>([]);
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
              className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] hover:border-foreground/15 hover:bg-foreground/[0.06] transition-all"
            >
              <div
                onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quiz.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={quiz.type === 'training' ? 'warning' : 'success'} size="sm">
                      {quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
                    </Badge>
                    {quiz.attemptCount > 0 && !quiz.canAttempt && (
                      <Badge variant="neutral" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Completado
                      </Badge>
                    )}
                    {quiz.attemptCount > 0 && quiz.canAttempt && (
                      <Badge variant="info" size="sm">
                        {quiz.attemptCount} intento{quiz.attemptCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
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
                  {quiz.maxAttempts > 0 && <span>{quiz.attemptCount}/{quiz.maxAttempts} intento{quiz.maxAttempts !== 1 ? 's' : ''}</span>}
                  {quiz.endDate && (
                    <span>Hasta {formatDateShort(quiz.endDate)}</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {quiz.attemptCount > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/[0.06]">
                  {quiz.resultsAvailable ? (
                    <button
                      onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quiz.id}/results`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Ver resultados
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quiz.id}/results`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground/[0.04] text-subtle hover:bg-foreground/[0.08] transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" /> Resultados pendientes
                    </button>
                  )}
                  {quiz.canAttempt && (
                    <button
                      onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quiz.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                    >
                      Intentar de nuevo →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

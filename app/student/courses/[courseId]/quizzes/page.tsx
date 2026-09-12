'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { Quiz } from '@/lib/types';
import { ClipboardList, Clock, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { parseDateColombia, nowColombia } from '@/lib/dateUtils';
import { startOfTodayColombia } from '@/lib/activityStatus';

interface QuizWithAttemptInfo extends Quiz {
  attemptCount: number;
  canAttempt: boolean;
  resultsAvailable: boolean;
  notPresented?: boolean;
}

export default function StudentQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [quizzes, setQuizzes] = useState<QuizWithAttemptInfo[]>([]);
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.push(`/student/courses/${courseId}`)}
        className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver al curso
      </button>

      <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
        Parciales
      </h1>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-subtle" />}
          title="Sin parciales"
          description="No hay parciales disponibles para este curso."
        />
      ) : (
        <div className="space-y-3">
          {/* Los que aún se pueden presentar van primero: un parcial abierto
              con fecha de cierre es lo más urgente de esta pantalla. */}
          {[...quizzes]
            .sort((a, b) => Number(b.canAttempt) - Number(a.canAttempt))
            .map((quiz) => {
              const closes = quiz.endDate
                ? Math.round((parseDateColombia(quiz.endDate).getTime() - today.getTime()) / 86400000)
                : null;
              const urgent = closes !== null && closes <= 2 && quiz.canAttempt;
              const done = quiz.attemptCount > 0 && !quiz.canAttempt && !quiz.notPresented;

              return (
                <div
                  key={quiz.id}
                  className={`rounded-xl border transition-colors duration-[var(--dur-fast)]
                    ${urgent
                      ? 'border-amber-500/30 bg-amber-500/[0.05]'
                      : 'border-surface-border bg-surface'}`}
                >
                  {/* Enlace, no un div con onClick: así funciona con teclado,
                      se abre en otra pestaña y se anuncia como enlace. */}
                  <Link
                    href={`/student/courses/${courseId}/quizzes/${quiz.id}`}
                    className="block p-4 rounded-xl hover:bg-surface-hover
                               transition-colors duration-[var(--dur-fast)]
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{quiz.title}</p>
                        {quiz.description && (
                          <p className="text-xs text-subtle line-clamp-2 mt-1">{quiz.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {done && <Badge variant="neutral" size="sm">Completado</Badge>}
                        {quiz.notPresented && <Badge variant="danger" size="sm">No presentado</Badge>}
                        <Badge variant={quiz.type === 'training' ? 'warning' : 'info'} size="sm">
                          {quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2.5 text-micro text-faint flex-wrap">
                      <span>{quiz.questions.length} preguntas</span>
                      {quiz.timeLimit && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.timeLimit} min</span>
                      )}
                      {quiz.maxAttempts > 0 && !quiz.notPresented && (
                        <span>{quiz.attemptCount} de {quiz.maxAttempts} intentos</span>
                      )}
                      {quiz.notPresented && (
                        <span className="text-red-600 dark:text-red-400">Quedó en 0</span>
                      )}
                      {quiz.lockBrowser && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Shield className="w-3 h-3" />Navegador bloqueado
                        </span>
                      )}
                      {/* El cierre en palabras: "Hasta 13 de sept" no dice si
                          quedan tres semanas o tres horas. */}
                      {closes !== null && quiz.canAttempt && (
                        <span className={urgent ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                          {closes < 0 ? 'Cerrado'
                            : closes === 0 ? 'Cierra hoy'
                            : closes === 1 ? 'Cierra mañana'
                            : `Cierra en ${closes} días`}
                        </span>
                      )}
                    </div>
                  </Link>

                  {quiz.attemptCount > 0 && (
                    <div className="flex items-center gap-2 px-4 pb-4 pt-1">
                      <Link
                        href={`/student/courses/${courseId}/quizzes/${quiz.id}/results`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   transition-colors duration-[var(--dur-fast)]
                                   ${quiz.resultsAvailable
                                     ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                     : 'bg-foreground/[0.04] text-subtle hover:bg-foreground/[0.08]'}`}
                      >
                        {quiz.resultsAvailable
                          ? <><BarChart3 className="w-3.5 h-3.5" /> Ver resultados</>
                          : <><Clock className="w-3.5 h-3.5" /> Resultados pendientes</>}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

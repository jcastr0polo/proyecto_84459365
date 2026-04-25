'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { QuizAttempt } from '@/lib/types';
import { Clock } from 'lucide-react';

export default function StudentQuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quizInfo, setQuizInfo] = useState<{ id: string; title: string; type: string } | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/results`);
      if (res.ok) {
        const data = await res.json();
        setQuizInfo(data.quiz);
        setAttempts(data.attempts ?? []);
        setMessage(data.message ?? null);
      } else {
        toast('No se pudieron cargar los resultados', 'error');
      }
    } catch {
      toast('Error al cargar resultados', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}
        className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver a parciales
      </button>

      <h1 className="text-2xl font-bold text-foreground tracking-tight">Mis Resultados</h1>
      {quizInfo && <p className="text-sm text-subtle">{quizInfo.title}</p>}

      {message ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-muted">{message}</p>
        </Card>
      ) : attempts.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-muted">No tienes intentos en este parcial.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <Card key={attempt.id} padding="lg">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs text-subtle">Intento #{attempt.attemptNumber}</p>
                  <p className={`text-3xl font-bold tabular-nums ${
                    attempt.percentage >= 70 ? 'text-emerald-400' : attempt.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {attempt.percentage}%
                  </p>
                  <p className="text-xs text-subtle">{attempt.score}/{attempt.maxScore} puntos</p>
                </div>
                <div className="text-right">
                  {attempt.completedAt && (
                    <p className="text-xs text-subtle flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatDuration(attempt.startedAt, attempt.completedAt)}
                    </p>
                  )}
                  <p className="text-[11px] text-faint mt-1">
                    {new Date(attempt.completedAt || attempt.startedAt).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {attempt.autoSubmitted && (
                    <Badge variant="warning" size="sm" className="mt-1">Auto-enviado</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

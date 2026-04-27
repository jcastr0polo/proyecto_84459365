'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import type { QuizAttempt, QuizQuestion } from '@/lib/types';
import { Clock, CheckCircle2, ClockIcon, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

interface QuizInfo {
  id: string;
  title: string;
  type: string;
  questions?: QuizQuestion[];
}

export default function StudentQuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/results`);
      if (res.ok) {
        const data = await res.json();
        setQuizInfo(data.quiz);
        setAttempts(data.attempts ?? []);
        setMessage(data.message ?? null);
        setAttemptCount(data.attemptCount ?? data.attempts?.length ?? 0);
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
        <Card padding="lg" className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Parcial Enviado</h2>
          <p className="text-sm text-muted mb-4">{message}</p>
          {attemptCount > 0 && (
            <p className="text-xs text-subtle">Tienes {attemptCount} intento{attemptCount !== 1 ? 's' : ''} registrado{attemptCount !== 1 ? 's' : ''}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-faint">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>El profesor publicará los resultados cuando lo considere oportuno</span>
          </div>
        </Card>
      ) : attempts.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-muted">No tienes intentos en este parcial.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => {
            const isExpanded = expandedId === attempt.id;
            const questions = quizInfo?.questions;
            return (
              <Card key={attempt.id} padding="none" className="overflow-hidden">
                {/* Summary header — clickable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                  className="w-full text-left p-5 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-xs text-subtle">Intento #{attempt.attemptNumber}</p>
                      <p className={`text-3xl font-bold tabular-nums ${
                        attempt.percentage >= 70 ? 'text-emerald-400' : attempt.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {attempt.percentage}%
                      </p>
                      <p className="text-xs text-subtle">{attempt.score}/{attempt.maxScore} puntos</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {attempt.completedAt && (
                        <p className="text-xs text-subtle flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(attempt.startedAt, attempt.completedAt)}
                        </p>
                      )}
                      <p className="text-[11px] text-faint">
                        {formatDateTimeColombia(attempt.completedAt || attempt.startedAt)}
                      </p>
                      {attempt.autoSubmitted && (
                        <Badge variant="warning" size="sm">Auto-enviado</Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-cyan-400/70 mt-1">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded question-by-question detail */}
                {isExpanded && questions && (
                  <div className="border-t border-foreground/[0.06] p-5 space-y-5">
                    {questions.map((question, qIdx) => {
                      const answer = attempt.answers.find((a) => a.questionId === question.id);
                      const selectedIds = answer?.selectedOptionIds?.length
                        ? answer.selectedOptionIds
                        : answer?.selectedOptionId
                          ? [answer.selectedOptionId]
                          : [];
                      const gotPoints = answer?.pointsEarned ?? 0;
                      const isCorrect = gotPoints === question.points;
                      const isPartial = gotPoints > 0 && gotPoints < question.points;

                      return (
                        <div key={question.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isPartial
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}>
                              {qIdx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <MarkdownRenderer content={question.text} className="text-sm text-foreground/90 font-medium" />
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={question.type === 'single' ? 'info' : 'warning'} size="sm">
                                  {question.type === 'single' ? 'Única' : 'Ponderada'}
                                </Badge>
                                <span className={`text-xs font-medium ${
                                  isCorrect ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {gotPoints}/{question.points} pts
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="ml-8 space-y-1.5">
                            {question.options.map((opt) => {
                              const isSelected = selectedIds.includes(opt.id);
                              const isCorrectOption = opt.weight === 100 || (question.type === 'weighted' && opt.weight > 0);

                              let optClass = 'border-foreground/[0.06] bg-foreground/[0.01] text-subtle';
                              let icon = null;

                              if (isSelected && isCorrectOption) {
                                optClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
                                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                              } else if (isSelected && !isCorrectOption) {
                                optClass = 'border-red-500/30 bg-red-500/10 text-red-400';
                                icon = <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
                              } else if (!isSelected && isCorrectOption) {
                                optClass = 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400/60';
                                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0" />;
                              }

                              return (
                                <div key={opt.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${optClass}`}>
                                  {icon || <span className="w-3.5 h-3.5 shrink-0" />}
                                  <span className="flex-1">{opt.text}</span>
                                </div>
                              );
                            })}
                          </div>

                          {selectedIds.length === 0 && (
                            <p className="ml-8 text-xs text-faint italic">Sin respuesta</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
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

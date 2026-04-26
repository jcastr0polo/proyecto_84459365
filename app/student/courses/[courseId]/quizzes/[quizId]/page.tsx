'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { useAntiCheat } from '@/components/quizzes/useAntiCheat';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Quiz, QuizQuestion } from '@/lib/types';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { Clock, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QuizDetailResponse {
  quiz: Quiz;
  attemptCount: number;
  canAttempt: boolean;
}

interface SubmitResult {
  attempt: { id: string; attemptNumber: number; completedAt?: string; score?: number; maxScore?: number; percentage?: number; answers?: unknown[] };
  message: string;
}

export default function StudentTakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [canAttempt, setCanAttempt] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [blurWarnings, setBlurWarnings] = useState(0);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shuffle helper
  function shuffleArray<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.abs((seed * (i + 1)) % (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Fetch quiz
  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`);
      if (!res.ok) {
        toast('Parcial no disponible', 'error');
        router.push(`/student/courses/${courseId}/quizzes`);
        return;
      }
      const data: QuizDetailResponse = await res.json();
      setQuiz(data.quiz);
      setCanAttempt(data.canAttempt);
      setAttemptCount(data.attemptCount);
    } catch {
      toast('Error al cargar parcial', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast, router]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // Submit handler
  const doSubmit = useCallback(async (auto: boolean, finalBlurCount: number) => {
    if (submitting || result) return;
    setSubmitting(true);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    // Include unanswered questions with empty selection
    if (quiz) {
      for (const q of quiz.questions) {
        if (!answers[q.id]) {
          answerArray.push({ questionId: q.id, selectedOptionId: '' });
        }
      }
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answerArray.filter((a) => a.selectedOptionId),
          blurCount: finalBlurCount,
          autoSubmitted: auto,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Error al enviar', 'error');
        setSubmitting(false);
        return;
      }
      setResult(data);
      toast(data.message || 'Parcial enviado', auto ? 'info' : 'success');
    } catch {
      toast('Error de conexión', 'error');
      setSubmitting(false);
    }
  }, [submitting, result, answers, quiz, courseId, quizId, toast]);

  // Anti-cheat
  const { getBlurCount } = useAntiCheat({
    enabled: started && !result && (quiz?.lockBrowser ?? false),
    onBlur: (count) => {
      setBlurWarnings(count);
      if (count === 1) {
        toast('⚠️ No cambies de pestaña. Si pierdes el foco nuevamente, tu parcial se enviará automáticamente.', 'error');
      }
    },
    onAutoSubmit: (count) => {
      doSubmit(true, count);
    },
    maxBlurs: 2, // Auto-submit on 2nd blur
  });

  // Timer
  const doSubmitRef = useRef(doSubmit);
  doSubmitRef.current = doSubmit;
  const getBlurCountRef = useRef(getBlurCount);
  getBlurCountRef.current = getBlurCount;

  useEffect(() => {
    if (!started || !quiz?.timeLimit || result) return;

    const totalSeconds = quiz.timeLimit * 60;
    setTimeLeft(totalSeconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time's up — auto-submit
          clearInterval(timerRef.current!);
          doSubmitRef.current(true, getBlurCountRef.current());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, quiz?.timeLimit, result]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function selectAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  if (loading || !quiz) return <PageLoader />;

  // Result screen
  if (result) {
    const attempt = result.attempt;
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver a parciales
        </button>

        <Card padding="lg" className="text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Parcial Enviado</h2>
          <p className="text-sm text-muted mb-4">{result.message}</p>

          {attempt.percentage !== undefined && (
            <div className="mb-4">
              <p className={`text-4xl font-bold ${
                attempt.percentage >= 70 ? 'text-emerald-400' : attempt.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {attempt.percentage}%
              </p>
              <p className="text-xs text-subtle mt-1">{attempt.score}/{attempt.maxScore} puntos</p>
            </div>
          )}

          <p className="text-xs text-subtle">Intento #{attempt.attemptNumber}</p>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="primary" size="sm" onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}>
            Ver más parciales
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quizId}/results`)}>
            Ver resultados
          </Button>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver a parciales
        </button>

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">{quiz.title}</h1>
          {quiz.description && <MarkdownRenderer content={quiz.description} className="text-sm text-muted mb-4" />}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoItem label="Tipo" value={quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'} />
            <InfoItem label="Preguntas" value={`${quiz.questions.length}`} />
            <InfoItem label="Intentos" value={quiz.maxAttempts === 0 ? 'Ilimitados' : `${attemptCount}/${quiz.maxAttempts}`} />
            {quiz.timeLimit && <InfoItem label="Tiempo" value={`${quiz.timeLimit} minutos`} />}
          </div>

          {/* Warnings */}
          <div className="space-y-2 mb-6">
            {quiz.lockBrowser && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Anti-trampas activo</p>
                  <p className="text-[11px] text-amber-400/70">Si cambias de pestaña o pierdes el foco de la ventana, tu parcial se enviará automáticamente.</p>
                </div>
              </div>
            )}
            {quiz.timeLimit && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-cyan-300">Cronómetro de {quiz.timeLimit} minutos</p>
                  <p className="text-[11px] text-cyan-400/70">El parcial se enviará automáticamente cuando se acabe el tiempo.</p>
                </div>
              </div>
            )}
          </div>

          {!canAttempt ? (
            <div className="p-4 rounded-lg bg-red-500/[0.08] border border-red-500/20 text-center">
              <p className="text-sm font-medium text-red-300">Has alcanzado el máximo de intentos</p>
            </div>
          ) : (
            <button
              onClick={() => setStarted(true)}
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Comenzar Parcial
            </button>
          )}
        </Card>
      </div>
    );
  }

  // Taking quiz
  const displayQuestions = quiz.shuffleQuestions
    ? shuffleArray(quiz.questions, quiz.id.charCodeAt(0))
    : quiz.questions;

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      {/* Sticky header with timer + progress */}
      <div className="sticky top-0 z-20 bg-[var(--background)] py-3 border-b border-foreground/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{quiz.title}</h2>
            <Badge variant="info" size="sm">{answeredCount}/{totalQuestions}</Badge>
          </div>

          <div className="flex items-center gap-3">
            {blurWarnings > 0 && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="w-3 h-3 mr-0.5" /> {blurWarnings}
              </Badge>
            )}

            {timeLeft !== null && (
              <span className={`text-sm font-mono font-bold tabular-nums ${
                timeLeft <= 60 ? 'text-red-400 animate-pulse' : timeLeft <= 300 ? 'text-amber-400' : 'text-foreground'
              }`}>
                <Clock className="w-4 h-4 inline mr-1" />
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-foreground/[0.06] mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      {displayQuestions.map((question, idx) => {
        const displayOptions = quiz.shuffleOptions
          ? shuffleArray(question.options, question.id.charCodeAt(0))
          : question.options;

        return (
          <div key={question.id} className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-bold text-faint shrink-0 pt-0.5">{idx + 1}.</span>
              <div>
                <MarkdownRenderer content={question.text} className="text-sm font-medium text-foreground/90" />
                <span className="text-[10px] text-subtle">{question.points} pts · {question.type === 'single' ? 'Selección única' : 'Ponderada'}</span>
              </div>
            </div>

            <div className="ml-5 space-y-2">
              {displayOptions.map((opt) => {
                const isSelected = answers[question.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectAnswer(question.id, opt.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer min-h-[44px] ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-foreground'
                        : 'border-foreground/[0.08] bg-foreground/[0.02] text-muted hover:border-foreground/15 hover:bg-foreground/[0.05]'
                    }`}
                  >
                    <span className={`inline-block w-5 h-5 rounded-full border-2 mr-2 align-middle ${
                      isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-foreground/20'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submit button — sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-foreground/[0.06] p-4 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-xs text-subtle">{answeredCount} de {totalQuestions} respondidas</p>
          <Button
            variant="primary"
            disabled={submitting || answeredCount === 0}
            onClick={() => {
              if (answeredCount < totalQuestions) {
                setConfirmIncomplete(true);
                return;
              }
              doSubmit(false, getBlurCount());
            }}
          >
            {submitting ? 'Enviando...' : 'Enviar Parcial'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmIncomplete}
        onClose={() => setConfirmIncomplete(false)}
        onConfirm={() => { setConfirmIncomplete(false); doSubmit(false, getBlurCount()); }}
        title="Envío incompleto"
        message={`Solo respondiste ${answeredCount} de ${totalQuestions} preguntas. ¿Enviar de todas formas?`}
        confirmLabel="Enviar"
        variant="warning"
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
      <p className="text-[10px] text-subtle uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-muted">{value}</p>
    </div>
  );
}

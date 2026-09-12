'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useQuizSession } from '@/lib/useQuizSession';
import { useAntiCheat } from '@/components/quizzes/useAntiCheat';
import type { Quiz } from '@/lib/types';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { Clock, Shield } from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import QuizRunner from '@/components/quizzes/QuizRunner';

interface QuizDetailResponse {
  quiz: Quiz;
  attemptCount: number;
  canAttempt: boolean;
  resultsAvailable?: boolean;
  notPresented?: boolean;
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

  // La sesión guarda la fecha límite y las respuestas, así que recargar o
  // cambiar de pestaña ya no regala tiempo ni pierde el trabajo.
  const { started, answers, timeLeft, expired, start, setAnswer, clearSession, startedAtISO } =
    useQuizSession(quizId, quiz?.timeLimit);
  const [resultsAvailable, setResultsAvailable] = useState(false);
  const [notPresented, setNotPresented] = useState(false);
  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [blurWarnings, setBlurWarnings] = useState(0);

  // Shuffle helper
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
      setResultsAvailable(data.resultsAvailable ?? false);
      setNotPresented(data.notPresented ?? false);
    } catch {
      toast('Error al cargar parcial', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast, router]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // Submit handler
  const doSubmit = useCallback(async (auto: boolean, finalBlurCount: number) => {
    if (submitting || submitted) return;
    setSubmitting(true);

    // El intervalo lo limpia la propia sesión al desmontarse.

    const answerArray = Object.entries(answers).map(([questionId, value]) => {
      if (Array.isArray(value)) {
        return { questionId, selectedOptionId: value[0] || '', selectedOptionIds: value };
      }
      return { questionId, selectedOptionId: value as string };
    });

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
          answers: answerArray.filter((a) => a.selectedOptionId || (a as { selectedOptionIds?: string[] }).selectedOptionIds?.length),
          blurCount: finalBlurCount,
          autoSubmitted: auto,
          startedAt: startedAtISO(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Error al enviar', 'error');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      // Enviado: se borra la sesión para que al volver no se retome un
      // parcial que ya se entregó.
      clearSession();
      toast(data.message || 'Parcial enviado', auto ? 'info' : 'success');
      router.push(`/student/courses/${courseId}/quizzes/${quizId}/results`);
    } catch {
      toast('Error de conexión', 'error');
      setSubmitting(false);
    }
  }, [submitting, submitted, answers, quiz, courseId, quizId, toast, router, clearSession, startedAtISO]);

  // Anti-cheat
  const { getBlurCount } = useAntiCheat({
    enabled: started && !submitted && (quiz?.lockBrowser ?? false),
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

  // El envío automático al agotarse el tiempo lo dispara la sesión.
  const doSubmitRef = useRef(doSubmit);
  doSubmitRef.current = doSubmit;
  const getBlurCountRef = useRef(getBlurCount);
  getBlurCountRef.current = getBlurCount;

  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!expired || submitted || autoSentRef.current) return;
    autoSentRef.current = true;
    doSubmitRef.current(true, getBlurCountRef.current());
  }, [expired, submitted]);

  if (loading || !quiz) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (!quiz) return null;

  // Pre-start screen
  /* `submitted` entra aquí porque al enviar se cierra la sesión, y sin esto
     la pantalla de inicio parpadearía un instante antes de navegar a los
     resultados: el estudiante vería "Comenzar parcial" justo después de
     entregarlo. */
  if (!started && !submitted) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <BackLink href={`/student/courses/${courseId}/quizzes`}>Volver a parciales</BackLink>

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">{quiz.title}</h1>
          {quiz.description && <MarkdownRenderer content={quiz.description} className="text-sm text-muted mb-4" />}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoItem label="Tipo" value={quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'} />
            <InfoItem label="Preguntas" value={`${quiz.questions.length}`} />
            <InfoItem label="Intentos"
              value={notPresented ? 'No presentado' : quiz.maxAttempts === 0 ? 'Ilimitados' : `${attemptCount}/${quiz.maxAttempts}`} />
            {quiz.timeLimit && <InfoItem label="Tiempo" value={`${quiz.timeLimit} minutos`} />}
          </div>

          {/* Warnings */}
          <div className="space-y-2 mb-6">
            {quiz.lockBrowser && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Anti-trampas activo</p>
                  <p className="text-meta text-amber-400/70">Si cambias de pestaña o pierdes el foco de la ventana, tu parcial se enviará automáticamente.</p>
                </div>
              </div>
            )}
            {quiz.timeLimit && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-cyan-300">Cronómetro de {quiz.timeLimit} minutos</p>
                  <p className="text-meta text-cyan-400/70">El parcial se enviará automáticamente cuando se acabe el tiempo.</p>
                </div>
              </div>
            )}
          </div>

          {!canAttempt ? (
            <div className="space-y-4">
              {/* No es lo mismo gastarse los intentos que no haberse
                  presentado nunca; decirle lo primero cuando pasó lo segundo
                  lo manda a reclamar por donde no es. */}
              <div className="p-4 rounded-lg bg-red-500/[0.08] border border-red-500/20 text-center">
                <p className="text-sm font-medium text-red-600 dark:text-red-300">
                  {notPresented ? 'No presentaste este parcial' : 'Has alcanzado el máximo de intentos'}
                </p>
                {notPresented && (
                  <p className="text-xs text-subtle mt-1">
                    Tu docente lo cerró con 0. Si crees que es un error, háblalo con él.
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}>
                  Volver a parciales
                </Button>
                <Button variant="primary" size="sm" onClick={() => router.push(`/student/courses/${courseId}/quizzes/${quizId}/results`)}>
                  {resultsAvailable ? 'Ver mis resultados' : 'Ver estado'}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" className="w-full shadow-lg shadow-cyan-500/20" onClick={start}>
              Comenzar Parcial
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Presentar el parcial — la MISMA pantalla que ve el docente al simular.
  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      <QuizRunner
        quiz={quiz}
        answers={answers}
        onAnswer={setAnswer}
        timeLeft={timeLeft}
        blurWarnings={blurWarnings}
        submitting={submitting}
        onSubmit={() => doSubmit(false, getBlurCount())}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
      <p className="text-micro text-subtle uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-muted">{value}</p>
    </div>
  );
}

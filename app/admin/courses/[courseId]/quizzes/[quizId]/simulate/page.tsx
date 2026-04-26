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
import type { Quiz, QuizAnswer, QuizSimulation } from '@/lib/types';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { Clock, Shield, AlertTriangle, CheckCircle2, FlaskConical, RotateCcw, Eye, History } from 'lucide-react';

interface SimulationResult {
  attempt: {
    id: string;
    attemptNumber: number;
    completedAt?: string;
    score?: number;
    maxScore?: number;
    percentage?: number;
    answers?: QuizAnswer[];
    blurCount?: number;
    autoSubmitted?: boolean;
  };
  simulation: boolean;
  message: string;
}

export default function AdminQuizSimulatePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [blurWarnings, setBlurWarnings] = useState(0);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [history, setHistory] = useState<QuizSimulation[]>([]);
  const [reviewingSim, setReviewingSim] = useState<QuizSimulation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function shuffleArray<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.abs((seed * (i + 1)) % (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`);
      if (!res.ok) {
        toast('Parcial no encontrado', 'error');
        router.push(`/admin/courses/${courseId}/quizzes/${quizId}`);
        return;
      }
      const data = await res.json();
      setQuiz(data.quiz);
    } catch {
      toast('Error al cargar parcial', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast, router]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/simulations`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.simulations ?? []);
      }
    } catch { /* silent */ }
  }, [courseId, quizId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const doSubmit = useCallback(async (auto: boolean, finalBlurCount: number) => {
    if (submitting || result) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = Object.entries(answers).map(([questionId, value]) => {
      if (Array.isArray(value)) {
        return { questionId, selectedOptionId: value[0] || '', selectedOptionIds: value };
      }
      return { questionId, selectedOptionId: value as string };
    });

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
          answers: answerArray.filter((a) => a.selectedOptionId || a.selectedOptionIds?.length),
          blurCount: finalBlurCount,
          autoSubmitted: auto,
          simulate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Error al enviar', 'error');
        setSubmitting(false);
        return;
      }
      setResult(data);
      toast(data.message || 'Simulación completada', auto ? 'info' : 'success');
      fetchHistory();
    } catch {
      toast('Error de conexión', 'error');
      setSubmitting(false);
    }
  }, [submitting, result, answers, quiz, courseId, quizId, toast, fetchHistory]);

  const { getBlurCount } = useAntiCheat({
    enabled: started && !result && (quiz?.lockBrowser ?? false),
    onBlur: (count) => {
      setBlurWarnings(count);
      if (count === 1) {
        toast('⚠️ Anti-trampas: primera pérdida de foco detectada', 'info');
      }
    },
    onAutoSubmit: (count) => {
      doSubmit(true, count);
    },
    maxBlurs: 2,
  });

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
          clearInterval(timerRef.current!);
          doSubmitRef.current(true, getBlurCountRef.current());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, quiz?.timeLimit, result]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function selectAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function toggleWeightedAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId];
      const arr = Array.isArray(current) ? [...current] : current ? [current] : [];
      const idx = arr.indexOf(optionId);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(optionId);
      return { ...prev, [questionId]: arr.length > 0 ? arr : [] };
    });
  }

  function resetSimulation() {
    setStarted(false);
    setSubmitting(false);
    setResult(null);
    setAnswers({});
    setTimeLeft(null);
    setBlurWarnings(0);
  }

  if (loading || !quiz) return <PageLoader />;

  const SIMULATION_BANNER = (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
      <FlaskConical className="w-5 h-5 text-purple-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-purple-300">Modo Simulación</p>
        <p className="text-[11px] text-purple-400/70">Estás probando el parcial como docente. Nada se guarda.</p>
      </div>
      <Badge variant="neutral" size="sm">Admin</Badge>
    </div>
  );

  // ─── RESULTS ───
  if (result) {
    const attempt = result.attempt;
    const quizAnswers = attempt.answers ?? [];

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}`)}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver al parcial
        </button>

        {SIMULATION_BANNER}

        <Card padding="lg" className="text-center">
          <CheckCircle2 className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Simulación Completada</h2>
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

          {/* Behavior log */}
          <div className="flex items-center justify-center gap-4 text-xs text-subtle mt-4">
            <span>Blur count: <strong className={attempt.blurCount ? 'text-amber-400' : 'text-emerald-400'}>{attempt.blurCount ?? 0}</strong></span>
            <span>Auto-submit: <strong className={attempt.autoSubmitted ? 'text-red-400' : 'text-emerald-400'}>{attempt.autoSubmitted ? 'Sí' : 'No'}</strong></span>
          </div>
        </Card>

        {/* Answer breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">Detalle por pregunta</h3>
          {quiz.questions.map((question, idx) => {
            const answer = quizAnswers.find((a) => a.questionId === question.id);
            const earned = answer?.pointsEarned ?? 0;
            const isCorrect = earned === question.points;
            const isPartial = earned > 0 && earned < question.points;

            return (
              <div key={question.id} className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs font-bold text-faint shrink-0 pt-0.5">{idx + 1}.</span>
                  <div className="flex-1">
                    <MarkdownRenderer content={question.text} className="text-sm font-medium text-foreground/90" />
                    <span className={`text-[10px] font-medium ${
                      isCorrect ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {earned}/{question.points} pts
                      {!answer ? ' — Sin responder' : isCorrect ? ' ✓' : ''}
                    </span>
                  </div>
                </div>

                <div className="ml-5 space-y-1.5">
                  {question.options.map((opt) => {
                    const isSelected = question.type === 'weighted'
                      ? (answer?.selectedOptionIds ?? []).includes(opt.id) || answer?.selectedOptionId === opt.id
                      : answer?.selectedOptionId === opt.id;
                    const isCorrectOpt = question.type === 'single' ? opt.weight === 100 : opt.weight > 0;
                    const isBestOpt = question.type === 'weighted' && opt.weight === Math.max(...question.options.map(o => o.weight));
                    return (
                      <div
                        key={opt.id}
                        className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${
                          isSelected && isCorrectOpt
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : isSelected && !isCorrectOpt
                              ? 'border-red-500/30 bg-red-500/10 text-red-300'
                              : isCorrectOpt
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-muted'
                                : 'border-foreground/[0.06] text-subtle'
                        }`}
                      >
                        {isSelected && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isSelected && !isCorrectOpt && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                        {!isSelected && isBestOpt && <Eye className="w-4 h-4 text-emerald-400/50 shrink-0" />}
                        {!isSelected && isCorrectOpt && !isBestOpt && <Eye className="w-4 h-4 text-amber-400/50 shrink-0" />}
                        <span className="flex-1">{opt.text}</span>
                        {question.type === 'weighted' && (
                          <span className={`text-[10px] shrink-0 font-mono ${opt.weight >= 80 ? 'text-emerald-400' : opt.weight > 0 ? 'text-amber-400' : 'text-faint'}`}>peso: {opt.weight}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-3 pb-8">
          <Button variant="secondary" size="sm" onClick={resetSimulation}>
            <RotateCcw className="w-4 h-4 mr-1" /> Repetir simulación
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}`)}>
            Volver al parcial
          </Button>
        </div>
      </div>
    );
  }

  // ─── REVIEWING PAST SIMULATION ───
  if (reviewingSim) {
    const simAnswers = reviewingSim.answers ?? [];
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => setReviewingSim(null)}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver al historial
        </button>

        <Card padding="lg" className="text-center">
          <History className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Revisión de Simulación</h2>
          <p className="text-xs text-subtle mb-3">
            {new Date(reviewingSim.simulatedAt).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {reviewingSim.adminName ? ` · ${reviewingSim.adminName}` : ''}
          </p>
          <p className={`text-4xl font-bold ${
            reviewingSim.percentage >= 70 ? 'text-emerald-400' : reviewingSim.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {reviewingSim.percentage}%
          </p>
          <p className="text-xs text-subtle mt-1">{reviewingSim.score}/{reviewingSim.maxScore} puntos</p>
          <div className="flex items-center justify-center gap-4 text-xs text-subtle mt-3">
            <span>Blur: <strong className={reviewingSim.blurCount ? 'text-amber-400' : 'text-emerald-400'}>{reviewingSim.blurCount}</strong></span>
            <span>Auto-envío: <strong className={reviewingSim.autoSubmitted ? 'text-red-400' : 'text-emerald-400'}>{reviewingSim.autoSubmitted ? 'Sí' : 'No'}</strong></span>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">Detalle por pregunta</h3>
          {quiz.questions.map((question, idx) => {
            const answer = simAnswers.find((a) => a.questionId === question.id);
            const earned = answer?.pointsEarned ?? 0;
            const isCorrect = earned === question.points;
            const isPartial = earned > 0 && earned < question.points;

            return (
              <div key={question.id} className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs font-bold text-faint shrink-0 pt-0.5">{idx + 1}.</span>
                  <div className="flex-1">
                    <MarkdownRenderer content={question.text} className="text-sm font-medium text-foreground/90" />
                    <span className={`text-[10px] font-medium ${
                      isCorrect ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {earned}/{question.points} pts
                      {!answer ? ' — Sin responder' : isCorrect ? ' ✓' : ''}
                    </span>
                  </div>
                </div>

                <div className="ml-5 space-y-1.5">
                  {question.options.map((opt) => {
                    const isSelected = question.type === 'weighted'
                      ? (answer?.selectedOptionIds ?? []).includes(opt.id) || answer?.selectedOptionId === opt.id
                      : answer?.selectedOptionId === opt.id;
                    const isCorrectOpt = question.type === 'single' ? opt.weight === 100 : opt.weight > 0;
                    const isBestOpt = question.type === 'weighted' && opt.weight === Math.max(...question.options.map(o => o.weight));
                    return (
                      <div
                        key={opt.id}
                        className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${
                          isSelected && isCorrectOpt
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : isSelected && !isCorrectOpt
                              ? 'border-red-500/30 bg-red-500/10 text-red-300'
                              : isCorrectOpt
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-muted'
                                : 'border-foreground/[0.06] text-subtle'
                        }`}
                      >
                        {isSelected && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isSelected && !isCorrectOpt && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                        {!isSelected && isBestOpt && <Eye className="w-4 h-4 text-emerald-400/50 shrink-0" />}
                        {!isSelected && isCorrectOpt && !isBestOpt && <Eye className="w-4 h-4 text-amber-400/50 shrink-0" />}
                        <span className="flex-1">{opt.text}</span>
                        {question.type === 'weighted' && (
                          <span className={`text-[10px] shrink-0 font-mono ${opt.weight >= 80 ? 'text-emerald-400' : opt.weight > 0 ? 'text-amber-400' : 'text-faint'}`}>peso: {opt.weight}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-3 pb-8">
          <Button variant="secondary" size="sm" onClick={() => setReviewingSim(null)}>
            <RotateCcw className="w-4 h-4 mr-1" /> Volver
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setReviewingSim(null); resetSimulation(); }}>
            <FlaskConical className="w-4 h-4 mr-1" /> Nueva simulación
          </Button>
        </div>
      </div>
    );
  }

  // ─── PRE-START ───
  if (!started) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}`)}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver al parcial
        </button>

        {SIMULATION_BANNER}

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">{quiz.title}</h1>
          {quiz.description && <MarkdownRenderer content={quiz.description} className="text-sm text-muted mb-4" />}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoItem label="Preguntas" value={`${quiz.questions.length}`} />
            <InfoItem label="Pts total" value={`${quiz.questions.reduce((s, q) => s + q.points, 0)}`} />
            {quiz.timeLimit && <InfoItem label="Tiempo" value={`${quiz.timeLimit} min`} />}
            <InfoItem label="Anti-trampas" value={quiz.lockBrowser ? 'Activo' : 'Inactivo'} />
          </div>

          <div className="space-y-2 mb-6">
            {quiz.lockBrowser && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Anti-trampas activo</p>
                  <p className="text-[11px] text-amber-400/70">Si cambias de pestaña, el parcial se enviará automáticamente. Prueba esto durante la simulación.</p>
                </div>
              </div>
            )}
            {quiz.timeLimit && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-cyan-300">Cronómetro de {quiz.timeLimit} minutos</p>
                  <p className="text-[11px] text-cyan-400/70">Se enviará automáticamente al acabarse el tiempo.</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full py-3.5 px-6 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-purple-500/20"
          >
            <FlaskConical className="w-5 h-5 inline mr-2" />
            Iniciar Simulación
          </button>
        </Card>

        {/* Historial de simulaciones */}
        {history.length > 0 && (
          <Card padding="lg">
            <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3 flex items-center gap-2">
              <History className="w-3.5 h-3.5" /> Historial de Simulaciones ({history.length})
            </h3>
            <div className="space-y-2">
              {history.map((sim) => (
                <button
                  key={sim.id}
                  onClick={() => setReviewingSim(sim)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06] hover:border-purple-500/30 hover:bg-purple-500/[0.04] transition-colors cursor-pointer text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-subtle">
                      {new Date(sim.simulatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sim.autoSubmitted && <Badge variant="warning" size="sm">Auto-enviado</Badge>}
                      {sim.blurCount > 0 && <span className="text-[10px] text-amber-400">{sim.blurCount} blur</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold tabular-nums ${
                        sim.percentage >= 70 ? 'text-emerald-400' : sim.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {sim.percentage}%
                      </p>
                      <p className="text-[10px] text-subtle">{sim.score}/{sim.maxScore} pts</p>
                    </div>
                    <Eye className="w-4 h-4 text-purple-400/50" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ─── TAKING QUIZ ───
  const displayQuestions = quiz.shuffleQuestions
    ? shuffleArray(quiz.questions, quiz.id.charCodeAt(0))
    : quiz.questions;

  const answeredCount = Object.entries(answers).filter(([, v]) => Array.isArray(v) ? v.length > 0 : !!v).length;
  const totalQuestions = quiz.questions.length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      {/* Simulation banner — compact */}
      <div className="bg-purple-100 border border-purple-300 dark:bg-purple-950 dark:border-purple-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-600 dark:text-purple-300">Simulación en curso</span>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-base py-3 border-b border-foreground/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{quiz.title}</h2>
            <Badge variant="info" size="sm">{answeredCount}/{totalQuestions}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {blurWarnings > 0 && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="w-3 h-3 mr-0.5" /> Blur: {blurWarnings}
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
        <div className="w-full h-1 rounded-full bg-foreground/[0.06] mt-2 overflow-hidden">
          <div className="h-full rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
        </div>
      </div>

      {/* Questions */}
      {displayQuestions.map((question, idx) => {
        const displayOptions = quiz.shuffleOptions
          ? shuffleArray(question.options, question.id.charCodeAt(0))
          : question.options;
        const isWeighted = question.type === 'weighted';
        const currentAnswer = answers[question.id];
        const selectedIds = isWeighted
          ? (Array.isArray(currentAnswer) ? currentAnswer : currentAnswer ? [currentAnswer] : [])
          : [];

        return (
          <div key={question.id} className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-bold text-faint shrink-0 pt-0.5">{idx + 1}.</span>
              <div>
                <MarkdownRenderer content={question.text} className="text-sm font-medium text-foreground/90" />
                <span className="text-[10px] text-subtle">
                  {question.points} pts · {isWeighted ? 'Selección múltiple (selecciona las correctas)' : 'Selección única'}
                </span>
              </div>
            </div>
            <div className="ml-5 space-y-2">
              {displayOptions.map((opt) => {
                const isSelected = isWeighted ? selectedIds.includes(opt.id) : currentAnswer === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => isWeighted ? toggleWeightedAnswer(question.id, opt.id) : selectAnswer(question.id, opt.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer min-h-[44px] ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10 text-foreground'
                        : 'border-foreground/[0.08] bg-foreground/[0.02] text-muted hover:border-foreground/15 hover:bg-foreground/[0.05]'
                    }`}
                  >
                    {isWeighted ? (
                      <span className={`inline-block w-5 h-5 rounded mr-2 align-middle border-2 ${
                        isSelected ? 'border-purple-400 bg-purple-400' : 'border-foreground/20'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    ) : (
                      <span className={`inline-block w-5 h-5 rounded-full border-2 mr-2 align-middle ${
                        isSelected ? 'border-purple-400 bg-purple-400' : 'border-foreground/20'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    )}
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-base border-t border-foreground/[0.06] p-4 z-20">
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
            className="!bg-purple-500 hover:!bg-purple-400"
          >
            {submitting ? 'Enviando...' : 'Enviar Simulación'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmIncomplete}
        onClose={() => setConfirmIncomplete(false)}
        onConfirm={() => { setConfirmIncomplete(false); doSubmit(false, getBlurCount()); }}
        title="Envío incompleto"
        message={`Solo respondiste ${answeredCount} de ${totalQuestions} preguntas. ¿Enviar simulación de todas formas?`}
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

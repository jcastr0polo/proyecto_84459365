'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import type { QuizAttempt, QuizQuestion } from '@/lib/types';
import { AlertTriangle, Shield, Clock, ChevronDown, ChevronUp, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { gradeText, normalize, formatScore, PASS } from '@/lib/gradeScale';
import StatTile from '@/components/ui/StatTile';
import Chip from '@/components/ui/Chip';

type SortKey = 'recent' | 'top' | 'bottom' | 'name';

interface EnrichedAttempt extends QuizAttempt {
  student: { id: string; firstName: string; lastName: string; email: string; documentNumber: string } | null;
}

interface QuizInfo {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  questions: QuizQuestion[];
}

export default function AdminQuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('top');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/attempts`);
      if (res.ok) {
        const data = await res.json();
        setAttempts(data.attempts ?? []);
        setQuizInfo(data.quiz ?? null);
      } else {
        toast('No se pudieron cargar los resultados', 'error');
        router.push(`/admin/courses/${courseId}/quizzes/${quizId}`);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = attempts;
    if (flagFilter) result = result.filter((a) => a.flagged);
    if (failedOnly) result = result.filter((a) => normalize(a.percentage, 100) < PASS);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.student?.firstName.toLowerCase().includes(q) ||
        a.student?.lastName.toLowerCase().includes(q) ||
        a.student?.email.toLowerCase().includes(q) ||
        a.student?.documentNumber.includes(q)
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'top': return b.percentage - a.percentage;
        case 'bottom': return a.percentage - b.percentage;
        case 'name': {
          const nameA = a.student ? `${a.student.lastName} ${a.student.firstName}` : a.studentId;
          const nameB = b.student ? `${b.student.lastName} ${b.student.firstName}` : b.studentId;
          return nameA.localeCompare(nameB);
        }
        default: return new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime();
      }
    });
    return result;
  }, [attempts, flagFilter, failedOnly, search, sortBy]);

  // Stats
  const avgPercentage = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;
  // Reprobado según la escala del sistema: 3.0 sobre 5 son 60% de aciertos.
  const failedCount = attempts.filter((a) => normalize(a.percentage, 100) < PASS).length;
  const flaggedCount = attempts.filter((a) => a.flagged).length;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver al parcial
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Resultados</h1>
        {quizInfo && <p className="text-sm text-subtle mt-1">{quizInfo.title}</p>}
      </div>

      {/*
        Métricas que responden preguntas. El promedio iba en porcentaje
        mientras todo el resto del sistema va sobre 5, así que el docente
        tenía que convertir de cabeza. Y faltaba lo accionable: cuántos
        reprobaron. Los contadores filtran, no solo informan.
      */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Intentos" value={String(attempts.length)}
          hint={`${new Set(attempts.map((a) => a.studentId)).size} estudiantes`} />
        <StatTile label="Promedio" value={formatScore(normalize(avgPercentage, 100))}
          tone={gradeText(normalize(avgPercentage, 100))} hint={`${avgPercentage}% de aciertos`} />
        <StatTile label="Reprobados" value={String(failedCount)}
          tone={failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={failedCount > 0 ? 'border-red-500/25 bg-red-500/[0.06]' : undefined}
          onClick={failedCount > 0 ? () => { setFailedOnly((v) => !v); setFlagFilter(false); } : undefined}
          hint={failedCount > 0 ? (failedOnly ? 'quitar filtro' : 'ver quiénes') : 'ninguno bajo 3.0'} />
        <StatTile label="Sospechosos" value={String(flaggedCount)}
          tone={flaggedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={flaggedCount > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : undefined}
          onClick={flaggedCount > 0 ? () => { setFlagFilter((v) => !v); setFailedOnly(false); } : undefined}
          hint={flaggedCount > 0 ? (flagFilter ? 'quitar filtro' : 'ver cuáles') : 'sin incidencias'} />
      </div>

      {attempts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar estudiante..." className="w-full sm:w-64" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {([['top', 'Mejor primero'], ['bottom', 'Peor primero'], ['name', 'Por nombre'], ['recent', 'Más reciente']] as [SortKey, string][]).map(([key, label]) => (
              <Chip key={key} active={sortBy === key} onClick={() => setSortBy(key)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Attempts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
          <p className="text-subtle">{attempts.length === 0 ? 'Nadie ha presentado este parcial aún.' : 'Sin resultados para esos filtros.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((attempt, idx) => {
            const isExpanded = expandedId === attempt.id;
            const showRank = sortBy === 'top' || sortBy === 'bottom';
            return (
              <div
                key={attempt.id}
                className={`rounded-xl border transition-colors ${
                  attempt.flagged ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-foreground/[0.08] bg-foreground/[0.02]'
                }`}
              >
                {/* Header row — clickable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                  className="w-full text-left p-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1 flex items-start gap-2.5">
                      {showRank && (
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-foreground/[0.06] text-subtle'
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground/90 truncate">
                          {attempt.student ? `${attempt.student.lastName}, ${attempt.student.firstName}` : attempt.studentId}
                        </p>
                        {attempt.student && <p className="text-meta text-subtle truncate">{attempt.student.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-lg font-bold tabular-nums ${
                        /* La escala del sistema, no una propia: con los
                           umbrales anteriores un 55% salía en ámbar estando
                           reprobado, y un 72% en verde yendo raspando. */
                        gradeText(normalize(attempt.percentage, 100))
                      }`}>
                        {attempt.percentage}%
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-subtle" /> : <ChevronDown className="w-4 h-4 text-subtle" />}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                    <span>Intento {attempt.attemptNumber}</span>
                    <span>{attempt.score}/{attempt.maxScore} pts</span>
                    {attempt.completedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(attempt.startedAt, attempt.completedAt)}
                      </span>
                    )}
                    {attempt.flagged && (
                      <Badge variant="danger" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-0.5" /> Sospechoso
                      </Badge>
                    )}
                    {attempt.autoSubmitted && (
                      <Badge variant="warning" size="sm">
                        <Shield className="w-3 h-3 mr-0.5" /> Auto-enviado
                      </Badge>
                    )}
                    {attempt.blurCount > 0 && (
                      <span className="text-amber-400">{attempt.blurCount} pérdidas de foco</span>
                    )}
                    <span className="flex items-center gap-1 text-cyan-400/70 ml-auto">
                      <Eye className="w-3 h-3" /> {isExpanded ? 'Ocultar' : 'Ver respuestas'}
                    </span>
                  </div>
                </button>

                {/* Expanded detail — question by question */}
                {isExpanded && quizInfo?.questions && (
                  <div className="border-t border-foreground/[0.06] p-4 space-y-4">
                    {quizInfo.questions.map((question, qIdx) => {
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
                            <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-micro font-bold ${
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
                          <div className="ml-7 space-y-1">
                            {question.options.map((opt) => {
                              const isSelected = selectedIds.includes(opt.id);
                              const isCorrectOption = opt.weight === 100 || (question.type === 'weighted' && opt.weight > 0);

                              let optClass = 'border-foreground/[0.06] bg-foreground/[0.01] text-subtle';
                              let icon = null;

                              if (isSelected && isCorrectOption) {
                                // Correct selection
                                optClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
                                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                              } else if (isSelected && !isCorrectOption) {
                                // Wrong selection
                                optClass = 'border-red-500/30 bg-red-500/10 text-red-400';
                                icon = <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
                              } else if (!isSelected && isCorrectOption) {
                                // Missed correct option
                                optClass = 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400/60';
                                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0" />;
                              }

                              return (
                                <div key={opt.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${optClass}`}>
                                  {icon || <span className="w-3.5 h-3.5 shrink-0" />}
                                  <span className="flex-1">{opt.text}</span>
                                  {question.type === 'weighted' && opt.weight > 0 && (
                                    <span className="text-micro text-subtle shrink-0">{opt.weight}%</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* No answer */}
                          {selectedIds.length === 0 && (
                            <p className="ml-7 text-xs text-faint italic">Sin respuesta</p>
                          )}
                        </div>
                      );
                    })}
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

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { QuizAttempt } from '@/lib/types';
import { AlertTriangle, Shield, Clock } from 'lucide-react';

interface EnrichedAttempt extends QuizAttempt {
  student: { id: string; firstName: string; lastName: string; email: string; documentNumber: string } | null;
}

export default function AdminQuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);
  const [quizInfo, setQuizInfo] = useState<{ id: string; title: string; type: string; maxScore: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState(false);

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
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.student?.firstName.toLowerCase().includes(q) ||
        a.student?.lastName.toLowerCase().includes(q) ||
        a.student?.email.toLowerCase().includes(q) ||
        a.student?.documentNumber.includes(q)
      );
    }
    return result;
  }, [attempts, flagFilter, search]);

  // Stats
  const avgPercentage = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;
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

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-cyan-400">{attempts.length}</p>
          <p className="text-[10px] text-subtle uppercase tracking-wider">Intentos</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-foreground">{avgPercentage}%</p>
          <p className="text-[10px] text-subtle uppercase tracking-wider">Promedio</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : 0}%
          </p>
          <p className="text-[10px] text-subtle uppercase tracking-wider">Mejor</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className={`text-2xl font-bold ${flaggedCount > 0 ? 'text-red-400' : 'text-foreground'}`}>{flaggedCount}</p>
          <p className="text-[10px] text-subtle uppercase tracking-wider">Sospechosos</p>
        </Card>
      </div>

      {/* Filters */}
      {attempts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar estudiante..." className="w-full sm:w-72" />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
            <input
              type="checkbox"
              checked={flagFilter}
              onChange={(e) => setFlagFilter(e.target.checked)}
              className="w-4 h-4 rounded accent-red-500"
            />
            Solo sospechosos ({flaggedCount})
          </label>
        </div>
      )}

      {/* Attempts table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
          <p className="text-subtle">{attempts.length === 0 ? 'Nadie ha presentado este parcial aún.' : 'Sin resultados para esos filtros.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile cards */}
          {filtered.map((attempt) => (
            <div
              key={attempt.id}
              className={`p-4 rounded-xl border ${
                attempt.flagged ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-foreground/[0.08] bg-foreground/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/90 truncate">
                    {attempt.student ? `${attempt.student.lastName}, ${attempt.student.firstName}` : attempt.studentId}
                  </p>
                  {attempt.student && <p className="text-[11px] text-subtle truncate">{attempt.student.email}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-lg font-bold tabular-nums ${
                    attempt.percentage >= 70 ? 'text-emerald-400' : attempt.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {attempt.percentage}%
                  </span>
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
              </div>
            </div>
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

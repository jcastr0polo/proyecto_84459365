'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { Quiz, Course } from '@/lib/types';
import { ClipboardList, Search, Clock, Shield, Eye, EyeOff } from 'lucide-react';

type TypeFilter = 'all' | 'training' | 'graded';

export default function CourseQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/quizzes`),
        fetch(`/api/courses/${courseId}`),
      ]);
      if (qRes.ok) {
        const data = await qRes.json();
        setQuizzes(data.quizzes ?? []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setCourse(data.course);
      } else {
        toast('Curso no encontrado', 'error');
        router.push('/admin/courses');
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = quizzes;
    if (typeFilter !== 'all') result = result.filter((q) => q.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((quiz) => quiz.title.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quizzes, typeFilter, search]);

  const trainingCount = quizzes.filter((q) => q.type === 'training').length;
  const gradedCount = quizzes.filter((q) => q.type === 'graded').length;
  const activeCount = quizzes.filter((q) => q.isActive).length;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push(`/admin/courses/${courseId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors mb-4 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver al curso
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Parciales</h1>
            {course && (
              <p className="text-sm text-subtle mt-1">{course.name} · <span className="font-mono">{course.code}</span></p>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/quizzes/new`)}>
            + Nuevo Parcial
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="info" size="md">{quizzes.length} total</Badge>
        {trainingCount > 0 && <Badge variant="warning" size="md" dot>{trainingCount} entrenamiento</Badge>}
        {gradedCount > 0 && <Badge variant="success" size="md" dot>{gradedCount} calificables</Badge>}
        {activeCount > 0 && <Badge variant="info" size="md" dot>{activeCount} activos</Badge>}
      </div>

      {/* Filters */}
      {quizzes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="text"
              placeholder="Buscar parcial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-white placeholder:text-faint outline-none focus:border-cyan-500/50"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="training">Entrenamiento</option>
            <option value="graded">Calificable</option>
          </select>
        </div>
      )}

      {/* Quiz list */}
      {quizzes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-subtle" />}
          title="No hay parciales"
          description="Crea el primer parcial para este curso."
          action={
            <Button variant="primary" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/quizzes/new`)}>
              + Nuevo Parcial
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-subtle" />}
          title="Sin resultados"
          description="No se encontraron parciales con esos filtros."
          action={<Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }}>Limpiar filtros</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((quiz) => (
            <div
              key={quiz.id}
              onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quiz.id}`)}
              className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] hover:border-foreground/15 hover:bg-foreground/[0.06] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant={quiz.type === 'training' ? 'warning' : 'success'} size="sm">
                  {quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
                </Badge>
                <Badge variant={quiz.isActive ? 'success' : 'neutral'} size="sm" dot>
                  {quiz.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              <h3 className="text-sm font-semibold text-foreground/90 mb-2 line-clamp-1">{quiz.title}</h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
                <span>{quiz.questions.length} pregunta{quiz.questions.length !== 1 ? 's' : ''}</span>
                {quiz.timeLimit && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.timeLimit} min</span>
                )}
                {quiz.lockBrowser && (
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Anti-trampas</span>
                )}
                <span className="flex items-center gap-1">
                  {quiz.resultsReleased ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {quiz.resultVisibility === 'immediate' ? 'Inmediato' : quiz.resultVisibility === 'after_all' ? 'Al terminar todos' : 'Manual'}
                </span>
                {quiz.maxAttempts > 0 && <span>{quiz.maxAttempts} intento{quiz.maxAttempts !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

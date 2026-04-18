'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { AlertTriangle, ClipboardList, Search } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import ActivityCard from '@/components/activities/ActivityCard';
import type { Activity, Course } from '@/lib/types';

type StatusFilter = 'all' | 'draft' | 'published' | 'closed';
type TypeFilter = 'all' | Activity['type'];

/**
 * Admin — Activities List Page
 * Displays all activities for a course with filtering, sorting, and weight progress
 */
export default function CourseActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const fetchData = useCallback(async () => {
    try {
      const [actRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/activities`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setActivities(data.activities ?? []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
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

  // Filter and sort
  const filtered = useMemo(() => {
    let result = activities;

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }

    // Sort by dueDate ascending
    result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return result;
  }, [activities, statusFilter, typeFilter]);

  // Weight accumulation
  const totalWeight = activities.reduce((sum, a) => sum + a.weight, 0);
  const draftCount = activities.filter((a) => a.status === 'draft').length;
  const publishedCount = activities.filter((a) => a.status === 'published').length;
  const closedCount = activities.filter((a) => a.status === 'closed').length;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <button
          onClick={() => router.push(`/admin/courses/${courseId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors mb-4 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al curso
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Actividades</h1>
            {course && (
              <p className="text-sm text-subtle mt-1">
                {course.name} · <span className="font-mono">{course.code}</span>
              </p>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}/activities/new`)}
          >
            + Nueva Actividad
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="info" size="md">{activities.length} total</Badge>
        {draftCount > 0 && (
          <Badge variant="warning" size="md" dot>{draftCount} borradores</Badge>
        )}
        {publishedCount > 0 && (
          <Badge variant="success" size="md" dot>{publishedCount} publicadas</Badge>
        )}
        {closedCount > 0 && (
          <Badge variant="neutral" size="md" dot>{closedCount} cerradas</Badge>
        )}
      </div>

      {/* Weight progress bar */}
      {activities.length > 0 && (
        <div className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted">Peso acumulado</span>
            <span className={`text-xs font-bold ${totalWeight > 100 ? 'text-red-400' : totalWeight === 100 ? 'text-emerald-400' : 'text-muted'}`}>
              {totalWeight}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalWeight > 100 ? 'bg-red-500' : totalWeight === 100 ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
          {totalWeight > 100 && (
            <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> El peso acumulado excede 100%. Revisa los porcentajes de las actividades.
            </p>
          )}
          {totalWeight < 100 && totalWeight > 0 && (
            <p className="mt-1.5 text-[11px] text-faint">
              Falta {100 - totalWeight}% por asignar
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      {activities.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filtrar por estado"
            className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground
                       outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="published">Publicadas</option>
            <option value="closed">Cerradas</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            aria-label="Filtrar por tipo"
            className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground
                       outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="project">Proyecto</option>
            <option value="exercise">Ejercicio</option>
            <option value="document">Documento</option>
            <option value="presentation">Presentación</option>
            <option value="prompt">Prompt IA</option>
            <option value="exam">Examen</option>
            <option value="other">Otro</option>
          </select>
        </div>
      )}

      {/* Activity list */}
      {activities.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-subtle" />}
          title="No hay actividades"
          description="Crea la primera actividad para este curso."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/activities/new`)}
            >
              + Nueva Actividad
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-subtle" />}
          title="Sin resultados"
          description="No se encontraron actividades con esos filtros."
          action={
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => router.push(`/admin/courses/${courseId}/activities/${activity.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

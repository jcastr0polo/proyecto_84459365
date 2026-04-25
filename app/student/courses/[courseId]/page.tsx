'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Rocket, MapPin, Clock, Calendar, Building2, Monitor, RefreshCw, ClipboardList } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { Course, Activity, Submission, StudentGradeSummary } from '@/lib/types';

type DeliveryStatus = 'delivered' | 'pending' | 'overdue' | 'graded' | 'returned';

function getDeliveryStatus(activity: Activity, submission: Submission | undefined): DeliveryStatus {
  if (submission) {
    if (submission.status === 'reviewed') return 'graded';
    if (submission.status === 'returned') return 'returned';
    return 'delivered';
  }
  const now = new Date();
  const due = new Date(activity.dueDate);
  if (now > due) return 'overdue';
  return 'pending';
}

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
  delivered: { label: 'Entregada', variant: 'success', icon: <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> },
  pending: { label: 'Pendiente', variant: 'warning', icon: <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> },
  overdue: { label: 'Vencida', variant: 'danger', icon: <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> },
  graded: { label: 'Calificada', variant: 'info', icon: <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> },
  returned: { label: 'Devuelta', variant: 'warning', icon: <span className="text-xs">↩</span> },
};

const DAY_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miércoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb',
};

const MODALITY_LABELS: Record<string, React.ReactNode> = {
  presencial: <><Building2 className="w-3 h-3 inline" /> Presencial</>,
  virtual: <><Monitor className="w-3 h-3 inline" /> Virtual</>,
  híbrido: <><RefreshCw className="w-3 h-3 inline" /> Híbrido</>,
};

const categoryBadge: Record<string, { variant: 'programming' | 'design' | 'management' | 'leadership' | 'other'; label: string }> = {
  programming: { variant: 'programming', label: 'Programación' },
  design: { variant: 'design', label: 'Diseño' },
  management: { variant: 'management', label: 'Gerencia' },
  leadership: { variant: 'leadership', label: 'Liderazgo' },
  other: { variant: 'other', label: 'Otro' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  } catch { return iso; }
}

function getScoreColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-400';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Student — Course Dashboard
 * /student/courses/[courseId]
 * Fase 21 — Shows schedule, activities with delivery status, accumulated grade
 */
export default function StudentCourseDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [gradeData, setGradeData] = useState<StudentGradeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, actRes, gradeRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/activities`),
        fetch(`/api/courses/${courseId}/grades`),
      ]);

      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data.course ?? null);
      } else {
        toast('Curso no encontrado', 'error');
        router.push('/student/courses');
        return;
      }

      const acts: Activity[] = actRes.ok ? (await actRes.json()).activities ?? [] : [];
      setActivities(acts);

      if (gradeRes.ok) {
        const gData = await gradeRes.json();
        setGradeData(gData);
      }

      // Fetch submissions
      const subMap: Record<string, Submission> = {};
      const publishedActs = acts.filter((a) => a.status !== 'draft');
      const subPromises = publishedActs.map(async (a) => {
        try {
          const res = await fetch(`/api/activities/${a.id}/submissions`);
          if (res.ok) {
            const data = await res.json();
            if (data.submissions?.length > 0) {
              subMap[a.id] = data.submissions[0];
            }
          }
        } catch { /* ignore */ }
      });
      await Promise.all(subPromises);
      setSubmissions(subMap);
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sort activities: pending/returned first, then by due date
  const sortedActivities = useMemo(() => {
    return [...activities]
      .filter((a) => a.status !== 'draft')
      .sort((a, b) => {
        const statusA = getDeliveryStatus(a, submissions[a.id]);
        const statusB = getDeliveryStatus(b, submissions[b.id]);
        const priority: Record<DeliveryStatus, number> = {
          returned: 0, pending: 1, overdue: 2, delivered: 3, graded: 4,
        };
        const pDiff = priority[statusA] - priority[statusB];
        if (pDiff !== 0) return pDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [activities, submissions]);

  const pendingCount = useMemo(
    () => sortedActivities.filter((a) => ['pending', 'overdue', 'returned'].includes(getDeliveryStatus(a, submissions[a.id]))).length,
    [sortedActivities, submissions]
  );

  if (loading) return <PageLoader />;
  if (!course) return null;

  const badge = categoryBadge[course.category] ?? categoryBadge.other;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/student/courses')}
        className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Mis Cursos
      </button>

      {/* Course header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
            <span className="text-[11px] text-faint font-mono">{course.code}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            {course.name}
          </h1>
          {course.description && (
            <p className="text-sm text-subtle mt-1 max-w-lg">{course.description}</p>
          )}
        </div>

        {/* Accumulated grade */}
        {gradeData && gradeData.finalScore !== null && (
          <div className="shrink-0 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 text-center min-w-[120px]">
            <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-1">Mi Nota</p>
            <p className={`text-3xl font-bold ${getScoreColor(gradeData.finalScore)}`}>
              {gradeData.finalScore.toFixed(1)}
            </p>
            <p className="text-xs text-faint mt-1">
              {gradeData.isPartial ? 'Parcial' : 'Definitiva'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Schedule card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-5"
      >
        <h2 className="text-xs font-medium text-subtle uppercase tracking-wider mb-3">Horario</h2>
        <div className="space-y-2">
          {course.schedule.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="bg-foreground/[0.06] text-muted px-2.5 py-1 rounded-lg font-medium text-xs min-w-[40px] text-center">
                {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek}
              </span>
              <span className="text-muted">{s.startTime} – {s.endTime}</span>
              {s.room && (
                <span className="text-subtle text-xs flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {s.room}</span>
              )}
              <span className="text-faint text-xs">{MODALITY_LABELS[s.modality] ?? s.modality}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/activities`)}
        >
          <FileText className="w-4 h-4 inline mr-1" /> Actividades
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/grades`)}
        >
          <BarChart3 className="w-4 h-4 inline mr-1" /> Mis Notas
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/project`)}
        >
          <Rocket className="w-4 h-4 inline mr-1" /> Mi Proyecto
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/quizzes`)}
        >
          <ClipboardList className="w-4 h-4 inline mr-1" /> Parciales
        </Button>
      </div>

      {/* Activities list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Actividades ({sortedActivities.length})
          </h2>
          {pendingCount > 0 && (
            <Badge variant="warning" size="sm" dot>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Badge>
          )}
        </div>

        {sortedActivities.length === 0 ? (
          <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-8 text-center">
            <FileText className="w-8 h-8 text-faint mx-auto mb-3" />
            <p className="text-sm text-subtle">No hay actividades publicadas aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedActivities.map((activity, i) => {
              const sub = submissions[activity.id];
              const deliveryStatus = getDeliveryStatus(activity, sub);
              const cfg = STATUS_CONFIG[deliveryStatus];
              const isPastDue = new Date(activity.dueDate) < new Date();
              const daysLeft = Math.ceil(
                (new Date(activity.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              // Grade info from gradeData
              const gradeInfo = gradeData?.activities.find((a) => a.id === activity.id)?.grade;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/student/courses/${courseId}/activities/${activity.id}`)}
                  className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]
                             hover:border-foreground/15 hover:bg-foreground/[0.04] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Type + status badges */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={cfg.variant} size="sm" dot>
                          {cfg.icon} {cfg.label}
                        </Badge>
                        <span className="text-xs text-faint">{activity.type}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-foreground/90 line-clamp-1">
                        {activity.title}
                      </h3>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-subtle">
                        <span><Calendar className="w-3 h-3 inline" /> {formatDate(activity.dueDate)}</span>
                        <span>{activity.weight}%</span>
                        <span>Máx: {activity.maxScore}</span>
                        {!isPastDue && deliveryStatus === 'pending' && daysLeft <= 7 && (
                          <span className={daysLeft <= 2 ? 'text-red-400 flex items-center gap-0.5' : 'text-amber-400 flex items-center gap-0.5'}>
                            <Clock className="w-3 h-3" /> {daysLeft}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grade or countdown */}
                    <div className="shrink-0 text-right">
                      {gradeInfo ? (
                        <div>
                          <p className={`text-lg font-bold ${getScoreColor(gradeInfo.score)}`}>
                            {gradeInfo.score.toFixed(1)}
                          </p>
                          <p className="text-xs text-faint">/ {gradeInfo.maxScore.toFixed(1)}</p>
                        </div>
                      ) : deliveryStatus === 'pending' && !isPastDue ? (
                        <div className="text-right">
                          <p className={`text-sm font-bold ${daysLeft <= 2 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-muted'}`}>
                            {daysLeft}
                          </p>
                          <p className="text-xs text-faint">días</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

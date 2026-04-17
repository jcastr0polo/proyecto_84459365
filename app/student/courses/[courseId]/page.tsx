'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: string }> = {
  delivered: { label: 'Entregada', variant: 'success', icon: '🟢' },
  pending: { label: 'Pendiente', variant: 'warning', icon: '🟡' },
  overdue: { label: 'Vencida', variant: 'danger', icon: '🔴' },
  graded: { label: 'Calificada', variant: 'info', icon: '✅' },
  returned: { label: 'Devuelta', variant: 'warning', icon: '↩️' },
};

const DAY_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miércoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb',
};

const MODALITY_LABELS: Record<string, string> = {
  presencial: '🏫 Presencial',
  virtual: '💻 Virtual',
  híbrido: '🔄 Híbrido',
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
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
            <span className="text-[11px] text-white/25 font-mono">{course.code}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            {course.name}
          </h1>
          {course.description && (
            <p className="text-sm text-white/40 mt-1 max-w-lg">{course.description}</p>
          )}
        </div>

        {/* Accumulated grade */}
        {gradeData && gradeData.finalScore !== null && (
          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center min-w-[120px]">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Mi Nota</p>
            <p className={`text-3xl font-bold ${getScoreColor(gradeData.finalScore)}`}>
              {gradeData.finalScore.toFixed(1)}
            </p>
            <p className="text-[10px] text-white/25 mt-1">
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
        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5"
      >
        <h2 className="text-xs font-medium text-white/35 uppercase tracking-wider mb-3">Horario</h2>
        <div className="space-y-2">
          {course.schedule.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="bg-white/[0.06] text-white/60 px-2.5 py-1 rounded-lg font-medium text-xs min-w-[40px] text-center">
                {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek}
              </span>
              <span className="text-white/70">{s.startTime} – {s.endTime}</span>
              {s.room && (
                <span className="text-white/40 text-xs">📍 {s.room}</span>
              )}
              <span className="text-white/25 text-xs">{MODALITY_LABELS[s.modality] ?? s.modality}</span>
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
          📝 Actividades
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/grades`)}
        >
          📊 Mis Notas
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/student/courses/${courseId}/project`)}
        >
          🚀 Mi Proyecto
        </Button>
      </div>

      {/* Activities list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Actividades ({sortedActivities.length})
          </h2>
          {pendingCount > 0 && (
            <Badge variant="warning" size="sm" dot>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Badge>
          )}
        </div>

        {sortedActivities.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-sm text-white/40">No hay actividades publicadas aún.</p>
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
                  className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]
                             hover:border-white/15 hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Type + status badges */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={cfg.variant} size="sm" dot>
                          {cfg.icon} {cfg.label}
                        </Badge>
                        <span className="text-[10px] text-white/20">{activity.type}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-white/90 line-clamp-1">
                        {activity.title}
                      </h3>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
                        <span>📅 {formatDate(activity.dueDate)}</span>
                        <span>{activity.weight}%</span>
                        <span>Máx: {activity.maxScore}</span>
                        {!isPastDue && deliveryStatus === 'pending' && daysLeft <= 7 && (
                          <span className={daysLeft <= 2 ? 'text-red-400' : 'text-amber-400'}>
                            ⏳ {daysLeft}d
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
                          <p className="text-[10px] text-white/25">/ {gradeInfo.maxScore.toFixed(1)}</p>
                        </div>
                      ) : deliveryStatus === 'pending' && !isPastDue ? (
                        <div className="text-right">
                          <p className={`text-sm font-bold ${daysLeft <= 2 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-white/50'}`}>
                            {daysLeft}
                          </p>
                          <p className="text-[10px] text-white/25">días</p>
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

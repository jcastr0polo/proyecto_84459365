'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import type { Course, Enrollment, Activity, Submission, Semester, Grade } from '@/lib/types';

/* ─── Types ─── */
interface CourseWithMeta {
  course: Course;
  enrollment: Enrollment;
  activities: Activity[];
  submissions: Submission[];
  grades: Grade[];
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PendingItem {
  activity: Activity;
  course: Course;
  daysLeft: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'relaxed';
}

interface RecentGrade {
  activityTitle: string;
  courseName: string;
  score: number;
  maxScore: number;
  gradedAt: string;
}

/* ─── Helpers ─── */
const DAY_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miércoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb',
};

const categoryGradient: Record<string, string> = {
  programming: 'from-cyan-500/[0.08] to-blue-500/[0.02]',
  design: 'from-purple-500/[0.08] to-pink-500/[0.02]',
  management: 'from-amber-500/[0.08] to-orange-500/[0.02]',
  leadership: 'from-emerald-500/[0.08] to-teal-500/[0.02]',
  other: 'from-white/[0.04] to-white/[0.01]',
};

const categoryBadge: Record<string, { variant: 'programming' | 'design' | 'management' | 'leadership' | 'other'; label: string }> = {
  programming: { variant: 'programming', label: 'Programación' },
  design: { variant: 'design', label: 'Diseño' },
  management: { variant: 'management', label: 'Gerencia' },
  leadership: { variant: 'leadership', label: 'Liderazgo' },
  other: { variant: 'other', label: 'Otro' },
};

function getScoreColor(score: number, maxScore: number): string {
  const normalized = maxScore > 0 ? (score / maxScore) * 5 : 0;
  if (normalized >= 4.0) return 'text-emerald-400';
  if (normalized >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBg(score: number, maxScore: number): string {
  const normalized = maxScore > 0 ? (score / maxScore) * 5 : 0;
  if (normalized >= 4.0) return 'bg-emerald-500/10 border-emerald-500/20';
  if (normalized >= 3.0) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
}



/**
 * Student Dashboard — Fase 21
 * Following wireframe section 13.3:
 * - Personalized greeting
 * - My Courses grid
 * - Pending activities with urgency indicators
 * - Recent grades
 */
export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [coursesData, setCoursesData] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Step 1: User info + semesters + courses
      const [meRes, semRes, courseRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/semesters'),
        fetch('/api/courses'),
      ]);

      const meData = meRes.ok ? await meRes.json() : null;
      const userInfo = meData?.user ?? null;
      setUser(userInfo);
      if (!userInfo) return;

      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      const activeSem = semData.semesters?.find((s: Semester) => s.isActive) ?? null;
      setSemester(activeSem);

      const allCourses: Course[] = courseRes.ok ? (await courseRes.json()).courses ?? [] : [];

      // Step 2: For each course, get enrollments to check if student is enrolled
      const perCoursePromises = allCourses.map(async (course) => {
        const [enrRes, actRes] = await Promise.all([
          fetch(`/api/courses/${course.id}/enrollments`),
          fetch(`/api/courses/${course.id}/activities`),
        ]);

        const enrollments: Enrollment[] = enrRes.ok ? (await enrRes.json()).enrollments ?? [] : [];
        const myEnrollment = enrollments.find(
          (e) => e.studentId === userInfo.id && e.status === 'active'
        );

        if (!myEnrollment) return null;

        const activities: Activity[] = actRes.ok ? (await actRes.json()).activities ?? [] : [];

        // Fetch submissions for published activities
        const publishedActs = activities.filter((a) => a.status !== 'draft');
        const subPromises = publishedActs.map(async (act) => {
          const res = await fetch(`/api/activities/${act.id}/submissions`);
          return res.ok ? ((await res.json()).submissions ?? []) as Submission[] : [];
        });
        const subResults = await Promise.all(subPromises);
        const submissions = subResults.flat();

        // Fetch grades for course
        let grades: Grade[] = [];
        try {
          const gradeRes = await fetch(`/api/courses/${course.id}/grades`);
          if (gradeRes.ok) {
            const gradeData = await gradeRes.json();
            // Student endpoint returns StudentGradeSummary, extract grade info
            if (gradeData.activities) {
              grades = gradeData.activities
                .filter((a: { grade: unknown }) => a.grade !== null)
                .map((a: { id: string; grade: { score: number; maxScore: number; gradedAt: string } }) => ({
                  activityId: a.id,
                  score: a.grade.score,
                  maxScore: a.grade.maxScore,
                  gradedAt: a.grade.gradedAt,
                }));
            }
          }
        } catch { /* ignore */ }

        return {
          course,
          enrollment: myEnrollment,
          activities,
          submissions,
          grades,
        };
      });

      const results = await Promise.all(perCoursePromises);
      setCoursesData(results.filter(Boolean) as CourseWithMeta[]);
    } catch {
      // silent failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Computed data ─── */
  const pendingItems = useMemo((): PendingItem[] => {
    const now = new Date();
    const items: PendingItem[] = [];

    for (const cd of coursesData) {
      for (const act of cd.activities) {
        if (act.status !== 'published') continue;
        const hasSub = cd.submissions.some((s) => s.activityId === act.id);
        if (hasSub) continue;

        const dueDate = new Date(act.dueDate);
        const diffMs = dueDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let urgency: PendingItem['urgency'];
        if (daysLeft < 0) urgency = 'overdue';
        else if (daysLeft <= 2) urgency = 'urgent';
        else if (daysLeft <= 7) urgency = 'soon';
        else urgency = 'relaxed';

        items.push({ activity: act, course: cd.course, daysLeft, urgency });
      }
    }

    // Sort: overdue first, then by days left ascending
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [coursesData]);

  const recentGrades = useMemo((): RecentGrade[] => {
    const grades: RecentGrade[] = [];
    for (const cd of coursesData) {
      for (const g of cd.grades) {
        const act = cd.activities.find((a) => a.id === g.activityId);
        grades.push({
          activityTitle: act?.title ?? 'Actividad',
          courseName: cd.course.name,
          score: g.score,
          maxScore: g.maxScore,
          gradedAt: g.gradedAt,
        });
      }
    }
    return grades.sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()).slice(0, 8);
  }, [coursesData]);

  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Greeting skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-white/[0.06] mb-2" />
          <div className="h-4 w-40 rounded bg-white/[0.04]" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
          <div className="h-48 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        </div>
      </div>
    );
  }

  const urgencyConfig = {
    overdue: { label: 'Vencida', icon: '🔴', borderColor: 'border-l-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/10' },
    urgent: { label: 'Urgente', icon: '⚠️', borderColor: 'border-l-red-400', textColor: 'text-red-400', bgColor: 'bg-red-500/10' },
    soon: { label: 'Próximo', icon: '🔶', borderColor: 'border-l-amber-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    relaxed: { label: 'Tranquilo', icon: '🟢', borderColor: 'border-l-emerald-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ─── Greeting ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
          👋 Hola, {user?.firstName ?? 'Estudiante'}
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {semester ? `Semestre ${semester.id}` : 'Panel del estudiante'}
          {coursesData.length > 0 && ` · ${coursesData.length} curso${coursesData.length > 1 ? 's' : ''} inscrito${coursesData.length > 1 ? 's' : ''}`}
        </p>
      </motion.div>

      {/* ─── Quick Stats ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <QuickStat
          label="Cursos"
          value={coursesData.length}
          icon="📚"
        />
        <QuickStat
          label="Pendientes"
          value={pendingItems.length}
          icon="📋"
          alert={pendingItems.some((p) => p.urgency === 'urgent' || p.urgency === 'overdue')}
        />
        <QuickStat
          label="Entregadas"
          value={coursesData.reduce((sum, cd) => sum + cd.submissions.length, 0)}
          icon="✅"
        />
        <QuickStat
          label="Calificadas"
          value={recentGrades.length}
          icon="📊"
        />
      </motion.div>

      {/* ─── Mis Cursos ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            📚 Mis Cursos ({coursesData.length})
          </h2>
          {coursesData.length > 0 && (
            <button
              onClick={() => router.push('/student/courses')}
              className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Ver todos →
            </button>
          )}
        </div>

        {coursesData.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm text-white/40">No estás inscrito en ningún curso actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coursesData.map((cd, i) => {
              const badge = categoryBadge[cd.course.category] ?? categoryBadge.other;
              const gradient = categoryGradient[cd.course.category] ?? categoryGradient.other;
              const pending = cd.activities.filter(
                (a) => a.status === 'published' && !cd.submissions.some((s) => s.activityId === a.id)
              ).length;

              return (
                <motion.button
                  key={cd.course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  onClick={() => router.push(`/student/courses/${cd.course.id}`)}
                  className={`
                    w-full text-left rounded-xl border border-white/[0.08] bg-gradient-to-br ${gradient}
                    p-5 hover:border-white/15 transition-colors cursor-pointer
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    {pending > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {pending} pendiente{pending > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mb-1 line-clamp-1">{cd.course.name}</h3>
                  <p className="text-[11px] text-white/30 mb-3 font-mono">{cd.course.code}</p>
                  {/* Schedule */}
                  <div className="flex flex-wrap gap-2">
                    {cd.course.schedule.map((s, si) => (
                      <span key={si} className="text-[11px] text-white/40 bg-white/[0.04] px-2 py-0.5 rounded">
                        {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek} {s.startTime}–{s.endTime}
                        {s.room && ` · ${s.room}`}
                      </span>
                    ))}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Bottom Grid: Pendientes + Notas ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Pendientes ─── */}
        <section>
          <h2 className="text-lg font-semibold text-white tracking-tight mb-4">
            🔔 Pendientes ({pendingItems.length})
          </h2>

          {pendingItems.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="text-3xl mb-3">🎉</p>
              <p className="text-sm text-white/40">¡No tienes entregas pendientes!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.slice(0, 8).map((item) => {
                const cfg = urgencyConfig[item.urgency];
                return (
                  <motion.button
                    key={item.activity.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 4, transition: { duration: 0.1 } }}
                    onClick={() => router.push(`/student/courses/${item.course.id}/activities/${item.activity.id}`)}
                    className={`
                      w-full text-left rounded-lg border border-white/[0.06] bg-white/[0.02]
                      p-3.5 border-l-[3px] ${cfg.borderColor}
                      hover:bg-white/[0.04] transition-all cursor-pointer
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white/90 line-clamp-1">
                          {cfg.icon} {item.activity.title}
                        </p>
                        <p className="text-[11px] text-white/35 mt-0.5">{item.course.name}</p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                        {item.daysLeft < 0
                          ? `${Math.abs(item.daysLeft)}d vencida`
                          : item.daysLeft === 0
                            ? 'Hoy'
                            : `${item.daysLeft}d`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/25">
                      <span>
                        Vence: {new Date(item.activity.dueDate).toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short',
                        })}
                      </span>
                      <span>{item.activity.weight}%</span>
                      <span>Nota máx: {item.activity.maxScore}</span>
                    </div>
                  </motion.button>
                );
              })}
              {pendingItems.length > 8 && (
                <p className="text-xs text-white/25 text-center pt-2">
                  +{pendingItems.length - 8} más pendientes
                </p>
              )}
            </div>
          )}
        </section>

        {/* ─── Notas Recientes ─── */}
        <section>
          <h2 className="text-lg font-semibold text-white tracking-tight mb-4">
            📊 Mis Notas Recientes
          </h2>

          {recentGrades.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-sm text-white/40">Aún no tienes notas publicadas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGrades.map((g, i) => (
                <motion.div
                  key={`${g.activityTitle}-${i}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`
                    flex items-center justify-between rounded-lg border p-3.5
                    ${getScoreBg(g.score, g.maxScore)}
                  `}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/90 line-clamp-1">{g.activityTitle}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{g.courseName}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-lg font-bold ${getScoreColor(g.score, g.maxScore)}`}>
                      {g.score.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-white/25">/ {g.maxScore.toFixed(1)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─── Footer hint ─── */}
      {pendingItems.some((p) => p.urgency === 'urgent' || p.urgency === 'overdue') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-4"
        >
          <p className="text-xs text-red-400/60">
            ⚠️ Tienes entregas urgentes o vencidas. ¡Revisa tus pendientes!
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Quick Stat mini-card ─── */
function QuickStat({ label, value, icon, alert }: {
  label: string;
  value: number;
  icon: string;
  alert?: boolean;
}) {
  return (
    <div className={`
      rounded-xl border p-3.5 transition-colors
      ${alert
        ? 'border-amber-500/20 bg-amber-500/[0.05]'
        : 'border-white/[0.06] bg-white/[0.02]'
      }
    `}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${alert ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Inbox, AlertTriangle, FileText, CheckCircle2, Clock, MapPin, Monitor, Building2, RefreshCw } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Course, Enrollment, Activity, Submission, Semester } from '@/lib/types';

interface CourseWithMeta {
  course: Course;
  activities: Activity[];
  submissions: Submission[];
  pendingCount: number;
  deliveredCount: number;
}

const DAY_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miércoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb',
};

const categoryBadge: Record<string, { variant: 'programming' | 'design' | 'management' | 'leadership' | 'other'; label: string }> = {
  programming: { variant: 'programming', label: 'Programación' },
  design: { variant: 'design', label: 'Diseño' },
  management: { variant: 'management', label: 'Gerencia' },
  leadership: { variant: 'leadership', label: 'Liderazgo' },
  other: { variant: 'other', label: 'Otro' },
};

const categoryGradient: Record<string, string> = {
  programming: 'from-cyan-500/[0.08] to-blue-500/[0.02]',
  design: 'from-purple-500/[0.08] to-pink-500/[0.02]',
  management: 'from-amber-500/[0.08] to-orange-500/[0.02]',
  leadership: 'from-emerald-500/[0.08] to-teal-500/[0.02]',
  other: 'from-white/[0.04] to-white/[0.01]',
};

const MODALITY_LABELS: Record<string, React.ReactNode> = {
  presencial: <><Building2 className="w-3 h-3 inline" /> Presencial</>,
  virtual: <><Monitor className="w-3 h-3 inline" /> Virtual</>,
  híbrido: <><RefreshCw className="w-3 h-3 inline" /> Híbrido</>,
};

/**
 * Student — My Courses Page
 * Fase 21 — Grid of enrolled courses with detailed info
 */
export default function StudentCoursesPage() {
  const router = useRouter();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [coursesData, setCoursesData] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, semRes, courseRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/semesters'),
        fetch('/api/courses'),
      ]);

      const meData = meRes.ok ? await meRes.json() : null;
      const userInfo = meData?.user ?? null;
      if (!userInfo) return;

      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      setSemester(semData.semesters?.find((s: Semester) => s.isActive) ?? null);

      const allCourses: Course[] = courseRes.ok ? (await courseRes.json()).courses ?? [] : [];

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
        const publishedActs = activities.filter((a) => a.status !== 'draft');

        const subPromises = publishedActs.map(async (act) => {
          const res = await fetch(`/api/activities/${act.id}/submissions`);
          return res.ok ? ((await res.json()).submissions ?? []) as Submission[] : [];
        });
        const submissions = (await Promise.all(subPromises)).flat();

        const pendingCount = publishedActs.filter(
          (a) => !submissions.some((s) => s.activityId === a.id)
        ).length;
        const deliveredCount = submissions.length;

        return { course, activities, submissions, pendingCount, deliveredCount };
      });

      const results = await Promise.all(perCoursePromises);
      setCoursesData(results.filter(Boolean) as CourseWithMeta[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Stats summary
  const totalPending = useMemo(() => coursesData.reduce((s, c) => s + c.pendingCount, 0), [coursesData]);
  const totalDelivered = useMemo(() => coursesData.reduce((s, c) => s + c.deliveredCount, 0), [coursesData]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mis Cursos
        </h1>
        <p className="text-sm text-subtle mt-1">
          {semester ? `Semestre ${semester.id}` : 'Todos los cursos'}
          {coursesData.length > 0 && ` · ${coursesData.length} curso${coursesData.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Summary strip */}
      {coursesData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="info" size="sm" dot>{coursesData.length} cursos inscritos</Badge>
          {totalPending > 0 && (
            <Badge variant="warning" size="sm" dot>{totalPending} pendientes</Badge>
          )}
          <Badge variant="success" size="sm" dot>{totalDelivered} entregadas</Badge>
        </div>
      )}

      {/* Courses grid */}
      {coursesData.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-subtle" />}
          title="Sin cursos inscritos"
          description="No estás inscrito en ningún curso del semestre actual."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coursesData.map((cd, i) => {
            const badge = categoryBadge[cd.course.category] ?? categoryBadge.other;
            const gradient = categoryGradient[cd.course.category] ?? categoryGradient.other;

            return (
              <motion.button
                key={cd.course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                onClick={() => router.push(`/student/courses/${cd.course.id}`)}
                className={`
                  w-full text-left rounded-xl border border-foreground/[0.08] bg-gradient-to-br ${gradient}
                  p-5 hover:border-foreground/15 transition-colors cursor-pointer
                `}
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                  {cd.pendingCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> {cd.pendingCount} pendiente{cd.pendingCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Name + code */}
                <h3 className="text-base font-semibold text-foreground/90 mb-0.5 line-clamp-1">{cd.course.name}</h3>
                <p className="text-[11px] text-subtle font-mono mb-3">{cd.course.code}</p>

                {/* Description */}
                {cd.course.description && (
                  <p className="text-xs text-subtle line-clamp-2 mb-3">{cd.course.description}</p>
                )}

                {/* Schedule rows */}
                <div className="space-y-1.5 mb-3">
                  {cd.course.schedule.map((s, si) => (
                    <div key={si} className="flex items-center gap-2 text-[11px] text-subtle">
                      <span className="bg-foreground/[0.04] px-2 py-0.5 rounded font-medium">
                        {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek}
                      </span>
                      <span>{s.startTime}–{s.endTime}</span>
                      {s.room && (
                        <span className="text-faint flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {s.room}</span>
                      )}
                      <span className="text-faint">
                        {MODALITY_LABELS[s.modality] ?? s.modality}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="flex items-center gap-4 pt-3 border-t border-foreground/[0.06] text-[11px] text-subtle">
                  <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" /> {cd.activities.filter((a) => a.status !== 'draft').length} actividades</span>
                  <span className="flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> {cd.deliveredCount} entregadas</span>
                  {cd.pendingCount > 0 && (
                    <span className="text-amber-400/60 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {cd.pendingCount} pendientes</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

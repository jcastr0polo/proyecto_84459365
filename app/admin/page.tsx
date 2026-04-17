'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/dashboard/StatCard';
import CourseCard from '@/components/dashboard/CourseCard';
import DeadlineList from '@/components/dashboard/DeadlineList';
import type { DeadlineItem } from '@/components/dashboard/DeadlineList';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import type { TimelineEvent } from '@/components/dashboard/ActivityTimeline';
import type { Course, Semester, Activity, Enrollment, Submission } from '@/lib/types';

/* ─── Types for aggregated data ─── */

interface CourseData {
  course: Course;
  enrollments: Enrollment[];
  activities: Activity[];
  submissions: Submission[];
}

/**
 * Admin Dashboard — Fase 20
 * Executive dashboard with widgets, metrics, deadlines, and activity timeline
 * Inspired by Vercel/Linear dashboards
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courseData, setCourseData] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Step 1: Semesters + Courses
      const [semRes, courseRes] = await Promise.all([
        fetch('/api/semesters'),
        fetch('/api/courses'),
      ]);

      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      const courseList: Course[] = courseRes.ok ? (await courseRes.json()).courses ?? [] : [];
      const active = semData.semesters?.find((s: Semester) => s.isActive) ?? null;
      setSemester(active);

      // Step 2: Per-course data (enrollments + activities) in parallel
      const perCoursePromises = courseList.map(async (course) => {
        const [enrRes, actRes] = await Promise.all([
          fetch(`/api/courses/${course.id}/enrollments`),
          fetch(`/api/courses/${course.id}/activities`),
        ]);

        const enrollments: Enrollment[] = enrRes.ok ? (await enrRes.json()).enrollments ?? [] : [];
        const activities: Activity[] = actRes.ok ? (await actRes.json()).activities ?? [] : [];

        // Step 3: Submissions for published activities
        const publishedActivities = activities.filter((a) => a.status !== 'draft');
        const subPromises = publishedActivities.map(async (act) => {
          const res = await fetch(`/api/activities/${act.id}/submissions`);
          return res.ok ? ((await res.json()).submissions ?? []) as Submission[] : [];
        });
        const subResults = await Promise.all(subPromises);
        const submissions = subResults.flat();

        return { course, enrollments, activities, submissions };
      });

      const results = await Promise.all(perCoursePromises);
      setCourseData(results);
    } catch {
      // Silent failure — show empty dashboard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Computed Stats ─── */

  const stats = useMemo(() => {
    const totalStudents = new Set(
      courseData.flatMap((cd) => cd.enrollments.filter((e) => e.status === 'active').map((e) => e.studentId))
    ).size;
    const totalActivities = courseData.reduce((sum, cd) => sum + cd.activities.length, 0);
    const publishedActivities = courseData.reduce(
      (sum, cd) => sum + cd.activities.filter((a) => a.status === 'published').length, 0
    );
    const draftActivities = courseData.reduce(
      (sum, cd) => sum + cd.activities.filter((a) => a.status === 'draft').length, 0
    );
    const totalSubmissions = courseData.reduce((sum, cd) => sum + cd.submissions.length, 0);
    const reviewedSubmissions = courseData.reduce(
      (sum, cd) => sum + cd.submissions.filter((s) => s.status === 'reviewed').length, 0
    );
    const pendingGrading = totalSubmissions - reviewedSubmissions;

    return {
      totalStudents,
      totalActivities,
      publishedActivities,
      draftActivities,
      totalSubmissions,
      pendingGrading: Math.max(0, pendingGrading),
      courseCount: courseData.length,
    };
  }, [courseData]);

  /* ─── Deadlines ─── */

  const deadlines: DeadlineItem[] = useMemo(() => {
    const now = new Date();
    const items: DeadlineItem[] = [];

    courseData.forEach((cd) => {
      const activeStudents = cd.enrollments.filter((e) => e.status === 'active').length;

      cd.activities
        .filter((a) => a.status === 'published')
        .forEach((act) => {
          const due = new Date(act.dueDate);
          const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);

          // Only show upcoming (within 30 days) or recently overdue (within 7 days)
          if (daysLeft >= -7 && daysLeft <= 30) {
            const subCount = cd.submissions.filter((s) => s.activityId === act.id).length;
            items.push({
              id: act.id,
              title: act.title,
              courseName: cd.course.name,
              courseCode: cd.course.code,
              dueDate: act.dueDate,
              daysLeft,
              status: act.status,
              submissionCount: subCount,
              studentCount: activeStudents,
            });
          }
        });
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [courseData]);

  /* ─── Activity Timeline ─── */

  const timeline: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    courseData.forEach((cd) => {
      // Submissions events
      cd.submissions.forEach((sub) => {
        events.push({
          id: `sub-${sub.id}`,
          type: 'submission',
          title: 'Nueva entrega recibida',
          description: `Actividad: ${cd.activities.find((a) => a.id === sub.activityId)?.title ?? 'Desconocida'}`,
          timestamp: sub.submittedAt,
          courseName: cd.course.name,
        });
      });

      // Grade publication events (from reviewed submissions)
      cd.submissions
        .filter((s) => s.status === 'reviewed')
        .forEach((s) => {
          events.push({
            id: `grade-${s.id}`,
            type: 'grade',
            title: 'Entrega calificada',
            description: `Actividad: ${cd.activities.find((a) => a.id === s.activityId)?.title ?? 'Desconocida'}`,
            timestamp: s.updatedAt,
            courseName: cd.course.name,
          });
        });

      // Enrollment events
      cd.enrollments.forEach((enr) => {
        events.push({
          id: `enr-${enr.id}`,
          type: 'enrollment',
          title: 'Estudiante inscrito',
          description: `Nuevo estudiante en ${cd.course.name}`,
          timestamp: enr.enrolledAt,
          courseName: cd.course.name,
        });
      });

      // Activity creation events
      cd.activities.forEach((act) => {
        events.push({
          id: `act-${act.id}`,
          type: 'activity',
          title: act.status === 'published' ? 'Actividad publicada' : 'Actividad creada',
          description: act.title,
          timestamp: act.updatedAt,
          courseName: cd.course.name,
        });
      });
    });

    // Sort by timestamp, newest first, take top 15
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [courseData]);

  /* ─── Per-course metrics ─── */

  const courseMetrics = useMemo(() => {
    return courseData.map((cd) => {
      const activeStudents = cd.enrollments.filter((e) => e.status === 'active').length;
      const pendingSubs = cd.submissions.filter(
        (s) => s.status === 'submitted' || s.status === 'resubmitted'
      ).length;

      return {
        ...cd.course,
        studentCount: activeStudents,
        activityCount: cd.activities.length,
        pendingSubmissions: pendingSubs,
      };
    });
  }, [courseData]);

  /* ─── Enrollment breakdown by course for stat card ─── */

  const studentDetails = useMemo(() => {
    return courseData.map((cd) => ({
      label: cd.course.name,
      value: cd.enrollments.filter((e) => e.status === 'active').length,
      color: 'text-white/50',
    }));
  }, [courseData]);

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/30 mt-1">
              Vista general del semestre
            </p>
          </div>
          {semester && (
            <Badge variant="success" dot size="sm">{semester.label}</Badge>
          )}
        </div>
      </motion.div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats.courseCount}
          label="Cursos Activos"
          icon="📚"
          color="text-cyan-400"
          loading={loading}
        />
        <StatCard
          value={stats.totalStudents}
          label="Estudiantes"
          icon="👥"
          color="text-purple-400"
          details={studentDetails}
          loading={loading}
        />
        <StatCard
          value={stats.totalActivities}
          label="Actividades"
          icon="📝"
          color="text-emerald-400"
          details={[
            { label: 'Publicadas', value: stats.publishedActivities, color: 'text-emerald-400/70' },
            { label: 'Borradores', value: stats.draftActivities, color: 'text-white/30' },
          ]}
          loading={loading}
        />
        <StatCard
          value={stats.pendingGrading}
          label="Pendientes de Calificar"
          icon="⏳"
          color={stats.pendingGrading > 0 ? 'text-amber-400' : 'text-emerald-400'}
          description={stats.pendingGrading > 0 ? 'Entregas sin nota asignada' : 'Todo al día ✓'}
          loading={loading}
        />
      </div>

      {/* ─── Mis Cursos ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Mis Cursos</h2>
          <span className="text-[10px] text-white/20">{stats.courseCount} curso{stats.courseCount !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CourseCard id="" name="" code="" category="other" studentCount={0} activityCount={0} pendingSubmissions={0} schedule={[]} onClick={() => {}} loading />
            <CourseCard id="" name="" code="" category="other" studentCount={0} activityCount={0} pendingSubmissions={0} schedule={[]} onClick={() => {}} loading />
            <CourseCard id="" name="" code="" category="other" studentCount={0} activityCount={0} pendingSubmissions={0} schedule={[]} onClick={() => {}} loading />
          </div>
        ) : courseMetrics.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-white/30">No hay cursos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseMetrics.map((c, i) => (
              <CourseCard
                key={c.id}
                id={c.id}
                name={c.name}
                code={c.code}
                category={c.category}
                studentCount={c.studentCount}
                activityCount={c.activityCount}
                pendingSubmissions={c.pendingSubmissions}
                schedule={c.schedule}
                index={i}
                onClick={() => router.push(`/admin/courses/${c.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Bottom Grid: Deadlines + Timeline ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Vencimientos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Próximos Vencimientos
            </h2>
            {deadlines.length > 0 && (
              <span className="text-[10px] text-white/20">{deadlines.length} actividad{deadlines.length !== 1 ? 'es' : ''}</span>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <DeadlineList deadlines={deadlines} loading={loading} />
          </div>
        </section>

        {/* Actividad Reciente */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Actividad Reciente
            </h2>
            {timeline.length > 0 && (
              <span className="text-[10px] text-white/20">Últimos {timeline.length} eventos</span>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <ActivityTimeline events={timeline} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}

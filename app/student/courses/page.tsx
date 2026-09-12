'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Inbox } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import CourseCard from '@/components/student/CourseCard';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';
import type { Course, Enrollment, Activity, Submission, Semester } from '@/lib/types';

interface CourseWithMeta {
  course: Course;
  activities: Activity[];
  submissions: Submission[];
  pendingCount: number;
  deliveredCount: number;
  /** Nota del servidor: la misma que ve en la vista de notas. */
  finalScore: number | null;
  gradedCount: number;
}

/**
 * Student — My Courses Page
 * Fase 21 — Grid of enrolled courses with detailed info
 */
export default function StudentCoursesPage() {
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

        // La nota la da el servidor, que ya pondera parciales y notas manuales.
        let finalScore: number | null = null;
        let gradedCount = 0;
        try {
          const gRes = await fetch(`/api/courses/${course.id}/grades`);
          if (gRes.ok) {
            const g = await gRes.json();
            finalScore = g.finalScore ?? null;
            gradedCount = (g.activities ?? []).filter((a: { grade: unknown }) => a.grade !== null).length;
          }
        } catch { /* ignore */ }

        return { course, activities, submissions, pendingCount, deliveredCount, finalScore, gradedCount };
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <SkeletonCards count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mis cursos
        </h1>
        <p className="text-sm text-subtle mt-1">
          {/* El label legible, no el id crudo del semestre. */}
          {semester ? `Semestre ${semester.label}` : 'Todos los cursos'}
          {coursesData.length > 0 && ` · ${coursesData.length} curso${coursesData.length > 1 ? 's' : ''}`}
          {totalPending > 0 && ` · ${totalPending} pendiente${totalPending > 1 ? 's' : ''}`}
        </p>
      </div>

      {coursesData.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-subtle" />}
          title="Sin cursos inscritos"
          description="No estás inscrito en ningún curso del semestre actual."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coursesData.map((cd) => (
            <CourseCard
              key={cd.course.id}
              course={cd.course}
              score={cd.finalScore}
              gradedCount={cd.gradedCount}
              totalActivities={cd.activities.filter((a) => a.status !== 'draft').length}
              pendingCount={cd.pendingCount}
              detailed
            />
          ))}
        </div>
      )}
    </div>
  );
}

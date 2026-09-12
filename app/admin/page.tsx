'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { parseDateColombia } from '@/lib/dateUtils';
import AdminDashboardView from '@/components/admin/AdminDashboardView';
import type { DeadlineItem } from '@/components/dashboard/DeadlineList';
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

      // Solo los cursos del semestre activo. Antes se pedían TODOS, así que
      // el panel mezclaba asignaturas de semestres cerrados con las del
      // actual y los conteos no significaban nada.
      const currentCourses = active
        ? courseList.filter((c) => c.semesterId === active.id)
        : courseList;

      // Step 2: Per-course data (enrollments + activities) in parallel
      const perCoursePromises = currentCourses.map(async (course) => {
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

  /* ─── Deadlines ─── */

  /* ─── Activity Timeline ─── */

  /* ─── Per-course metrics ─── */

  /* ─── Enrollment breakdown by course for stat card ─── */

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-9 w-64 rounded bg-foreground/[0.06] animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-surface-border bg-surface animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl border border-surface-border bg-surface animate-pulse" />
      </div>
    );
  }

  return <AdminDashboardView semester={semester} courseData={courseData} />;
}

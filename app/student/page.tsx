'use client';

import React, { useCallback, useEffect, useState } from 'react';
import StudentDashboardView from '@/components/student/StudentDashboardView';
import type { CourseWithMeta, UserInfo, ActiveQuiz } from '@/components/student/types';
import type { Course, Enrollment, Activity, Submission, Semester, Grade, Quiz } from '@/lib/types';

/* ─── Types ─── */

/**
 * Student Dashboard — Fase 21
 * Following wireframe section 13.3:
 * - Personalized greeting
 * - My Courses grid
 * - Pending activities with urgency indicators
 * - Recent grades
 */
export default function StudentDashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [coursesData, setCoursesData] = useState<CourseWithMeta[]>([]);
  const [activeQuizzes, setActiveQuizzes] = useState<ActiveQuiz[]>([]);
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
        let finalScore: number | null = null;
        try {
          const gradeRes = await fetch(`/api/courses/${course.id}/grades`);
          if (gradeRes.ok) {
            const gradeData = await gradeRes.json();
            // Student endpoint returns StudentGradeSummary, extract grade info
            finalScore = gradeData.finalScore ?? null;
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
          finalScore,
        };
      });

      const results = await Promise.all(perCoursePromises);
      const enrolled = results.filter(Boolean) as CourseWithMeta[];
      setCoursesData(enrolled);

      // Fetch active quizzes for each enrolled course
      const quizPromises = enrolled.map(async (cd) => {
        try {
          const res = await fetch(`/api/courses/${cd.course.id}/quizzes`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.quizzes ?? []).map((q: Quiz) => ({
            quiz: q,
            courseName: cd.course.name,
            courseId: cd.course.id,
          }));
        } catch { return []; }
      });
      const quizResults = await Promise.all(quizPromises);
      setActiveQuizzes(quizResults.flat());
    } catch {
      // silent failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Skeleton ─── */
  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Greeting skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-foreground/[0.06] mb-2" />
          <div className="h-4 w-40 rounded bg-foreground/[0.04]" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
          <div className="h-48 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardView
      user={user}
      semester={semester}
      coursesData={coursesData}
      activeQuizzes={activeQuizzes}
    />
  );
}

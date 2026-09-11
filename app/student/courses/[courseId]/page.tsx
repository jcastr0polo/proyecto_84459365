'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentCourseView from '@/components/student/StudentCourseViewV2';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { Course, Activity, Submission, StudentGradeSummary } from '@/lib/types';

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

  if (loading) return <PageLoader />;
  if (!course) return null;

  return (
    <StudentCourseView
      course={course}
      activities={activities}
      submissions={submissions}
      gradeData={gradeData}
    />
  );
}

/**
 * GET /api/students/[id]/detail — Detalle completo de un estudiante (admin)
 *
 * Agrega: perfil, cursos inscritos, actividades por curso, entregas, proyectos, notas
 * Optimizado: 6 lecturas paralelas a Blob, 0 por curso (todo en memoria)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import {
  readUsersFresh,
  readEnrollmentsFresh,
  readCoursesFresh,
  readActivitiesFresh,
  readSubmissionsFresh,
  readProjectsFresh,
  readGradesFresh,
} from '@/lib/dataService';
import { calculateFinalGrade } from '@/lib/gradeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;

    // 6 parallel Blob reads — everything we need
    const [allUsers, allEnrollments, allCourses, allActivities, allSubmissions, allProjects, allGrades] = await Promise.all([
      readUsersFresh(),
      readEnrollmentsFresh(),
      readCoursesFresh(),
      readActivitiesFresh(),
      readSubmissionsFresh(),
      readProjectsFresh(),
      readGradesFresh(),
    ]);

    const student = allUsers.find((u) => u.id === id && u.role === 'student');
    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    const enrollments = allEnrollments.filter((e) => e.studentId === id && e.status === 'active');

    const courses = enrollments.map((enrollment) => {
      const course = allCourses.find((c) => c.id === enrollment.courseId);
      if (!course) return null;

      // Activities for this course (published only)
      const activities = allActivities.filter(
        (a) => a.courseId === course.id && (a.status === 'published' || a.status === 'closed')
      );

      // For each activity, find this student's submission
      const activitiesWithSubmissions = activities.map((activity) => {
        const studentSubmission = allSubmissions.find(
          (s) => s.activityId === activity.id && s.studentId === id
        );

        return {
          id: activity.id,
          title: activity.title,
          type: activity.type,
          category: activity.category,
          dueDate: activity.dueDate,
          weight: activity.weight,
          status: activity.status,
          submission: studentSubmission
            ? {
                id: studentSubmission.id,
                status: studentSubmission.status,
                version: studentSubmission.version,
                submittedAt: studentSubmission.submittedAt,
                updatedAt: studentSubmission.updatedAt,
                isLate: studentSubmission.isLate,
                content: studentSubmission.content || null,
                attachments: studentSubmission.attachments,
                links: studentSubmission.links,
              }
            : null,
        };
      });

      // Project for this course
      const project = allProjects.find(
        (p) => p.studentId === id && p.courseId === course.id
      );

      // Grades — inline calculation, no extra Blob reads
      let grades = null;
      const finalResult = calculateFinalGrade(id, course.id, allActivities, allGrades);
      if (finalResult.totalWeight > 0) {
        const studentGrades = allGrades.filter(
          (g) => g.studentId === id && g.courseId === course.id
        );
        grades = {
          finalGrade: finalResult.finalScore,
          activityGrades: activities.map((act) => {
            const g = studentGrades.find((gr) => gr.activityId === act.id);
            return {
              activityId: act.id,
              score: g?.score ?? null,
              published: g?.isPublished ?? false,
            };
          }),
        };
      }

      return {
        id: course.id,
        code: course.code,
        name: course.name,
        category: course.category,
        enrolledAt: enrollment.enrolledAt,
        activities: activitiesWithSubmissions,
        totalActivities: activitiesWithSubmissions.length,
        submitted: activitiesWithSubmissions.filter((a) => a.submission !== null).length,
        pending: activitiesWithSubmissions.filter((a) => a.submission === null).length,
        project: project
          ? {
              id: project.id,
              projectName: project.projectName,
              githubUrl: project.githubUrl,
              vercelUrl: project.vercelUrl,
              status: project.status,
              isPublic: project.isPublic,
              documentUrl: project.documentUrl,
            }
          : null,
        grades,
      };
    }).filter(Boolean);

    return NextResponse.json({
      student: toSafeUser(student),
      courses,
      totalCourses: courses.length,
    });
  }, 'admin');
}

/**
 * GET /api/students/[id]/detail — Detalle completo de un estudiante (admin)
 *
 * Agrega: perfil, cursos inscritos, actividades por curso, entregas, proyectos, notas
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import {
  getUserById,
  getEnrollmentsByStudent,
  readCoursesFresh,
  readActivitiesFresh,
  readSubmissionsFresh,
  readProjectsFresh,
} from '@/lib/dataService';
import {
  getCourseGradeSummary,
  GradeError,
} from '@/lib/gradeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;

    const student = await getUserById(id);
    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    const enrollments = (await getEnrollmentsByStudent(id)).filter((e) => e.status === 'active');
    const allCourses = await readCoursesFresh();
    const allActivities = await readActivitiesFresh();
    const allSubmissions = await readSubmissionsFresh();
    const allProjects = await readProjectsFresh();

    const courses = (await Promise.all(enrollments.map(async (enrollment) => {
      const course = allCourses.find((c) => c.id === enrollment.courseId) ?? null;
      if (!course) return null;

      // Activities for this course (published only)
      const activities = allActivities.filter(
        (a) => a.courseId === course.id && (a.status === 'published' || a.status === 'closed')
      );

      // For each activity, find this student's submission
      const activitiesWithSubmissions = activities.map((activity) => {
        const submissions = allSubmissions.filter((s) => s.activityId === activity.id);
        const studentSubmission = submissions.find((s) => s.studentId === id);

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

      // Grades summary
      let grades = null;
      try {
        const summary = await getCourseGradeSummary(course.id);
        const studentRow = summary.students?.find(
          (s: { id: string }) => s.id === id
        );
        if (studentRow) {
          grades = {
            finalGrade: studentRow.finalScore,
            activityGrades: Object.entries(studentRow.grades).map(([actId, g]) => ({
              activityId: actId,
              score: g?.score ?? null,
              published: g?.isPublished ?? false,
            })),
          };
        }
      } catch (err) {
        if (!(err instanceof GradeError)) {
          console.error('Error getting grades for course', course.id, err);
        }
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
    }))).filter(Boolean);

    return NextResponse.json({
      student: toSafeUser(student),
      courses,
      totalCourses: courses.length,
    });
  }, 'admin');
}

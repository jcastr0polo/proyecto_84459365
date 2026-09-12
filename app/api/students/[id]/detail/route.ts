/**
 * GET /api/students/[id]/detail — Detalle completo de un estudiante (admin)
 *
 * Agrega: perfil, cursos inscritos, actividades por curso, entregas, proyectos,
 * notas por corte y definitiva
 * Optimizado: 12 lecturas paralelas, 0 por curso (todo se calcula en memoria)
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
  readCortesFresh,
  readQuizzesFresh,
  readQuizAttemptsFresh,
  readManualGradeItemsFresh,
  readManualGradesFresh,
} from '@/lib/dataService';
import {
  calculateFinalGrade, calculateCorteScores, resolveFinalScore,
  gradableItemsOf, adjustItemId, isAdjustItemId,
} from '@/lib/gradeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;

    // Lecturas en paralelo — todo lo necesario, 0 lecturas por curso
    const [
      allUsers, allEnrollments, allCourses, allActivities, allSubmissions, allProjects, allGrades,
      allCortes, allQuizzes, allAttempts, allManualItems, allManualGrades,
    ] = await Promise.all([
      readUsersFresh(),
      readEnrollmentsFresh(),
      readCoursesFresh(),
      readActivitiesFresh(),
      readSubmissionsFresh(),
      readProjectsFresh(),
      readGradesFresh(),
      readCortesFresh(),
      readQuizzesFresh(),
      readQuizAttemptsFresh(),
      readManualGradeItemsFresh(),
      readManualGradesFresh(),
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

      // Cortes del curso, ordenados
      const courseCortes = allCortes
        .filter((c) => c.courseId === course.id)
        .sort((a, b) => a.order - b.order);

      // Ítems calificables del curso que no son actividades
      const courseQuizzes = allQuizzes.filter(
        (q) => q.courseId === course.id && q.type === 'graded' && q.weight && q.weight > 0
      );
      // Los ajustes del docente comparten tabla con las notas manuales pero no
      // son ítems calificables: no van en el desglose de la ficha.
      const courseManualItems = allManualItems.filter(
        (i) => i.courseId === course.id && !isAdjustItemId(i.id),
      );

      // Grades — cálculo en memoria, sin lecturas extra.
      // Admin: se incluyen notas no publicadas (a diferencia de la vista del estudiante).
      let grades = null;
      const finalResult = calculateFinalGrade(
        id, course.id, allActivities, allGrades,
        allQuizzes, allAttempts, allManualItems, allManualGrades,
      );
      if (finalResult.totalWeight > 0) {
        const studentGrades = allGrades.filter(
          (g) => g.studentId === id && g.courseId === course.id
        );
        const corteScores = calculateCorteScores(
          id, courseCortes, activities, studentGrades,
          courseQuizzes, allAttempts, courseManualItems, allManualGrades,
        );
        /*
         * Las notas manuales y los parciales pesan en el corte y en la
         * definitiva, pero no se devolvían: la ficha mostraba un corte de 4.2
         * y una lista de actividades que no lo justificaba.
         */
        const manualRows = courseManualItems.map((item) => {
          const mg = allManualGrades.find((g) => g.itemId === item.id && g.studentId === id);
          return {
            id: item.id,
            title: item.title,
            kind: 'manual' as const,
            weight: item.weight,
            maxScore: item.maxScore,
            corteId: item.corteId ?? null,
            score: mg ? mg.score : null,
            published: mg ? mg.isPublished !== false : false,
          };
        });

        const quizRows = courseQuizzes.map((quiz) => {
          const attempts = allAttempts.filter((a) => a.quizId === quiz.id && a.studentId === id);
          const best = attempts.length > 0
            ? attempts.reduce((b, a) => (a.percentage > b.percentage ? a : b))
            : null;
          const maxScore = quiz.maxScore ?? 5;
          return {
            id: quiz.id,
            title: quiz.title,
            kind: 'quiz' as const,
            weight: quiz.weight ?? 0,
            maxScore,
            corteId: quiz.corteId ?? null,
            score: best ? (best.percentage / 100) * maxScore : null,
            published: quiz.resultsReleased,
          };
        });

        const finalAdjustment = allManualGrades.find(
          (g) => g.itemId === adjustItemId(course.id) && g.studentId === id,
        );
        const resolved = resolveFinalScore(
          courseCortes, corteScores, finalResult,
          gradableItemsOf(activities, courseQuizzes, courseManualItems),
          finalAdjustment?.score ?? null,
        );

        grades = {
          finalGrade: resolved.finalScore,
          otherItems: [...quizRows, ...manualRows],
          isPartial: resolved.isPartial,
          /*
           * Cuánto del curso lleva cursado ESTE estudiante, medido en peso
           * con nota. La ficha enseñaba "entregas ÷ actividades", que ignora
           * parciales y notas manuales: con una sola actividad entregada
           * marcaba 100 % y se pintaba de verde mientras dos de los tres
           * cortes seguían vacíos. Medía una cosa y se leía como otra.
           */
          progressPct: resolved.basis === 'cortes' && resolved.totalCorteWeight > 0
            ? Math.round((resolved.countedCorteWeight / resolved.totalCorteWeight) * 100)
            : null,
          cortes: courseCortes.map((c) => ({
            id: c.id,
            name: c.name,
            weight: c.weight,
            order: c.order,
            score: corteScores[c.id] ?? null,
          })),
          activityGrades: activities.map((act) => {
            const g = studentGrades.find((gr) => gr.activityId === act.id);
            return {
              activityId: act.id,
              corteId: act.corteId ?? null,
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

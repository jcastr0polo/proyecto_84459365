/**
 * GET /api/courses/[id]/cortes/overview — Los cortes con lo que hay dentro
 *
 * La pantalla de cortes solo enseñaba nombre, peso y orden: una tabla de
 * configuración. Pero el corte es la unidad con la que el docente piensa y
 * con la que la universidad le pide las notas, así que aquí se devuelve lo
 * que de verdad necesita saber al abrirlo: qué ítems tiene, cuánto pesan por
 * dentro, cuánto lleva calificado, cómo va el grupo, y cuánto falta para el
 * reporte.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById, readCortesFresh, readActivitiesFresh, readGradesFresh,
  readEnrollmentsFresh, readQuizzesFresh, readQuizAttemptsFresh,
  readManualGradeItemsFresh, readManualGradesFresh,
} from '@/lib/dataService';
import { calculateCorteScores, isAdjustItemId } from '@/lib/gradeService';
import { startOfTodayColombia } from '@/lib/activityStatus';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId } = await params;

    const course = await getCourseById(courseId);
    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const [cortes, activities, grades, enrollments, quizzes, attempts, manualItems, manualGrades] =
      await Promise.all([
        readCortesFresh(), readActivitiesFresh(), readGradesFresh(), readEnrollmentsFresh(),
        readQuizzesFresh(), readQuizAttemptsFresh(), readManualGradeItemsFresh(), readManualGradesFresh(),
      ]);

    const courseCortes = cortes.filter((c) => c.courseId === courseId)
      .sort((a, b) => a.order - b.order);
    const courseActivities = activities.filter(
      (a) => a.courseId === courseId && (a.status === 'published' || a.status === 'closed'),
    );
    const allCourseActivities = activities.filter((a) => a.courseId === courseId);
    const courseQuizzes = quizzes.filter((q) => q.courseId === courseId);
    const courseManualItems = manualItems.filter(
      (i) => i.courseId === courseId && !isAdjustItemId(i.id),
    );
    const roster = enrollments.filter((e) => e.courseId === courseId && e.status === 'active');

    const today = startOfTodayColombia(new Date());
    const dias = (iso?: string) => iso
      ? Math.round((new Date(`${iso}T00:00:00-05:00`).getTime() - today.getTime()) / 86400000)
      : null;

    // Nota de cada corte para cada estudiante, calculada una sola vez.
    const scoresPorAlumno = roster.map((e) => calculateCorteScores(
      e.studentId, courseCortes, courseActivities, grades,
      courseQuizzes.filter((q) => q.type === 'graded' && q.weight && q.weight > 0),
      attempts, courseManualItems, manualGrades,
    ));

    const resumen = courseCortes.map((corte) => {
      const acts = allCourseActivities.filter((a) => a.corteId === corte.id);
      const qz = courseQuizzes.filter((q) => q.corteId === corte.id);
      const mi = courseManualItems.filter((i) => i.corteId === corte.id);

      const items = [
        ...acts.map((a) => ({
          id: a.id, title: a.title, kind: 'activity' as const, weight: a.weight,
          status: a.status, dueDate: a.dueDate ?? null,
          graded: grades.filter((g) => g.activityId === a.id).length,
        })),
        ...qz.map((q) => ({
          id: q.id, title: q.title, kind: 'quiz' as const, weight: q.weight ?? 0,
          status: q.type === 'graded' ? 'published' : 'training', dueDate: q.endDate ?? null,
          graded: new Set(attempts.filter((t) => t.quizId === q.id).map((t) => t.studentId)).size,
        })),
        ...mi.map((i) => ({
          id: i.id, title: i.title, kind: 'manual' as const, weight: i.weight,
          status: 'published', dueDate: null,
          graded: manualGrades.filter((g) => g.itemId === i.id).length,
        })),
      ];

      const notas = scoresPorAlumno.map((s) => s[corte.id]).filter((n): n is number => n !== null);

      return {
        ...corte,
        items,
        /* Los pesos internos deben sumar 100 dentro del corte. Si no suman,
           la nota del corte se normaliza igual, pero el docente está
           repartiendo distinto de lo que cree. */
        internalWeight: items.reduce((a, i) => a + i.weight, 0),
        studentsTotal: roster.length,
        /** Estudiantes con al menos una nota en este corte. */
        studentsWithScore: notas.length,
        average: notas.length > 0
          ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
          : null,
        failing: notas.filter((n) => n < 3).length,
        /** Días hasta el tope de reporte. Negativo = ya venció. */
        daysToReport: dias(corte.reportDeadline),
        daysToEnd: dias(corte.endDate),
        /** Ítems que aún no tienen nota para todos los inscritos. */
        pendingItems: items.filter((i) => i.graded < roster.length).length,
        canDelete: items.length === 0,
      };
    });

    return NextResponse.json({
      courseId,
      courseName: course.name,
      cortes: resumen,
      totalWeight: courseCortes.reduce((a, c) => a + c.weight, 0),
      /** Ítems calificables sin corte: no entran en ningún reporte. */
      orphanItems: [
        ...allCourseActivities.filter((a) => !a.corteId).map((a) => a.title),
        ...courseQuizzes.filter((q) => !q.corteId).map((q) => `[Parcial] ${q.title}`),
        ...courseManualItems.filter((i) => !i.corteId).map((i) => `[Manual] ${i.title}`),
      ],
    });
  }, 'admin');
}

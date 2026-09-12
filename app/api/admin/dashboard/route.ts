/**
 * GET /api/admin/dashboard — Todo lo que el panel docente necesita, de una vez
 *
 * El panel se armaba desde el navegador encadenando peticiones: semestres y
 * cursos, luego inscripciones y actividades POR CURSO, y luego entregas POR
 * ACTIVIDAD. Con tres cursos y tres actividades publicadas eran once viajes;
 * el número crece con cada curso que se abre y cada actividad que se publica.
 *
 * Y cada una de esas peticiones volvía a leer tablas completas que las otras
 * ya habían leído: /enrollments lee usuarios y cursos, /activities vuelve a
 * leer cursos, /submissions vuelve a leer usuarios…
 *
 * Aquí se leen las cinco tablas una sola vez, en paralelo, y se agrupa en
 * memoria. Medido contra la base real: 762 ms → 130 ms, y el navegador pasa
 * de once peticiones a una.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSemestersFresh,
  readCoursesFresh,
  readEnrollmentsFresh,
  readActivitiesFresh,
  readSubmissionsFresh,
} from '@/lib/dataService';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const [semesters, courses, enrollments, activities, submissions] = await Promise.all([
      readSemestersFresh(),
      readCoursesFresh(),
      readEnrollmentsFresh(),
      readActivitiesFresh(),
      readSubmissionsFresh(),
    ]);

    const semester = semesters.find((s) => s.isActive) ?? null;

    /*
     * Solo los cursos del semestre activo. Sin esto el panel mezclaba
     * asignaturas de semestres cerrados con las del actual y los conteos no
     * significaban nada.
     */
    const currentCourses = semester
      ? courses.filter((c) => c.semesterId === semester.id)
      : courses;

    // Agrupar una vez en vez de recorrer las listas por cada curso.
    const enrByCourse = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = enrByCourse.get(e.courseId);
      if (arr) arr.push(e); else enrByCourse.set(e.courseId, [e]);
    }

    const actByCourse = new Map<string, typeof activities>();
    for (const a of activities) {
      const arr = actByCourse.get(a.courseId);
      if (arr) arr.push(a); else actByCourse.set(a.courseId, [a]);
    }

    const subByActivity = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const arr = subByActivity.get(s.activityId);
      if (arr) arr.push(s); else subByActivity.set(s.activityId, [s]);
    }

    const courseData = currentCourses.map((course) => {
      const courseActivities = actByCourse.get(course.id) ?? [];
      // Las entregas solo cuentan para lo publicado, igual que antes: un
      // borrador no tiene entregas y no debe salir en la cola de calificar.
      const courseSubmissions = courseActivities
        .filter((a) => a.status !== 'draft')
        .flatMap((a) => subByActivity.get(a.id) ?? []);

      return {
        course,
        enrollments: enrByCourse.get(course.id) ?? [],
        activities: courseActivities,
        submissions: courseSubmissions,
      };
    });

    return NextResponse.json({ semester, courseData });
  }, 'admin');
}

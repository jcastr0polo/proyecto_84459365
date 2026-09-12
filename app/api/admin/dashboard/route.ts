/**
 * GET /api/admin/dashboard — Todo lo que el panel docente necesita, de una vez
 *
 * El panel se armaba desde el navegador encadenando peticiones: semestres y
 * cursos, luego inscripciones y actividades POR CURSO, y luego entregas POR
 * ACTIVIDAD. Con tres cursos y tres actividades publicadas eran once viajes;
 * el número crecía con cada curso que se abre y cada actividad que se publica.
 *
 * Aquí se lee cada tabla una sola vez, en paralelo, y se agrupa en memoria.
 * Además de los datos en bruto se devuelven las tres cosas que un docente
 * quiere saber al entrar y que antes tenía que ir a buscar curso por curso:
 * qué reportes vencen, qué hay por calificar ordenado por urgencia, y qué
 * estudiantes van perdiendo.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSemestersFresh, readCoursesFresh, readEnrollmentsFresh, readActivitiesFresh,
  readSubmissionsFresh, readGradesFresh, readCortesFresh, readQuizzesFresh,
  readQuizAttemptsFresh, readManualGradeItemsFresh, readManualGradesFresh, readUsersFresh,
} from '@/lib/dataService';
import {
  calculateCorteScores, calculateFinalGrade, resolveFinalScore,
  gradableItemsOf, adjustItemId, isAdjustItemId,
} from '@/lib/gradeService';
import { PASS } from '@/lib/gradeScale';
import { startOfTodayColombia } from '@/lib/activityStatus';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const [
      semesters, courses, enrollments, activities, submissions,
      grades, cortes, quizzes, attempts, manualItems, manualGrades, users,
    ] = await Promise.all([
      readSemestersFresh(), readCoursesFresh(), readEnrollmentsFresh(), readActivitiesFresh(),
      readSubmissionsFresh(), readGradesFresh(), readCortesFresh(), readQuizzesFresh(),
      readQuizAttemptsFresh(), readManualGradeItemsFresh(), readManualGradesFresh(), readUsersFresh(),
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
    const courseIds = new Set(currentCourses.map((c) => c.id));

    // Agrupar una vez en vez de recorrer las listas por cada curso.
    const group = <T,>(list: T[], key: (x: T) => string) => {
      const m = new Map<string, T[]>();
      for (const x of list) {
        const k = key(x);
        const arr = m.get(k);
        if (arr) arr.push(x); else m.set(k, [x]);
      }
      return m;
    };

    const enrByCourse = group(enrollments.filter((e) => e.status === 'active'), (e) => e.courseId);
    const actByCourse = group(activities, (a) => a.courseId);
    const subByActivity = group(submissions, (s) => s.activityId);
    const userById = new Map(users.map((u) => [u.id, u]));

    const courseData = currentCourses.map((course) => {
      const courseActivities = actByCourse.get(course.id) ?? [];
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

    // ── Lo que de verdad se quiere saber al entrar ──

    const today = startOfTodayColombia(new Date());
    const diasHasta = (iso?: string | null) => iso
      ? Math.round((new Date(`${iso}T00:00:00-05:00`).getTime() - today.getTime()) / 86400000)
      : null;

    const gradedActivitiesOf = (courseId: string) =>
      (actByCourse.get(courseId) ?? []).filter((a) => a.status === 'published' || a.status === 'closed');

    /*
     * 1 · Reportes de notas que vencen.
     *
     * Es la fecha que de verdad aprieta al docente: no cuándo cierra el corte,
     * sino cuándo hay que tener las notas subidas a la plataforma de la
     * universidad. Y no basta con la fecha: al lado va qué falta por calificar
     * para llegar, que es lo accionable.
     */
    const reportDeadlines = cortes
      .filter((c) => courseIds.has(c.courseId) && c.reportDeadline)
      .map((corte) => {
        const course = currentCourses.find((c) => c.id === corte.courseId)!;
        const roster = enrByCourse.get(corte.courseId) ?? [];

        const acts = (actByCourse.get(corte.courseId) ?? []).filter((a) => a.corteId === corte.id);
        const qz = quizzes.filter((q) => q.corteId === corte.id);
        const mi = manualItems.filter((i) => i.corteId === corte.id && !isAdjustItemId(i.id));

        const faltantes = [
          ...acts.map((a) => ({
            title: a.title,
            missing: roster.length - grades.filter((g) => g.activityId === a.id).length,
          })),
          ...qz.map((q) => ({
            title: q.title,
            missing: roster.length - new Set(attempts.filter((t) => t.quizId === q.id).map((t) => t.studentId)).size,
          })),
          ...mi.map((i) => ({
            title: i.title,
            missing: roster.length - manualGrades.filter((g) => g.itemId === i.id).length,
          })),
        ].filter((x) => x.missing > 0);

        return {
          courseId: course.id,
          courseName: course.name,
          corteId: corte.id,
          corteName: corte.name,
          deadline: corte.reportDeadline!,
          days: diasHasta(corte.reportDeadline)!,
          itemsTotal: acts.length + qz.length + mi.length,
          pendingItems: faltantes.length,
          /** Cuántas notas faltan en total para poder reportar. */
          missingGrades: faltantes.reduce((a, x) => a + x.missing, 0),
          worst: faltantes.sort((a, b) => b.missing - a.missing).slice(0, 3),
        };
      })
      .sort((a, b) => a.days - b.days);

    /*
     * 2 · Cola de calificación, por urgencia y no por volumen.
     *
     * Antes se ordenaba por cuántas entregas había pendientes, que premia al
     * curso grande aunque no corra prisa. Lo que aprieta es el plazo: primero
     * lo que tiene un reporte encima, después lo vencido, después el resto.
     */
    const gradingQueue = currentCourses.flatMap((course) => {
      const courseCortes = cortes.filter((c) => c.courseId === course.id);
      return (actByCourse.get(course.id) ?? [])
        .filter((a) => a.status !== 'draft')
        .map((activity) => {
          const subs = subByActivity.get(activity.id) ?? [];
          const pending = subs.filter((s) => s.status === 'submitted' || s.status === 'resubmitted').length;
          if (pending === 0) return null;

          const corte = courseCortes.find((c) => c.id === activity.corteId);
          const reportIn = diasHasta(corte?.reportDeadline);
          const dueIn = diasHasta(activity.dueDate?.slice(0, 10));

          /* El menor de los dos plazos manda: si el reporte es en tres días,
             da igual que la actividad venciera hace un mes. */
          const urgency = [reportIn, dueIn].filter((d): d is number => d !== null);

          return {
            activityId: activity.id,
            title: activity.title,
            courseId: course.id,
            courseName: course.name,
            corteName: corte?.name ?? null,
            pending,
            reportInDays: reportIn,
            dueInDays: dueIn,
            /** Días hasta lo más próximo. null = sin ningún plazo puesto. */
            urgencyDays: urgency.length > 0 ? Math.min(...urgency) : null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }).sort((a, b) => {
      // Sin plazo va al final; entre los que tienen plazo, el más próximo primero.
      if (a.urgencyDays === null && b.urgencyDays === null) return b.pending - a.pending;
      if (a.urgencyDays === null) return 1;
      if (b.urgencyDays === null) return -1;
      return a.urgencyDays - b.urgencyDays || b.pending - a.pending;
    });

    /*
     * 3 · Estudiantes en riesgo, en todo el semestre.
     *
     * El docente veía el promedio de cada curso, pero para saber quién va
     * perdiendo tenía que entrar a la tabla de notas de cada asignatura, una
     * por una. Aquí sale la lista, con el curso y cuánto lleva cursado, que es
     * lo que dice si aún hay margen de recuperarlo.
     */
    const atRisk = currentCourses.flatMap((course) => {
      const roster = enrByCourse.get(course.id) ?? [];
      const courseCortes = cortes.filter((c) => c.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      const courseQuizzes = quizzes.filter(
        (q) => q.courseId === course.id && q.type === 'graded' && q.weight && q.weight > 0,
      );
      const courseManualItems = manualItems.filter(
        (i) => i.courseId === course.id && !isAdjustItemId(i.id),
      );
      const gradedActs = gradedActivitiesOf(course.id);
      const gradable = gradableItemsOf(gradedActs, courseQuizzes, courseManualItems);

      return roster.flatMap((e) => {
        const student = userById.get(e.studentId);
        if (!student) return [];

        const corteScores = calculateCorteScores(
          e.studentId, courseCortes, gradedActs, grades,
          courseQuizzes, attempts, courseManualItems, manualGrades,
        );
        const flat = calculateFinalGrade(
          e.studentId, course.id, activities, grades,
          quizzes, attempts, manualItems, manualGrades,
        );
        const adj = manualGrades.find(
          (g) => g.itemId === adjustItemId(course.id) && g.studentId === e.studentId,
        );
        const r = resolveFinalScore(courseCortes, corteScores, flat, gradable, adj?.score ?? null);

        if (r.finalScore === null || r.finalScore >= PASS) return [];

        return [{
          studentId: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          courseId: course.id,
          courseName: course.name,
          score: r.finalScore,
          /** Cuánto del curso lleva calificado: dice si aún hay margen. */
          progressPct: r.basis === 'cortes' && r.totalCorteWeight > 0
            ? Math.round((r.countedCorteWeight / r.totalCorteWeight) * 100)
            : null,
        }];
      });
    }).sort((a, b) => a.score - b.score);

    /*
     * 4 · La forma del grupo.
     *
     * Un panel que lista veinte nombres no dice cómo va el curso; dice quiénes
     * son veinte personas. Lo que un docente lee de un vistazo es DÓNDE se
     * acumula el grupo en la escala: si la masa está pegada al 3.0 el problema
     * es del curso, y si hay dos bultos separados el problema es otro.
     *
     * Los tramos siguen la escala colombiana y su umbral de aprobación, no
     * cortes redondos arbitrarios: por eso el corte está en 3.0 y no en 2.5.
     */
    const BINS = [
      { min: 0.0, max: 2.0, label: '0–1.9' },
      { min: 2.0, max: 3.0, label: '2.0–2.9' },
      { min: 3.0, max: 3.5, label: '3.0–3.4' },
      { min: 3.5, max: 4.0, label: '3.5–3.9' },
      { min: 4.0, max: 4.5, label: '4.0–4.4' },
      { min: 4.5, max: 5.01, label: '4.5–5.0' },
    ];

    const todasLasNotas = currentCourses.flatMap((course) => {
      const roster = enrByCourse.get(course.id) ?? [];
      const courseCortes = cortes.filter((c) => c.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      const courseQuizzes = quizzes.filter(
        (q) => q.courseId === course.id && q.type === 'graded' && q.weight && q.weight > 0,
      );
      const courseManualItems = manualItems.filter(
        (i) => i.courseId === course.id && !isAdjustItemId(i.id),
      );
      const gradedActs = gradedActivitiesOf(course.id);
      const gradable = gradableItemsOf(gradedActs, courseQuizzes, courseManualItems);

      return roster.flatMap((e) => {
        const cs = calculateCorteScores(
          e.studentId, courseCortes, gradedActs, grades,
          courseQuizzes, attempts, courseManualItems, manualGrades,
        );
        const flat = calculateFinalGrade(
          e.studentId, course.id, activities, grades,
          quizzes, attempts, manualItems, manualGrades,
        );
        const adj = manualGrades.find(
          (g) => g.itemId === adjustItemId(course.id) && g.studentId === e.studentId,
        );
        const r = resolveFinalScore(courseCortes, cs, flat, gradable, adj?.score ?? null);
        return r.finalScore === null ? [] : [{ courseId: course.id, score: r.finalScore }];
      });
    });

    const distribution = BINS.map((b) => ({
      label: b.label,
      min: b.min,
      count: todasLasNotas.filter((n) => n.score >= b.min && n.score < b.max).length,
    }));

    const conNota = todasLasNotas.length;
    const average = conNota > 0
      ? Math.round((todasLasNotas.reduce((a, n) => a + n.score, 0) / conNota) * 10) / 10
      : null;

    return NextResponse.json({
      semester,
      courseData,
      reportDeadlines,
      gradingQueue,
      atRisk,
      distribution,
      average,
      /** Cuántas notas hay ya calculadas: sin esto el promedio no se puede leer. */
      scoredCount: conNota,
      /** Inscripciones activas totales del semestre, para saber sobre cuántos va. */
      rosterCount: currentCourses.reduce((a, c) => a + (enrByCourse.get(c.id) ?? []).length, 0),
    });
  }, 'admin');
}

/**
 * GET /api/student/dashboard — Todo lo que el panel del estudiante necesita
 *
 * El panel se armaba desde el navegador y era el peor de los dos: pedía
 * inscripciones y actividades de TODOS los cursos del sistema —no solo de los
 * suyos— para averiguar en cuáles estaba inscrito, luego entregas por
 * actividad, luego /grades por curso (que por dentro lee diez tablas cada
 * vez) y luego parciales por curso.
 *
 * Con siete cursos eso son más de treinta peticiones y unas setenta lecturas
 * de tabla, la mayoría repitiendo lo mismo.
 *
 * Aquí se lee cada tabla una vez, en paralelo, y todo lo demás se calcula en
 * memoria con las mismas funciones puras que usa la vista de notas, para que
 * el número del panel y el de la pantalla de notas no puedan discrepar.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSemestersFresh, readCoursesFresh, readEnrollmentsFresh, readActivitiesFresh,
  readSubmissionsFresh, readGradesFresh, readCortesFresh, readQuizzesFresh,
  readQuizAttemptsFresh, readManualGradeItemsFresh, readManualGradesFresh,
} from '@/lib/dataService';
import {
  calculateCorteScores, calculateFinalGrade, resolveFinalScore,
  gradableItemsOf, adjustItemId, isAdjustItemId,
} from '@/lib/gradeService';
import { PASS } from '@/lib/gradeScale';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const [
      semesters, courses, enrollments, activities, submissions,
      grades, cortes, quizzes, attempts, manualItems, manualGrades,
    ] = await Promise.all([
      readSemestersFresh(), readCoursesFresh(), readEnrollmentsFresh(), readActivitiesFresh(),
      readSubmissionsFresh(), readGradesFresh(), readCortesFresh(), readQuizzesFresh(),
      readQuizAttemptsFresh(), readManualGradeItemsFresh(), readManualGradesFresh(),
    ]);

    const semester = semesters.find((s) => s.isActive) ?? null;

    // Solo sus cursos, y solo del semestre activo.
    const myEnrollments = enrollments.filter(
      (e) => e.studentId === user.id && e.status === 'active',
    );
    const myCourses = courses.filter((c) =>
      myEnrollments.some((e) => e.courseId === c.id)
      && (!semester || c.semesterId === semester.id));

    // El estudiante solo ve lo publicado, aquí igual que en su vista de notas.
    const publishedManual = manualGrades.filter((g) => g.isPublished !== false);

    const coursesData = myCourses.map((course) => {
      const enrollment = myEnrollments.find((e) => e.courseId === course.id)!;
      const courseActivities = activities.filter((a) => a.courseId === course.id);
      const visible = courseActivities.filter((a) => a.status !== 'draft');
      const mySubmissions = submissions.filter(
        (s) => s.studentId === user.id && visible.some((a) => a.id === s.activityId),
      );

      const myGrades = grades.filter(
        (g) => g.studentId === user.id && g.courseId === course.id && g.isPublished !== false,
      );

      const courseCortes = cortes.filter((c) => c.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      const courseQuizzes = quizzes.filter(
        (q) => q.courseId === course.id && q.type === 'graded' && q.weight && q.weight > 0,
      );
      const courseManualItems = manualItems.filter(
        (i) => i.courseId === course.id && !isAdjustItemId(i.id),
      );
      const gradedActivities = courseActivities.filter(
        (a) => a.status === 'published' || a.status === 'closed',
      );

      const corteScores = calculateCorteScores(
        user.id, courseCortes, gradedActivities, myGrades,
        courseQuizzes, attempts, courseManualItems, publishedManual,
      );
      const flat = calculateFinalGrade(
        user.id, course.id, activities, myGrades,
        quizzes, attempts, manualItems, publishedManual,
      );
      const finalAdjustment = publishedManual.find(
        (g) => g.itemId === adjustItemId(course.id) && g.studentId === user.id,
      );
      const resolved = resolveFinalScore(
        courseCortes, corteScores, flat,
        gradableItemsOf(gradedActivities, courseQuizzes, courseManualItems),
        finalAdjustment?.score ?? null,
      );

      /*
       * Cuánto necesita en lo que queda para pasar.
       *
       * Es la pregunta con la que un estudiante mira sus notas y la única que
       * el sistema nunca le respondía: veía un 2.6 y no sabía si eso era
       * recuperable o no. La cuenta ya está toda aquí —peso de cada corte y
       * cuáles tienen nota—, solo faltaba despejarla.
       *
       *   definitiva = (ganado + X · peso_restante) / peso_total = 3.0
       *   X = (3.0 · peso_total − ganado) / peso_restante
       *
       * Si sale por encima de 5.0 se dice el número igual, sin veredicto: es
       * un dato para ir a hablar con el docente, no una sentencia.
       */
      let needed: { score: number; remainingWeight: number } | null = null;
      if (resolved.basis === 'cortes' && resolved.totalCorteWeight > 0) {
        const restante = resolved.totalCorteWeight - resolved.countedCorteWeight;
        if (restante > 0) {
          const ganado = courseCortes.reduce((acc, c) => {
            const v = corteScores[c.id];
            return v === null || v === undefined ? acc : acc + v * c.weight;
          }, 0);
          const x = (PASS * resolved.totalCorteWeight - ganado) / restante;
          needed = { score: Math.round(x * 10) / 10, remainingWeight: restante };
        }
      }

      return {
        course,
        enrollment,
        activities: courseActivities,
        submissions: mySubmissions,
        /*
         * Las notas que el estudiante ya puede ver, de las TRES fuentes.
         *
         * Antes esto solo devolvía notas de ACTIVIDAD, y encima sin `id` ni
         * `isPublished` —que es justo por lo que la vista filtra—, así que
         * "Notas recientes" salía vacío incluso para quien tenía nota. Un
         * estudiante con un 3.6 leía "Sin notas todavía".
         *
         * Y los parciales y las notas manuales pesan en la definitiva igual
         * que una actividad: dejarlos fuera de su lista de notas es esconderle
         * de dónde sale su propio número.
         */
        grades: [
          ...myGrades.map((g) => ({
            id: g.id,
            title: courseActivities.find((a) => a.id === g.activityId)?.title ?? 'Actividad',
            kind: 'activity' as const,
            score: g.score, maxScore: g.maxScore,
            gradedAt: g.gradedAt, isPublished: true,
          })),
          ...courseQuizzes.flatMap((quiz) => {
            const mine = attempts.filter((a) => a.quizId === quiz.id && a.studentId === user.id);
            if (mine.length === 0) return [];
            const best = mine.reduce((b, a) => (a.percentage > b.percentage ? a : b));
            const max = quiz.maxScore ?? 5;
            return [{
              id: `q-${quiz.id}`,
              title: quiz.title,
              kind: 'quiz' as const,
              score: Math.round((best.percentage / 100) * max * 10) / 10,
              maxScore: max,
              gradedAt: best.completedAt ?? best.startedAt,
              isPublished: true,
            }];
          }),
          ...courseManualItems.flatMap((item) => {
            const mg = publishedManual.find(
              (g) => g.itemId === item.id && g.studentId === user.id,
            );
            return mg ? [{
              id: mg.id,
              title: item.title,
              kind: 'manual' as const,
              score: mg.score, maxScore: mg.maxScore,
              gradedAt: mg.gradedAt, isPublished: true,
            }] : [];
          }),
        ],
        finalScore: resolved.finalScore,
        needed,
        /*
         * Cuántas cosas calificables tiene el curso EN TOTAL.
         *
         * La tarjeta enseñaba "N de M calificadas" con M = número de
         * actividades. Al empezar a contar también parciales y notas manuales
         * en la N, salía un "2 de 1 calificadas": el numerador miraba tres
         * fuentes y el denominador una sola.
         */
        gradableTotal: visible.length + courseQuizzes.length + courseManualItems.length,
      };
    });

    /*
     * Parciales realmente ABIERTOS.
     *
     * Antes se devolvían todos los del curso sin mirar nada, así que la
     * sección "Parcial abierto" enseñaba parciales cuya ventana había cerrado
     * el día anterior. Eso no es un detalle: esa sección va la primera y en
     * cian porque significa "esto se cierra y no hay vuelta atrás". Si miente,
     * deja de leerse.
     *
     * Abierto = dentro de su ventana y con intentos disponibles.
     */
    const ahora = Date.now();
    const activeQuizzes = myCourses.flatMap((course) =>
      quizzes
        .filter((q) => {
          if (q.courseId !== course.id) return false;
          if (q.startDate && new Date(q.startDate).getTime() > ahora) return false;
          if (q.endDate && new Date(q.endDate).getTime() < ahora) return false;
          const mine = attempts.filter((a) => a.quizId === q.id && a.studentId === user.id);
          return q.maxAttempts === 0 || mine.length < q.maxAttempts;
        })
        .map((quiz) => ({ quiz, courseName: course.name, courseId: course.id })));

    return NextResponse.json({
      user: {
        id: user.id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role,
      },
      semester,
      coursesData,
      activeQuizzes,
    });
  });
}

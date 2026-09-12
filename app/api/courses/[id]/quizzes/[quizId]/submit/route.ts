/**
 * POST /api/courses/[id]/quizzes/[quizId]/submit — Enviar respuestas de parcial
 *
 * Módulo de Parciales / Quizzes
 *
 * Calcula puntaje automáticamente:
 * - single: opción con weight=100 es correcta (todo o nada)
 * - weighted: score = (selectedWeight / maxWeight) * points
 *
 * Anti-trampas: registra blurCount y autoSubmitted
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { submitQuizSchema } from '@/lib/schemas';
import {
  getCourseById,
  getQuizById,
  readQuizAttemptsFresh,
  appendQuizAttempt,
  appendQuizSimulation,
  isStudentEnrolled,
  parseDateColombia,
  nowColombiaISO,
} from '@/lib/dataService';
import type { QuizAttempt, QuizAnswer, QuizSimulation } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      // Solo estudiantes (o admin en simulación) pueden enviar respuestas
      const body = await request.json();
      const parsed = submitQuizSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { answers: rawAnswers, blurCount = 0, autoSubmitted = false, startedAt: inicioReportado } = parsed.data;

      // Modo simulación: admin puede probar sin guardar
      const isSimulation = body.simulate === true && user.role === 'admin';

      if (user.role !== 'student' && user.role !== 'admin') {
        return NextResponse.json({ error: 'Solo estudiantes pueden responder parciales' }, { status: 403 });
      }
      if (user.role === 'student' && body.simulate) {
        return NextResponse.json({ error: 'Solo administradores pueden simular' }, { status: 403 });
      }

      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      if (!isSimulation && !(await isStudentEnrolled(user.id, id))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }

      const quiz = await getQuizById(quizId);
      if (!quiz || quiz.courseId !== id) {
        return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
      }

      if (!isSimulation && !quiz.isActive) {
        return NextResponse.json({ error: 'Este parcial no está activo' }, { status: 400 });
      }

      // Verificar rango de fechas
      const now = new Date();
      if (!isSimulation && quiz.startDate && parseDateColombia(quiz.startDate) > now) {
        return NextResponse.json({ error: 'Este parcial aún no está disponible' }, { status: 400 });
      }
      if (!isSimulation && quiz.endDate && parseDateColombia(quiz.endDate) < now) {
        return NextResponse.json({ error: 'Este parcial ya cerró' }, { status: 400 });
      }

      // Verificar intentos permitidos
      let studentAttempts: QuizAttempt[] = [];
      if (!isSimulation) {
        const allAttempts = await readQuizAttemptsFresh();
        studentAttempts = allAttempts.filter(
          (a) => a.quizId === quizId && a.studentId === user.id
        );

        if (quiz.maxAttempts > 0 && studentAttempts.length >= quiz.maxAttempts) {
          return NextResponse.json(
            { error: `Has alcanzado el máximo de intentos (${quiz.maxAttempts})` },
            { status: 400 }
          );
        }
      }

      // Calcular puntajes
      let totalScore = 0;
      const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const gradedAnswers: QuizAnswer[] = [];

      for (const ans of rawAnswers) {
        const question = quiz.questions.find((q) => q.id === ans.questionId);
        if (!question) continue;

        let pointsEarned = 0;

        if (question.type === 'single') {
          // Única respuesta correcta: weight 100 = todo, else 0
          const selectedOption = question.options.find((o) => o.id === ans.selectedOptionId);
          if (!selectedOption) continue;
          pointsEarned = selectedOption.weight === 100 ? question.points : 0;

          totalScore += pointsEarned;
          gradedAnswers.push({
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId,
            pointsEarned,
          });
        } else {
          // Weighted/multi-select con penalización por incorrectas (estándar Moodle)
          // - Cada opción correcta seleccionada suma su peso
          // - Cada opción incorrecta seleccionada resta: totalPositiveWeight / numIncorrectOptions
          // - Piso en 0 (no puede dar negativo)
          const ids = ans.selectedOptionIds?.length ? ans.selectedOptionIds : (ans.selectedOptionId ? [ans.selectedOptionId] : []);
          const selectedOptions = question.options.filter((o) => ids.includes(o.id));
          if (selectedOptions.length === 0) continue;

          const totalPositiveWeight = question.options.reduce((s, o) => s + (o.weight > 0 ? o.weight : 0), 0);
          const incorrectOptions = question.options.filter((o) => o.weight === 0);
          const penaltyPerWrong = incorrectOptions.length > 0 ? totalPositiveWeight / incorrectOptions.length : 0;

          let earnedWeight = 0;
          for (const opt of selectedOptions) {
            if (opt.weight > 0) {
              earnedWeight += opt.weight;
            } else {
              earnedWeight -= penaltyPerWrong;
            }
          }
          earnedWeight = Math.max(0, earnedWeight); // piso en 0

          pointsEarned = totalPositiveWeight > 0
            ? Math.round(((earnedWeight / totalPositiveWeight) * question.points) * 100) / 100
            : 0;

          totalScore += pointsEarned;
          gradedAnswers.push({
            questionId: ans.questionId,
            selectedOptionId: ids[0] || '',
            selectedOptionIds: ids,
            pointsEarned,
          });
        }
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;

      /* Cuándo empezó de verdad.
         Antes esto era `now - 60s // Aprox`: los 42 intentos guardados dicen
         todos que duraron un minuto, y la duración que ve el docente en
         resultados no era un dato sino relleno.
         Ahora lo dice el navegador, que es quien lo sabe, y el servidor lo
         acota: no puede estar en el futuro ni ser más viejo que el tiempo
         concedido más un margen. Eso deja la duración correcta en el caso
         honesto —que es el de todos— sin fingir que esto es anti-trampa: un
         inicio que manda el cliente se puede falsear, igual que blurCount.
         Para impedirlo de verdad haría falta que el servidor registre el
         comienzo del intento, y eso cambia cómo se cuentan los intentos. */
      const MARGEN_MS = 2 * 60_000;
      const techoMs = quiz.timeLimit ? quiz.timeLimit * 60_000 + MARGEN_MS : 12 * 60 * 60_000;
      const inicioMs = inicioReportado ? Date.parse(inicioReportado) : NaN;
      const duracionCruda = Number.isFinite(inicioMs) ? now.getTime() - inicioMs : null;

      const excedioTiempo = duracionCruda !== null && quiz.timeLimit != null && duracionCruda > techoMs;
      const inicioValido =
        duracionCruda === null || duracionCruda < 0
          ? now.getTime()                                   // ausente o en el futuro
          : now.getTime() - Math.min(duracionCruda, techoMs); // acotado al techo

      // Detectar comportamiento sospechoso
      const flagged = blurCount >= 3 || autoSubmitted || excedioTiempo;

      const attempt: QuizAttempt = {
        id: `attempt-${uuidv4()}`,
        quizId,
        studentId: user.id,
        courseId: id,
        answers: gradedAnswers,
        score: totalScore,
        maxScore,
        percentage,
        attemptNumber: studentAttempts.length + 1,
        startedAt: new Date(inicioValido).toISOString(),
        completedAt: nowColombiaISO(),
        blurCount,
        autoSubmitted,
        flagged,
      };

      /* Guardar intento (NO en simulación).
         Un INSERT de una fila, no una reescritura de la tabla: ver
         supabaseInsertQuizAttempt. Con el patrón anterior, dos estudiantes
         enviando a la vez desde instancias distintas se borraban el intento
         el uno al otro. */
      if (!isSimulation) {
        await appendQuizAttempt(attempt);
      }

      // Simulación: siempre muestra resultados completos
      if (isSimulation) {
        // Guardar simulación en quiz-simulations.json
        const simulation: QuizSimulation = {
          id: `sim-${uuidv4()}`,
          quizId,
          courseId: id,
          adminId: user.id,
          adminName: `${user.firstName} ${user.lastName}`,
          quizTitle: quiz.title,
          answers: gradedAnswers,
          score: totalScore,
          maxScore,
          percentage,
          blurCount,
          autoSubmitted,
          simulatedAt: nowColombiaISO(),
        };

        await appendQuizSimulation(simulation);

        return NextResponse.json({
          attempt,
          simulation: true,
          message: '🧪 Simulación completada y guardada',
        }, { status: 200 });
      }

      // Determinar si se muestran resultados
      const showResults =
        quiz.type === 'training' ||
        quiz.resultVisibility === 'immediate' ||
        (quiz.resultVisibility === 'manual' && quiz.resultsReleased);

      if (showResults) {
        return NextResponse.json({
          attempt,
          message: autoSubmitted
            ? 'Parcial enviado automáticamente por pérdida de foco'
            : 'Parcial enviado exitosamente',
        }, { status: 201 });
      }

      // Ocultar respuestas detalladas
      return NextResponse.json({
        attempt: {
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          completedAt: attempt.completedAt,
        },
        message: 'Parcial enviado exitosamente. Los resultados se publicarán más adelante.',
      }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

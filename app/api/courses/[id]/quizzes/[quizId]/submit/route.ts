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
  writeQuizAttempts,
  isStudentEnrolled,
  withFileLock,
} from '@/lib/dataService';
import type { QuizAttempt, QuizAnswer } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      // Solo estudiantes pueden enviar respuestas
      if (user.role !== 'student') {
        return NextResponse.json({ error: 'Solo estudiantes pueden responder parciales' }, { status: 403 });
      }

      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      if (!(await isStudentEnrolled(user.id, id))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }

      const quiz = await getQuizById(quizId);
      if (!quiz || quiz.courseId !== id) {
        return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
      }

      if (!quiz.isActive) {
        return NextResponse.json({ error: 'Este parcial no está activo' }, { status: 400 });
      }

      // Verificar rango de fechas
      const now = new Date();
      if (quiz.startDate && new Date(quiz.startDate) > now) {
        return NextResponse.json({ error: 'Este parcial aún no está disponible' }, { status: 400 });
      }
      if (quiz.endDate && new Date(quiz.endDate) < now) {
        return NextResponse.json({ error: 'Este parcial ya cerró' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = submitQuizSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { answers: rawAnswers, blurCount = 0, autoSubmitted = false } = parsed.data;

      // Verificar intentos permitidos
      const allAttempts = await readQuizAttemptsFresh();
      const studentAttempts = allAttempts.filter(
        (a) => a.quizId === quizId && a.studentId === user.id
      );

      if (quiz.maxAttempts > 0 && studentAttempts.length >= quiz.maxAttempts) {
        return NextResponse.json(
          { error: `Has alcanzado el máximo de intentos (${quiz.maxAttempts})` },
          { status: 400 }
        );
      }

      // Calcular puntajes
      let totalScore = 0;
      const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const gradedAnswers: QuizAnswer[] = [];

      for (const ans of rawAnswers) {
        const question = quiz.questions.find((q) => q.id === ans.questionId);
        if (!question) continue;

        const selectedOption = question.options.find((o) => o.id === ans.selectedOptionId);
        if (!selectedOption) continue;

        let pointsEarned = 0;
        if (question.type === 'single') {
          // Única respuesta correcta: weight 100 = todo, else 0
          pointsEarned = selectedOption.weight === 100 ? question.points : 0;
        } else {
          // Weighted: proporcional
          const maxWeight = Math.max(...question.options.map((o) => o.weight));
          pointsEarned = maxWeight > 0
            ? Math.round(((selectedOption.weight / maxWeight) * question.points) * 100) / 100
            : 0;
        }

        totalScore += pointsEarned;
        gradedAnswers.push({
          questionId: ans.questionId,
          selectedOptionId: ans.selectedOptionId,
          pointsEarned,
        });
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;

      // Detectar comportamiento sospechoso
      const flagged = blurCount >= 3 || autoSubmitted;

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
        startedAt: new Date(now.getTime() - 60000).toISOString(), // Aprox
        completedAt: now.toISOString(),
        blurCount,
        autoSubmitted,
        flagged,
      };

      await withFileLock('quiz-attempts.json', async () => {
        const attempts = await readQuizAttemptsFresh();
        attempts.push(attempt);
        await writeQuizAttempts(attempts);
      });

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

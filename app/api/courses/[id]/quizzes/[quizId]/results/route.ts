/**
 * GET /api/courses/[id]/quizzes/[quizId]/results — Resultados del parcial
 * PUT /api/courses/[id]/quizzes/[quizId]/results — Liberar/ocultar resultados
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById,
  readQuizzesFresh,
  writeQuizzes,
  readQuizAttemptsFresh,
  isStudentEnrolled,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

/**
 * GET /api/courses/[id]/quizzes/[quizId]/results
 * Admin: ve todos los intentos de todos los estudiantes
 * Estudiante: ve sus intentos (si resultados están visibles)
 */
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id, quizId } = await params;

    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const quizzes = await readQuizzesFresh();
    const quiz = quizzes.find((q) => q.id === quizId && q.courseId === id);
    if (!quiz) {
      return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
    }

    const allAttempts = await readQuizAttemptsFresh();
    const quizAttempts = allAttempts.filter((a) => a.quizId === quizId);

    if (user.role === 'admin') {
      // Admin: resultados completos con estadísticas
      const uniqueStudents = [...new Set(quizAttempts.map((a) => a.studentId))];
      const avgPercentage = quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
        : 0;

      return NextResponse.json({
        quiz: { id: quiz.id, title: quiz.title, type: quiz.type, resultVisibility: quiz.resultVisibility, resultsReleased: quiz.resultsReleased },
        attempts: quizAttempts,
        stats: {
          totalAttempts: quizAttempts.length,
          uniqueStudents: uniqueStudents.length,
          avgPercentage,
          flaggedCount: quizAttempts.filter((a) => a.flagged).length,
          autoSubmittedCount: quizAttempts.filter((a) => a.autoSubmitted).length,
          highestScore: quizAttempts.length > 0 ? Math.max(...quizAttempts.map((a) => a.percentage)) : 0,
          lowestScore: quizAttempts.length > 0 ? Math.min(...quizAttempts.map((a) => a.percentage)) : 0,
        },
      });
    }

    // Estudiante
    if (!(await isStudentEnrolled(user.id, id))) {
      return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
    }

    const myAttempts = quizAttempts.filter((a) => a.studentId === user.id);

    // Verificar si puede ver resultados
    const canSee =
      quiz.type === 'training' ||
      quiz.resultVisibility === 'immediate' ||
      (quiz.resultVisibility === 'manual' && quiz.resultsReleased);

    if (!canSee) {
      return NextResponse.json({
        quiz: { id: quiz.id, title: quiz.title, type: quiz.type },
        message: 'Los resultados aún no han sido publicados',
        attemptCount: myAttempts.length,
      });
    }

    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, type: quiz.type },
      attempts: myAttempts,
    });
  });
}

/**
 * PUT /api/courses/[id]/quizzes/[quizId]/results — Liberar/ocultar resultados (admin)
 * Body: { released: true/false }
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      const body = await request.json();
      const released = body?.released;
      if (typeof released !== 'boolean') {
        return NextResponse.json({ error: 'Campo "released" (boolean) requerido' }, { status: 400 });
      }

      return withFileLock('quizzes.json', async () => {
        const quizzes = await readQuizzesFresh();
        const index = quizzes.findIndex((q) => q.id === quizId && q.courseId === id);
        if (index === -1) {
          return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
        }

        quizzes[index].resultsReleased = released;
        quizzes[index].updatedAt = nowColombiaISO();

        await dispatchWrite(
          () => writeQuizzes(quizzes),
          {
            action: 'update',
            entity: 'quiz',
            entityId: quizId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `${released ? 'Liberó' : 'Ocultó'} resultados del parcial "${quizzes[index].title}"`,
          }
        );

        return NextResponse.json({
          message: released ? 'Resultados publicados' : 'Resultados ocultos',
          resultsReleased: released,
        });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

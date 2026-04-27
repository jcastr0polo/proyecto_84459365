/**
 * GET    /api/courses/[id]/quizzes/[quizId] — Detalle del parcial
 * PUT    /api/courses/[id]/quizzes/[quizId] — Editar parcial
 * DELETE /api/courses/[id]/quizzes/[quizId] — Eliminar parcial
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { updateQuizSchema } from '@/lib/schemas';
import {
  getCourseById,
  readQuizzesFresh,
  writeQuizzes,
  isStudentEnrolled,
  readQuizAttemptsFresh,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { QuizQuestion, QuizOption } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

/**
 * GET /api/courses/[id]/quizzes/[quizId]
 * Admin: ve todo incluyendo pesos de respuestas
 * Estudiante: ve sin pesos (respuestas ocultas)
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

    if (user.role === 'student') {
      if (!(await isStudentEnrolled(user.id, id))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }
      if (!quiz.isActive) {
        return NextResponse.json({ error: 'Parcial no disponible' }, { status: 404 });
      }

      // Contar intentos del estudiante
      const attempts = await readQuizAttemptsFresh();
      const studentAttempts = attempts.filter(
        (a) => a.quizId === quizId && a.studentId === user.id
      );

      // Ocultar pesos de respuestas
      const safeQuiz = {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          options: q.options.map((opt) => ({ ...opt, weight: 0 })),
        })),
      };

      const canSeeDetail =
        quiz.type === 'training' ||
        quiz.resultVisibility === 'immediate' ||
        (quiz.resultVisibility === 'manual' && quiz.resultsReleased);

      return NextResponse.json({
        quiz: safeQuiz,
        attemptCount: studentAttempts.length,
        canAttempt: quiz.maxAttempts === 0 || studentAttempts.length < quiz.maxAttempts,
        resultsAvailable: studentAttempts.length > 0,
        detailAvailable: canSeeDetail && studentAttempts.length > 0,
      });
    }

    // Admin ve todo
    const attempts = await readQuizAttemptsFresh();
    const quizAttempts = attempts.filter((a) => a.quizId === quizId);

    return NextResponse.json({
      quiz,
      stats: {
        totalAttempts: quizAttempts.length,
        uniqueStudents: new Set(quizAttempts.map((a) => a.studentId)).size,
        flaggedCount: quizAttempts.filter((a) => a.flagged).length,
        avgScore: quizAttempts.length > 0
          ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
          : 0,
      },
    });
  });
}

/**
 * PUT /api/courses/[id]/quizzes/[quizId] — Editar parcial (admin only)
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const body = await request.json();
      const parsed = updateQuizSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const updates = parsed.data;

      return withFileLock('quizzes.json', async () => {
        const quizzes = await readQuizzesFresh();
        const index = quizzes.findIndex((q) => q.id === quizId && q.courseId === id);
        if (index === -1) {
          return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
        }

        const quiz = quizzes[index];
        const quizBefore = { ...quiz, questions: quiz.questions.length + ' preguntas' };

        // Aplicar actualizaciones simples
        if (updates.title !== undefined) quiz.title = updates.title;
        if (updates.description !== undefined) quiz.description = updates.description;
        if (updates.type !== undefined) quiz.type = updates.type;
        if (updates.resultVisibility !== undefined) quiz.resultVisibility = updates.resultVisibility;
        if (updates.resultsReleased !== undefined) quiz.resultsReleased = updates.resultsReleased;
        if (updates.timeLimit !== undefined) quiz.timeLimit = updates.timeLimit ?? undefined;
        if (updates.shuffleQuestions !== undefined) quiz.shuffleQuestions = updates.shuffleQuestions;
        if (updates.shuffleOptions !== undefined) quiz.shuffleOptions = updates.shuffleOptions;
        if (updates.lockBrowser !== undefined) quiz.lockBrowser = updates.lockBrowser;
        if (updates.maxAttempts !== undefined) quiz.maxAttempts = updates.maxAttempts;
        if (updates.isActive !== undefined) quiz.isActive = updates.isActive;
        if (updates.startDate !== undefined) quiz.startDate = updates.startDate;
        if (updates.endDate !== undefined) quiz.endDate = updates.endDate;

        // Reconstruir preguntas si se proporcionan
        if (updates.questions) {
          quiz.questions = updates.questions.map((q, idx): QuizQuestion => {
            const options: QuizOption[] = q.options.map((opt) => ({
              id: uuidv4(),
              text: opt.text,
              weight: opt.weight,
            }));
            return {
              id: uuidv4(),
              text: q.text,
              type: q.type,
              options,
              points: q.points,
              order: idx,
            };
          });
        }

        quiz.updatedAt = nowColombiaISO();
        quizzes[index] = quiz;

        await dispatchWrite(
          () => writeQuizzes(quizzes),
          {
            action: 'update',
            entity: 'quiz',
            entityId: quizId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Editó parcial "${quiz.title}"`,
            before: auditSnapshot(quizBefore),
            after: auditSnapshot({ ...quiz, questions: quiz.questions.length + ' preguntas' }),
            ...extractRequestMeta(request),
          }
        );

        return NextResponse.json({ quiz });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * DELETE /api/courses/[id]/quizzes/[quizId] — Eliminar parcial (admin only)
 */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id, quizId } = await params;

    return withFileLock('quizzes.json', async () => {
      const quizzes = await readQuizzesFresh();
      const index = quizzes.findIndex((q) => q.id === quizId && q.courseId === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
      }

      const removed = quizzes.splice(index, 1)[0];

      await dispatchWrite(
        () => writeQuizzes(quizzes),
        {
          action: 'delete',
          entity: 'quiz',
          entityId: quizId,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          details: `Eliminó parcial "${removed.title}"`,
          before: auditSnapshot({ ...removed, questions: removed.questions.length + ' preguntas' }),
          ...extractRequestMeta(request),
        }
      );

      return NextResponse.json({ message: 'Parcial eliminado' });
    });
  }, 'admin');
}

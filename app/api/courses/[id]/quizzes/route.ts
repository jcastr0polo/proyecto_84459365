/**
 * GET  /api/courses/[id]/quizzes — Listar parciales del curso
 * POST /api/courses/[id]/quizzes — Crear parcial
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { createQuizSchema } from '@/lib/schemas';
import {
  getCourseById,
  readQuizzesFresh,
  writeQuizzes,
  isStudentEnrolled,
  readQuizAttemptsFresh,
  withFileLock,
  nowColombiaISO,
  parseDateColombia,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { Quiz, QuizQuestion, QuizOption } from '@/lib/types';

/**
 * GET /api/courses/[id]/quizzes
 * Admin: ve todos los parciales
 * Estudiante inscrito: ve solo los activos dentro del rango de fecha
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const allQuizzes = await readQuizzesFresh();
    let quizzes = allQuizzes.filter((q) => q.courseId === id);

    if (user.role === 'student') {
      if (!(await isStudentEnrolled(user.id, id))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }

      const now = new Date();
      quizzes = quizzes.filter((q) => {
        if (!q.isActive) return false;
        if (q.startDate && parseDateColombia(q.startDate) > now) return false;
        if (q.endDate && parseDateColombia(q.endDate) < now) return false;
        return true;
      });

      // Ocultar respuestas correctas para estudiantes
      quizzes = quizzes.map((q) => ({
        ...q,
        questions: q.questions.map((question) => ({
          ...question,
          options: question.options.map((opt) => ({
            ...opt,
            weight: 0, // Ocultar peso/respuesta correcta
          })),
        })),
      }));

      // Enrich with attempt info per quiz
      const allAttempts = await readQuizAttemptsFresh();
      const enriched = quizzes.map((q) => {
        const myAttempts = allAttempts.filter((a) => a.quizId === q.id && a.studentId === user.id);
        const canSeeResults =
          q.type === 'training' ||
          q.resultVisibility === 'immediate' ||
          (q.resultVisibility === 'manual' && q.resultsReleased);
        return {
          ...q,
          attemptCount: myAttempts.length,
          canAttempt: q.maxAttempts === 0 || myAttempts.length < q.maxAttempts,
          resultsAvailable: myAttempts.length > 0,
          detailAvailable: canSeeResults && myAttempts.length > 0,
        };
      });

      return NextResponse.json({ quizzes: enriched, total: enriched.length });
    }

    return NextResponse.json({ quizzes, total: quizzes.length });
  });
}

/**
 * POST /api/courses/[id]/quizzes — Crear parcial (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;

      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const body = await request.json();
      const parsed = createQuizSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const now = nowColombiaISO();

      // Construir preguntas con IDs generados
      const questions: QuizQuestion[] = data.questions.map((q, idx) => {
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

      const quiz: Quiz = {
        id: `quiz-${uuidv4()}`,
        courseId: id,
        title: data.title,
        description: data.description,
        type: data.type,
        resultVisibility: data.resultVisibility ?? (data.type === 'training' ? 'immediate' : 'manual'),
        resultsReleased: false,
        questions,
        timeLimit: data.timeLimit ?? undefined,
        shuffleQuestions: data.shuffleQuestions ?? false,
        shuffleOptions: data.shuffleOptions ?? false,
        lockBrowser: data.lockBrowser ?? true,
        maxAttempts: data.maxAttempts ?? (data.type === 'training' ? 0 : 1),
        isActive: false,
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: now,
        updatedAt: now,
      };

      await withFileLock('quizzes.json', async () => {
        const quizzes = await readQuizzesFresh();
        quizzes.push(quiz);
        await dispatchWrite(
          () => writeQuizzes(quizzes),
          {
            action: 'create',
            entity: 'quiz',
            entityId: quiz.id,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Creó parcial "${quiz.title}" (${quiz.type}) en curso ${course.name}`,
            after: auditSnapshot({ ...quiz, questions: quiz.questions.length + ' preguntas' }),
            ...extractRequestMeta(request),
          }
        );
      });

      return NextResponse.json({ quiz, message: 'Parcial creado exitosamente' }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

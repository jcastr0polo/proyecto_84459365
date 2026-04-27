/**
 * GET /api/courses/[id]/quizzes/[quizId]/attempts — Intentos de un parcial (admin)
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById,
  getQuizById,
  readQuizAttemptsFresh,
  readUsersFresh,
} from '@/lib/dataService';
import type { SafeUser } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id, quizId } = await params;

    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz || quiz.courseId !== id) {
      return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
    }

    const [allAttempts, allUsers] = await Promise.all([
      readQuizAttemptsFresh(),
      readUsersFresh(),
    ]);

    const quizAttempts = allAttempts.filter((a) => a.quizId === quizId);

    // Enriquecer con datos del estudiante
    const enriched = quizAttempts.map((attempt) => {
      const student = allUsers.find((u) => u.id === attempt.studentId);
      const safeStudent: Partial<SafeUser> | null = student
        ? {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            documentNumber: student.documentNumber,
          }
        : null;

      return { ...attempt, student: safeStudent };
    });

    // Ordenar por fecha completado (más reciente primero)
    enriched.sort((a, b) => {
      const dateA = a.completedAt || a.startedAt;
      const dateB = b.completedAt || b.startedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        maxScore: quiz.questions.reduce((s, q) => s + q.points, 0),
        questions: quiz.questions,
      },
      attempts: enriched,
      total: enriched.length,
    });
  }, 'admin');
}

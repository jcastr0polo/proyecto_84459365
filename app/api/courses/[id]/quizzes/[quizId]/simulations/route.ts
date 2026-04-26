/**
 * GET /api/courses/[id]/quizzes/[quizId]/simulations — Historial de simulaciones (admin)
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById,
  getQuizById,
  readQuizSimulationsFresh,
} from '@/lib/dataService';

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

    const allSimulations = await readQuizSimulationsFresh();
    const quizSimulations = allSimulations
      .filter((s) => s.quizId === quizId)
      .sort((a, b) => new Date(b.simulatedAt).getTime() - new Date(a.simulatedAt).getTime());

    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title },
      simulations: quizSimulations,
      total: quizSimulations.length,
    });
  }, 'admin');
}

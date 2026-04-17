/**
 * POST /api/activities/[id]/grades/publish — Publicar notas de una actividad
 *
 * Fase 15 — Calificaciones y Notas Backend
 * RN-CAL-02: Publicación explícita — notas no visibles hasta isPublished: true
 * RN-CAL-03: Publicación masiva — todas las notas de golpe
 * CU-06: Publicar Notas de una Actividad
 *
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { publishGrades, GradeError } from '@/lib/gradeService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_user) => {
    try {
      const { id: activityId } = await params;

      const result = publishGrades(activityId);

      return NextResponse.json({
        message: `${result.published} nota(s) publicada(s) exitosamente`,
        published: result.published,
        activityId,
      });
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en POST /api/activities/[id]/grades/publish:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

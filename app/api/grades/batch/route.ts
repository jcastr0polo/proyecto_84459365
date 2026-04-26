/**
 * POST /api/grades/batch — Calificar múltiples entregas en un solo request
 *
 * Evita el problema de "last write wins" al guardar todas las notas
 * en un único ciclo read-modify-write sobre grades.json.
 *
 * Body: { items: [{ submissionId, activityId, studentId, courseId, score, feedback?, existingGradeId? }] }
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { gradeSubmissionBatch, GradeError } from '@/lib/gradeService';
import type { BatchGradeItem } from '@/lib/gradeService';
import { logAudit } from '@/lib/auditService';

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();

      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: 'Se requiere un array de items' },
          { status: 400 }
        );
      }

      // Basic validation of each item
      const items: BatchGradeItem[] = [];
      for (const item of body.items) {
        if (!item.submissionId || !item.activityId || !item.studentId || !item.courseId || item.score === undefined) {
          return NextResponse.json(
            { error: 'Cada item requiere submissionId, activityId, studentId, courseId y score' },
            { status: 400 }
          );
        }
        if (typeof item.score !== 'number' || item.score < 0) {
          return NextResponse.json(
            { error: `Score inválido para submission ${item.submissionId}` },
            { status: 400 }
          );
        }
        items.push({
          submissionId: item.submissionId,
          activityId: item.activityId,
          studentId: item.studentId,
          courseId: item.courseId,
          score: item.score,
          feedback: item.feedback,
          existingGradeId: item.existingGradeId,
        });
      }

      const result = await gradeSubmissionBatch(items, user.id);

      // Auditoría
      logAudit({
        action: 'create', entity: 'grade', entityId: 'batch',
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Calificación en lote: ${result.saved} guardadas, ${result.errors.length} errores`,
      });

      return NextResponse.json(result, { status: result.errors.length > 0 ? 207 : 200 });
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en POST /api/grades/batch:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

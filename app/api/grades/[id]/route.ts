/**
 * PUT /api/grades/[id] — Editar calificación existente
 *
 * Fase 15 — Calificaciones y Notas Backend
 * Admin puede corregir score y/o feedback de una calificación
 *
 * Body: { score?, feedback? }
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateGradeSchema } from '@/lib/schemas';
import { updateGrade, GradeError } from '@/lib/gradeService';
import { logAudit } from '@/lib/auditService';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Validar schema
      const parsed = updateGradeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Si no se envió ningún campo, nada que actualizar
      if (parsed.data.score === undefined && parsed.data.feedback === undefined) {
        return NextResponse.json(
          { error: 'Debe proporcionar al menos score o feedback' },
          { status: 400 }
        );
      }

      const grade = await updateGrade(id, parsed.data, user.id);

      logAudit({
        action: 'update', entity: 'grade', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Editó calificación (score: ${grade.score})`,
      });

      return NextResponse.json({ grade });
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en PUT /api/grades/[id]:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

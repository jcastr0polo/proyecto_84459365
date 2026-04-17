/**
 * POST /api/grades — Calificar una entrega
 *
 * Fase 15 — Calificaciones y Notas Backend
 * RF-CAL-01: Calificar entrega con nota y retroalimentación
 * RN-CAL-01: Score dentro del rango 0–maxScore
 * RN-CAL-02: Se guarda con isPublished: false
 *
 * Body: { submissionId, activityId, studentId, courseId, score, feedback? }
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createGradeSchema } from '@/lib/schemas';
import { gradeSubmission, GradeError } from '@/lib/gradeService';
import { toSafeUser } from '@/lib/withAuth';
import { getUserById } from '@/lib/dataService';

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();

      // Validar schema
      const parsed = createGradeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Calificar (RN-CAL-01 validado en servicio)
      const grade = gradeSubmission(parsed.data, user.id);

      // Enriquecer respuesta
      const student = getUserById(grade.studentId);
      const grader = toSafeUser(user);

      return NextResponse.json({
        grade,
        student: student ? {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
        } : null,
        gradedBy: {
          id: grader.id,
          firstName: grader.firstName,
          lastName: grader.lastName,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en POST /api/grades:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

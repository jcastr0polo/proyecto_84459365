/**
 * GET /api/courses/[id]/grades — Resumen de notas del curso
 *
 * Fase 15 — Calificaciones y Notas Backend
 * RF-CAL-04: Estudiante ve sus notas publicadas + acumulada
 * RF-CAL-05: Admin ve tabla completa (estudiantes × actividades × definitiva)
 * CU-07: Exportar notas del curso (formato JSON para frontend)
 *
 * Auth: admin → CourseGradeSummary completa
 *        student → StudentGradeSummary (solo sus notas publicadas)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { isStudentEnrolled } from '@/lib/dataService';
import {
  getCourseGradeSummary,
  getStudentGradeSummary,
  GradeError,
} from '@/lib/gradeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;

      if (user.role === 'admin') {
        // RF-CAL-05: Tabla completa para admin
        const summary = await getCourseGradeSummary(courseId);
        return NextResponse.json(summary);
      }

      // Estudiante: verificar inscripción
      if (!(await isStudentEnrolled(user.id, courseId))) {
        return NextResponse.json(
          { error: 'No estás inscrito en este curso' },
          { status: 403 }
        );
      }

      // RF-CAL-04: Solo notas publicadas del estudiante
      const summary = await getStudentGradeSummary(user.id, courseId);
      return NextResponse.json(summary);
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en GET /api/courses/[id]/grades:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

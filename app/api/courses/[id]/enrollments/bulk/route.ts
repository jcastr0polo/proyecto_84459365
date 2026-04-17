/**
 * POST /api/courses/[id]/enrollments/bulk — Inscripción masiva
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { bulkEnrollSchema } from '@/lib/schemas';
import { getCourseById } from '@/lib/dataService';
import { bulkEnroll, EnrollmentError } from '@/lib/enrollmentService';

/**
 * POST /api/courses/[id]/enrollments/bulk
 * Inscribir múltiples estudiantes de una vez (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;

      // Verificar que el curso existe
      const course = getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }
      if (!course.isActive) {
        return NextResponse.json({ error: 'El curso no está activo' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = bulkEnrollSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await bulkEnroll(id, parsed.data.students, user.id);

      return NextResponse.json({
        message: `Inscripción masiva completada`,
        summary: {
          total: parsed.data.students.length,
          enrolled: result.success.length,
          alreadyEnrolled: result.alreadyEnrolled.length,
          errors: result.errors.length,
        },
        success: result.success.map((s) => ({
          email: s.student.email,
          studentId: s.student.id,
          created: s.created,
        })),
        alreadyEnrolled: result.alreadyEnrolled,
        errors: result.errors,
      }, { status: 201 });
    } catch (err) {
      if (err instanceof EnrollmentError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode }
        );
      }
      console.error('Error en inscripción masiva:', err);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

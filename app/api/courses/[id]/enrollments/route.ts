/**
 * GET  /api/courses/[id]/enrollments — Listar inscritos del curso
 * POST /api/courses/[id]/enrollments — Inscribir un estudiante
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import { enrollStudentSchema } from '@/lib/schemas';
import { getEnrollmentsByCourse, getCourseById, getUserById } from '@/lib/dataService';
import { enrollStudent, EnrollmentError } from '@/lib/enrollmentService';
import type { EnrollmentWithStudent } from '@/lib/types';

/**
 * GET /api/courses/[id]/enrollments
 * Lista estudiantes inscritos con datos completos (admin only)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;

    const course = getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const enrollments = getEnrollmentsByCourse(id);

    // Enriquecer con datos del estudiante
    const enriched: EnrollmentWithStudent[] = [];
    for (const enrollment of enrollments) {
      const user = getUserById(enrollment.studentId);
      if (user) {
        enriched.push({
          ...enrollment,
          student: toSafeUser(user),
        });
      }
    }

    return NextResponse.json({
      enrollments: enriched,
      total: enriched.length,
      active: enriched.filter((e) => e.status === 'active').length,
    });
  }, 'admin');
}

/**
 * POST /api/courses/[id]/enrollments
 * Inscribir un estudiante individual (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const parsed = enrollStudentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await enrollStudent(id, parsed.data, user.id);

      return NextResponse.json(
        {
          enrollment: result.enrollment,
          student: result.student,
          created: result.created,
          message: result.created
            ? 'Estudiante creado e inscrito exitosamente'
            : 'Estudiante inscrito exitosamente',
        },
        { status: 201 }
      );
    } catch (err) {
      if (err instanceof EnrollmentError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.statusCode }
        );
      }
      console.error('Error inscribiendo estudiante:', err);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

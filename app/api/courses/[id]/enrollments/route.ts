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
import { readEnrollmentsFresh, readCoursesFresh, getUserById } from '@/lib/dataService';
import { enrollStudent, EnrollmentError } from '@/lib/enrollmentService';
import { logAudit, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { EnrollmentWithStudent } from '@/lib/types';

/**
 * GET /api/courses/[id]/enrollments
 * Admin: lista todos los inscritos con datos completos
 * Student: solo retorna su propia inscripción (si existe)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    // Read fresh from Blob — no stale cache
    const allCourses = await readCoursesFresh();
    const course = allCourses.find((c) => c.id === id) ?? null;
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const allEnrollments = await readEnrollmentsFresh();
    const enrollments = allEnrollments.filter((e) => e.courseId === id);

    // Estudiantes solo ven su propia inscripción
    if (user.role === 'student') {
      const mine = enrollments.filter((e) => e.studentId === user.id);
      return NextResponse.json({
        enrollments: mine,
        total: mine.length,
        active: mine.filter((e) => e.status === 'active').length,
      });
    }

    // Admin: enriquecer con datos del estudiante
    const enriched: EnrollmentWithStudent[] = [];
    for (const enrollment of enrollments) {
      const student = await getUserById(enrollment.studentId);
      if (student) {
        enriched.push({
          ...enrollment,
          student: toSafeUser(student),
        });
      }
    }

    return NextResponse.json({
      enrollments: enriched,
      total: enriched.length,
      active: enriched.filter((e) => e.status === 'active').length,
    });
  });
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

      logAudit({
        action: result.created ? 'create' : 'update',
        entity: 'enrollment',
        entityId: result.enrollment.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        details: `Inscribió a ${parsed.data.firstName} ${parsed.data.lastName} en curso ${id}${result.created ? ' (nuevo usuario)' : ''}`,
        after: auditSnapshot(result.enrollment),
        ...extractRequestMeta(request),
      });

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

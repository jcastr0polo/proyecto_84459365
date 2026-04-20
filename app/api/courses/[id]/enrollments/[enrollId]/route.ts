/**
 * DELETE /api/courses/[id]/enrollments/[enrollId] — Retirar estudiante
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * RN-INS-05: No se borra el registro, se cambia status a "withdrawn"
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readEnrollments, writeEnrollments, getCourseById } from '@/lib/dataService';

/**
 * DELETE /api/courses/[id]/enrollments/[enrollId]
 * Retira al estudiante del curso (soft-delete: status → withdrawn)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; enrollId: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id, enrollId } = await params;

    // Verificar curso
    const course = getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Buscar enrollment
    const enrollments = readEnrollments();
    const index = enrollments.findIndex(
      (e) => e.id === enrollId && e.courseId === id
    );

    if (index === -1) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
    }

    if (enrollments[index].status === 'withdrawn') {
      return NextResponse.json(
        { error: 'El estudiante ya fue retirado de este curso' },
        { status: 400 }
      );
    }

    // RN-INS-05: Soft-delete
    enrollments[index].status = 'withdrawn';
    enrollments[index].withdrawnAt = new Date().toISOString();
    await writeEnrollments(enrollments);

    return NextResponse.json({
      message: 'Estudiante retirado del curso',
      enrollment: enrollments[index],
    });
  }, 'admin');
}

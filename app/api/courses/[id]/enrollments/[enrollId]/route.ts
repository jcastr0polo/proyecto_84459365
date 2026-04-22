/**
 * DELETE /api/courses/[id]/enrollments/[enrollId] — Retirar estudiante
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * RN-INS-05: No se borra el registro, se cambia status a "withdrawn"
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readEnrollments, readEnrollmentsFresh, writeEnrollments, getCourseById } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { withFileLock } from '@/lib/blobSync';

/**
 * DELETE /api/courses/[id]/enrollments/[enrollId]
 * Retira al estudiante del curso (soft-delete: status → withdrawn)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; enrollId: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id, enrollId } = await params;

    // Verificar curso
    const course = getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    return withFileLock('enrollments.json', async () => {
      // Buscar enrollment
      const enrollments = await readEnrollmentsFresh();
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
      await dispatchWrite(
        () => writeEnrollments(enrollments),
        { action: 'delete', entity: 'enrollment', entityId: enrollId, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Retiró estudiante del curso ${course.name}` }
      );

      return NextResponse.json({
        message: 'Estudiante retirado del curso',
        enrollment: enrollments[index],
      });
    });
  }, 'admin');
}

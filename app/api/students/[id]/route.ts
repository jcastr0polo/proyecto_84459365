/**
 * GET /api/students/[id] — Perfil de un estudiante
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * Permisos:
 * - Admin: ve todos los datos + cursos inscritos
 * - Estudiante: solo ve su propio perfil + sus cursos
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import { getUserById, getEnrollmentsByStudent, getCourseById } from '@/lib/dataService';

/**
 * GET /api/students/[id]
 * Datos de un estudiante con sus cursos inscritos
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (currentUser) => {
    const { id } = await params;

    // Estudiantes solo pueden ver su propio perfil
    if (currentUser.role === 'student' && currentUser.id !== id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const student = getUserById(id);
    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Obtener enrollments con datos del curso
    const enrollments = getEnrollmentsByStudent(id);
    const enrolledCourses = enrollments
      .filter((e) => e.status === 'active')
      .map((e) => {
        const course = getCourseById(e.courseId);
        return {
          enrollmentId: e.id,
          enrolledAt: e.enrolledAt,
          course: course
            ? { id: course.id, code: course.code, name: course.name, category: course.category }
            : null,
        };
      })
      .filter((e) => e.course !== null);

    return NextResponse.json({
      student: toSafeUser(student),
      enrollments: enrolledCourses,
      totalCourses: enrolledCourses.length,
    });
  });
}

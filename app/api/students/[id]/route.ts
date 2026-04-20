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
import { getUserById, getEnrollmentsByStudent, getCourseById, readUsers, writeUsers } from '@/lib/dataService';
import { hashPassword } from '@/lib/auth';

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

/**
 * PATCH /api/students/[id]
 * Admin: reset password or toggle active status
 * Body: { action: 'resetPassword' } | { action: 'toggleActive' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: string };

    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id && u.role === 'student');
    if (idx === -1) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'resetPassword') {
      // Reset password to documentNumber
      users[idx].passwordHash = await hashPassword(users[idx].documentNumber);
      users[idx].mustChangePassword = true;
      users[idx].updatedAt = now;
      await writeUsers(users);
      return NextResponse.json({
        message: `Contraseña restablecida al documento (${users[idx].documentNumber})`,
        student: toSafeUser(users[idx]),
      });
    }

    if (action === 'toggleActive') {
      users[idx].isActive = !users[idx].isActive;
      users[idx].updatedAt = now;
      await writeUsers(users);
      return NextResponse.json({
        message: users[idx].isActive ? 'Estudiante activado' : 'Estudiante desactivado',
        student: toSafeUser(users[idx]),
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  }, 'admin');
}

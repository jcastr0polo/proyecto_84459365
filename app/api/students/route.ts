/**
 * GET /api/students — Buscar estudiantes
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * Query params:
 * - ?search= — Busca por nombre, email o documento
 * - ?all=true — Incluir estudiantes de todos los semestres (por defecto solo semestre activo)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import {
  readUsersFresh,
  getActiveSemester,
  getCoursesBySemester,
  readEnrollmentsFresh,
} from '@/lib/dataService';

/**
 * GET /api/students?search=&all=
 * Lista estudiantes (admin only).
 * Por defecto solo muestra estudiantes con inscripciones activas en el semestre activo.
 * Usar ?all=true para ver todos los estudiantes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() ?? '';
    const showAll = searchParams.get('all') === 'true';

    const users = await readUsersFresh();
    let students = users.filter((u) => u.role === 'student');

    // Filtrar por semestre activo (a menos que se pida ?all=true)
    if (!showAll) {
      const activeSemester = await getActiveSemester();
      if (activeSemester) {
        const semesterCourses = await getCoursesBySemester(activeSemester.id);
        const semesterCourseIds = new Set(semesterCourses.map((c) => c.id));
        const enrollments = await readEnrollmentsFresh();

        // IDs de estudiantes con inscripción activa en cursos del semestre activo
        const activeStudentIds = new Set(
          enrollments
            .filter((e) => e.status === 'active' && semesterCourseIds.has(e.courseId))
            .map((e) => e.studentId)
        );

        students = students.filter((s) => activeStudentIds.has(s.id));
      }
    }

    if (search) {
      students = students.filter(
        (s) =>
          s.firstName.toLowerCase().includes(search) ||
          s.lastName.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.documentNumber.includes(search)
      );
    }

    const safeStudents = students.map(toSafeUser);

    return NextResponse.json({
      students: safeStudents,
      total: safeStudents.length,
    });
  }, 'admin');
}

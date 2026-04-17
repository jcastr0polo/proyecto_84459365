/**
 * GET /api/students — Buscar estudiantes
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * Query params:
 * - ?search= — Busca por nombre, email o documento
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { toSafeUser } from '@/lib/withAuth';
import { readUsers } from '@/lib/dataService';

/**
 * GET /api/students?search=
 * Lista estudiantes (admin only). Filtro opcional por búsqueda.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() ?? '';

    const users = readUsers();
    let students = users.filter((u) => u.role === 'student');

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

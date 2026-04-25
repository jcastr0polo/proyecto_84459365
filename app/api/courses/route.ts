/**
 * GET  /api/courses — Listar cursos (admin: todos, student: solo inscritos)
 * POST /api/courses — Crear curso (solo admin)
 *
 * Fase 7 — Semestres y Cursos Backend
 *
 * Reglas de negocio:
 * - RN-CUR-01: Código único por semestre
 * - RN-CUR-02: Categoría obligatoria
 * - RN-CUR-03: Al menos un horario
 * - RN-CUR-04: Curso activo = semestre activo
 *
 * Query params (GET):
 * - semesterId: Filtrar por semestre (opcional)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createCourseSchema } from '@/lib/schemas';
import {
  readCoursesFresh,
  writeCourses,
  getCoursesBySemester,
  getSemesterById,
} from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { withFileLock } from '@/lib/blobSync';
import type { Course, User } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/courses — Listar cursos
 * Admin: ve todos los cursos (opcionalmente filtrados por semesterId).
 * Student: ve solo los cursos en los que está inscrito (futuro: filtrar por enrollments).
 *   Por ahora, estudiantes ven cursos del semestre activo.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user: User) => {
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get('semesterId');

    let courses: Course[];

    // Read fresh from Blob — no stale cache
    const allCourses = await readCoursesFresh();

    if (semesterId) {
      courses = allCourses.filter((c) => c.semesterId === semesterId);
    } else {
      courses = allCourses;
    }

    // Para estudiantes: filtrar solo cursos activos
    // (El filtrado por enrollments se implementará en Fase 9)
    if (user.role === 'student') {
      courses = courses.filter((c) => c.isActive);
    }

    return NextResponse.json({ courses });
  });
}

/**
 * POST /api/courses — Crear un curso nuevo
 * Solo admin. Valida unicidad de código por semestre (RN-CUR-01).
 */
export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();
      const parsed = createCourseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { code, name, description, semesterId, category, schedule } = parsed.data;

      // Verificar que el semestre existe
      const semester = await getSemesterById(semesterId);
      if (!semester) {
        return NextResponse.json(
          { error: `Semestre "${semesterId}" no encontrado` },
          { status: 404 }
        );
      }

      // RN-CUR-01: Código único por semestre
      const existingCourses = await getCoursesBySemester(semesterId);
      const duplicate = existingCourses.find(
        (c) => c.code.toLowerCase() === code.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un curso con código "${code}" en el semestre "${semesterId}"` },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const newCourse: Course = {
        id: `course-${uuidv4()}`,
        code,
        name,
        description,
        semesterId,
        category,
        schedule,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await withFileLock('courses.json', async () => {
        const courses = await readCoursesFresh();
        courses.push(newCourse);
        await dispatchWrite(
          () => writeCourses(courses),
          { action: 'create', entity: 'course', entityId: newCourse.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Creó curso "${newCourse.name}" (${newCourse.code})` }
        );
      });

      return NextResponse.json({ course: newCourse }, { status: 201 });
    } catch (error) {
      console.error('Error creando curso:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin');
}

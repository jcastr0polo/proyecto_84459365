/**
 * GET /api/courses/[id] — Detalle del curso (admin o estudiante inscrito)
 * PUT /api/courses/[id] — Editar curso (solo admin)
 *
 * Fase 7 — Semestres y Cursos Backend
 *
 * Reglas de negocio:
 * - RN-CUR-03: Al menos un horario al editar schedule
 * - RN-CUR-04: Curso activo = semestre activo
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateCourseSchema } from '@/lib/schemas';
import { readCourses, writeCourses, getCourseById } from '@/lib/dataService';
import type { User } from '@/lib/types';

/**
 * GET /api/courses/[id] — Detalle de un curso
 * Admin: siempre puede ver.
 * Estudiante: puede ver si está inscrito (futuro) o si el curso es activo.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user: User) => {
    const { id } = await params;
    const course = getCourseById(id);

    if (!course) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }

    // Estudiantes solo pueden ver cursos activos
    // (El filtrado por enrollment se implementará en Fase 9)
    if (user.role === 'student' && !course.isActive) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  });
}

/**
 * PUT /api/courses/[id] — Editar un curso
 * Solo admin. No se puede cambiar code ni semesterId (inmutables post-creación).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateCourseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const updates = parsed.data;
      const courses = readCourses();
      const index = courses.findIndex((c) => c.id === id);

      if (index === -1) {
        return NextResponse.json(
          { error: 'Curso no encontrado' },
          { status: 404 }
        );
      }

      // Aplicar actualizaciones
      if (updates.name !== undefined) courses[index].name = updates.name;
      if (updates.description !== undefined) courses[index].description = updates.description;
      if (updates.category !== undefined) courses[index].category = updates.category;
      if (updates.schedule !== undefined) courses[index].schedule = updates.schedule;
      if (updates.isActive !== undefined) courses[index].isActive = updates.isActive;

      courses[index].updatedAt = new Date().toISOString();
      writeCourses(courses);

      return NextResponse.json({ course: courses[index] });
    } catch (error) {
      console.error('Error editando curso:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin');
}

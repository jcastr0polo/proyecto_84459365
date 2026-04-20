/**
 * GET /api/semesters/[id] — Obtener semestre por ID (solo admin)
 * PUT /api/semesters/[id] — Editar semestre (solo admin)
 *
 * Fase 7 — Semestres y Cursos Backend
 *
 * Reglas de negocio:
 * - RN-SEM-01: Si se activa, desactivar todos los demás
 * - RN-SEM-04: Historial preservado (no se eliminan semestres)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateSemesterSchema } from '@/lib/schemas';
import { readSemesters, writeSemesters, getSemesterById } from '@/lib/dataService';

/**
 * GET /api/semesters/[id] — Detalle de un semestre
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id } = await params;
    const semester = getSemesterById(id);

    if (!semester) {
      return NextResponse.json(
        { error: 'Semestre no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ semester });
  }, 'admin');
}

/**
 * PUT /api/semesters/[id] — Editar un semestre
 * RN-SEM-01: Si isActive se pone en true, desactivar todos los demás.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateSemesterSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const updates = parsed.data;
      const semesters = readSemesters();
      const index = semesters.findIndex((s) => s.id === id);

      if (index === -1) {
        return NextResponse.json(
          { error: 'Semestre no encontrado' },
          { status: 404 }
        );
      }

      // Validar fechas si se proporcionan
      const newStartDate = updates.startDate ?? semesters[index].startDate;
      const newEndDate = updates.endDate ?? semesters[index].endDate;
      if (newStartDate >= newEndDate) {
        return NextResponse.json(
          { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
          { status: 400 }
        );
      }

      // RN-SEM-01: Si se activa este semestre, desactivar todos los demás
      if (updates.isActive === true) {
        for (let i = 0; i < semesters.length; i++) {
          if (i !== index) {
            semesters[i].isActive = false;
          }
        }
      }

      // Aplicar actualizaciones
      if (updates.label !== undefined) semesters[index].label = updates.label;
      if (updates.startDate !== undefined) semesters[index].startDate = updates.startDate;
      if (updates.endDate !== undefined) semesters[index].endDate = updates.endDate;
      if (updates.isActive !== undefined) semesters[index].isActive = updates.isActive;

      await writeSemesters(semesters);

      return NextResponse.json({ semester: semesters[index] });
    } catch (error) {
      console.error('Error editando semestre:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin');
}

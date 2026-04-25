/**
 * GET  /api/semesters — Listar todos los semestres (solo admin)
 * POST /api/semesters — Crear semestre (solo admin)
 *
 * Fase 7 — Semestres y Cursos Backend
 *
 * Reglas de negocio:
 * - RN-SEM-01: Solo un semestre activo a la vez
 * - RN-SEM-02: Formato de ID YYYYSS
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createSemesterSchema } from '@/lib/schemas';
import { readSemesters, readSemestersFresh, writeSemesters, getSemesterById } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { withFileLock } from '@/lib/blobSync';
import type { Semester } from '@/lib/types';

/**
 * GET /api/semesters — Listar todos los semestres
 * Solo admin. Retorna ordenados por ID descendente (más reciente primero).
 */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const semesters = await readSemestersFresh();
    const sorted = [...semesters].sort((a, b) => b.id.localeCompare(a.id));
    return NextResponse.json({ semesters: sorted });
  }, 'admin');
}

/**
 * POST /api/semesters — Crear un semestre nuevo
 * Solo admin. Aplica RN-SEM-01 (si isActive=true, desactiva los demás).
 */
export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();
      const parsed = createSemesterSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { id, label, startDate, endDate, isActive } = parsed.data;

      // Verificar que no exista un semestre con el mismo ID
      const existing = getSemesterById(id);
      if (existing) {
        return NextResponse.json(
          { error: `Ya existe un semestre con ID "${id}"` },
          { status: 409 }
        );
      }

      // Validar que startDate < endDate
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
          { status: 400 }
        );
      }

      const newSemester: Semester = {
        id,
        label,
        startDate,
        endDate,
        isActive: isActive ?? false,
        createdAt: new Date().toISOString(),
      };

      await withFileLock('semesters.json', async () => {
        const sems = await readSemestersFresh();

        // RN-SEM-01: Si el nuevo semestre se marca como activo, desactivar todos los demás
        if (isActive) {
          for (const sem of sems) {
            sem.isActive = false;
          }
        }

        sems.push(newSemester);
        await dispatchWrite(
          () => writeSemesters(sems),
          { action: 'create', entity: 'semester', entityId: newSemester.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Creó semestre "${newSemester.label}"` }
        );
        return sems;
      });

      return NextResponse.json({ semester: newSemester }, { status: 201 });
    } catch (error) {
      console.error('Error creando semestre:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin');
}

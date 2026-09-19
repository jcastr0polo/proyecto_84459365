/**
 * PUT    /api/courses/[id]/cortes/[corteId] — Editar corte
 * DELETE /api/courses/[id]/cortes/[corteId] — Eliminar corte
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateCorteSchema } from '@/lib/schemas';
import {
  readCortesFresh, writeCortes, readActivitiesFresh, readQuizzesFresh,
  readManualGradeItemsFresh, withFileLock, nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';

/**
 * PUT /api/courses/[id]/cortes/[corteId]
 * Edita nombre, peso u orden. Valida suma ≤ 100.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; corteId: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId, corteId } = await params;
      const body = await request.json();
      const parsed = updateCorteSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const updates = parsed.data;

      const updated = await withFileLock('cortes.json', async () => {
        const allCortes = await readCortesFresh();
        const idx = allCortes.findIndex((c) => c.id === corteId && c.courseId === courseId);
        if (idx === -1) throw new Error('NOT_FOUND');

        // Validar suma de pesos si cambia el weight
        if (updates.weight !== undefined) {
          const courseCortes = allCortes.filter((c) => c.courseId === courseId);
          const othersTotal = courseCortes
            .filter((c) => c.id !== corteId)
            .reduce((sum, c) => sum + c.weight, 0);
          if (othersTotal + updates.weight > 100) {
            throw new Error(`WEIGHT_EXCEEDED:${othersTotal}`);
          }
        }

        const before = { ...allCortes[idx] };

        if (updates.name !== undefined) allCortes[idx].name = updates.name;
        if (updates.weight !== undefined) allCortes[idx].weight = updates.weight;
        if (updates.order !== undefined) allCortes[idx].order = updates.order;
        /* Cadena vacía = quitar la fecha. Sin esto no habría forma de borrar
           una fecha puesta por error: dejarla en blanco no haría nada. */
        if (updates.startDate !== undefined) {
          if (updates.startDate) allCortes[idx].startDate = updates.startDate;
          else delete allCortes[idx].startDate;
        }
        if (updates.endDate !== undefined) {
          if (updates.endDate) allCortes[idx].endDate = updates.endDate;
          else delete allCortes[idx].endDate;
        }
        if (updates.reportDeadline !== undefined) {
          if (updates.reportDeadline) allCortes[idx].reportDeadline = updates.reportDeadline;
          else delete allCortes[idx].reportDeadline;
        }
        /* Marcar/desmarcar como reportado no toca ninguna otra fecha: es solo
           el aviso del panel el que se apaga o se vuelve a encender. */
        if (updates.reported !== undefined) {
          if (updates.reported) allCortes[idx].reportedAt = nowColombiaISO();
          else delete allCortes[idx].reportedAt;
        }
        allCortes[idx].updatedAt = nowColombiaISO();

        await dispatchWrite(
          () => writeCortes(allCortes),
          {
            action: 'update',
            entity: 'corte',
            entityId: corteId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Editó corte "${allCortes[idx].name}"`,
            before: auditSnapshot(before),
            after: auditSnapshot(allCortes[idx]),
            ...extractRequestMeta(request),
          }
        );

        return allCortes[idx];
      });

      return NextResponse.json({ corte: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 });
      }
      if (msg.startsWith('WEIGHT_EXCEEDED:')) {
        const current = msg.split(':')[1];
        return NextResponse.json(
          { error: `La suma de pesos excedería 100%. Peso actual de los demás: ${current}%` },
          { status: 400 }
        );
      }
      console.error('Error actualizando corte:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * DELETE /api/courses/[id]/cortes/[corteId]
 * Elimina un corte. No permite si hay actividades vinculadas.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; corteId: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId, corteId } = await params;

      /*
       * Nada de borrar un corte con cosas colgando.
       *
       * Antes solo se miraban las actividades. Los parciales y las notas
       * manuales también llevan corteId, así que se podía borrar un corte y
       * dejarlos huérfanos: seguían pesando en la definitiva pero ya no
       * pertenecían a ningún corte, y la nota del curso pasaba en silencio al
       * cálculo plano sin que nadie lo notara.
       *
       * Se enumera lo que estorba, no solo cuánto: si te lo van a impedir, al
       * menos que te digan qué mover.
       */
      const [activities, quizzes, manualItems] = await Promise.all([
        readActivitiesFresh(),
        readQuizzesFresh(),
        readManualGradeItemsFresh(),
      ]);

      const bloqueantes = [
        ...activities.filter((a) => a.corteId === corteId).map((a) => `Actividad: ${a.title}`),
        ...quizzes.filter((q) => q.corteId === corteId).map((q) => `Parcial: ${q.title}`),
        ...manualItems.filter((i) => i.corteId === corteId).map((i) => `Nota manual: ${i.title}`),
      ];

      if (bloqueantes.length > 0) {
        return NextResponse.json({
          error: bloqueantes.length === 1
            ? 'No se puede eliminar: hay 1 ítem asignado a este corte'
            : `No se puede eliminar: hay ${bloqueantes.length} ítems asignados a este corte`,
          blockers: bloqueantes,
          hint: 'Reasígnalos a otro corte —o quítales el corte— y vuelve a intentarlo.',
        }, { status: 409 });
      }

      await withFileLock('cortes.json', async () => {
        const allCortes = await readCortesFresh();
        const idx = allCortes.findIndex((c) => c.id === corteId && c.courseId === courseId);
        if (idx === -1) throw new Error('NOT_FOUND');

        const removed = allCortes.splice(idx, 1)[0];

        await dispatchWrite(
          () => writeCortes(allCortes),
          {
            action: 'delete',
            entity: 'corte',
            entityId: corteId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Eliminó corte "${removed.name}" (${removed.weight}%)`,
            before: auditSnapshot(removed),
            ...extractRequestMeta(request),
          }
        );
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 });
      }
      console.error('Error eliminando corte:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

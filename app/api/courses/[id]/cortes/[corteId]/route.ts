/**
 * PUT    /api/courses/[id]/cortes/[corteId] — Editar corte
 * DELETE /api/courses/[id]/cortes/[corteId] — Eliminar corte
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateCorteSchema } from '@/lib/schemas';
import { readCortesFresh, writeCortes, readActivitiesFresh, withFileLock, nowColombiaISO } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';

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

        if (updates.name !== undefined) allCortes[idx].name = updates.name;
        if (updates.weight !== undefined) allCortes[idx].weight = updates.weight;
        if (updates.order !== undefined) allCortes[idx].order = updates.order;
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

      // Check for linked activities
      const activities = await readActivitiesFresh();
      const linked = activities.filter((a) => a.corteId === corteId);
      if (linked.length > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar: hay ${linked.length} actividad(es) vinculada(s) a este corte` },
          { status: 409 }
        );
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

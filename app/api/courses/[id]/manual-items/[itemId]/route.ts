/**
 * GET    /api/courses/[id]/manual-items/[itemId] — Detalle item manual
 * PUT    /api/courses/[id]/manual-items/[itemId] — Editar item manual
 * DELETE /api/courses/[id]/manual-items/[itemId] — Eliminar item manual
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateManualGradeItemSchema } from '@/lib/schemas';
import {
  getCourseById,
  readManualGradeItemsFresh,
  writeManualGradeItems,
  readManualGradesFresh,
  writeManualGrades,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';

type RouteParams = { params: Promise<{ id: string; itemId: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId, itemId } = await params;

    const course = await getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const items = await readManualGradeItemsFresh();
    const item = items.find((i) => i.id === itemId && i.courseId === courseId);
    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ item });
  }, 'admin');
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId, itemId } = await params;

      const course = await getCourseById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const body = await request.json();
      const parsed = updateManualGradeItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const updates = parsed.data;

      return withFileLock('manual-grade-items.json', async () => {
        const items = await readManualGradeItemsFresh();
        const index = items.findIndex((i) => i.id === itemId && i.courseId === courseId);
        if (index === -1) {
          return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
        }

        const before = { ...items[index] };

        if (updates.title !== undefined) items[index].title = updates.title;
        if (updates.description !== undefined) items[index].description = updates.description;
        if (updates.maxScore !== undefined) items[index].maxScore = updates.maxScore;
        if (updates.weight !== undefined) items[index].weight = updates.weight;
        if (updates.corteId !== undefined) items[index].corteId = updates.corteId ?? undefined;
        items[index].updatedAt = nowColombiaISO();

        await dispatchWrite(
          () => writeManualGradeItems(items),
          {
            action: 'update',
            entity: 'manualGradeItem',
            entityId: itemId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Editó item manual "${items[index].title}"`,
            before: auditSnapshot(before),
            after: auditSnapshot(items[index]),
            ...extractRequestMeta(request),
          }
        );

        return NextResponse.json({ item: items[index] });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId, itemId } = await params;

      return withFileLock('manual-grade-items.json', async () => {
        const items = await readManualGradeItemsFresh();
        const index = items.findIndex((i) => i.id === itemId && i.courseId === courseId);
        if (index === -1) {
          return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
        }

        const deleted = items[index];
        items.splice(index, 1);

        // Also delete associated grades
        const grades = await readManualGradesFresh();
        const remaining = grades.filter((g) => g.itemId !== itemId);

        await dispatchWrite(
          async () => {
            await writeManualGradeItems(items);
            await writeManualGrades(remaining);
          },
          {
            action: 'delete',
            entity: 'manualGradeItem',
            entityId: itemId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Eliminó item manual "${deleted.title}"`,
            before: auditSnapshot(deleted),
            ...extractRequestMeta(request),
          }
        );

        return NextResponse.json({ ok: true });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

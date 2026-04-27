/**
 * GET  /api/courses/[id]/manual-items — Listar items manuales del curso
 * POST /api/courses/[id]/manual-items — Crear item manual
 *
 * Items de calificación manual — actividades externas a la plataforma
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createManualGradeItemSchema } from '@/lib/schemas';
import {
  getCourseById,
  readManualGradeItemsFresh,
  writeManualGradeItems,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { ManualGradeItem } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId } = await params;

    const course = await getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const allItems = await readManualGradeItemsFresh();
    const items = allItems.filter((i) => i.courseId === courseId);

    return NextResponse.json({ items, total: items.length });
  }, 'admin');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;

      const course = await getCourseById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const body = await request.json();
      const parsed = createManualGradeItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const now = nowColombiaISO();

      const item: ManualGradeItem = await withFileLock('manual-grade-items.json', async () => {
        const items = await readManualGradeItemsFresh();

        const newItem: ManualGradeItem = {
          id: `mgi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          courseId,
          corteId: data.corteId,
          title: data.title,
          description: data.description,
          maxScore: data.maxScore,
          weight: data.weight,
          createdAt: now,
          updatedAt: now,
        };

        items.push(newItem);

        await dispatchWrite(
          () => writeManualGradeItems(items),
          {
            action: 'create',
            entity: 'manualGradeItem',
            entityId: newItem.id,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Creó item manual "${newItem.title}"`,
            after: auditSnapshot(newItem),
            ...extractRequestMeta(request),
          }
        );

        return newItem;
      });

      return NextResponse.json({ item }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

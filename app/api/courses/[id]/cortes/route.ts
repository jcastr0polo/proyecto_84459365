/**
 * GET  /api/courses/[id]/cortes — Listar cortes de un curso
 * POST /api/courses/[id]/cortes — Crear corte para un curso
 *
 * Cortes Académicos — Períodos de evaluación ponderados
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createCorteSchema } from '@/lib/schemas';
import { readCortesFresh, writeCortes, readCoursesFresh, withFileLock, nowColombiaISO } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import type { Corte } from '@/lib/types';

/**
 * GET /api/courses/[id]/cortes
 * Retorna cortes del curso ordenados por `order`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId } = await params;

    const cortes = await readCortesFresh();
    const courseCortes = cortes
      .filter((c) => c.courseId === courseId)
      .sort((a, b) => a.order - b.order);

    const totalWeight = courseCortes.reduce((sum, c) => sum + c.weight, 0);

    return NextResponse.json({ cortes: courseCortes, totalWeight });
  }, 'admin');
}

/**
 * POST /api/courses/[id]/cortes
 * Crea un nuevo corte. Valida que la suma de pesos no exceda 100%.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;
      const body = await request.json();
      const parsed = createCorteSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { name, weight, order } = parsed.data;

      // Verificar que el curso existe
      const courses = await readCoursesFresh();
      const course = courses.find((c) => c.id === courseId);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const now = nowColombiaISO();

      const newCorte: Corte = await withFileLock('cortes.json', async () => {
        const allCortes = await readCortesFresh();
        const courseCortes = allCortes.filter((c) => c.courseId === courseId);

        // Validar que la suma de pesos no exceda 100
        const currentTotal = courseCortes.reduce((sum, c) => sum + c.weight, 0);
        if (currentTotal + weight > 100) {
          throw new Error(`WEIGHT_EXCEEDED:${currentTotal}`);
        }

        const corte: Corte = {
          id: `corte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          courseId,
          name,
          weight,
          order: order ?? courseCortes.length + 1,
          createdAt: now,
          updatedAt: now,
        };

        allCortes.push(corte);

        await dispatchWrite(
          () => writeCortes(allCortes),
          {
            action: 'create',
            entity: 'corte',
            entityId: corte.id,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Creó corte "${name}" (${weight}%) en curso ${course.name}`,
          }
        );

        return corte;
      });

      return NextResponse.json({ corte: newCorte }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.startsWith('WEIGHT_EXCEEDED:')) {
        const current = msg.split(':')[1];
        return NextResponse.json(
          { error: `La suma de pesos excedería 100%. Peso actual: ${current}%` },
          { status: 400 }
        );
      }
      console.error('Error creando corte:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

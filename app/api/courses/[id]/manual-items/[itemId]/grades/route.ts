/**
 * GET  /api/courses/[id]/manual-items/[itemId]/grades — Listar notas del item
 * POST /api/courses/[id]/manual-items/[itemId]/grades — Asignar/actualizar notas (bulk)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { bulkSetManualGradesSchema } from '@/lib/schemas';
import {
  getCourseById,
  readManualGradeItemsFresh,
  readManualGradesFresh,
  writeManualGrades,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta } from '@/lib/auditService';
import type { ManualGrade } from '@/lib/types';

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

    const allGrades = await readManualGradesFresh();
    const grades = allGrades.filter((g) => g.itemId === itemId);

    return NextResponse.json({ grades, total: grades.length });
  }, 'admin');
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
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

      const body = await request.json();
      const parsed = bulkSetManualGradesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Validate scores don't exceed maxScore
      for (const g of parsed.data.grades) {
        if (g.score > item.maxScore) {
          return NextResponse.json(
            { error: `Nota ${g.score} excede el máximo ${item.maxScore}` },
            { status: 400 }
          );
        }
      }

      const now = nowColombiaISO();

      const saved = await withFileLock('manual-grades.json', async () => {
        const allGrades = await readManualGradesFresh();
        const results: ManualGrade[] = [];

        for (const entry of parsed.data.grades) {
          const existingIdx = allGrades.findIndex(
            (g) => g.itemId === itemId && g.studentId === entry.studentId
          );

          if (existingIdx !== -1) {
            // Update existing
            allGrades[existingIdx].score = entry.score;
            allGrades[existingIdx].maxScore = item.maxScore;
            if (entry.feedback !== undefined) allGrades[existingIdx].feedback = entry.feedback;
            allGrades[existingIdx].gradedBy = user.id;
            allGrades[existingIdx].gradedAt = now;
            allGrades[existingIdx].updatedAt = now;
            results.push(allGrades[existingIdx]);
          } else {
            // Create new
            const grade: ManualGrade = {
              id: `mg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              itemId,
              studentId: entry.studentId,
              courseId,
              score: entry.score,
              maxScore: item.maxScore,
              feedback: entry.feedback,
              gradedBy: user.id,
              gradedAt: now,
              updatedAt: now,
            };
            allGrades.push(grade);
            results.push(grade);
          }
        }

        await dispatchWrite(
          () => writeManualGrades(allGrades),
          {
            action: 'bulk_grade',
            entity: 'manualGrade',
            entityId: itemId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Calificó ${parsed.data.grades.length} estudiantes en "${item.title}"`,
            ...extractRequestMeta(request),
          }
        );

        return results;
      });

      return NextResponse.json({ grades: saved, total: saved.length }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

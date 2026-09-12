/**
 * GET    /api/courses/[id]/grades/adjustments — Ajustes del docente del curso
 * PUT    /api/courses/[id]/grades/adjustments — Fijar el ajuste de un estudiante
 * DELETE /api/courses/[id]/grades/adjustments — Quitar el ajuste
 *
 * Un ajuste es una nota que el docente fija a mano sobre un resultado ya
 * calculado —la de un corte o la definitiva— por comportamiento, participación
 * o cualquier criterio que no sea un ítem del sílabo. No promedia con lo demás
 * ni le quita peso a nada: manda sobre el número calculado.
 *
 * Se guarda como nota manual con peso 0 sobre un ítem sintético. Ver
 * `adjustItemId` en lib/gradeService.ts para el porqué.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById,
  readCortesFresh,
  readEnrollmentsFresh,
  readManualGradeItemsFresh,
  writeManualGradeItems,
  readManualGradesFresh,
  writeManualGrades,
  withFileLock,
  nowColombiaISO,
} from '@/lib/dataService';
import { adjustItemId, isAdjustItemId, parseAdjustItemId } from '@/lib/gradeService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { ManualGradeItem, ManualGrade } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const SCALE_MAX = 5;
/** Un ajuste sin motivo es indefendible ante un reclamo. */
const MIN_REASON = 3;

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId } = await params;

    const grades = await readManualGradesFresh();
    const adjustments = grades
      .filter((g) => g.courseId === courseId && isAdjustItemId(g.itemId))
      .map((g) => ({
        studentId: g.studentId,
        corteId: parseAdjustItemId(g.itemId)?.corteId ?? null,
        score: g.score,
        reason: g.feedback ?? '',
        isPublished: g.isPublished !== false,
        gradedAt: g.gradedAt,
      }));

    return NextResponse.json({ adjustments, total: adjustments.length });
  }, 'admin');
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;
      const body = await request.json().catch(() => ({}));

      const studentId: unknown = body?.studentId;
      const corteId: unknown = body?.corteId ?? null;
      const score: unknown = body?.score;
      const reason: unknown = body?.reason;
      const publish: boolean = body?.publish === true;

      if (typeof studentId !== 'string' || !studentId) {
        return NextResponse.json({ error: 'Falta el estudiante' }, { status: 400 });
      }
      if (typeof score !== 'number' || Number.isNaN(score)) {
        return NextResponse.json({ error: 'La nota debe ser un número' }, { status: 400 });
      }
      if (score < 0 || score > SCALE_MAX) {
        return NextResponse.json({ error: `La nota debe estar entre 0.0 y ${SCALE_MAX.toFixed(1)}` }, { status: 400 });
      }
      if (typeof reason !== 'string' || reason.trim().length < MIN_REASON) {
        return NextResponse.json(
          { error: 'Escribe el motivo del ajuste: sin él no hay cómo sustentarlo ante un reclamo' },
          { status: 400 },
        );
      }
      if (corteId !== null && typeof corteId !== 'string') {
        return NextResponse.json({ error: 'Corte inválido' }, { status: 400 });
      }

      const course = await getCourseById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const enrollments = await readEnrollmentsFresh();
      const enrolled = enrollments.some(
        (e) => e.courseId === courseId && e.studentId === studentId && e.status === 'active',
      );
      if (!enrolled) {
        return NextResponse.json({ error: 'El estudiante no tiene inscripción activa' }, { status: 400 });
      }

      if (corteId) {
        const cortes = await readCortesFresh();
        if (!cortes.some((c) => c.id === corteId && c.courseId === courseId)) {
          return NextResponse.json({ error: 'El corte no pertenece a este curso' }, { status: 400 });
        }
      }

      const itemId = adjustItemId(courseId, corteId ?? undefined);
      const rounded = Math.round(score * 10) / 10;
      const now = nowColombiaISO();

      // El ítem contenedor se crea la primera vez y se reutiliza siempre.
      await withFileLock('manual-grade-items.json', async () => {
        const items = await readManualGradeItemsFresh();
        if (items.some((i) => i.id === itemId)) return;
        const item: ManualGradeItem = {
          id: itemId,
          courseId,
          ...(corteId ? { corteId } : {}),
          title: corteId ? 'Ajuste del docente (corte)' : 'Ajuste del docente (definitiva)',
          description: 'Nota fijada a mano sobre el resultado calculado. No promedia con los demás ítems.',
          maxScore: SCALE_MAX,
          weight: 0,
          createdAt: now,
          updatedAt: now,
        };
        await writeManualGradeItems([...items, item]);
      });

      return withFileLock('manual-grades.json', async () => {
        const all = await readManualGradesFresh();
        const idx = all.findIndex((g) => g.itemId === itemId && g.studentId === studentId);
        const before = idx !== -1 ? { score: all[idx].score, reason: all[idx].feedback } : null;

        if (idx !== -1) {
          all[idx] = {
            ...all[idx],
            score: rounded,
            maxScore: SCALE_MAX,
            feedback: reason.trim(),
            isPublished: publish,
            gradedBy: user.id,
            gradedAt: now,
            updatedAt: now,
          };
        } else {
          const grade: ManualGrade = {
            id: `mg-${itemId}:${studentId}`,
            itemId,
            studentId,
            courseId,
            score: rounded,
            maxScore: SCALE_MAX,
            feedback: reason.trim(),
            // Un ajuste nace sin publicar salvo que el docente lo marque:
            // igual que cualquier nota manual, él decide cuándo se ve.
            isPublished: publish,
            gradedBy: user.id,
            gradedAt: now,
            updatedAt: now,
          };
          all.push(grade);
        }

        await dispatchWrite(
          () => writeManualGrades(all),
          {
            action: idx !== -1 ? 'update' : 'create',
            entity: 'grade',
            entityId: itemId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Ajustó a ${rounded.toFixed(1)} la nota ${corteId ? 'del corte' : 'definitiva'} de un estudiante en "${course.name}" (${publish ? 'visible' : 'sin publicar'}) — motivo: ${reason.trim()}`,
            ...(before ? { before: auditSnapshot(before) } : {}),
            after: auditSnapshot({ studentId, corteId, score: rounded, reason: reason.trim() }),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({
          score: rounded,
          corteId: corteId ?? null,
          isPublished: publish,
          message: publish
            ? `Nota ajustada a ${rounded.toFixed(1)}. El estudiante ya la ve.`
            : `Nota ajustada a ${rounded.toFixed(1)}. Sin publicar todavía.`,
        });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;
      const body = await request.json().catch(() => ({}));
      const studentId: unknown = body?.studentId;
      const corteId: unknown = body?.corteId ?? null;

      if (typeof studentId !== 'string' || !studentId) {
        return NextResponse.json({ error: 'Falta el estudiante' }, { status: 400 });
      }

      const itemId = adjustItemId(courseId, typeof corteId === 'string' ? corteId : undefined);

      return withFileLock('manual-grades.json', async () => {
        const all = await readManualGradesFresh();
        const idx = all.findIndex((g) => g.itemId === itemId && g.studentId === studentId);
        if (idx === -1) {
          return NextResponse.json({ error: 'No hay ajuste que quitar' }, { status: 404 });
        }

        const before = { score: all[idx].score, reason: all[idx].feedback };
        const kept = all.filter((_, i) => i !== idx);

        await dispatchWrite(
          () => writeManualGrades(kept),
          {
            action: 'delete',
            entity: 'grade',
            entityId: itemId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Quitó el ajuste ${corteId ? 'de corte' : 'de definitiva'} de un estudiante`,
            before: auditSnapshot(before),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({ message: 'Ajuste quitado. Vuelve a la nota calculada.' });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * GET /api/activities/[id] — Detalle de actividad
 * PUT /api/activities/[id] — Editar actividad
 *
 * Fase 11 — Actividades y Material Backend
 * RN-ACT-02: Estados draft → published → closed
 * RN-ACT-07: Advertir si ya hay entregas al editar
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updateActivitySchema } from '@/lib/schemas';
import {
  readActivitiesFresh,
  writeActivities,
  getCourseById,
  isStudentEnrolled,
  withFileLock,
} from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import type { Activity } from '@/lib/types';

/**
 * GET /api/activities/[id]
 * - Admin: ve cualquier actividad
 * - Estudiante inscrito: solo si published con publishDate <= now
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    // Read fresh from Blob — no stale cache
    const allActivities = await readActivitiesFresh();
    const activity = allActivities.find((a) => a.id === id) ?? null;
    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    // Si es estudiante, verificar permisos
    if (user.role === 'student') {
      // Verificar inscripción activa en el curso
      if (!(await isStudentEnrolled(user.id, activity.courseId))) {
        return NextResponse.json(
          { error: 'No estás inscrito en este curso' },
          { status: 403 }
        );
      }

      // Solo puede ver actividades published con publishDate pasada
      const now = new Date();
      if (activity.status !== 'published' || new Date(activity.publishDate) > now) {
        return NextResponse.json(
          { error: 'Actividad no disponible' },
          { status: 404 }
        );
      }
    }

    // Obtener info del curso para contexto
    const course = await getCourseById(activity.courseId);

    return NextResponse.json({
      activity,
      course: course ? { id: course.id, code: course.code, name: course.name } : null,
    });
  });
}

/**
 * PUT /api/activities/[id]
 * Editar actividad (admin only).
 * Advertencia si ya hay entregas (submissions).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;

      const body = await request.json();
      const parsed = updateActivitySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const data = parsed.data;

      return withFileLock('activities.json', async () => {
        const activities = await readActivitiesFresh();
        const index = activities.findIndex((a) => a.id === id);
        if (index === -1) {
          return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
        }

        const existing = activities[index];

        // Validar transición de estados válida: draft → published → closed
        if (data.status) {
          const validTransitions: Record<string, string[]> = {
            draft: ['published'],
            published: ['closed'],
            closed: [],
          };
          if (!validTransitions[existing.status]?.includes(data.status)) {
            return NextResponse.json(
              {
                error: `No se puede cambiar de "${existing.status}" a "${data.status}". Transiciones válidas desde "${existing.status}": ${validTransitions[existing.status]?.join(', ') || 'ninguna'}`,
              },
              { status: 400 }
            );
          }
        }

        // Si se cambian ambos dueDate y publishDate, validar orden
        const finalDueDate = data.dueDate || existing.dueDate;
        const finalPublishDate = data.publishDate || existing.publishDate;
        if (new Date(finalDueDate) <= new Date(finalPublishDate)) {
          return NextResponse.json(
            { error: 'La fecha límite debe ser posterior a la fecha de publicación' },
            { status: 400 }
          );
        }

        // Comprobar si hay entregas (submissions) asociadas para advertir
        let hasSubmissions = false;
        try {
          const { readSubmissionsFresh } = await import('@/lib/dataService');
          const submissions = await readSubmissionsFresh();
          hasSubmissions = submissions.some((s) => s.activityId === id);
        } catch {
          // Submissions may not be loaded yet — that's fine
        }

        // Aplicar cambios
        const { corteId: rawCorteId, ...restData } = data;
        const updatedActivity: Activity = {
          ...existing,
          ...restData,
          // Convert null to undefined for corteId
          ...(rawCorteId !== undefined ? { corteId: rawCorteId ?? undefined } : {}),
          updatedAt: new Date().toISOString(),
        };

        activities[index] = updatedActivity;
        await dispatchWrite(
          () => writeActivities(activities),
          { action: 'update', entity: 'activity', entityId: id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Editó actividad "${updatedActivity.title}"` }
        );

        return NextResponse.json({
          activity: updatedActivity,
          message: 'Actividad actualizada exitosamente',
          warnings: hasSubmissions
            ? ['Esta actividad ya tiene entregas. Los cambios podrían afectar evaluaciones existentes.']
            : [],
        });
      });
    } catch {
      return NextResponse.json(
        { error: 'Error interno al actualizar la actividad' },
        { status: 500 }
      );
    }
  }, 'admin');
}

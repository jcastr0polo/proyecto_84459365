/**
 * POST /api/activities/[id]/publish — Publicar actividad
 *
 * Fase 11 — Actividades y Material Backend
 * RN-ACT-02: draft → published
 * Validar que tiene al menos título y dueDate antes de publicar.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readActivities, writeActivities } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    const activities = readActivities();
    const index = activities.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    const activity = activities[index];

    // Solo se puede publicar desde draft
    if (activity.status !== 'draft') {
      return NextResponse.json(
        {
          error: `Solo actividades en estado "draft" pueden publicarse. Estado actual: "${activity.status}"`,
        },
        { status: 400 }
      );
    }

    // Validar requisitos mínimos para publicar
    const errors: string[] = [];
    if (!activity.title || activity.title.trim().length === 0) {
      errors.push('La actividad debe tener un título');
    }
    if (!activity.dueDate) {
      errors.push('La actividad debe tener una fecha límite (dueDate)');
    }
    if (!activity.publishDate) {
      errors.push('La actividad debe tener una fecha de publicación (publishDate)');
    }
    if (activity.maxScore <= 0) {
      errors.push('La nota máxima debe ser mayor que 0');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'No se puede publicar la actividad', details: errors },
        { status: 400 }
      );
    }

    // Publicar
    activities[index] = {
      ...activity,
      status: 'published',
      updatedAt: new Date().toISOString(),
    };

    await dispatchWrite(
      () => writeActivities(activities),
      { action: 'update', entity: 'activity', entityId: id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Publicó actividad "${activity.title}"` }
    );

    return NextResponse.json({
      activity: activities[index],
      message: 'Actividad publicada exitosamente',
    });
  }, 'admin');
}

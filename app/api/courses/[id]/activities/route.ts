/**
 * GET  /api/courses/[id]/activities — Listar actividades del curso
 * POST /api/courses/[id]/activities — Crear actividad
 *
 * Fase 11 — Actividades y Material Backend
 * RN-ACT-01: Toda actividad pertenece a exactamente un curso
 * RN-ACT-02: Estados draft → published → closed
 * RN-ACT-03: Actividad published con publishDate futuro no se muestra al estudiante
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { createActivitySchema } from '@/lib/schemas';
import {
  getCourseById,
  readActivitiesFresh,
  writeActivities,
  isStudentEnrolled,
  getProjectByStudentAndCourse,
  withFileLock,
} from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import type { Activity } from '@/lib/types';

/**
 * GET /api/courses/[id]/activities
 * - Admin: ve todas (draft + published + closed)
 * - Estudiante inscrito: solo published con publishDate <= now
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Read fresh from Blob — no stale cache
    const allActivities = await readActivitiesFresh();
    let activities = allActivities.filter((a) => a.courseId === id);

    // Estudiantes solo ven actividades published con publishDate <= now
    if (user.role === 'student') {
      // Verificar inscripción activa
      if (!(await isStudentEnrolled(user.id, id))) {
        return NextResponse.json(
          { error: 'No estás inscrito en este curso' },
          { status: 403 }
        );
      }

      const now = new Date();
      activities = activities.filter(
        (a) => a.status === 'published' && new Date(a.publishDate) <= now
      );

      // Filtrar actividades que requieren proyecto si el estudiante no tiene uno
      const hasProject = !!(await getProjectByStudentAndCourse(user.id, id));
      if (!hasProject) {
        activities = activities.filter((a) => !a.projectRequired);
      }
    }

    return NextResponse.json({
      activities,
      total: activities.length,
    });
  });
}

/**
 * POST /api/courses/[id]/activities
 * Crear actividad (admin only). Estado inicial: "draft".
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;

      // Verificar que el curso existe
      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      // Parsear y validar body
      const body = await request.json();
      const parsed = createActivitySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const now = new Date().toISOString();

      // Crear actividad con estado draft
      const activity: Activity = {
        id: uuidv4(),
        courseId: id,
        corteId: data.corteId,
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        attachments: [],
        dueDate: data.dueDate,
        publishDate: data.publishDate,
        maxScore: data.maxScore,
        weight: data.weight,
        allowLateSubmission: data.allowLateSubmission,
        latePenaltyPercent: data.latePenaltyPercent,
        status: 'draft',
        requiresFileUpload: data.requiresFileUpload,
        requiresLinkSubmission: data.requiresLinkSubmission,
        projectRequired: data.projectRequired,
        createdAt: now,
        updatedAt: now,
      };

      await withFileLock('activities.json', async () => {
        const activities = await readActivitiesFresh();
        activities.push(activity);
        await dispatchWrite(
          () => writeActivities(activities),
          { action: 'create', entity: 'activity', entityId: activity.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Creó actividad "${activity.title}" en curso ${id}` }
        );
      });

      return NextResponse.json(
        { activity, message: 'Actividad creada exitosamente' },
        { status: 201 }
      );
    } catch {
      return NextResponse.json(
        { error: 'Error interno al crear la actividad' },
        { status: 500 }
      );
    }
  }, 'admin');
}

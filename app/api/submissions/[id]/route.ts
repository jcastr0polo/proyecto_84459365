/**
 * GET /api/submissions/[id] — Detalle de entrega
 * PUT /api/submissions/[id] — Devolver entrega (admin)
 *
 * Fase 13 — Entregas de Estudiantes Backend
 * RF-ENT-05: Admin descarga archivos
 * RF-ENT-06: Admin devuelve entrega habilitando re-envío
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSubmissionsFresh,
  readActivitiesFresh,
  getUserById,
} from '@/lib/dataService';
import { returnSubmission, SubmissionError } from '@/lib/submissionService';
import { logAudit } from '@/lib/auditService';
import type { SubmissionWithDetails } from '@/lib/types';

/**
 * GET /api/submissions/[id]
 * Admin → detalle completo con student y activity
 * Estudiante → solo si es su propia entrega
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    // Read fresh from Blob — no stale cache
    const allSubmissions = await readSubmissionsFresh();
    const submission = allSubmissions.find((s) => s.id === id) ?? null;
    if (!submission) {
      return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
    }

    // Students can only see their own submissions
    if (user.role === 'student' && submission.studentId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Enrich with student and activity data
    const student = getUserById(submission.studentId);
    const allActivities = await readActivitiesFresh();
    const activity = allActivities.find((a) => a.id === submission.activityId) ?? null;

    const detailed: SubmissionWithDetails = {
      ...submission,
      student: {
        id: student?.id ?? submission.studentId,
        firstName: student?.firstName ?? 'Desconocido',
        lastName: student?.lastName ?? '',
        email: student?.email ?? '',
      },
      activity: {
        id: activity?.id ?? submission.activityId,
        title: activity?.title ?? 'Actividad desconocida',
        type: activity?.type ?? 'other',
        dueDate: activity?.dueDate ?? '',
      },
    };

    return NextResponse.json({ submission: detailed });
  });
}

/**
 * PUT /api/submissions/[id]
 * Admin → devolver entrega (status → "returned")
 * Body: { action: "return" }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;

      const body = await request.json();
      const action = body.action;

      if (action !== 'return') {
        return NextResponse.json(
          { error: 'Acción no válida. Acciones permitidas: "return"' },
          { status: 400 }
        );
      }

      const submission = await returnSubmission(id);

      await logAudit({
        action: 'update', entity: 'submission', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Devolvió entrega para re-envío`,
      });

      return NextResponse.json({
        submission,
        message: 'Entrega devuelta. El estudiante puede re-enviar.',
      });
    } catch (error) {
      if (error instanceof SubmissionError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      console.error('Error devolviendo entrega:', error);
      return NextResponse.json(
        { error: 'Error interno al devolver la entrega' },
        { status: 500 }
      );
    }
  }, 'admin');
}

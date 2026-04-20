/**
 * GET  /api/activities/[id]/submissions — Listar entregas de la actividad  
 * POST /api/activities/[id]/submissions — Enviar entrega (estudiante)
 *
 * Fase 13 — Entregas de Estudiantes Backend
 * RN-ENT-01..06
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { createSubmissionSchema } from '@/lib/schemas';
import {
  getActivityById,
  getSubmissionsByActivity,
  getUserById,
} from '@/lib/dataService';
import { uploadFile, UploadError } from '@/lib/uploadService';
import { submitWork, SubmissionError } from '@/lib/submissionService';
import type { SubmissionAttachment, SubmissionLink, SubmissionWithDetails } from '@/lib/types';

/**
 * GET /api/activities/[id]/submissions
 * Admin → todas las entregas con datos del estudiante. Filtro ?status=
 * Estudiante → solo su propia entrega
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    const activity = getActivityById(id);
    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    const submissions = getSubmissionsByActivity(id);

    // Student: solo su propia entrega
    if (user.role === 'student') {
      const mine = submissions.filter((s) => s.studentId === user.id);
      return NextResponse.json({
        submissions: mine,
        total: mine.length,
      });
    }

    // Admin: todas con datos del estudiante
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let filtered = submissions;
    if (statusFilter && ['submitted', 'reviewed', 'returned', 'resubmitted'].includes(statusFilter)) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Enrich with student data
    const enriched: SubmissionWithDetails[] = filtered.map((s) => {
      const student = getUserById(s.studentId);
      return {
        ...s,
        student: {
          id: student?.id ?? s.studentId,
          firstName: student?.firstName ?? 'Desconocido',
          lastName: student?.lastName ?? '',
          email: student?.email ?? '',
        },
        activity: {
          id: activity.id,
          title: activity.title,
          type: activity.type,
          dueDate: activity.dueDate,
        },
      };
    });

    return NextResponse.json({
      submissions: enriched,
      total: enriched.length,
      activity: {
        id: activity.id,
        title: activity.title,
        type: activity.type,
        dueDate: activity.dueDate,
        status: activity.status,
      },
    });
  });
}

/**
 * POST /api/activities/[id]/submissions
 * Estudiante → enviar entrega. FormData con archivos + JSON con enlaces.
 *
 * FormData fields:
 * - files: File[] (archivos adjuntos)
 * - data: JSON string { content?, links?: SubmissionLink[] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: activityId } = await params;

      // Check activity exists
      const activity = getActivityById(activityId);
      if (!activity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      }

      // Parse FormData
      const formData = await request.formData();
      const dataField = formData.get('data');

      let content: string | undefined;
      let links: SubmissionLink[] = [];

      if (dataField && typeof dataField === 'string') {
        const parsed = createSubmissionSchema.safeParse(JSON.parse(dataField));
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.issues },
            { status: 400 }
          );
        }
        content = parsed.data.content ?? undefined;
        links = (parsed.data.links ?? []) as SubmissionLink[];
      }

      // Upload attached files
      const attachments: SubmissionAttachment[] = [];
      const files = formData.getAll('files');

      for (const file of files) {
        if (file instanceof File && file.size > 0) {
          try {
            const att = await uploadFile(
              file,
              `submissions/act-${activityId}/stu-${user.id}`
            );
            attachments.push({
              id: att.id,
              fileName: att.fileName,
              filePath: att.filePath,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              uploadedAt: att.uploadedAt,
            });
          } catch (err) {
            if (err instanceof UploadError) {
              return NextResponse.json(
                { error: `Error al subir archivo "${file.name}": ${err.message}` },
                { status: err.statusCode }
              );
            }
            throw err;
          }
        }
      }

      // Execute submission logic
      const submission = await submitWork(
        activityId,
        user.id,
        activity.courseId,
        content,
        attachments,
        links
      );

      return NextResponse.json(
        {
          submission,
          message: submission.version > 1
            ? `Re-entrega exitosa (versión ${submission.version})`
            : 'Entrega enviada exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof SubmissionError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      console.error('Error en entrega:', error);
      return NextResponse.json(
        { error: 'Error interno al procesar la entrega' },
        { status: 500 }
      );
    }
  }, 'student');
}

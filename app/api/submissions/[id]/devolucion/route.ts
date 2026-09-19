/**
 * POST   /api/submissions/[id]/devolucion — adjuntar documentos de vuelta
 * DELETE /api/submissions/[id]/devolucion — quitar uno
 *
 * El docente devuelve el trabajo enriquecido: el mismo plan con sus
 * anotaciones, una rúbrica llena, un documento de observaciones. Va en la
 * entrega y no en la nota porque devolver el trabajo corregido es parte de
 * revisarlo, y pasa antes —y a veces en vez— de poner un número.
 *
 * El estudiante lo ve en cuanto se sube. Devolver ES el acto de dárselo; una
 * publicación aparte sería ceremonia, y para un error está el botón de quitar.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSubmissionsFresh,
  readActivitiesFresh,
  patchSubmission,
  getUserById,
} from '@/lib/dataService';
import { uploadFile, deleteFile, UploadError } from '@/lib/uploadService';
import { logAudit, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { SubmissionAttachment } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

/** Tope por entrega: una devolución son uno o dos documentos, no un archivo. */
const MAX_POR_ENTREGA = 5;

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Solo el docente devuelve documentos' }, { status: 403 });
      }

      const { id } = await params;
      const submission = (await readSubmissionsFresh()).find((s) => s.id === id);
      if (!submission) {
        return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
      }

      const formData = await request.formData();
      const archivos = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
      if (archivos.length === 0) {
        return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
      }

      const previos = submission.feedbackAttachments ?? [];
      if (previos.length + archivos.length > MAX_POR_ENTREGA) {
        return NextResponse.json(
          { error: `Máximo ${MAX_POR_ENTREGA} documentos por entrega. Quita alguno antes de subir más.` },
          { status: 400 },
        );
      }

      /* Junto a la entrega que contesta, no en una carpeta aparte: así el
         archivo devuelto vive al lado del que lo motivó. */
      const destino = `submissions/act-${submission.activityId}/stu-${submission.studentId}/devolucion`;
      const nuevos: SubmissionAttachment[] = [];
      for (const archivo of archivos) {
        try {
          nuevos.push(await uploadFile(archivo, destino));
        } catch (err) {
          if (err instanceof UploadError) {
            return NextResponse.json(
              { error: `No se pudo subir "${archivo.name}": ${err.message}` },
              { status: err.statusCode },
            );
          }
          throw err;
        }
      }

      const feedbackAttachments = [...previos, ...nuevos];
      try {
        await patchSubmission(id, { feedbackAttachments });
      } catch (e) {
        /* El archivo ya está en el Blob pero la ficha no se pudo guardar —el
           caso típico es la migración sin aplicar—. Sin esto quedaría un
           archivo que nadie referencia y que nadie va a encontrar para borrar. */
        await Promise.all(nuevos.map((n) => deleteFile(n.filePath).catch(() => {})));
        throw e;
      }

      const alumno = await getUserById(submission.studentId);
      const actividad = (await readActivitiesFresh()).find((a) => a.id === submission.activityId);
      logAudit({
        action: 'update', entity: 'submission', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details:
          `Devolvió ${nuevos.length} documento(s) en "${actividad?.title ?? submission.activityId}" `
          + `a ${alumno ? `${alumno.lastName}, ${alumno.firstName}` : submission.studentId}: `
          + nuevos.map((n) => n.fileName).join('; '),
        after: auditSnapshot({ feedbackAttachments: feedbackAttachments.map((a) => a.fileName) }),
        ...extractRequestMeta(request),
      });

      return NextResponse.json({ feedbackAttachments, message: 'Documento devuelto al estudiante' }, { status: 201 });
    } catch (error) {
      console.error('[devolucion] POST', error);
      const msg = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Solo el docente quita documentos' }, { status: 403 });
      }

      const { id } = await params;
      const { attachmentId } = await request.json().catch(() => ({ attachmentId: undefined }));
      if (typeof attachmentId !== 'string' || !attachmentId) {
        return NextResponse.json({ error: 'Falta "attachmentId"' }, { status: 400 });
      }

      const submission = (await readSubmissionsFresh()).find((s) => s.id === id);
      if (!submission) {
        return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
      }

      const previos = submission.feedbackAttachments ?? [];
      const quitado = previos.find((a) => a.id === attachmentId);
      if (!quitado) {
        return NextResponse.json({ error: 'Ese documento no está en esta entrega' }, { status: 404 });
      }

      const feedbackAttachments = previos.filter((a) => a.id !== attachmentId);
      /* Primero la fila y después el archivo: si se cae el borrado del blob
         queda un huérfano, que es mucho mejor que una ficha apuntando a un
         archivo que ya no existe. */
      await patchSubmission(id, { feedbackAttachments });
      await deleteFile(quitado.filePath).catch((e) => {
        console.warn('[devolucion] la ficha se quitó pero el archivo sigue en el blob:', e);
      });

      logAudit({
        action: 'delete', entity: 'submission', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Quitó el documento devuelto "${quitado.fileName}"`,
        before: auditSnapshot({ fileName: quitado.fileName }),
        ...extractRequestMeta(request),
      });

      return NextResponse.json({ feedbackAttachments, message: 'Documento retirado' });
    } catch (error) {
      console.error('[devolucion] DELETE', error);
      const msg = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

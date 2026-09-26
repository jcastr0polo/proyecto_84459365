/**
 * POST /api/activities/[id]/lista/evidencia — subir el pantallazo y marcar
 *
 * Sube la imagen Y marca el punto en la misma petición. Son dos cosas, pero
 * en el wifi de un aula dos viajes son dos oportunidades de que se caiga a la
 * mitad y el estudiante se quede con el archivo subido y el punto sin marcar.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import {
  readActivitiesFresh, isStudentEnrolled, addTick, nowColombiaISO,
} from '@/lib/dataService';
import { uploadFile, UploadError } from '@/lib/uploadService';

type RouteParams = { params: Promise<{ id: string }> };

/** Solo imágenes que cualquier navegador pinta. SVG fuera: es un documento. */
const IMAGENES: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/heic': ['.heic'],   // los iPhone hacen esto por defecto
  'image/heif': ['.heif'],
};
const MAX = 8 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const activity = (await readActivitiesFresh()).find((a) => a.id === id);
      if (!activity) return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      if (activity.type !== 'checklist') {
        return NextResponse.json({ error: 'Esta actividad no es una lista' }, { status: 400 });
      }
      if (activity.status === 'closed') {
        return NextResponse.json({ error: 'El docente cerró esta lista' }, { status: 400 });
      }

      const formData = await request.formData();
      const itemId = String(formData.get('itemId') ?? '');
      const file = formData.get('file');

      const punto = (activity.checklist ?? []).find((i) => i.id === itemId);
      if (!punto) return NextResponse.json({ error: 'Ese punto ya no está en la lista' }, { status: 404 });

      const studentId = user.role === 'admin' && typeof formData.get('studentId') === 'string'
        ? String(formData.get('studentId')) : user.id;
      if (user.role === 'student' && !(await isStudentEnrolled(user.id, activity.courseId))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }

      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'No llegó ninguna imagen' }, { status: 400 });
      }
      if (file.size > MAX) {
        return NextResponse.json(
          { error: `La imagen pesa ${(file.size / 1048576).toFixed(1)}MB y el máximo son ${MAX / 1048576}MB.` },
          { status: 400 },
        );
      }
      const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
      if (!IMAGENES[file.type]?.includes(ext)) {
        return NextResponse.json(
          { error: 'Solo imágenes: PNG, JPG, WEBP o GIF. Manda un pantallazo.' },
          { status: 400 },
        );
      }

      let subida;
      try {
        subida = await uploadFile(file, `activities/${id}/evidencias/${studentId}`);
      } catch (err) {
        if (err instanceof UploadError) {
          return NextResponse.json({ error: err.message }, { status: err.statusCode });
        }
        throw err;
      }

      const doneAt = nowColombiaISO();
      await addTick({
        id: `tick-${uuidv4()}`,
        activityId: id, studentId, courseId: activity.courseId, itemId,
        doneAt,
        evidenceUrl: subida.filePath,
        evidenceName: file.name,
      });

      return NextResponse.json(
        { itemId, done: true, doneAt, evidenceUrl: subida.filePath, evidenceName: file.name },
        { status: 201 },
      );
    } catch (error) {
      console.error('[evidencia lista] POST', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
    }
  });
}

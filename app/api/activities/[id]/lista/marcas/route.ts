/**
 * POST /api/activities/[id]/lista/marcas — el estudiante marca o desmarca
 *
 * Se manda el estado al que quiere llegar (`done`), no "alternar": en clase el
 * mismo dedo toca dos veces y con un alternar acabaría desmarcando lo que
 * acababa de marcar.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { tickSchema } from '@/lib/schemas';
import {
  readActivitiesFresh, isStudentEnrolled, addTick, removeTick, nowColombiaISO,
} from '@/lib/dataService';

type RouteParams = { params: Promise<{ id: string }> };

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

      /* Un docente puede marcar en nombre de un estudiante desde el tablero
         —pasa en clase, alguien sin batería—, así que se acepta studentId
         explícito solo si quien pregunta es admin. */
      const body = await request.json();
      const parsed = tickSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
      }
      const studentId = user.role === 'admin' && typeof body.studentId === 'string'
        ? body.studentId : user.id;

      if (user.role === 'student') {
        if (!(await isStudentEnrolled(user.id, activity.courseId))) {
          return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
        }
      }

      const { itemId, done, evidenceUrl, evidenceName, note } = parsed.data;
      const punto = (activity.checklist ?? []).find((i) => i.id === itemId);
      if (!punto) return NextResponse.json({ error: 'Ese punto ya no está en la lista' }, { status: 404 });

      if (!done) {
        await removeTick(id, studentId, itemId);
        return NextResponse.json({ itemId, done: false });
      }

      if (punto.requiresEvidence && !evidenceUrl) {
        return NextResponse.json(
          { error: 'Este punto pide una evidencia: pega el enlace antes de marcarlo.' },
          { status: 400 },
        );
      }

      const doneAt = nowColombiaISO();
      await addTick({
        id: `tick-${uuidv4()}`,
        activityId: id, studentId, courseId: activity.courseId, itemId,
        doneAt,
        evidenceUrl: evidenceUrl || undefined,
        evidenceName: evidenceName || undefined,
        note: note || undefined,
      });

      /* Sin auditoría: son cientos de marcas por clase y llenarían el registro
         de ruido. Lo que importa queda en la propia tabla, con su hora. */
      return NextResponse.json({ itemId, done: true, doneAt });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

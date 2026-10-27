/**
 * GET /api/activities/[id]/companeros — a quién puede sumar a su grupo
 *
 * Solo en actividades grupales. Devuelve los inscritos activos del curso,
 * diciendo quién ya tiene entrega: a esos no se les puede añadir, porque
 * entregaron con otro grupo y añadirlos aquí pisaría su entrega.
 *
 * Se devuelven igualmente, marcados: ocultarlos sin explicación hace que
 * alguien busque a su compañero, no lo encuentre y crea que la lista está
 * incompleta.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readActivitiesFresh, readSubmissionsFresh, getEnrollmentsByCourse,
  readUsersFresh, isStudentEnrolled,
} from '@/lib/dataService';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const activity = (await readActivitiesFresh()).find((a) => a.id === id);
      if (!activity) return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      if (activity.category !== 'group') {
        return NextResponse.json({ error: 'Esta actividad no es grupal' }, { status: 400 });
      }
      if (user.role === 'student' && !(await isStudentEnrolled(user.id, activity.courseId))) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }

      const [inscripciones, usuarios, entregas] = await Promise.all([
        getEnrollmentsByCourse(activity.courseId), readUsersFresh(), readSubmissionsFresh(),
      ]);
      const yaEntregaron = new Set(
        entregas.filter((s) => s.activityId === id).map((s) => s.studentId));
      const porId = new Map(usuarios.map((u) => [u.id, u]));

      const companeros = inscripciones
        .filter((e) => e.status === 'active' && e.studentId !== user.id)
        .map((e) => {
          const u = porId.get(e.studentId);
          return {
            studentId: e.studentId,
            firstName: u?.firstName ?? '—',
            lastName: u?.lastName ?? '',
            yaEntrego: yaEntregaron.has(e.studentId),
          };
        })
        .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'es'));

      /* Con quién está YA agrupado quien pregunta. El selector arranca con
         ellos marcados: si arranca vacío, reenviar equivale a decir «ahora voy
         solo» y se le borra la entrega a los compañeros sin que nadie lo
         pida. Pasó: un estudiante reenvió y su compañera perdió la entrega. */
      const miEntrega = entregas.find((s) => s.activityId === id && s.studentId === user.id);
      const miGrupo = miEntrega?.groupId
        ? entregas
            .filter((s) => s.groupId === miEntrega.groupId && s.studentId !== user.id)
            .map((s) => s.studentId)
        : [];

      return NextResponse.json({ companeros, miGrupo });
    } catch (error) {
      console.error('[companeros]', error);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
  });
}

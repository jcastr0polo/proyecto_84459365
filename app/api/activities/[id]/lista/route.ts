/**
 * GET /api/activities/[id]/lista  — la lista y el avance
 * PUT /api/activities/[id]/lista  — el docente define los puntos
 *
 * El GET sirve a las dos pantallas —la del estudiante y el tablero del
 * docente— porque las dos preguntan lo mismo: los puntos y quién lleva qué.
 * Un estudiante solo recibe lo suyo; el docente, el curso entero.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { checklistSchema } from '@/lib/schemas';
import {
  readActivitiesFresh, patchActivity, readTicks,
  getEnrollmentsByCourse, readUsersFresh, isStudentEnrolled,
} from '@/lib/dataService';
import { logAudit, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { ChecklistItem } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const activity = (await readActivitiesFresh()).find((a) => a.id === id);
      if (!activity) return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      if (activity.type !== 'checklist') {
        return NextResponse.json({ error: 'Esta actividad no es una lista de tareas' }, { status: 400 });
      }

      const items = activity.checklist ?? [];

      if (user.role === 'student') {
        if (!(await isStudentEnrolled(user.id, activity.courseId))) {
          return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
        }
        const mias = (await readTicks(id)).filter((t) => t.studentId === user.id);
        return NextResponse.json({
          activity: { id: activity.id, title: activity.title, description: activity.description, status: activity.status },
          items,
          ticks: mias,
        });
      }

      /* Docente: la foto completa, ya ordenada. Se arma aquí y no en el
         navegador porque el tablero se repinta cada pocos segundos y no tiene
         sentido mandarle la nómina entera cada vez para que la cruce. */
      const [inscripciones, usuarios, marcas] = await Promise.all([
        getEnrollmentsByCourse(activity.courseId), readUsersFresh(), readTicks(id),
      ]);
      const activos = inscripciones.filter((e) => e.status === 'active');
      const porId = new Map(usuarios.map((u) => [u.id, u]));
      const porEstudiante = new Map<string, typeof marcas>();
      for (const m of marcas) {
        if (!porEstudiante.has(m.studentId)) porEstudiante.set(m.studentId, []);
        porEstudiante.get(m.studentId)!.push(m);
      }

      const estudiantes = activos.map((e) => {
        const u = porId.get(e.studentId);
        const suyas = porEstudiante.get(e.studentId) ?? [];
        /* Solo cuentan las marcas de puntos que siguen en la lista: si el
           docente borra un punto, el avance no puede pasar del 100%. */
        const vigentes = suyas.filter((t) => items.some((i) => i.id === t.itemId));
        const ultima = vigentes.reduce<string | null>(
          (max, t) => (max === null || t.doneAt > max ? t.doneAt : max), null);
        return {
          studentId: e.studentId,
          firstName: u?.firstName ?? '—',
          lastName: u?.lastName ?? '',
          done: vigentes.length,
          itemIds: vigentes.map((t) => t.itemId),
          evidences: vigentes.filter((t) => t.evidenceUrl).map((t) => ({
            itemId: t.itemId, url: t.evidenceUrl!, name: t.evidenceName ?? 'evidencia',
          })),
          lastAt: ultima,
        };
      });

      return NextResponse.json({
        activity: { id: activity.id, title: activity.title, description: activity.description, status: activity.status },
        items,
        total: items.length,
        students: estudiantes,
        /* Hora del servidor: los relojes de los portátiles del aula no
           coinciden, y el tablero calcula "hace 20 s" contra esto. */
        now: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Solo el docente define la lista' }, { status: 403 });
      }
      const { id } = await params;
      const activity = (await readActivitiesFresh()).find((a) => a.id === id);
      if (!activity) return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });

      const parsed = checklistSchema.safeParse(await request.json());
      if (!parsed.success) {
        /* El mensaje crudo de Zod («Too small: expected string to have >=1
           characters») no le dice nada a nadie. Se nombra el punto que falla. */
        const fallo = parsed.error.issues[0];
        const nPunto = typeof fallo?.path?.[1] === 'number' ? fallo.path[1] + 1 : null;
        return NextResponse.json(
          { error: nPunto ? `Punto ${nPunto}: ${fallo.message}` : (fallo?.message ?? 'Datos inválidos') },
          { status: 400 },
        );
      }

      /* Los puntos que ya existían conservan su id: si se regenerara, todas
         las marcas de la clase apuntarían a puntos que ya no existen y el
         avance de todo el mundo volvería a cero. */
      const items: ChecklistItem[] = parsed.data.items.map((i) => ({
        id: i.id || `pt-${uuidv4().slice(0, 8)}`,
        text: i.text,
        requiresEvidence: i.requiresEvidence,
      }));

      await patchActivity(id, { checklist: items });

      logAudit({
        action: 'update', entity: 'activity', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Definió ${items.length} punto(s) en la lista "${activity.title}"`,
        after: auditSnapshot({ items: items.map((i) => i.text) }),
        ...extractRequestMeta(request),
      });

      return NextResponse.json({ items, message: 'Lista guardada' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

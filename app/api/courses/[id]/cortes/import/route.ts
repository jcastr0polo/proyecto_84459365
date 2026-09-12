/**
 * GET  /api/courses/[id]/cortes/import — Qué hay en el calendario del semestre
 * POST /api/courses/[id]/cortes/import — Traerlo a este curso
 *
 * Al crear una asignatura hay que montarle los cortes desde cero, y en la
 * práctica son los mismos de todas las demás del semestre: mismas semanas,
 * mismos pesos, mismo tope para reportar notas. Teclearlos otra vez es trabajo
 * repetido y es donde se cuela la fecha distinta sin que nadie se entere.
 *
 * Importar no ata a nada: son cortes normales de este curso, y después se
 * particulariza lo que haga falta.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById, readSemestersFresh, readCortesFresh, writeCortes,
  withFileLock, nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { Corte, CorteTemplateItem } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * El calendario del semestre, con una red de seguridad.
 *
 * Si el semestre todavía no tiene plantilla guardada pero sus otros cursos ya
 * tienen cortes montados, se deduce de ahí: para el docente que ya configuró
 * una asignatura a mano, la segunda debería poder copiarse igual, sin obligarle
 * a ir antes a rellenar una plantilla.
 */
async function plantillaDe(semesterId: string, exceptCourseId: string) {
  const [semesters, allCortes] = await Promise.all([readSemestersFresh(), readCortesFresh()]);
  const semester = semesters.find((s) => s.id === semesterId);

  if (semester?.corteTemplate?.length) {
    return { source: 'semester' as const, items: semester.corteTemplate };
  }

  // De los otros cursos del semestre: se toma el que más cortes tenga.
  const { readCoursesFresh } = await import('@/lib/dataService');
  const courses = await readCoursesFresh();
  const hermanos = courses.filter((c) => c.semesterId === semesterId && c.id !== exceptCourseId);

  let mejor: Corte[] = [];
  for (const h of hermanos) {
    const suyos = allCortes.filter((k) => k.courseId === h.id);
    if (suyos.length > mejor.length) mejor = suyos;
  }
  if (mejor.length === 0) return { source: 'none' as const, items: [] as CorteTemplateItem[] };

  return {
    source: 'course' as const,
    items: mejor
      .sort((a, b) => a.order - b.order)
      .map((k) => ({
        order: k.order, name: k.name, weight: k.weight,
        ...(k.startDate ? { startDate: k.startDate } : {}),
        ...(k.endDate ? { endDate: k.endDate } : {}),
        ...(k.reportDeadline ? { reportDeadline: k.reportDeadline } : {}),
      })),
  };
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: courseId } = await params;

    const course = await getCourseById(courseId);
    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const [{ source, items }, allCortes] = await Promise.all([
      plantillaDe(course.semesterId, courseId),
      readCortesFresh(),
    ]);

    const propios = allCortes.filter((k) => k.courseId === courseId);
    const yaExisten = new Set(propios.map((k) => k.order));

    return NextResponse.json({
      source,
      items,
      /** Los que se crearían: los que este curso todavía no tiene. */
      wouldCreate: items.filter((i) => !yaExisten.has(i.order)).length,
      /** Los que ya existen aquí y no se tocan. */
      wouldSkip: items.filter((i) => yaExisten.has(i.order)).length,
      hasOwn: propios.length,
    });
  }, 'admin');
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: courseId } = await params;

      const course = await getCourseById(courseId);
      if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

      const { source, items } = await plantillaDe(course.semesterId, courseId);
      if (items.length === 0) {
        return NextResponse.json({
          error: 'El semestre no tiene un calendario de cortes todavía, y ninguna otra asignatura suya tiene cortes de los que copiar.',
        }, { status: 400 });
      }

      const now = nowColombiaISO();

      return withFileLock('cortes.json', async () => {
        const allCortes = await readCortesFresh();
        const yaExisten = new Set(
          allCortes.filter((k) => k.courseId === courseId).map((k) => k.order),
        );

        /*
         * Nunca se pisan los cortes que ya existen: si el docente ya montó el
         * corte 1 a su manera, importar no puede deshacérselo. Solo se crean
         * los que faltan.
         */
        const nuevos: Corte[] = items
          .filter((i) => !yaExisten.has(i.order))
          .map((i, n) => ({
            id: `corte-${Date.now()}-${n}-${Math.random().toString(36).slice(2, 8)}`,
            courseId,
            name: i.name,
            weight: i.weight,
            order: i.order,
            ...(i.startDate ? { startDate: i.startDate } : {}),
            ...(i.endDate ? { endDate: i.endDate } : {}),
            ...(i.reportDeadline ? { reportDeadline: i.reportDeadline } : {}),
            createdAt: now,
            updatedAt: now,
          }));

        if (nuevos.length === 0) {
          return NextResponse.json({
            created: 0,
            message: 'Este curso ya tiene todos los cortes del calendario. No se creó ninguno.',
          });
        }

        await dispatchWrite(
          () => writeCortes([...allCortes, ...nuevos]),
          {
            action: 'create',
            entity: 'corte',
            entityId: courseId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Importó ${nuevos.length} corte(s) del calendario del semestre a "${course.name}"`,
            after: auditSnapshot({ courseId, source, orders: nuevos.map((c) => c.order) }),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({
          created: nuevos.length,
          skipped: items.length - nuevos.length,
          message: `${nuevos.length} ${nuevos.length === 1 ? 'corte importado' : 'cortes importados'}`
            + (items.length - nuevos.length > 0
              ? `. ${items.length - nuevos.length} ya existían y no se tocaron.`
              : '.'),
        });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

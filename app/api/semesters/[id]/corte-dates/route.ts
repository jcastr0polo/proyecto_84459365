/**
 * GET /api/semesters/[id]/corte-dates — Qué fechas tienen los cortes del semestre
 * PUT /api/semesters/[id]/corte-dates — Aplicar un calendario a todos los cursos
 *
 * Los cortes suelen ser los mismos para todas las asignaturas de un semestre:
 * las mismas semanas y el mismo tope para reportar notas. Ponerlas una por una
 * en cada curso es trabajo repetido y, peor, es donde se cuela el error de
 * teclear una fecha distinta en un curso y no darse cuenta.
 *
 * El emparejamiento es POR ORDEN, no por nombre: el corte 1 de un curso con el
 * corte 1 del otro, aunque uno se llame "Corte 1" y el otro "Primer parcial".
 *
 * Solo se copian FECHAS. Los pesos no: cuánto vale cada corte es decisión
 * pedagógica de cada asignatura y no tiene por qué coincidir.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSemestersFresh, readCoursesFresh, readCortesFresh, writeCortes,
  withFileLock, nowColombiaISO,
} from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';

type RouteParams = { params: Promise<{ id: string }> };

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface FechasDeCorte {
  order: number;
  startDate?: string;
  endDate?: string;
  reportDeadline?: string;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id: semesterId } = await params;

    const [semesters, courses, cortes] = await Promise.all([
      readSemestersFresh(), readCoursesFresh(), readCortesFresh(),
    ]);

    const semester = semesters.find((s) => s.id === semesterId);
    if (!semester) return NextResponse.json({ error: 'Semestre no encontrado' }, { status: 404 });

    const semCourses = courses.filter((c) => c.semesterId === semesterId);

    const porCurso = semCourses.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      cortes: cortes
        .filter((k) => k.courseId === course.id)
        .sort((a, b) => a.order - b.order)
        .map((k) => ({
          id: k.id, order: k.order, name: k.name,
          startDate: k.startDate ?? null,
          endDate: k.endDate ?? null,
          reportDeadline: k.reportDeadline ?? null,
          hasDates: Boolean(k.startDate || k.endDate || k.reportDeadline),
        })),
    }));

    const todos = porCurso.flatMap((c) => c.cortes);

    return NextResponse.json({
      semesterId,
      semesterLabel: semester.label,
      courses: porCurso,
      /** Órdenes de corte que existen en el semestre, para saber qué se puede fijar. */
      orders: [...new Set(todos.map((k) => k.order))].sort((a, b) => a - b),
      totalCortes: todos.length,
      withDates: todos.filter((k) => k.hasDates).length,
    });
  }, 'admin');
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id: semesterId } = await params;
      const body = await request.json().catch(() => ({}));

      const dates: unknown = body?.dates;
      /** Por defecto NO se pisan las fechas ya puestas: sobrescribir se pide. */
      const overwrite: boolean = body?.overwrite === true;
      /** Sin aplicar nada: solo decir qué pasaría. */
      const dryRun: boolean = body?.dryRun === true;
      const exceptCourseId: string | undefined =
        typeof body?.exceptCourseId === 'string' ? body.exceptCourseId : undefined;

      if (!Array.isArray(dates) || dates.length === 0) {
        return NextResponse.json({ error: 'No hay fechas que aplicar' }, { status: 400 });
      }

      const plan: FechasDeCorte[] = [];
      for (const d of dates as Record<string, unknown>[]) {
        if (typeof d?.order !== 'number') {
          return NextResponse.json({ error: 'Cada fecha necesita el orden del corte' }, { status: 400 });
        }
        for (const campo of ['startDate', 'endDate', 'reportDeadline'] as const) {
          const v = d[campo];
          if (v !== undefined && v !== '' && (typeof v !== 'string' || !ES_FECHA.test(v))) {
            return NextResponse.json({ error: `Fecha inválida en el corte ${d.order}` }, { status: 400 });
          }
        }
        const inicio = d.startDate as string | undefined;
        const fin = d.endDate as string | undefined;
        const rep = d.reportDeadline as string | undefined;
        if (inicio && fin && inicio > fin) {
          return NextResponse.json({ error: `El corte ${d.order} no puede terminar antes de empezar` }, { status: 400 });
        }
        if (fin && rep && fin > rep) {
          return NextResponse.json({ error: `En el corte ${d.order}, el reporte vence antes de que cierre el corte` }, { status: 400 });
        }
        plan.push({ order: d.order, startDate: inicio, endDate: fin, reportDeadline: rep });
      }

      const [semesters, courses] = await Promise.all([readSemestersFresh(), readCoursesFresh()]);
      const semester = semesters.find((s) => s.id === semesterId);
      if (!semester) return NextResponse.json({ error: 'Semestre no encontrado' }, { status: 404 });

      const semCourseIds = new Set(
        courses.filter((c) => c.semesterId === semesterId && c.id !== exceptCourseId).map((c) => c.id),
      );
      const porOrden = new Map(plan.map((p) => [p.order, p]));

      return withFileLock('cortes.json', async () => {
        const allCortes = await readCortesFresh();

        const cambiados: { courseId: string; corteId: string; name: string }[] = [];
        const conservados: { courseId: string; name: string }[] = [];
        const sinPareja: number[] = [];

        const ordenesPresentes = new Set(
          allCortes.filter((k) => semCourseIds.has(k.courseId)).map((k) => k.order),
        );
        for (const p of plan) if (!ordenesPresentes.has(p.order)) sinPareja.push(p.order);

        for (const corte of allCortes) {
          if (!semCourseIds.has(corte.courseId)) continue;
          const fechas = porOrden.get(corte.order);
          if (!fechas) continue;

          const yaTiene = Boolean(corte.startDate || corte.endDate || corte.reportDeadline);
          if (yaTiene && !overwrite) {
            conservados.push({ courseId: corte.courseId, name: corte.name });
            continue;
          }

          if (!dryRun) {
            // Cadena vacía = quitar la fecha, igual que en el formulario.
            if (fechas.startDate !== undefined) {
              if (fechas.startDate) corte.startDate = fechas.startDate; else delete corte.startDate;
            }
            if (fechas.endDate !== undefined) {
              if (fechas.endDate) corte.endDate = fechas.endDate; else delete corte.endDate;
            }
            if (fechas.reportDeadline !== undefined) {
              if (fechas.reportDeadline) corte.reportDeadline = fechas.reportDeadline;
              else delete corte.reportDeadline;
            }
            corte.updatedAt = nowColombiaISO();
          }
          cambiados.push({ courseId: corte.courseId, corteId: corte.id, name: corte.name });
        }

        const resumen = {
          courses: new Set(cambiados.map((c) => c.courseId)).size,
          cortes: cambiados.length,
          kept: conservados.length,
          /** Órdenes del plan que ningún curso del semestre tiene. */
          unmatched: sinPareja,
        };

        if (dryRun) return NextResponse.json({ dryRun: true, ...resumen });

        if (cambiados.length === 0) {
          return NextResponse.json({
            ...resumen,
            message: conservados.length > 0
              ? 'Ningún corte cambió: todos tenían fechas ya puestas. Marca sobrescribir si quieres reemplazarlas.'
              : 'Ningún corte cambió.',
          });
        }

        await dispatchWrite(
          () => writeCortes(allCortes),
          {
            action: 'update',
            entity: 'corte',
            entityId: semesterId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Aplicó el calendario de cortes a ${resumen.courses} curso(s) del semestre ${semester.label}: ${resumen.cortes} cortes actualizados${resumen.kept > 0 ? `, ${resumen.kept} conservados` : ''}`,
            after: auditSnapshot({ semesterId, plan, overwrite }),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({
          ...resumen,
          message: `${resumen.cortes} cortes actualizados en ${resumen.courses} ${resumen.courses === 1 ? 'curso' : 'cursos'}`
            + (resumen.kept > 0 ? `. ${resumen.kept} conservaron sus fechas.` : '.'),
        });
      });
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

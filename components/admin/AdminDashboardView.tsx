'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ClipboardCheck, CalendarClock, Users, BookOpen, FileEdit, ArrowRight } from 'lucide-react';
import { parseDateColombia, nowColombia } from '@/lib/dateUtils';
import { dueLabel, startOfTodayColombia } from '@/lib/activityStatus';
import { toneChip } from '@/lib/semantics';
import EmptyState from '@/components/ui/EmptyState';
import type { Course, Enrollment, Activity, Submission, Semester } from '@/lib/types';
import DashboardPriorities, {
  type ReportDeadline, type QueueItem, type AtRiskStudent,
} from '@/components/admin/DashboardPriorities';

/**
 * AdminDashboardView — Rediseño del panel del docente.
 *
 * El panel abría con cuatro contadores: cursos, estudiantes, actividades y
 * pendientes de calificar. Solo el último es accionable, y era el último.
 * Un docente entra con dos preguntas —"¿qué tengo que calificar?" y "¿qué
 * vence pronto?"— y ninguna estaba respondida arriba.
 *
 * Los borradores sin publicar pasan a ser visibles: son trabajo a medias que
 * ningún estudiante ve, y antes solo existían como un número pequeño dentro
 * de una tarjeta.
 */

export interface CourseData {
  course: Course;
  enrollments: Enrollment[];
  activities: Activity[];
  submissions: Submission[];
}

export default function AdminDashboardView({
  semester, courseData, reportDeadlines, gradingQueue, atRisk,
}: {
  semester: Semester | null;
  courseData: CourseData[];
  reportDeadlines?: ReportDeadline[];
  gradingQueue?: QueueItem[];
  atRisk?: AtRiskStudent[];
}) {
  const reduce = useReducedMotion();
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);

  /** Cola de calificación por curso: el trabajo real del docente. */
  const grading = useMemo(() => courseData
    .map((cd) => ({
      course: cd.course,
      pending: cd.submissions.filter((s) => s.status !== 'reviewed').length,
    }))
    .filter((c) => c.pending > 0)
    .sort((a, b) => b.pending - a.pending), [courseData]);

  const totalPending = grading.reduce((a, c) => a + c.pending, 0);
  const overdue = useMemo(() => courseData.flatMap((cd) =>
    cd.activities.filter((a) => a.status === 'published'
      && parseDateColombia(a.dueDate) < today)).length, [courseData, today]);

  const drafts = useMemo(() => courseData.flatMap((cd) =>
    cd.activities.filter((a) => a.status === 'draft')
      .map((a) => ({ activity: a, course: cd.course }))), [courseData]);

  const deadlines = useMemo(() => courseData.flatMap((cd) => {
    const active = cd.enrollments.filter((e) => e.status === 'active').length;
    return cd.activities
      .filter((a) => a.status === 'published')
      .map((a) => ({
        activity: a, course: cd.course, active,
        days: Math.round((parseDateColombia(a.dueDate).getTime() - today.getTime()) / 86400000),
        submitted: cd.submissions.filter((s) => s.activityId === a.id).length,
      }))
      .filter((d) => d.days >= -7 && d.days <= 14);
  }).sort((a, b) => a.days - b.days).slice(0, 6), [courseData, today]);

  const students = useMemo(() => new Set(courseData.flatMap((cd) =>
    cd.enrollments.filter((e) => e.status === 'active').map((e) => e.studentId))).size, [courseData]);

  /**
   * Cómo va el semestre.
   *
   * El panel decía cuánto hay por calificar pero no si el semestre va
   * adelantado o atrasado, que es lo primero que se pregunta un docente al
   * abrirlo. Se mide con dos cosas que ya están: cuánto del calendario ha
   * transcurrido y cuánto del trabajo se ha calificado.
   */
  const progress = useMemo(() => {
    const acts = courseData.flatMap((cd) => cd.activities.filter((a) => a.status !== 'draft'));
    const subs = courseData.flatMap((cd) => cd.submissions);
    const graded = subs.filter((s) => s.status === 'reviewed').length;

    const closed = acts.filter((a) => parseDateColombia(a.dueDate) < today).length;
    const workPct = acts.length > 0 ? Math.round((closed / acts.length) * 100) : 0;
    const gradedPct = subs.length > 0 ? Math.round((graded / subs.length) * 100) : 0;

    let timePct: number | null = null;
    if (semester?.startDate && semester?.endDate) {
      const a = parseDateColombia(semester.startDate).getTime();
      const b = parseDateColombia(semester.endDate).getTime();
      if (b > a) timePct = Math.min(100, Math.max(0, Math.round(((today.getTime() - a) / (b - a)) * 100)));
    }
    return { workPct, gradedPct, timePct, totalActs: acts.length, closed };
  }, [courseData, semester, today]);

  /*
   * Un solo fundido, sin escalonar.
   *
   * Había ocho secciones entrando con retardos de 0 a 100ms. Está bien para
   * algo que se ve de vez en cuando, pero esta es la pantalla de aterrizaje:
   * se abre decenas de veces al día, y a esa frecuencia el escalonado deja de
   * ser pulido y pasa a ser espera. El parámetro se conserva para no tocar las
   * ocho llamadas, pero ya no retrasa nada.
   */
  const fade = () => reduce ? {} : {
    initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    /*
     * En escritorio esto era una tira de 1152px de ancho y 2300 de alto: el
     * diseño de móvil estirado. Ocho secciones en fila, cada una ocupando todo
     * el ancho para enseñar tres datos, y 288px de ventana sin usar.
     *
     * Ahora hay dos columnas a partir de 1280px: a la izquierda lo que hay que
     * HACER, a la derecha el contexto —cómo va el semestre, qué vence, qué
     * cursos hay—. Antes el contexto se metía en medio y partía el flujo.
     */
    <div className="max-w-[1500px] mx-auto space-y-6 flex flex-col sm:block">
      <motion.div {...fade()}>
        <h1 className="type-page text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Panel del docente
        </h1>
        <p className="text-sm text-subtle mt-1">
          {semester ? `Semestre ${semester.label}` : 'Sin semestre activo'}
          {' · '}
          <Link href="/admin/courses" className="hover:text-foreground transition-colors underline decoration-transparent hover:decoration-current">
            {courseData.length} {courseData.length === 1 ? 'curso' : 'cursos'}
          </Link>
          {' · '}
          <Link href="/admin/students" className="hover:text-foreground transition-colors underline decoration-transparent hover:decoration-current">
            {students} {students === 1 ? 'estudiante' : 'estudiantes'}
          </Link>
        </p>
      </motion.div>

      {/*
        Resumen de una línea. En móvil es lo primero que se ve, porque un
        docente abre esto entre clases y necesita saber qué hacer en tres
        segundos, no cómo va el calendario.
      */}
      <motion.div {...fade()} className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:hidden">
        {totalPending > 0 ? (
          <a href="#por-calificar"
            className="flex items-baseline gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="text-2xl font-bold tabular-nums leading-none">{totalPending}</span>
            <span className="text-xs">por calificar</span>
          </a>
        ) : (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Todo calificado</span>
        )}
        {overdue > 0 && (
          <span className="flex items-baseline gap-1.5 text-red-600 dark:text-red-400">
            <span className="text-2xl font-bold tabular-nums leading-none">{overdue}</span>
            <span className="text-xs">{overdue === 1 ? 'vencida' : 'vencidas'}</span>
          </span>
        )}
        {drafts.length > 0 && (
          <span className="flex items-baseline gap-1.5 text-subtle">
            <span className="text-2xl font-bold tabular-nums leading-none">{drafts.length}</span>
            <span className="text-xs">sin publicar</span>
          </span>
        )}
      </motion.div>

      {/*
        Dos columnas a partir de 1280px.

        A la izquierda lo que hay que HACER: los reportes que vencen, la cola
        de calificación y quién va perdiendo. A la derecha el contexto: cómo va
        el semestre, qué vence pronto, qué cursos hay.

        Antes iba todo en una sola tira y el contexto se colaba en medio,
        partiendo el flujo del trabajo justo por la mitad. Y en un monitor
        quedaban 288px de ancho sin usar mientras cada fila estiraba tres datos
        a lo largo de mil píxeles.
      */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        {/* ── Lo accionable ── */}
        {/* @container: los bloques de dentro se adaptan al ancho de ESTA
            columna, no al de la ventana. Sin esto habría que adivinar cuánto
            mide la columna en cada punto de corte. */}
        <div className="@container space-y-6 min-w-0">
        {/*
          Lo que aprieta va PRIMERO.

          Antes lo primero era "cómo va el semestre": promedios y barras de
          progreso. Eso es contexto, no trabajo. Un docente abre esto entre
          clases para saber qué hacer, y lo que tiene que hacer estaba repartido
          curso por curso.
        */}
        <motion.div {...fade()}>
          <DashboardPriorities
            reportDeadlines={reportDeadlines}
            gradingQueue={gradingQueue}
            atRisk={atRisk}
          />
        </motion.div>

        <motion.section id="por-calificar" {...fade()}>
          {/*
            Se llamaba "Por calificar" igual que la cola de arriba, y las dos
            listaban lo mismo con criterios distintos: aquí el total POR CURSO,
            allí las actividades concretas ordenadas por plazo. Dos secciones con
            el mismo nombre y distinto orden se leen como un error. Esta es la
            vista de conjunto; la de arriba dice por dónde empezar.
          */}
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" aria-hidden="true" /> Pendiente por curso
          </h2>
          {totalPending === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface">
              <EmptyState compact kind="done" title="No tienes nada pendiente"
                description="Todas las entregas están calificadas." />
            </div>
          ) : (
            /* En móvil, filas: una tarjeta de 120px para un número y un nombre
               desperdicia media pantalla. Desde sm vuelven a ser tarjetas. */
            <div className="rounded-xl border border-amber-500/25 divide-y divide-amber-500/15 overflow-hidden
                            sm:border-0 sm:divide-y-0 sm:rounded-none sm:grid sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grading.map(({ course, pending }) => (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}/activities`}
                  className="group flex items-center gap-3 p-3.5 bg-amber-500/[0.06]
                             transition-colors duration-[var(--dur-fast)] hover:bg-amber-500/[0.10]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40
                             sm:block sm:rounded-xl sm:border sm:border-amber-500/25 sm:p-4"
                >
                  <span className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-none shrink-0">
                    {pending}
                  </span>
                  <span className="min-w-0 flex-1 sm:block sm:mt-2">
                    <span className="block text-sm text-foreground/90 leading-snug truncate sm:whitespace-normal">
                      {course.name}
                    </span>
                    <span className="block text-meta text-subtle mt-0.5">
                      <span className="font-mono">{course.code}</span>
                      <span className="sm:inline"> · {pending === 1 ? 'entrega' : 'entregas'} sin calificar</span>
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-600/50 dark:text-amber-400/50 shrink-0 sm:hidden" />
                </Link>
              ))}
            </div>
          )}
        </motion.section>
        </div>

        {/* ── Contexto. En móvil va al final: primero el trabajo. ── */}
        <aside className="space-y-6 min-w-0 order-last xl:order-none">
        {/* ── Cómo va el semestre · en móvil va al final, es contexto ── */}
        <motion.section {...fade()}
          className="rounded-2xl border border-surface-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">Cómo va el semestre</h2>
            {progress.timePct !== null && (
              <span className="text-meta text-subtle">
                {progress.timePct < 100
                  ? `${progress.timePct}% del calendario transcurrido`
                  : 'El semestre ya terminó'}
              </span>
            )}
          </div>

          <div className="space-y-3 mt-4">
            <ProgressRow delay={0} label="Calendario" pct={progress.timePct ?? 0} tone="bg-foreground/30"
              hint={semester ? `${semester.startDate} → ${semester.endDate}` : ''} />
            <ProgressRow delay={0.06} label="Actividades cerradas" pct={progress.workPct} tone="bg-cyan-500"
              hint={`${progress.closed} de ${progress.totalActs}`} />
            {/* La única de las tres que lleva a alguna parte: las otras dos son
                medidas del tiempo y del calendario, no cosas que se puedan abrir. */}
            <ProgressRow delay={0.12} label="Entregas calificadas" pct={progress.gradedPct}
              tone={progress.gradedPct >= (progress.timePct ?? 0) ? 'bg-emerald-500' : 'bg-amber-500'}
              hint={totalPending > 0 ? `${totalPending} sin calificar` : 'todo al día'}
              onClick={totalPending > 0
                ? () => document.getElementById('por-calificar')?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'start',
                  })
                : undefined} />
          </div>

          {/* La lectura, dicha en palabras: comparar dos barras a ojo no es
              una conclusión, y la conclusión es lo que se viene a buscar. */}
          {progress.timePct !== null && (
            <p className="text-xs text-subtle mt-3">
              {progress.gradedPct >= progress.timePct
                ? 'Vas al ritmo del semestre: has calificado al menos tanto como tiempo ha pasado.'
                : `Vas por detrás del calendario: ha transcurrido el ${progress.timePct}% del semestre y llevas calificado el ${progress.gradedPct}%.`}
            </p>
          )}
        </motion.section>

        {drafts.length > 0 && (
          <motion.section {...fade()}>
            <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5" /> Sin publicar ({drafts.length})
            </h2>
            <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
              {drafts.slice(0, 5).map(({ activity, course }) => (
                <Link
                  key={activity.id}
                  href={`/admin/courses/${course.id}/activities/${activity.id}`}
                  className="flex items-center gap-3 p-3.5 bg-surface hover:bg-surface-hover
                             transition-colors duration-[var(--dur-fast)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">{activity.title}</p>
                    <p className="text-meta text-subtle mt-0.5">{course.name}</p>
                  </div>
                  <span className={`text-micro px-1.5 py-0.5 rounded border shrink-0 ${toneChip.lifecycle}`}>Borrador</span>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section {...fade()}>
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" /> Vencimientos cercanos
          </h2>
          {deadlines.length === 0 ? (
            <EmptyState compact kind="done" title="Sin vencimientos cercanos"
              description="Nada vence en las próximas dos semanas." />
          ) : (
            <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
              {deadlines.map(({ activity, course, days, active, submitted }) => {
                const tone = days < 0 ? 'text-red-600 dark:text-red-400'
                  : days <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-subtle';
                const pct = active > 0 ? submitted / active : 0;
                return (
                  <Link
                    key={activity.id}
                    href={`/admin/courses/${course.id}/activities/${activity.id}/submissions`}
                    className="flex items-center gap-3 p-3.5 bg-surface hover:bg-surface-hover
                               transition-colors duration-[var(--dur-fast)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground/90 leading-snug">{activity.title}</p>
                      <p className="text-meta text-subtle mt-0.5 truncate">
                        {course.name}
                      </p>
                      <p className={`text-meta mt-0.5 ${tone}`}>{dueLabel(activity.dueDate, today)}</p>
                    </div>
                    {/* Cuántos han entregado: en un vencimiento eso es lo que el
                        docente necesita saber, no solo la fecha. A 390px una
                        columna de 96px deja la barra en 60px y el título
                        envolviendo en tres líneas, así que en móvil va debajo. */}
                    <div className="shrink-0 text-right w-20 sm:w-24">
                      <p className="text-meta text-muted tabular-nums">{submitted}/{active}</p>
                      <div className="relative h-1 rounded-full bg-foreground/[0.08] overflow-hidden mt-1">
                        <motion.div
                          initial={reduce ? false : { scaleX: 0 }}
                          animate={{ scaleX: pct }}
                          transition={{ duration: reduce ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
                          style={{ transformOrigin: 'left' }}
                          className="absolute inset-0 rounded-full bg-cyan-500"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section {...fade()}>
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Mis cursos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {courseData.map((cd) => {
              const active = cd.enrollments.filter((e) => e.status === 'active').length;
              const published = cd.activities.filter((a) => a.status === 'published').length;
              return (
                <Link
                  key={cd.course.id}
                  href={`/admin/courses/${cd.course.id}`}
                  className="rounded-xl border border-surface-border bg-surface p-4
                             transition-colors duration-[var(--dur-fast)]
                             hover:border-surface-border-hover hover:bg-surface-hover
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                  <p className="text-sm font-semibold text-foreground leading-snug">{cd.course.name}</p>
                  <p className="text-meta text-subtle mt-0.5 font-mono">{cd.course.code}</p>
                  <div className="flex items-center gap-4 mt-3 text-meta text-subtle">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{active}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{published}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
        </aside>
      </div>
    </div>
  );
}

function ProgressRow({ label, pct, tone, hint, onClick, delay = 0 }: {
  label: string; pct: number; tone: string; hint?: string; onClick?: () => void; delay?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={onClick
        ? `w-full text-left rounded-lg -mx-2 px-2 py-1 cursor-pointer
           transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]
           hover:bg-surface-hover
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40`
        : ''}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-subtle tabular-nums">
          {pct}%{hint && <span className="text-faint"> · {hint}</span>}
        </span>
      </div>
      {/*
        Frecuencia: ocasional · Propósito: EXPLICACIÓN.
        La barra se llena al abrir para que la proporción se lea como
        magnitud y no como un bloque estático. Escalonada por fila para que
        las tres se puedan comparar en el orden en que se leen.
        scaleX y no width: animar la maqueta obliga a recalcularla en cada
        fotograma, y aquí hay tres barras a la vez.
      */}
      <div className="relative h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden mt-1">
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: reduce ? 0 : 0.28, delay: reduce ? 0 : delay,
                        ease: [0.23, 1, 0.32, 1] }}
          style={{ transformOrigin: 'left' }}
          className={`absolute inset-0 rounded-full ${tone}`}
        />
      </div>
    </Tag>
  );
}

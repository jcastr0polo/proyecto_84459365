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

/**
 * AdminDashboardViewV2 — Rediseño del panel del docente.
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

export default function AdminDashboardViewV2({
  semester, courseData,
}: {
  semester: Semester | null;
  courseData: CourseData[];
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

  const fade = (d = 0) => reduce ? {} : {
    initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 },
    transition: { delay: d, duration: 0.25, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div {...fade(0)}>
        <h1 className="type-page text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Panel del docente
        </h1>
        <p className="text-sm text-subtle mt-1">
          {semester ? `Semestre ${semester.label}` : 'Sin semestre activo'}
          {' · '}{courseData.length} {courseData.length === 1 ? 'curso' : 'cursos'}
          {' · '}{students} {students === 1 ? 'estudiante' : 'estudiantes'}
        </p>
      </motion.div>

      {/* ── Cómo va el semestre ── */}
      <motion.section {...fade(0.02)} className="rounded-2xl border border-surface-border bg-surface p-5">
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
          <ProgressRow label="Calendario" pct={progress.timePct ?? 0} tone="bg-foreground/30"
            hint={semester ? `${semester.startDate} → ${semester.endDate}` : ''} />
          <ProgressRow label="Actividades cerradas" pct={progress.workPct} tone="bg-cyan-500"
            hint={`${progress.closed} de ${progress.totalActs}`} />
          <ProgressRow label="Entregas calificadas" pct={progress.gradedPct}
            tone={progress.gradedPct >= (progress.timePct ?? 0) ? 'bg-emerald-500' : 'bg-amber-500'}
            hint={totalPending > 0 ? `${totalPending} sin calificar` : 'todo al día'} />
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

      <motion.section {...fade(0.04)}>
        {/* Jerarquía: esta es la sección que manda en la pantalla, así que
            no puede llevar el mismo gris pequeño que las de apoyo. */}
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-amber-500" /> Por calificar
        </h2>
        {totalPending === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface">
            <EmptyState compact kind="done" title="No tienes nada pendiente"
              description="Todas las entregas están calificadas." />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grading.map(({ course, pending }) => (
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}/activities`}
                className="group rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4
                           transition-colors duration-[var(--dur-fast)] hover:bg-amber-500/[0.10]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                    {pending}
                  </span>
                  <span className="text-xs text-subtle">{pending === 1 ? 'entrega' : 'entregas'}</span>
                </div>
                <p className="text-sm text-foreground/90 mt-2 leading-snug">{course.name}</p>
                <p className="text-meta text-subtle mt-0.5 font-mono flex items-center gap-1">
                  {course.code}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {drafts.length > 0 && (
        <motion.section {...fade(0.06)}>
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

      <motion.section {...fade(0.08)}>
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
                    <p className="text-meta text-subtle mt-0.5">
                      {course.name} · <span className={tone}>{dueLabel(activity.dueDate, today)}</span>
                    </p>
                  </div>
                  {/* Cuántos han entregado: en un vencimiento eso es lo que el
                      docente necesita saber, no solo la fecha. */}
                  <div className="shrink-0 text-right w-24">
                    <p className="text-meta text-muted tabular-nums">{submitted} de {active}</p>
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

      <motion.section {...fade(0.1)}>
        <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> Mis cursos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}

function ProgressRow({ label, pct, tone, hint }: {
  label: string; pct: number; tone: string; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-subtle tabular-nums">
          {pct}%{hint && <span className="text-faint"> · {hint}</span>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden mt-1">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${tone}
                      transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]
                      motion-reduce:transition-none`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

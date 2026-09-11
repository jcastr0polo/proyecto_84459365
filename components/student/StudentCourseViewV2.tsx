'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, BarChart3, Rocket, ClipboardList, Clock, Building2, Monitor, RefreshCw, ArrowLeft } from 'lucide-react';
import { parseDateColombia, parseDateTimeColombia, nowColombia, formatDateShort } from '@/lib/dateUtils';
import { gradeText, formatScore } from '@/lib/gradeScale';
import type { Course, Activity, Submission, StudentGradeSummary } from '@/lib/types';

/**
 * StudentCourseViewV2 — Rediseño de la vista de curso.
 *
 * Arregla tres cosas que estaban mal, no solo feas:
 * - El orden ponía una entrega a tres semanas por encima de una ya vencida.
 * - El tipo de actividad salía en inglés crudo ("project", "document").
 * - La insignia de estado pintaba dos puntos de color, uno propio y otro
 *   del componente Badge.
 *
 * Y de diseño:
 * - Las actividades pasan de tarjetas de 110px a filas; caben todas de un
 *   vistazo en vez de obligar a rodar la página.
 * - El plazo se dice en palabras y se muestra también en las vencidas, que
 *   antes no decían nada.
 * - "Parcial" pasa a "provisional": en esta misma app un Parcial es un quiz,
 *   así que usar la palabra para "nota incompleta" se presta a confusión.
 */

type DeliveryStatus = 'returned' | 'overdue' | 'pending' | 'delivered' | 'graded';

/** Urgencia real: lo vencido y lo devuelto pesa más que lo que falta por vencer. */
const PRIORITY: Record<DeliveryStatus, number> = {
  returned: 0, overdue: 1, pending: 2, delivered: 3, graded: 4,
};

const STATUS: Record<DeliveryStatus, { label: string; dot: string; text: string }> = {
  returned: { label: 'Devuelta', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Vencida', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  pending: { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  delivered: { label: 'Entregada', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  graded: { label: 'Calificada', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
};

const TYPE_LABELS: Record<string, string> = {
  project: 'Proyecto', exercise: 'Ejercicio', document: 'Documento',
  presentation: 'Presentación', prompt: 'Prompt', exam: 'Examen',
  quiz: 'Parcial', manual: 'Nota manual', other: 'Otro',
};

const DAY_LONG: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sábado: 'Sábado',
};

const MODALITY: Record<string, { label: string; Icon: typeof Building2 }> = {
  presencial: { label: 'Presencial', Icon: Building2 },
  virtual: { label: 'Virtual', Icon: Monitor },
  híbrido: { label: 'Híbrido', Icon: RefreshCw },
};

function statusOf(activity: Activity, sub: Submission | undefined, now: Date): DeliveryStatus {
  if (sub) {
    if (sub.status === 'reviewed') return 'graded';
    if (sub.status === 'returned') return 'returned';
    return 'delivered';
  }
  const due = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59');
  return now > due ? 'overdue' : 'pending';
}

function dueLabel(dueDate: string, today: Date): string {
  const days = Math.round((parseDateColombia(dueDate).getTime() - today.getTime()) / 86400000);
  if (days < -1) return `Venció hace ${Math.abs(days)} días`;
  if (days === -1) return 'Venció ayer';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `En ${days} días`;
  return `En ${Math.ceil(days / 7)} semanas`;
}

export default function StudentCourseViewV2({
  course, activities, submissions, gradeData,
}: {
  course: Course;
  activities: Activity[];
  submissions: Record<string, Submission>;
  gradeData: StudentGradeSummary | null;
}) {
  const reduce = useReducedMotion();

  // Una marca de tiempo estable por render; días calendario en hora Colombia.
  const now = useMemo(() => nowColombia(), []);
  const today = useMemo(() => { const d = nowColombia(); d.setHours(0, 0, 0, 0); return d; }, []);

  const rows = useMemo(() => activities
    .filter((a) => a.status !== 'draft')
    .map((a) => ({ activity: a, sub: submissions[a.id], status: statusOf(a, submissions[a.id], now) }))
    .sort((x, y) => {
      const p = PRIORITY[x.status] - PRIORITY[y.status];
      if (p !== 0) return p;
      return +parseDateColombia(x.activity.dueDate) - +parseDateColombia(y.activity.dueDate);
    }), [activities, submissions, now]);

  const pendingCount = rows.filter((r) => ['pending', 'overdue', 'returned'].includes(r.status)).length;
  const gradeFor = (id: string) => gradeData?.activities.find((a) => a.id === id)?.grade ?? null;

  const fade = (d = 0) => reduce ? {} : {
    initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 },
    transition: { delay: d, duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  };

  const actions = [
    { href: `/student/courses/${course.id}/activities`, label: 'Actividades', Icon: FileText },
    { href: `/student/courses/${course.id}/grades`, label: 'Mis notas', Icon: BarChart3 },
    { href: `/student/courses/${course.id}/project`, label: 'Mi proyecto', Icon: Rocket },
    { href: `/student/courses/${course.id}/quizzes`, label: 'Parciales', Icon: ClipboardList },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/student/courses"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground
                   transition-colors py-2 pr-3 rounded-lg">
        <ArrowLeft className="w-4 h-4" /> Mis cursos
      </Link>

      {/* ── Cabecera ── */}
      <motion.div {...fade(0)} className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-meta text-subtle font-mono">{course.code}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5"
              style={{ fontFamily: 'var(--font-playfair)' }}>
            {course.name}
          </h1>
          {course.schedule.length > 0 && (
            <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-subtle">
              {course.schedule.map((h, i) => {
                const m = MODALITY[h.modality];
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {DAY_LONG[h.dayOfWeek] ?? h.dayOfWeek} {h.startTime}–{h.endTime}
                    {m && <><m.Icon className="w-3 h-3 ml-1" />{m.label}</>}
                    {h.room && <span className="text-faint">· {h.room}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <Link href={`/student/courses/${course.id}/grades`}
          className="rounded-2xl border border-surface-border bg-surface px-5 py-4 text-center shrink-0
                     transition-colors duration-[var(--dur-fast)]
                     hover:border-surface-border-hover hover:bg-surface-hover
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
          <p className="text-micro uppercase tracking-wider text-subtle">Mi nota</p>
          <p className={`text-3xl font-bold tabular-nums leading-none mt-1 ${gradeText(gradeData?.finalScore ?? null)}`}>
            {formatScore(gradeData?.finalScore ?? null)}
          </p>
          {/* "Provisional", no "parcial": en esta app un Parcial es un quiz. */}
          <p className="text-micro text-faint mt-1">
            {gradeData?.finalScore == null ? 'sin notas' : gradeData.isPartial ? 'provisional' : 'definitiva'}
          </p>
        </Link>
      </motion.div>

      {/* ── Accesos ── */}
      <motion.nav {...fade(0.04)} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(({ href, label, Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5
                       text-sm text-muted transition-colors duration-[var(--dur-fast)]
                       hover:border-surface-border-hover hover:bg-surface-hover hover:text-foreground
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </motion.nav>

      {/* ── Actividades ── */}
      <motion.section {...fade(0.08)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Actividades ({rows.length})
          </h2>
          {pendingCount > 0 && (
            <span className="text-meta text-amber-600 dark:text-amber-400">
              {pendingCount} sin entregar
            </span>
          )}
        </div>

        {rows.length > 0 ? (
          <div className="rounded-xl border border-surface-border divide-y divide-foreground/[0.06] overflow-hidden">
            {rows.map(({ activity, sub, status }) => {
              const g = gradeFor(activity.id);
              const st = STATUS[status];
              const needsAction = status === 'pending' || status === 'overdue' || status === 'returned';
              return (
                <Link key={activity.id}
                  href={`/student/courses/${course.id}/activities/${activity.id}`}
                  className="flex items-center gap-3 p-3.5 bg-surface
                             transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">{activity.title}</p>
                    <p className="text-meta text-subtle mt-0.5">
                      {TYPE_LABELS[activity.type] ?? activity.type}
                      {' · '}{activity.weight}%
                      {' · '}<span className={st.text}>{st.label}</span>
                      {/* El plazo se muestra también en las vencidas: antes
                          solo aparecía en las que aún no vencían. */}
                      {needsAction && <> · {dueLabel(activity.dueDate, today)}</>}
                      {/* La fecha de entrega real, no la fecha límite. */}
                      {!needsAction && sub?.submittedAt && <> · entregada {formatDateShort(sub.submittedAt)}</>}
                    </p>
                  </div>

                  <div className="shrink-0 text-right min-w-[3rem]">
                    {g ? (
                      <>
                        <p className={`text-lg font-semibold tabular-nums leading-none ${gradeText((g.score / g.maxScore) * 5)}`}>
                          {((g.score / g.maxScore) * 5).toFixed(1)}
                        </p>
                        <p className="text-micro text-faint mt-0.5">{g.score}/{g.maxScore}</p>
                      </>
                    ) : (
                      <span className="text-meta text-faint">Máx {activity.maxScore}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-subtle px-1 py-6">Este curso todavía no tiene actividades publicadas.</p>
        )}
      </motion.section>
    </div>
  );
}

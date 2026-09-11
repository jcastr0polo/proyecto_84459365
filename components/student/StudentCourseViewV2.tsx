'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, BarChart3, Rocket, ClipboardList, Clock, Building2, Monitor, RefreshCw, ArrowLeft } from 'lucide-react';
import { nowColombia } from '@/lib/dateUtils';
import { gradeText, formatScore } from '@/lib/gradeScale';
import { needsAction, startOfTodayColombia } from '@/lib/activityStatus';
import ActivityList, { useActivityRows } from './ActivityList';
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

const DAY_LONG: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sábado: 'Sábado',
};

const MODALITY: Record<string, { label: string; Icon: typeof Building2 }> = {
  presencial: { label: 'Presencial', Icon: Building2 },
  virtual: { label: 'Virtual', Icon: Monitor },
  híbrido: { label: 'Híbrido', Icon: RefreshCw },
};

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
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);

  const rows = useActivityRows(activities, submissions, now);

  /**
   * Parciales y notas manuales.
   *
   * La lista de arriba se arma con /api/courses/[id]/activities, que solo
   * devuelve actividades. Pero un parcial o una nota manual pesan en la nota
   * igual que una entrega, así que el estudiante veía una nota de curso que
   * su propia lista de actividades no explicaba.
   */
  const otherItems = useMemo(
    () => (gradeData?.activities ?? []).filter((a) => a.type === 'quiz' || a.type === 'manual'),
    [gradeData],
  );

  const pendingCount = rows.filter((r) => needsAction(r.status)).length;

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

        <ActivityList rows={rows} courseId={course.id} today={today} gradeData={gradeData} />
      </motion.section>

      {otherItems.length > 0 && (
        <motion.section {...fade(0.1)}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
            Parciales y notas manuales
          </h2>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
            {otherItems.map((item) => {
              const n = item.grade ? (item.grade.score / item.grade.maxScore) * 5 : null;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3.5 bg-surface">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.grade ? 'bg-emerald-500' : 'bg-foreground/25'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">{item.title}</p>
                    <p className="text-meta text-subtle mt-0.5">
                      {item.type === 'quiz' ? 'Parcial' : 'Nota manual'} · {item.weight}%
                    </p>
                  </div>
                  <div className="shrink-0 text-right min-w-[3rem]">
                    {n !== null ? (
                      <>
                        <p className={`text-lg font-semibold tabular-nums leading-none ${gradeText(n)}`}>
                          {n.toFixed(1)}
                        </p>
                        <p className="text-micro text-faint mt-0.5">
                          {item.grade!.score}/{item.grade!.maxScore}
                        </p>
                      </>
                    ) : (
                      <span className="text-meta text-faint">Pendiente</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}

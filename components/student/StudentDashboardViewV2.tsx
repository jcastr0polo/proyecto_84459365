'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, ArrowRight, CheckCircle2, BookOpen, ClipboardList, Clock, Shield } from 'lucide-react';
import { parseDateColombia, nowColombia, formatDateShort } from '@/lib/dateUtils';
import { gradeText, normalize, formatScore, PASS } from '@/lib/gradeScale';
import type { Semester } from '@/lib/types';
import CourseCard from './CourseCard';
import EmptyState from '@/components/ui/EmptyState';
import type { CourseWithMeta, UserInfo, ActiveQuiz } from './StudentDashboardView';


/**
 * StudentDashboardViewV2 — Rediseño del panel del estudiante.
 *
 * El panel anterior abría con cuatro contadores (cursos, pendientes,
 * entregadas, calificadas) que no responden ninguna de las dos preguntas con
 * las que un estudiante entra: "¿qué tengo que hacer ya?" y "¿cómo voy?".
 * Este arranca por ahí y deja los conteos como apoyo.
 *
 * Otros cambios:
 * - Las tarjetas de curso llevan información: nota actual, avance y pendientes.
 * - Los plazos se dicen en palabras ("Venció hace 2 días", "Vence hoy"), no
 *   con un "1d" ambiguo que no distingue vencido de por vencer.
 * - Un solo lenguaje de color: el rojo/ámbar es de urgencia en los plazos y de
 *   rendimiento en las notas, pero nunca los dos en la misma tarjeta.
 * - Las filas completas son el objetivo de clic, sin un botón "Entregar" repetido.
 */

type Urgency = 'overdue' | 'today' | 'urgent' | 'soon' | 'relaxed';

interface Pending {
  id: string; title: string; courseName: string; courseId: string;
  daysLeft: number; urgency: Urgency; weight: number;
}

const URGENCY: Record<Urgency, { dot: string; text: string }> = {
  overdue: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  today: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  urgent: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  soon: { dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  relaxed: { dot: 'bg-foreground/25', text: 'text-subtle' },
};

/** El plazo en palabras: "1d" no distingue si ya venció o si falta un día. */
function dueLabel(daysLeft: number): string {
  if (daysLeft < -1) return `Venció hace ${Math.abs(daysLeft)} días`;
  if (daysLeft === -1) return 'Venció ayer';
  if (daysLeft === 0) return 'Vence hoy';
  if (daysLeft === 1) return 'Vence mañana';
  if (daysLeft <= 7) return `En ${daysLeft} días`;
  return `En ${Math.ceil(daysLeft / 7)} semanas`;
}

export default function StudentDashboardViewV2({
  user, semester, coursesData, activeQuizzes = [],
}: {
  user: UserInfo | null;
  semester: Semester | null;
  coursesData: CourseWithMeta[];
  activeQuizzes?: ActiveQuiz[];
}) {
  const reduce = useReducedMotion();

  const pending = useMemo((): Pending[] => {
    // Días calendario en hora Colombia, no milisegundos: "vence hoy" significa
    // el mismo día, sea la hora que sea. Además así el servidor y el cliente
    // calculan lo mismo y no hay desajuste de hidratación.
    const today = nowColombia();
    today.setHours(0, 0, 0, 0);
    const items: Pending[] = [];
    for (const cd of coursesData) {
      for (const act of cd.activities) {
        if (act.status !== 'published') continue;
        if (cd.submissions.some((s) => s.activityId === act.id)) continue;
        const due = parseDateColombia(act.dueDate);
        const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);
        const urgency: Urgency =
          daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today'
          : daysLeft <= 2 ? 'urgent' : daysLeft <= 7 ? 'soon' : 'relaxed';
        items.push({
          id: act.id, title: act.title, courseName: cd.course.name,
          courseId: cd.course.id, daysLeft, urgency, weight: act.weight,
        });
      }
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [coursesData]);

  /**
   * Nota por curso y promedio del semestre.
   * La nota viene del servidor (`finalScore`), que ya pondera parciales y
   * notas manuales; recalcularla aquí daba un número distinto al de la
   * vista de notas en los cursos que los usan.
   */
  const perCourse = useMemo(() => coursesData.map((cd) => ({
    cd,
    score: cd.finalScore ?? null,
    gradedCount: cd.grades.length,
    total: cd.activities.length,
    pending: pending.filter((p) => p.courseId === cd.course.id).length,
  })), [coursesData, pending]);

  const scored = perCourse.filter((c) => c.score !== null);
  const average = scored.length > 0
    ? scored.reduce((a, c) => a + (c.score as number), 0) / scored.length
    : null;

  const recentGrades = useMemo(() => {
    const out = coursesData.flatMap((cd) => cd.grades.filter((g) => g.isPublished).map((g) => ({
      key: g.id,
      title: cd.activities.find((a) => a.id === g.activityId)?.title ?? 'Actividad',
      courseName: cd.course.name,
      score: normalize(g.score, g.maxScore),
      gradedAt: g.gradedAt,
    })));
    return out.sort((a, b) => +new Date(b.gradedAt) - +new Date(a.gradedAt)).slice(0, 5);
  }, [coursesData]);

  const next = pending[0];
  const fade = (d = 0) => reduce ? {} : {
    initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 },
    transition: { delay: d, duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Saludo ── */}
      <motion.div {...fade(0)}>
        <h1 className="type-page text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Hola, {user?.firstName ?? 'estudiante'}
        </h1>
        <p className="text-sm text-subtle mt-1">
          {semester ? `Semestre ${semester.label}` : 'Sin semestre activo'}
          {' · '}{coursesData.length} {coursesData.length === 1 ? 'curso' : 'cursos'}
        </p>
      </motion.div>

      {/* ── Lo que importa ahora ── */}
      <motion.div {...fade(0.04)} className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* Lo siguiente que hay que entregar */}
        {next ? (
          <Link
            href={`/student/courses/${next.courseId}/activities/${next.id}`}
            className="group rounded-2xl border border-surface-border bg-surface p-5
                       transition-colors duration-[var(--dur-fast)]
                       hover:border-surface-border-hover hover:bg-surface-hover
                       active:bg-surface-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
          >
            <p className="text-meta uppercase tracking-wider text-subtle flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Lo siguiente
            </p>
            <p className="text-lg font-semibold text-foreground mt-1.5 leading-snug">{next.title}</p>
            <p className="text-xs text-subtle mt-0.5">{next.courseName} · vale {next.weight}%</p>
            <p className={`text-sm font-medium mt-2 flex items-center gap-1.5 ${URGENCY[next.urgency].text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${URGENCY[next.urgency].dot}`} />
              {dueLabel(next.daysLeft)}
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-surface-border bg-surface p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Estás al día</p>
              <p className="text-xs text-subtle mt-0.5">No tienes entregas pendientes.</p>
            </div>
          </div>
        )}

        {/* Cómo vas */}
        <div className="rounded-2xl border border-surface-border bg-surface p-5 md:min-w-[13rem]">
          <p className="text-meta uppercase tracking-wider text-subtle">Vas por</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className={`text-4xl font-bold tabular-nums leading-none ${gradeText(average)}`}>
              {formatScore(average)}
            </span>
            <span className="text-xs text-subtle">/ 5.0</span>
          </div>
          <p className="text-meta text-subtle mt-2">
            {average === null
              ? 'Aún no tienes notas'
              : `Promedio de ${scored.length} ${scored.length === 1 ? 'curso' : 'cursos'}`}
          </p>
          {average !== null && (
            <p className={`text-meta mt-1 ${average >= PASS ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {average >= PASS ? 'Vas aprobando' : 'Vas perdiendo'}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Parciales abiertos ──
           Van antes que todo lo demás: un parcial con ventana abierta es lo
           más urgente del panel, y si se cierra no hay vuelta atrás. */}
      {activeQuizzes.length > 0 && (
        <motion.section {...fade(0.06)}>
          {/* El parcial abierto manda: si se cierra la ventana no hay
              vuelta atrás. Pesa más que el resto de secciones. */}
          <h2 className="text-base font-semibold text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            {activeQuizzes.length === 1 ? 'Parcial abierto' : `Parciales abiertos (${activeQuizzes.length})`}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeQuizzes.map((aq) => (
              <Link
                key={aq.quiz.id}
                href={`/student/courses/${aq.courseId}/quizzes/${aq.quiz.id}`}
                className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-4
                           transition-colors duration-[var(--dur-fast)]
                           hover:border-cyan-500/40 hover:bg-cyan-500/[0.10]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{aq.quiz.title}</p>
                    <p className="text-meta text-subtle mt-0.5">{aq.courseName}</p>
                  </div>
                  <span className={`text-micro px-1.5 py-0.5 rounded border shrink-0 ${
                    aq.quiz.type === 'training'
                      ? 'border-amber-500/25 text-amber-600 dark:text-amber-400'
                      : 'border-cyan-500/25 text-cyan-600 dark:text-cyan-400'
                  }`}>
                    {aq.quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-micro text-faint flex-wrap">
                  <span>{aq.quiz.questions.length} preguntas</span>
                  {aq.quiz.timeLimit && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{aq.quiz.timeLimit} min</span>
                  )}
                  {aq.quiz.maxAttempts > 0 && (
                    <span>{aq.quiz.maxAttempts} intento{aq.quiz.maxAttempts !== 1 ? 's' : ''}</span>
                  )}
                  {aq.quiz.endDate && <span>Hasta {formatDateShort(aq.quiz.endDate)}</span>}
                  {aq.quiz.lockBrowser && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Shield className="w-3 h-3" />Navegador bloqueado
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Cursos ── */}
      <motion.section {...fade(0.08)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="type-section text-subtle flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Mis cursos
          </h2>
          {/* Tenía 16px de alto: por debajo de cualquier mínimo táctil. */}
          <Link href="/student/courses"
            className="text-meta text-cyan-600 dark:text-cyan-400 hover:underline
                       inline-flex items-center min-h-11 px-2 -mr-2 rounded-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {perCourse.map(({ cd, score, gradedCount, total, pending: p }) => (
            <CourseCard
              key={cd.course.id}
              course={cd.course}
              score={score}
              gradedCount={gradedCount}
              totalActivities={total}
              pendingCount={p}
            />
          ))}
        </div>
      </motion.section>

      {/* ── Pendientes y notas ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section {...fade(0.12)}>
          <h2 className="type-section text-subtle mb-3">
            Pendientes ({pending.length})
          </h2>
          {pending.length > 0 ? (
            <div className="rounded-xl border border-surface-border divide-y divide-foreground/[0.06] overflow-hidden">
              {pending.map((p) => (
                <Link
                  key={p.id}
                  href={`/student/courses/${p.courseId}/activities/${p.id}`}
                  className="flex items-center gap-3 p-3.5 bg-surface
                             transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${URGENCY[p.urgency].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">{p.title}</p>
                    <p className="text-meta text-subtle mt-0.5">{p.courseName} · {p.weight}%</p>
                  </div>
                  <span className={`text-meta shrink-0 text-right ${URGENCY[p.urgency].text}`}>
                    {dueLabel(p.daysLeft)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState compact kind="done" title="Nada pendiente"
              description="Vas al día con todas tus entregas." />
          )}
        </motion.section>

        <motion.section {...fade(0.16)}>
          <h2 className="type-section text-subtle mb-3">
            Notas recientes
          </h2>
          {recentGrades.length > 0 ? (
            <div className="rounded-xl border border-surface-border divide-y divide-foreground/[0.06] overflow-hidden">
              {recentGrades.map((g) => (
                <div key={g.key} className="flex items-center gap-3 p-3.5 bg-surface">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">{g.title}</p>
                    <p className="text-meta text-subtle mt-0.5">{g.courseName}</p>
                  </div>
                  {/* El número lleva el color, no la tarjeta entera: si no, el
                      color de rendimiento compite con el de urgencia. */}
                  <span className={`text-lg font-semibold tabular-nums shrink-0 ${gradeText(g.score)}`}>
                    {g.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact kind="empty" title="Sin notas todavía"
              description="Aquí aparecerán tus notas cuando el docente las publique." />
          )}
        </motion.section>
      </div>
    </div>
  );
}

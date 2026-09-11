'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { Users, GraduationCap, AlertTriangle, ClipboardCheck, Clock } from 'lucide-react';
import { gradeText, formatScore, PASS, COMFORTABLE } from '@/lib/gradeScale';
import StatTile from '@/components/ui/StatTile';
import type { Course, Semester, CourseGradeSummary, CourseSchedule } from '@/lib/types';

/**
 * CourseOverviewTab — resumen del curso como panel, no como ficha.
 *
 * Antes esta pestaña mostraba descripción, metadatos y horarios: información
 * que no cambia nunca y que no responde ninguna pregunta. Un docente abre el
 * resumen de un curso para saber cómo va el grupo, no para releer la
 * descripción que él mismo escribió.
 *
 * Sobre los colores de la distribución: son los mismos de estado que usa el
 * resto de la aplicación (perdiendo / en riesgo / bien). El validador de
 * paleta marca su banda de luminosidad, pero las variantes que la cumplen
 * fallan el suelo de visión normal —rojo y ámbar quedan a ΔE 14.4, casi
 * indistinguibles— y además romperían la coherencia con todos los demás
 * indicadores del sistema. Se compensa con codificación secundaria: cada
 * tramo lleva su etiqueta y su conteo, nunca solo el color.
 */

const BANDS = [
  { key: 'fail', label: 'Perdiendo', hint: 'menos de 3.0', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { key: 'warn', label: 'En riesgo', hint: '3.0 a 3.9', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'good', label: 'Bien', hint: '4.0 o más', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'none', label: 'Sin nota', hint: 'aún no calificados', bar: 'bg-foreground/20', text: 'text-faint' },
] as const;

export default function CourseOverviewTab({
  course, semester,
}: {
  course: Course;
  semester?: Semester;
}) {
  const reduce = useReducedMotion();
  const [summary, setSummary] = useState<CourseGradeSummary | null>(null);
  /** Qué banda se está mirando abajo; sale de tocar la barra o la métrica. */
  const [focus, setFocus] = useState<'fail' | 'warn' | 'good' | 'none' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${course.id}/grades`, { credentials: 'include' });
      if (res.ok) setSummary(await res.json());
    } catch { /* el panel se degrada a la información del curso */ } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { load(); }, [load]);

  const m = useMemo(() => {
    const students = summary?.students ?? [];
    const scored = students.filter((s) => s.finalScore !== null);
    const avg = scored.length > 0
      ? scored.reduce((a, s) => a + (s.finalScore as number), 0) / scored.length
      : null;

    const counts = { fail: 0, warn: 0, good: 0, none: 0 };
    for (const s of students) {
      if (s.finalScore === null) counts.none++;
      else if (s.finalScore < PASS) counts.fail++;
      else if (s.finalScore < COMFORTABLE) counts.warn++;
      else counts.good++;
    }

    // Celdas sin nota en la tabla: lo que falta por calificar.
    const acts = summary?.activities ?? [];
    const ungraded = students.reduce(
      (a, s) => a + acts.filter((act) => !s.grades[act.id]).length, 0);

    return {
      students, total: students.length, avg, counts, ungraded,
      atRisk: students
        .filter((s) => s.finalScore !== null && (s.finalScore as number) < PASS)
        .sort((a, b) => (a.finalScore as number) - (b.finalScore as number)),
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-surface-border bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Números que responden preguntas ── */}
      {/*
        Cada número lleva a su origen. Un tablero cuyos datos no se pueden
        abrir obliga a salir a buscarlos a mano, y entonces no ahorra trabajo.
      */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Inscritos" value={String(m.total)}
          href={`/admin/courses/${course.id}/students`}
          hint="ver la lista" />
        <StatTile icon={GraduationCap} label="Promedio del curso"
          value={formatScore(m.avg)} tone={gradeText(m.avg)}
          href={`/admin/courses/${course.id}/grades`}
          hint="ver todas las notas" />
        <StatTile icon={AlertTriangle} label="Van perdiendo"
          value={String(m.counts.fail)}
          tone={m.counts.fail > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={m.counts.fail > 0 ? 'border-red-500/25 bg-red-500/[0.06]' : undefined}
          onClick={m.counts.fail > 0 ? () => setFocus('fail') : undefined}
          hint={m.counts.fail > 0 ? 'ver quiénes' : 'ninguno'} />
        <StatTile icon={ClipboardCheck} label="Notas sin poner"
          value={String(m.ungraded)}
          tone={m.ungraded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={m.ungraded > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : undefined}
          href={`/admin/courses/${course.id}/activities`}
          hint={m.ungraded > 0 ? 'ir a calificar' : 'todo al día'} />
      </div>

      {/* ── Distribución ── */}
      {m.total > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
            Cómo va el grupo
          </h3>
          {/* Barra segmentada con 2px de separación entre tramos. */}
          <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.06] gap-0.5">
            {BANDS.map((b, i) => {
              const n = m.counts[b.key];
              if (n === 0) return null;
              return (
                /*
                  Propósito: EXPLICACIÓN. Los tramos entran de izquierda a
                  derecha, escalonados, para que se lea el reparto del grupo
                  en vez de aparecer como un bloque ya hecho. Se ve una vez al
                  abrir el curso, así que entra en el tramo "ocasional".
                  scaleX y no width: no obliga a recalcular la maqueta.
                */
                <motion.button
                  key={b.key}
                  onClick={() => setFocus((v) => v === b.key ? null : b.key)}
                  aria-pressed={focus === b.key}
                  title={`${b.label}: ${n} de ${m.total} · tocar para ver quiénes`}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduce ? 0 : 0.28, delay: reduce ? 0 : i * 0.06,
                                ease: [0.23, 1, 0.32, 1] }}
                  style={{ width: `${(n / m.total) * 100}%`, transformOrigin: 'left' }}
                  className={`h-full cursor-pointer origin-left
                              transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)]
                              ${b.bar} ${focus && focus !== b.key ? 'opacity-30' : ''}`}
                />
              );
            })}
          </div>
          {/* Etiqueta y conteo por tramo: la identidad nunca depende del color solo. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {BANDS.map((b) => (
              <button key={b.key} onClick={() => setFocus((v) => v === b.key ? null : b.key)}
                aria-pressed={focus === b.key}
                className={`flex items-start gap-2 text-left rounded-lg p-1 -m-1 cursor-pointer
                            transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover
                            ${focus === b.key ? 'bg-surface-hover' : ''}`}>
                <span className={`w-2 h-2 rounded-sm mt-1.5 shrink-0 ${b.bar}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold tabular-nums ${b.text}`}>
                    {m.counts[b.key]}
                  </p>
                  <p className="text-micro text-subtle leading-tight">
                    {b.label}
                    <span className="block text-faint">{b.hint}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/*
        La lista responde al filtro. Antes mostraba siempre y solo a los que
        van perdiendo; ahora tocar un tramo de la barra o una métrica muestra
        exactamente a ese grupo, que es de lo que sirve un tablero.
      */}
      {(() => {
        const band = focus ?? 'fail';
        const list = m.students
          .filter((s) => {
            if (s.finalScore === null) return band === 'none';
            if (band === 'fail') return s.finalScore < PASS;
            if (band === 'warn') return s.finalScore >= PASS && s.finalScore < COMFORTABLE;
            if (band === 'good') return s.finalScore >= COMFORTABLE;
            return false;
          })
          .sort((a, b) => (a.finalScore ?? 0) - (b.finalScore ?? 0));
        const meta = BANDS.find((b) => b.key === band)!;

        if (list.length === 0) return null;
        return (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm ${meta.bar}`} />
                {meta.label} ({list.length})
              </h3>
              {focus && (
                <button onClick={() => setFocus(null)}
                  className="text-meta text-subtle hover:text-foreground transition-colors cursor-pointer px-2 py-1">
                  Quitar filtro
                </button>
              )}
            </div>
            {/*
              Propósito: EVITAR UN CAMBIO BRUSCO. Al filtrar, la lista cambia
              de contenido en el sitio; sin transición el bloque se
              teletransporta y cuesta ver que respondió al toque. Un fundido
              corto lo enlaza. No se anima cada fila: el usuario está leyendo
              datos y no deben moverse por estética.
            */}
            <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={band}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden"
            >
              {list.slice(0, 12).map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/students/${s.id}?from=${course.id}`}
                  className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-hover
                             transition-colors duration-[var(--dur-fast)]"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.bar}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90 leading-snug">
                      {s.lastName}, {s.firstName}
                    </p>
                    <p className="text-micro text-subtle mt-0.5">{s.email}</p>
                  </div>
                  <span className={`text-lg font-semibold tabular-nums shrink-0 ${gradeText(s.finalScore)}`}>
                    {formatScore(s.finalScore)}
                  </span>
                </Link>
              ))}
            </motion.div>
            </AnimatePresence>
            {list.length > 12 && (
              <p className="text-micro text-faint mt-2">
                y {list.length - 12} más · <Link href={`/admin/courses/${course.id}/grades`}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline">ver la tabla completa</Link>
              </p>
            )}
          </div>
        );
      })()}

      {/* ── La información del curso, ahora al final y compacta ── */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-subtle">
          <span className="font-mono">{course.code}</span>
          <span>{semester?.label ?? course.semesterId}</span>
          <span>{course.isActive ? 'Activo' : 'Inactivo'}</span>
          {course.schedule.map((slot: CourseSchedule, i: number) => (
            <span key={i} className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="capitalize">{slot.dayOfWeek}</span> {slot.startTime}–{slot.endTime}
              {slot.room && ` · ${slot.room}`}
            </span>
          ))}
        </div>
        {course.description && (
          <p className="text-sm text-muted leading-relaxed">{course.description}</p>
        )}
      </div>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, MessageSquareText } from 'lucide-react';
import { formatDateColombia } from '@/lib/dateUtils';
import type { StudentGradeSummary } from '@/lib/types';

/**
 * StudentGradesViewV2 — Rediseño de la vista de notas del estudiante.
 *
 * Cambios de fondo respecto a la vista actual:
 * - La respuesta a "¿cómo voy?" va arriba, no al final de ocho tarjetas.
 * - Una sola escala de color en todo el archivo (antes 3.0 era ámbar en un
 *   sitio y verde en otro).
 * - Las actividades son filas, no tarjetas con un número gigante cada una:
 *   así el corte y la definitiva son los que mandan visualmente.
 * - Se quita la etiqueta "Reprobado" por actividad: una actividad no se
 *   aprueba ni se pierde, el curso sí.
 * - El escalonado de la animación va acotado, no crece con el índice.
 */

const PASS = 3.0;
const SCALE = 5.0;

type Props = { data: StudentGradeSummary };

export default function StudentGradesViewV2({ data }: Props) {
  const reduce = useReducedMotion();

  const cortes = data.cortes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const activities = data.activities.filter((a) => a.corteId === c.id);
      const graded = activities.filter((a) => a.grade !== null).length;
      return {
        ...c,
        activities,
        graded,
        score: data.corteScores[c.id] ?? null,
        state: graded === 0
          ? ('pendiente' as const)
          : graded === activities.length
            ? ('cerrado' as const)
            : ('en curso' as const),
      };
    });

  const unassigned = data.activities.filter((a) => !a.corteId);
  const gradedCount = data.activities.filter((a) => a.grade !== null).length;

  // Proyección: qué promedio necesita en lo que falta para llegar a 3.0.
  // Solo cuenta cortes sin ninguna nota como "pendientes".
  const lockedWeight = cortes.filter((c) => c.score !== null).reduce((a, c) => a + c.weight, 0);
  const lockedPoints = cortes
    .filter((c) => c.score !== null)
    .reduce((a, c) => a + (c.score as number) * c.weight, 0) / 100;
  const remainingWeight = cortes.filter((c) => c.score === null).reduce((a, c) => a + c.weight, 0);
  const needed = remainingWeight > 0
    ? ((PASS - lockedPoints) / (remainingWeight / 100))
    : null;

  const fade = (delay = 0) => reduce
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <div className="space-y-6">
      {/* ── ¿Cómo voy? ── */}
      <motion.section
        {...fade(0)}
        className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-subtle">
                {data.isPartial ? 'Vas por' : 'Nota definitiva'}
              </p>
              {data.finalScore !== null ? (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-5xl font-bold tabular-nums leading-none ${toneText(data.finalScore)}`}>
                    {data.finalScore.toFixed(1)}
                  </span>
                  <span className="text-sm text-subtle">/ 5.0</span>
                </div>
              ) : (
                <p className="text-2xl font-semibold text-faint mt-1">Sin notas aún</p>
              )}
              {data.finalScore !== null && data.isPartial && (
                <p className="text-[11px] text-subtle mt-1.5 max-w-xs">
                  Calculado solo sobre lo ya calificado ({lockedWeight}% del curso).
                </p>
              )}
            </div>

            {data.finalScore !== null && (
              <div className="text-right">
                <StatusPill score={data.finalScore} partial={data.isPartial} />
                {needed !== null && needed > 0 && needed <= SCALE && (
                  <p className="text-[11px] text-subtle mt-2 max-w-[16rem]">
                    Necesitas <span className="font-semibold text-foreground tabular-nums">{needed.toFixed(1)}</span> en
                    {' '}el {remainingWeight}% restante para pasar con 3.0.
                  </p>
                )}
                {needed !== null && needed <= 0 && (
                  <p className="text-[11px] text-emerald-400 mt-2 max-w-[16rem]">
                    Ya aseguraste el 3.0 aunque no entregues nada más.
                  </p>
                )}
                {needed !== null && needed > SCALE && (
                  <p className="text-[11px] text-red-400 mt-2 max-w-[16rem]">
                    Con el {remainingWeight}% que queda ya no alcanza para 3.0.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tira de cortes */}
          <div className="grid gap-2 mt-5" style={{ gridTemplateColumns: `repeat(${cortes.length || 1}, minmax(0,1fr))` }}>
            {cortes.map((c) => (
              <div
                key={c.id}
                title={`${c.name} — ${c.weight}% de la definitiva · ${c.state}`}
                className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted truncate">{c.name}</span>
                  <span className="text-[10px] text-faint tabular-nums shrink-0">{c.weight}%</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums mt-1 leading-none ${c.score === null ? 'text-faint' : toneText(c.score)}`}>
                  {c.score === null ? '—' : c.score.toFixed(1)}
                </p>
                <div className="relative h-1 rounded-full bg-foreground/[0.08] overflow-hidden mt-2">
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${((c.score ?? 0) / SCALE) * 100}%` }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full ${toneBar(c.score)}`}
                  />
                </div>
                <p className="text-[10px] text-faint mt-1.5">
                  {c.state === 'pendiente' ? 'Sin calificar' : `${c.graded}/${c.activities.length} calificadas`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-2.5 border-t border-foreground/[0.06] bg-foreground/[0.01]">
          <p className="text-[11px] text-subtle">
            {gradedCount} de {data.activities.length} actividades calificadas
          </p>
        </div>
      </motion.section>

      {/* ── Cortes ── */}
      {cortes.map((c, i) => (
        <motion.section key={c.id} {...fade(Math.min(0.04 * (i + 1), 0.12))}>
          <header className="flex items-center justify-between gap-3 mb-2 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{c.name}</h2>
              <span className="text-[10px] text-faint tabular-nums">{c.weight}%</span>
              <StateTag state={c.state} />
            </div>
            {c.score !== null && (
              <span className={`text-sm font-bold tabular-nums ${toneText(c.score)}`}>
                {c.score.toFixed(1)}
              </span>
            )}
          </header>

          {c.activities.length > 0 ? (
            <div className="rounded-xl border border-foreground/[0.08] divide-y divide-foreground/[0.06] overflow-hidden">
              {c.activities.map((a) => <ActivityRow key={a.id} activity={a} reduce={!!reduce} />)}
            </div>
          ) : (
            <p className="text-xs text-subtle italic px-1 py-4">Sin actividades en este corte.</p>
          )}
        </motion.section>
      ))}

      {unassigned.length > 0 && (
        <motion.section {...fade(0.14)}>
          <h2 className="text-sm font-semibold text-foreground mb-2 px-1">Otras actividades</h2>
          <div className="rounded-xl border border-foreground/[0.08] divide-y divide-foreground/[0.06] overflow-hidden">
            {unassigned.map((a) => <ActivityRow key={a.id} activity={a} reduce={!!reduce} />)}
          </div>
        </motion.section>
      )}
    </div>
  );
}

/** Fila de actividad: compacta, con la retroalimentación plegada. */
function ActivityRow({ activity, reduce }: { activity: StudentGradeSummary['activities'][number]; reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const g = activity.grade;
  const normalized = g ? (g.score / g.maxScore) * SCALE : null;
  const hasFeedback = Boolean(g?.feedback);

  return (
    <div className="bg-foreground/[0.01]">
      <div className="flex items-center gap-3 p-3 sm:p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground/90 leading-snug">{activity.title}</p>
          <p className="text-[11px] text-subtle mt-0.5">
            {TYPE_LABELS[activity.type] ?? activity.type} · {activity.weight}% del corte
          </p>
        </div>

        {hasFeedback && (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title="Ver retroalimentación"
            className="shrink-0 p-2 rounded-lg text-subtle hover:text-cyan-400 hover:bg-cyan-500/10
                       transition-colors cursor-pointer active:scale-[0.97]"
          >
            <MessageSquareText className="w-4 h-4" />
          </button>
        )}

        <div className="shrink-0 text-right min-w-[3.5rem]">
          {normalized !== null ? (
            <>
              <p className={`text-lg font-semibold tabular-nums leading-none ${toneText(normalized)}`}>
                {normalized.toFixed(1)}
              </p>
              <p className="text-[10px] text-faint tabular-nums mt-0.5">
                {g!.score}/{g!.maxScore}
              </p>
            </>
          ) : (
            <span className="text-[11px] text-faint">Pendiente</span>
          )}
        </div>

        {hasFeedback && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {hasFeedback && open && (
        <motion.div
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="px-3 sm:px-3.5 pb-3.5 -mt-0.5">
            <div className="rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] p-3">
              <p className="text-sm text-muted leading-relaxed">{g!.feedback}</p>
              <p className="text-[10px] text-faint mt-2">
                Calificado el {formatDateColombia(g!.gradedAt)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatusPill({ score, partial }: { score: number; partial: boolean }) {
  const passing = score >= PASS;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
      ${passing
        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        : 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20'}`}>
      {passing ? 'Vas aprobando' : 'Vas perdiendo'}{partial ? ' (parcial)' : ''}
    </span>
  );
}

function StateTag({ state }: { state: 'cerrado' | 'en curso' | 'pendiente' }) {
  const styles = {
    'cerrado': 'text-emerald-500/80 border-emerald-500/20',
    'en curso': 'text-cyan-400 border-cyan-500/25',
    'pendiente': 'text-faint border-foreground/10',
  }[state];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles}`}>{state}</span>
  );
}

const TYPE_LABELS: Record<string, string> = {
  project: 'Proyecto', exercise: 'Ejercicio', document: 'Documento',
  presentation: 'Presentación', prompt: 'Prompt', exam: 'Examen',
  quiz: 'Parcial', manual: 'Nota manual', other: 'Otro',
};

/** Escala única de color: <3.0 pierde, 3.0–3.9 pasa justo, ≥4.0 bien. */
function toneText(score: number): string {
  if (score >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= PASS) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function toneBar(score: number | null): string {
  if (score === null) return 'bg-transparent';
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= PASS) return 'bg-amber-500';
  return 'bg-red-500';
}

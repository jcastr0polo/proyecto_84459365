'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock, PenLine, TrendingDown, ChevronRight } from 'lucide-react';
import { gradeText, formatScore } from '@/lib/gradeScale';
import { toneBox, toneText } from '@/lib/semantics';

export interface ReportDeadline {
  courseId: string; courseName: string;
  corteId: string; corteName: string;
  deadline: string; days: number;
  itemsTotal: number; pendingItems: number; missingGrades: number;
  worst: { title: string; missing: number }[];
}

export interface QueueItem {
  activityId: string; title: string;
  courseId: string; courseName: string; corteName: string | null;
  pending: number;
  reportInDays: number | null; dueInDays: number | null; urgencyDays: number | null;
}

export interface AtRiskStudent {
  studentId: string; studentName: string;
  courseId: string; courseName: string;
  score: number; progressPct: number | null;
}

/** El plazo en palabras. Una fecha suelta no dice si aprieta o no. */
function plazo(d: number | null): string | null {
  if (d === null) return null;
  if (d < 0) return `venció hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}`;
  if (d === 0) return 'vence hoy';
  if (d === 1) return 'vence mañana';
  return `en ${d} días`;
}

const tonoPorDias = (d: number | null) =>
  d === null ? 'text-subtle'
    : d <= 0 ? toneText.critical
    : d <= 7 ? toneText.attention
    : 'text-subtle';

/**
 * Lo que aprieta, arriba del todo.
 *
 * El panel enseñaba conteos —cuántos cursos, cuántos estudiantes, cuántas
 * entregas— y para saber qué hacer con ellos había que entrar curso por curso.
 * Estas tres secciones responden las preguntas con las que un docente abre
 * esto entre clases: qué se me vence, qué califico primero, y a quién estoy a
 * punto de perder.
 *
 * El orden no es casual: primero lo que tiene fecha institucional encima,
 * después el trabajo que lleva a cumplirla, y al final lo que necesita una
 * conversación y no una tarde de calificar.
 */
export default function DashboardPriorities({
  reportDeadlines = [], gradingQueue = [], atRisk = [],
}: {
  reportDeadlines?: ReportDeadline[];
  gradingQueue?: QueueItem[];
  atRisk?: AtRiskStudent[];
}) {
  /* Solo lo que está a tiro: un reporte a dos meses no es una prioridad, es
     ruido que empuja hacia abajo lo que sí urge. */
  const proximos = reportDeadlines.filter((r) => r.days <= 21);
  const cola = gradingQueue.slice(0, 6);
  const riesgo = atRisk.slice(0, 8);

  if (proximos.length === 0 && cola.length === 0 && riesgo.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* ── 1 · Reportes de notas ── */}
      {proximos.length > 0 && (
        <section>
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
            Reporte de notas
          </h2>
          <div className="space-y-2">
            {proximos.map((r) => {
              const urge = r.days <= 7;
              return (
                <Link
                  key={`${r.courseId}-${r.corteId}`}
                  href={`/admin/courses/${r.courseId}/grades`}
                  className={`block rounded-xl border p-4 transition-colors duration-[var(--dur-fast)]
                              hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-cyan-500/40
                              ${urge ? (r.days <= 0 ? toneBox.critical : toneBox.attention) : 'border-surface-border bg-surface'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {r.courseName} <span className="text-subtle font-normal">· {r.corteName}</span>
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${tonoPorDias(r.days)}`}>
                        {plazo(r.days)}
                      </p>
                      {/* La fecha sola no basta: lo accionable es qué falta. */}
                      {r.missingGrades > 0 ? (
                        <p className="text-xs text-subtle mt-1.5">
                          Faltan <strong className="text-foreground">{r.missingGrades}</strong> notas
                          {' '}en {r.pendingItems} {r.pendingItems === 1 ? 'ítem' : 'ítems'}
                          {r.worst.length > 0 && (
                            <span className="text-faint"> · {r.worst.map((w) => w.title).join(', ')}</span>
                          )}
                        </p>
                      ) : (
                        <p className={`text-xs mt-1.5 ${toneText.ok}`}>
                          Todo calificado, listo para reportar
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-faint shrink-0 mt-0.5" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 2 · Cola de calificación ── */}
      {cola.length > 0 && (
        <section>
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <PenLine className="w-4 h-4" aria-hidden="true" />
            Por calificar, lo que más urge primero
          </h2>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
            {cola.map((q) => (
              <Link
                key={q.activityId}
                href={`/admin/courses/${q.courseId}/activities/${q.activityId}/grades`}
                className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-hover
                           transition-colors duration-[var(--dur-fast)]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
                           focus-visible:ring-cyan-500/40"
              >
                <span className={`text-lg font-bold tabular-nums shrink-0 w-8 text-right
                                  ${q.urgencyDays !== null && q.urgencyDays <= 7 ? toneText.attention : 'text-foreground'}`}>
                  {q.pending}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 truncate">{q.title}</p>
                  <p className="text-xs text-subtle truncate">{q.courseName}</p>
                  {/*
                    El motivo de la urgencia va en su propio renglón.
                    Pegado al nombre del curso se cortaba en móvil —"LÓGICA Y
                    PROGRAMACIÓN · reporte e…"— y justo eso es lo que explica
                    por qué esta fila está arriba. Truncar la razón del orden
                    deja la lista pareciendo arbitraria.
                  */}
                  {q.reportInDays !== null ? (
                    <p className={`text-xs ${tonoPorDias(q.reportInDays)}`}>
                      Reporte {plazo(q.reportInDays)}
                    </p>
                  ) : q.dueInDays !== null && q.dueInDays < 0 ? (
                    <p className={`text-xs ${toneText.attention}`}>Entrega {plazo(q.dueInDays)}</p>
                  ) : null}
                </div>
                <ChevronRight className="w-4 h-4 text-faint shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {gradingQueue.length > cola.length && (
            <p className="text-xs text-subtle mt-2 px-1">
              y {gradingQueue.length - cola.length} más con menos urgencia
            </p>
          )}
        </section>
      )}

      {/* ── 3 · Estudiantes en riesgo ── */}
      {riesgo.length > 0 && (
        <section>
          <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" aria-hidden="true" />
            Van perdiendo
          </h2>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
            {riesgo.map((s) => (
              <Link
                key={`${s.studentId}-${s.courseId}`}
                href={`/admin/students/${s.studentId}`}
                className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-hover
                           transition-colors duration-[var(--dur-fast)]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
                           focus-visible:ring-cyan-500/40"
              >
                <span className={`text-lg font-bold tabular-nums shrink-0 w-10 ${gradeText(s.score)}`}>
                  {formatScore(s.score)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 truncate">{s.studentName}</p>
                  <p className="text-xs text-subtle truncate">{s.courseName}</p>
                  {/* Cuánto lleva cursado dice si aún hay margen de arreglarlo
                      o si ya está casi decidido. Se corta si va en la misma
                      línea que el nombre del curso. */}
                  {s.progressPct !== null && (
                    <p className="text-xs text-faint">{s.progressPct}% del curso cursado</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-faint shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {atRisk.length > riesgo.length && (
            <p className="text-xs text-subtle mt-2 px-1">
              y {atRisk.length - riesgo.length} más por debajo de 3.0
            </p>
          )}
        </section>
      )}
    </div>
  );
}

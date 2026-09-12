'use client';

import React, { useState } from 'react';
import type { CourseGradeSummary } from '@/lib/types';
import { ChevronDown } from 'lucide-react';
import { gradeText, formatScore } from '@/lib/gradeScale';
import { tableChrome } from '@/components/ui/Table';

/** Ajuste vigente sobre una nota calculada. corteId null = definitiva. */
export interface Adjustment {
  studentId: string;
  corteId: string | null;
  score: number;
  reason: string;
  isPublished: boolean;
}

interface GradeSummaryTableProps {
  data: CourseGradeSummary;
  className?: string;
  /** Si se pasa, las notas de corte y la definitiva se vuelven ajustables. */
  onAdjust?: (studentId: string, corteId: string | null) => void;
  adjustments?: Adjustment[];
}

const adjKey = (studentId: string, corteId: string | null) => `${studentId}:${corteId ?? 'final'}`;

/**
 * GradeSummaryTable — Pivot table with corte grouping
 * Columns grouped by corte: [Corte 1: Act1 Act2 | Nota Corte] [Corte 2: ...] [Sin Corte: ...] | Definitiva
 */
export default function GradeSummaryTable({
  data, className = '', onAdjust, adjustments = [],
}: GradeSummaryTableProps) {
  const adjMap = new Map(adjustments.map((a) => [adjKey(a.studentId, a.corteId), a]));
  const { activities, cortes } = data;
  const students = [...data.students].sort((a, b) =>
    a.lastName.localeCompare(b.lastName, 'es') || a.firstName.localeCompare(b.firstName, 'es')
  );
  /*
   * Con cortes, la definitiva sale de ponderar las notas de corte por su peso,
   * no de sumar los pesos de los ítems. Poner "300%" bajo DEFINITIVA —la suma
   * de los pesos internos de tres cortes— decía algo que ya no es cierto.
   */
  const totalWeight = cortes.length > 0
    ? cortes.reduce((a, c) => a + c.weight, 0)
    : activities.reduce((a, b) => a + b.weight, 0);
  const hasCortes = cortes.length > 0;

  // Group activities by corte
  const corteGroups = hasCortes
    ? cortes.map((corte) => ({
        ...corte,
        activities: activities.filter((a) => a.corteId === corte.id),
      }))
    : [];

  // Activities without corte
  const unassignedActivities = activities.filter((a) => !a.corteId);
  const hasUnassigned = unassignedActivities.length > 0;

  // Flat activity order for data rows
  const orderedActivities = hasCortes
    ? [...corteGroups.flatMap((g) => g.activities), ...unassignedActivities]
    : activities;

  // Per-activity averages
  const activityAverages = new Map(
    orderedActivities.map((act) => {
      const scores = students
        .map((s) => s.grades[act.id])
        .filter((g): g is NonNullable<typeof g> => g !== null)
        .map((g) => (g.score / g.maxScore) * 5);
      return [act.id, scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null];
    })
  );

  // Per-corte averages
  const corteAverages = new Map(
    cortes.map((corte) => {
      const scores = students
        .map((s) => s.corteScores[corte.id])
        .filter((s): s is number => s !== null);
      return [corte.id, scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null];
    })
  );

  return (
    <div className={className}>
      {/*
        En móvil, una tarjeta por estudiante en vez de una tabla ancha.
        Una tabla de estudiantes × actividades a 390px obliga a arrastrar en
        horizontal perdiendo de vista el nombre, y las celdas quedan tan
        estrechas que no se lee ni la nota.
      */}
      <div className="md:hidden space-y-3">
        {students.map((student) => (
          <MobileStudentCard
            key={student.id}
            student={student}
            corteGroups={corteGroups}
            unassignedActivities={unassignedActivities}
            hasCortes={hasCortes}
            gradedPct={gradedPercent(student, data.activities)}
            onAdjust={onAdjust}
            adjMap={adjMap}
          />
        ))}
      </div>

      <div className={`hidden md:block ${tableChrome.wrapper}`}>
      <table className="w-full text-sm text-left">
        <thead className={tableChrome.thead}>
          {/* Corte group headers (only if cortes exist) */}
          {hasCortes && (
            <tr className="border-b border-foreground/[0.06]">
              <th className="px-4 py-2 text-xs text-muted border-r border-foreground/[0.06] sticky left-0 bg-foreground/[0.03] z-10" />
              {corteGroups.map((group) => (
                <th
                  key={group.id}
                  colSpan={group.activities.length + 1}
                  className="px-3 py-2 text-xs font-bold text-center text-cyan-400 border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]"
                >
                  {group.name}
                  <span className="ml-1 text-micro font-normal text-subtle">({group.weight}%)</span>
                </th>
              ))}
              {hasUnassigned && (
                <th
                  colSpan={unassignedActivities.length}
                  className="px-3 py-2 text-xs font-medium text-center text-muted border-r border-foreground/[0.06]"
                >
                  Sin Corte
                </th>
              )}
              <th className="px-4 py-2 bg-cyan-500/[0.04]" />
            </tr>
          )}

          {/* Activity names row */}
          <tr>
            <th
              rowSpan={2}
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted border-r border-foreground/[0.06] sticky left-0 bg-foreground/[0.03] z-10 min-w-[180px]"
            >
              Estudiante
            </th>
            {hasCortes ? (
              <>
                {corteGroups.map((group) => (
                  <React.Fragment key={group.id}>
                    {group.activities.map((act) => (
                      <th
                        key={act.id}
                        className="px-3 py-2 text-xs font-medium text-center text-muted border-r border-foreground/[0.06] min-w-[90px]"
                        title={act.title}
                      >
                        <span className="block truncate max-w-[100px]">{act.title}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-xs font-bold text-center text-cyan-300 border-r-2 border-cyan-500/20 bg-cyan-500/[0.03] min-w-[70px]">
                      Nota
                    </th>
                  </React.Fragment>
                ))}
                {unassignedActivities.map((act) => (
                  <th
                    key={act.id}
                    className="px-3 py-2 text-xs font-medium text-center text-muted border-r border-foreground/[0.06] min-w-[90px]"
                    title={act.title}
                  >
                    <span className="block truncate max-w-[100px]">{act.title}</span>
                  </th>
                ))}
              </>
            ) : (
              activities.map((act) => (
                <th
                  key={act.id}
                  className="px-3 py-2 text-xs font-medium text-center text-muted border-r border-foreground/[0.06] min-w-[90px]"
                  title={act.title}
                >
                  <span className="block truncate max-w-[100px]">{act.title}</span>
                </th>
              ))
            )}
            <th
              rowSpan={2}
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400 text-center min-w-[100px] bg-cyan-500/[0.04]"
            >
              Definitiva
              <span className="block text-micro font-normal text-subtle">{totalWeight}%</span>
            </th>
          </tr>
          {/* Weights row */}
          <tr className="border-b border-foreground/[0.06]">
            {hasCortes ? (
              <>
                {corteGroups.map((group) => (
                  <React.Fragment key={`w-${group.id}`}>
                    {group.activities.map((act) => (
                      <th
                        key={`w-${act.id}`}
                        className="px-3 py-1.5 text-micro text-center text-subtle border-r border-foreground/[0.06]"
                      >
                        {act.weight}%
                      </th>
                    ))}
                    <th className="px-3 py-1.5 text-micro text-center text-cyan-300/50 border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]">
                      /5.0
                    </th>
                  </React.Fragment>
                ))}
                {unassignedActivities.map((act) => (
                  <th
                    key={`w-${act.id}`}
                    className="px-3 py-1.5 text-micro text-center text-subtle border-r border-foreground/[0.06]"
                  >
                    {act.weight}%
                  </th>
                ))}
              </>
            ) : (
              activities.map((act) => (
                <th
                  key={`w-${act.id}`}
                  className="px-3 py-1.5 text-micro text-center text-subtle border-r border-foreground/[0.06]"
                >
                  {act.weight}%
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className={tableChrome.tbody}>
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-foreground/[0.02] transition-colors">
              <td className="px-4 py-2.5 border-r border-foreground/[0.06] sticky left-0 bg-canvas z-10">
                <p className="text-sm text-foreground/90 font-medium">{student.lastName}, {student.firstName}</p>
                <p className="text-micro text-subtle">{student.documentNumber}</p>
              </td>

              {hasCortes ? (
                <>
                  {corteGroups.map((group) => (
                    <React.Fragment key={`r-${group.id}`}>
                      {group.activities.map((act) => (
                        <GradeCell key={act.id} grade={student.grades[act.id]} maxScore={act.maxScore} />
                      ))}
                      <td className="px-3 py-2.5 text-center border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]">
                        <ScoreCell
                          score={student.corteScores[group.id] ?? null}
                          raw={student.corteScoresRaw[group.id] ?? null}
                          adjustment={adjMap.get(adjKey(student.id, group.id))}
                          onAdjust={onAdjust ? () => onAdjust(student.id, group.id) : undefined}
                          label={`${group.name} de ${student.lastName}, ${student.firstName}`}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                  {unassignedActivities.map((act) => (
                    <GradeCell key={act.id} grade={student.grades[act.id]} maxScore={act.maxScore} />
                  ))}
                </>
              ) : (
                orderedActivities.map((act) => (
                  <GradeCell key={act.id} grade={student.grades[act.id]} maxScore={act.maxScore} />
                ))
              )}

              <td className="px-4 py-2.5 text-center bg-cyan-500/[0.04]">
                {student.finalScore !== null ? (
                  <div>
                    <ScoreCell
                      score={student.finalScore}
                      raw={student.finalScoreRaw}
                      adjustment={adjMap.get(adjKey(student.id, null))}
                      onAdjust={onAdjust ? () => onAdjust(student.id, null) : undefined}
                      label={`Definitiva de ${student.lastName}, ${student.firstName}`}
                      size="lg"
                    />
                    {student.isPartial && (
                      <span
                        className="block text-micro text-amber-600 dark:text-amber-400 mt-0.5 whitespace-nowrap"
                        title="La definitiva se calcula solo sobre lo que ya tiene nota"
                      >
                        solo {gradedPercent(student, data.activities)}% calificado
                      </span>
                    )}
                    <p className="text-micro mt-0.5">
                      {student.isApproved ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Aprobado</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">Reprobado</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-faint">—</span>
                )}
              </td>
            </tr>
          ))}

          {/* Averages row */}
          <tr className="bg-surface-sunken border-t-2 border-surface-border">
            <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase sticky left-0 bg-foreground/[0.03] z-10">
              Promedio
            </td>
            {hasCortes ? (
              <>
                {corteGroups.map((group) => (
                  <React.Fragment key={`avg-${group.id}`}>
                    {group.activities.map((act) => (
                      <AvgCell key={`avg-${act.id}`} value={activityAverages.get(act.id) ?? null} />
                    ))}
                    <td className="px-3 py-2.5 text-center border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]">
                      {corteAverages.get(group.id) != null ? (
                        <span className={`text-sm font-bold tabular-nums ${scoreColorClass(corteAverages.get(group.id)!)}`}>
                          {corteAverages.get(group.id)!.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                  </React.Fragment>
                ))}
                {unassignedActivities.map((act) => (
                  <AvgCell key={`avg-${act.id}`} value={activityAverages.get(act.id) ?? null} />
                ))}
              </>
            ) : (
              orderedActivities.map((act) => (
                <AvgCell key={`avg-${act.id}`} value={activityAverages.get(act.id) ?? null} />
              ))
            )}
            <td className="px-4 py-2.5 text-center bg-cyan-500/[0.04]">
              {(() => {
                const scored = students.filter((s) => s.finalScore !== null);
                const avg = scored.length > 0
                  ? scored.reduce((a, s) => a + (s.finalScore ?? 0), 0) / scored.length
                  : null;
                return avg !== null ? (
                  <span className={`text-sm font-bold tabular-nums ${scoreColorClass(avg)}`}>
                    {avg.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-faint">—</span>
                );
              })()}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="px-4 py-2 border-t border-foreground/[0.04] text-micro text-faint flex gap-4">
        <span>● = No publicada</span>
        <span>
          Las definitivas marcadas como parciales solo promedian lo que ya tiene nota:
          lo no calificado no cuenta como cero.
        </span>
      </div>
      </div>
    </div>
  );
}

type StudentRow = CourseGradeSummary['students'][number];
type CorteGroup = CourseGradeSummary['cortes'][number] & {
  activities: CourseGradeSummary['activities'];
};

/**
 * Tarjeta de estudiante para móvil.
 *
 * Muestra lo MISMO que la tabla de escritorio, no un resumen: la definitiva,
 * la nota de cada corte y —al desplegar— la nota de cada actividad con su
 * peso. Una primera versión enseñaba solo los cortes, y eso quitaba el
 * desglose en vez de adaptarlo: en móvil no había forma de saber de dónde
 * salía la nota.
 */
function MobileStudentCard({
  student, corteGroups, unassignedActivities, hasCortes, gradedPct, onAdjust, adjMap,
}: {
  student: StudentRow;
  corteGroups: CorteGroup[];
  unassignedActivities: CourseGradeSummary['activities'];
  hasCortes: boolean;
  gradedPct: number;
  onAdjust?: (studentId: string, corteId: string | null) => void;
  adjMap: Map<string, Adjustment>;
}) {
  const [open, setOpen] = useState(false);

  const blocks = hasCortes
    ? corteGroups.map((g) => ({
        id: g.id, name: g.name, weight: g.weight,
        score: student.corteScores[g.id] ?? null,
        activities: g.activities,
      }))
    : [];
  const loose = hasCortes ? unassignedActivities : unassignedActivities.concat();

  return (
    <div className="rounded-xl border border-surface-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-4 flex items-start justify-between gap-3
                   hover:bg-surface-hover transition-colors duration-[var(--dur-fast)] cursor-pointer"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {student.lastName}, {student.firstName}
          </p>
          <p className="text-micro text-subtle mt-0.5">{student.email}</p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            {/* `?? 0` pintaba de rojo a quien no tiene ninguna nota:
                "sin datos" no es lo mismo que "va perdiendo". */}
            <p className={`text-2xl font-bold tabular-nums leading-none ${gradeText(student.finalScore)}`}>
              {formatScore(student.finalScore)}
            </p>
            <p className="text-micro text-faint mt-0.5">
              {student.finalScore === null ? 'sin nota'
                : student.isPartial ? `${gradedPct}% calificado` : 'definitiva'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Resumen por corte, siempre visible. */}
      {hasCortes && (
        <div className="grid gap-2 px-4 pb-4" style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0,1fr))` }}>
          {blocks.map((b) => {
            const adj = adjMap.get(`${student.id}:${b.id}`);
            const inner = (
              <>
                <p className="text-micro text-subtle truncate">{b.name} · {b.weight}%</p>
                <p className={`text-sm font-semibold tabular-nums ${b.score != null ? scoreColorClass(b.score) : 'text-faint'}`}>
                  {b.score != null ? b.score.toFixed(1) : '—'}
                </p>
                {adj && (() => {
                  const raw = student.corteScoresRaw[b.id];
                  const d = b.score != null && raw != null ? Math.round((b.score - raw) * 10) / 10 : null;
                  return (
                    <p className={`text-micro truncate ${adj.isPublished ? 'text-cyan-600 dark:text-cyan-400' : 'text-subtle'}`}>
                      {d !== null && Math.abs(d) >= 0.05 ? `${d > 0 ? '+' : ''}${d.toFixed(1)} ajuste` : 'ajustada'}
                      {adj.isPublished ? '' : ' · sin publicar'}
                    </p>
                  );
                })()}
              </>
            );
            // Quitar el ajuste en móvil "porque no cabe" sería justo lo que no
            // se debe hacer: se adapta el control, no se elimina.
            return onAdjust && b.score != null ? (
              <button key={b.id} onClick={() => onAdjust(student.id, b.id)}
                aria-label={`Ajustar ${b.name} de ${student.lastName}, ${student.firstName}`}
                className="text-left rounded-lg border border-surface-border bg-surface-sunken p-2 min-h-[44px]
                           hover:bg-surface-hover transition-colors duration-[var(--dur-fast)]
                           active:scale-[0.98] motion-reduce:active:scale-100 cursor-pointer
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
                {inner}
              </button>
            ) : (
              <div key={b.id} className="rounded-lg border border-surface-border bg-surface-sunken p-2">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* La definitiva va en la cabecera, dentro del botón que despliega la
          tarjeta: no se puede anidar otro botón ahí, así que su ajuste vive
          en su propia fila. */}
      {onAdjust && student.finalScore !== null && (
        <div className="px-4 pb-4 -mt-1">
          <button
            onClick={() => onAdjust(student.id, null)}
            className="w-full min-h-[44px] rounded-lg border border-surface-border px-3 py-2
                       text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover
                       transition-colors duration-[var(--dur-fast)]
                       active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
          >
            {(() => {
              const adj = adjMap.get(`${student.id}:final`);
              if (!adj) return 'Ajustar definitiva';
              const raw = student.finalScoreRaw;
              const d = student.finalScore != null && raw != null
                ? Math.round((student.finalScore - raw) * 10) / 10 : null;
              const dTxt = d !== null && Math.abs(d) >= 0.05 ? ` ${d > 0 ? '+' : ''}${d.toFixed(1)}` : '';
              return `Definitiva ajustada${dTxt}${adj.isPublished ? '' : ' · sin publicar'} — editar`;
            })()}
          </button>
        </div>
      )}

      {/* Desglose completo: la nota de cada actividad, igual que la tabla. */}
      {open && (
        <div className="border-t border-surface-border">
          {(hasCortes ? blocks : [{ id: 'all', name: 'Actividades', weight: 100, score: null, activities: loose }])
            .map((b) => (
              <div key={b.id}>
                <p className="px-4 py-2 text-micro font-semibold uppercase tracking-wider text-subtle bg-surface-sunken">
                  {b.name}
                </p>
                {b.activities.length === 0 ? (
                  <p className="px-4 py-3 text-micro text-faint italic">Sin actividades</p>
                ) : b.activities.map((act) => {
                  const g = student.grades[act.id];
                  const n = g ? (g.score / g.maxScore) * 5 : null;
                  return (
                    <div key={act.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-border">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground/90 leading-snug">{act.title}</p>
                        <p className="text-micro text-subtle mt-0.5">
                          {act.weight}% del corte
                          {g && !g.isPublished && (
                            <span className="text-subtle"> · sin publicar</span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {g ? (
                          <>
                            <p className={`text-sm font-semibold tabular-nums ${scoreColorClass(n as number)}`}>
                              {(n as number).toFixed(1)}
                            </p>
                            <p className="text-micro text-faint">{g.score}/{g.maxScore}</p>
                          </>
                        ) : (
                          <span className="text-micro text-faint">Sin nota</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          {hasCortes && loose.length > 0 && (
            <div>
              <p className="px-4 py-2 text-micro font-semibold uppercase tracking-wider text-subtle bg-surface-sunken">
                Otras actividades
              </p>
              {loose.map((act) => {
                const g = student.grades[act.id];
                const n = g ? (g.score / g.maxScore) * 5 : null;
                return (
                  <div key={act.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-border">
                    <p className="text-xs text-foreground/90 flex-1 min-w-0">{act.title}</p>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${n != null ? scoreColorClass(n) : 'text-faint'}`}>
                      {n != null ? n.toFixed(1) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Porcentaje del curso que ya tiene nota para un estudiante.
 *
 * La definitiva se calcula solo sobre lo calificado, así que un estudiante al
 * que le falta la mitad del curso puede aparecer con un 4.5 que no significa
 * lo que parece. El único aviso era un asterisco de un carácter.
 */
function gradedPercent(
  student: { grades: Record<string, { score: number } | null> },
  activities: { id: string; weight: number }[],
): number {
  const total = activities.reduce((a, x) => a + x.weight, 0);
  if (total === 0) return 100;
  const done = activities.reduce((a, x) => a + (student.grades[x.id] ? x.weight : 0), 0);
  return Math.round((done / total) * 100);
}

function GradeCell({ grade, maxScore }: { grade: { score: number; maxScore: number; isPublished: boolean; feedback?: string } | null; maxScore: number }) {
  if (!grade) {
    return (
      <td className="px-3 py-2.5 text-center text-xs text-faint border-r border-foreground/[0.06]"
          title="Sin nota registrada: no suma ni resta en la definitiva">—</td>
    );
  }
  const normalized = (grade.score / grade.maxScore) * 5;
  return (
    <td className={`px-3 py-2.5 text-center border-r border-foreground/[0.06] ${scoreColorClass(normalized)}`} title={grade.feedback ?? undefined}>
      <span className="text-sm font-medium tabular-nums">{grade.score.toFixed(1)}</span>
      <span className="text-micro text-faint ml-0.5">/{maxScore}</span>
      {!grade.isPublished && <span className="ml-1 text-micro text-subtle" title="No publicada">●</span>}
    </td>
  );
}

function AvgCell({ value }: { value: number | null }) {
  return (
    <td className="px-3 py-2.5 text-center border-r border-foreground/[0.06]">
      {value !== null ? (
        <span className={`text-sm font-medium tabular-nums ${scoreColorClass(value)}`}>{value.toFixed(1)}</span>
      ) : (
        <span className="text-xs text-faint">—</span>
      )}
    </td>
  );
}

function scoreColorClass(score: number): string {
  return gradeText(score);
}

/**
 * Nota calculada que el docente puede ajustar a mano.
 *
 * Una nota ajustada nunca se muestra sola: al lado va de dónde salió. Un
 * número que cambió sin decir por qué es el que no se puede sustentar cuando
 * el estudiante pregunta, y el que hace dudar al propio docente tres semanas
 * después.
 */
function ScoreCell({
  score, raw, adjustment, onAdjust, label, size = 'md',
}: {
  score: number | null;
  /** La misma nota sin ajustar, para poder enseñar la diferencia. */
  raw?: number | null;
  adjustment?: Adjustment;
  onAdjust?: () => void;
  label: string;
  size?: 'md' | 'lg';
}) {
  const text = size === 'lg' ? 'text-base' : 'text-sm';
  const delta = score !== null && raw !== null && raw !== undefined
    ? Math.round((score - raw) * 10) / 10
    : null;

  const body = score === null ? (
    <span className="text-xs text-faint">—</span>
  ) : (
    <>
      <span className={`${text} font-bold tabular-nums ${scoreColorClass(score)}`}>
        {score.toFixed(1)}
      </span>
      {adjustment && (
        /* El delta se calcula contra la base de AHORA, no contra la que había
           al ajustar. Si el docente corrige una nota después, la diferencia
           que se ve cambia sola y él lo nota, en vez de quedarse con un
           ajuste congelado que nadie vuelve a mirar. */
        <span className={`block text-micro whitespace-nowrap ${
          adjustment.isPublished ? 'text-cyan-600 dark:text-cyan-400' : 'text-subtle'
        }`}>
          {delta !== null && Math.abs(delta) >= 0.05
            ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ajuste`
            : 'ajustada'}
          {adjustment.isPublished ? '' : ' · sin publicar'}
        </span>
      )}
    </>
  );

  if (!onAdjust || score === null) return <div>{body}</div>;

  return (
    <button
      onClick={onAdjust}
      /* Sin min-h-11 a propósito: esta celda vive en la tabla, que es
         `hidden md:block`. Subir la altura engordaría cada fila en escritorio
         para cumplir una regla que solo aplica al dedo. En móvil el ajuste se
         hace desde las tarjetas, y ahí sí son 44px. */
      aria-label={`Ajustar ${label}${adjustment ? ` (ajustada: ${adjustment.reason})` : ''}`}
      title={adjustment ? `Ajustada — ${adjustment.reason}` : 'Ajustar esta nota'}
      className="w-full rounded-lg px-2 py-1 cursor-pointer
                 hover:bg-cyan-500/10 transition-colors duration-[var(--dur-fast)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
    >
      {body}
    </button>
  );
}

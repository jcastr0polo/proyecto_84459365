'use client';

import React from 'react';
import type { CourseGradeSummary } from '@/lib/types';

interface GradeSummaryTableProps {
  data: CourseGradeSummary;
  className?: string;
}

/**
 * GradeSummaryTable — Pivot table with corte grouping
 * Columns grouped by corte: [Corte 1: Act1 Act2 | Nota Corte] [Corte 2: ...] [Sin Corte: ...] | Definitiva
 */
export default function GradeSummaryTable({ data, className = '' }: GradeSummaryTableProps) {
  const { activities, students, cortes } = data;
  const totalWeight = activities.reduce((a, b) => a + b.weight, 0);
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
    <div className={`overflow-x-auto rounded-xl border border-foreground/[0.08] ${className}`}>
      <table className="w-full text-sm text-left">
        <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06]">
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
                  <span className="ml-1 text-[10px] font-normal text-subtle">({group.weight}%)</span>
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
              <span className="block text-[10px] font-normal text-subtle">{totalWeight}%</span>
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
                        className="px-3 py-1.5 text-[10px] text-center text-subtle border-r border-foreground/[0.06]"
                      >
                        {act.weight}%
                      </th>
                    ))}
                    <th className="px-3 py-1.5 text-[10px] text-center text-cyan-300/50 border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]">
                      /5.0
                    </th>
                  </React.Fragment>
                ))}
                {unassignedActivities.map((act) => (
                  <th
                    key={`w-${act.id}`}
                    className="px-3 py-1.5 text-[10px] text-center text-subtle border-r border-foreground/[0.06]"
                  >
                    {act.weight}%
                  </th>
                ))}
              </>
            ) : (
              activities.map((act) => (
                <th
                  key={`w-${act.id}`}
                  className="px-3 py-1.5 text-[10px] text-center text-subtle border-r border-foreground/[0.06]"
                >
                  {act.weight}%
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-foreground/[0.02] transition-colors">
              <td className="px-4 py-2.5 border-r border-foreground/[0.06] sticky left-0 bg-base z-10">
                <p className="text-sm text-foreground/90 font-medium">{student.lastName}, {student.firstName}</p>
                <p className="text-[10px] text-subtle">{student.documentNumber}</p>
              </td>

              {hasCortes ? (
                <>
                  {corteGroups.map((group) => (
                    <React.Fragment key={`r-${group.id}`}>
                      {group.activities.map((act) => (
                        <GradeCell key={act.id} grade={student.grades[act.id]} maxScore={act.maxScore} />
                      ))}
                      <td className="px-3 py-2.5 text-center border-r-2 border-cyan-500/20 bg-cyan-500/[0.03]">
                        {student.corteScores[group.id] != null ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreColorClass(student.corteScores[group.id]!)}`}>
                            {student.corteScores[group.id]!.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-faint">—</span>
                        )}
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
                    <span className={`text-base font-bold tabular-nums ${scoreColorClass(student.finalScore)}`}>
                      {student.finalScore.toFixed(1)}
                    </span>
                    {student.isPartial && (
                      <span className="text-[10px] text-amber-400 ml-0.5" title="Nota parcial">*</span>
                    )}
                    <p className="text-[10px] mt-0.5">
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
          <tr className="bg-foreground/[0.03] border-t-2 border-foreground/[0.08]">
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

      <div className="px-4 py-2 border-t border-foreground/[0.04] text-[10px] text-faint flex gap-4">
        <span>● = No publicada</span>
        <span>* = Nota parcial (faltan actividades)</span>
      </div>
    </div>
  );
}

function GradeCell({ grade, maxScore }: { grade: { score: number; maxScore: number; isPublished: boolean; feedback?: string } | null; maxScore: number }) {
  if (!grade) {
    return (
      <td className="px-3 py-2.5 text-center text-xs text-faint border-r border-foreground/[0.06]">—</td>
    );
  }
  const normalized = (grade.score / grade.maxScore) * 5;
  return (
    <td className={`px-3 py-2.5 text-center border-r border-foreground/[0.06] ${scoreColorClass(normalized)}`} title={grade.feedback ?? undefined}>
      <span className="text-sm font-medium tabular-nums">{grade.score.toFixed(1)}</span>
      <span className="text-[10px] text-faint ml-0.5">/{maxScore}</span>
      {!grade.isPublished && <span className="ml-1 text-[10px] text-amber-400" title="No publicada">●</span>}
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
  if (score >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

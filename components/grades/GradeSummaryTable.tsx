'use client';

import React from 'react';
import type { CourseGradeSummary } from '@/lib/types';

interface GradeSummaryTableProps {
  data: CourseGradeSummary;
  className?: string;
}

/**
 * GradeSummaryTable — Pivot table following wireframe §13.5
 * Rows: students | Columns: activities (weight%) | Definitiva (100%)
 * Color-coded cells: emerald ≥ 4.0, amber ≥ 3.0, red < 3.0
 */
export default function GradeSummaryTable({ data, className = '' }: GradeSummaryTableProps) {
  const { activities, students } = data;
  const totalWeight = activities.reduce((a, b) => a + b.weight, 0);

  // Per-activity averages
  const activityAverages = activities.map((act) => {
    const scores = students
      .map((s) => s.grades[act.id])
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .map((g) => (g.score / g.maxScore) * 5);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  });

  return (
    <div className={`overflow-x-auto rounded-xl border border-white/[0.08] ${className}`}>
      <table className="w-full text-sm text-left">
        <thead className="bg-white/[0.03] border-b border-white/[0.06]">
          {/* Activity names */}
          <tr>
            <th
              rowSpan={2}
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/50 border-r border-white/[0.06] sticky left-0 bg-white/[0.03] z-10 min-w-[180px]"
            >
              Estudiante
            </th>
            {activities.map((act) => (
              <th
                key={act.id}
                className="px-3 py-2 text-xs font-medium text-center text-white/70 border-r border-white/[0.06] min-w-[90px]"
                title={act.title}
              >
                <span className="block truncate max-w-[100px]">{act.title}</span>
              </th>
            ))}
            <th
              rowSpan={2}
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400 text-center min-w-[100px] bg-cyan-500/[0.04]"
            >
              Definitiva
              <span className="block text-[10px] font-normal text-white/30">{totalWeight}%</span>
            </th>
          </tr>
          {/* Weights row */}
          <tr className="border-b border-white/[0.06]">
            {activities.map((act) => (
              <th
                key={`w-${act.id}`}
                className="px-3 py-1.5 text-[10px] text-center text-white/30 border-r border-white/[0.06]"
              >
                {act.weight}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
              {/* Student name (sticky left) */}
              <td className="px-4 py-2.5 border-r border-white/[0.06] sticky left-0 bg-black z-10">
                <p className="text-sm text-white/90 font-medium">{student.lastName}, {student.firstName}</p>
                <p className="text-[10px] text-white/30">{student.documentNumber}</p>
              </td>

              {/* Per-activity score cells */}
              {activities.map((act) => {
                const grade = student.grades[act.id];
                if (!grade) {
                  return (
                    <td key={act.id} className="px-3 py-2.5 text-center text-xs text-white/20 border-r border-white/[0.06]">
                      —
                    </td>
                  );
                }
                const normalized = (grade.score / grade.maxScore) * 5;
                const cellColor = scoreColorClass(normalized);
                return (
                  <td
                    key={act.id}
                    className={`px-3 py-2.5 text-center border-r border-white/[0.06] ${cellColor}`}
                    title={grade.feedback ?? undefined}
                  >
                    <span className="text-sm font-medium tabular-nums">
                      {grade.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-white/25 ml-0.5">/{grade.maxScore}</span>
                    {!grade.isPublished && (
                      <span className="ml-1 text-[10px] text-amber-400" title="No publicada">●</span>
                    )}
                  </td>
                );
              })}

              {/* Definitiva */}
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
                        <span className="text-emerald-400">Aprobado</span>
                      ) : (
                        <span className="text-red-400">Reprobado</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-white/20">—</span>
                )}
              </td>
            </tr>
          ))}

          {/* Averages row */}
          <tr className="bg-white/[0.03] border-t-2 border-white/[0.08]">
            <td className="px-4 py-2.5 text-xs font-semibold text-white/50 uppercase sticky left-0 bg-white/[0.03] z-10">
              Promedio
            </td>
            {activityAverages.map((avg, i) => (
              <td key={`avg-${activities[i].id}`} className="px-3 py-2.5 text-center border-r border-white/[0.06]">
                {avg !== null ? (
                  <span className={`text-sm font-medium tabular-nums ${scoreColorClass(avg)}`}>
                    {avg.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-white/20">—</span>
                )}
              </td>
            ))}
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
                  <span className="text-xs text-white/20">—</span>
                );
              })()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footnote */}
      <div className="px-4 py-2 border-t border-white/[0.04] text-[10px] text-white/25 flex gap-4">
        <span>● = No publicada</span>
        <span>* = Nota parcial (faltan actividades)</span>
      </div>
    </div>
  );
}

function scoreColorClass(score: number): string {
  if (score >= 4.0) return 'text-emerald-400';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

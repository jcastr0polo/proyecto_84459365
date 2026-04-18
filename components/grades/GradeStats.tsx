'use client';

import React from 'react';

interface StatsData {
  average: number;
  median: number;
  highest: number;
  lowest: number;
  totalStudents: number;
  approvedCount: number;
  failedCount: number;
  pendingCount: number;
}

interface GradeStatsProps {
  stats: StatsData;
  className?: string;
}

/**
 * GradeStats — Statistics panel for course grades
 * Shows: average, median, approved %, highest, lowest
 * RN-CAL-07: Escala colombiana, aprobación ≥ 3.0
 */
export default function GradeStats({ stats, className = '' }: GradeStatsProps) {
  const approvedPercent = stats.totalStudents > 0
    ? Math.round((stats.approvedCount / stats.totalStudents) * 100) : 0;
  const failedPercent = stats.totalStudents > 0
    ? Math.round((stats.failedCount / stats.totalStudents) * 100) : 0;

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 ${className}`}>
      <StatBox label="Promedio" value={stats.average.toFixed(1)} color={scoreColor(stats.average)} />
      <StatBox label="Mediana" value={stats.median.toFixed(1)} color={scoreColor(stats.median)} />
      <StatBox label="Más alta" value={stats.highest.toFixed(1)} color="text-emerald-400" />
      <StatBox label="Más baja" value={stats.lowest.toFixed(1)} color={scoreColor(stats.lowest)} />
      <StatBox label="Aprobados" value={`${approvedPercent}%`} sub={`${stats.approvedCount}/${stats.totalStudents}`} color="text-emerald-400" />
      <StatBox label="Reprobados" value={`${failedPercent}%`} sub={`${stats.failedCount}/${stats.totalStudents}`} color="text-red-400" />
      <StatBox label="Sin nota" value={String(stats.pendingCount)} color="text-muted" />
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-subtle mt-0.5">{sub}</p>}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-400';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

/** Calculate stats from an array of final scores */
export function calculateStats(
  students: { finalScore: number | null; isApproved: boolean | null }[]
): StatsData {
  const scored = students
    .map((s) => s.finalScore)
    .filter((s): s is number => s !== null);
  const sorted = [...scored].sort((a, b) => a - b);

  const average = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
  const median =
    sorted.length > 0
      ? sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : 0;
  const highest = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  const lowest = sorted.length > 0 ? sorted[0] : 0;

  return {
    average,
    median,
    highest,
    lowest,
    totalStudents: students.length,
    approvedCount: students.filter((s) => s.isApproved === true).length,
    failedCount: students.filter((s) => s.isApproved === false).length,
    pendingCount: students.filter((s) => s.finalScore === null).length,
  };
}

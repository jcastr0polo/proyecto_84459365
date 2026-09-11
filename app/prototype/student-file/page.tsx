'use client';

import React from 'react';
import { gradeText, formatScore } from '@/lib/gradeScale';

/** Taller — tarjetas de señal de la ficha del estudiante. Datos falsos. */
function Signals({ avg, gradedN, failing, pending, total, submitted }: {
  avg: number | null; gradedN: number; failing: string[];
  pending: number; total: number; submitted: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-surface-border bg-surface p-4">
        <p className="text-micro uppercase tracking-wider text-subtle">Promedio</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className={`text-3xl font-bold tabular-nums leading-none ${gradeText(avg)}`}>{formatScore(avg)}</span>
          <span className="text-xs text-subtle">/ 5.0</span>
        </div>
        <p className="text-micro text-faint mt-1.5">
          {avg === null ? 'Aún no hay cursos con nota' : `Sobre ${gradedN} cursos con nota`}
        </p>
      </div>
      <div className={`rounded-xl border p-4 ${failing.length > 0 ? 'border-red-500/25 bg-red-500/[0.06]' : 'border-surface-border bg-surface'}`}>
        <p className="text-micro uppercase tracking-wider text-subtle">Va perdiendo</p>
        <p className={`text-3xl font-bold tabular-nums leading-none mt-1 ${failing.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{failing.length}</p>
        <p className="text-micro text-faint mt-1.5 truncate">
          {failing.length === 0 ? 'Ningún curso por debajo de 3.0' : failing.join(', ')}
        </p>
      </div>
      <div className={`rounded-xl border p-4 ${pending > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-surface-border bg-surface'}`}>
        <p className="text-micro uppercase tracking-wider text-subtle">Sin entregar</p>
        <p className={`text-3xl font-bold tabular-nums leading-none mt-1 ${pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{pending}</p>
        <p className="text-micro text-faint mt-1.5">de {total} actividades · {submitted} entregadas</p>
      </div>
    </div>
  );
}

export default function PrototypeStudentFile() {
  return (
    <div className="px-4 py-8 max-w-4xl mx-auto space-y-8">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño · datos falsos
      </span>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Estudiante en riesgo</p>
        <Signals avg={2.6} gradedN={3} failing={['TDI-202602', 'LOG-202602']} pending={4} total={12} submitted={8} />
      </div>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Estudiante al día</p>
        <Signals avg={4.4} gradedN={3} failing={[]} pending={0} total={12} submitted={12} />
      </div>
    </div>
  );
}

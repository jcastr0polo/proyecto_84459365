'use client';

import React from 'react';

const SEGMENT_COLORS = ['bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function WeightBar({ cortes }: { cortes: { id: string; name: string; weight: number; order: number }[] }) {
  const total = cortes.reduce((a, c) => a + c.weight, 0);
  const remaining = 100 - total;
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted">Distribución de pesos</span>
        <span className={`text-sm font-bold tabular-nums ${
          total === 100 ? 'text-emerald-600 dark:text-emerald-400'
            : total > 100 ? 'text-red-600 dark:text-red-400'
            : 'text-amber-600 dark:text-amber-400'}`}>
          {total}% de 100%
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.08] gap-0.5">
        {[...cortes].sort((a, b) => a.order - b.order).map((c, i) => (
          <div key={c.id} title={`${c.name}: ${c.weight}%`} style={{ width: `${Math.min(c.weight, 100)}%` }}
            className={`h-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
        {[...cortes].sort((a, b) => a.order - b.order).map((c, i) => (
          <span key={c.id} className="flex items-center gap-1.5 text-meta text-subtle">
            <span className={`w-2 h-2 rounded-sm ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
            {c.name} · {c.weight}%
          </span>
        ))}
      </div>
      {total < 100 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
          Falta repartir {remaining}%. Mientras no sume 100, la nota definitiva
          del curso se calcula sobre una base incompleta.
        </p>
      )}
      {total === 100 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">La distribución está completa.</p>
      )}
    </div>
  );
}

export default function PrototypeCortes() {
  const completo = [
    { id: '1', name: 'Corte 1', weight: 30, order: 1 },
    { id: '2', name: 'Corte 2', weight: 30, order: 2 },
    { id: '3', name: 'Corte 3', weight: 40, order: 3 },
  ];
  const incompleto = [
    { id: '1', name: 'Corte 1', weight: 30, order: 1 },
    { id: '2', name: 'Corte 2', weight: 25, order: 2 },
  ];
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-8">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño · datos falsos
      </span>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Distribución completa</p>
        <WeightBar cortes={completo} />
      </div>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Incompleta</p>
        <WeightBar cortes={incompleto} />
      </div>
    </div>
  );
}

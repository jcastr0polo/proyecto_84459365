'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { toneBox } from '@/lib/semantics';

/**
 * Aviso: la definitiva de este curso NO está respetando el peso de los cortes.
 *
 * Pasa cuando hay ítems calificables sin corte asignado. Ponderar por corte
 * los dejaría fuera del cálculo, así que el sistema se queda en el promedio
 * plano —y lo dice—. Callarlo sería peor que el bug original: notas que salen
 * de una fórmula distinta a la que el docente cree, sin ninguna señal.
 */
export default function OrphanItemsNotice({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 mb-4 ${toneBox.attention}`} role="status">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        La definitiva no está usando el peso de los cortes
      </p>
      <p className="text-xs text-subtle mt-1 max-w-prose">
        {items.length === 1
          ? 'Hay 1 ítem calificable sin corte asignado, y ponderar por corte lo dejaría fuera de la nota. Asígnale un corte'
          : `Hay ${items.length} ítems calificables sin corte asignado, y ponderar por corte los dejaría fuera de la nota. Asígnales un corte`}
        {' '}y el curso pasa solo al cálculo correcto. Mientras tanto se promedian todos
        los ítems por igual.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li key={t}
            className="text-micro text-muted rounded-md border border-surface-border bg-surface px-2 py-1">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

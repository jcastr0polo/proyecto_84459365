'use client';

import React, { useState } from 'react';
import { ChevronDown, Pencil, Trash2, CalendarClock, FileText, ClipboardList, PenLine } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { gradeText, formatScore } from '@/lib/gradeScale';
import { toneBox, toneText } from '@/lib/semantics';

export interface CorteItem {
  id: string;
  title: string;
  kind: 'activity' | 'quiz' | 'manual';
  weight: number;
  status: string;
  dueDate: string | null;
  graded: number;
}

export interface CorteOverview {
  id: string;
  name: string;
  weight: number;
  order: number;
  startDate?: string;
  endDate?: string;
  reportDeadline?: string;
  items: CorteItem[];
  internalWeight: number;
  studentsTotal: number;
  studentsWithScore: number;
  average: number | null;
  failing: number;
  daysToReport: number | null;
  daysToEnd: number | null;
  pendingItems: number;
  canDelete: boolean;
}

const ICONO = {
  activity: FileText,
  quiz: ClipboardList,
  manual: PenLine,
} as const;

const NOMBRE_TIPO = {
  activity: 'Actividad',
  quiz: 'Parcial',
  manual: 'Nota manual',
} as const;

/**
 * El plazo en palabras.
 *
 * "Hasta el 14 de nov" no dice si quedan tres semanas o si venció ayer, que
 * es justo lo único que el docente necesita saber de un vistazo.
 */
function plazo(dias: number | null): { texto: string; tono: string; caja?: string } | null {
  if (dias === null) return null;
  if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, tono: toneText.critical, caja: toneBox.critical };
  if (dias === 0) return { texto: 'Vence hoy', tono: toneText.critical, caja: toneBox.critical };
  if (dias === 1) return { texto: 'Vence mañana', tono: toneText.attention, caja: toneBox.attention };
  if (dias <= 7) return { texto: `Vence en ${dias} días`, tono: toneText.attention, caja: toneBox.attention };
  return { texto: `Vence en ${dias} días`, tono: 'text-subtle' };
}

const fecha = (iso?: string) => iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  : null;

/**
 * Tarjeta de un corte, desplegable.
 *
 * La pantalla de cortes era una tabla de configuración: nombre, peso, orden.
 * Pero el corte es la unidad con la que el docente piensa y con la que la
 * universidad le pide las notas. Al abrirlo se ve qué hay dentro, cuánto pesa
 * cada cosa, qué falta por calificar y cuánto queda para el reporte.
 */
export default function CorteCard({
  corte, onEdit, onDelete, deleting,
}: {
  corte: CorteOverview;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reporte = plazo(corte.daysToReport);
  const pesoMal = corte.items.length > 0 && corte.internalWeight !== 100;

  return (
    <div className="rounded-xl border border-surface-border bg-surface overflow-hidden">
      <div className="flex items-start gap-2 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 min-w-0 text-left flex items-start gap-3 cursor-pointer rounded-lg
                     hover:bg-surface-hover -m-1 p-1 transition-colors duration-[var(--dur-fast)]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
        >
          <ChevronDown className={`w-4 h-4 text-faint shrink-0 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{corte.name}</h3>
              <span className="text-xs text-subtle tabular-nums">{corte.weight}% de la definitiva</span>
            </div>

            <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap text-micro text-subtle">
              {(corte.startDate || corte.endDate) && (
                <span>{fecha(corte.startDate) ?? '?'} → {fecha(corte.endDate) ?? '?'}</span>
              )}
              <span>{corte.items.length} {corte.items.length === 1 ? 'ítem' : 'ítems'}</span>
              <span>{corte.studentsWithScore}/{corte.studentsTotal} con nota</span>
              {corte.failing > 0 && (
                <span className={toneText.critical}>{corte.failing} bajo 3.0</span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className={`text-xl font-bold tabular-nums leading-none ${gradeText(corte.average)}`}>
              {formatScore(corte.average)}
            </p>
            <p className="text-micro text-faint mt-0.5">promedio</p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton label={`Editar ${corte.name}`} onClick={onEdit} size="sm"
            icon={<Pencil className="w-4 h-4" />} />
          {/* Deshabilitado, no escondido: si no se puede borrar hay que decir
              por qué, no hacer desaparecer el botón. */}
          <IconButton
            label={corte.canDelete
              ? `Eliminar ${corte.name}`
              : `No se puede eliminar ${corte.name}: tiene ${corte.items.length} ítems asignados`}
            tone="danger" size="sm"
            onClick={onDelete}
            disabled={!corte.canDelete || deleting}
            icon={<Trash2 className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* El plazo de reporte va siempre visible: es la fecha que aprieta. */}
      {reporte && (
        <div className={`mx-4 mb-4 -mt-1 rounded-lg border px-3 py-2 flex items-center gap-2 ${reporte.caja ?? 'border-surface-border bg-surface-sunken'}`}>
          <CalendarClock className={`w-3.5 h-3.5 shrink-0 ${reporte.tono}`} aria-hidden="true" />
          <p className="text-xs">
            <span className={`font-medium ${reporte.tono}`}>Reporte de notas: {reporte.texto}</span>
            <span className="text-subtle"> · {fecha(corte.reportDeadline)}</span>
            {corte.pendingItems > 0 && (
              <span className="text-subtle">
                {' '}· faltan {corte.pendingItems} {corte.pendingItems === 1 ? 'ítem' : 'ítems'} por calificar
              </span>
            )}
          </p>
        </div>
      )}

      {open && (
        <div className="border-t border-surface-border">
          {pesoMal && (
            <p className="px-4 py-2 text-micro text-amber-700 dark:text-amber-300 bg-amber-500/[0.06]">
              Los pesos internos suman {corte.internalWeight}%, no 100%. La nota del corte se
              reparte igual en proporción, pero cada ítem vale distinto de lo que dice.
            </p>
          )}

          {corte.items.length === 0 ? (
            <p className="px-4 py-5 text-xs text-subtle italic">
              Este corte no tiene nada asignado todavía. Al crear una actividad, un parcial o
              una nota manual, elige este corte y aparecerá aquí.
            </p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {corte.items.map((item) => {
                const Icono = ICONO[item.kind];
                const completo = item.graded >= corte.studentsTotal && corte.studentsTotal > 0;
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Icono className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground/90 truncate">{item.title}</p>
                      <p className="text-micro text-subtle">
                        {NOMBRE_TIPO[item.kind]} · {item.weight}% del corte
                        {item.status === 'draft' && <span> · borrador</span>}
                      </p>
                    </div>
                    <span className={`text-micro shrink-0 tabular-nums ${completo ? toneText.ok : 'text-subtle'}`}>
                      {item.graded}/{corte.studentsTotal} calificados
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

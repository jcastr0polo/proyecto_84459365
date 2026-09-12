'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { gradeText, formatScore, PASS, SCALE_MAX } from '@/lib/gradeScale';
import { toneBox } from '@/lib/semantics';
import { Plus, Minus, Trash2 } from 'lucide-react';

export interface AdjustTarget {
  studentId: string;
  studentName: string;
  /** null = la definitiva del curso */
  corteId: string | null;
  label: string;
  /** Nota que sale del cálculo, antes del ajuste */
  calculated: number | null;
  current: { score: number; reason: string; isPublished: boolean } | null;
}

/**
 * Ajustar a mano una nota ya calculada, por comportamiento o participación.
 *
 * El docente piensa en sumas ("le subo dos décimas"), no en notas absolutas,
 * así que los botones de ±0.1 son el camino corto y el campo exacto queda para
 * cuando ya sabe el número. En los dos casos se ve siempre de dónde sale y a
 * dónde llega: una nota que cambia sin mostrar su origen es la que después no
 * se puede defender ante un reclamo.
 */
export default function AdjustGradeModal({
  target, onClose, onSave, onRemove, saving,
}: {
  target: AdjustTarget | null;
  onClose: () => void;
  onSave: (score: number, reason: string, publish: boolean) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const base = target?.calculated ?? 0;
  const [value, setValue] = useState(base);
  const [reason, setReason] = useState('');
  const [publish, setPublish] = useState(false);
  const [touched, setTouched] = useState(false);

  // Al abrir sobre otro estudiante, el formulario arranca de cero.
  const key = target ? `${target.studentId}:${target.corteId ?? 'final'}` : '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setValue(target?.current?.score ?? target?.calculated ?? 0);
    setReason(target?.current?.reason ?? '');
    setPublish(target?.current?.isPublished ?? false);
    setTouched(false);
  }

  if (!target) return null;

  const clamp = (v: number) => Math.min(SCALE_MAX, Math.max(0, Math.round(v * 10) / 10));
  const delta = Math.round((value - base) * 10) / 10;
  const reasonOk = reason.trim().length >= 3;
  const changed = Math.abs(delta) >= 0.05;

  const bump = (d: number) => { setValue((v) => clamp(v + d)); setTouched(true); };

  return (
    <Modal open onClose={onClose} title={`Ajustar ${target.label}`} size="md">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground">{target.studentName}</p>
          <p className="text-xs text-subtle mt-0.5">{target.label}</p>
        </div>

        {target.calculated === null ? (
          <div className={`rounded-xl border p-4 ${toneBox.attention}`}>
            <p className="text-sm text-foreground">Todavía no hay nada calificado aquí.</p>
            <p className="text-xs text-subtle mt-1">
              Un ajuste se aplica sobre una nota calculada. Califica al menos un ítem primero.
            </p>
          </div>
        ) : (
          <>
            {/* De dónde sale y a dónde llega, siempre a la vista. */}
            <div className="flex items-center justify-center gap-4 rounded-xl border border-surface-border bg-surface-sunken p-4">
              <div className="text-center">
                <p className="text-micro text-subtle uppercase tracking-wide">Calculada</p>
                <p className="text-2xl font-bold tabular-nums text-muted">{formatScore(base)}</p>
              </div>
              <div className="text-center px-2">
                <p className={`text-sm font-bold tabular-nums ${
                  delta > 0 ? 'text-emerald-600 dark:text-emerald-400'
                    : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-faint'
                }`}>
                  {delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? delta.toFixed(1) : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-micro text-subtle uppercase tracking-wide">Quedará en</p>
                <p className={`text-2xl font-bold tabular-nums ${gradeText(value)}`}>{value.toFixed(1)}</p>
              </div>
            </div>

            {/* Cruzar el 3.0 en cualquier dirección es la decisión que más pesa. */}
            {base < PASS && value >= PASS && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 text-center">
                Con este ajuste pasa de reprobado a aprobado.
              </p>
            )}
            {base >= PASS && value < PASS && (
              <p className="text-xs text-red-700 dark:text-red-300 text-center">
                Con este ajuste pasa de aprobado a reprobado.
              </p>
            )}

            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Sumar o restar</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[-0.3, -0.2, -0.1].map((d) => (
                  <button key={d} onClick={() => bump(d)}
                    className="inline-flex items-center gap-0.5 px-3 py-2 rounded-lg border border-surface-border
                               text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover
                               transition-colors duration-[var(--dur-fast)]
                               active:scale-[0.96] motion-reduce:active:scale-100 cursor-pointer">
                    <Minus className="w-3 h-3" />{Math.abs(d).toFixed(1)}
                  </button>
                ))}
                {[0.1, 0.2, 0.3].map((d) => (
                  <button key={d} onClick={() => bump(d)}
                    className="inline-flex items-center gap-0.5 px-3 py-2 rounded-lg border border-surface-border
                               text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover
                               transition-colors duration-[var(--dur-fast)]
                               active:scale-[0.96] motion-reduce:active:scale-100 cursor-pointer">
                    <Plus className="w-3 h-3" />{d.toFixed(1)}
                  </button>
                ))}
                <span className="inline-flex items-center gap-1.5 ml-1 pl-3 border-l border-surface-border">
                  <label htmlFor="adj-exact" className="text-xs text-subtle">o exacta</label>
                  <input
                    id="adj-exact"
                    type="number" step="0.1" min="0" max={SCALE_MAX}
                    value={value}
                    onChange={(e) => { setValue(clamp(Number(e.target.value))); setTouched(true); }}
                    className="w-20 px-3 py-2 rounded-lg border border-surface-border bg-surface
                               text-sm text-foreground tabular-nums text-center
                               focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="adj-reason" className="text-xs font-medium text-muted mb-1.5 block">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="adj-reason" rows={2} value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Participación sostenida en clase, exposición voluntaria…"
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface
                           text-sm text-foreground placeholder:text-faint resize-none
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              {touched && !reasonOk && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Sin motivo escrito no hay cómo sustentar el ajuste ante un reclamo.
                </p>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-cyan-500 cursor-pointer" />
              <span>
                <span className="text-sm text-foreground">Visible para el estudiante</span>
                <span className="block text-xs text-subtle">
                  {publish
                    ? 'La verá de inmediato y contará en su definitiva.'
                    : 'Solo la verás tú hasta que la publiques.'}
                </span>
              </span>
            </label>

            {/* A 390px los tres botones en fila se parten en dos líneas cada
                uno. Apilados se leen, y el destructivo queda lejos del dedo
                que va a guardar. */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              {target.current ? (
                <button onClick={onRemove} disabled={saving}
                  className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2
                             min-h-11 rounded-lg text-xs font-medium whitespace-nowrap
                             text-red-600 dark:text-red-400 hover:bg-red-500/10
                             transition-colors duration-[var(--dur-fast)] disabled:opacity-50 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Quitar ajuste
                </button>
              ) : <span className="hidden sm:block" />}

              <div className="flex items-center gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                <button onClick={onClose} disabled={saving}
                  className="px-4 py-2 min-h-11 rounded-lg border border-surface-border text-sm font-medium whitespace-nowrap
                             text-muted hover:text-foreground hover:bg-surface-hover
                             transition-colors duration-[var(--dur-fast)] disabled:opacity-50 cursor-pointer">
                  Cancelar
                </button>
                <button
                  onClick={() => { setTouched(true); if (reasonOk && changed) onSave(value, reason.trim(), publish); }}
                  disabled={saving || !changed}
                  title={!changed ? 'La nota no ha cambiado' : undefined}
                  className="px-4 py-2 min-h-11 rounded-lg bg-cyan-500 text-white text-sm font-medium whitespace-nowrap
                             hover:bg-cyan-400 transition-colors duration-[var(--dur-fast)]
                             active:scale-[0.98] motion-reduce:active:scale-100
                             disabled:opacity-50 cursor-pointer">
                  {saving ? 'Guardando…' : 'Guardar ajuste'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

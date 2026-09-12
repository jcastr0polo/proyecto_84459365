'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toneBox, toneText } from '@/lib/semantics';
import { CalendarClock, AlertTriangle } from 'lucide-react';

export interface CorteFechas {
  order: number;
  name: string;
  startDate?: string;
  endDate?: string;
  reportDeadline?: string;
}

interface Preview {
  courses: number;
  cortes: number;
  kept: number;
  unmatched: number[];
}

const fecha = (iso?: string) => iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  : '—';

/**
 * Copiar el calendario de cortes de este curso a los demás del semestre.
 *
 * Los cortes suelen ser los mismos para todas las asignaturas: las mismas
 * semanas y el mismo tope para reportar notas. Ponerlas una por una en cada
 * curso es trabajo repetido, y es donde se cuela el error de teclear una fecha
 * distinta en un curso y no enterarse.
 *
 * Nunca se aplica a ciegas: antes de confirmar se consulta al servidor qué
 * cambiaría exactamente, con los mismos parámetros que se van a enviar.
 */
export default function ApplyDatesModal({
  open, onClose, semesterId, courseId, cortes, onDone,
}: {
  open: boolean;
  onClose: () => void;
  semesterId: string;
  /** El curso de origen: no se toca a sí mismo. */
  courseId: string;
  cortes: CorteFechas[];
  onDone: (mensaje: string) => void;
}) {
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conFechas = cortes.filter((c) => c.startDate || c.endDate || c.reportDeadline);

  const payload = useCallback((extra: Record<string, unknown>) => ({
    dates: conFechas.map((c) => ({
      order: c.order,
      startDate: c.startDate ?? '',
      endDate: c.endDate ?? '',
      reportDeadline: c.reportDeadline ?? '',
    })),
    exceptCourseId: courseId,
    overwrite,
    ...extra,
  }), [conFechas, courseId, overwrite]);

  // La vista previa se recalcula al cambiar "sobrescribir": el número de
  // cortes que cambian depende de eso, y enseñar el de antes sería mentir.
  useEffect(() => {
    if (!open || conFechas.length === 0) { setLoading(false); return; }
    let vigente = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/semesters/${semesterId}/corte-dates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload({ dryRun: true })),
        });
        const d = await res.json();
        if (!vigente) return;
        if (!res.ok) setError(d.error ?? 'No se pudo calcular la vista previa');
        else setPreview(d);
      } catch {
        if (vigente) setError('No se pudo calcular la vista previa');
      } finally {
        if (vigente) setLoading(false);
      }
    })();
    return () => { vigente = false; };
  }, [open, semesterId, overwrite, conFechas.length, payload]);

  async function aplicar() {
    setApplying(true);
    try {
      const res = await fetch(`/api/semesters/${semesterId}/corte-dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload({})),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'No se pudo aplicar');
      onDone(d.message ?? 'Calendario aplicado');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Aplicar estas fechas al semestre" size="md">
      <div className="space-y-5">
        {conFechas.length === 0 ? (
          <div className={`rounded-xl border p-4 ${toneBox.attention}`}>
            <p className="text-sm text-foreground">Este curso todavía no tiene fechas puestas.</p>
            <p className="text-xs text-subtle mt-1">
              Ponle fechas a sus cortes primero; después podrás copiarlas al resto del semestre.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-foreground">
                Se copiarán estas fechas a los demás cursos del semestre, emparejando
                <strong> por orden de corte</strong>.
              </p>
              <p className="text-xs text-subtle mt-1">
                Los pesos no se tocan: cuánto vale cada corte es decisión de cada asignatura.
              </p>
            </div>

            <ul className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
              {conFechas.map((c) => (
                <li key={c.order} className="px-4 py-2.5 bg-surface">
                  <p className="text-xs font-medium text-foreground">
                    Corte {c.order} <span className="text-subtle font-normal">· {c.name}</span>
                  </p>
                  <p className="text-micro text-subtle mt-0.5 tabular-nums">
                    {fecha(c.startDate)} → {fecha(c.endDate)}
                    {c.reportDeadline && (
                      <span className="text-cyan-600 dark:text-cyan-400">
                        {' '}· reporte {fecha(c.reportDeadline)}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-cyan-500 cursor-pointer" />
              <span>
                <span className="text-sm text-foreground">Reemplazar las fechas que ya estén puestas</span>
                <span className="block text-xs text-subtle">
                  {overwrite
                    ? 'Se pisarán también los cortes que ya tenían fechas.'
                    : 'Los cortes que ya tienen fechas se quedan como están.'}
                </span>
              </span>
            </label>

            {/* Qué va a pasar, calculado por el servidor con estos mismos
                parámetros. Aplicar a ciegas sobre varios cursos, no. */}
            <div className="rounded-xl border border-surface-border bg-surface-sunken p-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : error ? (
                <p className={`text-sm ${toneText.critical}`}>{error}</p>
              ) : preview ? (
                <>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                    {preview.cortes === 0
                      ? 'No cambiaría ningún corte'
                      : `Cambiarían ${preview.cortes} ${preview.cortes === 1 ? 'corte' : 'cortes'} en ${preview.courses} ${preview.courses === 1 ? 'curso' : 'cursos'}`}
                  </p>
                  {preview.kept > 0 && (
                    <p className="text-xs text-subtle mt-1">
                      {preview.kept} {preview.kept === 1 ? 'conserva' : 'conservan'} las fechas que ya
                      {preview.kept === 1 ? ' tenía' : ' tenían'}.
                    </p>
                  )}
                  {preview.unmatched.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                      Ningún curso tiene corte {preview.unmatched.join(', ')}: esas fechas no se aplican
                      en ninguna parte.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={applying}
            className="px-4 py-2 min-h-11 rounded-lg border border-surface-border text-sm font-medium
                       text-muted hover:text-foreground hover:bg-surface-hover
                       transition-colors duration-[var(--dur-fast)] disabled:opacity-50 cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={aplicar}
            disabled={applying || loading || conFechas.length === 0 || (preview?.cortes ?? 0) === 0}
            className="px-4 py-2 min-h-11 rounded-lg bg-cyan-500 text-white text-sm font-medium
                       hover:bg-cyan-400 transition-colors duration-[var(--dur-fast)]
                       active:scale-[0.98] motion-reduce:active:scale-100
                       disabled:opacity-50 cursor-pointer">
            {applying ? 'Aplicando…' : 'Aplicar al semestre'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

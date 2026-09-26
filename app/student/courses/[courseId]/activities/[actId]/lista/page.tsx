'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Link2, AlertCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import BackLink from '@/components/ui/BackLink';
import Button from '@/components/ui/Button';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ProgressBar from '@/components/checklist/ProgressBar';
import type { ChecklistItem } from '@/lib/types';

/**
 * La lista del estudiante.
 *
 * Se usa en clase, con el docente proyectando el avance de todos. Eso manda en
 * tres decisiones:
 *
 * · La marca es OPTIMISTA. El wifi del aula se cae, y esperar la respuesta del
 *   servidor para pintar el check hace que la gente toque dos y tres veces
 *   creyendo que no funcionó. Se pinta al instante y se revierte si falla.
 * · Cada punto es una fila entera pulsable, no una casilla de 16px. Se marca
 *   con el pulgar, de pie, a veces con el portátil en equilibrio.
 * · No hay nota ni cuenta atrás. Esto no evalúa: enseña el avance.
 */
export default function ListaEstudiantePage() {
  const { courseId, actId } = useParams<{ courseId: string; actId: string }>();
  const { toast } = useToast();
  const reducir = useReducedMotion();

  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const [enVuelo, setEnVuelo] = useState<Set<string>>(new Set());
  const [evidencias, setEvidencias] = useState<Record<string, string>>({});
  const [pidiendoEvidencia, setPidiendoEvidencia] = useState<string | null>(null);
  const campoEvidencia = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/activities/${actId}/lista`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar');
        setTitulo(data.activity.title);
        setDescripcion(data.activity.description ?? '');
        setItems(data.items ?? []);
        setHechos(new Set((data.ticks ?? []).map((t: { itemId: string }) => t.itemId)));
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Error de conexión', 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, [actId, toast]);

  useEffect(() => {
    if (pidiendoEvidencia) campoEvidencia.current?.focus();
  }, [pidiendoEvidencia]);

  const marcar = useCallback(async (item: ChecklistItem, done: boolean, evidenceUrl?: string) => {
    if (enVuelo.has(item.id)) return;

    if (done && item.requiresEvidence && !evidenceUrl) {
      setPidiendoEvidencia(item.id);
      return;
    }

    // Optimista: se pinta ya y se deshace si el servidor dice que no.
    const antes = new Set(hechos);
    setHechos((h) => { const n = new Set(h); if (done) n.add(item.id); else n.delete(item.id); return n; });
    setEnVuelo((v) => new Set(v).add(item.id));
    setPidiendoEvidencia(null);

    try {
      const res = await fetch(`/api/activities/${actId}/lista/marcas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, done, evidenceUrl: evidenceUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      if (done && evidenceUrl) setEvidencias((e) => ({ ...e, [item.id]: evidenceUrl }));
      if (!done) setEvidencias((e) => { const n = { ...e }; delete n[item.id]; return n; });
    } catch (e) {
      setHechos(antes);
      toast(e instanceof Error ? e.message : 'No se guardó. Revisa la conexión.', 'error');
    } finally {
      setEnVuelo((v) => { const n = new Set(v); n.delete(item.id); return n; });
    }
  }, [actId, hechos, enVuelo, toast]);

  if (cargando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-2 w-full" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  const total = items.length;
  const hechas = items.filter((i) => hechos.has(i.id)).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <BackLink href={`/student/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>

      <h1 className="type-page text-foreground mt-2">{titulo}</h1>
      {descripcion && <p className="text-sm text-subtle mt-1 max-w-prose">{descripcion}</p>}

      <div className="mt-5 mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm text-muted">
            <strong className="text-foreground tabular-nums">{hechas}</strong> de {total}
          </p>
          {hechas === total && total > 0 && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Terminaste ✓</p>
          )}
        </div>
        <ProgressBar done={hechas} total={total} />
      </div>

      {total === 0 ? (
        <p className="text-sm text-subtle">El docente todavía no ha puesto los puntos de esta lista.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const marcado = hechos.has(item.id);
            const ocupado = enVuelo.has(item.id);
            const pidiendo = pidiendoEvidencia === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => marcar(item, !marcado)}
                  aria-pressed={marcado}
                  className={`w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3.5 min-h-14
                              transition-[background-color,border-color,transform] duration-[160ms]
                              ease-[var(--ease-out)]
                              active:scale-[0.99] active:duration-[var(--dur-press)]
                              motion-reduce:transition-none motion-reduce:active:scale-100
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                              cursor-pointer disabled:opacity-60
                              ${marcado
                                ? 'border-emerald-500/30 bg-emerald-500/[0.07]'
                                : 'border-surface-border bg-surface hover:bg-surface-hover'}`}
                  disabled={ocupado}
                >
                  {/* La casilla no aparece de la nada: el cuadro ya está, se
                      rellena. Y el check entra a 0.6 de escala, no a 0. */}
                  <span
                    className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center
                                transition-[background-color,border-color] duration-[160ms] ease-[var(--ease-out)]
                                motion-reduce:transition-none
                                ${marcado ? 'bg-emerald-500 border-emerald-500' : 'border-foreground/25'}`}
                    aria-hidden="true"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: marcado ? 1 : 0.6, opacity: marcado ? 1 : 0 }}
                      transition={reducir ? { duration: 0 } : { duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                      style={{ display: 'flex' }}
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className={`block text-[0.9375rem] leading-snug ${marcado ? 'text-muted line-through decoration-emerald-500/40' : 'text-foreground'}`}>
                      {item.text}
                    </span>
                    {item.requiresEvidence && (
                      <span className="mt-1 inline-flex items-center gap-1 text-meta text-subtle">
                        <Link2 className="w-3 h-3" aria-hidden="true" />
                        {evidencias[item.id] ? 'Con evidencia' : 'Pide evidencia'}
                      </span>
                    )}
                  </span>
                </button>

                {pidiendo && (
                  <div className="mt-2 ml-4 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3">
                    <label className="block text-xs font-medium text-muted mb-1.5" htmlFor={`ev-${item.id}`}>
                      Pega el enlace de tu evidencia
                    </label>
                    {/* En un teléfono, el campo y los dos botones en una fila
                        dejan el enlace en un hueco de tres centímetros. */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id={`ev-${item.id}`}
                        ref={campoEvidencia}
                        type="url"
                        placeholder="https://..."
                        className="w-full sm:flex-1 min-w-0 px-3 py-2 min-h-11 rounded-lg bg-foreground/[0.04]
                                   border border-foreground/[0.08] text-sm text-foreground
                                   placeholder:text-faint focus:outline-none focus:border-cyan-500/40"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') marcar(item, true, (e.target as HTMLInputElement).value.trim());
                          if (e.key === 'Escape') setPidiendoEvidencia(null);
                        }}
                      />
                      <div className="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                        <Button variant="primary" size="md"
                          onClick={() => marcar(item, true, campoEvidencia.current?.value.trim())}>
                          Marcar
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setPidiendoEvidencia(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                    <p className="text-meta text-subtle mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                      Un enlace a tu repositorio, a una captura, a lo que sea que lo demuestre.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

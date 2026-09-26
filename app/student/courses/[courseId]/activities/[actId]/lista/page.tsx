'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Image as ImageIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import BackLink from '@/components/ui/BackLink';
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
  const [subiendo, setSubiendo] = useState<string | null>(null);

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

  const marcar = useCallback(async (item: ChecklistItem, done: boolean) => {
    if (enVuelo.has(item.id)) return;

    /* Los puntos con evidencia no se marcan de un toque: se marcan subiendo
       el pantallazo. El botón abre el selector de archivos. */
    if (done && item.requiresEvidence) return;

    // Optimista: se pinta ya y se deshace si el servidor dice que no.
    const antes = new Set(hechos);
    setHechos((h) => { const n = new Set(h); if (done) n.add(item.id); else n.delete(item.id); return n; });
    setEnVuelo((v) => new Set(v).add(item.id));

    try {
      const res = await fetch(`/api/activities/${actId}/lista/marcas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, done }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      if (!done) setEvidencias((e) => { const n = { ...e }; delete n[item.id]; return n; });
    } catch (e) {
      setHechos(antes);
      toast(e instanceof Error ? e.message : 'No se guardó. Revisa la conexión.', 'error');
    } finally {
      setEnVuelo((v) => { const n = new Set(v); n.delete(item.id); return n; });
    }
  }, [actId, hechos, enVuelo, toast]);

  /**
   * Sube el pantallazo y marca el punto de una vez.
   *
   * Aquí NO se pinta optimista: hasta que la imagen no está arriba no hay
   * nada marcado, y fingir lo contrario haría que alguien cerrara el móvil
   * creyendo que ya subió.
   */
  const subirPantallazo = useCallback(async (item: ChecklistItem, file: File) => {
    setSubiendo(item.id);
    try {
      const fd = new FormData();
      fd.append('itemId', item.id);
      fd.append('file', file);
      const res = await fetch(`/api/activities/${actId}/lista/evidencia`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir');
      setHechos((h) => new Set(h).add(item.id));
      setEvidencias((e) => ({ ...e, [item.id]: data.evidenceUrl }));
      toast('Pantallazo subido', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se subió. Revisa la conexión.', 'error');
    } finally {
      setSubiendo(null);
    }
  }, [actId, toast]);

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

            const pidePantallazo = item.requiresEvidence && !marcado;
            const subiendoEste = subiendo === item.id;
            const Fila = pidePantallazo ? 'label' : 'button';

            return (
              <li key={item.id}>
                <Fila
                  {...(pidePantallazo
                    ? {}
                    : { type: 'button' as const, onClick: () => marcar(item, !marcado), 'aria-pressed': marcado })}
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
                  {...(pidePantallazo ? {} : { disabled: ocupado })}
                >
                  {pidePantallazo && (
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif"
                      className="sr-only"
                      disabled={subiendoEste}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) subirPantallazo(item, f);
                      }}
                    />
                  )}
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
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-meta font-medium
                                       text-cyan-600 dark:text-cyan-400">
                        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        {subiendoEste ? 'Subiendo el pantallazo…'
                          : marcado ? 'Pantallazo enviado'
                          : 'Toca para subir el pantallazo'}
                      </span>
                    )}
                    {/* La miniatura: que vea lo que mandó, no solo que lo mandó. */}
                    {marcado && evidencias[item.id] && (
                      /* eslint-disable-next-line @next/next/no-img-element -- la
                         imagen vive en el Blob, con dominio variable. */
                      <img
                        src={`/api/upload/download?url=${encodeURIComponent(evidencias[item.id])}`}
                        alt=""
                        className="mt-2 h-20 rounded-lg border border-surface-border object-cover"
                      />
                    )}
                  </span>
                </Fila>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

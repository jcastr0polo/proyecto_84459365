'use client';

import React, { useEffect, useState } from 'react';
import { Users, Check, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toneBox, toneText } from '@/lib/semantics';

export interface Companero {
  studentId: string; firstName: string; lastName: string; yaEntrego: boolean;
}

/**
 * Elegir con quién se entrega.
 *
 * En una actividad grupal entregaban los cuatro el mismo archivo, y el docente
 * recibía cuatro veces el mismo trabajo. Ahora lo sube uno y marca a los
 * demás: la entrega queda registrada para todos.
 *
 * Quien ya entregó con otro grupo aparece, pero apagado y diciendo por qué.
 * Esconderlo hace que alguien busque a su compañero, no lo encuentre y crea
 * que la lista está rota; y además es información que necesita —significa que
 * ese compañero ya entregó por su cuenta y hay que hablar con él—.
 */
export default function SelectorDeGrupo({
  activityId, seleccionados, onChange, disabled, maxGrupo,
}: {
  activityId: string;
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Tope del grupo ENTERO, quien entrega incluido. Sin valor = sin tope. */
  maxGrupo?: number;
}) {
  /* Quien entrega ya ocupa un sitio: con un tope de 3 puede elegir a 2. */
  const cupoCompaneros = maxGrupo ? maxGrupo - 1 : null;
  const [companeros, setCompaneros] = useState<Companero[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/activities/${activityId}/companeros`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar el curso');
        setCompaneros(data.companeros ?? []);
        /* Si ya estaba en un grupo, se marca solo. Quien reenvía para cambiar
           un archivo no tiene por qué volver a declarar su grupo entero, y si
           se le olvida, sus compañeros pierden la entrega. */
        if ((data.miGrupo ?? []).length > 0) onChange(data.miGrupo);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de conexión');
      }
    })();
    // onChange se omite a propósito: solo se precarga una vez, al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const lleno = cupoCompaneros !== null && seleccionados.length >= cupoCompaneros;

  const alternar = (id: string) => {
    if (seleccionados.includes(id)) { onChange(seleccionados.filter((x) => x !== id)); return; }
    /* Lleno no significa bloqueado del todo: se puede desmarcar para cambiar
       de compañero. Solo se impide añadir uno más. */
    if (lleno) return;
    onChange([...seleccionados, id]);
  };

  return (
    <section className={`rounded-xl border p-4 ${toneBox.action}`}>
      <div className="flex items-start gap-2.5 mb-3">
        <Users className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Esta actividad es en grupo</h3>
          <p className="text-xs text-subtle mt-0.5 max-w-prose">
            Marca a tus compañeros. Subes el trabajo <strong className="text-foreground">una sola vez</strong> y
            queda entregado para todos: ellos no tienen que volver a subirlo.
            {cupoCompaneros !== null && (
              <> Grupos de <strong className="text-foreground">máximo {maxGrupo}</strong>, así que
              puedes elegir {cupoCompaneros}.</>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p className={`text-xs ${toneText.critical}`}>{error}</p>
      )}

      {!companeros && !error && (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-11" />)}</div>
      )}

      {companeros?.length === 0 && (
        <p className="text-xs text-subtle">No hay más estudiantes inscritos en este curso.</p>
      )}

      {companeros && companeros.length > 0 && (
        <>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {companeros.map((c) => {
              const marcado = seleccionados.includes(c.studentId);
              return (
                <li key={c.studentId}>
                  <button
                    type="button"
                    onClick={() => alternar(c.studentId)}
                    disabled={disabled || c.yaEntrego || (lleno && !marcado)}
                    aria-pressed={marcado}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 min-h-11 text-left
                                transition-colors duration-[var(--dur-fast)]
                                active:scale-[0.99] motion-reduce:active:scale-100
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${marcado
                                  ? 'border-cyan-500/40 bg-cyan-500/10'
                                  : 'border-surface-border bg-surface hover:bg-surface-hover cursor-pointer'}`}
                  >
                    <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center
                                      ${marcado ? 'bg-cyan-500 border-cyan-500' : 'border-foreground/25'}`}
                      aria-hidden="true">
                      {marcado && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-foreground truncate">
                        {c.lastName}, {c.firstName}
                      </span>
                      {c.yaEntrego && (
                        <span className="block text-meta text-subtle">
                          Ya entregó con otro grupo
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="text-meta text-subtle mt-3 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
            {seleccionados.length === 0
              ? 'Si no marcas a nadie, la entrega queda solo a tu nombre.'
              : <>Quedará entregado para ti y {seleccionados.length} compañero{seleccionados.length !== 1 ? 's' : ''}
                 {cupoCompaneros !== null && <> · {seleccionados.length + 1} de {maxGrupo}</>}
                 {lleno && <strong className="text-foreground"> · grupo completo</strong>}.</>}
          </p>
        </>
      )}
    </section>
  );
}

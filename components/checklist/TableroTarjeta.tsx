'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

export interface AvanceEstudiante {
  studentId: string;
  firstName: string;
  lastName: string;
  done: number;
  itemIds: string[];
  evidences: { itemId: string; url: string; name: string }[];
  lastAt: string | null;
}

/** "hace 12 s", contra la hora del servidor y no la del portátil del aula. */
function haceCuanto(iso: string | null, ahora: number): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.round((ahora - Date.parse(iso)) / 1000));
  if (s < 10) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.round(m / 60)} h`;
}

/**
 * Una tarjeta del tablero.
 *
 * `layout` de Motion hace el trabajo importante: cuando alguien marca y sube
 * al primer puesto, la tarjeta VIAJA hasta su sitio nuevo en vez de aparecer
 * allí. Ver quién se mueve es el único motivo de que esta pantalla exista; sin
 * el desplazamiento, la lista se recompone de golpe y nadie sabe qué cambió.
 *
 * El muelle va con poco rebote (0.15): la clase entera está mirando esto
 * proyectado y un rebote marcado se vuelve payaso a la tercera vez.
 *
 * Con "reducir movimiento" no viaja ni destella —eso marea—, pero la barra y
 * el número siguen cambiando: la información no se pierde, solo el movimiento.
 */
export default function TableroTarjeta({
  alumno, total, ahora, recienMarcado,
}: {
  alumno: AvanceEstudiante;
  total: number;
  ahora: number;
  /** Acaba de marcar algo: se le da un destello para que el ojo lo encuentre. */
  recienMarcado: boolean;
}) {
  const reducir = useReducedMotion();
  const completo = total > 0 && alumno.done === total;
  const cuando = haceCuanto(alumno.lastAt, ahora);

  return (
    <motion.li
      layout={reducir ? false : 'position'}
      transition={{ type: 'spring', duration: 0.55, bounce: 0.15 }}
      /* Opaca y elevada mientras vuela: al reordenarse, doce tarjetas se
         cruzan a la vez, y con fondo translúcido se leen los nombres unos
         encima de otros. La que acaba de marcar pasa por delante. */
      style={{ zIndex: recienMarcado ? 2 : 1 }}
      className={`relative rounded-2xl border p-4 @container bg-canvas
                  ${completo
                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                    : 'border-surface-border bg-surface-opaque'}`}
    >
      {/* El destello es un hermano absoluto y no un cambio de borde en la
          tarjeta: así no compite con el color de "completo" ni provoca
          recálculo de maquetación al encenderse y apagarse. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-400"
        style={{
          opacity: recienMarcado && !reducir ? 1 : 0,
          transition: recienMarcado ? 'opacity 120ms ease-out' : 'opacity 1100ms ease-out',
        }}
      />

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[1.0625rem] font-semibold text-foreground truncate">
          {alumno.lastName}, {alumno.firstName}
        </p>
        <p className={`text-xl font-bold tabular-nums shrink-0
                       ${completo ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
          {alumno.done}
          <span className="text-sm font-medium text-subtle">/{total}</span>
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar done={alumno.done} total={total} size="lg" />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-meta">
        <span className={cuando ? 'text-subtle' : 'text-faint'}>
          {cuando ?? 'sin empezar'}
        </span>
        {alumno.evidences.length > 0 && (
          <span className="inline-flex items-center gap-1 text-subtle shrink-0">
            <Link2 className="w-3 h-3" aria-hidden="true" />
            {alumno.evidences.length}
          </span>
        )}
      </div>
    </motion.li>
  );
}

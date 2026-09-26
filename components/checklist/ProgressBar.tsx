'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * La barrita de avance.
 *
 * Es la única cosa que se mueve en el tablero mientras la clase mira, así que
 * el detalle importa:
 *
 * · Se anima solo el ancho con transform, no la propiedad `width`: `width`
 *   dispara maquetación y pintado en cada fotograma, y con veinte tarjetas a
 *   la vez eso se nota.
 * · ease-out y 420ms. Es un cambio de estado que alguien está mirando a
 *   propósito, no un adorno de interfaz: más corto y no da tiempo a ver quién
 *   se movió, que es justo para lo que existe.
 * · Vacía no es invisible: el carril siempre está, para que se entienda que
 *   hay algo que llenar.
 */
export default function ProgressBar({
  done, total, size = 'md',
}: {
  done: number;
  total: number;
  size?: 'md' | 'lg';
}) {
  const reducir = useReducedMotion();
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const completo = total > 0 && done === total;

  return (
    <div
      className={`w-full rounded-full bg-foreground/[0.08] overflow-hidden ${size === 'lg' ? 'h-2.5' : 'h-2'}`}
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${done} de ${total} puntos`}
    >
      <div
        className={`h-full origin-left rounded-full
                    ${completo ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
        style={{
          transform: `scaleX(${pct / 100})`,
          width: '100%',
          transition: reducir ? 'none' : 'transform 420ms cubic-bezier(0.23, 1, 0.32, 1), background-color 420ms ease',
        }}
      />
    </div>
  );
}

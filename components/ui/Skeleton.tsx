'use client';

import React from 'react';

/**
 * Skeleton — carga que imita la forma de lo que va a llegar.
 *
 * En el proyecto había 37 pantallas cargando con un spinner centrado y 12 con
 * esqueleto. El spinner no dice nada sobre lo que viene y hace que la página
 * salte cuando llegan los datos; el esqueleto reserva el espacio y la
 * transición no da tirones.
 *
 * Respeta prefers-reduced-motion: sin animación, el bloque se queda quieto.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg bg-foreground/[0.06] animate-pulse
                  motion-reduce:animate-none ${className}`}
    />
  );
}

/** Lista de filas, para tablas y listados. */
export function SkeletonList({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando"
      className={`rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 bg-surface">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Rejilla de tarjetas. */
export function SkeletonCards({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando"
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

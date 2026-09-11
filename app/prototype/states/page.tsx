'use client';

import React from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList, SkeletonCards } from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';

/** Taller — los cuatro vacíos y la carga. */
export default function PrototypeStates() {
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño
      </span>
      <h1 className="type-page text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
        Estados vacíos y de carga
      </h1>

      {[
        ['done', 'No tienes nada pendiente', 'Todas las entregas están calificadas.', null],
        ['empty', 'Sin actividades', 'Todavía no hay actividades publicadas en este curso.', null],
        ['filtered', 'Sin resultados', 'Ningún estudiante coincide con ese filtro.',
          <Button key="a" variant="ghost" size="sm">Limpiar filtros</Button>],
        ['error', 'No se pudieron cargar las notas', 'Revisa tu conexión e inténtalo de nuevo.',
          <Button key="b" variant="secondary" size="sm">Reintentar</Button>],
      ].map(([kind, title, desc, action]) => (
        <div key={kind as string}>
          <p className="type-section text-faint mb-2">{kind as string}</p>
          <div className="rounded-xl border border-surface-border bg-surface">
            <EmptyState
              kind={kind as 'done' | 'empty' | 'filtered' | 'error'}
              title={title as string}
              description={desc as string}
              action={action as React.ReactNode}
              compact
            />
          </div>
        </div>
      ))}

      <div>
        <p className="type-section text-faint mb-2">carga · lista</p>
        <SkeletonList rows={3} />
      </div>
      <div>
        <p className="type-section text-faint mb-2">carga · tarjetas</p>
        <SkeletonCards count={3} />
      </div>
    </div>
  );
}

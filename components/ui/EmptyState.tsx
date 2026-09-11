'use client';

import React from 'react';
import { Inbox, SearchX, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * EmptyState — el hueco cuando no hay nada que mostrar.
 *
 * El error que corrige: había un solo tratamiento para cuatro situaciones que
 * no significan lo mismo. "No tienes nada pendiente" es una buena noticia y se
 * pintaba con la misma caja gris y triste que "no se pudieron cargar los
 * datos". Y donde el componente no encajaba, 26 pantallas improvisaban un
 * párrafo suelto.
 *
 *   empty     Todavía no hay nada. Se invita a crear lo primero.
 *   filtered  Hay datos, pero el filtro no devuelve nada. Se ofrece limpiarlo.
 *   done      No queda nada por hacer. Es un logro, va en verde.
 *   error     Algo falló. Se explica y se ofrece reintentar.
 */

export type EmptyKind = 'empty' | 'filtered' | 'done' | 'error';

const KIND: Record<EmptyKind, { Icon: typeof Inbox; tone: string }> = {
  empty: { Icon: Inbox, tone: 'text-faint' },
  filtered: { Icon: SearchX, tone: 'text-faint' },
  done: { Icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
  error: { Icon: AlertTriangle, tone: 'text-red-600 dark:text-red-400' },
};

interface EmptyStateProps {
  kind?: EmptyKind;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Para huecos dentro de una tarjeta o columna, no en la página entera. */
  compact?: boolean;
  /** Deja pasar un icono propio; si no, se usa el del tipo. */
  icon?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  kind = 'empty', title, description, action, compact = false, icon, className = '',
}: EmptyStateProps) {
  const { Icon, tone } = KIND[kind];

  return (
    <div
      role={kind === 'error' ? 'alert' : undefined}
      className={`flex flex-col items-center justify-center text-center
                  ${compact ? 'py-8 px-4' : 'py-16 px-6'}
                  ${kind === 'error' ? 'rounded-xl border border-red-500/20 bg-red-500/[0.04]' : ''}
                  ${className}`}
    >
      <div className={`mb-3 ${tone}`} aria-hidden="true">
        {icon ?? <Icon className={compact ? 'w-6 h-6' : 'w-8 h-8'} />}
      </div>
      <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${
        kind === 'done' ? 'text-foreground' : 'text-muted'} mb-1`}>
        {title}
      </h3>
      {description && (
        <p className={`text-subtle max-w-sm ${compact ? 'text-xs' : 'text-sm'} ${action ? 'mb-5' : ''}`}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

'use client';

import React from 'react';

/**
 * Card — la superficie del sitio.
 *
 * Antes había 54 tarjetas hechas a mano con 8 combinaciones distintas de
 * opacidad de borde y fondo. Ahora la superficie se define una sola vez, con
 * tokens (--surface-*) que ya resuelven claro y oscuro.
 *
 * Detalles de comportamiento:
 * - Solo transiciona color, nunca `all`.
 * - Si es clicable responde al presionar, no al soltar.
 * - El hover está detrás de un gate de puntero fino: en táctil el hover se
 *   queda "pegado" tras el toque y ensucia la interfaz.
 */

type Elevation = 'flat' | 'raised' | 'sunken';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: Elevation;
  hover?: boolean;
  onClick?: () => void;
  title?: string;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const elevationClasses: Record<Elevation, string> = {
  flat: 'border-surface-border bg-surface',
  raised: 'border-surface-border bg-surface shadow-sm dark:shadow-none',
  sunken: 'border-surface-border bg-surface-sunken',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  elevation = 'flat',
  hover = false,
  onClick,
  title,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  const interactive = Boolean(onClick);

  return (
    <Tag
      onClick={onClick}
      title={title}
      className={[
        'rounded-xl border',
        elevationClasses[elevation],
        // En Tailwind v4 `hover:` ya viene envuelto en @media (hover: hover),
        // así que en táctil no se queda pegado tras el toque.
        (hover || interactive)
          && 'transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] '
           + 'hover:border-surface-border-hover hover:bg-surface-hover',
        interactive
          && 'text-left w-full cursor-pointer active:bg-surface-hover '
           + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40',
        paddingClasses[padding],
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-foreground/90 tracking-wide uppercase ${className}`}>
      {children}
    </h3>
  );
}

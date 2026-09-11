'use client';

import React from 'react';

/**
 * Chip — botón compacto con estado, para filtrar o alternar.
 *
 * Generaliza el FilterChip original. Los chips de la pantalla de proyectos
 * (Público/Privado, Bloqueado) son conceptualmente lo mismo —un botón que
 * refleja un estado— pero estaban escritos a mano con sus propias clases y
 * sus propios colores. Un tercer componente para lo mismo habría sido volver
 * a fabricar heterogeneidad.
 *
 * `aria-pressed` va siempre: en un filtro y en un interruptor, el estado
 * tiene que llegar al lector de pantalla, no solo al color.
 */

type Tone = 'accent' | 'positive' | 'warning' | 'danger' | 'neutral';

const ACTIVE: Record<Tone, string> = {
  accent: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'border-foreground/15 bg-foreground/10 text-foreground',
};

const IDLE = 'border-surface-border bg-surface text-subtle hover:text-foreground hover:bg-surface-hover';

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: Tone;
  /** Punto de color a la izquierda, para listas de estados. */
  dot?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

export default function Chip({
  active, onClick, children, tone = 'accent', dot, icon, disabled, title,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-meta font-medium border
                  transition-colors duration-[var(--dur-fast)] cursor-pointer
                  active:scale-[0.97] motion-reduce:active:scale-100
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                  ${active ? ACTIVE[tone] : IDLE}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {icon}
      {children}
    </button>
  );
}

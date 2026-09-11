'use client';

import React from 'react';

/**
 * IconButton — botón de solo icono.
 *
 * Existían 39 repartidos por la aplicación, cada uno con sus clases a mano y
 * cuatro combinaciones de color distintas. Se hacían así porque Button impone
 * min-h-[44px] y una caja pensada para texto, que no encaja con un lápiz de
 * 16px; faltaba la primitiva, no disciplina.
 *
 * Dos detalles que casi ninguno de los 39 tenía:
 *
 * - `aria-label` obligatorio. Un botón cuyo contenido es un SVG no dice nada
 *   a un lector de pantalla; el `title` no basta.
 * - Área de pulsación de 44px sin agrandar el icono, mediante un
 *   pseudo-elemento. Un `p-2` sobre un icono de 16px da 32px, por debajo del
 *   mínimo recomendado, y en móvil se falla el toque.
 */

type Tone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const TONES: Record<Tone, string> = {
  neutral: 'text-faint hover:text-foreground hover:bg-foreground/[0.06]',
  accent: 'text-subtle hover:text-cyan-500 hover:bg-cyan-500/10',
  positive: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
  warning: 'text-subtle hover:text-amber-500 hover:bg-amber-500/10',
  danger: 'text-red-600 dark:text-red-400 hover:bg-red-500/10',
};

const SIZES: Record<Size, string> = {
  sm: 'p-1.5 rounded-md',
  md: 'p-2 rounded-lg',
  lg: 'p-2.5 rounded-lg',
};

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Obligatorio: es lo único que anuncia el lector de pantalla. */
  label: string;
  icon: React.ReactNode;
  tone?: Tone;
  size?: Size;
}

export default function IconButton({
  label, icon, tone = 'neutral', size = 'md', className = '', ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`
        relative inline-flex items-center justify-center cursor-pointer
        transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]
        active:scale-[0.94] active:duration-[var(--dur-press)]
        motion-reduce:transition-none motion-reduce:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2
        after:w-11 after:h-11 after:content-['']
        ${TONES[tone]} ${SIZES[size]} ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
}

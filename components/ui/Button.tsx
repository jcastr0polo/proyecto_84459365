'use client';

import React from 'react';

/**
 * Button — el botón del sitio.
 *
 * Cambios de comportamiento frente a la versión anterior:
 * - Ya no usa `transition-all`: solo transiciona las propiedades que cambian.
 * - Responde al presionar (`active:scale-[0.97]`) y esa respuesta es más rápida
 *   que el hover; un botón que no acusa el clic se siente muerto.
 * - `hover:` en Tailwind v4 ya va con gate de puntero fino, así que en móvil
 *   no se queda pegado.
 * - Respeta prefers-reduced-motion.
 *
 * Las variantes salen de lib/semantics.ts, no del gusto: cian = acción, rojo =
 * destructivo, ámbar = atención. Faltaban dos papeles —destructivo secundario y
 * atención— y por eso había medio centenar de botones escritos a mano que se
 * los inventaban con clases sueltas.
 */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-ghost' | 'warning' | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  /* Tinta oscura, no blanca. Medido sobre el píxel pintado, el blanco sobre
     cian-500 da 2.37:1 y el mínimo AA para 14px es 4.5:1; con tinta oscura son
     8.4:1 sin tocar el cian de la marca. Oscurecer el fondo hasta que aguante
     blanco habría apagado el acento en toda la aplicación. */
  primary:
    'bg-cyan-500 text-slate-950 hover:bg-cyan-400 focus-visible:ring-cyan-500/50 active:bg-cyan-600',
  secondary:
    'bg-foreground/10 text-foreground hover:bg-foreground/15 focus-visible:ring-foreground/30 active:bg-foreground/20 border border-foreground/10',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/50 active:bg-red-700',
  /* Destructivo secundario: quitar, deshacer, revertir. En rojo sólido
     compite con la acción principal del pie del diálogo y asusta más de lo que
     el acto merece; en gris no se lee como destructivo. */
  'danger-ghost':
    'bg-transparent text-red-600 dark:text-red-400 hover:bg-red-500/10 focus-visible:ring-red-500/40 active:bg-red-500/15',
  /* Ámbar = "atención pronto" (lib/semantics.ts): poner un 0, cerrar un plazo.
     No es destruir nada, pero tampoco es una acción neutra. */
  warning:
    'bg-amber-500 text-slate-950 hover:bg-amber-400 focus-visible:ring-amber-500/50 active:bg-amber-600',
  ghost:
    'bg-transparent text-muted hover:bg-foreground/5 hover:text-foreground focus-visible:ring-foreground/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  /* Para filas densas de acciones, donde convive con Chip y IconButton: misma
     caja que el chip, y los 44px de pulsación por pseudo-elemento, que crecen
     solo en vertical para no solapar con el vecino. Con min-h-[44px] real esta
     fila se rompería. */
  xs: "px-2.5 py-1.5 text-meta rounded-lg gap-1.5 after:absolute after:inset-x-0 "
    + "after:top-1/2 after:-translate-y-1/2 after:h-11 after:content-['']",
  sm: 'px-3.5 py-2 text-xs rounded-lg gap-1.5 min-h-[44px]',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2 min-h-[44px]',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center font-medium
        transition-[color,background-color,border-color,transform,opacity]
        duration-[var(--dur-fast)] ease-[var(--ease-standard)]
        active:scale-[0.97] active:duration-[var(--dur-press)]
        motion-reduce:transition-none motion-reduce:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

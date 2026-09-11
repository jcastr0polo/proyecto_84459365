'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * StatTile — un número del tablero.
 *
 * La regla: un número sin camino a su origen es decoración. Si el tablero
 * dice "4 van perdiendo", tiene que poder llevar a esos cuatro; si no, obliga
 * a salir a buscarlos a mano y el tablero no ahorra ningún trabajo.
 *
 * Cuando hay destino, la pieza se comporta y se ve como algo pulsable: cambia
 * al pasar por encima, responde al presionar y muestra una flecha. Un número
 * que lleva a algún sitio sin parecerlo es peor que uno que no lleva.
 */
export default function StatTile({
  icon: Icon, label, value, tone = 'text-foreground', highlight, href, onClick, hint,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: string;
  /** Clases de borde y fondo cuando el dato pide atención. */
  highlight?: string;
  href?: string;
  onClick?: () => void;
  hint?: string;
}) {
  const interactive = Boolean(href || onClick);

  const body = (
    <>
      <p className="text-micro uppercase tracking-wider text-subtle flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums leading-none mt-2 ${tone}`}>{value}</p>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span className="text-micro text-faint truncate">{hint}</span>
        {interactive && (
          <ArrowRight className="w-3.5 h-3.5 text-faint shrink-0 opacity-0
                                 group-hover:opacity-100 group-focus-visible:opacity-100
                                 transition-opacity" />
        )}
      </div>
    </>
  );

  const cls = `group block text-left rounded-xl border p-4 w-full
    ${highlight ?? 'border-surface-border bg-surface'}
    ${interactive
      ? `cursor-pointer transition-colors duration-[var(--dur-fast)]
         hover:border-surface-border-hover hover:bg-surface-hover
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40`
      : ''}`;

  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

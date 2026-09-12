'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Enlace de "volver".
 *
 * Existía 43 veces escrito a mano en 32 archivos, con once textos distintos,
 * dos iconos y clases que no coincidían entre sí. Es el mismo gesto en toda la
 * app, así que es un componente.
 *
 * Y es un ENLACE, no un botón con router.push. Un botón no se anuncia como
 * enlace al lector de pantalla, no se abre en otra pestaña con clic central ni
 * con cmd, y no ofrece "copiar dirección". Cuando de verdad no hay destino
 * —volver a la pantalla anterior sea cual sea— se pasa `onClick` y entonces sí
 * es un botón, que es lo correcto para una acción.
 */
export default function BackLink({
  href, onClick, children, className = '',
}: {
  /** Destino. Con href se renderiza como enlace. */
  href?: string;
  /** Sin href: acción de retroceso (router.back). Se renderiza como botón. */
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const shared =
    'inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground ' +
    'transition-colors duration-[var(--dur-fast)] py-2 pr-3 rounded-lg min-h-11 ' +
    'hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 ' +
    `focus-visible:ring-cyan-500/40 ${className}`;

  const inner = (
    <>
      <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
      {children}
    </>
  );

  if (href) return <Link href={href} className={shared}>{inner}</Link>;

  return (
    <button type="button" onClick={onClick} className={`${shared} cursor-pointer`}>
      {inner}
    </button>
  );
}

import React from 'react';

/**
 * La marca de NEXUS.
 *
 * Hasta ahora el logotipo era el icono `Cpu` de lucide metido en un cuadrado
 * con degradado, repetido a mano en ocho sitios con tres tamaños distintos: un
 * icono prestado que dibuja un microprocesador, que no es lo que hace esto.
 *
 * La marca es una N cuyos extremos son nodos unidos por un trazo. Nexus es
 * unión, y esa es la lectura: docencia y estudiante conectados. Está pensada
 * para aguantar 16px —a ese tamaño los nodos se funden con el trazo y lo que
 * queda es una N legible— y el mismo dibujo es el favicon, el icono de la
 * pantalla de inicio y el de la tarjeta al compartir el enlace. Se genera todo
 * desde este único SVG, así que no pueden desincronizarse.
 */

const TAMANOS = {
  xs: 'w-7 h-7 rounded-lg',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-14 h-14 rounded-2xl',
} as const;

export default function NexusMark({
  size = 'sm', className = '', decorative = false,
}: {
  size?: keyof typeof TAMANOS;
  className?: string;
  /** Junto a la palabra "NEXUS" el icono no aporta nada al lector de pantalla. */
  decorative?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0
                  bg-gradient-to-br from-cyan-400 to-blue-500 ${TAMANOS[size]} ${className}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'NEXUS'}
      aria-hidden={decorative || undefined}
    >
      <svg viewBox="0 0 32 32" className="w-[62%] h-[62%]" aria-hidden="true">
        <g stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M8.6 24.4 V 7.6" />
          <path d="M8.6 7.6 L 23.4 24.4" />
          <path d="M23.4 24.4 V 7.6" />
        </g>
        <circle cx="8.6" cy="7.6" r="3.3" fill="#ffffff" />
        <circle cx="23.4" cy="24.4" r="3.3" fill="#ffffff" />
      </svg>
    </span>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ThumbItem {
  /** Destino. Sin href, la celda es un botón (por ejemplo, abrir "Más"). */
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  /** Coincide también con las subrutas (/admin/courses/xyz activa "Cursos"). */
  match?: string;
  /** Número que se pinta encima del icono. 0 o ausente = no se pinta. */
  badge?: number;
}

/**
 * Barra de navegación al alcance del pulgar, solo en móvil.
 *
 * En un teléfono, lo de arriba de la pantalla es justo lo que no se alcanza
 * sin recolocar la mano. El menú vivía en un cajón detrás de un botón en la
 * esquina superior: dos gestos y un estiramiento para cambiar de sección. Aquí
 * abajo es un toque, con el dedo donde ya está.
 *
 * Cuatro o cinco destinos como mucho: es lo que cabe sin que los blancos entre
 * iconos se hagan más estrechos que la yema de un dedo.
 *
 * Detalles que no son adorno:
 * · `pb-[env(safe-area-inset-bottom)]` — en los iPhone con barra de gestos, sin
 *   esto el último renglón de iconos queda debajo de la barra del sistema.
 * · 56px de alto por celda, por encima de los 44 que pide la norma.
 * · El icono NO va solo: lleva su etiqueta debajo. Un icono sin texto obliga a
 *   adivinar, y aquí el que adivina mal pierde el hilo de lo que estaba
 *   haciendo.
 */
export default function ThumbNav({
  items, hideAt = 'md',
}: {
  items: ThumbItem[];
  /** Desde qué ancho desaparece: donde ya hay barra lateral. */
  hideAt?: 'md' | 'lg';
}) {
  const pathname = usePathname();

  const esActivo = (item: ThumbItem) => {
    const base = item.match ?? item.href;
    if (!base) return false;
    // El inicio solo coincide exacto: si no, se quedaría activo siempre.
    if (base === '/admin' || base === '/student') return pathname === base;
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  const oculto = hideAt === 'lg' ? 'lg:hidden' : 'md:hidden';

  return (
    <nav
      aria-label="Accesos rápidos"
      className={`${oculto} fixed bottom-0 inset-x-0 z-40
                  border-t border-surface-border bg-canvas/95 backdrop-blur
                  pb-[env(safe-area-inset-bottom)]`}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const activo = esActivo(item);
          const contenido = (
            <>
              <span className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    aria-hidden="true"
                    /* Aquí el tamaño fijo sí está justificado: es un número
                       dentro de un círculo, no texto que se lee de corrido.
                       Con la escala normal se sale del círculo. */
                    className="absolute -top-2 -right-2.5 min-w-[20px] h-[20px] px-1
                               rounded-full bg-red-500 text-white text-[12px] font-bold
                               leading-[20px] text-center tabular-nums"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span className="text-meta leading-none font-medium">
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="sr-only"> ({item.badge} pendientes)</span>
                )}
              </span>
            </>
          );

          const clases = `w-full h-14 flex flex-col items-center justify-center gap-1
                          transition-colors duration-[var(--dur-fast)]
                          active:bg-surface-hover cursor-pointer
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-inset focus-visible:ring-cyan-500/40
                          ${activo ? 'text-cyan-600 dark:text-cyan-400' : 'text-subtle'}`;

          return (
            <li key={item.href ?? item.label} className="flex-1">
              {item.href ? (
                <Link href={item.href} aria-current={activo ? 'page' : undefined} className={clases}>
                  {contenido}
                </Link>
              ) : (
                /* "Más" no navega: abre el cajón con el resto del menú. La
                   barra da atajos a lo de siempre, no reemplaza al menú
                   completo — nada deja de estar accesible. */
                <button type="button" onClick={item.onClick} className={clases}>
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

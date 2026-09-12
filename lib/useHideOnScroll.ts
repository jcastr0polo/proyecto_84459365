'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Esconde la barra superior al bajar y la devuelve al subir.
 *
 * En un teléfono la cabecera se come una franja de pantalla que no aporta nada
 * mientras se lee una lista larga. Esconderla al bajar devuelve ese espacio al
 * contenido; devolverla en cuanto se sube un poco evita el otro problema, que
 * es tener que llegar al final del scroll para recuperar la navegación.
 *
 * Detalles que hacen que no moleste:
 * · No se esconde cerca del principio: si la página apenas se ha movido, hacer
 *   desaparecer la cabecera parece un fallo.
 * · Hay un umbral de unos píxeles: sin él, el temblor natural del dedo al leer
 *   hace que la barra parpadee.
 * · Se mide con requestAnimationFrame y no en cada evento de scroll, que en
 *   móvil se dispara decenas de veces por segundo.
 * · Con el teclado abierto o en pantallas grandes no aplica: quien lo llama
 *   decide dónde usarlo.
 */
export function useHideOnScroll({
  threshold = 8,
  minScroll = 64,
  target,
}: {
  threshold?: number;
  minScroll?: number;
  /**
   * Qué elemento hace scroll. Por defecto la ventana, pero en el panel de
   * administración el que se desplaza es el <main>, no el documento: si se
   * escucha a la ventana ahí, no llega ni un solo evento.
   */
  target?: React.RefObject<HTMLElement | null>;
} = {}): boolean {
  const [visible, setVisible] = useState(true);
  const ultimo = useRef(0);
  const pendiente = useRef(false);

  useEffect(() => {
    const el: HTMLElement | Window = target?.current ?? window;
    const posY = () => (el === window ? window.scrollY : (el as HTMLElement).scrollTop);

    ultimo.current = posY();

    const medir = () => {
      pendiente.current = false;
      const y = posY();
      const delta = y - ultimo.current;

      // Cerca del principio siempre visible: esconderla ahí parece un fallo.
      if (y < minScroll) { setVisible(true); ultimo.current = y; return; }
      // Umbral: sin esto el temblor del dedo la hace parpadear.
      if (Math.abs(delta) < threshold) return;

      setVisible(delta < 0);
      ultimo.current = y;
    };

    const onScroll = () => {
      if (pendiente.current) return;
      pendiente.current = true;
      requestAnimationFrame(medir);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [threshold, minScroll, target]);

  return visible;
}

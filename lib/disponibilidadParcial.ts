import { parseDateColombia } from '@/lib/dateUtils';
import type { Quiz } from '@/lib/types';

/**
 * ¿Se puede presentar este parcial ahora mismo?
 *
 * La regla estaba escrita tres veces —el filtro de la lista del estudiante, la
 * ruta de envío y, mal, el badge del panel— y el panel se había quedado atrás:
 * enseñaba «Activo» mirando solo la bandera, así que un parcial cuya fecha
 * cerró hace una semana seguía anunciándose como activo. El docente veía una
 * cosa y el estudiante se encontraba otra.
 *
 * Ahora la regla vive aquí y los tres la usan. Si cambia, cambia para todos.
 *
 * Las fechas se interpretan como medianoche de Colombia: una fecha sola
 * ("2026-10-30") abre a las 00:00 de ese día. Para el cierre eso significa que
 * `endDate` es el último instante ANTES de ese día —si quieres que el día 30
 * cuente entero, el cierre es el 31—; es como se comportaba ya el servidor y
 * no se cambia aquí, solo se nombra.
 */

export type EstadoParcial =
  | 'inactivo'      // el docente no lo ha activado
  | 'programado'    // activo, pero su fecha de apertura aún no llega
  | 'abierto'       // se puede presentar
  | 'cerrado';      // su fecha de cierre ya pasó

export interface Disponibilidad {
  estado: EstadoParcial;
  /** Lo que se le enseña al docente. */
  etiqueta: string;
  /** Para colorear, según lib/semantics.ts. */
  tono: 'ok' | 'attention' | 'critical' | 'lifecycle';
  abre: Date | null;
  cierra: Date | null;
}

export function disponibilidadDe(
  quiz: Pick<Quiz, 'isActive' | 'startDate' | 'endDate'>,
  ahora: Date = new Date(),
): Disponibilidad {
  const abre = quiz.startDate ? parseDateColombia(quiz.startDate) : null;
  const cierra = quiz.endDate ? parseDateColombia(quiz.endDate) : null;

  /* El orden importa: un parcial desactivado no está "cerrado" ni
     "programado", está apagado, y es lo primero que hay que saber. */
  if (!quiz.isActive) {
    return { estado: 'inactivo', etiqueta: 'Inactivo', tono: 'lifecycle', abre, cierra };
  }
  if (abre && abre > ahora) {
    return { estado: 'programado', etiqueta: 'Programado', tono: 'attention', abre, cierra };
  }
  if (cierra && cierra < ahora) {
    return { estado: 'cerrado', etiqueta: 'Cerrado', tono: 'critical', abre, cierra };
  }
  return { estado: 'abierto', etiqueta: 'Abierto ahora', tono: 'ok', abre, cierra };
}

/** ¿Lo ve el estudiante en su lista y puede responderlo? */
export function sePuedePresentar(
  quiz: Pick<Quiz, 'isActive' | 'startDate' | 'endDate'>,
  ahora: Date = new Date(),
): boolean {
  return disponibilidadDe(quiz, ahora).estado === 'abierto';
}

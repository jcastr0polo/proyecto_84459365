/**
 * lib/semantics.ts
 * Qué significa cada color en esta plataforma. Una sola respuesta por color.
 *
 * El problema que resuelve: el ámbar llegó a significar cinco cosas a la vez
 * —plazo próximo, nota entre 3.0 y 3.9, nota sin publicar, actividad en
 * borrador y "sin entrega"—. Un color que significa cinco cosas no lo puede
 * aprender nadie, y deja de avisar de nada.
 *
 * Las reglas:
 *
 *   rojo      Algo va mal y ya. Vencido, perdiendo, bloqueado.
 *   ámbar     Atención pronto. Vence en días, va raspando, falta por hacer.
 *   verde     Bien o completo.
 *   cian      Acción disponible. Es el acento interactivo, no un estado.
 *   neutro    Estado del ciclo de vida, sin juicio: borrador, sin publicar,
 *             sin datos. Antes esto iba en ámbar y competía con lo urgente.
 *
 * El color nunca va solo: todo estado lleva texto, y donde toca un icono.
 * Para las notas, la escala vive en lib/gradeScale.ts y sigue estas reglas.
 */

export type Tone = 'critical' | 'attention' | 'ok' | 'action' | 'lifecycle';

/** Texto. */
export const toneText: Record<Tone, string> = {
  critical: 'text-red-600 dark:text-red-400',
  attention: 'text-amber-600 dark:text-amber-400',
  ok: 'text-emerald-600 dark:text-emerald-400',
  action: 'text-cyan-600 dark:text-cyan-400',
  lifecycle: 'text-subtle',
};

/** Punto de color para listas de estado. */
export const toneDot: Record<Tone, string> = {
  critical: 'bg-red-500',
  attention: 'bg-amber-500',
  ok: 'bg-emerald-500',
  action: 'bg-cyan-500',
  lifecycle: 'bg-foreground/25',
};

/** Recuadro completo: borde y fondo, para tarjetas y avisos. */
export const toneBox: Record<Tone, string> = {
  critical: 'border-red-500/25 bg-red-500/[0.06]',
  attention: 'border-amber-500/25 bg-amber-500/[0.06]',
  ok: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  action: 'border-cyan-500/25 bg-cyan-500/[0.06]',
  lifecycle: 'border-surface-border bg-surface',
};

/** Insignia pequeña. */
export const toneChip: Record<Tone, string> = {
  critical: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
  attention: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  action: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  lifecycle: 'border-surface-border bg-surface-sunken text-subtle',
};

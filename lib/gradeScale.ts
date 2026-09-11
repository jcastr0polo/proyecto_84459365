/**
 * lib/gradeScale.ts
 * Escala de calificación colombiana — fuente única de verdad.
 *
 * Antes estos umbrales estaban escritos a mano en 29 sitios, y no coincidían:
 * un 3.9 se pintaba de ámbar en la vista de notas mientras una insignia verde
 * a su lado decía "Aprobado". Todo lo que pinte o juzgue una nota debe pasar
 * por aquí.
 *
 * Seguro para el cliente: sin I/O ni dependencias de servidor.
 */

/** Nota máxima de la escala. */
export const SCALE_MAX = 5.0;

/** Nota mínima para aprobar (RN-CAL-07). */
export const PASS = 3.0;

/** A partir de aquí la nota se considera holgada, no "aprobado raspando". */
export const COMFORTABLE = 4.0;

export type GradeTone = 'good' | 'warn' | 'fail' | 'empty';

/** Clasifica una nota. `null` (sin calificar) es su propio caso, no un cero. */
export function toneOf(score: number | null | undefined): GradeTone {
  if (score === null || score === undefined) return 'empty';
  if (score >= COMFORTABLE) return 'good';
  if (score >= PASS) return 'warn';
  return 'fail';
}

export function isPassing(score: number | null | undefined): boolean | null {
  if (score === null || score === undefined) return null;
  return score >= PASS;
}

/** Convierte cualquier puntaje a la escala 0.0–5.0. */
export function normalize(score: number, maxScore: number): number {
  if (!maxScore) return 0;
  return (score / maxScore) * SCALE_MAX;
}

const TEXT: Record<GradeTone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  fail: 'text-red-600 dark:text-red-400',
  empty: 'text-faint',
};

const BAR: Record<GradeTone, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-red-500',
  empty: 'bg-transparent',
};

const CHIP: Record<GradeTone, string> = {
  good: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warn: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  fail: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
  empty: 'border-foreground/10 bg-foreground/5 text-faint',
};

/** Solo borde y fondo, sin color de texto: para contenedores cuyos hijos ya pintan su texto. */
const SURFACE: Record<GradeTone, string> = {
  good: 'border-emerald-500/20 bg-emerald-500/10',
  warn: 'border-amber-500/20 bg-amber-500/10',
  fail: 'border-red-500/20 bg-red-500/10',
  empty: 'border-foreground/10 bg-foreground/5',
};

export const gradeSurface = (score: number | null | undefined) => SURFACE[toneOf(score)];
export const gradeText = (score: number | null | undefined) => TEXT[toneOf(score)];
export const gradeBar = (score: number | null | undefined) => BAR[toneOf(score)];
export const gradeChip = (score: number | null | undefined) => CHIP[toneOf(score)];

/** Formatea una nota; el guion largo deja claro que no hay dato, a diferencia de un 0.0. */
export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? '—' : score.toFixed(1);
}

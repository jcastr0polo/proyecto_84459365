/**
 * lib/activityStatus.ts
 * Estado de entrega de una actividad — fuente única de verdad.
 *
 * Esta lógica estaba copiada en tres sitios (la vista de curso, la lista de
 * actividades y una variante en el panel) y ya había divergido: el orden de
 * prioridad y las etiquetas no coincidían entre pantallas.
 *
 * Seguro para el cliente: sin I/O.
 */

import { parseDateColombia, parseDateTimeColombia } from '@/lib/dateUtils';
import type { Activity, Submission } from '@/lib/types';

export type DeliveryStatus = 'returned' | 'overdue' | 'pending' | 'delivered' | 'graded';

/**
 * Urgencia real. Lo devuelto va primero porque el profesor pidió una
 * corrección; después lo vencido, y solo entonces lo que aún no vence.
 * (Antes 'pending' iba antes que 'overdue', así que una entrega a tres
 * semanas aparecía encima de una ya vencida.)
 */
export const PRIORITY: Record<DeliveryStatus, number> = {
  returned: 0, overdue: 1, pending: 2, delivered: 3, graded: 4,
};

export const STATUS_META: Record<DeliveryStatus, { label: string; dot: string; text: string }> = {
  returned: { label: 'Devuelta', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Vencida', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  pending: { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  delivered: { label: 'Entregada', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  graded: { label: 'Calificada', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
};

export const TYPE_LABELS: Record<string, string> = {
  project: 'Proyecto', exercise: 'Ejercicio', document: 'Documento',
  presentation: 'Presentación', prompt: 'Prompt', exam: 'Examen',
  quiz: 'Parcial', manual: 'Nota manual', other: 'Otro',
};

/** `now` se recibe como parámetro para que el render sea puro y estable. */
export function deliveryStatus(
  activity: Activity,
  submission: Submission | undefined,
  now: Date,
): DeliveryStatus {
  if (submission) {
    if (submission.status === 'reviewed') return 'graded';
    if (submission.status === 'returned') return 'returned';
    return 'delivered';
  }
  const due = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59');
  return now > due ? 'overdue' : 'pending';
}

/** Necesita acción del estudiante. */
export const needsAction = (s: DeliveryStatus) =>
  s === 'pending' || s === 'overdue' || s === 'returned';

/**
 * El plazo en palabras. Un "1d" no distingue si ya venció o si falta un día,
 * y "en 21 días" se lee peor que "en 3 semanas".
 */
export function dueLabel(dueDate: string, today: Date): string {
  const days = Math.round((parseDateColombia(dueDate).getTime() - today.getTime()) / 86400000);
  if (days < -1) return `Venció hace ${Math.abs(days)} días`;
  if (days === -1) return 'Venció ayer';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `En ${days} días`;
  return `En ${Math.ceil(days / 7)} semanas`;
}

/** Medianoche de hoy en hora Colombia: estable entre servidor y cliente. */
export function startOfTodayColombia(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * lib/migrations.ts — Cambios de esquema, declarados aquí y solo aquí.
 *
 * La pantalla de estado de la base puede aplicarlos, pero el cliente NUNCA
 * manda SQL: manda el ID de una de estas migraciones. El texto que se ejecuta
 * vive en el repositorio, se revisa en un commit y queda en el historial. Una
 * caja donde escribir contra producción desde el navegador es otra cosa.
 *
 * Reglas para añadir una:
 * · `statements` debe ser idempotente (IF NOT EXISTS, IF EXISTS…): aplicarla
 *   dos veces no puede romper nada.
 * · `requires` dice qué columnas deben existir cuando esté aplicada. Se
 *   comprueba por PostgREST, no por conexión directa, para que la pantalla
 *   funcione en Vercel —donde el pool de Postgres no llega— y para que
 *   detecte también lo aplicado a mano por fuera de la aplicación.
 * · `why` se le muestra al docente antes de ejecutar. Que se entienda.
 */

export interface Migration {
  id: string;
  title: string;
  why: string;
  /** Se ejecutan en una transacción, en orden. Requieren conexión directa. */
  statements: string[];
  /** Columnas que deben existir cuando la migración esté aplicada. */
  requires: { table: string; column: string }[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: '2026-09-cortes-fechas',
    title: 'Fechas del corte',
    why:
      'Añade inicio, cierre y tope de reporte de notas a los cortes. El tope de '
      + 'reporte es la fecha para subir las notas a la plataforma de la universidad, '
      + 'y es la que el panel usa para avisarte. Las tres nacen vacías: ningún corte '
      + 'existente cambia hasta que le pongas fechas.',
    statements: [
      'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS start_date DATE',
      'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS end_date DATE',
      'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS report_deadline DATE',
    ],
    requires: [
      { table: 'cortes', column: 'start_date' },
      { table: 'cortes', column: 'end_date' },
      { table: 'cortes', column: 'report_deadline' },
    ],
  },
];

export function findMigration(id: string): Migration | undefined {
  return MIGRATIONS.find((m) => m.id === id);
}

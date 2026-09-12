/**
 * lib/migrations.ts — Cambios de esquema, declarados aquí y solo aquí.
 *
 * La pantalla de estado de la base puede aplicarlos, pero el cliente NUNCA
 * manda SQL: manda el ID de una de estas migraciones. El SQL vive en el
 * repositorio, se revisa en un commit y queda en el historial. Una caja de
 * texto donde escribir SQL contra producción desde el navegador es otra cosa
 * muy distinta, y no es lo que hay aquí.
 *
 * Reglas para añadir una:
 * · `statements` debe ser idempotente (IF NOT EXISTS, IF EXISTS…): aplicarla
 *   dos veces no puede romper nada.
 * · `check` devuelve una fila con una columna `ok` booleana, y debe mirar el
 *   esquema de verdad, no un registro de migraciones. Así detecta también las
 *   que se aplicaron a mano por fuera de la aplicación.
 * · `why` se le muestra al docente antes de ejecutar. Que se entienda.
 */

export interface Migration {
  id: string;
  title: string;
  why: string;
  /** Se ejecutan en una transacción, en orden. */
  statements: string[];
  /** SELECT que devuelve una columna `ok` booleana. */
  check: string;
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
    check: `
      SELECT count(*) = 3 AS ok FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cortes'
        AND column_name IN ('start_date', 'end_date', 'report_deadline')
    `,
  },
];

export function findMigration(id: string): Migration | undefined {
  return MIGRATIONS.find((m) => m.id === id);
}

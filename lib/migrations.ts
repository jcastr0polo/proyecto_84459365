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
  /**
   * Arregla DATOS, no el esquema.
   *
   * El estado se deduce de si existen unas columnas, y eso no sirve para una
   * reparación: las columnas ya están, así que saldría «aplicada» y no habría
   * forma de ejecutarla. Marcada así, se ofrece siempre. Tiene que ser
   * idempotente de verdad —correrla dos veces no puede cambiar nada—, y
   * `requires` pasa a significar «qué hace falta para poder correrla».
   */
  datos?: boolean;
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
  {
    id: '2026-09-semestre-plantilla-cortes',
    title: 'Calendario de cortes del semestre',
    why:
      'Guarda en el semestre el esquema de cortes que comparten sus asignaturas: '
      + 'nombre, peso y fechas de cada corte. Sirve para definirlo una vez y que una '
      + 'asignatura nueva lo importe en un clic, en vez de teclearlo curso por curso. '
      + 'Nace vacío: nada cambia hasta que lo llenes.',
    statements: [
      'ALTER TABLE semesters ADD COLUMN IF NOT EXISTS corte_template JSONB',
    ],
    requires: [
      { table: 'semesters', column: 'corte_template' },
    ],
  },
  {
    id: '2026-09-corte-reportado',
    title: 'Marca de notas reportadas',
    why:
      'Guarda cuándo marcaste un corte como ya reportado a la universidad, para que '
      + 'el panel deje de avisarte de ese plazo. Lo pones tú a mano: el sistema no '
      + 'tiene forma de saber si de verdad subiste las notas. Nace vacía: ningún '
      + 'corte existente cambia, y el aviso de los que no hayas marcado sigue igual.',
    statements: [
      'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ',
    ],
    requires: [
      { table: 'cortes', column: 'reported_at' },
    ],
  },
  {
    id: '2026-09-devolucion-docente',
    title: 'Documentos de devolución',
    why:
      'Permite adjuntar documentos a una entrega para devolvérselos al estudiante: '
      + 'su mismo trabajo corregido, un plan anotado, una rúbrica llena. El estudiante '
      + 'los ve en su entrega en cuanto los subes, sin esperar a que publiques la nota. '
      + 'Nace vacía: ninguna entrega existente cambia.',
    statements: [
      'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback_attachments JSONB',
    ],
    requires: [
      { table: 'submissions', column: 'feedback_attachments' },
    ],
  },
  {
    id: '2026-09-actividad-lista',
    title: 'Actividades de lista de tareas',
    why:
      'Habilita un tipo de actividad nuevo: tú pones una lista de puntos y los '
      + 'estudiantes van marcando lo que hacen, con evidencia o sin ella. Tú ves el '
      + 'avance de todo el curso en una pantalla, en vivo, para proyectarla en clase. '
      + 'No pone notas: si al final quieres darle un valor apreciativo, se hace con un '
      + 'ítem de nota manual como cualquier otro. Nada existente cambia.',
    statements: [
      'ALTER TABLE activities ADD COLUMN IF NOT EXISTS checklist JSONB',
      `CREATE TABLE IF NOT EXISTS checklist_ticks (
         id           TEXT PRIMARY KEY,
         activity_id  TEXT NOT NULL,
         student_id   TEXT NOT NULL,
         course_id    TEXT NOT NULL,
         item_id      TEXT NOT NULL,
         done_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
         evidence_url  TEXT,
         evidence_name TEXT,
         note          TEXT
       )`,
      /* Un estudiante marca un punto una vez. Sin esto, dos toques seguidos en
         un móvil lento dejan la misma marca dos veces y el avance pasa del
         100%. Con el índice, el segundo INSERT choca y se ignora. */
      `CREATE UNIQUE INDEX IF NOT EXISTS checklist_ticks_unicos
         ON checklist_ticks (activity_id, student_id, item_id)`,
      /* El tablero pregunta siempre "las marcas de esta actividad, por hora". */
      `CREATE INDEX IF NOT EXISTS checklist_ticks_por_actividad
         ON checklist_ticks (activity_id, done_at DESC)`,
    ],
    requires: [
      { table: 'activities', column: 'checklist' },
      { table: 'checklist_ticks', column: 'item_id' },
    ],
  },
  {
    id: '2026-10-entrega-en-grupo',
    title: 'Entregas en grupo',
    why:
      'En una actividad marcada como grupal, el primero que entrega elige a sus '
      + 'compañeros y la entrega queda registrada para todos: dejan de subir el mismo '
      + 'archivo cuatro veces y tú dejas de recibirlo cuatro veces. Cada uno sigue '
      + 'teniendo su propia fila, así que puedes calificarlos por separado si quieres. '
      + 'Tú decides cuántos caben en cada grupo. '
      + 'Nada existente cambia.',
    statements: [
      'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS group_id TEXT',
      'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by TEXT',
      /* El cupo lo decide el docente por actividad: no es lo mismo un informe
         de a dos que un proyecto de a cinco. Vacío = sin tope. */
      'ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_max_size INTEGER',
      /* Para traer de una vez a todos los miembros de un grupo: se usa al
         re-entregar, que reemplaza las filas de todo el grupo. */
      'CREATE INDEX IF NOT EXISTS submissions_por_grupo ON submissions (group_id)',
    ],
    requires: [
      { table: 'submissions', column: 'group_id' },
      { table: 'submissions', column: 'submitted_by' },
      { table: 'activities', column: 'group_max_size' },
    ],
  },
  {
    id: '2026-10-reparar-grupos',
    title: 'Reparar las entregas en grupo que perdieron su grupo',
    why:
      'Las entregas hechas antes de habilitar los grupos se guardaron sin el dato '
      + 'de quién entregó con quién: cada miembro aparece por separado y no se ve '
      + 'que son un mismo trabajo. Esto lo reconstruye. No adivina por el nombre del '
      + 'archivo: agrupa solo las entregas que apuntan al MISMO archivo subido —la '
      + 'misma ruta exacta—, que es prueba de que salió de una sola carga. No toca '
      + 'nada que ya tenga grupo, ni las actividades individuales. Se puede aplicar '
      + 'más de una vez sin efecto.',
    statements: [
      `WITH huellas AS (
         SELECT s.id, s.activity_id, s.student_id, s.submitted_at,
                (SELECT string_agg(a->>'filePath', '|' ORDER BY a->>'filePath')
                   FROM jsonb_array_elements(s.attachments) a) AS huella
         FROM submissions s
         JOIN activities ac ON ac.id = s.activity_id AND ac.category = 'group'
         WHERE s.group_id IS NULL
           AND jsonb_array_length(COALESCE(s.attachments, '[]'::jsonb)) > 0
       ),
       grupos AS (
         SELECT activity_id, huella,
                'grp-' || md5(activity_id || huella) AS gid,
                (array_agg(student_id ORDER BY submitted_at, student_id))[1] AS primero
         FROM huellas
         GROUP BY activity_id, huella
         HAVING count(*) > 1
       )
       UPDATE submissions s
          SET group_id = g.gid, submitted_by = g.primero
         FROM huellas h
         JOIN grupos g ON g.activity_id = h.activity_id AND g.huella = h.huella
        WHERE s.id = h.id`,
    ],
    /* No añade columnas: `requires` es aquí «qué hace falta para correrla». */
    datos: true,
    requires: [
      { table: 'submissions', column: 'group_id' },
    ],
  },
];

export function findMigration(id: string): Migration | undefined {
  return MIGRATIONS.find((m) => m.id === id);
}

/**
 * lib/blobSync.ts
 *
 * ATENCIÓN: el Blob ya NO es la base de datos. Desde la migración a Supabase
 * (6f7aaef) todas las lecturas y escrituras de datos van a Postgres; este
 * archivo describía la arquitectura anterior y quedó desfasado.
 *
 * Lo que sigue vivo aquí, y es lo único que usa el sistema:
 * - DATA_FILES   → nombres lógicos, usados como clave del cerrojo
 * - withFileLock → serializa lectura-modificación-escritura entre peticiones
 *
 * Lo retirado —seedAllToBlob, seedFilesToBlob, readFromBlobDirect,
 * writeToBlobVerified y writeToBlob— tenía cero llamadas: escribía y leía un
 * almacenamiento que ya no alimenta nada. Los archivos que suben estudiantes
 * y docentes sí siguen en el Blob, pero eso lo maneja lib/uploadService.ts.
 *
 * El nombre del archivo se mantiene para no tocar los imports de medio
 * proyecto, aunque ya no sincronice nada.
 */


/** Todos los archivos JSON que necesitan persistencia */
export const DATA_FILES = [
  'config.json',
  'home.json',
  'users.json',
  'sessions.json',
  'semesters.json',
  'courses.json',
  'enrollments.json',
  'activities.json',
  'submissions.json',
  'grades.json',
  'prompts.json',
  'projects.json',
  'audit.json',
  'cortes.json',
  'quizzes.json',
  'quiz-attempts.json',
  'quiz-simulations.json',
  'manual-grade-items.json',
  'manual-grades.json',
];

// ═══════════════════════════════════════════════════════════
// Per-file write QUEUE — serializa operaciones read-modify-write
// Modelo: cada archivo JSON es una "tabla". Escrituras se encolan
// por archivo. Lecturas NUNCA se bloquean (van directo a Blob).
// Auditoría es fire-and-forget en su propio archivo (no bloquea datos).
// ═══════════════════════════════════════════════════════════
const _fileLocks = new Map<string, Promise<unknown>>();
const _queueDepth = new Map<string, number>();

/**
 * Ejecuta `fn` con acceso exclusivo al archivo `filename`.
 * Si otra operación está en curso para el mismo archivo,
 * ENCOLA y espera su turno (FIFO). La cola se drena secuencialmente.
 *
 * - Lecturas fuera de lock: permitidas, no se bloquean (van directo a Blob).
 * - Lecturas DENTRO de lock: intencionales (read-modify-write atómico).
 * - Escrituras a archivos DISTINTOS: independientes, no se bloquean entre sí.
 *
 * Limitación: solo serializa dentro de la MISMA instancia serverless.
 */
export async function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const depth = (_queueDepth.get(filename) ?? 0) + 1;
  _queueDepth.set(filename, depth);
  if (depth > 1) {
    console.log(`[lock] ${filename} enqueued (depth: ${depth})`);
  }

  const prev = _fileLocks.get(filename) ?? Promise.resolve();
  let resolve: () => void;
  const lock = new Promise<void>((r) => { resolve = r; });
  _fileLocks.set(filename, lock);

  try {
    await prev; // esperar operación anterior en la cola
    return await fn();
  } finally {
    resolve!();
    const newDepth = (_queueDepth.get(filename) ?? 1) - 1;
    if (newDepth <= 0) {
      _queueDepth.delete(filename);
    } else {
      _queueDepth.set(filename, newDepth);
    }
    if (_fileLocks.get(filename) === lock) {
      _fileLocks.delete(filename);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Lectura directa desde Blob (ÚNICA forma de leer datos)
// ═══════════════════════════════════════════════════════════

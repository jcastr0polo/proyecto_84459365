/**
 * lib/blobSync.ts
 * Vercel Blob = base de datos. Sin /tmp. Sin fallbacks. Sin caché.
 *
 * Arquitectura:
 * - Blob = fuente de verdad única
 * - TODAS las lecturas van directo a Blob (readFromBlobDirect)
 * - Escrituras: put() directo a Blob
 * - Si Blob falla → la operación falla (error explícito)
 * - Seed: manual desde /admin/blob-sync (lee data/ del repo → sube a Blob)
 * - En local (dev): no-op, dataService usa filesystem directo
 */

import { put, get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }
const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

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

/**
 * Lee un archivo directamente desde Blob.
 * Esta es la ÚNICA forma de leer datos en producción.
 * Retorna null si el archivo no existe o hay error.
 */
export async function readFromBlobDirect(filename: string): Promise<string | null> {
  if (!IS_VERCEL) return null;
  const token = getBlobToken();
  if (!token) return null;
  try {
    const result = await get(`data/${filename}`, { token, access: 'private' });
    if (result && result.statusCode === 200) {
      return new Response(result.stream).text();
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// Escrituras: directo a Blob
// ═══════════════════════════════════════════════════════════

/**
 * Escribe a Blob (BD). Si Blob falla → LANZA error.
 * Pre-valida que el contenido sea JSON válido antes de escribir.
 */
export async function writeToBlob(filename: string, content: string): Promise<void> {
  if (!IS_VERCEL) return;

  const token = getBlobToken();
  if (!token) {
    throw new Error('[blobSync] NEXUS_READ_WRITE_TOKEN not configured — cannot write to database');
  }

  // Pre-write validation: JSON integrity
  if (!content || content.trim().length === 0) {
    throw new Error(`[blobSync] Pre-write REJECTED for ${filename}: empty content`);
  }
  try {
    JSON.parse(content);
  } catch (e) {
    throw new Error(`[blobSync] Pre-write REJECTED for ${filename}: invalid JSON — ${e}`);
  }

  // 1. Escribir a Blob (fuente de verdad)
  await put(`data/${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });

  console.log(`[blobSync] ✓ ${filename} (${content.length}B)`);
}

/**
 * Escritura CRÍTICA con verificación read-back.
 * Usa para datos que no pueden perderse (quiz-attempts, submissions).
 * Después de escribir, lee de vuelta y compara tamaño.
 */
export async function writeToBlobVerified(filename: string, content: string): Promise<void> {
  await writeToBlob(filename, content);

  if (!IS_VERCEL) return;

  // Read-back verification
  const readBack = await readFromBlobDirect(filename);
  if (readBack === null) {
    throw new Error(`[blobSync] VERIFY FAILED for ${filename}: null read-back after write`);
  }
  if (readBack.length !== content.length) {
    throw new Error(`[blobSync] VERIFY FAILED for ${filename}: wrote ${content.length}B, read ${readBack.length}B`);
  }
  console.log(`[blobSync] ✓✓ ${filename} verified`);
}

// ═══════════════════════════════════════════════════════════
// Seed: repo data/ → Blob (manual, una sola vez)
// ═══════════════════════════════════════════════════════════

/**
 * Seed manual: sube todos los JSON desde data/ del repo al Blob.
 */
export async function seedAllToBlob(): Promise<Record<string, { status: string; size?: number; error?: string }>> {
  return seedFilesToBlob(DATA_FILES);
}

/**
 * Sube archivos específicos de data/ al Blob (seed selectivo).
 */
export async function seedFilesToBlob(files: string[]): Promise<Record<string, { status: string; size?: number; error?: string }>> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('NEXUS_READ_WRITE_TOKEN no está configurado');
  }

  const results: Record<string, { status: string; size?: number; error?: string }> = {};

  for (const file of files) {
    try {
      const srcPath = path.join(SOURCE_DATA_DIR, file);
      if (!fs.existsSync(srcPath)) {
        results[file] = { status: 'NOT FOUND in source' };
        continue;
      }

      const content = fs.readFileSync(srcPath, 'utf-8');

      await put(`data/${file}`, content, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });

      results[file] = { status: 'SEEDED', size: content.length };
    } catch (err) {
      results[file] = { status: 'ERROR', error: String(err) };
    }
  }

  return results;
}

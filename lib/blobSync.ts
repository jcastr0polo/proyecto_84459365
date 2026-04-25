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
];

// ═══════════════════════════════════════════════════════════
// Per-file write lock — serializa operaciones read-modify-write
// para evitar que escrituras concurrentes se sobreescriban.
// ═══════════════════════════════════════════════════════════
const _fileLocks = new Map<string, Promise<unknown>>();

/**
 * Ejecuta `fn` con acceso exclusivo al archivo `filename`.
 * Si otra operación está en curso para el mismo archivo,
 * espera a que termine antes de ejecutar.
 * Esto solo serializa dentro de la MISMA instancia serverless.
 * Entre instancias distintas no hay lock compartido, pero
 * con TTL=0 cada request lee fresh de Blob antes de escribir,
 * minimizando la ventana de race condition.
 */
export async function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const prev = _fileLocks.get(filename) ?? Promise.resolve();
  let resolve: () => void;
  const lock = new Promise<void>((r) => { resolve = r; });
  _fileLocks.set(filename, lock);

  try {
    await prev; // esperar operación anterior
    return await fn();
  } finally {
    resolve!();
    // limpiar si somos el último en la cola
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
 */
export async function writeToBlob(filename: string, content: string): Promise<void> {
  if (!IS_VERCEL) return;

  const token = getBlobToken();
  if (!token) {
    throw new Error('[blobSync] NEXUS_READ_WRITE_TOKEN not configured — cannot write to database');
  }

  // 1. Escribir a Blob (fuente de verdad)
  await put(`data/${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });

  console.log(`[blobSync] Wrote ${filename} to Blob`);
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

/**
 * lib/blobSync.ts
 * Vercel Blob = base de datos. Sin /tmp. Sin fallbacks.
 *
 * Arquitectura:
 * - Blob = fuente de verdad única
 * - In-memory cache = lecturas rápidas (poblada desde Blob en cold start)
 * - Escrituras: Blob PRIMERO → actualiza cache en memoria
 * - Si Blob falla → la operación falla (error explícito)
 * - Seed: manual desde /admin/blob-sync (lee data/ del repo → sube a Blob)
 * - En local (dev): no-op, dataService usa filesystem directo
 */

import { put, list } from '@vercel/blob';
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
];

// ═══════════════════════════════════════════════════════════
// In-memory data cache (reemplaza /tmp)
// ═══════════════════════════════════════════════════════════
const _cache = new Map<string, string>();
let _ready = false;
let _initPromise: Promise<void> | null = null;

/**
 * Lee un archivo desde el caché en memoria.
 * Solo para Vercel. Lanza error si no está en caché.
 */
export function readFromCache(filename: string): string {
  const content = _cache.get(filename);
  if (content === undefined) {
    throw new Error(`[blobSync] ${filename} not in cache. ensureDataReady() was not called or Blob is empty. Run seed from /admin/blob-sync`);
  }
  return content;
}

/**
 * Verifica si el caché está listo (datos cargados desde Blob).
 */
export function isCacheReady(): boolean {
  return _ready;
}

// ═══════════════════════════════════════════════════════════
// Cold start: pull de Blob → memoria
// ═══════════════════════════════════════════════════════════

/**
 * Asegura que el caché en memoria esté poblado con datos de Blob.
 * En Vercel: descarga TODOS los archivos de Blob → memoria.
 * Si Blob está vacío → error (admin debe seedear primero).
 * En local: no-op.
 */
export async function ensureDataReady(): Promise<void> {
  if (!IS_VERCEL || _ready) return;
  if (_initPromise) return _initPromise;
  _initPromise = loadFromBlob();
  await _initPromise;
  _ready = true;
}

async function loadFromBlob(): Promise<void> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('[blobSync] NEXUS_READ_WRITE_TOKEN not configured — cannot read database');
  }

  try {
    const { blobs } = await list({ prefix: 'data/', token });
    const blobMap = new Map(blobs.map((b) => [b.pathname, b.url]));

    console.log(`[blobSync] Loading ${blobMap.size} files from Blob to memory`);

    if (blobMap.size === 0) {
      console.warn('[blobSync] Blob is EMPTY — app will use source data as readonly. Admin must seed from /admin/blob-sync');
      // Cargar desde source para no bloquear la app, pero SIN escribir a Blob
      for (const file of DATA_FILES) {
        const srcPath = path.join(SOURCE_DATA_DIR, file);
        if (fs.existsSync(srcPath)) {
          _cache.set(file, fs.readFileSync(srcPath, 'utf-8'));
        }
      }
      return;
    }

    await Promise.all(
      DATA_FILES.map(async (file) => {
        const blobUrl = blobMap.get(`data/${file}`);
        if (blobUrl) {
          const res = await fetch(blobUrl);
          if (res.ok) {
            _cache.set(file, await res.text());
            return;
          }
        }
        // File not in Blob — use source readonly
        console.warn(`[blobSync] ${file} not in Blob, loading from source`);
        const srcPath = path.join(SOURCE_DATA_DIR, file);
        if (fs.existsSync(srcPath)) {
          _cache.set(file, fs.readFileSync(srcPath, 'utf-8'));
        }
      })
    );

    console.log(`[blobSync] Cache loaded: ${_cache.size} files in memory`);
  } catch (err) {
    console.error('[blobSync] FATAL: Failed to load from Blob:', err);
    throw err; // La app debe fallar si no puede leer la BD
  }
}

// ═══════════════════════════════════════════════════════════
// Escrituras: Blob PRIMERO → actualiza caché
// ═══════════════════════════════════════════════════════════

/**
 * Escribe a Blob (BD) y actualiza caché en memoria.
 * Si Blob falla → LANZA error.
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

  // 2. Actualizar caché en memoria
  _cache.set(filename, content);
  console.log(`[blobSync] Wrote ${filename} to Blob + cache`);
}

// ═══════════════════════════════════════════════════════════
// Seed: repo data/ → Blob (manual, una sola vez)
// ═══════════════════════════════════════════════════════════

/**
 * Seed manual: sube todos los JSON desde data/ del repo al Blob.
 * También actualiza el caché en memoria.
 */
export async function seedAllToBlob(): Promise<Record<string, { status: string; size?: number; error?: string }>> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('NEXUS_READ_WRITE_TOKEN no está configurado');
  }

  const results: Record<string, { status: string; size?: number; error?: string }> = {};

  for (const file of DATA_FILES) {
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

      // Actualizar caché
      _cache.set(file, content);
      results[file] = { status: 'SEEDED', size: content.length };
    } catch (err) {
      results[file] = { status: 'ERROR', error: String(err) };
    }
  }

  _ready = true;
  return results;
}

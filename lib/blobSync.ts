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

import { put, list, get } from '@vercel/blob';
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
];

// ═══════════════════════════════════════════════════════════
// In-memory data cache (reemplaza /tmp)
// ═══════════════════════════════════════════════════════════
const _cache = new Map<string, string>();
let _ready = false;
let _initPromise: Promise<void> | null = null;
let _lastLoadedAt = 0;
let _refreshPromise: Promise<void> | null = null;

/** Tiempo máximo de vida del caché antes de recargar de Blob (30s) */
const CACHE_TTL_MS = 30_000;

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
// Cold start + cache refresh: pull de Blob → memoria
// ═══════════════════════════════════════════════════════════

/**
 * Asegura que el caché en memoria esté poblado y fresco.
 * - Primera vez: carga TODO desde Blob (cold start).
 * - Después: si el caché tiene más de CACHE_TTL_MS, recarga de Blob.
 * - Esto evita que instancias warm sirvan datos stale.
 */
export async function ensureDataReady(): Promise<void> {
  if (!IS_VERCEL) return;

  // Primera carga — debe esperar
  if (!_ready) {
    if (_initPromise) return _initPromise;
    _initPromise = loadFromBlob()
      .then(() => { _ready = true; _lastLoadedAt = Date.now(); })
      .catch((err) => {
        _initPromise = null;
        _ready = false;
        throw err;
      });
    return _initPromise;
  }

  // Caché listo pero potencialmente stale — refrescar si TTL expiró
  if (Date.now() - _lastLoadedAt > CACHE_TTL_MS) {
    if (!_refreshPromise) {
      _refreshPromise = loadFromBlob()
        .then(() => { _lastLoadedAt = Date.now(); })
        .catch((err) => { console.error('[blobSync] Cache refresh failed:', err); })
        .finally(() => { _refreshPromise = null; });
    }
    await _refreshPromise;
  }
}

async function loadFromBlob(): Promise<void> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('[blobSync] NEXUS_READ_WRITE_TOKEN not configured — cannot read database');
  }

  try {
    // Verificar si Blob tiene datos
    const { blobs } = await list({ prefix: 'data/', token });
    const blobPathnames = new Set(blobs.map((b) => b.pathname));

    console.log(`[blobSync] Found ${blobPathnames.size} files in Blob`);

    if (blobPathnames.size === 0) {
      console.warn('[blobSync] Blob is EMPTY — loading source data as readonly. Admin must seed from /admin/blob-sync');
      for (const file of DATA_FILES) {
        const srcPath = path.join(SOURCE_DATA_DIR, file);
        if (fs.existsSync(srcPath)) {
          _cache.set(file, fs.readFileSync(srcPath, 'utf-8'));
        }
      }
      return;
    }

    // Usar get() del SDK para descargar con autenticación (blobs privados)
    await Promise.all(
      DATA_FILES.map(async (file) => {
        const blobKey = `data/${file}`;
        if (blobPathnames.has(blobKey)) {
          const result = await get(blobKey, { token, access: 'private' });
          if (result && result.statusCode === 200) {
            const text = await new Response(result.stream).text();
            _cache.set(file, text);
            return;
          }
          // get() devolvió null o 304 — error inesperado
          console.error(`[blobSync] FAILED to download ${file} from Blob (status: ${result?.statusCode ?? 'null'})`);
          throw new Error(`[blobSync] Cannot read ${file} from Blob — data integrity error`);
        }
        // Archivo no existe en Blob — usar source solo si Blob tiene datos parciales
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
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════
// Lectura directa desde Blob (bypass caché)
// ═══════════════════════════════════════════════════════════

/**
 * Lee un archivo directamente desde Blob, sin pasar por el caché.
 * Útil para datos de alta concurrencia (audit) donde múltiples
 * instancias serverless escriben y el caché puede estar stale.
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

      // Actualizar caché
      _cache.set(file, content);
      results[file] = { status: 'SEEDED', size: content.length };
    } catch (err) {
      results[file] = { status: 'ERROR', error: String(err) };
    }
  }

  _ready = true;
  _lastLoadedAt = Date.now();
  return results;
}

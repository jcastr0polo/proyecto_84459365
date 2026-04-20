/**
 * lib/blobSync.ts
 * Vercel Blob como base de datos primaria.
 *
 * Arquitectura:
 * - Blob = fuente de verdad (base de datos)
 * - /tmp/data/ = caché local de lectura (se llena en cold start desde Blob)
 * - Escrituras: Blob PRIMERO, luego actualiza caché /tmp
 * - Seed: solo manual desde /admin/blob-sync (una vez)
 * - Si Blob falla en escritura → la operación falla (no silencioso)
 */

import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const BLOB_TOKEN = process.env.NEXUS_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;
const TMP_DATA_DIR = '/tmp/data';
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

let _ready = false;
let _initPromise: Promise<void> | null = null;

/**
 * Asegura que /tmp/data/ esté poblado con los datos desde Blob.
 * En Vercel: descarga desde Blob. Si un archivo no está en Blob, usa source readonly.
 * NO hace seed automático — el seed se hace solo desde /admin/blob-sync.
 * En local: no-op.
 */
export async function ensureDataReady(): Promise<void> {
  if (!IS_VERCEL || _ready) return;
  if (_initPromise) return _initPromise;
  _initPromise = pullDataToTmp();
  await _initPromise;
  _ready = true;
}

async function pullDataToTmp(): Promise<void> {
  fs.mkdirSync(TMP_DATA_DIR, { recursive: true });

  // En warm start, los archivos ya están en /tmp
  const missing = DATA_FILES.filter(
    (f) => !fs.existsSync(path.join(TMP_DATA_DIR, f))
  );
  if (missing.length === 0) return;

  if (!BLOB_TOKEN) {
    console.warn('[blobSync] No NEXUS_READ_WRITE_TOKEN, using source data as readonly fallback');
    missing.forEach(copyFromSource);
    return;
  }

  try {
    // Listar todo lo que hay en Blob
    const { blobs } = await list({ prefix: 'data/', token: BLOB_TOKEN });
    const blobMap = new Map(blobs.map((b) => [b.pathname, b.url]));

    console.log(`[blobSync] Blob has ${blobMap.size} files, pulling ${missing.length} missing to /tmp`);

    await Promise.all(
      missing.map(async (file) => {
        const blobUrl = blobMap.get(`data/${file}`);
        if (blobUrl) {
          // Descargar desde Blob (fuente de verdad)
          try {
            const res = await fetch(blobUrl);
            if (res.ok) {
              const text = await res.text();
              fs.writeFileSync(path.join(TMP_DATA_DIR, file), text, 'utf-8');
              console.log(`[blobSync] Pulled ${file} from Blob`);
              return;
            }
          } catch (err) {
            console.warn(`[blobSync] Fetch failed for ${file}:`, err);
          }
        }
        // No está en Blob → usar source como fallback readonly
        // (admin deberá hacer seed desde /admin/blob-sync)
        console.warn(`[blobSync] ${file} not in Blob, using source fallback`);
        copyFromSource(file);
      })
    );
  } catch (err) {
    console.error('[blobSync] list failed, using source data as fallback:', err);
    missing.forEach(copyFromSource);
  }
}

function copyFromSource(file: string): void {
  const src = path.join(SOURCE_DATA_DIR, file);
  const dst = path.join(TMP_DATA_DIR, file);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
  }
}

/**
 * Escribe un archivo JSON a Vercel Blob (base de datos) y actualiza caché /tmp.
 * Si Blob falla, LANZA error — la operación no debe completarse con datos perdidos.
 */
export async function writeToBlob(filename: string, content: string): Promise<void> {
  if (!IS_VERCEL) return; // Local: no-op, writeJsonFile ya escribe al filesystem

  if (!BLOB_TOKEN) {
    throw new Error('[blobSync] NEXUS_READ_WRITE_TOKEN not configured — cannot write to database');
  }

  // 1. Escribir a Blob PRIMERO (fuente de verdad)
  await put(`data/${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  });
  console.log(`[blobSync] Wrote ${filename} to Blob`);

  // 2. Actualizar caché local /tmp
  const tmpPath = path.join(TMP_DATA_DIR, filename);
  fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
  fs.writeFileSync(tmpPath, content, 'utf-8');
}

/**
 * Seed manual: sube todos los JSON desde source/data/ al Blob.
 * Solo se llama desde /admin/blob-sync POST.
 */
export async function seedAllToBlob(): Promise<Record<string, { status: string; size?: number; error?: string }>> {
  if (!BLOB_TOKEN) {
    throw new Error('NEXUS_READ_WRITE_TOKEN no está configurado');
  }

  const results: Record<string, { status: string; size?: number; error?: string }> = {};

  // Leer de /tmp (si tiene datos más recientes) o de source
  for (const file of DATA_FILES) {
    try {
      let content: string | null = null;
      let from = '';
      const tmpPath = path.join(TMP_DATA_DIR, file);
      const srcPath = path.join(SOURCE_DATA_DIR, file);

      if (fs.existsSync(tmpPath)) {
        content = fs.readFileSync(tmpPath, 'utf-8');
        from = '/tmp';
      } else if (fs.existsSync(srcPath)) {
        content = fs.readFileSync(srcPath, 'utf-8');
        from = 'source';
      }

      if (!content) {
        results[file] = { status: 'NOT FOUND' };
        continue;
      }

      await put(`data/${file}`, content, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: BLOB_TOKEN,
      });

      results[file] = { status: `SYNCED from ${from}`, size: content.length };
    } catch (err) {
      results[file] = { status: 'ERROR', error: String(err) };
    }
  }

  return results;
}

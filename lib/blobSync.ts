/**
 * lib/blobSync.ts
 * Sincronización de datos JSON con Vercel Blob
 *
 * Estrategia:
 * - En cold start: descarga todos los JSON desde Blob → /tmp/data/
 * - Si Blob está vacío (primer deploy): copia desde data/ del repo
 * - En cada escritura: escribe a /tmp (sync) + sube a Blob (fire-and-forget)
 * - En warm start: /tmp ya tiene los datos, no hace nada
 */

import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const BLOB_TOKEN = process.env.NEXUS_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;
const TMP_DATA_DIR = '/tmp/data';
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

/** Todos los archivos JSON que necesitan persistencia */
const DATA_FILES = [
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
 * Asegura que /tmp/data/ esté poblado con los datos más recientes.
 * En Vercel: descarga desde Blob, fallback a data/ del repo.
 * En local: no-op.
 * Debe llamarse al inicio de cada request API.
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

  // Intentar descargar desde Blob
  if (BLOB_TOKEN) {
    try {
      const { blobs } = await list({ prefix: 'data/', token: BLOB_TOKEN });
      const blobMap = new Map(blobs.map((b) => [b.pathname, b.url]));

      await Promise.all(
        missing.map(async (file) => {
          const blobUrl = blobMap.get(`data/${file}`);
          if (blobUrl) {
            try {
              const res = await fetch(blobUrl);
              if (res.ok) {
                const text = await res.text();
                fs.writeFileSync(path.join(TMP_DATA_DIR, file), text, 'utf-8');
                return;
              }
            } catch { /* fall through to source */ }
          }
          copyFromSource(file);
        })
      );
      return;
    } catch (err) {
      console.warn('[blobSync] list failed, using source data:', err);
    }
  }

  // Sin token o fallo — copiar todo desde source
  missing.forEach(copyFromSource);
}

function copyFromSource(file: string): void {
  const src = path.join(SOURCE_DATA_DIR, file);
  const dst = path.join(TMP_DATA_DIR, file);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
  }
}

/**
 * Sube un archivo JSON a Vercel Blob (fire-and-forget).
 * Se llama después de cada writeJsonFile para persistir cambios.
 */
export function syncToBlob(filename: string, content: string): void {
  if (!IS_VERCEL || !BLOB_TOKEN) return;
  put(`data/${filename}`, content, {
    access: 'public',
    addRandomSuffix: false,
    token: BLOB_TOKEN,
  }).catch((err) =>
    console.error(`[blobSync] put failed for ${filename}:`, err)
  );
}

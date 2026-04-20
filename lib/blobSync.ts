/**
 * lib/blobSync.ts
 * Sincronización de datos JSON con Vercel Blob
 *
 * Estrategia:
 * - En cold start: descarga todos los JSON desde Blob → /tmp/data/
 * - Si Blob está vacío (primer deploy): copia desde data/ del repo y sube a Blob (seed)
 * - En cada escritura: escribe a /tmp (sync) + sube a Blob (awaited)
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
 * En Vercel: descarga desde Blob, fallback a data/ del repo + seed a Blob.
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
    console.warn('[blobSync] No NEXUS_READ_WRITE_TOKEN, using source data only');
    missing.forEach(copyFromSource);
    return;
  }

  try {
    // Listar todo lo que hay en Blob
    const { blobs } = await list({ prefix: 'data/', token: BLOB_TOKEN });
    const blobMap = new Map(blobs.map((b) => [b.pathname, b.url]));

    console.log(`[blobSync] Blob has ${blobMap.size} files, need ${missing.length} missing files`);

    const needSeed: string[] = [];

    await Promise.all(
      missing.map(async (file) => {
        const blobUrl = blobMap.get(`data/${file}`);
        if (blobUrl) {
          // Descargar desde Blob
          try {
            const res = await fetch(blobUrl);
            if (res.ok) {
              const text = await res.text();
              fs.writeFileSync(path.join(TMP_DATA_DIR, file), text, 'utf-8');
              return;
            }
          } catch (err) {
            console.warn(`[blobSync] fetch failed for ${file}:`, err);
          }
        }
        // No está en Blob → copiar de source y marcar para seed
        copyFromSource(file);
        needSeed.push(file);
      })
    );

    // Seed: subir archivos que no estaban en Blob
    if (needSeed.length > 0) {
      console.log(`[blobSync] Seeding ${needSeed.length} files to Blob:`, needSeed);
      await Promise.all(
        needSeed.map(async (file) => {
          const tmpPath = path.join(TMP_DATA_DIR, file);
          if (fs.existsSync(tmpPath)) {
            const content = fs.readFileSync(tmpPath, 'utf-8');
            try {
              await put(`data/${file}`, content, {
                access: 'private',
                addRandomSuffix: false,
                token: BLOB_TOKEN!,
              });
              console.log(`[blobSync] Seeded ${file} to Blob`);
            } catch (err) {
              console.error(`[blobSync] Seed failed for ${file}:`, err);
            }
          }
        })
      );
    }
  } catch (err) {
    console.error('[blobSync] list failed, using source data:', err);
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
 * Sube un archivo JSON a Vercel Blob.
 * Awaitable para garantizar persistencia antes de responder al cliente.
 */
export async function syncToBlob(filename: string, content: string): Promise<void> {
  if (!IS_VERCEL || !BLOB_TOKEN) return;
  try {
    await put(`data/${filename}`, content, {
      access: 'private',
      addRandomSuffix: false,
      token: BLOB_TOKEN,
    });
    console.log(`[blobSync] Synced ${filename} to Blob`);
  } catch (err) {
    console.error(`[blobSync] put FAILED for ${filename}:`, err);
  }
}

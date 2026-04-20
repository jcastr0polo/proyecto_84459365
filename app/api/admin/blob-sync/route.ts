/**
 * POST /api/admin/blob-sync — Forzar seed/sync de data a Vercel Blob
 * GET  /api/admin/blob-sync — Diagnóstico: estado de archivos en Blob
 * Protegido por withAuth (admin)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import type { User } from '@/lib/types';

const BLOB_TOKEN = process.env.NEXUS_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');
const TMP_DATA_DIR = '/tmp/data';

const DATA_FILES = [
  'config.json', 'home.json', 'users.json', 'sessions.json',
  'semesters.json', 'courses.json', 'enrollments.json', 'activities.json',
  'submissions.json', 'grades.json', 'prompts.json', 'projects.json',
];

/** GET — Diagnóstico */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (_user: User) => {
    const diagnostics: Record<string, unknown> = {
      environment: {
        IS_VERCEL,
        HAS_BLOB_TOKEN: !!BLOB_TOKEN,
        BLOB_TOKEN_PREFIX: BLOB_TOKEN ? BLOB_TOKEN.substring(0, 12) + '...' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        CWD: process.cwd(),
      },
      sourceFiles: {} as Record<string, boolean>,
      tmpFiles: {} as Record<string, boolean>,
      blobFiles: {} as Record<string, { exists: boolean; size?: number; url?: string }>,
    };

    // Check source files
    for (const file of DATA_FILES) {
      (diagnostics.sourceFiles as Record<string, boolean>)[file] =
        fs.existsSync(path.join(SOURCE_DATA_DIR, file));
    }

    // Check /tmp files
    for (const file of DATA_FILES) {
      (diagnostics.tmpFiles as Record<string, boolean>)[file] =
        fs.existsSync(path.join(TMP_DATA_DIR, file));
    }

    // Check Blob files
    if (BLOB_TOKEN) {
      try {
        const { blobs } = await list({ prefix: 'data/', token: BLOB_TOKEN });
        const blobMap = new Map(blobs.map((b) => [b.pathname, b]));

        for (const file of DATA_FILES) {
          const blob = blobMap.get(`data/${file}`);
          (diagnostics.blobFiles as Record<string, unknown>)[file] = blob
            ? { exists: true, size: blob.size, url: blob.url }
            : { exists: false };
        }
        (diagnostics as Record<string, unknown>).blobListRaw = blobs.map((b) => ({
          pathname: b.pathname,
          size: b.size,
          uploadedAt: b.uploadedAt,
        }));
      } catch (err) {
        (diagnostics as Record<string, unknown>).blobError = String(err);
      }
    } else {
      (diagnostics as Record<string, unknown>).blobError = 'NEXUS_READ_WRITE_TOKEN not set';
    }

    return NextResponse.json(diagnostics);
  }, 'admin');
}

/** POST — Forzar sync: leer desde source/tmp y subir a Blob */
export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (_user: User) => {
    if (!BLOB_TOKEN) {
      return NextResponse.json(
        { error: 'NEXUS_READ_WRITE_TOKEN no está configurado' },
        { status: 500 }
      );
    }

    const results: Record<string, { status: string; size?: number; error?: string }> = {};

    for (const file of DATA_FILES) {
      try {
        // Intentar leer de /tmp primero, luego de source
        let content: string | null = null;
        const tmpPath = path.join(TMP_DATA_DIR, file);
        const srcPath = path.join(SOURCE_DATA_DIR, file);

        if (fs.existsSync(tmpPath)) {
          content = fs.readFileSync(tmpPath, 'utf-8');
          results[file] = { status: 'reading from /tmp' };
        } else if (fs.existsSync(srcPath)) {
          content = fs.readFileSync(srcPath, 'utf-8');
          results[file] = { status: 'reading from source' };
        }

        if (!content) {
          results[file] = { status: 'NOT FOUND in /tmp or source' };
          continue;
        }

        // Subir a Blob
        await put(`data/${file}`, content, {
          access: 'private',
          addRandomSuffix: false,
          token: BLOB_TOKEN,
        });

        results[file] = {
          status: 'SYNCED',
          size: content.length,
        };
      } catch (err) {
        results[file] = {
          status: 'ERROR',
          error: String(err),
        };
      }
    }

    return NextResponse.json({ results });
  }, 'admin');
}

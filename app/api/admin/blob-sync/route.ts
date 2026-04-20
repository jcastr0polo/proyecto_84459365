/**
 * POST /api/admin/blob-sync — Seed manual: sube data/ al Blob (una sola vez)
 * GET  /api/admin/blob-sync — Diagnóstico: estado de archivos en Blob
 * Protegido por withAuth (admin)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { list } from '@vercel/blob';
import { seedAllToBlob, DATA_FILES } from '@/lib/blobSync';
import fs from 'fs';
import path from 'path';
import type { User } from '@/lib/types';

function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }
const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');
const TMP_DATA_DIR = '/tmp/data';

/** GET — Diagnóstico */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (_user: User) => {
    const diagnostics: Record<string, unknown> = {
      environment: {
        IS_VERCEL,
        HAS_BLOB_TOKEN: !!getBlobToken(),
        BLOB_TOKEN_PREFIX: getBlobToken() ? getBlobToken()!.substring(0, 12) + '...' : 'NOT SET',
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
    if (getBlobToken()) {
      try {
        const { blobs } = await list({ prefix: 'data/', token: getBlobToken() });
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

/** POST — Seed manual: sube todos los JSON al Blob */
export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (_user: User) => {
    if (!getBlobToken()) {
      return NextResponse.json(
        { error: 'NEXUS_READ_WRITE_TOKEN no está configurado' },
        { status: 500 }
      );
    }

    try {
      const results = await seedAllToBlob();
      return NextResponse.json({ results });
    } catch (err) {
      return NextResponse.json(
        { error: String(err) },
        { status: 500 }
      );
    }
  }, 'admin');
}

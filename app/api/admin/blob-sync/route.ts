/**
 * POST /api/admin/blob-sync — Seed manual: sube data/ al Blob (una sola vez)
 * GET  /api/admin/blob-sync — Diagnóstico: estado de archivos en Blob
 * Protegido por withAuth (admin)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { list } from '@vercel/blob';
import { seedAllToBlob, seedFilesToBlob, DATA_FILES } from '@/lib/dataService';
import { logAudit } from '@/lib/auditService';
import type { User } from '@/lib/types';

function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }
const IS_VERCEL = !!process.env.VERCEL;

/** GET — Diagnóstico */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (_user: User) => {
    const diagnostics: Record<string, unknown> = {
      environment: {
        IS_VERCEL,
        HAS_BLOB_TOKEN: !!getBlobToken(),
        BLOB_TOKEN_PREFIX: getBlobToken() ? getBlobToken()!.substring(0, 12) + '...' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        CACHE_READY: 'N/A (no cache)',
      },
      blobFiles: {} as Record<string, { exists: boolean; size?: number }>,
    };

    // Check Blob files
    if (getBlobToken()) {
      try {
        const { blobs } = await list({ prefix: 'data/', token: getBlobToken() });
        const blobMap = new Map(blobs.map((b) => [b.pathname, b]));

        for (const file of DATA_FILES) {
          const blob = blobMap.get(`data/${file}`);
          (diagnostics.blobFiles as Record<string, unknown>)[file] = blob
            ? { exists: true, size: blob.size }
            : { exists: false };
        }
        (diagnostics as Record<string, unknown>).totalBlobFiles = blobs.length;
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

/** POST — Seed manual: sube archivos JSON al Blob */
export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user: User) => {
    if (!getBlobToken()) {
      return NextResponse.json(
        { error: 'NEXUS_READ_WRITE_TOKEN no está configurado' },
        { status: 500 }
      );
    }

    try {
      // Soporte para seed selectivo: body { files: ['users.json', 'courses.json'] }
      let results;
      let selectedFiles: string[] = [];
      
      try {
        const body = await request.json();
        if (body.files && Array.isArray(body.files)) {
          // Validar que solo archivos permitidos
          selectedFiles = body.files.filter((f: string) => DATA_FILES.includes(f));
          if (selectedFiles.length === 0) {
            return NextResponse.json({ error: 'Ningún archivo válido seleccionado' }, { status: 400 });
          }
          results = await seedFilesToBlob(selectedFiles);
        } else {
          results = await seedAllToBlob();
          selectedFiles = DATA_FILES;
        }
      } catch {
        // No body or invalid JSON → seed all
        results = await seedAllToBlob();
        selectedFiles = DATA_FILES;
      }

      await logAudit({
        action: 'seed',
        entity: 'blob',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        details: `Seed de ${selectedFiles.length} archivo(s): ${selectedFiles.join(', ')}`,
      });

      return NextResponse.json({ results });
    } catch (err) {
      return NextResponse.json(
        { error: String(err) },
        { status: 500 }
      );
    }
  }, 'admin');
}

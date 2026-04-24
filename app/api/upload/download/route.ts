/**
 * GET /api/upload/download?url=<blobUrl> — Proxy para descargar archivos desde Blob
 *
 * Cuando los archivos se suben a Blob, su filePath es una URL completa
 * (https://xxx.blob.vercel-storage.com/...). Los componentes no pueden
 * pasar esa URL por el path del [...path] route sin que se mangle.
 * Esta ruta recibe la URL de Blob como query param y la proxea usando get() del SDK.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { get } from '@vercel/blob';
import path from 'path';

function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('url');

    if (!blobUrl || !blobUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'URL de Blob requerida' }, { status: 400 });
    }

    const token = getBlobToken();
    if (!token) {
      return NextResponse.json({ error: 'Token de Blob no configurado' }, { status: 500 });
    }

    try {
      const result = await get(blobUrl, { token, access: 'private' });
      if (!result || result.statusCode !== 200) {
        return NextResponse.json({ error: 'Archivo no encontrado en Blob' }, { status: 404 });
      }

      const arrayBuf = await new Response(result.stream).arrayBuffer();
      const contentType = result.blob.contentType || 'application/octet-stream';
      const fileName = path.basename(result.blob.pathname);

      return new NextResponse(new Uint8Array(arrayBuf), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(arrayBuf.byteLength),
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (err) {
      console.error('[download] Error reading from Blob:', err);
      return NextResponse.json({ error: 'Error al descargar archivo' }, { status: 500 });
    }
  });
}

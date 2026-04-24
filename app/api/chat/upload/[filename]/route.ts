/**
 * GET /api/chat/upload/[filename] — Descargar archivo del chat
 * Lee desde Blob (get() SDK) o filesystem local.
 */

import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }
const CHAT_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'chat');

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'text/typescript',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params;

  // Prevent path traversal
  const safe = path.basename(filename);
  if (safe !== filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
  }

  // Check query param for Blob URL (used when filePath is a Blob URL)
  const url = new URL(request.url);
  const blobUrl = url.searchParams.get('blobUrl');

  const token = getBlobToken();

  if (blobUrl && token) {
    try {
      const result = await get(blobUrl, { token, access: 'private' });
      if (!result || result.statusCode !== 200) {
        return NextResponse.json({ error: 'Archivo no encontrado en Blob' }, { status: 404 });
      }
      const arrayBuf = await new Response(result.stream).arrayBuffer();
      const contentType = result.blob.contentType || 'application/octet-stream';
      return new NextResponse(new Uint8Array(arrayBuf), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${safe}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Error al leer archivo desde Blob' }, { status: 500 });
    }
  }

  // Fallback local: filesystem
  const filePath = path.join(CHAT_UPLOAD_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

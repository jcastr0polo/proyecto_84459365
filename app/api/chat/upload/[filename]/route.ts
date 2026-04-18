/**
 * GET /api/chat/upload/[filename] — Descargar archivo del chat
 * Sirve archivos desde data/uploads/chat/ sin autenticación.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params;

  // Prevent path traversal
  const safe = path.basename(filename);
  if (safe !== filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
  }

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
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

/**
 * POST /api/chat/upload — Subir archivo desde el chat público
 * No requiere autenticación.
 * Archivos se guardan en data/uploads/chat/ con un UUID.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const IS_VERCEL = !!process.env.VERCEL;
const CHAT_UPLOAD_DIR = IS_VERCEL
  ? path.join('/tmp', 'data', 'uploads', 'chat')
  : path.join(process.cwd(), 'data', 'uploads', 'chat');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.md', '.txt', '.csv', '.json',
  '.zip', '.html', '.css', '.js', '.ts',
]);

function sanitize(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\<>:"|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .trim() || 'file';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió un archivo.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo excede 10 MB.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `Tipo de archivo no permitido: ${ext}` }, { status: 400 });
    }

    const id = uuidv4();
    const safeName = sanitize(path.basename(file.name, ext));
    const storedName = `${id}-${safeName}${ext}`;

    if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
      fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(CHAT_UPLOAD_DIR, storedName), buffer);

    return NextResponse.json({
      fileName: file.name,
      storedName,
      size: file.size,
      url: `/api/chat/upload/${storedName}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ error: 'Error al subir archivo.' }, { status: 500 });
  }
}

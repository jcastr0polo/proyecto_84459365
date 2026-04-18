/**
 * GET/POST /api/chat/messages — Chat público multi-usuario
 *
 * Mensajes en memoria (se pierden al reiniciar el server).
 * Archivos se embeben como base64 en el mensaje (funciona en Vercel).
 * GET acepta ?after=<id> para polling incremental.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ChatFile {
  fileName: string;
  size: number;
  mimeType: string;
  data: string; // base64
}

export interface ChatMsg {
  id: number;
  user: string;
  text: string;
  file?: ChatFile;
  time: string;
}

const MAX_MESSAGES = 200;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB (base64 expands ~33%, Vercel limit ~4.5 MB)
let seq = 0;
const messages: ChatMsg[] = [];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const after = Number(req.nextUrl.searchParams.get('after') ?? '0');
  const filtered = after ? messages.filter((m) => m.id > after) : messages;
  return NextResponse.json({ messages: filtered });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const user = String(body.user ?? 'Anónimo').slice(0, 30).trim() || 'Anónimo';
    const text = String(body.text ?? '').slice(0, 1000).trim();

    let file: ChatFile | undefined;
    if (body.file) {
      const f = body.file;
      if (!f.fileName || !f.data || typeof f.data !== 'string') {
        return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
      }
      // Validate base64 size (rough check)
      if (f.data.length > MAX_FILE_SIZE * 1.4) {
        return NextResponse.json({ error: 'Archivo excede 3 MB' }, { status: 400 });
      }
      file = {
        fileName: String(f.fileName).slice(0, 200),
        size: Number(f.size) || 0,
        mimeType: String(f.mimeType || 'application/octet-stream').slice(0, 100),
        data: f.data,
      };
    }

    if (!text && !file) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const msg: ChatMsg = {
      id: ++seq,
      user,
      text,
      file,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };

    messages.push(msg);
    while (messages.length > MAX_MESSAGES) messages.shift();

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
}

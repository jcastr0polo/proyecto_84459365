/**
 * GET/POST /api/chat/messages — Chat público multi-usuario
 *
 * Mensajes en memoria (se pierden al reiniciar el server).
 * Archivos persisten en disco vía /api/chat/upload.
 * GET acepta ?after=<id> para polling incremental.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ChatMsg {
  id: number;
  user: string;
  text: string;
  file?: { fileName: string; storedName: string; size: number; url: string };
  time: string;
}

const MAX_MESSAGES = 200;
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
    const file = body.file ?? undefined;

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

    // Keep only last N messages in memory
    while (messages.length > MAX_MESSAGES) messages.shift();

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
}

/**
 * GET /api/prompts/[id] — Detalle de un prompt
 * PUT /api/prompts/[id] — Editar un prompt (admin only, incrementa versión)
 *
 * Fase 18 — Prompts de IA
 * RN-PRM-02: Al editar se incrementa la versión
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { updatePromptSchema } from '@/lib/schemas';
import { getPromptById, readPrompts, writePrompts } from '@/lib/dataService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id } = await params;
      const prompt = getPromptById(id);

      if (!prompt) {
        return NextResponse.json({ error: 'Prompt no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ prompt });
    } catch (error) {
      console.error('Error en GET /api/prompts/[id]:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();

      const parsed = updatePromptSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const prompts = readPrompts();
      const idx = prompts.findIndex((p) => p.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: 'Prompt no encontrado' }, { status: 404 });
      }

      const existing = prompts[idx];
      const now = new Date().toISOString();

      // RN-PRM-02: Increment version on edit
      prompts[idx] = {
        ...existing,
        title: parsed.data.title ?? existing.title,
        content: parsed.data.content ?? existing.content,
        tags: parsed.data.tags ?? existing.tags,
        isTemplate: parsed.data.isTemplate ?? existing.isTemplate,
        activityId: parsed.data.activityId === null
          ? undefined
          : (parsed.data.activityId ?? existing.activityId),
        version: existing.version + 1,
        updatedAt: now,
      };

      writePrompts(prompts);

      return NextResponse.json({ prompt: prompts[idx] });
    } catch (error) {
      console.error('Error en PUT /api/prompts/[id]:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

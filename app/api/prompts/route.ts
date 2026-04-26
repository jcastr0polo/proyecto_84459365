/**
 * GET /api/prompts — Listar prompts (filtros: courseId, tags, isTemplate)
 * POST /api/prompts — Crear un prompt (admin only)
 *
 * Fase 18 — Prompts de IA
 * RN-PRM-01: Solo admin crea prompts
 * RN-PRM-03: Plantillas reutilizables (isTemplate)
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/withAuth';
import { createPromptSchema } from '@/lib/schemas';
import { readPromptsFresh, writePrompts, getPromptsByCourse, getCourseById, withFileLock, nowColombiaISO } from '@/lib/dataService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { AIPrompt } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const url = new URL(request.url);
      const courseId = url.searchParams.get('courseId');
      const tag = url.searchParams.get('tag');
      const isTemplate = url.searchParams.get('isTemplate');

      let prompts: AIPrompt[];

      if (courseId) {
        prompts = await getPromptsByCourse(courseId);
      } else {
        prompts = await readPromptsFresh();
      }

      // Filter by tag
      if (tag) {
        prompts = prompts.filter((p) => p.tags.includes(tag));
      }

      // Filter by template
      if (isTemplate !== null) {
        prompts = prompts.filter((p) => p.isTemplate === (isTemplate === 'true'));
      }

      // Sort by updatedAt descending
      prompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return NextResponse.json({ prompts });
    } catch (error) {
      console.error('Error en GET /api/prompts:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();

      const parsed = createPromptSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Verify course exists
      const course = await getCourseById(parsed.data.courseId);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const now = nowColombiaISO();
      const prompt: AIPrompt = {
        id: uuidv4(),
        courseId: parsed.data.courseId,
        activityId: parsed.data.activityId,
        title: parsed.data.title,
        content: parsed.data.content,
        version: 1,
        tags: parsed.data.tags,
        isTemplate: parsed.data.isTemplate,
        createdAt: now,
        updatedAt: now,
      };

      await withFileLock('prompts.json', async () => {
        const prompts = await readPromptsFresh();
        prompts.push(prompt);
        await dispatchWrite(
          () => writePrompts(prompts),
          { action: 'create', entity: 'prompt', entityId: prompt.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Creó prompt "${prompt.title}"`, after: auditSnapshot(prompt), ...extractRequestMeta(request) }
        );
      });

      return NextResponse.json({ prompt }, { status: 201 });
    } catch (error) {
      console.error('Error en POST /api/prompts:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

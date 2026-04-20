/**
 * GET /api/projects/[id]/document — Descargar/ver el documento MD del proyecto
 *
 * Devuelve el contenido del archivo MD como texto.
 * Acceso: Admin siempre, Estudiante solo su propio proyecto.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { getProjectById } from '@/lib/dataService';
import { get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const IS_VERCEL = !!process.env.VERCEL;
function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;
    const project = getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Estudiante solo ve su propio documento
    if (user.role === 'student' && project.studentId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!project.documentUrl) {
      return NextResponse.json({ error: 'Este proyecto no tiene documento cargado' }, { status: 404 });
    }

    let content: string;

    if (IS_VERCEL && project.documentUrl.startsWith('http')) {
      // Blob URL — descargar usando SDK
      const token = getBlobToken();
      if (!token) {
        return NextResponse.json({ error: 'Token de Blob no configurado' }, { status: 500 });
      }
      const result = await get(project.documentUrl, { token, access: 'private' });
      if (!result || result.statusCode !== 200) {
        return NextResponse.json({ error: 'No se pudo leer el documento desde Blob' }, { status: 500 });
      }
      content = await new Response(result.stream).text();
    } else {
      // Local: leer del filesystem
      const filePath = path.join(process.cwd(), 'data', project.documentUrl);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Archivo no encontrado en disco' }, { status: 404 });
      }
      content = fs.readFileSync(filePath, 'utf-8');
    }

    return NextResponse.json({ content, documentUrl: project.documentUrl });
  });
}

/**
 * POST /api/projects/[id]/upload — Subir archivo MD del proyecto
 *
 * Organiza archivos en Blob: projects/{semesterId}/{courseId}/{studentId}/{filename}
 * Solo acepta archivos .md y .txt (documentación del proyecto)
 * El estudiante solo puede subir a su propio proyecto.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readProjects, readProjectsFresh, writeProjects, getCourseById } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { put } from '@vercel/blob';
import { withFileLock } from '@/lib/blobSync';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const IS_VERCEL = !!process.env.VERCEL;
function getBlobToken() { return process.env.NEXUS_READ_WRITE_TOKEN; }

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB para MDs

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'text/markdown': ['.md'],
  'text/plain': ['.txt', '.md'],
  'application/octet-stream': ['.md'], // algunos browsers envían esto para .md
};

function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\<>:"|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .trim() || 'document';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    const { id } = await params;

    // Buscar proyecto
    const projects = readProjects();
    const projectIndex = projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const project = projects[projectIndex];

    // Solo el dueño o admin puede subir
    if (user.role === 'student' && project.studentId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para subir archivos a este proyecto' }, { status: 403 });
    }

    // Bloquear upload si el proyecto ya no está en progreso (solo admin puede override)
    if (user.role === 'student' && project.status !== 'in-progress') {
      return NextResponse.json(
        { error: 'No puedes subir documentos porque el proyecto ya fue cerrado por el docente' },
        { status: 403 }
      );
    }

    // Leer FormData
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió un archivo. Envíe un campo "file" en FormData.' }, { status: 400 });
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `El archivo excede el máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    // Validar tipo MIME
    const mimeType = file.type || 'application/octet-stream';
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ALLOWED_MIME_TYPES[mimeType];
    if (!allowedExts || !allowedExts.includes(ext)) {
      // Permitir .md con cualquier MIME (browsers inconsistentes)
      if (ext !== '.md' && ext !== '.txt') {
        return NextResponse.json(
          { error: 'Solo se permiten archivos .md o .txt' },
          { status: 400 }
        );
      }
    }

    // Construir ruta organizada: projects/{semesterId}/{courseId}/{studentId}/{filename}
    const course = getCourseById(project.courseId);
    const semesterId = course?.semesterId ?? 'unknown';
    const sanitizedName = sanitizeFileName(path.basename(file.name, ext));
    const timestamp = Date.now();
    const shortId = uuidv4().split('-')[0];
    const finalFileName = `${timestamp}-${shortId}-${sanitizedName}${ext}`;

    const blobPath = `projects/${semesterId}/${project.courseId}/${project.studentId}/${finalFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let documentUrl: string;

    if (IS_VERCEL && getBlobToken()) {
      // Subir a Blob
      const blob = await put(blobPath, buffer, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: getBlobToken(),
        contentType: 'text/markdown',
      });
      documentUrl = blob.url;
    } else {
      // Local: guardar en data/uploads/projects/...
      const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'projects', semesterId, project.courseId, project.studentId);
      fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, finalFileName);
      fs.writeFileSync(filePath, buffer);
      documentUrl = `uploads/projects/${semesterId}/${project.courseId}/${project.studentId}/${finalFileName}`;
    }

    // Actualizar proyecto con la URL del documento — leer fresco con lock
    const updatedProject = await withFileLock('projects.json', async () => {
      const freshProjects = await readProjectsFresh();
      const freshIndex = freshProjects.findIndex((p) => p.id === id);
      if (freshIndex !== -1) {
        freshProjects[freshIndex] = {
          ...freshProjects[freshIndex],
          documentUrl,
          updatedAt: new Date().toISOString(),
        };
      }
      await dispatchWrite(
        () => writeProjects(freshProjects),
        { action: 'upload', entity: 'project', entityId: project.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Subió documento al proyecto "${project.projectName}"` }
      );
      return freshProjects[freshIndex !== -1 ? freshIndex : 0];
    });

    return NextResponse.json({
      message: 'Documento subido exitosamente',
      documentUrl,
      project: updatedProject,
    }, { status: 201 });
  });
}

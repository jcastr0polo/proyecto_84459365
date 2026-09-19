/**
 * POST   /api/projects/[id]/imagen — subir la imagen del proyecto
 * DELETE /api/projects/[id]/imagen — quitarla
 *
 * El estudiante podía poner enlaces a GitHub, Vercel y Figma, pero la imagen
 * con la que su proyecto sale en la vitrina solo la ponía el docente, y solo
 * pegando una URL. Ahora la sube él: el archivo va al Blob del proyecto, igual
 * que el documento .md, y se guarda su URL en showcaseImageUrl.
 *
 * Pegar una URL externa sigue siendo posible desde el formulario (PUT), para
 * quien ya tiene la captura publicada en otro sitio.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readProjectsFresh, getCourseById, patchProject } from '@/lib/dataService';
import { uploadFile, deleteFile, UploadError } from '@/lib/uploadService';
import { logAudit, extractRequestMeta, auditSnapshot } from '@/lib/auditService';

type RouteParams = { params: Promise<{ id: string }> };

/** Solo mapas de bits que cualquier navegador pinta en un <img>. */
const IMAGENES: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/* SVG queda fuera a propósito: es un documento, puede traer <script> dentro y
   acaba en una página pública. No compensa por una captura de pantalla. */

const MAX = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const project = (await readProjectsFresh()).find((p) => p.id === id);
      if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });

      if (user.role === 'student' && project.studentId !== user.id) {
        return NextResponse.json({ error: 'Ese proyecto no es tuyo' }, { status: 403 });
      }

      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'No se recibió una imagen' }, { status: 400 });
      }
      if (file.size > MAX) {
        return NextResponse.json(
          { error: `La imagen pesa ${(file.size / 1048576).toFixed(1)}MB y el máximo son ${MAX / 1048576}MB` },
          { status: 400 },
        );
      }
      const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
      if (!IMAGENES[file.type]?.includes(ext)) {
        return NextResponse.json(
          { error: 'Solo PNG, JPG, WEBP o GIF. Una captura del proyecto funcionando.' },
          { status: 400 },
        );
      }

      const course = await getCourseById(project.courseId);
      const destino = `projects/${course?.semesterId ?? 'sin-semestre'}/${project.courseId}/${project.studentId}/vitrina`;

      let subida;
      try {
        subida = await uploadFile(file, destino);
      } catch (err) {
        if (err instanceof UploadError) {
          return NextResponse.json({ error: err.message }, { status: err.statusCode });
        }
        throw err;
      }

      const anterior = project.showcaseImageUrl;
      try {
        await patchProject(id, { showcaseImageUrl: subida.filePath });
      } catch (e) {
        await deleteFile(subida.filePath).catch(() => {});
        throw e;
      }

      /* La anterior se borra después de guardar la nueva: si se cae el borrado
         queda un archivo suelto, y eso es mejor que una ficha apuntando a nada.
         Solo si era nuestra —una URL externa no es nuestra para borrarla—. */
      if (anterior && anterior !== subida.filePath && /\/uploads\/projects\//.test(anterior)) {
        await deleteFile(anterior).catch(() => {});
      }

      logAudit({
        action: 'update', entity: 'project', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Cambió la imagen de vitrina de "${project.projectName}"`,
        after: auditSnapshot({ showcaseImageUrl: subida.filePath }),
        ...extractRequestMeta(request),
      });

      return NextResponse.json({ showcaseImageUrl: subida.filePath, message: 'Imagen actualizada' }, { status: 201 });
    } catch (error) {
      console.error('[imagen proyecto] POST', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error interno' },
        { status: 500 },
      );
    }
  });
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const project = (await readProjectsFresh()).find((p) => p.id === id);
      if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      if (user.role === 'student' && project.studentId !== user.id) {
        return NextResponse.json({ error: 'Ese proyecto no es tuyo' }, { status: 403 });
      }
      if (!project.showcaseImageUrl) {
        return NextResponse.json({ error: 'Este proyecto no tiene imagen' }, { status: 404 });
      }

      const anterior = project.showcaseImageUrl;
      await patchProject(id, { showcaseImageUrl: '' });
      if (/\/uploads\/projects\//.test(anterior)) await deleteFile(anterior).catch(() => {});

      logAudit({
        action: 'update', entity: 'project', entityId: id,
        userId: user.id, userName: `${user.firstName} ${user.lastName}`,
        details: `Quitó la imagen de vitrina de "${project.projectName}"`,
        before: auditSnapshot({ showcaseImageUrl: anterior }),
        ...extractRequestMeta(request),
      });

      return NextResponse.json({ showcaseImageUrl: '', message: 'Imagen retirada' });
    } catch (error) {
      console.error('[imagen proyecto] DELETE', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error interno' },
        { status: 500 },
      );
    }
  });
}

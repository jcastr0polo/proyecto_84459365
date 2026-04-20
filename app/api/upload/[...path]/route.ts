/**
 * GET /api/upload/[...path] — Servir archivos estáticos desde data/uploads/
 *
 * Fase 11 — Actividades y Material Backend
 * Solo usuarios autenticados pueden descargar archivos.
 * Prevención de path traversal.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readUploadedFile, UploadError } from '@/lib/uploadService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { path: pathSegments } = await params;

      if (!pathSegments || pathSegments.length === 0) {
        return NextResponse.json(
          { error: 'Ruta no especificada' },
          { status: 400 }
        );
      }

      // Prevenir path traversal en segmentos
      for (const segment of pathSegments) {
        if (segment === '..' || segment.includes('..')) {
          return NextResponse.json(
            { error: 'Ruta inválida' },
            { status: 403 }
          );
        }
      }

      const relativePath = `uploads/${pathSegments.join('/')}`;
      const { buffer, mimeType } = await readUploadedFile(relativePath);

      // Obtener nombre del archivo (último segmento)
      const fileName = pathSegments[pathSegments.length - 1];

      // Convertir Buffer a Uint8Array para compatibilidad con NextResponse
      const body = new Uint8Array(buffer);

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      console.error('Error sirviendo archivo:', error);
      return NextResponse.json(
        { error: 'Error interno al servir el archivo' },
        { status: 500 }
      );
    }
  });
}

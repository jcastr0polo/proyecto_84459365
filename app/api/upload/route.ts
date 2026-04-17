/**
 * POST /api/upload — Subir un archivo
 *
 * Fase 11 — Actividades y Material Backend
 * Recibe FormData con un archivo y parámetro destination.
 * Solo usuarios autenticados pueden subir archivos.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { uploadFile, UploadError } from '@/lib/uploadService';

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const formData = await request.formData();

      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'No se recibió un archivo. Envíe un campo "file" en FormData.' },
          { status: 400 }
        );
      }

      const destination = formData.get('destination');
      if (!destination || typeof destination !== 'string') {
        return NextResponse.json(
          { error: 'El campo "destination" es requerido (ej: "activities/act-xxx")' },
          { status: 400 }
        );
      }

      // Validar que destination sea una ruta esperada
      if (!destination.startsWith('activities/') && !destination.startsWith('submissions/')) {
        return NextResponse.json(
          { error: 'Destino inválido. Debe comenzar con "activities/" o "submissions/"' },
          { status: 400 }
        );
      }

      const attachment = await uploadFile(file, destination);

      return NextResponse.json(
        { attachment, message: 'Archivo subido exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      console.error('Error en upload:', error);
      return NextResponse.json(
        { error: 'Error interno al subir el archivo' },
        { status: 500 }
      );
    }
  });
}

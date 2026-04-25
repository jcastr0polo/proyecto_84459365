/**
 * GET /api/admin/blob-download?file=users.json — Descargar un archivo del Blob
 * GET /api/admin/blob-download?file=all — Descargar todos los archivos como JSON
 *
 * Permite al admin ver/exportar la data real que está en Blob.
 * Lee DIRECTO de Blob — sin caché.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { DATA_FILES, readFromBlobDirect } from '@/lib/dataService';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    // Descargar todos los archivos como un objeto
    if (file === 'all') {
      const allData: Record<string, unknown> = {};
      for (const f of DATA_FILES) {
        try {
          const raw = await readFromBlobDirect(f);
          allData[f] = raw ? JSON.parse(raw) : null;
        } catch {
          allData[f] = null;
        }
      }
      return NextResponse.json(allData);
    }

    // Descargar archivo específico
    if (!file || !DATA_FILES.includes(file)) {
      return NextResponse.json(
        { error: `Archivo inválido. Disponibles: ${DATA_FILES.join(', ')}` },
        { status: 400 }
      );
    }

    try {
      const raw = await readFromBlobDirect(file);
      if (!raw) {
        return NextResponse.json({ error: `${file} no encontrado en Blob` }, { status: 404 });
      }
      const data = JSON.parse(raw);
      return NextResponse.json({ file, data, size: raw.length });
    } catch (err) {
      return NextResponse.json({ error: `Error al leer ${file}: ${err}` }, { status: 500 });
    }
  }, 'admin');
}

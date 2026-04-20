/**
 * GET /api/admin/blob-download?file=users.json — Descargar un archivo del Blob
 * GET /api/admin/blob-download?file=all — Descargar todos los archivos como JSON
 *
 * Permite al admin ver/exportar la data real que está en Blob.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { DATA_FILES, readFromCache, isCacheReady } from '@/lib/blobSync';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!isCacheReady()) {
      return NextResponse.json({ error: 'Cache not ready' }, { status: 503 });
    }

    // Descargar todos los archivos como un objeto
    if (file === 'all') {
      const allData: Record<string, unknown> = {};
      for (const f of DATA_FILES) {
        try {
          const raw = readFromCache(f);
          allData[f] = JSON.parse(raw);
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
      const raw = readFromCache(file);
      const data = JSON.parse(raw);
      return NextResponse.json({ file, data, size: raw.length });
    } catch (err) {
      return NextResponse.json({ error: `Error al leer ${file}: ${err}` }, { status: 500 });
    }
  }, 'admin');
}

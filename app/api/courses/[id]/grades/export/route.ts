/**
 * GET /api/courses/[id]/grades/export — Exportar notas del curso como CSV
 *
 * Fase 17 — Exportación de Notas
 * RF-CAL-06: Exportar tabla de notas definitivas en CSV compatible con sistema institucional
 * CU-07: Exportar Notas del Curso
 *
 * Headers de respuesta:
 * - Content-Type: text/csv; charset=utf-8
 * - Content-Disposition: attachment; filename="notas-{code}-{date}.csv"
 *
 * Query params opcionales:
 * - format=json → retorna JSON en lugar de CSV
 *
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { generateGradesCSV, generateGradesJSON } from '@/lib/exportService';
import { GradeError } from '@/lib/gradeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id: courseId } = await params;
      const url = new URL(request.url);
      const format = url.searchParams.get('format');

      if (format === 'json') {
        // Formato JSON para consumo programático
        const data = await generateGradesJSON(courseId);
        return NextResponse.json(data);
      }

      // Formato CSV (por defecto)
      const { csv, filename } = await generateGradesCSV(courseId);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      if (error instanceof GradeError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Error en GET /api/courses/[id]/grades/export:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * API Route Handler: GET /api/data
 * 
 * Propósito: Retorna el contenido de /data/home.json validado y tipado
 * 
 * Métodos soportados:
 * - GET: Retorna HomeData validada
 * 
 * Respuestas:
 * - 200: HomeData JSON válido
 * - 500: Error al leer o validar el archivo
 * 
 * Seguridad:
 * - Los datos son leídos del servidor (nunca del cliente)
 * - Validación runtime con Zod antes de responder
 * - Error messages claros pero sin exponer rutas internas
 */

import { NextResponse, NextRequest } from 'next/server';
import { readHomeData } from '@/lib/dataService';
import type { HomeData } from '@/lib/types';

/**
 * GET /api/data
 * 
 * Lee /data/home.json y lo retorna validado como HomeData
 * 
 * @returns {NextResponse<HomeData>} — JSON de home.json tipado y validado
 * @throws {NextResponse} — Error 500 si falla lectura o validación
 * 
 * Ejemplo de respuesta exitosa (200):
 * {
 *   "hero": {
 *     "title": "Hola Mundo",
 *     "subtitle": "TypeScript + Next.js + Vercel",
 *     "description": "Sistema fullstack funcionando correctamente.",
 *     "animationStyle": "typewriter"
 *   },
 *   "meta": {
 *     "pageTitle": "Home | Mi App",
 *     "description": "Página principal del sistema"
 *   }
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse<HomeData | { error: string }>> {
  try {
    // Leer y validar home.json desde el servidor
    const homeData = readHomeData();

    // Retornar datos tipados con headers apropiados
    return NextResponse.json<HomeData>(homeData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: unknown) {
    // Logging (en producción, usar un logger real)
    console.error('[GET /api/data] Error:', error);

    // Manejo de errores con mensaje claro
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<{ error: string }>(
      { error: `Failed to fetch home data: ${errorMessage}` },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

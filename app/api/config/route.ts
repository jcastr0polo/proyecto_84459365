/**
 * API Route Handler: GET /api/config
 * 
 * Propósito: Retorna el contenido de /data/config.json validado y tipado
 * 
 * Métodos soportados:
 * - GET: Retorna AppConfig validada
 * 
 * Respuestas:
 * - 200: AppConfig JSON válido
 * - 500: Error al leer o validar el archivo
 * 
 * Seguridad:
 * - Los datos son leídos del servidor (nunca del cliente)
 * - Validación runtime con Zod antes de responder
 * - Error messages claros pero sin exponer rutas internas
 */

import { NextResponse, NextRequest } from 'next/server';
import { readAppConfig } from '@/lib/dataService';
import { ensureDataReady } from '@/lib/blobSync';
import type { AppConfig } from '@/lib/types';

/**
 * GET /api/config
 * 
 * Lee /data/config.json y lo retorna validado como AppConfig
 * 
 * @returns {NextResponse<AppConfig>} — JSON de config.json tipado y validado
 * @throws {NextResponse} — Error 500 si falla lectura o validación
 * 
 * Ejemplo de respuesta exitosa (200):
 * {
 *   "appName": "Mi App TypeScript",
 *   "version": "1.0.0",
 *   "locale": "es-CO",
 *   "theme": "dark"
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse<AppConfig | { error: string }>> {
  try {
    await ensureDataReady();
    // Leer y validar config.json desde el servidor
    const appConfig = readAppConfig();

    // Retornar datos tipados con headers apropiados
    return NextResponse.json<AppConfig>(appConfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: unknown) {
    // Logging (en producción, usar un logger real)
    console.error('[GET /api/config] Error:', error);

    // Manejo de errores con mensaje claro
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<{ error: string }>(
      { error: `Failed to fetch app config: ${errorMessage}` },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

/**
 * lib/auditService.ts
 * Dispatcher de auditoría — TODA escritura pasa por aquí.
 *
 * Arquitectura DB-like:
 * - Auditoría escribe en audit.json (archivo SEPARADO de los datos)
 * - Tiene su propio withFileLock('audit.json') → cola propia
 * - NUNCA bloquea escrituras de datos (archivos distintos = colas distintas)
 * - logAudit es FIRE-AND-FORGET: se ejecuta en background, no bloquea respuesta
 * - Si falla la auditoría, los datos ya se guardaron (prioridad: datos > audit)
 *
 * Máximo 1000 registros (FIFO: los más antiguos se eliminan).
 */

import { readJsonFileFresh, writeJsonFile, withFileLock } from './dataService';
import { nowColombiaISO } from './dateUtils';

const MAX_AUDIT_ENTRIES = 1000;

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;         // 'login' | 'logout' | 'create' | 'update' | 'delete' | 'upload' | 'seed' | 'password'
  entity: string;         // 'user' | 'enrollment' | 'project' | 'activity' | 'course' | 'semester' | 'grade' | 'submission' | 'prompt' | 'blob'
  entityId?: string;      // ID del recurso afectado
  userId: string;         // Quién realizó la acción
  userName?: string;      // Nombre para display
  details?: string;       // Detalle legible
  metadata?: Record<string, unknown>; // Datos extra
  before?: Record<string, unknown>;   // Estado anterior (update/delete)
  after?: Record<string, unknown>;    // Estado nuevo (create/update)
  ip?: string;            // IP del cliente
  userAgent?: string;     // User-Agent del cliente
}

/** Contexto de auditoría — pásalo a cualquier función write para generar audit automático */
export interface AuditContext {
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Extrae IP y User-Agent de un Request para auditoría.
 */
export function extractRequestMeta(request: Request): { ip: string; userAgent: string } {
  const headers = request.headers;
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown';
  const userAgent = headers.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

/**
 * Crea un snapshot seguro del objeto para auditoría.
 * Omite campos sensibles (password, hash) y limita profundidad.
 */
export function auditSnapshot(obj: unknown): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const OMIT = ['passwordHash', 'password', 'token', 'sessionToken'];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (OMIT.includes(k)) continue;
    clean[k] = v;
  }
  return clean;
}

/**
 * Lee el log de auditoría
 */
export async function readAudit(): Promise<AuditEntry[]> {
  try {
    return await readJsonFileFresh<AuditEntry[]>('audit.json');
  } catch {
    return [];
  }
}

/**
 * Implementación interna: escribe la entrada de auditoría con lock propio.
 * Serializa escrituras concurrentes a audit.json via cola (withFileLock).
 * NO debe llamarse directamente — usar logAudit().
 */
async function _writeAudit(ctx: AuditContext): Promise<void> {
  await withFileLock('audit.json', async () => {
    let audit: AuditEntry[];
    try {
      audit = await readJsonFileFresh<AuditEntry[]>('audit.json');
    } catch {
      audit = [];
    }

    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: nowColombiaISO(),
      ...ctx,
    };

    audit.unshift(newEntry); // Más reciente primero

    // Limitar tamaño
    if (audit.length > MAX_AUDIT_ENTRIES) {
      audit.length = MAX_AUDIT_ENTRIES;
    }

    await writeJsonFile('audit.json', audit);
  });
}

/**
 * Registra una entrada de auditoría — FIRE-AND-FORGET.
 *
 * - Se ejecuta en background, no bloquea la respuesta al usuario.
 * - Tiene su propia cola (withFileLock('audit.json')), no interfiere con datos.
 * - Si falla, loguea a console.error pero NUNCA lanza error al caller.
 * - Los callers pueden hacer `await logAudit(...)` o simplemente `logAudit(...)`,
 *   ambos son equivalentes: retorna void inmediatamente.
 */
export function logAudit(ctx: AuditContext): void {
  _writeAudit(ctx).catch((err) => {
    console.error('[audit] Background write failed:', err);
  });
}

/**
 * Dispatcher: escribe datos + registra auditoría en background.
 *
 * 1. AWAIT la escritura de datos (prioridad máxima, debe completar)
 * 2. FIRE-AND-FORGET la auditoría (background, no bloquea respuesta)
 *
 * @param writeFn - La función async de escritura (ej: writeUsers(users))
 * @param audit - Contexto de auditoría
 */
export async function dispatchWrite(
  writeFn: () => Promise<void>,
  audit: AuditContext
): Promise<void> {
  await writeFn();        // Datos: AWAIT — debe completar antes de responder
  logAudit(audit);        // Audit: fire-and-forget — no bloquea
}


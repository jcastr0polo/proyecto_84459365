/**
 * lib/auditService.ts
 * Dispatcher de auditoría — TODA escritura pasa por aquí.
 *
 * Arquitectura post-cutover (Supabase):
 * - Cada entrada es una fila INSERT en `audit_log` (sin lock manual, Postgres serializa).
 * - logAudit sigue siendo FIRE-AND-FORGET: no bloquea la respuesta al usuario.
 * - Si falla la auditoría, los datos ya se guardaron (prioridad: datos > audit).
 */

import { nowColombiaISO } from './dateUtils';

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
 * Lee el log de auditoría (Supabase). Devuelve los más recientes primero.
 */
export async function readAudit(limit = 1000): Promise<AuditEntry[]> {
  try {
    const { supabaseReadAuditLog } = await import('./supabase');
    return await supabaseReadAuditLog(limit);
  } catch (err) {
    console.error('[audit] readAudit failed:', err);
    return [];
  }
}

/**
 * Implementación interna: inserta una fila en `audit_log` en Supabase.
 * Postgres serializa por sí mismo — no requiere lock manual.
 * NO debe llamarse directamente — usar logAudit().
 */
async function _writeAudit(ctx: AuditContext): Promise<void> {
  const { supabaseInsertAuditEntry } = await import('./supabase');
  const entry: AuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowColombiaISO(),
    ...ctx,
  };
  await supabaseInsertAuditEntry(entry);
}

/**
 * Registra una entrada de auditoría — FIRE-AND-FORGET.
 *
 * - Se ejecuta en background, no bloquea la respuesta al usuario.
 * - Cada INSERT es independiente — Postgres serializa por su cuenta.
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


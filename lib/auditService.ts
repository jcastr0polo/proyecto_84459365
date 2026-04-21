/**
 * lib/auditService.ts
 * Dispatcher de auditoría — TODA escritura pasa por aquí.
 *
 * Patrón: cada writeX() en dataService acepta un AuditContext opcional.
 * Si se provee, se registra automáticamente.
 * Máximo 1000 registros (FIFO: los más antiguos se eliminan).
 */

import { readJsonFile, writeJsonFile } from './dataService';

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
}

/**
 * Lee el log de auditoría
 */
export function readAudit(): AuditEntry[] {
  try {
    return readJsonFile<AuditEntry[]>('audit.json');
  } catch {
    return [];
  }
}

/**
 * Registra una entrada de auditoría.
 * No lanza error si falla (la auditoría nunca debe romper el flujo principal).
 */
export async function logAudit(ctx: AuditContext): Promise<void> {
  try {
    const audit = readAudit();

    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...ctx,
    };

    audit.unshift(newEntry); // Más reciente primero

    // Limitar tamaño
    if (audit.length > MAX_AUDIT_ENTRIES) {
      audit.length = MAX_AUDIT_ENTRIES;
    }

    await writeJsonFile('audit.json', audit);
  } catch (err) {
    console.error('[audit] Failed to log:', err);
  }
}

/**
 * Dispatcher: escribe datos + registra auditoría automáticamente.
 * Usa esto en lugar de llamar writeJsonFile directamente en las rutas.
 *
 * @param writeFn - La función async de escritura (ej: writeUsers(users))
 * @param audit - Contexto de auditoría
 */
export async function dispatchWrite(
  writeFn: () => Promise<void>,
  audit: AuditContext
): Promise<void> {
  await writeFn();
  await logAudit(audit);
}


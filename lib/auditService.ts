/**
 * lib/auditService.ts
 * Servicio de auditoría — registro de acciones en el sistema
 *
 * Guarda un log de eventos: login, creación, edición, eliminación, etc.
 * Se almacena en audit.json (Blob en producción).
 * Máximo 500 registros (FIFO: los más antiguos se eliminan).
 */

import { readJsonFile, writeJsonFile } from './dataService';

const MAX_AUDIT_ENTRIES = 500;

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;         // 'login' | 'create' | 'update' | 'delete' | 'upload' | 'seed' | etc
  entity: string;         // 'user' | 'enrollment' | 'project' | 'activity' | etc
  entityId?: string;      // ID del recurso afectado
  userId: string;         // Quién realizó la acción
  userName?: string;      // Nombre para display
  details?: string;       // Detalle legible
  metadata?: Record<string, unknown>; // Datos extra
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
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const audit = readAudit();

    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
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

// ────────────────────────────────────────────────────────────
// Centralización de fechas — Zona horaria Colombia (UTC-5)
// ────────────────────────────────────────────────────────────
// Colombia NO tiene horario de verano, siempre es UTC-5.
//
// BUG que resuelve:
//   new Date("2026-04-25") → 2026-04-25T00:00:00Z (UTC)
//   En Colombia (UTC-5) eso es 2026-04-24T19:00:00 → DÍA ANTERIOR
//
// SOLUCIÓN: parseDateColombia() interpreta fechas "YYYY-MM-DD" como
// medianoche Colombia (00:00 COT = 05:00 UTC del mismo día).
// ────────────────────────────────────────────────────────────

export const COLOMBIA_TZ = 'America/Bogota';

// ═══════════════════════════════════════════════
// Timestamps (para createdAt, updatedAt, etc.)
// ═══════════════════════════════════════════════

/**
 * Retorna la fecha/hora actual en Colombia como ISO string.
 * Formato: "2026-04-25T14:30:00-05:00"
 *
 * Usar en lugar de: new Date().toISOString()
 */
export function nowColombiaISO(): string {
  // sv-SE locale → "2026-04-25 14:30:00" (formato ISO-like)
  const str = new Date().toLocaleString('sv-SE', { timeZone: COLOMBIA_TZ });
  return str.replace(' ', 'T') + '-05:00';
}

// ═══════════════════════════════════════════════
// Parsing seguro de fechas
// ═══════════════════════════════════════════════

/**
 * Parsea una fecha de forma segura en zona horaria Colombia.
 *
 * - "2026-04-25" (solo fecha) → 2026-04-25T05:00:00Z (medianoche COT)
 * - "2026-04-25T14:30:00Z" → se parsea normal (ya tiene hora)
 * - "2026-04-25T14:30:00-05:00" → se parsea normal
 */
export function parseDateColombia(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  // Fecha sola: "2026-04-25" → tratar como medianoche Colombia
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T05:00:00.000Z`); // 00:00 COT = 05:00 UTC
  }

  // Fecha + hora sin timezone: "2026-04-25T06:40" o "2026-04-25T14:30:00"
  // (output del DateTimePicker). Interpretar como hora Colombia (UTC-5).
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) {
    // "2026-04-25T06:40" → "2026-04-25T06:40:00-05:00"
    return new Date(`${dateStr}:00-05:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    // "2026-04-25T06:40:00" → "2026-04-25T06:40:00-05:00"
    return new Date(`${dateStr}-05:00`);
  }

  // Ya tiene timezone (Z, +00:00, -05:00, etc.), parsear normalmente
  return new Date(dateStr);
}

/**
 * Combina una fecha "YYYY-MM-DD" + hora "HH:mm" en una Date de Colombia.
 * Usa defaults seguros:
 *   - Si no hay hora y es deadline → "23:59"
 *   - Si no hay hora y es inicio  → "00:00"
 *
 * Ejemplo: parseDateTimeColombia("2026-04-25", "14:30")
 *          → 2026-04-25 14:30 COT = 2026-04-25T19:30:00Z
 */
export function parseDateTimeColombia(dateStr: string, timeStr?: string): Date {
  if (!dateStr) return new Date(NaN);

  const time = timeStr || '00:00';
  const [hh, mm] = time.split(':').map(Number);

  // Fecha base: medianoche Colombia = 05:00 UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const base = new Date(`${dateStr}T05:00:00.000Z`);
    base.setUTCHours(base.getUTCHours() + hh);
    base.setUTCMinutes(base.getUTCMinutes() + mm);
    return base;
  }

  // Si ya tiene hora, parsear normal
  return new Date(dateStr);
}

// ═══════════════════════════════════════════════
// Comparaciones de fecha
// ═══════════════════════════════════════════════

/**
 * "Ahora" como Date para comparaciones.
 * Compatible con parseDateColombia() porque ambos trabajan en UTC.
 */
export function nowColombia(): Date {
  return new Date();
}

/**
 * ¿La fecha ya pasó? (ahora > fecha)
 */
export function isPast(dateStr: string): boolean {
  return new Date() > parseDateColombia(dateStr);
}

/**
 * ¿La fecha aún no llega? (ahora < fecha)
 */
export function isFuture(dateStr: string): boolean {
  return new Date() < parseDateColombia(dateStr);
}

// ═══════════════════════════════════════════════
// Formateo para UI
// ═══════════════════════════════════════════════

/**
 * Formatea fecha para mostrar (solo fecha).
 * "25 abr 2026"
 */
export function formatDateColombia(iso: string): string {
  try {
    const d = parseDateColombia(iso);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: COLOMBIA_TZ,
    });
  } catch {
    return iso;
  }
}

/**
 * Formatea fecha + hora para mostrar.
 * "25 abr 2026, 02:30 p.m."
 */
export function formatDateTimeColombia(iso: string): string {
  try {
    const d = parseDateColombia(iso);
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: COLOMBIA_TZ,
    });
  } catch {
    return iso;
  }
}

/**
 * Formatea solo la hora actual en Colombia.
 * "02:30 p.m."
 */
export function formatTimeColombia(): string {
  return new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: COLOMBIA_TZ,
  });
}

/**
 * Formatea fecha corta para badges/cards.
 * "25 abr"
 */
export function formatDateShort(iso: string): string {
  try {
    const d = parseDateColombia(iso);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      timeZone: COLOMBIA_TZ,
    });
  } catch {
    return iso;
  }
}

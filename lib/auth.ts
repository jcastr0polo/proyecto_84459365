/**
 * lib/auth.ts
 * Librería de autenticación — Fase 6
 * 
 * Seguridad primero:
 * - bcrypt con 10 salt rounds para hashing
 * - UUID v4 para tokens de sesión (impredecibles)
 * - Cookies HttpOnly, Secure, SameSite=Strict
 * - Sesiones con expiración de 24 horas
 * - Nunca se expone passwordHash al cliente
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { Session } from '@/lib/types';
import { readSessions, writeSessions } from '@/lib/dataService';

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const SESSION_COOKIE_NAME = 'session_token';

/**
 * Hashea una contraseña en texto plano con bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verifica una contraseña en texto plano contra un hash bcrypt
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Crea una nueva sesión para un usuario
 * - Genera token UUID v4 (criptográficamente fuerte)
 * - Expira en 24 horas
 * - Persiste en sessions.json
 */
export function createSession(userId: string): Session {
  const now = new Date();
  const session: Session = {
    id: uuidv4(),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
  };

  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);

  return session;
}

/**
 * Valida una sesión a partir del Request (lee cookie)
 * Retorna la sesión si es válida, null si no existe o expiró
 */
export function validateSession(request: Request): Session | null {
  const token = getSessionFromCookie(request);
  if (!token) return null;

  const sessions = readSessions();
  const session = sessions.find((s) => s.id === token);
  if (!session) return null;

  // Verificar expiración
  if (new Date(session.expiresAt) < new Date()) {
    // Sesión expirada → eliminarla
    destroySession(session.id);
    return null;
  }

  return session;
}

/**
 * Destruye una sesión (la elimina de sessions.json)
 */
export function destroySession(sessionId: string): void {
  const sessions = readSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  writeSessions(filtered);
}

/**
 * Extrae el token de sesión de la cookie del Request
 */
export function getSessionFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  return sessionCookie.split('=')[1] || null;
}

/**
 * Establece la cookie de sesión en una respuesta NextResponse
 * Flags de seguridad: HttpOnly, Secure (en prod), SameSite=Strict, Path=/
 */
export function setSessionCookie(responseInit: { headers: Headers }, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = SESSION_DURATION_MS / 1000; // En segundos

  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${maxAge}`,
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  responseInit.headers.set('Set-Cookie', cookieParts.join('; '));
}

/**
 * Elimina la cookie de sesión (la invalida)
 */
export function clearSessionCookie(responseInit: { headers: Headers }): void {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=0`,
  ];

  responseInit.headers.set('Set-Cookie', cookieParts.join('; '));
}

/**
 * Limpia todas las sesiones expiradas de sessions.json
 * Retorna la cantidad de sesiones eliminadas
 */
export function cleanExpiredSessions(): number {
  const sessions = readSessions();
  const now = new Date();
  const valid = sessions.filter((s) => new Date(s.expiresAt) > now);
  const removedCount = sessions.length - valid.length;

  if (removedCount > 0) {
    writeSessions(valid);
  }

  return removedCount;
}

export { SESSION_COOKIE_NAME };

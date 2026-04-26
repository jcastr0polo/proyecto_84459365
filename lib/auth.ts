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
import { SignJWT, jwtVerify } from 'jose';
import type { Session } from '@/lib/types';
import { nowColombiaISO } from '@/lib/dateUtils';

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const SESSION_COOKIE_NAME = 'session_token';

// Clave secreta para firmar JWT — usa variable de entorno o fallback
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production-84459365'
);

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
 * - Genera token JWT firmado con jose
 * - Contiene userId, sessionId, createdAt, expiresAt
 * - No requiere escritura en filesystem
 */
export async function createSession(userId: string): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const sessionId = uuidv4();

  const session: Session = {
    id: sessionId,
    userId,
    createdAt: nowColombiaISO(),
    expiresAt: expiresAt.toISOString(),
  };

  // El token JWT se genera al setear la cookie
  return session;
}

/**
 * Genera un token JWT firmado para una sesión
 */
export async function generateSessionToken(session: Session): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    sessionId: session.id,
    createdAt: session.createdAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Valida una sesión a partir del Request (lee cookie con JWT)
 * Retorna la sesión si es válida, null si no existe o expiró
 */
export async function validateSession(request: Request): Promise<Session | null> {
  const token = getSessionFromCookie(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const session: Session = {
      id: (payload.sessionId as string) || '',
      userId: (payload.userId as string) || '',
      createdAt: (payload.createdAt as string) || '',
      expiresAt: payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : '',
    };

    return session;
  } catch {
    // Token inválido o expirado
    return null;
  }
}

/**
 * Destruye una sesión — con JWT, simplemente se limpia la cookie del cliente
 * No requiere escritura en filesystem
 */
export function destroySession(_sessionId: string): void {
  // Con JWT, la invalidación se hace limpiando la cookie
  // No hay estado server-side que eliminar
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
 * Limpia sesiones expiradas — no-op con JWT (se auto-invalidan por expiración)
 */
export function cleanExpiredSessions(): number {
  return 0;
}

export { SESSION_COOKIE_NAME };

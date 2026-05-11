/**
 * POST /api/auth/login
 * Inicia sesión con email y contraseña
 * 
 * Fase 6 — Autenticación y Sesiones
 * 
 * Reglas de negocio (del plan):
 * - RN-AUTH-04: Login por email
 * - RN-AUTH-05: Sesión con expiración de 24h, cookie HttpOnly
 * - RN-AUTH-07: Cuentas desactivadas no pueden iniciar sesión
 * - CU-01: Flujo de inicio de sesión completo
 */

import { NextResponse } from 'next/server';
import { loginRequestSchema } from '@/lib/schemas';
import { getUserByEmail, readUsersFresh, writeUsers, nowColombiaISO } from '@/lib/dataService';
import { verifyPassword, createSession, setSessionCookie, cleanExpiredSessions, generateSessionToken } from '@/lib/auth';
import { toSafeUser } from '@/lib/withAuth';
import { withFileLock } from '@/lib/dataService';
import { logAudit, extractRequestMeta } from '@/lib/auditService';
import { supabaseUpdateUser } from '@/lib/supabase';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Parsear y validar body
    const body = await request.json();
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de inicio de sesión inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 2. Buscar usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
      console.warn(`[auth] LOGIN FAILED — email not found: ${email}`);
      // No especificar si el email no existe (seguridad)
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // 3. Verificar cuenta activa (RN-AUTH-07)
    if (!user.isActive) {
      console.warn(`[auth] LOGIN BLOCKED — account inactive: ${email} (${user.id})`);
      return NextResponse.json(
        { error: 'Cuenta desactivada. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // 4. Verificar contraseña
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      console.warn(`[auth] LOGIN FAILED — wrong password: ${email} (${user.id})`);
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    console.log(`[auth] LOGIN OK — ${email} (${user.id}, ${user.role})`);

    // 5. Limpiar sesiones expiradas (no-op con JWT)
    cleanExpiredSessions();

    // 6. Crear nueva sesión
    const session = await createSession(user.id);
    const token = await generateSessionToken(session);

    // 7. Actualizar lastLoginAt
    try {
      await withFileLock('users.json', async () => {
        const users = await readUsersFresh();
        const userIndex = users.findIndex((u) => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].lastLoginAt = nowColombiaISO();
          users[userIndex].updatedAt = nowColombiaISO();
          await writeUsers(users);
        }
      });
    } catch (err) {
      console.error('[login] Failed to update lastLoginAt:', err);
    }

    // 7b. Auditoría
    logAudit({
      action: 'login',
      entity: 'user',
      entityId: user.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      details: `Login exitoso (${user.role})`,
      ...extractRequestMeta(request),
    });

    // 8. Preparar respuesta con cookie
    const response = NextResponse.json({
      user: toSafeUser(user),
      mustChangePassword: user.mustChangePassword,
    });

    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

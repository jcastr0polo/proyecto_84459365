/**
 * lib/withAuth.ts
 * Middleware helper para protección de Route Handlers — Fase 6
 * 
 * Patrón wrapper: verifica sesión, usuario activo y rol antes de ejecutar el handler.
 * Según el plan sección 15.4
 */

import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getUserById } from '@/lib/dataService';
import type { User, SafeUser } from '@/lib/types';

/**
 * Extrae SafeUser de un User (elimina passwordHash)
 */
export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Wrapper de autenticación para Route Handlers protegidos
 * 
 * @param request - Request del Route Handler
 * @param handler - Función que se ejecuta si la autenticación es válida
 * @param requiredRole - Rol requerido (opcional). Si se pasa, valida que el usuario tenga ese rol.
 * 
 * Respuestas de error:
 * - 401: No hay sesión válida o usuario no encontrado
 * - 403: Cuenta desactivada o rol insuficiente
 */
export async function withAuth(
  request: Request,
  handler: (user: User) => Promise<NextResponse>,
  requiredRole?: 'admin' | 'student'
): Promise<NextResponse> {
  try {
    // 1. Validar sesión
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Buscar usuario
    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 3. Verificar cuenta activa
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Cuenta desactivada. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // 4. Verificar rol (si se requiere uno específico)
    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json(
        { error: 'Sin permisos suficientes' },
        { status: 403 }
      );
    }

    // 5. Ejecutar handler con el usuario autenticado
    return await handler(user);
  } catch (error) {
    console.error('Error en withAuth:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

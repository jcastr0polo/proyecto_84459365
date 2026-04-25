/**
 * POST /api/auth/logout
 * Cierra la sesión activa
 * 
 * Fase 6 — Autenticación y Sesiones
 */

import { NextResponse } from 'next/server';
import { validateSession, destroySession, clearSessionCookie } from '@/lib/auth';
import { logAudit } from '@/lib/auditService';
import { getUserById } from '@/lib/dataService';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Validar sesión actual
    const session = await validateSession(request);

    if (session) {
      // 2. Destruir sesión en sessions.json
      destroySession(session.id);

      // 3. Auditoría
      const user = await getUserById(session.userId);
      await logAudit({
        action: 'logout',
        entity: 'user',
        entityId: session.userId,
        userId: session.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : session.userId,
        details: 'Cerró sesión',
      });
    }

    // 4. Limpiar cookie (siempre, incluso si la sesión ya no existía)
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

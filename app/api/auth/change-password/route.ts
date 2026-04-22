/**
 * POST /api/auth/change-password
 * Cambia la contraseña del usuario autenticado
 * 
 * Fase 6 — Autenticación y Sesiones
 * 
 * Reglas de negocio:
 * - RN-AUTH-03: Cambio obligatorio al primer login (mustChangePassword)
 * - CU-12: Flujo de cambio de contraseña
 * - Contraseña mínima: 8 caracteres
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { changePasswordRequestSchema } from '@/lib/schemas';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { readUsers, readUsersFresh, writeUsers } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import type { User } from '@/lib/types';

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user: User) => {
    try {
      // 1. Parsear y validar body
      const body = await request.json();
      const parsed = changePasswordRequestSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { currentPassword, newPassword } = parsed.data;

      // 2. Verificar contraseña actual
      const currentValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!currentValid) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 401 }
        );
      }

      // 3. Verificar que la nueva contraseña sea diferente
      const sameAsOld = await verifyPassword(newPassword, user.passwordHash);
      if (sameAsOld) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe ser diferente a la actual' },
          { status: 400 }
        );
      }

      // 4. Hashear nueva contraseña
      const newHash = await hashPassword(newPassword);

      // 5. Actualizar en users.json
      const users = await readUsersFresh();
      const userIndex = users.findIndex((u) => u.id === user.id);

      if (userIndex === -1) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      users[userIndex].passwordHash = newHash;
      users[userIndex].mustChangePassword = false;
      users[userIndex].updatedAt = new Date().toISOString();
      await dispatchWrite(
        () => writeUsers(users),
        { action: 'password', entity: 'user', entityId: user.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: 'Cambió su contraseña' }
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error en change-password:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/auth/me
 * Retorna los datos del usuario autenticado (sin passwordHash)
 * 
 * Fase 6 — Autenticación y Sesiones
 */

import { NextResponse } from 'next/server';
import { withAuth, toSafeUser } from '@/lib/withAuth';
import type { User } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user: User) => {
    return NextResponse.json({
      user: toSafeUser(user),
    });
  });
}

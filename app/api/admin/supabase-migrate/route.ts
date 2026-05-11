/**
 * POST /api/admin/supabase-migrate — Migrar datos de Blob/JSON a Supabase
 *
 * Body: { table: 'users' }
 * - Crea la tabla en Supabase si no existe (via SQL)
 * - Lee los datos actuales del JSON/Blob
 * - Hace upsert a Supabase
 * - Retorna resumen de la operación
 *
 * GET /api/admin/supabase-migrate — Estado de conexión y tablas
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { requireSupabaseClient, executeSql } from '@/lib/supabase';
import { readUsersFresh } from '@/lib/dataService';

// ── SQL para crear tablas ──

const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_document ON users(document_number);
`;

// ── GET: Estado de conexión ──

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
      const supabase = requireSupabaseClient();

      // Try a basic query to check connection and table existence
      const { error: connError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      const tableExists = !connError || !connError.message.includes('does not exist');
      let rowCount = 0;

      if (tableExists && !connError) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        rowCount = count ?? 0;
      }

      return NextResponse.json({
        connected: true,
        tables: {
          users: {
            exists: tableExists,
            rowCount,
          },
        },
      });
    } catch (err) {
      return NextResponse.json({
        connected: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  });
}

// ── POST: Ejecutar migración ──

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { table, action } = body as { table: string; action?: 'create' | 'migrate' | 'both' };
    const effectiveAction = action ?? 'both';

    if (table !== 'users') {
      return NextResponse.json(
        { error: `Tabla '${table}' no soportada. Disponibles: users` },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseClient();
    const results: { step: string; status: string; detail?: string }[] = [];

    try {
      // Step 1: Create table if needed
      if (effectiveAction === 'create' || effectiveAction === 'both') {
        try {
          await executeSql(CREATE_USERS_TABLE);
          results.push({ step: 'create_table', status: 'ok', detail: 'Tabla users creada (o ya existía)' });
        } catch (sqlErr) {
          results.push({
            step: 'create_table',
            status: 'error',
            detail: sqlErr instanceof Error ? sqlErr.message : 'Error creando tabla',
          });
        }
      }

      // Step 2: Migrate data
      if (effectiveAction === 'migrate' || effectiveAction === 'both') {
        const users = await readUsersFresh();

        if (users.length === 0) {
          results.push({
            step: 'migrate_data',
            status: 'skipped',
            detail: 'No hay usuarios en los datos actuales',
          });
        } else {
          // Transform to snake_case for Supabase
          const rows = users.map((u) => ({
            id: u.id,
            email: u.email,
            password_hash: u.passwordHash,
            role: u.role,
            must_change_password: u.mustChangePassword,
            first_name: u.firstName,
            last_name: u.lastName,
            document_number: u.documentNumber,
            phone: u.phone ?? null,
            is_active: u.isActive,
            created_at: u.createdAt,
            updated_at: u.updatedAt,
            last_login_at: u.lastLoginAt ?? null,
          }));

          const { error: upsertError } = await supabase
            .from('users')
            .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

          if (upsertError) {
            results.push({
              step: 'migrate_data',
              status: 'error',
              detail: upsertError.message,
            });
          } else {
            results.push({
              step: 'migrate_data',
              status: 'ok',
              detail: `${rows.length} usuarios procesados`,
            });
          }
        }
      }

      return NextResponse.json({ table, action: effectiveAction, results });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Error en migración' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET  /api/admin/migrations — Qué cambios de esquema hay y cuáles faltan
 * POST /api/admin/migrations — Aplicar uno, por ID
 *
 * El cliente NO envía sentencias. Envía el ID de una migración declarada en
 * lib/migrations.ts; el texto que se ejecuta sale del repositorio. Un campo
 * libre para escribir contra la base desde el navegador sería un agujero, y
 * no es lo que hay aquí.
 *
 * Todo queda en auditoría: quién, cuándo y qué se aplicó.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { MIGRATIONS, findMigration } from '@/lib/migrations';
import { supabaseColumnExists, supabaseRunStatements } from '@/lib/supabase';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';

/**
 * ¿Está aplicada? Se comprueba por PostgREST, no por conexión directa: desde
 * Vercel el pool de Postgres no responde y la pantalla se quedaba colgada
 * quince segundos antes de caerse.
 */
async function estadoDe(id: string) {
  const m = findMigration(id)!;
  try {
    const checks = await Promise.all(
      m.requires.map((r) => supabaseColumnExists(r.table, r.column)),
    );
    return { applied: checks.every(Boolean), error: null as string | null };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'No se pudo comprobar' };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const migrations = await Promise.all(MIGRATIONS.map(async (m) => ({
      id: m.id,
      title: m.title,
      why: m.why,
      // Se enseña el SQL exacto: aplicar algo a ciegas sobre notas reales, no.
      statements: m.statements,
      ...(await estadoDe(m.id)),
    })));

    return NextResponse.json({
      migrations,
      pending: migrations.filter((m) => !m.applied).length,
    });
  }, 'admin');
}

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const id: unknown = body?.id;

      if (typeof id !== 'string' || !id) {
        return NextResponse.json({ error: 'Falta el identificador de la migración' }, { status: 400 });
      }

      const migration = findMigration(id);
      if (!migration) {
        return NextResponse.json({ error: 'Esa migración no existe' }, { status: 404 });
      }

      // Aplicarla dos veces no rompe nada —son idempotentes— pero no tiene
      // sentido, y decirlo es mejor que fingir que se hizo algo.
      const { applied } = await estadoDe(id);
      if (applied) {
        return NextResponse.json({ applied: true, message: 'Ya estaba aplicada. No se cambió nada.' });
      }

      await dispatchWrite(
        () => supabaseRunStatements(migration.statements),
        {
          action: 'update',
          entity: 'schema',
          entityId: migration.id,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          details: `Aplicó la migración "${migration.title}" (${migration.statements.length} sentencias)`,
          after: auditSnapshot({ id: migration.id, statements: migration.statements }),
          ...extractRequestMeta(request),
        },
      );

      // Se vuelve a comprobar contra el esquema: que no falle no garantiza
      // que quedara como debía.
      const despues = await estadoDe(id);
      if (!despues.applied) {
        return NextResponse.json({
          error: 'Las sentencias se ejecutaron pero la comprobación sigue fallando. Revisa la base.',
        }, { status: 500 });
      }

      return NextResponse.json({ applied: true, message: `"${migration.title}" aplicada.` });
    } catch (e) {
      /*
       * Aplicar el cambio SÍ necesita conexión directa: PostgREST no ejecuta
       * DDL. Si desde aquí no se llega a Postgres, se dice con todas las
       * letras y se ofrece la salida por terminal, en vez de dejar un error
       * genérico que no lleva a ninguna parte.
       */
      const msg = e instanceof Error ? e.message : 'No se pudo aplicar la migración';
      const sinConexion = /timeout|ECONNREFUSED|ENOTFOUND|not configured|terminated/i.test(msg);
      return NextResponse.json({
        error: sinConexion
          ? 'No se pudo abrir una conexión directa a Postgres desde el servidor, que es lo único que puede aplicar cambios de esquema.'
          : msg,
        ...(sinConexion ? {
          fallback: 'node --env-file=.env.local .scripts/migrar-cortes-fechas.mjs',
          detail: msg,
        } : {}),
      }, { status: 500 });
    }
  }, 'admin');
}

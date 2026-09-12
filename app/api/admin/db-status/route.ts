/**
 * GET /api/admin/db-status — Estado de la base de datos (admin)
 *
 * Sustituye al chequeo de /api/admin/supabase-migrate, que solo miraba la
 * tabla `users` de las dieciséis que usa el sistema: decía "conectado" con
 * quince tablas sin comprobar.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { supabaseTableStats } from '@/lib/supabase';

/** Las tablas que la aplicación lee de verdad, agrupadas como se explican. */
const TABLES: { name: string; label: string; group: string }[] = [
  { name: 'users',              label: 'Usuarios',              group: 'Personas' },
  { name: 'sessions',           label: 'Sesiones',              group: 'Personas' },
  { name: 'enrollments',        label: 'Inscripciones',         group: 'Personas' },
  { name: 'semesters',          label: 'Semestres',             group: 'Estructura' },
  { name: 'courses',            label: 'Cursos',                group: 'Estructura' },
  { name: 'cortes',             label: 'Cortes',                group: 'Estructura' },
  { name: 'activities',         label: 'Actividades',           group: 'Trabajo' },
  { name: 'submissions',        label: 'Entregas',              group: 'Trabajo' },
  { name: 'projects',           label: 'Proyectos',             group: 'Trabajo' },
  { name: 'prompts',            label: 'Prompts',               group: 'Trabajo' },
  { name: 'grades',             label: 'Notas de actividad',    group: 'Notas' },
  { name: 'manual_grade_items', label: 'Ítems de nota manual',  group: 'Notas' },
  { name: 'manual_grades',      label: 'Notas manuales',        group: 'Notas' },
  { name: 'quizzes',            label: 'Parciales',             group: 'Parciales' },
  { name: 'quiz_attempts',      label: 'Intentos',              group: 'Parciales' },
  { name: 'quiz_simulations',   label: 'Simulaciones',          group: 'Parciales' },
];

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const started = Date.now();

    try {
      const { present, counts } = await supabaseTableStats(TABLES.map((t) => t.name));
      const presentSet = new Set(present);

      const tables = TABLES.map((t) => ({
        ...t,
        exists: presentSet.has(t.name),
        rowCount: counts[t.name] ?? 0,
      }));

      return NextResponse.json({
        connected: true,
        latencyMs: Date.now() - started,
        tables,
        missing: tables.filter((t) => !t.exists).map((t) => t.name),
        /* Tablas que existen en la base pero que la aplicación no lee. No es
           un error: puede ser algo en desuso o de otra herramienta. */
        extras: present.filter((n) => !TABLES.some((t) => t.name === n) && !n.startsWith('_')),
      });
    } catch (e) {
      return NextResponse.json({
        connected: false,
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : 'No se pudo conectar',
        tables: TABLES.map((t) => ({ ...t, exists: false, rowCount: 0 })),
        missing: TABLES.map((t) => t.name),
        extras: [],
      });
    }
  }, 'admin');
}

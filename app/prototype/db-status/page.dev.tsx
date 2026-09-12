'use client';

import React, { useState } from 'react';
import DatabaseStatusView, { type DbStatus, type MigrationStatus } from '@/components/admin/DatabaseStatusView';
import Chip from '@/components/ui/Chip';

/** Taller — estado de la base de datos, con sus casos raros. */
export default function PrototypeDbStatus() {
  const [caso, setCaso] = useState<'ok' | 'falta' | 'caida'>('ok');

  const migs: MigrationStatus[] = [
    {
      id: '2026-09-cortes-fechas', title: 'Fechas del corte',
      why: 'Añade inicio, cierre y tope de reporte de notas a los cortes. Las tres nacen vacías: ningún corte existente cambia hasta que le pongas fechas.',
      statements: [
        'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS start_date DATE',
        'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS end_date DATE',
        'ALTER TABLE cortes ADD COLUMN IF NOT EXISTS report_deadline DATE',
      ],
      applied: caso === 'ok', error: null,
    },
  ];

  const base = [
    ['users', 'Usuarios', 'Personas', 41],
    ['sessions', 'Sesiones', 'Personas', 12],
    ['enrollments', 'Inscripciones', 'Personas', 96],
    ['semesters', 'Semestres', 'Estructura', 3],
    ['courses', 'Cursos', 'Estructura', 7],
    ['cortes', 'Cortes', 'Estructura', 21],
    ['activities', 'Actividades', 'Trabajo', 58],
    ['submissions', 'Entregas', 'Trabajo', 412],
    ['projects', 'Proyectos', 'Trabajo', 19],
    ['prompts', 'Prompts', 'Trabajo', 0],
    ['grades', 'Notas de actividad', 'Notas', 388],
    ['manual_grade_items', 'Ítems de nota manual', 'Notas', 6],
    ['manual_grades', 'Notas manuales', 'Notas', 74],
    ['quizzes', 'Parciales', 'Parciales', 9],
    ['quiz_attempts', 'Intentos', 'Parciales', 133],
    ['quiz_simulations', 'Simulaciones', 'Parciales', 0],
  ] as const;

  const tables = base.map(([name, label, group, rowCount]) => ({
    name, label, group,
    exists: !(caso === 'falta' && name === 'quiz_simulations'),
    rowCount: caso === 'caida' ? 0 : rowCount,
  }));

  const status: DbStatus = caso === 'caida'
    ? { connected: false, latencyMs: 5021, error: 'Postgres URL not configured (SUPABASE_NEXUS_POSTGRES_URL)',
        tables: tables.map((t) => ({ ...t, exists: false, rowCount: 0 })),
        missing: tables.map((t) => t.name), extras: [] }
    : { connected: true, latencyMs: 148, tables,
        missing: caso === 'falta' ? ['quiz_simulations'] : [],
        extras: caso === 'falta' ? ['migraciones_2024', 'tmp_import'] : [] };

  return (
    <div className="px-4 py-8 space-y-4">
      <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap">
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
        <Chip active={caso === 'ok'} onClick={() => setCaso('ok')}>Todo bien</Chip>
        <Chip active={caso === 'falta'} onClick={() => setCaso('falta')}>Falta una tabla</Chip>
        <Chip active={caso === 'caida'} onClick={() => setCaso('caida')}>Sin conexión</Chip>
      </div>
      <DatabaseStatusView status={status} onRefresh={() => {}} onApply={() => {}} migrations={migs} />
    </div>
  );
}

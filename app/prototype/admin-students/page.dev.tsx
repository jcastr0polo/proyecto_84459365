'use client';

import React, { useMemo, useState } from 'react';
import Chip from '@/components/ui/Chip';
import SearchInput from '@/components/ui/SearchInput';

/** Taller — cabecera y filtros del listado de estudiantes. Datos falsos. */
export default function PrototypeAdminStudents() {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'never'>('all');
  const [search, setSearch] = useState('');
  const counts = useMemo(() => ({ all: 28, active: 25, inactive: 3, never: 5 }), []);

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto space-y-6">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño · datos falsos
      </span>
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Estudiantes
        </h1>
        <p className="text-sm text-subtle mt-1">{counts.all} registrados en el sistema</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todos ({counts.all})</Chip>
          <Chip active={filter === 'active'} tone="positive" dot="bg-emerald-500" onClick={() => setFilter('active')}>
            Activos ({counts.active})
          </Chip>
          <Chip active={filter === 'inactive'} tone="danger" dot="bg-red-500" onClick={() => setFilter('inactive')}>
            Inactivos ({counts.inactive})
          </Chip>
          <Chip active={filter === 'never'} tone="warning" dot="bg-amber-500" onClick={() => setFilter('never')}>
            Nunca han entrado ({counts.never})
          </Chip>
        </div>
        <SearchInput value={search} onChange={setSearch}
          placeholder="Buscar por nombre, email o documento..." className="w-full sm:w-72 sm:ml-auto" />
      </div>
      <p className="text-meta text-faint">filtro activo: {filter}</p>

      <div className="pt-6 space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Auditoría · contadores que filtran</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={false} onClick={() => {}}>Todo (1.284)</Chip>
          <Chip active dot="bg-cyan-500" onClick={() => {}}>Hoy (37)</Chip>
          <Chip active={false} tone="neutral" onClick={() => {}}>Inicios de sesión (412)</Chip>
          <Chip active={false} tone="warning" onClick={() => {}}>Escrituras (598)</Chip>
        </div>
      </div>

      <div className="pt-6 space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Ficha · parciales y notas manuales</p>
        <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
          {[
            ['Parcial 2: estructuras de control', 'Parcial', 20, '3.9', '78/100', true],
            ['Exposición: caso de estudio', 'Nota manual', 10, '4.5', '4.5/5', false],
          ].map(([t, k, w, n, raw, pub]) => (
            <div key={t as string} className="flex items-center gap-3 p-3 bg-surface">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground/90 leading-snug">{t as string}</p>
                <p className="text-micro text-subtle mt-0.5">
                  {k as string} · {w as number}%
                  {!(pub as boolean) && <span className="text-subtle"> · sin publicar</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{n as string}</p>
                <p className="text-micro text-faint">{raw as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

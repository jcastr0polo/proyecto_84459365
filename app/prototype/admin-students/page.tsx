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
    </div>
  );
}

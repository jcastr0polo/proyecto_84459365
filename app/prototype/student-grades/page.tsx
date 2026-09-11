'use client';

import React, { useState } from 'react';
import StudentGradesView from '@/components/grades/StudentGradesView';
import StudentGradesViewV2 from '@/components/grades/StudentGradesViewV2';
import { MOCK_GRADES, MOCK_EMPTY } from './mockData';

/**
 * Taller de diseño — comparador de la vista de notas del estudiante.
 *
 * Solo desarrollo: la ruta se bloquea en producción (ver layout.tsx).
 * Usa datos inventados; no lee ni escribe en la base de datos.
 */
export default function PrototypePage() {
  const [version, setVersion] = useState<'actual' | 'v2'>('v2');
  const [dataset, setDataset] = useState<'mitad' | 'vacio'>('mitad');

  const data = dataset === 'mitad' ? MOCK_GRADES : MOCK_EMPTY;

  return (
    <div className="min-h-screen">
      {/* Barra del taller */}
      <div className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Taller de diseño · datos falsos
          </span>

          <div className="flex items-center gap-1 ml-auto">
            {(['actual', 'v2'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                  ${version === v
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'text-subtle hover:text-foreground border border-transparent'}`}
              >
                {v === 'actual' ? 'Actual' : 'Rediseño'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {(['mitad', 'vacio'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDataset(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                  ${dataset === d
                    ? 'bg-foreground/10 text-foreground border border-foreground/15'
                    : 'text-subtle hover:text-foreground border border-transparent'}`}
              >
                {d === 'mitad' ? 'Mitad de semestre' : 'Sin notas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
            Mis Notas
          </h1>
          <p className="text-sm text-muted mt-1">{data.courseName}</p>
        </div>

        {version === 'actual'
          ? <StudentGradesView data={data} />
          : <StudentGradesViewV2 data={data} />}
      </div>
    </div>
  );
}

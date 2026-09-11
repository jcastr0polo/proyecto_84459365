'use client';

import React, { useState } from 'react';
import StudentDashboardView from '@/components/student/StudentDashboardView';
import StudentDashboardViewV2 from '@/components/student/StudentDashboardViewV2';
import { MOCK_USER, MOCK_SEMESTER, MOCK_COURSES, MOCK_COURSES_EMPTY } from './mockData';

/** Taller de diseño — panel del estudiante. Datos falsos, solo desarrollo. */
export default function PrototypeDashboardPage() {
  const [version, setVersion] = useState<'actual' | 'v2'>('v2');
  const [dataset, setDataset] = useState<'activo' | 'nuevo'>('activo');
  const courses = dataset === 'activo' ? MOCK_COURSES : MOCK_COURSES_EMPTY;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 border-b border-surface-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
            Taller de diseño · datos falsos
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(['actual', 'v2'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]
                  ${version === v
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'text-subtle hover:text-foreground border border-transparent'}`}
              >
                {v === 'actual' ? 'Actual' : 'Rediseño'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(['activo', 'nuevo'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDataset(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]
                  ${dataset === d
                    ? 'bg-foreground/10 text-foreground border border-foreground/15'
                    : 'text-subtle hover:text-foreground border border-transparent'}`}
              >
                {d === 'activo' ? 'Mitad de semestre' : 'Recién inscrito'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-8">
        {version === 'actual' ? (
          <StudentDashboardView
            user={MOCK_USER}
            semester={MOCK_SEMESTER}
            coursesData={courses}
            activeQuizzes={[]}
          />
        ) : (
          <StudentDashboardViewV2
            user={MOCK_USER}
            semester={MOCK_SEMESTER}
            coursesData={courses}
          />
        )}
      </div>
    </div>
  );
}

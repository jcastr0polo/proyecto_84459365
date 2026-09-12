'use client';

import React, { useState } from 'react';
import GradeTable, { type GradeRow } from '@/components/grades/GradeTable';

/** Taller — la misma tabla con y sin columnas de entrega. Datos falsos. */
export default function PrototypeGradeTable() {
  const base: Omit<GradeRow, 'submissionId' | 'studentId' | 'studentName' | 'studentEmail'> = {
    attachmentsCount: 2, linksCount: 1, isLate: false,
    submittedAt: '2026-09-04T10:00:00-05:00', version: 1, score: null, feedback: '',
  };
  const names = [['González Pérez', 'Gabriela'], ['Restrepo Ochoa', 'Valentina'], ['Zapata Ríos', 'Andrés']];
  const rows: GradeRow[] = names.map(([ln, fn], i) => ({
    ...base,
    submissionId: `s${i}`, studentId: `st${i}`,
    studentName: `${ln}, ${fn}`, studentEmail: `${fn.toLowerCase()}@ejemplo.edu.co`,
    score: i === 0 ? null : i === 1 ? 3.5 : 2.4,
    isLate: i === 2,
  }));
  const [saving] = useState(false);
  const noop = async () => {};

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto space-y-10">
      <div>
        <p className="text-meta uppercase tracking-wider text-faint mb-2">Actividad (con entrega)</p>
        <GradeTable rows={rows} activityId="a" courseId="c" maxScore={5}
          onSave={noop} onSaveAll={noop} saving={saving} />
      </div>
      <div>
        <p className="text-meta uppercase tracking-wider text-faint mb-2">Nota manual (sin entrega)</p>
        <GradeTable rows={rows} activityId="a" courseId="c" maxScore={5}
          onSave={noop} onSaveAll={noop} saving={saving} showSubmissionColumns={false} />
      </div>
    </div>
  );
}

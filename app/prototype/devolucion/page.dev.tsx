'use client';

import React, { useState } from 'react';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import type { Submission, SubmissionAttachment } from '@/lib/types';

/** Taller — devolver el trabajo enriquecido. Datos falsos. */
const base: Submission = {
  id: 'sub-1', activityId: 'act-1', studentId: 'stu-1', courseId: 'cur-1',
  content: 'Adjunto el plan de software del proyecto. Quedé con dudas en el cronograma.',
  attachments: [
    { id: 'a1', fileName: 'plan-de-software.docx', filePath: 'uploads/x/plan.docx',
      fileSize: 284_000, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: '2026-09-15T10:00:00Z' },
    { id: 'a2', fileName: 'cronograma.md', filePath: 'uploads/x/crono.md',
      fileSize: 3_100, mimeType: 'text/markdown', uploadedAt: '2026-09-15T10:00:00Z' },
  ],
  links: [],
  submittedAt: '2026-09-15T10:00:00Z', isLate: false,
  status: 'submitted', version: 1,
  createdAt: '2026-09-15T10:00:00Z', updatedAt: '2026-09-15T10:00:00Z',
};

const corregido: SubmissionAttachment = {
  id: 'd1', fileName: 'plan-de-software-REVISADO.docx', filePath: 'uploads/x/rev.docx',
  fileSize: 301_400, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  uploadedAt: '2026-09-18T16:20:00Z',
};

export default function PrototipoDevolucion() {
  const [devueltos, setDevueltos] = useState<SubmissionAttachment[]>([]);
  const [ocupado, setOcupado] = useState(false);

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto space-y-10">
      <div>
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
        <h1 className="text-xl font-bold text-foreground">Devolver el trabajo enriquecido</h1>
      </div>

      <section className="space-y-3">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">
          Docente · sin devolución todavía
        </p>
        <SubmissionDetail
          submission={{ ...base, feedbackAttachments: devueltos }}
          isAdmin
          documentsBusy={ocupado}
          onReturnDocuments={() => {
            setOcupado(true);
            setTimeout(() => { setDevueltos((d) => [...d, { ...corregido, id: `d${d.length + 1}` }]); setOcupado(false); }, 700);
          }}
          onRemoveDocument={(id) => setDevueltos((d) => d.filter((a) => a.id !== id))}
        />
      </section>

      <section className="space-y-3">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">
          Estudiante · lo que recibe
        </p>
        <SubmissionDetail submission={{ ...base, feedbackAttachments: [corregido] }} />
      </section>
    </div>
  );
}

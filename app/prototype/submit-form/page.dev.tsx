'use client';

import React, { useState } from 'react';
import SubmitForm from '@/components/submissions/SubmitForm';
import { MOCK_COURSES } from '../student-dashboard/mockData';
import type { SubmissionLink } from '@/lib/types';

/** Taller de diseño — formulario de entrega. Datos falsos, no envía nada. */
export default function PrototypeSubmitForm() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  /* Se fuerza la carga de archivos: sin esto la sección ni se dibuja y el
     taller no sirve para revisarla. Se deja individual a propósito —el
     selector de grupo pide la API, y aquí no hay sesión: la respuesta 401
     manda la página al login y no se ve nada—. */
  const activity = {
    ...MOCK_COURSES[0].activities[3],
    requiresLinkSubmission: true,
    requiresFileUpload: true,
  };

  // Simula una subida para poder mirar el estado de progreso.
  async function fakeSubmit(_d: { files: File[]; links: SubmissionLink[]; content?: string }) {
    setLoading(true);
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise((r) => setTimeout(r, 120));
    }
    setLoading(false);
    setProgress(undefined);
  }

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
          Taller de diseño · datos falsos
        </span>
        <h1 className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: 'var(--font-playfair)' }}>
          Enviar entrega
        </h1>
      </div>
      <SubmitForm activity={activity} onSubmit={fakeSubmit} loading={loading} progress={progress} />
    </div>
  );
}

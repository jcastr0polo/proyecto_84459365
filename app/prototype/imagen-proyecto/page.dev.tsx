'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import ProjectShowcaseImage from '@/components/projects/ProjectShowcaseImage';

/** Taller — la portada del proyecto. Datos falsos, nada se sube. */
const CAPTURA =
  'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="420">
    <rect width="800" height="420" fill="#1e293b"/>
    <rect x="0" y="0" width="800" height="48" fill="#0f172a"/>
    <circle cx="24" cy="24" r="6" fill="#475569"/><circle cx="44" cy="24" r="6" fill="#475569"/>
    <rect x="60" y="120" width="300" height="24" rx="4" fill="#38bdf8"/>
    <rect x="60" y="164" width="420" height="14" rx="4" fill="#475569"/>
    <rect x="60" y="188" width="360" height="14" rx="4" fill="#475569"/>
    <rect x="60" y="240" width="140" height="40" rx="8" fill="#0891b2"/>
  </svg>`);

export default function PrototipoImagenProyecto() {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const subir = () => { setBusy(true); setTimeout(() => { setUrl(CAPTURA); setBusy(false); }, 700); };

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-8">
      <div>
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
        <h1 className="text-xl font-bold text-foreground">Imagen del proyecto</h1>
      </div>

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">
          Estudiante · proyecto en curso (puede subir)
        </p>
        <Card padding="lg">
          <ProjectShowcaseImage
            projectName="StockControl" imageUrl={url} editable busy={busy}
            onUpload={subir} onRemove={() => setUrl(undefined)}
          />
        </Card>
      </section>

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">
          Edición cerrada por el docente (solo mira)
        </p>
        <Card padding="lg">
          <ProjectShowcaseImage
            projectName="StockControl" imageUrl={CAPTURA} editable={false} busy={false}
            onUpload={() => {}} onRemove={() => {}}
          />
        </Card>
      </section>

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">
          Sin imagen y sin permiso de edición
        </p>
        <Card padding="lg">
          <ProjectShowcaseImage
            projectName="StockControl" editable={false} busy={false}
            onUpload={() => {}} onRemove={() => {}}
          />
        </Card>
      </section>
    </div>
  );
}

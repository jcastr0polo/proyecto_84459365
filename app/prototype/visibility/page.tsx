'use client';

import React, { useState } from 'react';
import VisibilityToggle from '@/components/projects/VisibilityToggle';

/** Taller de diseño — consentimiento de publicación. */
export default function PrototypeVisibility() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño
      </span>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Privado (por defecto)</p>
        <VisibilityToggle isPublic={a} onChange={setA} />
      </div>
      <div className="space-y-2">
        <p className="text-meta uppercase tracking-wider text-faint">Público</p>
        <VisibilityToggle isPublic={b} onChange={setB} />
      </div>
    </div>
  );
}

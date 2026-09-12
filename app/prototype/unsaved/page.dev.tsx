'use client';

import React, { useState } from 'react';
import { useUnsavedGuard } from '@/lib/useUnsavedGuard';

/** Taller — comprueba que el aviso de cambios sin guardar se arma y se desarma. */
export default function PrototypeUnsaved() {
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty);
  return (
    <div className="px-4 py-8 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-foreground">Aviso de cambios sin guardar</h1>
      <p data-testid="state" className="text-sm text-subtle">sucio: {String(dirty)}</p>
      <button onClick={() => setDirty((d) => !d)}
        className="px-4 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold cursor-pointer">
        Alternar
      </button>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import ApplyDatesModal from '@/components/admin/ApplyDatesModal';

/** Taller — comprueba que la vista previa se pide UNA vez, no en bucle. */
export default function PrototypeAplicarFechas() {
  const [n, setN] = useState(0);
  const original = useRef<typeof fetch | null>(null);

  useEffect(() => {
    original.current = window.fetch;
    window.fetch = (async (url: string, init?: RequestInit) => {
      if (String(url).includes('corte-dates')) {
        setN((x) => x + 1);
        await new Promise((r) => setTimeout(r, 120));
        return new Response(JSON.stringify({ courses: 2, cortes: 5, kept: 1, unmatched: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return original.current!(url, init);
    }) as typeof fetch;
    return () => { if (original.current) window.fetch = original.current; };
  }, []);

  return (
    <div className="px-4 py-8">
      <p data-testid="conteo" className="text-sm text-foreground">peticiones de vista previa: {n}</p>
      <ApplyDatesModal
        open
        onClose={() => {}}
        semesterId="202602"
        courseId="c1"
        /* A propósito un array NUEVO en cada render: es lo que hacía el padre
           y lo que disparaba el bucle. */
        cortes={[
          { order: 1, name: 'Corte 1', startDate: '2026-08-03', endDate: '2026-09-12', reportDeadline: '2026-09-18' },
          { order: 2, name: 'Corte 2', startDate: '2026-09-14', endDate: '2026-10-24', reportDeadline: '2026-10-30' },
        ]}
        onDone={() => {}}
      />
    </div>
  );
}

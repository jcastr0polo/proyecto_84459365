'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Download, ClipboardCopy } from 'lucide-react';

/** Taller — variantes, tamaños y estados de Button, y su área de pulsación. */
export default function PrototypeButtons() {
  const [loading, setLoading] = useState(false);
  const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
  const sizes = ['sm', 'md', 'lg'] as const;

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-8">
      <div>
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller</span>
        <h1 className="text-xl font-bold text-foreground">Button</h1>
      </div>

      {sizes.map((size) => (
        <section key={size} className="space-y-2">
          <p className="text-micro font-semibold uppercase tracking-wider text-subtle">tamaño {size}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {variants.map((v) => (
              <Button key={v} variant={v} size={size}>{v}</Button>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">con icono, cargando y deshabilitado</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }} loading={loading}>
            {!loading && <Download className="w-4 h-4" aria-hidden="true" />}
            {loading ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          <Button size="sm"><ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" /> Copiar prompt</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">ancho completo (formularios)</p>
        <Button size="lg" className="w-full">Cambiar contraseña</Button>
      </section>
    </div>
  );
}

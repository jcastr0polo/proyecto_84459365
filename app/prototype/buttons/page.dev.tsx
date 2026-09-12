'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Download, ClipboardCopy } from 'lucide-react';

/** Taller — variantes, tamaños y estados de Button, y su área de pulsación. */
export default function PrototypeButtons() {
  const [loading, setLoading] = useState(false);
  const variants = ['primary', 'secondary', 'warning', 'danger', 'danger-ghost', 'ghost'] as const;
  const sizes = ['xs', 'sm', 'md', 'lg'] as const;

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

      {/* El caso que obligaba a escribir botones a mano: una fila densa donde
          Button convive con Chip e IconButton y no puede medir 44px de alto. */}
      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">fila densa (xs, junto a chips)</p>
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-surface-border bg-surface p-3">
          <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-meta font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">Público</span>
          <Button variant="ghost" size="xs"><Download className="w-3.5 h-3.5" aria-hidden="true" /> Descargar</Button>
          <Button variant="primary" size="xs">Guardar</Button>
          <Button variant="danger-ghost" size="xs">Quitar</Button>
        </div>
      </section>

      {/* Pie de diálogo: el patrón que más se repetía a mano. */}
      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">pie de diálogo</p>
        {/* Apilado en estrecho y en fila desde sm, como en el diálogo real: en
            una sola fila a 390px las tres etiquetas se parten por la mitad. */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3
                        rounded-xl border border-surface-border bg-surface p-3">
          <Button variant="danger-ghost" size="sm" className="sm:justify-start whitespace-nowrap">
            Quitar ajuste
          </Button>
          <div className="flex items-center gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
            <Button variant="secondary" size="md" className="whitespace-nowrap">Cancelar</Button>
            <Button variant="primary" size="md" className="whitespace-nowrap">Guardar ajuste</Button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-subtle">ancho completo (formularios)</p>
        <Button size="lg" className="w-full">Cambiar contraseña</Button>
      </section>
    </div>
  );
}

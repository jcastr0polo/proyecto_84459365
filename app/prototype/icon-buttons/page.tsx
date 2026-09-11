'use client';

import React from 'react';
import { Pencil, Check, X, Eye, RotateCcw, ShieldOff } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

/** Taller — tonos y tamaños de IconButton, y su área de pulsación. */
export default function PrototypeIconButtons() {
  const rows = [
    ['neutral', <Pencil key="a" className="w-4 h-4" />],
    ['accent', <Eye key="b" className="w-4 h-4" />],
    ['positive', <Check key="c" className="w-4 h-4" />],
    ['warning', <RotateCcw key="d" className="w-4 h-4" />],
    ['danger', <ShieldOff key="e" className="w-4 h-4" />],
  ] as const;
  return (
    <div className="px-4 py-8 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">IconButton</h1>
      <div className="flex items-center gap-2">
        {rows.map(([tone, icon]) => (
          <IconButton key={tone} label={tone} tone={tone} icon={icon} />
        ))}
        <IconButton label="deshabilitado" icon={<X className="w-4 h-4" />} disabled />
      </div>
      <div className="flex items-center gap-2">
        <IconButton label="sm" size="sm" tone="accent" icon={<Pencil className="w-3.5 h-3.5" />} />
        <IconButton label="md" size="md" tone="accent" icon={<Pencil className="w-4 h-4" />} />
        <IconButton label="lg" size="lg" tone="accent" icon={<Pencil className="w-5 h-5" />} />
      </div>
    </div>
  );
}

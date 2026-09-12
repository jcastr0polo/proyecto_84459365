'use client';

import React from 'react';
import { Pencil, Check, X, Eye, RotateCcw, ShieldOff } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';

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
      <div>
        <p className="text-meta uppercase tracking-wider text-faint mb-2">Chip · estados de proyecto</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip active tone="positive" onClick={() => {}} icon={<Eye className="w-3.5 h-3.5" />}>Público</Chip>
          <Chip active={false} onClick={() => {}} icon={<X className="w-3.5 h-3.5" />}>Privado</Chip>
          <Chip active tone="danger" onClick={() => {}} icon={<ShieldOff className="w-3.5 h-3.5" />}>Bloqueado</Chip>
          <Chip active={false} onClick={() => {}} dot="bg-cyan-500">Por calificar (7)</Chip>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconButton label="sm" size="sm" tone="accent" icon={<Pencil className="w-3.5 h-3.5" />} />
        <IconButton label="md" size="md" tone="accent" icon={<Pencil className="w-4 h-4" />} />
        <IconButton label="lg" size="lg" tone="accent" icon={<Pencil className="w-5 h-5" />} />
      </div>
    </div>
  );
}

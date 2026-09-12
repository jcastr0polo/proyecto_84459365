'use client';

import React, { useState } from 'react';
import { Pencil, Eye, RotateCcw, ShieldOff, AlertCircle, Clock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';

/** Taller — reproduce la fila real del listado de estudiantes, sin retocar. */
export default function PrototypeStudentsRow() {
  const [n] = useState(0);
  const students = [
    { firstName: 'Gabriela', lastName: 'González Pérez', email: 'gabriela.gonzalez@cajamag.edu.co', documentNumber: '1082745993', isActive: true, mustChangePassword: true, lastLoginAt: '05 de sept de 2026' },
    { firstName: 'Juan Sebastián', lastName: 'Restrepo Ochoa', email: 'juansebastian.restrepo@cajamag.edu.co', documentNumber: '1002938471', isActive: false, mustChangePassword: false, lastLoginAt: null },
  ];
  return (
    <div className="px-4 py-8 max-w-5xl mx-auto space-y-2">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400 block mb-3">
        Taller · fila real, sin retocar
      </span>
      {students.map((student) => (
        <div key={student.email + n}
          className={`p-4 rounded-xl border ${student.isActive
            ? 'border-surface-border bg-surface'
            : 'border-red-500/20 bg-red-500/[0.04]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${student.isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {student.firstName} {student.lastName}
                  </p>
                  <span className="hidden sm:contents"><IconButton label="Editar nombre" tone="accent" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                  {!student.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
                  {student.mustChangePassword && <Badge variant="warning" size="sm">Debe cambiar pass</Badge>}
                </div>
                <p className="text-meta text-faint mt-0.5 flex items-start gap-1.5 break-all">
                  {student.email}
                  <span className="hidden sm:contents"><IconButton label="Editar email" tone="accent" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-subtle">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Doc: {student.documentNumber}
                    <span className="hidden sm:contents"><IconButton label="Editar documento" tone="accent" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {student.lastLoginAt ?? 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0
                            border-t border-surface-border pt-2 -mx-1 px-1
                            sm:border-0 sm:pt-0 sm:mx-0 sm:px-0">
              <IconButton label="Ver detalle" tone="accent" size="lg" icon={<Eye className="w-5 h-5" />} />
              <IconButton label="Restablecer contraseña" tone="warning" size="lg" icon={<RotateCcw className="w-5 h-5" />} />
              <IconButton label="Desactivar" tone="danger" size="lg" icon={<ShieldOff className="w-5 h-5" />} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

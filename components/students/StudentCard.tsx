'use client';

import React from 'react';
import Badge from '@/components/ui/Badge';
import type { EnrollmentWithStudent } from '@/lib/types';

interface StudentCardProps {
  enrollment: EnrollmentWithStudent;
  onWithdraw?: (enrollId: string) => void;
}

/**
 * StudentCard — Vista mobile-friendly de un estudiante inscrito
 * Se muestra en lugar de la tabla en pantallas pequeñas
 */
export default function StudentCard({ enrollment, onWithdraw }: StudentCardProps) {
  const { student } = enrollment;
  const isActive = enrollment.status === 'active';

  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground/90 truncate">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-xs text-subtle truncate">{student.email}</p>
          </div>
        </div>
        <Badge variant={isActive ? 'success' : 'danger'} size="sm" dot>
          {isActive ? 'Activo' : 'Retirado'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-subtle">Documento</span>
          <p className="text-muted font-mono">{student.documentNumber}</p>
        </div>
        <div>
          <span className="text-subtle">Inscrito</span>
          <p className="text-muted">{formatDate(enrollment.enrolledAt)}</p>
        </div>
      </div>

      {isActive && onWithdraw && (
        <button
          onClick={() => onWithdraw(enrollment.id)}
          className="w-full text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10
                     py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Retirar del curso
        </button>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

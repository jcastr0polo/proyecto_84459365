'use client';

import React from 'react';
import { Globe, Lock } from 'lucide-react';

/**
 * VisibilityToggle — consentimiento para publicar el proyecto en la vitrina.
 *
 * Publicar el trabajo de alguien hacia fuera, con su nombre, merece un texto
 * legible: antes la advertencia era el texto más pequeño de la pantalla
 * (10px) y el estado apagado no decía nada, así que no había forma de saber
 * qué pasaba si lo dejabas sin marcar.
 */
export default function VisibilityToggle({
  isPublic, onChange, disabled = false,
}: {
  isPublic: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const Icon = isPublic ? Globe : Lock;

  return (
    <div className={`rounded-xl border p-4 transition-colors duration-[var(--dur-fast)]
      ${isPublic ? 'border-cyan-500/30 bg-cyan-500/[0.05]' : 'border-surface-border bg-surface'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={isPublic}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 rounded-full bg-foreground/[0.12] peer-checked:bg-cyan-500/40
                          transition-colors duration-[var(--dur-fast)]
                          peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-foreground/50 shadow
                          peer-checked:translate-x-4 peer-checked:bg-cyan-400
                          transition-[transform,background-color] duration-[var(--dur-fast)]
                          ease-[var(--ease-standard)] motion-reduce:transition-none" />
        </div>

        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 shrink-0" />
            Compartir en la vitrina pública
          </span>
          {/* Los dos estados se explican. Antes solo se describía el encendido,
              y en apagado el texto seguía diciendo "será visible". */}
          <p className="text-xs text-subtle mt-1 leading-relaxed">
            {isPublic
              ? 'Cualquier persona en internet podrá ver tu proyecto, con tu nombre. El docente debe aprobarlo antes de que aparezca.'
              : 'Tu proyecto solo lo verán tú y tus docentes. Puedes cambiarlo cuando quieras.'}
          </p>
        </div>
      </label>
    </div>
  );
}

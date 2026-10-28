'use client';

import React, { useState, useRef, useCallback } from 'react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** Permite elegir y soltar varios de una vez. */
  multiple?: boolean;
}

/**
 * FileUploadZone — Zona de arrastrar y soltar reutilizable
 *
 * Soporta varios archivos cuando se le pide. Antes no: el input no llevaba
 * `multiple` y al soltar se quedaba con `files[0]`, así que arrastrar tres
 * subía uno y los otros dos desaparecían sin decir nada. Se avisaba de lo
 * contrario en la etiqueta («Arrastra tus archivos»), que es peor que no
 * decir nada.
 *
 * Se llama a `onFileSelect` una vez por archivo: quien la usa ya los va
 * acumulando, y así no hay dos formas de añadir según de dónde vengan.
 */
export default function FileUploadZone({
  onFileSelect,
  accept,
  maxSizeMB = 10,
  label = 'Arrastra un archivo aquí o haz clic para seleccionar',
  hint,
  disabled = false,
  className = '',
  multiple = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (lista: FileList | File[]) => {
      const archivos = Array.from(lista);
      if (archivos.length === 0) return;

      /* Los rechazados se nombran. Antes se descartaban en silencio y el
         estudiante se quedaba mirando una lista a la que le faltaba uno. */
      const maxBytes = maxSizeMB * 1024 * 1024;
      const grandes = archivos.filter((f) => f.size > maxBytes);
      const vacios = archivos.filter((f) => f.size === 0);
      const buenos = archivos.filter((f) => f.size > 0 && f.size <= maxBytes);

      const quejas: string[] = [];
      if (grandes.length > 0) {
        quejas.push(
          `${grandes.map((f) => f.name).join(', ')}: pasa${grandes.length === 1 ? '' : 'n'} de ${maxSizeMB} MB`,
        );
      }
      if (vacios.length > 0) {
        quejas.push(`${vacios.map((f) => f.name).join(', ')}: está${vacios.length === 1 ? '' : 'n'} vacío${vacios.length === 1 ? '' : 's'}`);
      }
      setError(quejas.length > 0 ? quejas.join(' · ') : null);

      for (const f of buenos) onFileSelect(f);
    },
    [maxSizeMB, onFileSelect],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]].filter(Boolean));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
    // Se vacía para poder volver a elegir el mismo archivo.
    e.target.value = '';
  }

  return (
    <div className={className}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed
          transition-all duration-200 cursor-pointer text-center
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragging
            ? 'border-cyan-500/60 bg-cyan-500/[0.06]'
            : 'border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20 hover:bg-foreground/[0.04]'
          }
          ${error ? 'border-red-500/40' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label={multiple ? 'Seleccionar archivos' : 'Seleccionar archivo'}
        />

        {/* Upload icon */}
        <div className={`${isDragging ? 'text-cyan-400' : 'text-faint'} transition-colors`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <p className={`text-sm font-medium ${isDragging ? 'text-cyan-300' : 'text-muted'}`}>
            {isDragging
              ? (multiple ? 'Suelta los archivos aquí' : 'Suelta el archivo aquí')
              : label}
          </p>
          {hint && (
            <p className="text-xs text-subtle mt-1">{hint}</p>
          )}
        </div>
      </label>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

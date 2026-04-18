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
}

/**
 * FileUploadZone — Zona de arrastrar y soltar reutilizable
 * Soporte drag&drop + click, validación de tamaño, feedback visual
 */
export default function FileUploadZone({
  onFileSelect,
  accept,
  maxSizeMB = 10,
  label = 'Arrastra un archivo aquí o haz clic para seleccionar',
  hint,
  disabled = false,
  className = '',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`);
        return;
      }

      if (file.size === 0) {
        setError('El archivo está vacío');
        return;
      }

      onFileSelect(file);
    },
    [maxSizeMB, onFileSelect]
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

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
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
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Seleccionar archivo"
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
            {isDragging ? 'Suelta el archivo aquí' : label}
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

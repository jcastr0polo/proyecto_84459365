'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export default function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <div
        className={`animate-spin rounded-full border-foreground/10 border-t-cyan-400 ${sizeClasses[size]}`}
      />
      {label && <span className="text-sm text-subtle">{label}</span>}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

/** Full-page centered spinner */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" label={label ?? 'Cargando...'} />
    </div>
  );
}

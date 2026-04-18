'use client';

import React, { useState, useMemo } from 'react';
import { GitBranch, Palette, Link as LinkIcon } from 'lucide-react';

interface LinkInputProps {
  type: 'github' | 'vercel' | 'figma' | 'other';
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const CONFIG: Record<string, { label: string; placeholder: string; icon: React.ReactNode; validate: (url: string) => string | null }> = {
  github: {
    label: 'Repositorio GitHub',
    placeholder: 'https://github.com/usuario/repositorio',
    icon: <GitBranch className="w-4 h-4" />,
    validate: (url) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (!u.hostname.includes('github.com')) return 'Debe ser una URL de GitHub';
        if (u.protocol !== 'https:') return 'Debe usar HTTPS';
        return null;
      } catch { return 'URL inválida'; }
    },
  },
  vercel: {
    label: 'Deploy Vercel',
    placeholder: 'https://mi-proyecto.vercel.app',
    icon: '▲',
    validate: (url) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (!u.hostname.endsWith('.vercel.app') && !u.hostname.includes('vercel')) return 'Debe ser una URL de Vercel (.vercel.app)';
        if (u.protocol !== 'https:') return 'Debe usar HTTPS';
        return null;
      } catch { return 'URL inválida'; }
    },
  },
  figma: {
    label: 'Diseño Figma',
    placeholder: 'https://www.figma.com/file/...',
    icon: <Palette className="w-4 h-4" />,
    validate: (url) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (!u.hostname.includes('figma.com')) return 'Debe ser una URL de Figma';
        return null;
      } catch { return 'URL inválida'; }
    },
  },
  other: {
    label: 'Otro enlace',
    placeholder: 'https://...',
    icon: <LinkIcon className="w-4 h-4" />,
    validate: (url) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) return 'Solo HTTP/HTTPS permitidos';
        return null;
      } catch { return 'URL inválida'; }
    },
  },
};

/**
 * LinkInput — Input de URL con validación en tiempo real por tipo
 */
export default function LinkInput({ type, value, onChange, required = false, disabled = false }: LinkInputProps) {
  const config = CONFIG[type];
  const [touched, setTouched] = useState(false);

  const error = useMemo(() => {
    if (!touched) return null;
    if (required && !value.trim()) return 'Este enlace es requerido';
    return config.validate(value);
  }, [touched, value, required, config]);

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1.5">
        <span>{config.icon}</span>
        {config.label}
        {required && <span className="text-red-400/70">*</span>}
      </label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={config.placeholder}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 rounded-lg border bg-foreground/[0.04] text-foreground text-sm
          placeholder:text-faint outline-none transition-colors
          focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error && touched ? 'border-red-500/50' : 'border-foreground/10'}
        `}
      />
      {touched && error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {touched && !error && value.trim() && (
        <p className="mt-1 text-xs text-emerald-400">✓ URL válida</p>
      )}
    </div>
  );
}

'use client';

import React from 'react';

interface DatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  includeTime?: boolean;
}

/**
 * DatePicker — Wrapper sobre input date/datetime-local con estilo unificado
 */
export default function DatePicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
  required = false,
  error,
  hint,
  disabled = false,
  includeTime = false,
}: DatePickerProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-white/60 mb-1.5">
        {label}
        {required && <span className="text-red-400/70 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={includeTime ? 'datetime-local' : 'date'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        min={min}
        max={max}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 rounded-lg border bg-white/[0.04] text-white text-sm
          outline-none transition-colors
          focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
          disabled:opacity-50 disabled:cursor-not-allowed
          [color-scheme:dark]
          ${error ? 'border-red-500/50' : 'border-white/10'}
        `}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-[11px] text-white/25">{hint}</p>}
    </div>
  );
}

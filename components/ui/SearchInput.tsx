'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * SearchInput — Compact search field with clear button
 */
export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground placeholder:text-faint outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-subtle hover:text-muted transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

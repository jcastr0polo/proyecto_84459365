'use client';

import React, { useState, useCallback, useRef } from 'react';

interface ScoreInputProps {
  value: number | null;
  maxScore: number;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  onTab?: () => void;
}

/**
 * ScoreInput — Inline validated score input for grading
 * - Validates 0–maxScore range
 * - Tab key flows to next input (spreadsheet-like)
 * - Visual feedback: green ≥ 80%, amber ≥ 60%, red < 60%
 */
export default function ScoreInput({
  value,
  maxScore,
  onChange,
  disabled = false,
  className = '',
  onTab,
}: ScoreInputProps) {
  // When focused, we use an internal draft. When blurred, we show the parent value.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = editing ? draft : (value !== null ? String(value) : '');

  const validate = useCallback(
    (raw: string): { valid: boolean; num: number | null } => {
      if (raw.trim() === '') return { valid: true, num: null };
      const num = parseFloat(raw);
      if (isNaN(num)) return { valid: false, num: null };
      if (num < 0 || num > maxScore) return { valid: false, num: null };
      return { valid: true, num };
    },
    [maxScore]
  );

  const handleFocus = () => {
    setEditing(true);
    setDraft(value !== null ? String(value) : '');
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    const { valid, num } = validate(raw);
    if (valid) {
      setError(null);
      onChange(num);
    } else {
      setError(`0 – ${maxScore}`);
    }
  };

  const commitAndExit = () => {
    const { valid, num } = validate(draft);
    if (valid) {
      onChange(num);
    }
    setError(null);
    setEditing(false);
  };

  const handleBlur = () => {
    commitAndExit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && onTab) {
      e.preventDefault();
      commitAndExit();
      onTab();
    }
    if (e.key === 'Enter') {
      commitAndExit();
      if (onTab) onTab();
    }
  };

  // Color based on score/maxScore ratio
  const ratio = value !== null && maxScore > 0 ? value / maxScore : null;
  const colorClass =
    ratio === null
      ? 'border-white/10'
      : ratio >= 0.8
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : ratio >= 0.6
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-red-500/40 bg-red-500/5';

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="—"
        aria-label={`Nota (0-${maxScore})`}
        className={`
          w-20 px-2.5 py-1.5 rounded-lg border text-center text-sm font-medium
          bg-white/[0.04] text-white outline-none transition-all
          focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/60 bg-red-500/10' : colorClass}
        `}
      />
      {error && (
        <span className="absolute -bottom-4 left-0 text-[10px] text-red-400 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}

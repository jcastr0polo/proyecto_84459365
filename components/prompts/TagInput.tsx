'use client';

import React, { useState, useRef, useCallback } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

/**
 * TagInput — Chip-based tag input
 * Enter/comma adds tag, backspace removes last, x button removes specific
 */
export default function TagInput({
  tags,
  onChange,
  placeholder = 'Agregar tag...',
  maxTags = 20,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= maxTags) return;
    onChange([...tags, tag]);
    setInput('');
  }, [tags, onChange, maxTags]);

  const removeTag = useCallback((index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  }, [tags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] cursor-text min-h-[42px] focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/25 transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-xs font-medium border border-cyan-500/20"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="hover:text-foreground transition-colors cursor-pointer"
              aria-label={`Eliminar tag ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        disabled={disabled}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground/80 placeholder:text-faint outline-none disabled:cursor-not-allowed"
      />
      {tags.length > 0 && (
        <span className="text-[10px] text-faint ml-auto">{tags.length}/{maxTags}</span>
      )}
    </div>
  );
}

'use client';

import React from 'react';

/**
 * FilterChip — chip de filtro seleccionable.
 * Responde al presionar y respeta prefers-reduced-motion.
 */
export default function FilterChip({
  active, onClick, dot, children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-meta font-medium border
                  transition-colors duration-[var(--dur-fast)] cursor-pointer
                  active:scale-[0.97] motion-reduce:active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                  ${active
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                    : 'border-surface-border bg-surface text-subtle hover:text-foreground hover:bg-surface-hover'}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {children}
    </button>
  );
}

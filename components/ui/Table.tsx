'use client';

import React from 'react';

/**
 * Cromo de tabla — una sola definición para todo el sistema.
 *
 * Se exporta porque GradeTable y GradeSummaryTable necesitan celdas propias
 * pero deben verse exactamente igual que el resto. Antes cada una repetía
 * estas clases a mano y ya habían divergido: usaban `divide-white/[0.04]`
 * sin variante para modo claro, así que con tema claro los separadores de
 * fila eran casi invisibles.
 */
export const tableChrome = {
  wrapper: 'overflow-x-auto rounded-xl border border-surface-border',
  thead: 'bg-surface-sunken border-b border-surface-border',
  th: 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted',
  tbody: 'divide-y divide-surface-border',
  tr: 'hover:bg-surface-hover transition-colors duration-[var(--dur-fast)]',
  td: 'px-4 py-3 text-sm text-foreground/80',
};

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export default function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`${tableChrome.wrapper} ${className}`}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className={tableChrome.thead}>
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`${tableChrome.th} ${className}`}>
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className={tableChrome.tbody}>{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`${tableChrome.tr} ${className}`}>{children}</tr>
  );
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`${tableChrome.td} ${className}`}>{children}</td>
  );
}

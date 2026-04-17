'use client';

import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export default function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-white/[0.08] ${className}`}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-white/[0.03] border-b border-white/[0.06]">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/50 ${className}`}>
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`hover:bg-white/[0.02] transition-colors ${className}`}>{children}</tr>
  );
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-sm text-white/80 ${className}`}>{children}</td>
  );
}

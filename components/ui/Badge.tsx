'use client';

import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'programming' | 'design' | 'management' | 'leadership' | 'other';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
  info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  neutral: 'bg-white/10 text-white/60 border-white/10',
  programming: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  design: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  management: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  leadership: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  other: 'bg-white/10 text-white/60 border-white/10',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-cyan-400',
  neutral: 'bg-white/60',
  programming: 'bg-blue-400',
  design: 'bg-purple-400',
  management: 'bg-amber-400',
  leadership: 'bg-rose-400',
  other: 'bg-white/60',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

/** Helper: map Course category to badge variant */
export function categoryToBadgeVariant(
  category: 'programming' | 'design' | 'management' | 'leadership' | 'other'
): BadgeVariant {
  return category;
}

/** Helper: map category to Spanish label */
export function categoryLabel(
  category: 'programming' | 'design' | 'management' | 'leadership' | 'other'
): string {
  const labels: Record<string, string> = {
    programming: 'Programación',
    design: 'Diseño',
    management: 'Gerencia',
    leadership: 'Liderazgo',
    other: 'Otro',
  };
  return labels[category] ?? category;
}

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
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20',
  info: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/20',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-foreground/10 dark:text-muted dark:border-foreground/10',
  programming: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20',
  design: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/20',
  management: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20',
  leadership: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20',
  other: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-foreground/10 dark:text-muted dark:border-foreground/10',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger: 'bg-red-600 dark:bg-red-400',
  info: 'bg-cyan-600 dark:bg-cyan-400',
  neutral: 'bg-slate-400 dark:bg-foreground/60',
  programming: 'bg-blue-600 dark:bg-blue-400',
  design: 'bg-purple-600 dark:bg-purple-400',
  management: 'bg-amber-600 dark:bg-amber-400',
  leadership: 'bg-rose-600 dark:bg-rose-400',
  other: 'bg-slate-400 dark:bg-foreground/60',
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

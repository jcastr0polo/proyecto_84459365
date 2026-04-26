'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`
        rounded-xl border border-slate-200 bg-white dark:border-foreground/[0.08] dark:bg-foreground/[0.03]
        ${hover ? 'transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:hover:border-foreground/15 dark:hover:bg-foreground/[0.06] cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${onClick ? 'text-left w-full' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-foreground/90 tracking-wide uppercase ${className}`}>
      {children}
    </h3>
  );
}

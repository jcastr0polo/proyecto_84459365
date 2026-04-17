'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-white/20 text-5xl" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-white/60 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-white/40 max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

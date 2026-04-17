'use client';

import React from 'react';
import Badge from '@/components/ui/Badge';
import Countdown from '@/components/ui/Countdown';
import type { Activity } from '@/lib/types';

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
}

/** Map activity type to localized label */
const TYPE_LABELS: Record<Activity['type'], string> = {
  project: 'Proyecto',
  exercise: 'Ejercicio',
  document: 'Documento',
  presentation: 'Presentación',
  prompt: 'Prompt IA',
  exam: 'Examen',
  other: 'Otro',
};

/** Map activity type to badge variant */
const TYPE_VARIANTS: Record<Activity['type'], 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'programming' | 'design' | 'management'> = {
  project: 'programming',
  exercise: 'info',
  document: 'neutral',
  presentation: 'design',
  prompt: 'management',
  exam: 'danger',
  other: 'neutral',
};

/** Map activity status to badge */
const STATUS_CONFIG: Record<Activity['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  draft: { label: 'Borrador', variant: 'warning' },
  published: { label: 'Publicada', variant: 'success' },
  closed: { label: 'Cerrada', variant: 'neutral' },
};

export { TYPE_LABELS, TYPE_VARIANTS, STATUS_CONFIG };

/**
 * ActivityCard — Card de actividad para lista con info clave
 */
export default function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const status = STATUS_CONFIG[activity.status];
  const isPastDue = new Date(activity.dueDate) < new Date();
  const isPublished = activity.status === 'published';

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]
        transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Top row: type + status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant={TYPE_VARIANTS[activity.type]} size="sm">
          {TYPE_LABELS[activity.type]}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} size="sm" dot>
            {status.label}
          </Badge>
          {activity.category === 'group' && (
            <Badge variant="design" size="sm">Grupal</Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white/90 mb-1 line-clamp-1">
        {activity.title}
      </h3>

      {/* Description preview */}
      {activity.description && (
        <p className="text-xs text-white/40 line-clamp-2 mb-3">
          {activity.description.replace(/[#*_`]/g, '').substring(0, 120)}
        </p>
      )}

      {/* Bottom row: date + weight + attachments */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-white/40">
          {/* Due date */}
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(activity.dueDate)}
          </span>

          {/* Weight */}
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            {activity.weight}%
          </span>

          {/* Attachments count */}
          {activity.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {activity.attachments.length}
            </span>
          )}
        </div>

        {/* Countdown or past due */}
        {isPublished && !isPastDue && (
          <Countdown targetDate={activity.dueDate} compact className="text-xs" />
        )}
        {isPastDue && activity.status !== 'draft' && (
          <span className="text-red-400/70 text-[11px]">Vencida</span>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short',
    });
  } catch {
    return iso;
  }
}

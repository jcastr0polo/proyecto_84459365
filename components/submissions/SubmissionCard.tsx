'use client';

import React from 'react';
import Badge from '@/components/ui/Badge';
import type { Submission } from '@/lib/types';

interface SubmissionCardProps {
  submission: Submission;
  activityTitle?: string;
  activityDueDate?: string;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<Submission['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  submitted: { label: 'Entregada', variant: 'success' },
  reviewed: { label: 'Calificada', variant: 'info' },
  returned: { label: 'Devuelta', variant: 'warning' },
  resubmitted: { label: 'Re-entregada', variant: 'success' },
};

export { STATUS_CONFIG as SUBMISSION_STATUS_CONFIG };

/**
 * SubmissionCard — Card compacta de una entrega
 */
export default function SubmissionCard({ submission, activityTitle, activityDueDate, onClick }: SubmissionCardProps) {
  const status = STATUS_CONFIG[submission.status];

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]
        transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant={status.variant} size="sm" dot>{status.label}</Badge>
        <span className="text-[11px] text-white/30 font-mono">v{submission.version}</span>
      </div>

      {/* Title */}
      {activityTitle && (
        <h3 className="text-sm font-semibold text-white/90 mb-1 line-clamp-1">{activityTitle}</h3>
      )}

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-white/40 mt-2">
        {/* Submitted date */}
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {formatDate(submission.submittedAt)}
        </span>

        {/* Late indicator */}
        {submission.isLate && (
          <Badge variant="danger" size="sm">Tardía</Badge>
        )}

        {/* Attachments count */}
        {submission.attachments.length > 0 && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            {submission.attachments.length}
          </span>
        )}

        {/* Links count */}
        {submission.links.length > 0 && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {submission.links.length}
          </span>
        )}
      </div>

      {/* Due date comparison */}
      {activityDueDate && submission.isLate && (
        <p className="mt-2 text-[11px] text-red-400/60">
          Fecha límite: {formatDate(activityDueDate)}
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

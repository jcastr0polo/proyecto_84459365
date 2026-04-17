'use client';

import React from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Countdown from '@/components/ui/Countdown';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { TYPE_LABELS, TYPE_VARIANTS, STATUS_CONFIG } from '@/components/activities/ActivityCard';
import type { Activity } from '@/lib/types';

interface ActivityDetailProps {
  activity: Activity;
  /** Admin-only actions */
  onPublish?: () => void;
  onClose?: () => void;
  onEdit?: () => void;
  onViewSubmissions?: () => void;
  /** Student submission section */
  submissionSlot?: React.ReactNode;
  /** Statistics for admin */
  stats?: {
    submitted: number;
    pending: number;
    late: number;
    total: number;
  };
  /** Whether the viewer is admin */
  isAdmin?: boolean;
  publishLoading?: boolean;
  closeLoading?: boolean;
}

/**
 * ActivityDetail — Vista de detalle de una actividad
 * Usada tanto por admin como estudiante (con diferentes acciones)
 */
export default function ActivityDetail({
  activity,
  onPublish,
  onClose,
  onEdit,
  onViewSubmissions,
  submissionSlot,
  stats,
  isAdmin = false,
  publishLoading = false,
  closeLoading = false,
}: ActivityDetailProps) {
  const status = STATUS_CONFIG[activity.status];
  const isPastDue = new Date(activity.dueDate) < new Date();
  const isPublished = activity.status === 'published';
  const isDraft = activity.status === 'draft';

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_VARIANTS[activity.type]} size="md">
            {TYPE_LABELS[activity.type]}
          </Badge>
          <Badge variant={status.variant} size="md" dot>
            {status.label}
          </Badge>
          <Badge variant={activity.category === 'group' ? 'design' : 'info'} size="sm">
            {activity.category === 'group' ? 'Grupal' : 'Individual'}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          {activity.title}
        </h1>

        {/* Key info row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
          <InfoItem icon="calendar" label="Publicación" value={formatDate(activity.publishDate)} />
          <InfoItem icon="clock" label="Fecha límite" value={formatDate(activity.dueDate)} />
          <InfoItem icon="star" label="Nota máxima" value={String(activity.maxScore)} />
          <InfoItem icon="percent" label="Peso" value={`${activity.weight}%`} />
        </div>

        {/* Countdown */}
        {isPublished && !isPastDue && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Tiempo restante:</span>
            <Countdown targetDate={activity.dueDate} />
          </div>
        )}
        {isPastDue && activity.status !== 'draft' && (
          <div className="flex items-center gap-2">
            <Badge variant="danger" size="sm" dot>Plazo vencido</Badge>
            {activity.allowLateSubmission && (
              <span className="text-xs text-amber-400">
                Entregas tardías permitidas (−{activity.latePenaltyPercent ?? 0}%)
              </span>
            )}
          </div>
        )}

        {/* Admin action bar */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
            {isDraft && onPublish && (
              <Button variant="primary" size="sm" onClick={onPublish} loading={publishLoading}>
                Publicar
              </Button>
            )}
            {isPublished && onClose && (
              <Button variant="danger" size="sm" onClick={onClose} loading={closeLoading}>
                Cerrar Actividad
              </Button>
            )}
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Editar
              </Button>
            )}
            {onViewSubmissions && (
              <Button variant="ghost" size="sm" onClick={onViewSubmissions}>
                Ver Entregas
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Stats (Admin) ─── */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Entregaron" value={stats.submitted} color="text-emerald-400" />
          <StatCard label="Pendientes" value={stats.pending} color="text-amber-400" />
          <StatCard label="Tardías" value={stats.late} color="text-red-400" />
          <StatCard label="Total inscritos" value={stats.total} color="text-cyan-400" />
        </div>
      )}

      {/* ─── Description ─── */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
          Descripción
        </h3>
        {activity.description ? (
          <MarkdownRenderer content={activity.description} />
        ) : (
          <p className="text-sm text-white/30 italic">Sin descripción</p>
        )}
      </Card>

      {/* ─── Attachments ─── */}
      {activity.attachments.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Archivos Adjuntos ({activity.attachments.length})
          </h3>
          <div className="space-y-2">
            {activity.attachments.map((att) => (
              <a
                key={att.id}
                href={`/api/upload/${att.filePath.replace('uploads/', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]
                         hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <FileIcon mimeType={att.mimeType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 group-hover:text-white truncate">{att.fileName}</p>
                  <p className="text-[11px] text-white/30">
                    {formatFileSize(att.fileSize)} · {att.mimeType.split('/')[1]?.toUpperCase()}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 group-hover:text-cyan-400 shrink-0">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Delivery requirements ─── */}
      {(activity.requiresFileUpload || activity.requiresLinkSubmission) && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Requisitos de Entrega
          </h3>
          <div className="space-y-2">
            {activity.requiresFileUpload && (
              <RequirementRow icon="📎" text="Debe subir un archivo" />
            )}
            {activity.requiresLinkSubmission && (
              <RequirementRow icon="🔗" text="Debe enviar un enlace (GitHub, Vercel, etc.)" />
            )}
            {activity.allowLateSubmission && (
              <RequirementRow
                icon="⏰"
                text={`Entrega tardía permitida con penalización del ${activity.latePenaltyPercent ?? 0}%`}
              />
            )}
          </div>
        </Card>
      )}

      {/* ─── Student Submission Slot ─── */}
      {submissionSlot}
    </div>
  );
}

/* ─── Sub-components ─── */

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  const icons: Record<string, React.ReactNode> = {
    calendar: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    clock: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    star: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    percent: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/30">{icons[icon]}</span>
      <span className="text-xs text-white/35">{label}:</span>
      <span className="text-xs text-white/70 font-medium">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

function RequirementRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      <span aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  if (isPdf) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  if (isImage) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

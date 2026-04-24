'use client';

import React, { useState, useCallback } from 'react';
import { Paperclip, Link as LinkIcon, Clock, Eye, EyeOff, Download } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Countdown from '@/components/ui/Countdown';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
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
  /** Prompt section (if activity has linked prompt) */
  promptSlot?: React.ReactNode;
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
  promptSlot,
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

        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {activity.title}
        </h1>

        {/* Key info row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <InfoItem icon="calendar" label="Publicación" value={formatDate(activity.publishDate)} />
          <InfoItem icon="clock" label="Fecha límite" value={formatDate(activity.dueDate)} />
          <InfoItem icon="star" label="Nota máxima" value={String(activity.maxScore)} />
          <InfoItem icon="percent" label="Peso" value={`${activity.weight}%`} />
        </div>

        {/* Countdown */}
        {isPublished && !isPastDue && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-subtle">Tiempo restante:</span>
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-foreground/[0.06]">
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
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
          Descripción
        </h3>
        {activity.description ? (
          <MarkdownRenderer content={activity.description} />
        ) : (
          <p className="text-sm text-subtle italic">Sin descripción</p>
        )}
      </Card>

      {/* ─── Attachments ─── */}
      {activity.attachments.length > 0 && (
        <AttachmentsSection attachments={activity.attachments} />
      )}

      {/* ─── Prompt Slot (AI Prompt) ─── */}
      {promptSlot}

      {/* ─── Delivery requirements ─── */}
      {(activity.requiresFileUpload || activity.requiresLinkSubmission) && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
            Requisitos de Entrega
          </h3>
          <div className="space-y-2">
            {activity.requiresFileUpload && (
              <RequirementRow icon={<Paperclip className="w-4 h-4" />} text="Debe subir un archivo" />
            )}
            {activity.requiresLinkSubmission && (
              <RequirementRow icon={<LinkIcon className="w-4 h-4" />} text="Debe enviar un enlace (GitHub, Vercel, etc.)" />
            )}
            {activity.allowLateSubmission && (
              <RequirementRow
                icon={<Clock className="w-4 h-4" />}
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

function AttachmentsSection({ attachments }: { attachments: Activity['attachments'] }) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [mdContent, setMdContent] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isMdOrTxt = (mime: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return mime === 'text/markdown' || mime === 'text/plain' || ext === 'md' || ext === 'txt';
  };

  const getDownloadUrl = (filePath: string) =>
    filePath.startsWith('http')
      ? `/api/upload/download?url=${encodeURIComponent(filePath)}`
      : `/api/upload/${filePath.replace('uploads/', '')}`;

  const handleView = useCallback(async (att: Activity['attachments'][0]) => {
    if (viewingId === att.id) {
      setViewingId(null);
      return;
    }
    if (mdContent[att.id]) {
      setViewingId(att.id);
      return;
    }
    setLoadingId(att.id);
    setViewingId(att.id);
    try {
      const url = getDownloadUrl(att.filePath);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        setMdContent((prev) => ({ ...prev, [att.id]: text }));
      }
    } catch { /* silent */ } finally {
      setLoadingId(null);
    }
  }, [viewingId, mdContent]);

  return (
    <Card padding="lg">
      <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
        Archivos Adjuntos ({attachments.length})
      </h3>
      <div className="space-y-3">
        {attachments.map((att) => {
          const canPreview = isMdOrTxt(att.mimeType, att.fileName);
          const isViewing = viewingId === att.id;

          return (
            <div key={att.id} className="space-y-2">
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isViewing
                  ? 'bg-cyan-500/[0.04] border-cyan-500/20'
                  : 'bg-foreground/[0.03] border-foreground/[0.06] hover:bg-foreground/[0.06] hover:border-foreground/[0.12]'
              }`}>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <FileIcon mimeType={att.mimeType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 truncate">{att.fileName}</p>
                  <p className="text-[11px] text-subtle">
                    {formatFileSize(att.fileSize)} · {att.mimeType.split('/')[1]?.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canPreview && (
                    <button
                      onClick={() => handleView(att)}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        isViewing
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'text-faint hover:text-cyan-400 hover:bg-cyan-500/10'
                      }`}
                      title={isViewing ? 'Ocultar vista previa' : 'Ver contenido'}
                    >
                      {isViewing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  <a
                    href={getDownloadUrl(att.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Inline preview */}
              {isViewing && (
                <div className="ml-2 p-4 rounded-lg bg-foreground/[0.03] border border-foreground/[0.08] max-h-[500px] overflow-y-auto">
                  {loadingId === att.id ? (
                    <p className="text-xs text-subtle animate-pulse">Cargando contenido...</p>
                  ) : mdContent[att.id] ? (
                    att.fileName.endsWith('.md')
                      ? <MarkdownViewer content={mdContent[att.id]} />
                      : <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed">{mdContent[att.id]}</pre>
                  ) : (
                    <p className="text-xs text-faint">No se pudo cargar el contenido</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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
      <span className="text-subtle">{icons[icon]}</span>
      <span className="text-xs text-subtle">{label}:</span>
      <span className="text-xs text-muted font-medium">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-subtle mt-0.5">{label}</p>
    </div>
  );
}

function RequirementRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className="text-subtle">{icon}</span>
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

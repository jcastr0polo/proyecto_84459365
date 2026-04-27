'use client';

import React from 'react';
import Link from 'next/link';
import { GitBranch, Palette, Link as LinkIcon, Eye, Download } from 'lucide-react';
import { formatDateTimeColombia as formatDateTime } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SUBMISSION_STATUS_CONFIG } from '@/components/submissions/SubmissionCard';
import type { Submission, SubmissionWithDetails } from '@/lib/types';

interface SubmissionDetailProps {
  submission: Submission | SubmissionWithDetails;
  isAdmin?: boolean;
  onReturn?: () => void;
  returnLoading?: boolean;
}

function isWithDetails(s: Submission | SubmissionWithDetails): s is SubmissionWithDetails {
  return 'student' in s && 'activity' in s;
}

/**
 * SubmissionDetail — Vista de detalle de una entrega
 */
export default function SubmissionDetail({ submission, isAdmin = false, onReturn, returnLoading = false }: SubmissionDetailProps) {
  const status = SUBMISSION_STATUS_CONFIG[submission.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.variant} size="md" dot>{status.label}</Badge>
        <Badge variant="neutral" size="sm">Versión {submission.version}</Badge>
        {submission.isLate && <Badge variant="danger" size="sm">Entrega tardía</Badge>}
      </div>

      {/* Student info (admin view) */}
      {isAdmin && isWithDetails(submission) && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-foreground/80">
            {submission.student.firstName[0]}{submission.student.lastName[0]}
          </div>
          <div>
            <p className="text-sm text-foreground/80 font-medium">{submission.student.firstName} {submission.student.lastName}</p>
            <p className="text-xs text-subtle">{submission.student.email}</p>
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-subtle block mb-0.5">Enviado</span>
          <span className="text-muted">{formatDateTime(submission.submittedAt)}</span>
        </div>
        <div>
          <span className="text-xs text-subtle block mb-0.5">Última actualización</span>
          <span className="text-muted">{formatDateTime(submission.updatedAt)}</span>
        </div>
      </div>

      {/* Content */}
      {submission.content && (
        <Card padding="md">
          <h4 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Comentario del estudiante</h4>
          <p className="text-sm text-muted whitespace-pre-wrap">{submission.content}</p>
        </Card>
      )}

      {/* Attachments */}
      {submission.attachments.length > 0 && (
        <SubmissionAttachments attachments={submission.attachments} />
      )}

      {/* Links */}
      {submission.links.length > 0 && (
        <Card padding="md">
          <h4 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
            Enlaces ({submission.links.length})
          </h4>
          <div className="space-y-2">
            {submission.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]
                         hover:bg-foreground/[0.06] hover:border-foreground/[0.12] transition-all group"
              >
                <span className="text-lg shrink-0">{LINK_ICONS[link.type] ?? <LinkIcon className="w-5 h-5" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 group-hover:text-cyan-300 truncate">{link.label || link.url}</p>
                  <p className="text-[11px] text-subtle truncate">{link.url}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint group-hover:text-cyan-400 shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Admin actions */}
      {isAdmin && (submission.status === 'submitted' || submission.status === 'reviewed' || submission.status === 'resubmitted') && onReturn && (
        <div className="pt-3 border-t border-foreground/[0.06]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onReturn}
            loading={returnLoading}
          >
            ↩ Devolver Entrega
          </Button>
          <p className="text-[11px] text-faint mt-1">Permite al estudiante re-enviar su trabajo</p>
        </div>
      )}
    </div>
  );
}

const LINK_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-5 h-5" />,
  vercel: <span>▲</span>,
  figma: <Palette className="w-5 h-5" />,
  other: <LinkIcon className="w-5 h-5" />,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SubmissionAttachments({ attachments }: { attachments: Submission['attachments'] }) {
  const isMdOrTxt = (_mime: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'txt';
  };

  const getDownloadUrl = (filePath: string) =>
    filePath.startsWith('http')
      ? `/api/upload/download?url=${encodeURIComponent(filePath)}`
      : `/api/upload/${filePath.replace('uploads/', '')}`;

  const getForceDownloadUrl = (filePath: string) =>
    filePath.startsWith('http')
      ? `/api/upload/download?url=${encodeURIComponent(filePath)}&download=1`
      : `/api/upload/${filePath.replace('uploads/', '')}?download=1`;

  const getViewerUrl = (att: Submission['attachments'][0]) =>
    `/admin/viewer?url=${encodeURIComponent(att.filePath)}&name=${encodeURIComponent(att.fileName)}`;

  return (
    <Card padding="md">
      <h4 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
        Archivos ({attachments.length})
      </h4>
      <div className="space-y-2">
        {attachments.map((att) => {
          const canPreview = isMdOrTxt(att.mimeType, att.fileName);

          return (
            <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]
                       hover:bg-foreground/[0.06] hover:border-foreground/[0.12] transition-all group">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 group-hover:text-foreground truncate">{att.fileName}</p>
                <p className="text-[11px] text-subtle">{formatFileSize(att.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canPreview ? (
                  <Link
                    href={getViewerUrl(att)}
                    className="p-2 rounded-lg text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Ver documento"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                ) : (
                  <a
                    href={getDownloadUrl(att.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Abrir"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={getForceDownloadUrl(att.filePath)}
                  download
                  className="p-2 rounded-lg text-faint hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

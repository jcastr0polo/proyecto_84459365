'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, XCircle, Info, Paperclip, Link as LinkIcon, MessageSquare, RotateCcw } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Countdown from '@/components/ui/Countdown';
import FileUploadZone from '@/components/ui/FileUploadZone';
import LinkInput from '@/components/submissions/LinkInput';
import { parseDateTimeColombia } from '@/lib/dateUtils';
import { useDraft } from '@/lib/useDraft';
import { nowColombia } from '@/lib/dateUtils';
import type { Activity, SubmissionLink } from '@/lib/types';

interface SubmitFormProps {
  activity: Activity;
  onSubmit: (data: {
    files: File[];
    links: SubmissionLink[];
    content?: string;
  }) => Promise<void>;
  loading?: boolean;
  existingVersion?: number;
  /** Porcentaje real de subida; sin definir = indeterminado. */
  progress?: number;
}

/**
 * SubmitForm — Formulario completo de entrega del estudiante
 * Multi-sección: resumen actividad, archivos, enlaces, comentario, confirmación
 */
export default function SubmitForm({ activity, onSubmit, loading = false, existingVersion, progress }: SubmitFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Borrador local: los archivos no se pueden guardar, el texto y los
  // enlaces sí, que es lo que cuesta rehacer.
  const { draft, setField, clearDraft, restored } = useDraft(`submit:${activity.id}`, {
    githubUrl: '', vercelUrl: '', figmaUrl: '', otherUrl: '', content: '',
  });
  const { githubUrl, vercelUrl, figmaUrl, otherUrl, content } = draft;
  const setGithubUrl = (v: string) => setField('githubUrl', v);
  const setVercelUrl = (v: string) => setField('vercelUrl', v);
  const setFigmaUrl = (v: string) => setField('figmaUrl', v);
  const setOtherUrl = (v: string) => setField('otherUrl', v);
  const setContent = (v: string) => setField('content', v);

  // Una sola marca de tiempo por render, no `new Date()` en el cuerpo.
  const now = useMemo(() => nowColombia(), []);
  const dueDate = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59');
  const isLate = now > dueDate;
  const isNearDue = !isLate && (dueDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000;

  const handleFileSelect = useCallback((file: File) => {
    setFiles((prev) => {
      if (prev.some((f) => f.name === file.name && f.size === file.size)) return prev;
      return [...prev, file];
    });
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function buildLinks(): SubmissionLink[] {
    const links: SubmissionLink[] = [];
    if (githubUrl.trim()) links.push({ type: 'github', url: githubUrl.trim(), label: 'Repositorio GitHub' });
    if (vercelUrl.trim()) links.push({ type: 'vercel', url: vercelUrl.trim(), label: 'Deploy Vercel' });
    if (figmaUrl.trim()) links.push({ type: 'figma', url: figmaUrl.trim(), label: 'Diseño Figma' });
    if (otherUrl.trim()) links.push({ type: 'other', url: otherUrl.trim(), label: 'Otro enlace' });
    return links;
  }

  function validate(): string | null {
    if (activity.requiresFileUpload && files.length === 0) {
      return 'Debes adjuntar al menos un archivo';
    }
    if (activity.requiresLinkSubmission) {
      const links = buildLinks();
      if (links.length === 0) return 'Debes enviar al menos un enlace';
    }
    // Un enlace mal escrito se enviaba tal cual y luego no abría.
    const malformed = buildLinks().find((l) => !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(l.url));
    if (malformed) return `Revisa el enlace: debe empezar por https:// (${malformed.label})`;
    return null;
  }

  async function handleConfirmSubmit() {
    try {
      await onSubmit({
        files,
        links: buildLinks(),
        content: content.trim() || undefined,
      });
      // Enviado: el borrador ya no hace falta.
      clearDraft();
    } finally {
      setShowConfirm(false);
    }
  }

  const validationError = validate();

  return (
    <div className="space-y-6">
      {/* Se avisa de que hay texto recuperado: si no, el estudiante podría
          pensar que envió algo que en realidad nunca salió. */}
      {restored && (
        <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3">
          <RotateCcw className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted">
            Recuperamos lo que habías escrito y no llegaste a enviar.
            <button
              type="button"
              onClick={() => { clearDraft(); window.location.reload(); }}
              className="ml-1.5 text-cyan-600 dark:text-cyan-400 underline cursor-pointer"
            >
              Descartar y empezar de cero
            </button>
          </p>
        </div>
      )}

      {/* ─── Activity Summary ─── */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground/90">{activity.title}</h2>
            <p className="text-xs text-subtle mt-0.5">
              Nota máxima: {activity.maxScore} · Peso: {activity.weight}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLate ? (
              <Badge variant="danger" size="md" dot>
                {activity.allowLateSubmission ? 'Entrega tardía' : 'Plazo vencido'}
              </Badge>
            ) : isNearDue ? (
              <Badge variant="warning" size="md" dot>Próximo a vencer</Badge>
            ) : (
              <Badge variant="success" size="md" dot>A tiempo</Badge>
            )}
          </div>
        </div>

        {/* Countdown / Late warning */}
        {!isLate && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-subtle">Tiempo restante:</span>
            <Countdown targetDate={activity.dueDate} targetTime={activity.dueTime || '23:59'} compact />
          </div>
        )}
        {isLate && activity.allowLateSubmission && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
            <p className="text-xs text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> El plazo ha vencido. Tu entrega se marcará como tardía
              {activity.latePenaltyPercent ? ` con una penalización del ${activity.latePenaltyPercent}%` : ''}.
            </p>
          </div>
        )}
        {isLate && !activity.allowLateSubmission && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
            <p className="text-xs text-red-300 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> El plazo ha vencido y no se aceptan entregas tardías.</p>
          </div>
        )}
      </Card>

      {/* Re-submission notice */}
      {existingVersion && (
        <div className="p-3 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20">
          <p className="text-xs text-cyan-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 flex-shrink-0" /> Ya tienes una entrega (versión {existingVersion}). Al enviar, se creará la versión {existingVersion + 1}.
          </p>
        </div>
      )}

      {/* ─── Files Section ─── */}
      {activity.requiresFileUpload && (
        <section>
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
            Archivos Adjuntos <span className="text-red-400/70">*</span>
          </h3>

          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                  <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{file.name}</p>
                    <p className="text-meta text-subtle">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-subtle hover:text-red-400 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Quitar ${file.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <FileUploadZone
            onFileSelect={handleFileSelect}
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.md,.txt,.zip"
            maxSizeMB={10}
            label="Arrastra tus archivos aquí"
            hint="PDF, DOCX, PPTX, XLSX, imágenes, Markdown, TXT, ZIP · Máx. 10MB"
            disabled={loading || (isLate && !activity.allowLateSubmission)}
          />
        </section>
      )}

      {/* ─── Links Section ─── */}
      {activity.requiresLinkSubmission && (
        <section>
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
            Enlaces <span className="text-red-400/70">*</span>
          </h3>
          <div className="space-y-4">
            <LinkInput type="github" value={githubUrl} onChange={setGithubUrl} disabled={loading} />
            <LinkInput type="vercel" value={vercelUrl} onChange={setVercelUrl} disabled={loading} />
            <LinkInput type="figma" value={figmaUrl} onChange={setFigmaUrl} disabled={loading} />
            <LinkInput type="other" value={otherUrl} onChange={setOtherUrl} disabled={loading} />
          </div>
        </section>
      )}

      {/* Always show optional links if not required */}
      {!activity.requiresLinkSubmission && (
        <section>
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
            Enlaces (opcional)
          </h3>
          <div className="space-y-4">
            <LinkInput type="github" value={githubUrl} onChange={setGithubUrl} disabled={loading} />
            <LinkInput type="vercel" value={vercelUrl} onChange={setVercelUrl} disabled={loading} />
            <LinkInput type="other" value={otherUrl} onChange={setOtherUrl} disabled={loading} />
          </div>
        </section>
      )}

      {/* ─── Comment Section ─── */}
      <section>
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
          Comentario (opcional)
        </h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notas adicionales sobre tu entrega..."
          rows={4}
          maxLength={5000}
          disabled={loading}
          className="w-full px-3 py-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground text-sm
                     placeholder:text-faint outline-none transition-colors resize-y
                     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-meta text-faint text-right">{content.length}/5000</p>
      </section>

      {/*
        Progreso real de la subida. Antes era un temporizador que trepaba
        hasta 85% sin saber nada del envío: mentía sobre lo que estaba
        pasando. Ahora viene del evento de progreso del navegador, y cuando
        no hay archivos que subir se muestra un estado indeterminado en vez
        de un porcentaje inventado.
      */}
      {loading && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {files.length > 0 ? 'Subiendo archivos…' : 'Enviando entrega…'}
            </span>
            {progress !== undefined && (
              <span className="text-cyan-400 font-mono tabular-nums">{Math.round(progress)}%</span>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
            {progress === undefined ? (
              <div className="h-full w-1/3 rounded-full bg-cyan-500 animate-[indeterminate_1.2s_ease-in-out_infinite]
                              motion-reduce:w-full motion-reduce:animate-none" />
            ) : (
              <div
                className="h-full rounded-full bg-cyan-500 origin-left transition-transform duration-200 ease-out
                           motion-reduce:transition-none"
                style={{ transform: `scaleX(${Math.min(progress, 100) / 100})`, width: '100%' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Submit Button ─── */}
      <div className="hidden sm:flex items-center gap-3 pt-4 border-t border-foreground/[0.06]">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={!!(validationError) || !!(isLate && !activity.allowLateSubmission) || loading}
          loading={loading}
          onClick={() => setShowConfirm(true)}
        >
          {existingVersion ? `Re-enviar Entrega (v${existingVersion + 1})` : 'Enviar Entrega'}
        </Button>

        {validationError && (
          <p className="text-xs text-red-400">{validationError}</p>
        )}
      </div>

      {/* ─── Mobile Sticky Submit ─── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 backdrop-blur-lg border-t border-foreground/[0.08] px-4 py-3 safe-area-bottom">
        {validationError && (
          <p className="text-xs text-red-400 mb-2 text-center">{validationError}</p>
        )}
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!!(validationError) || !!(isLate && !activity.allowLateSubmission) || loading}
          loading={loading}
          onClick={() => setShowConfirm(true)}
        >
          {existingVersion ? `Re-enviar (v${existingVersion + 1})` : 'Enviar Entrega'}
        </Button>
      </div>
      {/* Spacer so content doesn't hide behind sticky button on mobile */}
      <div className="sm:hidden h-24" />

      {/* ─── Confirmation Modal ─── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-canvas rounded-xl border border-foreground/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">¿Confirmar entrega?</h3>
            <p className="text-sm text-muted">
              {existingVersion
                ? `Se registrará la versión ${existingVersion + 1} de tu entrega.`
                : 'Esta acción registrará tu entrega para esta actividad.'
              }
            </p>

            {isLate && activity.allowLateSubmission && (
              <p className="text-xs text-amber-400 p-2 rounded bg-amber-500/[0.06] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Tu entrega se marcará como tardía
                {activity.latePenaltyPercent ? ` (−${activity.latePenaltyPercent}%)` : ''}.
              </p>
            )}

            {/* Summary */}
            <div className="text-xs text-subtle space-y-1">
              {files.length > 0 && <p className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> {files.length} archivo{files.length > 1 ? 's' : ''}</p>}
              {buildLinks().length > 0 && <p className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> {buildLinks().length} enlace{buildLinks().length > 1 ? 's' : ''}</p>}
              {content.trim() && <p className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Con comentario</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={handleConfirmSubmit}
              >
                Sí, enviar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

'use client';

import React, { useState, useCallback } from 'react';
import { Pencil, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import FileUploadZone from '@/components/ui/FileUploadZone';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import type { Activity, ActivityAttachment } from '@/lib/types';

export interface ActivityFormData {
  title: string;
  description: string;
  type: Activity['type'];
  category: Activity['category'];
  dueDate: string;
  publishDate: string;
  maxScore: number;
  weight: number;
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  requiresFileUpload: boolean;
  requiresLinkSubmission: boolean;
}

interface ActivityFormProps {
  activity?: Activity;
  onSubmit: (data: ActivityFormData, publish?: boolean) => Promise<void>;
  onCancel?: () => void;
  onUploadFile?: (file: File) => Promise<ActivityAttachment | null>;
  loading?: boolean;
}

const ACTIVITY_TYPES: { value: Activity['type']; label: string }[] = [
  { value: 'project', label: 'Proyecto' },
  { value: 'exercise', label: 'Ejercicio' },
  { value: 'document', label: 'Documento' },
  { value: 'presentation', label: 'Presentación' },
  { value: 'prompt', label: 'Prompt IA' },
  { value: 'exam', label: 'Examen' },
  { value: 'other', label: 'Otro' },
];

/**
 * ActivityForm — Formulario para crear/editar actividades
 * Dividido en secciones: info básica, descripción con preview, configuración, opciones, archivos
 */
export default function ActivityForm({
  activity,
  onSubmit,
  onCancel,
  onUploadFile,
  loading = false,
}: ActivityFormProps) {
  const isEdit = !!activity;

  const [form, setForm] = useState<ActivityFormData>({
    title: activity?.title ?? '',
    description: activity?.description ?? '',
    type: activity?.type ?? 'project',
    category: activity?.category ?? 'individual',
    dueDate: activity?.dueDate ?? '',
    publishDate: activity?.publishDate ?? '',
    maxScore: activity?.maxScore ?? 5.0,
    weight: activity?.weight ?? 0,
    allowLateSubmission: activity?.allowLateSubmission ?? false,
    latePenaltyPercent: activity?.latePenaltyPercent ?? 0,
    requiresFileUpload: activity?.requiresFileUpload ?? false,
    requiresLinkSubmission: activity?.requiresLinkSubmission ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>(activity?.attachments ?? []);
  const [uploading, setUploading] = useState(false);

  function validate(data: ActivityFormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!data.title.trim()) e.title = 'El título es requerido';
    if (!data.description.trim()) e.description = 'La descripción es requerida';
    if (!data.dueDate) e.dueDate = 'La fecha límite es requerida';
    if (!data.publishDate) e.publishDate = 'La fecha de publicación es requerida';
    if (data.dueDate && data.publishDate && new Date(data.dueDate) <= new Date(data.publishDate)) {
      e.dueDate = 'La fecha límite debe ser posterior a la publicación';
    }
    if (data.maxScore <= 0) e.maxScore = 'La nota máxima debe ser mayor que 0';
    if (data.weight < 0 || data.weight > 100) e.weight = 'El peso debe estar entre 0 y 100';
    if (data.allowLateSubmission && data.latePenaltyPercent < 0) {
      e.latePenaltyPercent = 'La penalización no puede ser negativa';
    }
    return e;
  }

  function update<K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const v = validate(next);
      setErrors((prev) => {
        const updated = { ...prev };
        if (v[field]) updated[field] = v[field];
        else delete updated[field];
        return updated;
      });
    }
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(form);
    if (v[field]) {
      setErrors((prev) => ({ ...prev, [field]: v[field] }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    if (!onUploadFile) return;
    setUploading(true);
    try {
      const attachment = await onUploadFile(file);
      if (attachment) {
        setAttachments((prev) => [...prev, attachment]);
      }
    } finally {
      setUploading(false);
    }
  }, [onUploadFile]);

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent, publish = false) {
    e.preventDefault();
    const v = validate(form);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    await onSubmit(form, publish);
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border bg-foreground/[0.04] text-foreground text-sm
     placeholder:text-faint outline-none transition-colors
     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
     ${errors[field] && touched[field] ? 'border-red-500/50' : 'border-foreground/10'}`;

  const selectClass = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border bg-foreground/[0.04] text-foreground text-sm
     outline-none transition-colors appearance-none cursor-pointer
     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
     ${errors[field] && touched[field] ? 'border-red-500/50' : 'border-foreground/10'}`;

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
      {/* ─── SECCIÓN 1: Información Básica ─── */}
      <section>
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
          Información Básica
        </h3>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="act-title" className="block text-xs font-medium text-muted mb-1.5">
              Título <span className="text-red-400/70">*</span>
            </label>
            <input
              id="act-title"
              type="text"
              placeholder="Ej: Proyecto Fullstack - Fase 1"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              className={inputClass('title')}
            />
            {touched.title && errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Type + Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-type" className="block text-xs font-medium text-muted mb-1.5">
                Tipo <span className="text-red-400/70">*</span>
              </label>
              <select
                id="act-type"
                value={form.type}
                onChange={(e) => update('type', e.target.value as Activity['type'])}
                className={selectClass('type')}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="act-category" className="block text-xs font-medium text-muted mb-1.5">
                Categoría <span className="text-red-400/70">*</span>
              </label>
              <select
                id="act-category"
                value={form.category}
                onChange={(e) => update('category', e.target.value as Activity['category'])}
                className={selectClass('category')}
              >
                <option value="individual">Individual</option>
                <option value="group">Grupal</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN 2: Descripción con Preview ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
            Descripción
          </h3>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {showPreview ? <><Pencil className="w-3 h-3 inline" /> Editar</> : <><Eye className="w-3 h-3 inline" /> Preview</>}
          </button>
        </div>

        {showPreview ? (
          <div className="min-h-[200px] p-4 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02]">
            {form.description ? (
              <MarkdownRenderer content={form.description} />
            ) : (
              <p className="text-sm text-subtle italic">Sin contenido para previsualizar</p>
            )}
          </div>
        ) : (
          <div>
            <textarea
              id="act-description"
              placeholder="Describe la actividad usando Markdown..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              rows={8}
              className={`${inputClass('description')} resize-y min-h-[200px] font-mono text-xs`}
            />
            <p className="mt-1 text-[11px] text-faint">
              Soporta Markdown: **negrita**, *cursiva*, `código`, # títulos, - listas
            </p>
            {touched.description && errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
          </div>
        )}
      </section>

      {/* ─── SECCIÓN 3: Configuración ─── */}
      <section>
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
          Configuración
        </h3>
        <div className="space-y-4">
          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              id="act-publish-date"
              label="Fecha de Publicación"
              value={form.publishDate}
              onChange={(v) => update('publishDate', v)}
              onBlur={() => handleBlur('publishDate')}
              required
              error={touched.publishDate ? errors.publishDate : undefined}
              hint="Cuándo será visible para estudiantes"
            />
            <DatePicker
              id="act-due-date"
              label="Fecha Límite"
              value={form.dueDate}
              onChange={(v) => update('dueDate', v)}
              onBlur={() => handleBlur('dueDate')}
              required
              min={form.publishDate}
              error={touched.dueDate ? errors.dueDate : undefined}
              hint="Fecha máxima de entrega"
            />
          </div>

          {/* Score + Weight row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-maxscore" className="block text-xs font-medium text-muted mb-1.5">
                Nota Máxima <span className="text-red-400/70">*</span>
              </label>
              <input
                id="act-maxscore"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="5.0"
                value={form.maxScore}
                onChange={(e) => update('maxScore', parseFloat(e.target.value) || 0)}
                onBlur={() => handleBlur('maxScore')}
                className={inputClass('maxScore')}
              />
              {touched.maxScore && errors.maxScore && (
                <p className="mt-1 text-xs text-red-400">{errors.maxScore}</p>
              )}
            </div>

            <div>
              <label htmlFor="act-weight" className="block text-xs font-medium text-muted mb-1.5">
                Peso Porcentual (%) <span className="text-red-400/70">*</span>
              </label>
              <input
                id="act-weight"
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="20"
                value={form.weight}
                onChange={(e) => update('weight', parseInt(e.target.value) || 0)}
                onBlur={() => handleBlur('weight')}
                className={inputClass('weight')}
              />
              {touched.weight && errors.weight && (
                <p className="mt-1 text-xs text-red-400">{errors.weight}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN 4: Opciones ─── */}
      <section>
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
          Opciones de Entrega
        </h3>
        <div className="space-y-3">
          {/* Allow late submission */}
          <ToggleRow
            id="act-late"
            label="Permitir entregas tardías"
            description="Los estudiantes podrán enviar después de la fecha límite"
            checked={form.allowLateSubmission}
            onChange={(v) => update('allowLateSubmission', v)}
          />

          {/* Late penalty */}
          {form.allowLateSubmission && (
            <div className="ml-8">
              <label htmlFor="act-penalty" className="block text-xs font-medium text-muted mb-1.5">
                Penalización por tardanza (%)
              </label>
              <input
                id="act-penalty"
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="10"
                value={form.latePenaltyPercent}
                onChange={(e) => update('latePenaltyPercent', parseInt(e.target.value) || 0)}
                className={`${inputClass('latePenaltyPercent')} max-w-[120px]`}
              />
              <p className="mt-1 text-[11px] text-faint">
                Se descontará este % de la nota por entrega tardía
              </p>
            </div>
          )}

          {/* Requires file upload */}
          <ToggleRow
            id="act-file"
            label="Requiere subir archivo"
            description="El estudiante debe adjuntar un archivo a su entrega"
            checked={form.requiresFileUpload}
            onChange={(v) => update('requiresFileUpload', v)}
          />

          {/* Requires link */}
          <ToggleRow
            id="act-link"
            label="Requiere enviar enlace"
            description="El estudiante debe enviar una URL (GitHub, Vercel, etc.)"
            checked={form.requiresLinkSubmission}
            onChange={(v) => update('requiresLinkSubmission', v)}
          />
        </div>
      </section>

      {/* ─── SECCIÓN 5: Archivos Adjuntos ─── */}
      {onUploadFile && (
        <section>
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
            Archivos Adjuntos del Docente
          </h3>

          {/* Attached files list */}
          {attachments.length > 0 && (
            <div className="space-y-2 mb-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]"
                >
                  <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{att.fileName}</p>
                    <p className="text-[11px] text-subtle">
                      {formatFileSize(att.fileSize)} · {att.mimeType.split('/')[1]?.toUpperCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 rounded hover:bg-foreground/10 text-subtle hover:text-red-400 transition-colors cursor-pointer"
                    aria-label={`Eliminar ${att.fileName}`}
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
            onFileSelect={handleFileUpload}
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.md,.txt"
            maxSizeMB={10}
            label="Arrastra archivos del material aquí"
            hint="PDF, DOCX, PPTX, XLSX, imágenes, Markdown, TXT · Máx. 10MB"
            disabled={uploading}
          />
          {uploading && (
            <p className="mt-2 text-xs text-cyan-400 animate-pulse">Subiendo archivo...</p>
          )}
        </section>
      )}

      {/* ─── Acciones ─── */}
      <div className="flex items-center gap-3 pt-4 border-t border-foreground/[0.06]">
        <Button
          type="submit"
          variant="secondary"
          size="md"
          loading={loading}
          disabled={uploading}
        >
          {isEdit ? 'Guardar Cambios' : 'Guardar Borrador'}
        </Button>

        {(!isEdit || activity?.status === 'draft') && (
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={loading}
            disabled={uploading}
            onClick={(e) => handleSubmit(e, true)}
          >
            {isEdit ? 'Guardar y Publicar' : 'Crear y Publicar'}
          </Button>
        )}

        {onCancel && (
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

/** Toggle row with switch */
function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.05]">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors cursor-pointer
          ${checked ? 'bg-cyan-500' : 'bg-foreground/15'}
        `}
      >
        <span
          className={`
            block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform
            ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}
          `}
          style={{ marginTop: '3px' }}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <p className="text-sm text-foreground/80 font-medium">{label}</p>
        <p className="text-xs text-subtle">{description}</p>
      </label>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

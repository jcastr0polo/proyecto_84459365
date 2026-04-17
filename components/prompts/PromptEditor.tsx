'use client';

import React, { useState, useCallback, useMemo } from 'react';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import TagInput from '@/components/prompts/TagInput';
import type { Course } from '@/lib/types';

interface PromptEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialCourseId?: string;
  initialIsTemplate?: boolean;
  courses: Course[];
  onSubmit: (data: {
    title: string;
    content: string;
    tags: string[];
    courseId: string;
    isTemplate: boolean;
  }) => void;
  loading?: boolean;
  submitLabel?: string;
}

/**
 * PromptEditor — Split-view Markdown editor with live preview
 * Left panel: textarea for Markdown content
 * Right panel: MarkdownRenderer preview
 * Top: title, course selector, tags, template toggle
 */
export default function PromptEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialCourseId = '',
  initialIsTemplate = false,
  courses,
  onSubmit,
  loading = false,
  submitLabel = 'Guardar Prompt',
}: PromptEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [showPreview, setShowPreview] = useState(true);

  const isValid = useMemo(
    () => title.trim().length >= 3 && content.trim().length >= 10 && courseId !== '',
    [title, content, courseId]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || loading) return;
      onSubmit({ title: title.trim(), content, tags, courseId, isTemplate });
    },
    [isValid, loading, onSubmit, title, content, tags, courseId, isTemplate]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ─── Meta fields ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-white/50 mb-1.5">
            Título del Prompt *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Prompt para revisión de código React"
            className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg
                       text-sm text-white/90 placeholder:text-white/25
                       focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
                       transition-colors"
            required
            minLength={3}
          />
        </div>

        {/* Course selector */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">
            Curso *
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg
                       text-sm text-white/90
                       focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
                       transition-colors"
            required
          >
            <option value="" className="bg-[#111]">Seleccionar curso...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#111]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template toggle */}
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={(e) => setIsTemplate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/[0.08] rounded-full peer-checked:bg-cyan-500/30 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white/40 rounded-full shadow
                              peer-checked:translate-x-4 peer-checked:bg-cyan-400 transition-all" />
            </div>
            <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
              Plantilla reutilizable
            </span>
          </label>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">
          Tags
        </label>
        <TagInput tags={tags} onChange={setTags} placeholder="Agregar tag y presionar Enter..." maxTags={10} />
      </div>

      {/* ─── Split Editor ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/50">
            Contenido del Prompt (Markdown) *
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-[11px] text-cyan-400/60 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
          </button>
        </div>

        <div className={`grid gap-4 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Editor pane */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# Instrucciones para el asistente de IA\n\nEscribe el prompt en formato Markdown...\n\n## Contexto\n\n## Tarea\n\n## Restricciones`}
              className="w-full h-80 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg
                         text-sm text-white/80 font-mono leading-relaxed placeholder:text-white/15
                         focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
                         transition-colors resize-y"
              required
              minLength={10}
            />
            <p className="text-[10px] text-white/25 mt-1">
              {content.length} caracteres · Markdown soportado
            </p>
          </div>

          {/* Preview pane */}
          {showPreview && (
            <div className="h-80 overflow-y-auto rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-sm text-white/20 italic">La vista previa aparecerá aquí...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Submit ─── */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-white/30">
          * Campos requeridos
        </p>
        <button
          type="submit"
          disabled={!isValid || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                     bg-cyan-500 text-white hover:bg-cyan-400
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors cursor-pointer"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

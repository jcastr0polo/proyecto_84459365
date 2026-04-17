'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import { Bot, Pencil } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import PromptEditor from '@/components/prompts/PromptEditor';
import PromptViewer from '@/components/prompts/PromptViewer';
import type { AIPrompt, Course } from '@/lib/types';

type ViewMode = 'view' | 'edit';

/**
 * Admin — Detalle / Edición de Prompt de IA
 * Fase 18 — Muestra prompt con viewer, permite editar, muestra versión
 */
export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const promptId = params.promptId as string;

  const [prompt, setPrompt] = useState<AIPrompt | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ViewMode>('view');

  const fetchData = useCallback(async () => {
    try {
      const [promptRes, courseRes] = await Promise.all([
        fetch(`/api/prompts/${promptId}`),
        fetch('/api/courses'),
      ]);

      if (promptRes.ok) {
        const data = await promptRes.json();
        setPrompt(data.prompt);
      } else {
        toast('Prompt no encontrado', 'error');
        router.push('/admin/prompts');
        return;
      }

      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data.courses ?? []);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [promptId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const courseName = courses.find((c) => c.id === prompt?.courseId)?.name;

  const handleSave = useCallback(
    async (data: { title: string; content: string; tags: string[]; courseId: string; isTemplate: boolean }) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/prompts/${promptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          const result = await res.json();
          setPrompt(result.prompt);
          setMode('view');
          toast('Prompt actualizado (nueva versión creada)', 'success');
        } else {
          const err = await res.json();
          toast(err.error ?? 'Error al actualizar', 'error');
        }
      } catch {
        toast('Error de conexión', 'error');
      } finally {
        setSaving(false);
      }
    },
    [promptId, toast]
  );

  if (loading || !prompt) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/prompts')}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a Prompts
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bot className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{prompt.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {courseName && <Badge variant="info" size="sm">{courseName}</Badge>}
              <Badge variant="neutral" size="sm">v{prompt.version}</Badge>
              {prompt.isTemplate && <Badge variant="design" size="sm">Plantilla</Badge>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.04]
                         transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
          ) : (
            <button
              onClick={() => setMode('view')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* ─── Version info ─── */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <span className="text-xs text-white/30">Versión actual:</span>
        <Badge variant="success" size="sm">v{prompt.version}</Badge>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30">
          Creado: {formatDate(prompt.createdAt)}
        </span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30">
          Última edición: {formatDate(prompt.updatedAt)}
        </span>
      </div>

      {/* ─── Content ─── */}
      {mode === 'view' ? (
        <Card padding="lg">
          <PromptViewer
            title={prompt.title}
            content={prompt.content}
            version={prompt.version}
            tags={prompt.tags}
            courseName={courseName}
          />
        </Card>
      ) : (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Editar Prompt
                <span className="text-xs font-normal text-white/30">
                  (se creará versión v{prompt.version + 1})
                </span>
              </span>
            </CardTitle>
          </CardHeader>

          <PromptEditor
            initialTitle={prompt.title}
            initialContent={prompt.content}
            initialTags={prompt.tags}
            initialCourseId={prompt.courseId}
            initialIsTemplate={prompt.isTemplate}
            courses={courses}
            onSubmit={handleSave}
            loading={saving}
            submitLabel={`Guardar v${prompt.version + 1}`}
          />
        </Card>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

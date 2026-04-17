'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import { Bot } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import PromptEditor from '@/components/prompts/PromptEditor';
import type { Course } from '@/lib/types';

/**
 * Admin — Crear nuevo Prompt de IA
 * Fase 18 — Formulario con editor Markdown split-view
 */
export default function NewPromptPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/courses')
      .then((res) => (res.ok ? res.json() : { courses: [] }))
      .then((data) => setCourses(data.courses ?? []))
      .catch(() => toast('Error al cargar cursos', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSubmit = useCallback(
    async (data: { title: string; content: string; tags: string[]; courseId: string; isTemplate: boolean }) => {
      setSaving(true);
      try {
        const res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          const result = await res.json();
          toast('Prompt creado exitosamente', 'success');
          router.push(`/admin/prompts/${result.prompt.id}`);
        } else {
          const err = await res.json();
          toast(err.error ?? 'Error al crear prompt', 'error');
        }
      } catch {
        toast('Error de conexión', 'error');
      } finally {
        setSaving(false);
      }
    },
    [router, toast]
  );

  if (loading) return <PageLoader />;

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

      <Card padding="lg">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              Nuevo Prompt de IA
            </span>
          </CardTitle>
        </CardHeader>

        <PromptEditor
          courses={courses}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel="Crear Prompt"
        />
      </Card>
    </div>
  );
}

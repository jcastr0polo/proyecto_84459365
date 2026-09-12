'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import { Bot } from 'lucide-react';
import { Skeleton, SkeletonForm } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PromptEditor from '@/components/prompts/PromptEditor';
import type { Course } from '@/lib/types';
import BackLink from '@/components/ui/BackLink';

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-64" />
        <SkeletonForm fields={5} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <BackLink href={'/admin/prompts'}>Volver a Prompts</BackLink>

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

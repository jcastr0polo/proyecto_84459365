'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import PromptCard from '@/components/prompts/PromptCard';
import type { AIPrompt, Course } from '@/lib/types';

type TemplateFilter = 'all' | 'templates' | 'prompts';

/**
 * Admin — Prompts de IA (Listado)
 * Fase 18 — Lista con filtros por curso, plantilla, búsqueda
 */
export default function AdminPromptsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [promptRes, courseRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/courses'),
      ]);

      if (promptRes.ok) {
        const data = await promptRes.json();
        setPrompts(data.prompts ?? []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data.courses ?? []);
      }
    } catch {
      toast('Error al cargar prompts', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build course name map
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [courses]);

  // Filtered prompts
  const filtered = useMemo(() => {
    let result = prompts;

    if (courseFilter !== 'all') {
      result = result.filter((p) => p.courseId === courseFilter);
    }

    if (templateFilter === 'templates') {
      result = result.filter((p) => p.isTemplate);
    } else if (templateFilter === 'prompts') {
      result = result.filter((p) => !p.isTemplate);
    }

    if (search.trim()) {
      const lc = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(lc) ||
          p.tags.some((t) => t.includes(lc)) ||
          p.content.toLowerCase().includes(lc)
      );
    }

    return result;
  }, [prompts, courseFilter, templateFilter, search]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prompts de IA</h1>
          <p className="text-sm text-white/40 mt-1">
            {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} · Gestión de instrucciones para asistentes de IA
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => router.push('/admin/prompts/new')}>
          + Nuevo Prompt
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={prompts.length} color="text-cyan-400" />
        <StatCard label="Plantillas" value={prompts.filter((p) => p.isTemplate).length} color="text-purple-400" />
        <StatCard label="Específicos" value={prompts.filter((p) => !p.isTemplate).length} color="text-emerald-400" />
        <StatCard
          label="Cursos con prompts"
          value={new Set(prompts.map((p) => p.courseId)).size}
          color="text-amber-400"
        />
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, tag o contenido..."
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg
                       text-sm text-white/80 placeholder:text-white/25
                       focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>

        {/* Course filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg
                     text-sm text-white/70 focus:outline-none focus:border-cyan-500/40 transition-colors"
        >
          <option value="all" className="bg-[#111]">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>
          ))}
        </select>

        {/* Template filter */}
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
          {(['all', 'templates', 'prompts'] as TemplateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTemplateFilter(f)}
              className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer
                ${templateFilter === f
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
            >
              {f === 'all' ? 'Todos' : f === 'templates' ? 'Plantillas' : 'Específicos'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Results ─── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🤖"
          title={prompts.length === 0 ? 'Sin prompts aún' : 'Sin resultados'}
          description={
            prompts.length === 0
              ? 'Crea tu primer prompt de IA para asignar a actividades'
              : 'Intenta cambiar los filtros o el término de búsqueda'
          }
          action={
            prompts.length === 0
              ? <Button variant="primary" size="sm" onClick={() => router.push('/admin/prompts/new')}>Crear Prompt</Button>
              : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-white/30">
            {filtered.length} de {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                id={p.id}
                title={p.title}
                courseName={courseMap.get(p.courseId)}
                version={p.version}
                tags={p.tags}
                isTemplate={p.isTemplate}
                updatedAt={p.updatedAt}
                contentPreview={p.content.slice(0, 120)}
                onClick={() => router.push(`/admin/prompts/${p.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

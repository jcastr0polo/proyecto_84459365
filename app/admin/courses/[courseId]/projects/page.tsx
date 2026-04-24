'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import { Rocket, Star, Eye, EyeOff, Ban, Image, FileText } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { StudentProject, Course } from '@/lib/types';

type EnrichedProject = StudentProject & { studentName: string; courseName: string };

/**
 * Admin — Proyectos del Curso
 * Fase 19 — Lista de proyectos, toggle destacar, links directos
 */
export default function AdminCourseProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, courseRes] = await Promise.all([
        fetch(`/api/projects?courseId=${courseId}`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects ?? []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data.course ?? null);
      }
    } catch {
      toast('Error al cargar proyectos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFeatured = useCallback(async (project: EnrichedProject) => {
    setTogglingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !project.isFeatured }),
      });

      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id ? { ...p, isFeatured: !p.isFeatured } : p
          )
        );
        toast(
          project.isFeatured ? 'Proyecto removido de destacados' : 'Proyecto destacado',
          'success'
        );
      } else {
        toast('Error al actualizar', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setTogglingId(null);
    }
  }, [toast]);

  const updateProject = useCallback(async (projectId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setProjects((prev) =>
          prev.map((p) => p.id === projectId ? { ...p, ...data.project } : p)
        );
        toast('Proyecto actualizado', 'success');
        return true;
      } else {
        toast('Error al actualizar', 'error');
        return false;
      }
    } catch {
      toast('Error de conexión', 'error');
      return false;
    }
  }, [toast]);

  const updateStatus = useCallback(async (project: EnrichedProject, status: string) => {
    await updateProject(project.id, { status });
  }, [updateProject]);

  const togglePublic = useCallback(async (project: EnrichedProject) => {
    await updateProject(project.id, { isPublic: !project.isPublic });
  }, [updateProject]);

  const toggleBlockShowcase = useCallback(async (project: EnrichedProject) => {
    await updateProject(project.id, { isBlockedFromShowcase: !project.isBlockedFromShowcase });
  }, [updateProject]);

  // Document viewing
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const handleViewDoc = useCallback(async (projectId: string) => {
    if (viewingDocId === projectId) {
      setViewingDocId(null);
      return;
    }
    setViewingDocId(projectId);
    setDocContent(null);
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/document`);
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? 'No se pudo cargar el documento', 'error');
        setViewingDocId(null);
      }
    } catch {
      toast('Error de conexión', 'error');
      setViewingDocId(null);
    } finally {
      setLoadingDoc(false);
    }
  }, [viewingDocId, toast]);

  // Showcase editing
  const [editingShowcase, setEditingShowcase] = useState<string | null>(null);
  const [showcaseDesc, setShowcaseDesc] = useState('');
  const [showcaseImg, setShowcaseImg] = useState('');

  const openShowcaseEdit = (p: EnrichedProject) => {
    setEditingShowcase(p.id);
    setShowcaseDesc(p.showcaseDescription ?? '');
    setShowcaseImg(p.showcaseImageUrl ?? '');
  };

  const saveShowcase = async () => {
    if (!editingShowcase) return;
    const ok = await updateProject(editingShowcase, {
      showcaseDescription: showcaseDesc,
      showcaseImageUrl: showcaseImg,
    });
    if (ok) setEditingShowcase(null);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver al curso
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Proyectos Estudiantiles</h1>
          <p className="text-sm text-subtle mt-1">
            {course?.name ?? 'Curso'} · {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <StatPill label="Total" value={projects.length} color="text-cyan-400" />
          <StatPill label="Destacados" value={projects.filter((p) => p.isFeatured).length} color="text-amber-400" />
          <StatPill label="Públicos" value={projects.filter((p) => p.isPublic).length} color="text-emerald-400" />
        </div>
      </div>

      {/* ─── Projects Grid ─── */}
      {projects.length === 0 ? (
        <EmptyState
          icon={<Rocket className="w-8 h-8 text-subtle" />}
          title="Sin proyectos registrados"
          description="Los estudiantes aún no han registrado sus proyectos en este curso"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-xl border p-5 transition-all ${
                p.isFeatured
                  ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-transparent'
                  : 'border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.04]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{p.projectName}</h3>
                  <p className="text-xs text-subtle mt-0.5">{p.studentName}</p>
                </div>
                <button
                  onClick={() => toggleFeatured(p)}
                  disabled={togglingId === p.id}
                  className={`flex-shrink-0 p-2 rounded-lg border transition-all cursor-pointer ${
                    p.isFeatured
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-foreground/[0.08] text-faint hover:text-amber-400 hover:border-amber-500/20'
                  } ${togglingId === p.id ? 'opacity-50' : ''}`}
                  title={p.isFeatured ? 'Quitar destacado' : 'Destacar proyecto'}
                >
                  <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <StatusBadge status={p.status} />
                {p.isPublic && <Badge variant="info" size="sm">Público</Badge>}
                {p.isFeatured && <Badge variant="success" size="sm">Destacado</Badge>}
                {p.isBlockedFromShowcase && <Badge variant="danger" size="sm">Bloqueado</Badge>}
                {p.documentUrl && <Badge variant="neutral" size="sm"><FileText className="w-3 h-3 inline" /> Doc</Badge>}
              </div>

              {/* Description */}
              {p.description && (
                <p className="text-xs text-subtle mt-2 line-clamp-2">{p.description}</p>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-2 mt-3">
                <ExternalLink href={p.githubUrl} label="GitHub" />
                {p.vercelUrl && <ExternalLink href={p.vercelUrl} label="Vercel" />}
                {p.figmaUrl && <ExternalLink href={p.figmaUrl} label="Figma" />}
              </div>

              {/* Admin controls */}
              <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-foreground/[0.06]">
                {/* Public toggle */}
                <button
                  onClick={() => togglePublic(p)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    p.isPublic
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-faint hover:text-muted hover:bg-foreground/[0.05]'
                  }`}
                  title={p.isPublic ? 'Quitar de vitrina' : 'Publicar en vitrina'}
                >
                  {p.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {p.isPublic ? 'Público' : 'Privado'}
                </button>

                {/* Block from showcase */}
                <button
                  onClick={() => toggleBlockShowcase(p)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    p.isBlockedFromShowcase
                      ? 'bg-red-500/10 text-red-400'
                      : 'text-faint hover:text-muted hover:bg-foreground/[0.05]'
                  }`}
                  title={p.isBlockedFromShowcase ? 'Desbloquear vitrina' : 'Bloquear de vitrina'}
                >
                  <Ban className="w-3 h-3" />
                  {p.isBlockedFromShowcase ? 'Desbloq' : 'Bloq'}
                </button>

                {/* Edit showcase appearance */}
                <button
                  onClick={() => openShowcaseEdit(p)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                  title="Editar apariencia en vitrina"
                >
                  <Image className="w-3 h-3" />
                  Vitrina
                </button>

                {/* View document */}
                {p.documentUrl && (
                  <button
                    onClick={() => handleViewDoc(p.id)}
                    disabled={loadingDoc && viewingDocId === p.id}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                      viewingDocId === p.id
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'text-faint hover:text-violet-400 hover:bg-violet-500/10'
                    } ${loadingDoc && viewingDocId === p.id ? 'opacity-50' : ''}`}
                    title="Ver documento del proyecto"
                  >
                    <FileText className="w-3 h-3" />
                    {viewingDocId === p.id ? 'Ocultar Doc' : 'Ver Doc'}
                  </button>
                )}
              </div>

              {/* Document viewer inline */}
              {viewingDocId === p.id && (
                <div className="mt-3 p-4 rounded-lg bg-foreground/[0.03] border border-foreground/[0.08]">
                  {loadingDoc ? (
                    <p className="text-xs text-subtle animate-pulse">Cargando documento...</p>
                  ) : docContent ? (
                    <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">{docContent}</pre>
                  ) : (
                    <p className="text-xs text-faint">No se pudo cargar el contenido</p>
                  )}
                </div>
              )}

              {/* Showcase edit inline */}
              {editingShowcase === p.id && (
                <div className="mt-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.08] space-y-2">
                  <label className="text-[10px] text-subtle block">Descripción para vitrina</label>
                  <textarea
                    value={showcaseDesc}
                    onChange={(e) => setShowcaseDesc(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Descripción personalizada para la vitrina..."
                    className="w-full px-2 py-1.5 text-xs bg-foreground/[0.04] border border-foreground/[0.08] rounded text-foreground placeholder:text-faint focus:outline-none focus:border-cyan-500/30"
                  />
                  <label className="text-[10px] text-subtle block">URL imagen vitrina</label>
                  <input
                    type="url"
                    value={showcaseImg}
                    onChange={(e) => setShowcaseImg(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 text-xs bg-foreground/[0.04] border border-foreground/[0.08] rounded text-foreground placeholder:text-faint focus:outline-none focus:border-cyan-500/30"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveShowcase}
                      className="text-[10px] px-3 py-1 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingShowcase(null)}
                      className="text-[10px] px-3 py-1 rounded text-faint hover:text-muted transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Status control */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/[0.06]">
                <span className="text-[10px] text-faint">Estado:</span>
                {(['in-progress', 'submitted', 'reviewed', 'featured'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(p, s)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      p.status === s
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'text-faint hover:text-muted'
                    }`}
                  >
                    {s === 'in-progress' ? 'En progreso' : s === 'submitted' ? 'Entregado' : s === 'reviewed' ? 'Revisado' : 'Destacado'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
    'in-progress': 'warning',
    submitted: 'info',
    reviewed: 'success',
    featured: 'success',
  };
  const labels: Record<string, string> = {
    'in-progress': 'En progreso',
    submitted: 'Entregado',
    reviewed: 'Revisado',
    featured: 'Destacado',
  };
  return <Badge variant={variants[status] ?? 'neutral'} size="sm">{labels[status] ?? status}</Badge>;
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
                 bg-foreground/[0.04] border border-foreground/[0.08] text-muted
                 hover:bg-foreground/[0.08] hover:text-foreground/80 hover:border-foreground/[0.15]
                 transition-all"
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.03] border border-foreground/[0.06]">
      <span className={`font-bold ${color}`}>{value}</span>
      <span className="text-subtle">{label}</span>
    </div>
  );
}

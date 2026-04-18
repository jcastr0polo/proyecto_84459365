'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Star, Pencil, Rocket } from 'lucide-react';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { StudentProject, Course } from '@/lib/types';

/**
 * Estudiante — Mi Proyecto del Curso
 * Fase 19 — Registro y edición de proyecto fullstack
 * Si no tiene proyecto → formulario de registro
 * Si ya tiene → vista con botón de editar
 */
export default function StudentProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [project, setProject] = useState<(StudentProject & { courseName?: string }) | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [vercelUrl, setVercelUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, courseRes] = await Promise.all([
        fetch(`/api/projects?courseId=${courseId}`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        const myProject = data.projects?.[0] ?? null;
        setProject(myProject);
        if (myProject) {
          setProjectName(myProject.projectName);
          setDescription(myProject.description ?? '');
          setGithubUrl(myProject.githubUrl);
          setVercelUrl(myProject.vercelUrl ?? '');
          setFigmaUrl(myProject.figmaUrl ?? '');
          setIsPublic(myProject.isPublic);
        }
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data.course ?? null);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isGithubValid = useMemo(() => githubUrl.startsWith('https://github.com/'), [githubUrl]);
  const isVercelValid = useMemo(() => {
    if (!vercelUrl) return true;
    try {
      const u = new URL(vercelUrl);
      return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
    } catch { return false; }
  }, [vercelUrl]);
  const isFormValid = useMemo(
    () => projectName.trim().length >= 1 && isGithubValid && isVercelValid,
    [projectName, isGithubValid, isVercelValid]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || saving) return;
    setSaving(true);

    const body = {
      courseId,
      projectName: projectName.trim(),
      description: description.trim() || undefined,
      githubUrl,
      vercelUrl: vercelUrl || undefined,
      figmaUrl: figmaUrl || undefined,
      isPublic,
    };

    try {
      let res: Response;
      if (project) {
        res = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setEditMode(false);
        toast(project ? 'Proyecto actualizado' : 'Proyecto registrado exitosamente', 'success');
      } else {
        const err = await res.json();
        toast(err.error ?? 'Error al guardar', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  }, [isFormValid, saving, courseId, projectName, description, githubUrl, vercelUrl, figmaUrl, isPublic, project, toast]);

  if (loading) return <PageLoader />;

  const showForm = !project || editMode;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/student/courses/${courseId}`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver al curso
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Mi Proyecto</h1>
        <p className="text-sm text-subtle mt-1">{course?.name ?? 'Curso'}</p>
      </div>

      {/* ─── View Mode ─── */}
      {project && !editMode && (
        <Card padding="lg">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{project.projectName}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={project.status} />
                  {project.isPublic && <Badge variant="info" size="sm">Público</Badge>}
                  {project.isFeatured && <Badge variant="success" size="sm"><Star className="w-3 h-3 inline fill-current" /> Destacado</Badge>}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="w-4 h-4 inline mr-1" /> Editar
              </Button>
            </div>

            {project.description && (
              <p className="text-sm text-muted leading-relaxed">{project.description}</p>
            )}

            {/* Links */}
            <div className="space-y-2">
              <LinkRow icon="github" label="GitHub" url={project.githubUrl} />
              {project.vercelUrl && <LinkRow icon="vercel" label="Vercel" url={project.vercelUrl} />}
              {project.figmaUrl && <LinkRow icon="figma" label="Figma" url={project.figmaUrl} />}
            </div>

            {/* Preview card */}
            {project.isPublic && (
              <div className="mt-6 pt-6 border-t border-foreground/[0.06]">
                <p className="text-[11px] text-subtle uppercase tracking-wider mb-3">
                  Vista previa en la Vitrina
                </p>
                <ShowcasePreview
                  projectName={project.projectName}
                  description={project.description}
                  githubUrl={project.githubUrl}
                  vercelUrl={project.vercelUrl}
                  courseName={course?.name}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Form Mode ─── */}
      {showForm && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-cyan-400" />
                {project ? 'Editar Proyecto' : 'Registrar Proyecto'}
              </span>
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project name */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Nombre del Proyecto *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ej: Mi Portafolio Web"
                className="w-full px-3 py-2.5 bg-foreground/[0.04] border border-foreground/[0.08] rounded-lg text-sm text-foreground/90 placeholder:text-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción de tu proyecto..."
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2.5 bg-foreground/[0.04] border border-foreground/[0.08] rounded-lg text-sm text-foreground/80 placeholder:text-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-y"
              />
              <p className="text-[10px] text-faint mt-1">{description.length}/1000</p>
            </div>

            {/* GitHub URL */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                URL de GitHub *
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/tu-usuario/tu-proyecto"
                className={`w-full px-3 py-2.5 bg-foreground/[0.04] border rounded-lg text-sm text-foreground/90 placeholder:text-faint focus:outline-none focus:ring-1 transition-colors ${
                  githubUrl && !isGithubValid
                    ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20'
                    : 'border-foreground/[0.08] focus:border-cyan-500/40 focus:ring-cyan-500/20'
                }`}
                required
              />
              {githubUrl && !isGithubValid && (
                <p className="text-[11px] text-red-400 mt-1">Debe empezar con https://github.com/</p>
              )}
            </div>

            {/* Vercel URL */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                URL de Vercel (opcional)
              </label>
              <input
                type="url"
                value={vercelUrl}
                onChange={(e) => setVercelUrl(e.target.value)}
                placeholder="https://tu-proyecto.vercel.app"
                className={`w-full px-3 py-2.5 bg-foreground/[0.04] border rounded-lg text-sm text-foreground/90 placeholder:text-faint focus:outline-none focus:ring-1 transition-colors ${
                  vercelUrl && !isVercelValid
                    ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20'
                    : 'border-foreground/[0.08] focus:border-cyan-500/40 focus:ring-cyan-500/20'
                }`}
              />
              {vercelUrl && !isVercelValid && (
                <p className="text-[11px] text-red-400 mt-1">Debe ser HTTPS y terminar en .vercel.app</p>
              )}
            </div>

            {/* Figma URL */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                URL de Figma (opcional)
              </label>
              <input
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://figma.com/file/..."
                className="w-full px-3 py-2.5 bg-foreground/[0.04] border border-foreground/[0.08] rounded-lg text-sm text-foreground/90 placeholder:text-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* Public toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
              <label className="flex items-center gap-2.5 cursor-pointer group flex-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-foreground/[0.08] rounded-full peer-checked:bg-cyan-500/30 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-foreground/40 rounded-full shadow peer-checked:translate-x-4 peer-checked:bg-cyan-400 transition-all" />
                </div>
                <div>
                  <span className="text-sm text-muted group-hover:text-foreground/90 transition-colors">
                    Compartir en vitrina pública
                  </span>
                  <p className="text-[10px] text-subtle">
                    Tu proyecto será visible para cualquier visitante (requiere aprobación del docente)
                  </p>
                </div>
              </label>
            </div>

            {/* Preview */}
            {isPublic && projectName && (
              <div>
                <p className="text-[11px] text-subtle uppercase tracking-wider mb-3">
                  Vista previa en la Vitrina
                </p>
                <ShowcasePreview
                  projectName={projectName}
                  description={description || undefined}
                  githubUrl={githubUrl || 'https://github.com/...'}
                  vercelUrl={vercelUrl || undefined}
                  courseName={course?.name}
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-foreground/[0.06]">
              {editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="text-sm text-subtle hover:text-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <div className={editMode ? '' : 'ml-auto'}>
                <Button variant="primary" size="md" loading={saving} disabled={!isFormValid || saving}>
                  {project ? 'Actualizar Proyecto' : 'Registrar Proyecto'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
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

function LinkRow({ icon, label, url }: { icon: string; label: string; url: string }) {
  const icons: Record<string, React.ReactNode> = {
    github: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    vercel: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L24 22H0L12 1Z" />
      </svg>
    ),
    figma: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5zM12 2h3.5a3.5 3.5 0 1 1 0 7H12V2zm0 7h3.5a3.5 3.5 0 1 1 0 7H12V9zm-3.5 7A3.5 3.5 0 1 0 12 19.5V16H8.5zm0-7A3.5 3.5 0 0 0 12 12.5V9H8.5a3.5 3.5 0 0 0 0 7z" />
      </svg>
    ),
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] hover:bg-foreground/[0.06] hover:border-foreground/[0.12] transition-all group"
    >
      <div className="text-subtle group-hover:text-cyan-400 transition-colors">
        {icons[icon]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-subtle">{label}</p>
        <p className="text-sm text-foreground/80 group-hover:text-foreground truncate">{url}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint group-hover:text-cyan-400 shrink-0">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

function ShowcasePreview({
  projectName,
  description,
  vercelUrl,
  courseName,
}: {
  projectName: string;
  description?: string;
  githubUrl: string;
  vercelUrl?: string;
  courseName?: string;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-foreground/[0.08] bg-gradient-to-br from-white/[0.04] via-transparent to-cyan-500/[0.03] p-5 max-w-sm">
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
      <div className="relative">
        {courseName && (
          <p className="text-[10px] text-cyan-400/60 uppercase tracking-wider mb-2">{courseName}</p>
        )}
        <h3 className="text-sm font-semibold text-foreground">{projectName}</h3>
        {description && (
          <p className="text-xs text-subtle mt-1 line-clamp-2">{description}</p>
        )}
        <div className="flex gap-2 mt-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-foreground/[0.06] text-muted">
            GitHub
          </span>
          {vercelUrl && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-cyan-500/10 text-cyan-400/70">
              Vercel
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

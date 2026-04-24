'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, FileText, CheckCircle2, Clock,
  AlertCircle, ExternalLink, FolderGit2, ChevronDown, ChevronRight,
  Paperclip, Link as LinkIcon, Eye, Download, GitBranch, Palette,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

/* ─── Types ─── */
interface SubmissionAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

interface SubmissionLink {
  url: string;
  label?: string;
  type: string;
}

interface StudentSubmission {
  id: string;
  status: string;
  version: number;
  submittedAt: string;
  updatedAt: string;
  isLate: boolean;
  content: string | null;
  attachments: SubmissionAttachment[];
  links: SubmissionLink[];
}

interface ActivityRow {
  id: string;
  title: string;
  type: string;
  category: string;
  dueDate: string;
  weight: number;
  status: string;
  submission: StudentSubmission | null;
}

interface ProjectInfo {
  id: string;
  projectName: string;
  githubUrl: string;
  vercelUrl?: string;
  status: string;
  isPublic: boolean;
  documentUrl?: string;
}

interface CourseDetail {
  id: string;
  code: string;
  name: string;
  category: string;
  enrolledAt: string;
  activities: ActivityRow[];
  totalActivities: number;
  submitted: number;
  pending: number;
  project: ProjectInfo | null;
  grades: {
    finalGrade: number | null;
    activityGrades: { activityId: string; score: number | null; published: boolean }[];
  } | null;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  isActive: boolean;
  lastLoginAt?: string | null;
}

/* ─── Main Page ─── */
export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [courses, setCourses] = useState<CourseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/students/${params.id}/detail`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al cargar datos');
        return;
      }
      const data = await res.json();
      setStudent(data.student);
      setCourses(data.courses ?? []);
      // Expand all courses by default
      setExpandedCourses(new Set((data.courses ?? []).map((c: CourseDetail) => c.id)));
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const toggleActivity = (actId: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId); else next.add(actId);
      return next;
    });
  };

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8 text-red-400" />}
          title="Error"
          description={error}
        />
      </div>
    );
  }
  if (!student) return null;

  const totalActivities = courses.reduce((a, c) => a + c.totalActivities, 0);
  const totalSubmitted = courses.reduce((a, c) => a + c.submitted, 0);
  const totalPending = courses.reduce((a, c) => a + c.pending, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/admin/students')}
        className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a estudiantes
      </button>

      {/* Student Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl border border-foreground/10 bg-foreground/5"
      >
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
            student.isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
                {student.firstName} {student.lastName}
              </h1>
              {!student.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
            </div>
            <p className="text-sm text-subtle mt-0.5">{student.email}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-faint">
              <span>Doc: {student.documentNumber}</span>
              <span>Último login: {student.lastLoginAt ? formatDate(student.lastLoginAt) : 'Nunca'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Cursos', value: courses.length, color: 'text-cyan-400', icon: BookOpen },
          { label: 'Actividades', value: totalActivities, color: 'text-purple-400', icon: FileText },
          { label: 'Entregadas', value: totalSubmitted, color: 'text-emerald-400', icon: CheckCircle2 },
          { label: 'Pendientes', value: totalPending, color: 'text-amber-400', icon: Clock },
          { label: 'Proyectos', value: courses.filter((c) => c.project).length, color: 'text-blue-400', icon: FolderGit2 },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl border border-foreground/10 bg-foreground/5 text-center">
            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-faint uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Courses */}
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-subtle" />}
          title="Sin cursos"
          description="Este estudiante no está inscrito en ningún curso"
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-subtle uppercase tracking-wider">
            Cursos Inscritos ({courses.length})
          </h2>
          {courses.map((course) => (
            <CourseSection
              key={course.id}
              course={course}
              expanded={expandedCourses.has(course.id)}
              onToggle={() => toggleCourse(course.id)}
              expandedActivities={expandedActivities}
              onToggleActivity={toggleActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Course Section ─── */
function CourseSection({
  course, expanded, onToggle, expandedActivities, onToggleActivity,
}: {
  course: CourseDetail;
  expanded: boolean;
  onToggle: () => void;
  expandedActivities: Set<string>;
  onToggleActivity: (id: string) => void;
}) {
  const progress = course.totalActivities > 0
    ? Math.round((course.submitted / course.totalActivities) * 100) : 0;

  return (
    <Card padding="none">
      {/* Course Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-foreground/[0.02] transition-colors cursor-pointer"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-subtle shrink-0" /> : <ChevronRight className="w-4 h-4 text-subtle shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{course.name}</span>
            <Badge variant="neutral" size="sm">{course.code}</Badge>
            <Badge variant="info" size="sm">{course.category}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-subtle">
            <span>{course.totalActivities} actividades</span>
            <span className="text-emerald-400">{course.submitted} entregadas</span>
            {course.pending > 0 && <span className="text-amber-400">{course.pending} pendientes</span>}
            {course.grades?.finalGrade !== null && course.grades?.finalGrade !== undefined && (
              <span className={`font-medium ${course.grades.finalGrade >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>
                Nota: {course.grades.finalGrade.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-20 shrink-0">
          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-400' : progress > 0 ? 'bg-cyan-400' : 'bg-foreground/10'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-faint text-center mt-0.5">{progress}%</p>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-foreground/[0.06] p-4 space-y-4">
          {/* Nav to admin course pages */}
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/courses/${course.id}/activities`}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver actividades del curso
            </Link>
            <Link href={`/admin/courses/${course.id}/grades`}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver notas del curso
            </Link>
          </div>

          {/* Activities — interactive rows */}
          {course.activities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-subtle uppercase tracking-wider">Actividades</h4>
              {course.activities.map((act) => {
                const grade = course.grades?.activityGrades?.find((g) => g.activityId === act.id);
                const isActExpanded = expandedActivities.has(act.id);
                const sub = act.submission;

                return (
                  <div key={act.id} className="rounded-lg border border-foreground/[0.06] overflow-hidden">
                    {/* Activity row — clickable if has submission */}
                    <button
                      onClick={() => sub ? onToggleActivity(act.id) : undefined}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        sub ? 'cursor-pointer hover:bg-foreground/[0.03]' : 'cursor-default'
                      } ${isActExpanded ? 'bg-foreground/[0.03]' : ''}`}
                    >
                      <div className="w-4 shrink-0">
                        {sub && (isActExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-subtle" />
                          : <ChevronRight className="w-3.5 h-3.5 text-faint" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-foreground/80 truncate">{act.title}</span>
                          <Badge variant="neutral" size="sm">{TYPE_LABEL[act.type] ?? act.type}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-faint">
                          <span>Límite: {formatDate(act.dueDate)}</span>
                          <span>Peso: {act.weight}%</span>
                          {sub && sub.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" /> {sub.attachments.length}</span>
                          )}
                          {sub && sub.links.length > 0 && (
                            <span className="flex items-center gap-0.5"><LinkIcon className="w-3 h-3" /> {sub.links.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <SubmissionBadge submission={sub} />
                        {grade?.published && grade.score !== null ? (
                          <span className={`text-xs font-semibold ${grade.score >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {grade.score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-faint w-7 text-center">—</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded submission detail */}
                    {isActExpanded && sub && (
                      <div className="border-t border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-subtle">
                          <span>Enviado: {formatDateTime(sub.submittedAt)}</span>
                          <span>Versión: v{sub.version}</span>
                          {sub.isLate && <Badge variant="danger" size="sm">Tardía</Badge>}
                          <Link
                            href={`/admin/courses/${course.id}/activities/${act.id}/submissions`}
                            className="text-cyan-400 hover:underline flex items-center gap-1 ml-auto"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver todas las entregas
                          </Link>
                        </div>

                        {sub.content && (
                          <div className="p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                            <p className="text-[11px] text-faint uppercase tracking-wider mb-1.5">Comentario</p>
                            <p className="text-sm text-muted whitespace-pre-wrap">{sub.content}</p>
                          </div>
                        )}

                        {sub.attachments.length > 0 && (
                          <div>
                            <p className="text-[11px] text-faint uppercase tracking-wider mb-2">Archivos ({sub.attachments.length})</p>
                            <div className="space-y-1.5">
                              {sub.attachments.map((att) => {
                                const canPreview = /\.(md|txt)$/i.test(att.fileName);
                                const downloadUrl = att.filePath.startsWith('http')
                                  ? `/api/upload/download?url=${encodeURIComponent(att.filePath)}`
                                  : `/api/upload/${att.filePath.replace('uploads/', '')}`;
                                const viewerUrl = `/admin/viewer?url=${encodeURIComponent(att.filePath)}&name=${encodeURIComponent(att.fileName)}`;

                                return (
                                  <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] group">
                                    <Paperclip className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-foreground/80 truncate">{att.fileName}</p>
                                      <p className="text-[10px] text-faint">{formatFileSize(att.fileSize)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {canPreview && (
                                        <Link href={viewerUrl} className="p-1.5 rounded text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Ver documento">
                                          <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                      )}
                                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 rounded text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Descargar">
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {sub.links.length > 0 && (
                          <div>
                            <p className="text-[11px] text-faint uppercase tracking-wider mb-2">Enlaces ({sub.links.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {sub.links.map((link, i) => (
                                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]
                                           hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] text-xs text-muted hover:text-cyan-400 transition-all"
                                >
                                  {LINK_ICON[link.type] ?? <LinkIcon className="w-3.5 h-3.5" />}
                                  {link.label || link.type || 'Enlace'}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {!sub.content && sub.attachments.length === 0 && sub.links.length === 0 && (
                          <p className="text-xs text-faint italic">Entrega sin contenido adjunto</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Project */}
          {course.project && (
            <div>
              <h4 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Proyecto</h4>
              <div className="p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                <div className="flex items-start gap-3">
                  <FolderGit2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80">{course.project.projectName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <ProjectStatusBadge status={course.project.status} />
                      {course.project.isPublic && <Badge variant="info" size="sm">Público</Badge>}
                      {course.project.documentUrl && <Badge variant="success" size="sm">Doc. cargado</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <a href={course.project.githubUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-cyan-400 hover:underline">
                        <GitBranch className="w-3 h-3" /> GitHub
                      </a>
                      {course.project.vercelUrl && (
                        <a href={course.project.vercelUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:underline">
                          <ExternalLink className="w-3 h-3" /> Vercel
                        </a>
                      )}
                      {course.project.documentUrl && (
                        <Link
                          href={`/admin/viewer?url=${encodeURIComponent(course.project.documentUrl)}&name=${encodeURIComponent(course.project.projectName + '.md')}`}
                          className="flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          <Eye className="w-3 h-3" /> Ver documento
                        </Link>
                      )}
                      <Link href={`/admin/courses/${course.id}/projects`}
                        className="flex items-center gap-1 text-cyan-400 hover:underline ml-auto">
                        <ExternalLink className="w-3 h-3" /> Ir a proyectos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!course.project && (
            <div className="text-xs text-faint flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5" /> Sin proyecto registrado
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Helpers ─── */

const TYPE_LABEL: Record<string, string> = {
  project: 'Proyecto', exercise: 'Ejercicio', document: 'Documento',
  presentation: 'Presentación', prompt: 'Prompt', exam: 'Examen', other: 'Otro',
};

const LINK_ICON: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  vercel: <span className="text-xs">▲</span>,
  figma: <Palette className="w-3.5 h-3.5" />,
};

function SubmissionBadge({ submission }: { submission: StudentSubmission | null }) {
  if (!submission) return <Badge variant="warning" size="sm">Pendiente</Badge>;
  const map: Record<string, { variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    submitted: { variant: 'success', label: 'Enviada' },
    reviewed: { variant: 'info', label: 'Revisada' },
    returned: { variant: 'warning', label: 'Devuelta' },
    resubmitted: { variant: 'info', label: 'Re-enviada' },
  };
  const cfg = map[submission.status] ?? { variant: 'neutral' as const, label: submission.status };
  return (
    <Badge variant={cfg.variant} size="sm">
      {cfg.label}{submission.isLate && ' (tardía)'}
    </Badge>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'info' | 'warning' | 'neutral'; label: string }> = {
    'in-progress': { variant: 'warning', label: 'En progreso' },
    completed: { variant: 'success', label: 'Completado' },
    approved: { variant: 'info', label: 'Aprobado' },
  };
  const cfg = map[status] ?? { variant: 'neutral' as const, label: status };
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

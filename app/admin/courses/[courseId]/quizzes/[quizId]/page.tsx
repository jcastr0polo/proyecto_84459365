'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import QuizForm from '@/components/quizzes/QuizForm';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Quiz, Course, QuizAttempt } from '@/lib/types';
import type { QuestionData } from '@/components/quizzes/QuestionEditor';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { Pencil, Trash2, Eye, EyeOff, Clock, Shield, Users, AlertTriangle, PlayCircle, PauseCircle, BarChart3, FlaskConical } from 'lucide-react';

export default function AdminQuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<{ totalAttempts: number; uniqueStudents: number; flaggedCount: number; avgScore: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/quizzes/${quizId}`),
        fetch(`/api/courses/${courseId}`),
      ]);
      if (qRes.ok) {
        const data = await qRes.json();
        setQuiz(data.quiz);
        setStats(data.stats ?? null);
      } else {
        toast('Parcial no encontrado', 'error');
        router.push(`/admin/courses/${courseId}/quizzes`);
        return;
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setCourse(data.course);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleEdit(data: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al editar', 'error');
        return;
      }
      toast('Parcial actualizado', 'success');
      setEditModalOpen(false);
      await fetchData();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive() {
    if (!quiz) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !quiz.isActive }),
      });
      if (res.ok) {
        toast(quiz.isActive ? 'Parcial desactivado' : 'Parcial activado', 'success');
        await fetchData();
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setToggling(false);
    }
  }

  async function toggleResults() {
    if (!quiz) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released: !quiz.resultsReleased }),
      });
      if (res.ok) {
        toast(quiz.resultsReleased ? 'Resultados ocultos' : 'Resultados publicados', 'success');
        await fetchData();
      }
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Parcial eliminado', 'success');
        router.push(`/admin/courses/${courseId}/quizzes`);
      }
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  if (loading || !quiz) return <PageLoader />;

  const totalPoints = quiz.questions.reduce((s, q) => s + q.points, 0);

  const editInitial = {
    title: quiz.title,
    description: quiz.description,
    type: quiz.type,
    resultVisibility: quiz.resultVisibility,
    timeLimit: quiz.timeLimit ?? null,
    lockBrowser: quiz.lockBrowser,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    maxAttempts: quiz.maxAttempts,
    startDate: quiz.startDate,
    endDate: quiz.endDate,
    weight: quiz.weight,
    corteId: quiz.corteId,
    maxScore: quiz.maxScore,
    questions: quiz.questions.map((q): QuestionData => ({
      text: q.text,
      type: q.type,
      points: q.points,
      options: q.options.map((o) => ({ text: o.text, weight: o.weight })),
    })),
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver a parciales
      </button>

      {course && <p className="text-xs text-subtle">{course.name} · <span className="font-mono">{course.code}</span></p>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{quiz.title}</h1>
            <Badge variant={quiz.type === 'training' ? 'warning' : 'success'} size="sm">
              {quiz.type === 'training' ? 'Entrenamiento' : 'Calificable'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <Badge variant={quiz.isActive ? 'success' : 'neutral'} size="sm" dot>
              {quiz.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            <span>{quiz.questions.length} preguntas · {totalPoints} pts</span>
            {quiz.timeLimit && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.timeLimit} min</span>}
            {quiz.lockBrowser && <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Anti-trampas</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={toggleActive} disabled={toggling}>
            {quiz.isActive ? <><PauseCircle className="w-4 h-4 mr-1" /> Desactivar</> : <><PlayCircle className="w-4 h-4 mr-1" /> Activar</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}/simulate`)} className="!text-purple-400 !border-purple-500/30 hover:!bg-purple-500/10">
            <FlaskConical className="w-4 h-4 mr-1" /> Simular
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Intentos" value={stats.totalAttempts} icon={<Users className="w-4 h-4 text-cyan-400" />} />
          <StatCard label="Estudiantes" value={stats.uniqueStudents} icon={<Users className="w-4 h-4 text-emerald-400" />} />
          <StatCard label="Promedio" value={`${stats.avgScore}%`} icon={<BarChart3 className="w-4 h-4 text-amber-400" />} />
          <StatCard label="Sospechosos" value={stats.flaggedCount} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quizId}/results`)}>
          <BarChart3 className="w-4 h-4 mr-1" /> Ver Resultados
        </Button>
        {quiz.resultVisibility === 'manual' && (
          <Button variant="secondary" size="sm" onClick={toggleResults}>
            {quiz.resultsReleased ? <><EyeOff className="w-4 h-4 mr-1" /> Ocultar Resultados</> : <><Eye className="w-4 h-4 mr-1" /> Publicar Resultados</>}
          </Button>
        )}
      </div>

      {/* Description */}
      {quiz.description && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Instrucciones</h3>
          <MarkdownRenderer content={quiz.description} className="text-sm text-muted leading-relaxed" />
        </Card>
      )}

      {/* Questions preview */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">
          Preguntas ({quiz.questions.length})
        </h3>
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xs font-bold text-faint shrink-0">{idx + 1}.</span>
                <div className="flex-1">
                  <MarkdownRenderer content={q.text} className="text-sm text-foreground/90 font-medium" />
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={q.type === 'single' ? 'info' : 'warning'} size="sm">
                      {q.type === 'single' ? 'Única' : 'Ponderada'}
                    </Badge>
                    <span className="text-xs text-subtle">{q.points} pts</span>
                  </div>
                </div>
              </div>
              <div className="ml-5 space-y-1">
                {q.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 text-xs">
                    {q.type === 'single' ? (
                      <span className={`w-3 h-3 rounded-full border ${opt.weight === 100 ? 'bg-emerald-400 border-emerald-400' : 'border-foreground/20'}`} />
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${opt.weight >= 80 ? 'bg-emerald-500/20 text-emerald-400' : opt.weight > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-foreground/[0.06] text-faint'}`}>{opt.weight}</span>
                    )}
                    <span className={opt.weight > 0 ? 'text-muted' : 'text-faint'}>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Parcial" size="lg">
        <QuizForm onSubmit={handleEdit} loading={submitting} courseId={courseId} initial={editInitial} />
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar parcial"
        message="¿Eliminar este parcial? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-subtle uppercase tracking-wider">{label}</p>
    </div>
  );
}

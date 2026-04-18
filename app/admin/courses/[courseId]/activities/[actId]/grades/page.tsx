'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GradeTable from '@/components/grades/GradeTable';
import type { GradeRow } from '@/components/grades/GradeTable';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { AlertTriangle } from 'lucide-react';

interface SubmissionData {
  id: string;
  studentId: string;
  courseId: string;
  attachments: { id: string }[];
  links: { id: string }[];
  isLate: boolean;
  submittedAt: string;
  version: number;
  status: string;
  student: { id: string; firstName: string; lastName: string; email: string };
}

interface ActivityData {
  id: string;
  title: string;
  maxScore: number;
  type: string;
}

interface GradeData {
  id: string;
  submissionId: string;
  score: number;
  feedback?: string;
}

/**
 * Admin — Rapid Grading Page
 * /admin/courses/[courseId]/activities/[actId]/grades
 *
 * Spreadsheet-like grading: score + feedback inline editing
 * Tab-key flow between inputs, batch save, publish grades
 */
export default function AdminGradingPage() {
  const params = useParams<{ courseId: string; actId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const courseId = params.courseId;
  const actId = params.actId;

  // Fetch submissions + existing grades
  useEffect(() => {
    async function load() {
      try {
        // Fetch activity info
        const actRes = await fetch(`/api/activities/${actId}`, { credentials: 'include' });
        if (!actRes.ok) throw new Error('No se pudo cargar la actividad');
        const actData = await actRes.json();
        setActivity(actData.activity ?? actData);

        // Fetch submissions
        const subRes = await fetch(`/api/activities/${actId}/submissions`, { credentials: 'include' });
        if (!subRes.ok) throw new Error('No se pudieron cargar las entregas');
        const subData = await subRes.json();
        const submissions: SubmissionData[] = subData.submissions ?? subData;

        // Fetch existing grades
        const gradesRes = await fetch(`/api/courses/${courseId}/grades`, { credentials: 'include' });
        const existingGrades: GradeData[] = [];
        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          // Admin gets CourseGradeSummary; extract grades for this activity
          if (gradesData.students) {
            for (const student of gradesData.students) {
              const g = student.grades?.[actId];
              if (g) {
                existingGrades.push({
                  id: g.id ?? '',
                  submissionId: '',
                  score: g.score,
                  feedback: g.feedback,
                });
              }
            }
          }
        }

        // Build rows
        const gradeRows: GradeRow[] = submissions.map((sub: SubmissionData) => {
          // Match grade from summary by student
          void existingGrades; // grades loaded per-submission below

          return {
            submissionId: sub.id,
            studentId: sub.studentId,
            studentName: `${sub.student.lastName}, ${sub.student.firstName}`,
            studentEmail: sub.student.email,
            attachmentsCount: sub.attachments?.length ?? 0,
            linksCount: sub.links?.length ?? 0,
            isLate: sub.isLate,
            submittedAt: sub.submittedAt,
            version: sub.version,
            score: null,
            feedback: '',
          };
        });

        // Now try to get existing grades per submission
        for (const row of gradeRows) {
          try {
            const gRes = await fetch(`/api/grades?submissionId=${row.submissionId}`, { credentials: 'include' });
            if (gRes.ok) {
              const gData = await gRes.json();
              if (gData.grade) {
                row.existingGradeId = gData.grade.id;
                row.score = gData.grade.score;
                row.feedback = gData.grade.feedback ?? '';
              }
            }
          } catch {
            // No existing grade — fine
          }
        }

        setRows(gradeRows);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error cargando datos', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [actId, courseId, toast]);

  // Save all modified rows
  const handleSaveAll = useCallback(async (modifiedRows: GradeRow[]) => {
    if (!activity || modifiedRows.length === 0) return;
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of modifiedRows) {
      if (row.score === null) continue;
      try {
        if (row.existingGradeId) {
          // Update existing
          const res = await fetch(`/api/grades/${row.existingGradeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ score: row.score, feedback: row.feedback || undefined }),
          });
          if (res.ok) successCount++;
          else errorCount++;
        } else {
          // Create new
          const res = await fetch('/api/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              submissionId: row.submissionId,
              activityId: actId,
              studentId: row.studentId,
              courseId: courseId,
              score: row.score,
              feedback: row.feedback || undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            row.existingGradeId = data.grade?.id;
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch {
        errorCount++;
      }
    }

    setSaving(false);
    if (errorCount === 0) {
      toast(`${successCount} calificación(es) guardada(s)`, 'success');
    } else {
      toast(`${successCount} guardadas, ${errorCount} error(es)`, 'error');
    }
  }, [activity, actId, courseId, toast]);

  // Save single row
  const handleSaveRow = useCallback(async (row: GradeRow) => {
    await handleSaveAll([row]);
  }, [handleSaveAll]);

  // Publish grades
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/activities/${actId}/grades/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al publicar');
      }
      const data = await res.json();
      toast(`${data.published} nota(s) publicada(s)`, 'success');
      setShowPublishModal(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al publicar', 'error');
    } finally {
      setPublishing(false);
    }
  }, [actId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs text-subtle hover:text-muted transition-colors mb-2 cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
            Calificar Entregas
          </h1>
          {activity && (
            <p className="text-sm text-muted mt-1">
              {activity.title} · Nota máxima: <span className="text-cyan-400 font-medium">{activity.maxScore}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/grades`)}
            className="px-4 py-2 text-sm border border-foreground/10 rounded-lg text-muted hover:text-foreground/80 hover:border-foreground/20 transition-colors cursor-pointer"
          >
            Ver Resumen del Curso
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/90 text-white hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            Publicar Notas
          </button>
        </div>
      </div>

      {/* Grade Table */}
      {rows.length > 0 ? (
        <GradeTable
          rows={rows}
          activityId={actId}
          courseId={courseId}
          maxScore={activity?.maxScore ?? 5}
          onSave={handleSaveRow}
          onSaveAll={handleSaveAll}
          saving={saving}
        />
      ) : (
        <div className="text-center py-16 text-subtle">
          <p className="text-lg mb-2">No hay entregas para calificar</p>
          <p className="text-sm">Los estudiantes aún no han realizado entregas para esta actividad.</p>
        </div>
      )}

      {/* Publish Modal */}
      <Modal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publicar Notas"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            ¿Publicar todas las notas de esta actividad? Los estudiantes podrán ver sus calificaciones
            y retroalimentación inmediatamente.
          </p>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Esta acción no se puede deshacer. Las notas ya publicadas no se pueden ocultar.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowPublishModal(false)}
              className="px-4 py-2 text-sm border border-foreground/10 rounded-lg text-muted hover:text-foreground/80 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {publishing ? 'Publicando...' : 'Confirmar Publicación'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

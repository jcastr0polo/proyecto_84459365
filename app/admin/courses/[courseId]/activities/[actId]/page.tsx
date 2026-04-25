'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import ActivityDetail from '@/components/activities/ActivityDetail';
import ActivityForm from '@/components/activities/ActivityForm';
import type { ActivityFormData } from '@/components/activities/ActivityForm';
import type { Activity, Course, ActivityAttachment, Submission, EnrollmentWithStudent } from '@/lib/types';

/**
 * Admin — Activity Detail Page
 * Full activity view with publish/close/edit actions and statistics
 */
export default function AdminActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const actId = params.actId as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [actRes, courseRes, subsRes, enrRes] = await Promise.all([
        fetch(`/api/activities/${actId}`),
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/activities/${actId}/submissions`),
        fetch(`/api/courses/${courseId}/enrollments`),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data.activity);
      } else {
        toast('Actividad no encontrada', 'error');
        router.push(`/admin/courses/${courseId}/activities`);
        return;
      }

      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data.course);
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubmissions(data.submissions ?? []);
      }

      if (enrRes.ok) {
        const data = await enrRes.json();
        setEnrollments(data.enrollments ?? []);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [actId, courseId, toast, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handlePublish() {
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/activities/${actId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('Actividad publicada', 'success');
        await fetchData();
      } else {
        toast(data.error || 'Error al publicar', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setPublishLoading(false);
    }
  }

  async function handleClose() {
    const confirmed = window.confirm('¿Cerrar esta actividad? Los estudiantes ya no podrán enviar entregas.');
    if (!confirmed) return;

    setCloseLoading(true);
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Actividad cerrada', 'success');
        await fetchData();
      } else {
        toast(data.error || 'Error al cerrar', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setCloseLoading(false);
    }
  }

  async function handleUploadFile(file: File): Promise<ActivityAttachment | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('destination', `activities/act-${actId}`);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Error al subir archivo', 'error');
        return null;
      }

      toast('Archivo subido', 'success');
      return data.attachment as ActivityAttachment;
    } catch {
      toast('Error de conexión', 'error');
      return null;
    }
  }

  async function handleEdit(data: ActivityFormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al actualizar', 'error');
        return;
      }

      toast('Actividad actualizada', 'success');
      if (result.warnings?.length > 0) {
        result.warnings.forEach((w: string) => toast(w, 'info'));
      }
      setEditModalOpen(false);
      await fetchData();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !activity) return <PageLoader />;

  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const submittedStudentIds = new Set(submissions.map((s) => s.studentId));
  const pendingStudents = activeEnrollments.filter((e) => !submittedStudentIds.has(e.studentId));

  const stats = {
    submitted: submissions.length,
    pending: pendingStudents.length,
    late: submissions.filter((s) => s.isLate).length,
    total: activeEnrollments.length,
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/activities`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a actividades
      </button>

      {course && (
        <p className="text-xs text-subtle">
          {course.name} · <span className="font-mono">{course.code}</span>
        </p>
      )}

      <ActivityDetail
        activity={activity}
        isAdmin
        onPublish={activity.status === 'draft' ? handlePublish : undefined}
        onClose={activity.status === 'published' ? handleClose : undefined}
        onEdit={() => setEditModalOpen(true)}
        onViewSubmissions={() => {
          router.push(`/admin/courses/${courseId}/activities/${actId}/submissions`);
        }}
        onGrade={() => {
          router.push(`/admin/courses/${courseId}/activities/${actId}/grades`);
        }}
        publishLoading={publishLoading}
        closeLoading={closeLoading}
        stats={stats}
      />

      {/* ─── Pending students (who hasn't submitted) ─── */}
      {pendingStudents.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Sin entrega ({pendingStudents.length})
            </h3>
            <Badge variant="warning" size="sm">{pendingStudents.length} pendiente{pendingStudents.length !== 1 ? 's' : ''}</Badge>
          </div>
          <div className="divide-y divide-foreground/[0.06]">
            {pendingStudents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                  {e.student.firstName[0]}{e.student.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground/80 truncate">{e.student.firstName} {e.student.lastName}</p>
                  <p className="text-[11px] text-subtle truncate">{e.student.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Actividad"
        maxWidth="lg"
      >
        <Card padding="none">
          <ActivityForm
            activity={activity}
            courseId={courseId}
            onSubmit={handleEdit}
            onCancel={() => setEditModalOpen(false)}
            onUploadFile={handleUploadFile}
            loading={submitting}
          />
        </Card>
      </Modal>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge, { categoryToBadgeVariant, categoryLabel } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import CourseForm from '@/components/forms/CourseForm';
import type { CourseFormData } from '@/components/forms/CourseForm';
import type { Course, Semester, CourseSchedule } from '@/lib/types';
import { ArrowLeft, Pencil, FileText, Users, BookOpen, BarChart3, Rocket, Clock } from 'lucide-react';

type TabKey = 'resumen' | 'estudiantes' | 'actividades' | 'notas' | 'proyectos';

const TABS: { key: TabKey; label: string; icon: typeof FileText; href?: string }[] = [
  { key: 'resumen', label: 'Resumen', icon: FileText },
  { key: 'estudiantes', label: 'Estudiantes', icon: Users, href: 'students' },
  { key: 'actividades', label: 'Actividades', icon: BookOpen, href: 'activities' },
  { key: 'notas', label: 'Notas', icon: BarChart3, href: 'grades' },
  { key: 'proyectos', label: 'Proyectos', icon: Rocket, href: 'projects' },
];

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCourse = useCallback(async () => {
    try {
      const [courseRes, semRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch('/api/semesters'),
      ]);

      if (!courseRes.ok) {
        toast('Curso no encontrado', 'error');
        router.push('/admin/courses');
        return;
      }

      const courseData = await courseRes.json();
      setCourse(courseData.course);

      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      setSemesters(semData.semesters ?? []);
    } catch {
      toast('Error al cargar el curso', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  async function handleEdit(data: CourseFormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          schedule: data.schedule,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al actualizar', 'error');
        return;
      }
      toast('Curso actualizado', 'success');
      setEditModalOpen(false);
      await fetchCourse();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !course) return <PageLoader />;

  const semester = semesters.find((s) => s.id === course.semesterId);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push('/admin/courses')}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a cursos
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{course.name}</h1>
              <Badge variant={categoryToBadgeVariant(course.category)} size="sm">
                {categoryLabel(course.category)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/40">
              <span className="font-mono">{course.code}</span>
              {semester && (
                <>
                  <span className="text-white/15">·</span>
                  <span>{semester.label}</span>
                </>
              )}
              <span className="text-white/15">·</span>
              <Badge variant={course.isActive ? 'success' : 'neutral'} size="sm" dot>
                {course.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar curso
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06]">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Pestañas del curso">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.href) {
                    router.push(`/admin/courses/${courseId}/${tab.href}`);
                  } else {
                    setActiveTab(tab.key);
                  }
                }}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all duration-150 cursor-pointer
                  ${activeTab === tab.key && !tab.href
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-white/40 hover:text-white/60 hover:border-white/10'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'resumen' && (
          <ResumenTab course={course} semester={semester} />
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Curso" maxWidth="lg">
        <CourseForm
          course={course}
          semesters={semesters}
          onSubmit={handleEdit}
          onCancel={() => setEditModalOpen(false)}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}

/* ─── Resumen Tab ─── */

function ResumenTab({ course, semester }: { course: Course; semester?: Semester }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Description */}
      <Card padding="lg" className="lg:col-span-2">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Descripción</h3>
        <p className="text-sm text-white/70 leading-relaxed">{course.description}</p>
      </Card>

      {/* Info */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Información</h3>
        <dl className="space-y-3">
          <InfoRow label="Código" value={course.code} />
          <InfoRow label="Categoría" value={categoryLabel(course.category)} />
          <InfoRow label="Semestre" value={semester?.label ?? course.semesterId} />
          <InfoRow label="Estado" value={course.isActive ? 'Activo' : 'Inactivo'} />
          <InfoRow label="Creado" value={formatDate(course.createdAt)} />
          <InfoRow label="Actualizado" value={formatDate(course.updatedAt)} />
        </dl>
      </Card>

      {/* Schedule */}
      <Card padding="lg" className="lg:col-span-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Horarios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {course.schedule.map((slot: CourseSchedule, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 capitalize">{slot.dayOfWeek}</p>
                <p className="text-xs text-white/40">
                  {slot.startTime}–{slot.endTime}
                  {slot.room && ` · ${slot.room}`}
                  {` · ${slot.modality}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="text-sm text-white/70 font-medium">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

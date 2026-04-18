'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { categoryToBadgeVariant, categoryLabel } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import CourseForm from '@/components/forms/CourseForm';
import type { CourseFormData } from '@/components/forms/CourseForm';
import type { Course, Semester, CourseSchedule } from '@/lib/types';

export default function CoursesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [semRes, courseRes] = await Promise.all([
        fetch('/api/semesters'),
        fetch('/api/courses'),
      ]);
      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      const courseData = courseRes.ok ? await courseRes.json() : { courses: [] };

      const sems: Semester[] = semData.semesters ?? [];
      setSemesters(sems);

      const activeSem = sems.find((s) => s.isActive);
      if (activeSem && !selectedSemester) setSelectedSemester(activeSem.id);

      setCourses(courseData.courses ?? []);
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, selectedSemester]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredCourses = selectedSemester
    ? courses.filter((c) => c.semesterId === selectedSemester)
    : courses;

  async function handleCreate(data: CourseFormData) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al crear curso', 'error');
        return;
      }
      toast('Curso creado exitosamente', 'success');
      setModalOpen(false);
      await fetchData();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Cursos</h1>
          <p className="text-sm text-subtle mt-1">Gestión de materias y horarios</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Semester filter */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            aria-label="Filtrar por semestre"
            className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground
                       outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="">Todos los semestres</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} {s.isActive ? '✦' : ''}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Curso
          </Button>
        </div>
      </div>

      {/* Course grid */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-subtle" />}
          title="No hay cursos"
          description={
            selectedSemester
              ? 'No hay cursos para este semestre. Crea uno nuevo.'
              : 'Aún no hay cursos creados en el sistema.'
          }
          action={
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              Crear curso
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              padding="none"
              hover
              onClick={() => router.push(`/admin/courses/${course.id}`)}
            >
              {/* Category color strip */}
              <div className={`h-1 rounded-t-xl ${categoryStripeColor(course.category)}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground/90 truncate">
                      {course.name}
                    </h3>
                    <p className="text-xs font-mono text-subtle mt-0.5">{course.code}</p>
                  </div>
                  <Badge variant={categoryToBadgeVariant(course.category)} size="sm">
                    {categoryLabel(course.category)}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-muted line-clamp-2 mb-4">
                  {course.description}
                </p>

                {/* Schedule */}
                <div className="space-y-1.5">
                  {course.schedule.map((slot: CourseSchedule, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-subtle">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="capitalize">{slot.dayOfWeek}</span>
                      <span>{slot.startTime}–{slot.endTime}</span>
                      {slot.room && (
                        <>
                          <span className="text-faint">·</span>
                          <span>{slot.room}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-foreground/[0.06]">
                  <Badge variant={course.isActive ? 'success' : 'neutral'} size="sm" dot>
                    {course.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-[10px] text-subtle uppercase tracking-wider">
                    {course.schedule[0]?.modality ?? 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Curso" maxWidth="lg">
        <CourseForm
          semesters={semesters}
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}

function categoryStripeColor(category: Course['category']): string {
  const map: Record<string, string> = {
    programming: 'bg-blue-500',
    design: 'bg-purple-500',
    management: 'bg-amber-500',
    leadership: 'bg-rose-500',
    other: 'bg-foreground/20',
  };
  return map[category] ?? map.other;
}

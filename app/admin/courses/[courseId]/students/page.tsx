'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import StudentTable from '@/components/students/StudentTable';
import type { EnrollmentWithStudent, Course } from '@/lib/types';

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [enrollments, setEnrollments] = useState<EnrollmentWithStudent[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'withdrawn'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [enrollRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/enrollments`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (enrollRes.ok) {
        const data = await enrollRes.json();
        setEnrollments(data.enrollments ?? []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data.course);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter logic
  const filtered = useMemo(() => {
    let result = enrollments;

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((e) =>
        e.student.firstName.toLowerCase().includes(q) ||
        e.student.lastName.toLowerCase().includes(q) ||
        e.student.email.toLowerCase().includes(q) ||
        e.student.documentNumber.includes(q)
      );
    }

    return result;
  }, [enrollments, statusFilter, search]);

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const withdrawnCount = enrollments.filter((e) => e.status === 'withdrawn').length;

  async function handleWithdraw(enrollId: string) {
    const enrollment = enrollments.find((e) => e.id === enrollId);
    if (!enrollment) return;

    const confirm = window.confirm(
      `¿Retirar a ${enrollment.student.firstName} ${enrollment.student.lastName} del curso?`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments/${enrollId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast('Estudiante retirado del curso', 'success');
        await fetchData();
      } else {
        const data = await res.json();
        toast(data.error || 'Error al retirar estudiante', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <button
          onClick={() => router.push(`/admin/courses/${courseId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-4 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al curso
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Estudiantes
            </h1>
            {course && (
              <p className="text-sm text-white/40 mt-1">
                {course.name} · <span className="font-mono">{course.code}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/students/import`)}
            >
              📄 Importar CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/students/new`)}
            >
              + Inscribir
            </Button>
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="info" size="md">
          {enrollments.length} total
        </Badge>
        <Badge variant="success" size="md" dot>
          {activeCount} activos
        </Badge>
        {withdrawnCount > 0 && (
          <Badge variant="danger" size="md" dot>
            {withdrawnCount} retirados
          </Badge>
        )}
      </div>

      {/* Filters */}
      {enrollments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, email, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar estudiantes"
              className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-white/10
                         bg-white/[0.04] text-white placeholder:text-white/25
                         outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'withdrawn')}
            aria-label="Filtrar por estado"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white
                       outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="withdrawn">Solo retirados</option>
          </select>
        </div>
      )}

      {/* Content */}
      {enrollments.length === 0 ? (
        <EmptyState
          icon={<span>👥</span>}
          title="No hay estudiantes inscritos"
          description="Inscribe estudiantes individualmente o importa un archivo CSV."
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/admin/courses/${courseId}/students/import`)}
              >
                📄 Importar CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/admin/courses/${courseId}/students/new`)}
              >
                + Inscribir estudiante
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<span>🔍</span>}
          title="Sin resultados"
          description="No se encontraron estudiantes con esos filtros."
          action={
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <StudentTable enrollments={filtered} onWithdraw={handleWithdraw} />
      )}
    </div>
  );
}

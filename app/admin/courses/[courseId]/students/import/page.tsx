'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import CSVImporter from '@/components/students/CSVImporter';
import type { Course } from '@/lib/types';

interface ImportResult {
  summary: { total: number; enrolled: number; alreadyEnrolled: number; errors: number };
  success: { email: string; studentId: string; created: boolean }[];
  alreadyEnrolled: { email: string; studentId: string }[];
  errors: { email: string; error: string }[];
}

export default function ImportStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      } else {
        toast('Curso no encontrado', 'error');
        router.push('/admin/courses');
      }
    } catch {
      toast('Error al cargar curso', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  async function handleConfirm(students: { firstName: string; lastName: string; email: string; documentNumber: string }[]) {
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Error en la importación', 'error');
        return;
      }

      setResult(data as ImportResult);
      toast(`Importación completada: ${data.summary.enrolled} inscritos`, 'success');
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/students`)}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a estudiantes
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Importar Estudiantes
        </h1>
        {course && (
          <p className="text-sm text-white/40 mt-1">
            {course.name} · <span className="font-mono">{course.code}</span>
          </p>
        )}
      </div>

      {/* Result */}
      {result ? (
        <div className="space-y-4">
          {/* Summary card */}
          <Card padding="lg">
            <h2 className="text-base font-semibold text-white/90 mb-4">Resultado de la importación</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <SummaryBox label="Total procesados" value={result.summary.total} variant="info" />
              <SummaryBox label="Inscritos" value={result.summary.enrolled} variant="success" />
              <SummaryBox label="Ya inscritos" value={result.summary.alreadyEnrolled} variant="warning" />
              <SummaryBox label="Errores" value={result.summary.errors} variant="danger" />
            </div>

            {/* Detailed lists */}
            {result.success.length > 0 && (
              <DetailSection title="Inscritos exitosamente" variant="success">
                {result.success.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                    <span className="text-emerald-400">✓</span>
                    {s.email}
                    {s.created && <Badge variant="info" size="sm">nuevo</Badge>}
                  </li>
                ))}
              </DetailSection>
            )}

            {result.alreadyEnrolled.length > 0 && (
              <DetailSection title="Ya estaban inscritos" variant="warning">
                {result.alreadyEnrolled.map((s, i) => (
                  <li key={i} className="text-xs text-white/50">
                    <span className="text-amber-400 mr-2">≡</span>{s.email}
                  </li>
                ))}
              </DetailSection>
            )}

            {result.errors.length > 0 && (
              <DetailSection title="Errores" variant="danger">
                {result.errors.map((s, i) => (
                  <li key={i} className="text-xs text-white/50">
                    <span className="text-red-400 mr-2">✕</span>{s.email}: {s.error}
                  </li>
                ))}
              </DetailSection>
            )}
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/students`)}
            >
              Ver lista de estudiantes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
            >
              Importar otro archivo
            </Button>
          </div>
        </div>
      ) : (
        <CSVImporter onConfirm={handleConfirm} loading={importing} />
      )}
    </div>
  );
}

/* ── Helper Components ── */

function SummaryBox({ label, value, variant }: {
  label: string;
  value: number;
  variant: 'success' | 'warning' | 'danger' | 'info';
}) {
  const colors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-cyan-400',
  };
  return (
    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function DetailSection({ title, variant, children }: {
  title: string;
  variant: 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const borderColors = {
    success: 'border-emerald-500/10',
    warning: 'border-amber-500/10',
    danger: 'border-red-500/10',
  };
  return (
    <div className={`mt-4 pt-4 border-t ${borderColors[variant]}`}>
      <p className="text-xs font-medium text-white/50 mb-2">{title}</p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

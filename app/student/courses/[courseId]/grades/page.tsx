'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import GradeCard from '@/components/grades/GradeCard';
import { useToast } from '@/components/ui/Toast';
import type { StudentGradeSummary } from '@/lib/types';

/**
 * Student — My Grades Page
 * /student/courses/[courseId]/grades
 *
 * List of activities with grade (if published), feedback
 * Animated progress bar for acumulada
 * Large definitiva at the bottom
 */
export default function StudentGradesPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentGradeSummary | null>(null);

  const courseId = params.courseId;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}/grades`, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudieron cargar las notas');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error cargando notas', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-subtle">No se pudieron cargar tus notas.</p>
        <button
          onClick={() => { setLoading(true); setData(null); window.location.reload(); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer min-h-[44px]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const gradedCount = data.activities.filter((a) => a.grade !== null).length;
  const progressPercent = data.activities.length > 0
    ? Math.round((gradedCount / data.activities.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors mb-2 cursor-pointer py-2 pr-3 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]"
        >
          ← Volver al curso
        </button>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mis Notas
        </h1>
        <p className="text-sm text-muted mt-1">{data.courseName}</p>
      </div>

      {/* Progress summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-5 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-subtle">Progreso de calificación</p>
          <p className="text-xs text-muted">
            {gradedCount} de {data.activities.length} actividades
          </p>
        </div>
        <div className="relative h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-cyan-500"
          />
        </div>
      </motion.div>

      {/* Activity Grade Cards */}
      {data.activities.length > 0 ? (
        <div className="grid gap-3 mb-8">
          {data.activities.map((activity, index) => (
            <GradeCard key={activity.id} activity={activity} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] mb-8">
          <p className="text-subtle">No hay actividades calificables en este curso aún.</p>
        </div>
      )}

      {/* Definitiva */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="rounded-xl border-2 border-foreground/[0.1] bg-foreground/[0.02] p-8 text-center"
      >
        <p className="text-xs uppercase tracking-wider text-subtle mb-2">Nota Definitiva</p>
        {data.finalScore !== null ? (
          <>
            <p className={`text-5xl font-bold tabular-nums ${definitiveColor(data.finalScore)}`}>
              {data.finalScore.toFixed(1)}
            </p>
            <p className="text-sm text-subtle mt-1">/ 5.0</p>
            {data.isPartial && (
              <p className="text-xs text-amber-400 mt-2">* Nota parcial — faltan actividades por calificar</p>
            )}
            <div className="mt-4">
              {data.isApproved ? (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  ✓ Aprobado
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                  ✗ Reprobado
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-lg text-faint italic">Sin notas publicadas</p>
        )}
      </motion.div>
    </div>
  );
}

function definitiveColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-400';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

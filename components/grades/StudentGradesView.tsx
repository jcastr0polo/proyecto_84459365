'use client';

import React from 'react';
import { motion } from 'framer-motion';
import GradeCard from '@/components/grades/GradeCard';
import type { StudentGradeSummary } from '@/lib/types';

/**
 * StudentGradesView — Vista de notas del estudiante (presentacional, sin fetch)
 *
 * Separada de la página para que pueda renderizarse con datos de prueba
 * desde /prototype sin depender de la API ni de la base de datos.
 */
export default function StudentGradesView({ data }: { data: StudentGradeSummary }) {
  const gradedCount = data.activities.filter((a) => a.grade !== null).length;
  const progressPercent = data.activities.length > 0
    ? Math.round((gradedCount / data.activities.length) * 100) : 0;

  const hasCortes = data.cortes.length > 0;
  const corteGroups = hasCortes
    ? data.cortes
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((corte) => ({
          ...corte,
          activities: data.activities.filter((a) => a.corteId === corte.id),
          score: data.corteScores[corte.id] ?? null,
        }))
    : [];
  const unassignedActivities = data.activities.filter((a) => !a.corteId);

  return (
    <>
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

      {/* Grade Cards grouped by Corte */}
      {hasCortes ? (
        <div className="space-y-8 mb-8">
          {corteGroups.map((group, gi) => (
            <motion.section
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.1, duration: 0.3 }}
            >
              {/* Corte header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">{group.name}</h2>
                  <span className="text-[11px] text-subtle bg-foreground/[0.05] px-2 py-0.5 rounded-full">
                    Peso: {group.weight}%
                  </span>
                </div>
                {group.score !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-subtle">Nota del corte:</span>
                    <span className={`text-lg font-bold tabular-nums ${definitiveColor(group.score)}`}>
                      {group.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-subtle">/ 5.0</span>
                  </div>
                )}
              </div>

              {/* Activities in this corte */}
              {group.activities.length > 0 ? (
                <div className="grid gap-3">
                  {group.activities.map((activity, index) => (
                    <GradeCard key={activity.id} activity={activity} index={gi * 10 + index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 rounded-xl border border-foreground/[0.06] bg-foreground/[0.01]">
                  <p className="text-xs text-subtle italic">Sin actividades en este corte</p>
                </div>
              )}

              {/* Corte score summary bar */}
              {group.score !== null && (
                <div className="mt-3 p-3 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] flex items-center gap-3">
                  <span className="text-xs text-subtle flex-shrink-0">Definitiva {group.name}:</span>
                  <div className="flex-1 relative h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(group.score / 5) * 100}%` }}
                      transition={{ delay: gi * 0.1 + 0.3, duration: 0.5, ease: 'easeOut' }}
                      className={`absolute inset-y-0 left-0 rounded-full ${barColorFn(group.score)}`}
                    />
                  </div>
                  <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${definitiveColor(group.score)}`}>
                    {group.score.toFixed(1)}
                  </span>
                </div>
              )}
            </motion.section>
          ))}

          {/* Unassigned activities */}
          {unassignedActivities.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-foreground mb-3">Otras actividades</h2>
              <div className="grid gap-3">
                {unassignedActivities.map((activity, index) => (
                  <GradeCard key={activity.id} activity={activity} index={corteGroups.length * 10 + index} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : data.activities.length > 0 ? (
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
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ✓ Aprobado
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                  ✗ Reprobado
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-lg text-faint italic">Sin notas publicadas</p>
        )}
      </motion.div>
    </>
  );
}

function definitiveColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function barColorFn(score: number): string {
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= 3.0) return 'bg-amber-500';
  return 'bg-red-500';
}

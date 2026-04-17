'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GradeCardActivity {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  weight: number;
  grade: {
    score: number;
    maxScore: number;
    feedback?: string;
    gradedAt: string;
    publishedAt?: string;
  } | null;
}

interface GradeCardProps {
  activity: GradeCardActivity;
  index: number;
}

const TYPE_LABELS: Record<string, string> = {
  project: 'Proyecto',
  exercise: 'Ejercicio',
  document: 'Documento',
  presentation: 'Presentación',
  prompt: 'Prompt',
  exam: 'Examen',
  other: 'Otro',
};

/**
 * GradeCard — Student's view of a single activity grade
 * Shows: activity title, type, weight, score (if published), feedback
 * Color-coded score bar
 */
export default function GradeCard({ activity, index }: GradeCardProps) {
  const { grade } = activity;
  const hasGrade = grade !== null;
  const normalized = hasGrade ? (grade.score / grade.maxScore) * 5 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
    >
      <div className="p-4">
        {/* Header: title + type + weight */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white/90 truncate">{activity.title}</h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              {TYPE_LABELS[activity.type] ?? activity.type} · Peso: {activity.weight}%
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-medium text-white/30 bg-white/[0.04] px-2 py-1 rounded-lg">
            /{activity.maxScore}
          </span>
        </div>

        {/* Score section */}
        {hasGrade ? (
          <div>
            {/* Score bar */}
            <div className="relative h-2 rounded-full bg-white/[0.06] mb-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((grade.score / grade.maxScore) * 100, 100)}%` }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.5, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 rounded-full ${barColor(normalized!)}`}
              />
            </div>

            {/* Score value */}
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold tabular-nums ${textColor(normalized!)}`}>
                {grade.score.toFixed(1)}
              </span>
              <span className="text-xs text-white/30">
                {normalized !== null && normalized >= 3.0 ? 'Aprobado' : 'Reprobado'}
              </span>
            </div>

            {/* Feedback */}
            {grade.feedback && (
              <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Retroalimentación</p>
                <p className="text-sm text-white/70 leading-relaxed">{grade.feedback}</p>
              </div>
            )}

            {/* Graded at footer */}
            <p className="text-[10px] text-white/20 mt-2">
              Calificado: {new Date(grade.gradedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <span className="text-xs text-white/30 italic">Pendiente de publicación</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function barColor(score: number): string {
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= 3.0) return 'bg-amber-500';
  return 'bg-red-500';
}

function textColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-400';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

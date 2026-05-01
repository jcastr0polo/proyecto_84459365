'use client';

import React from 'react';
import { formatDateColombia } from '@/lib/dateUtils';
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
 * Color-coded score bar + prominent normalized score (0-5)
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
      className={`rounded-xl border overflow-hidden ${hasGrade ? 'border-foreground/[0.12] bg-foreground/[0.02]' : 'border-foreground/[0.08] bg-foreground/[0.01]'}`}
    >
      <div className="p-4">
        {/* Header: title + type + weight */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground/90 truncate">{activity.title}</h3>
            <p className="text-[11px] text-subtle mt-0.5">
              {TYPE_LABELS[activity.type] ?? activity.type} · Peso: {activity.weight}%
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-medium text-subtle bg-foreground/[0.04] px-2 py-1 rounded-lg">
            /{activity.maxScore}
          </span>
        </div>

        {/* Score section */}
        {hasGrade ? (
          <div>
            {/* Big score highlight */}
            <div className={`flex items-center gap-4 p-3 mb-3 rounded-lg border ${scoreBgClass(normalized!)}`}>
              <div className="text-center min-w-[64px]">
                <p className={`text-3xl font-black tabular-nums leading-none ${textColor(normalized!)}`}>
                  {normalized!.toFixed(1)}
                </p>
                <p className="text-[10px] text-subtle mt-1">/ 5.0</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-muted tabular-nums">
                    {grade.score.toFixed(1)}<span className="text-subtle">/{grade.maxScore}</span>
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(normalized!)}`}>
                    {normalized! >= 3.0 ? 'Aprobado' : 'Reprobado'}
                  </span>
                </div>
                {/* Score bar */}
                <div className="relative h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((grade.score / grade.maxScore) * 100, 100)}%` }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.5, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full ${barColor(normalized!)}`}
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            {grade.feedback && (
              <div className="mt-3 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">Retroalimentación</p>
                <p className="text-sm text-muted leading-relaxed">{grade.feedback}</p>
              </div>
            )}

            {/* Graded at footer */}
            <p className="text-[10px] text-faint mt-2">
              Calificado: {formatDateColombia(grade.gradedAt)}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <span className="text-xs text-subtle italic">Pendiente de publicación</span>
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
  if (score >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBgClass(score: number): string {
  if (score >= 4.0) return 'bg-emerald-500/[0.08] border-emerald-500/20';
  if (score >= 3.0) return 'bg-amber-500/[0.08] border-amber-500/20';
  return 'bg-red-500/[0.08] border-red-500/20';
}

function statusBadgeClass(score: number): string {
  if (score >= 3.0) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  return 'bg-red-500/15 text-red-600 dark:text-red-400';
}

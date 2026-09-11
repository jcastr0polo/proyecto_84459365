'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, Building2, Monitor, RefreshCw } from 'lucide-react';
import { gradeText, formatScore } from '@/lib/gradeScale';
import type { Course } from '@/lib/types';

/**
 * CourseCard — la tarjeta de curso del estudiante.
 *
 * Una sola implementación para el panel y para /courses, que antes tenían
 * cada una la suya con información distinta: la del listado no mostraba la
 * nota, así que el estudiante veía cómo iba en un sitio y en el otro no.
 *
 * Es un enlace y no un botón con router.push: así se puede abrir en una
 * pestaña nueva y el lector de pantalla lo anuncia como lo que es.
 */

const DAY_SHORT: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miércoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb',
};

const MODALITY: Record<string, { label: string; Icon: typeof Building2 }> = {
  presencial: { label: 'Presencial', Icon: Building2 },
  virtual: { label: 'Virtual', Icon: Monitor },
  híbrido: { label: 'Híbrido', Icon: RefreshCw },
};

export default function CourseCard({
  course, score, gradedCount, totalActivities, pendingCount, detailed = false,
}: {
  course: Course;
  score: number | null;
  gradedCount: number;
  totalActivities: number;
  pendingCount: number;
  /** En el listado dedicado se muestran descripción, aula y modalidad. */
  detailed?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <Link
      href={`/student/courses/${course.id}`}
      className="block rounded-xl border border-surface-border bg-surface p-4
                 transition-colors duration-[var(--dur-fast)]
                 hover:border-surface-border-hover hover:bg-surface-hover
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{course.name}</p>
          <p className="text-meta text-subtle mt-0.5 font-mono">{course.code}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xl font-bold tabular-nums leading-none ${gradeText(score)}`}>
            {formatScore(score)}
          </p>
          <p className="text-micro text-faint mt-0.5">/ 5.0</p>
        </div>
      </div>

      {detailed && course.description && (
        <p className="text-xs text-subtle line-clamp-2 mt-2">{course.description}</p>
      )}

      {/* Avance de calificación */}
      <div className="mt-3">
        <div className="relative h-1 rounded-full bg-foreground/[0.08] overflow-hidden">
          <motion.div
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: totalActivities > 0 ? gradedCount / totalActivities : 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'left' }}
            className="absolute inset-0 rounded-full bg-cyan-500"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="text-micro text-faint truncate">
            {gradedCount} de {totalActivities} calificadas
          </span>
          {/* Los pendientes se dicen una vez, no dos como antes. */}
          {pendingCount > 0 && (
            <span className="text-micro text-amber-600 dark:text-amber-400 shrink-0">
              {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
            </span>
          )}
        </div>
      </div>

      {course.schedule.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-foreground/[0.06] space-y-1">
          {course.schedule.map((h, i) => {
            const m = MODALITY[h.modality];
            return (
              <div key={i} className="flex items-center gap-2 text-micro text-subtle flex-wrap">
                <span className="font-medium">{DAY_SHORT[h.dayOfWeek] ?? h.dayOfWeek}</span>
                <span>{h.startTime}–{h.endTime}</span>
                {detailed && h.room && (
                  <span className="text-faint flex items-center gap-0.5"><MapPin className="w-3 h-3" />{h.room}</span>
                )}
                {detailed && m && (
                  <span className="text-faint flex items-center gap-0.5"><m.Icon className="w-3 h-3" />{m.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}

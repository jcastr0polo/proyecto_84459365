'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, GraduationCap, AlertTriangle, ClipboardCheck, Clock } from 'lucide-react';
import { gradeText, formatScore, PASS, COMFORTABLE } from '@/lib/gradeScale';
import type { Course, Semester, CourseGradeSummary, CourseSchedule } from '@/lib/types';

/**
 * CourseOverviewTab — resumen del curso como panel, no como ficha.
 *
 * Antes esta pestaña mostraba descripción, metadatos y horarios: información
 * que no cambia nunca y que no responde ninguna pregunta. Un docente abre el
 * resumen de un curso para saber cómo va el grupo, no para releer la
 * descripción que él mismo escribió.
 *
 * Sobre los colores de la distribución: son los mismos de estado que usa el
 * resto de la aplicación (perdiendo / en riesgo / bien). El validador de
 * paleta marca su banda de luminosidad, pero las variantes que la cumplen
 * fallan el suelo de visión normal —rojo y ámbar quedan a ΔE 14.4, casi
 * indistinguibles— y además romperían la coherencia con todos los demás
 * indicadores del sistema. Se compensa con codificación secundaria: cada
 * tramo lleva su etiqueta y su conteo, nunca solo el color.
 */

const BANDS = [
  { key: 'fail', label: 'Perdiendo', hint: 'menos de 3.0', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { key: 'warn', label: 'En riesgo', hint: '3.0 a 3.9', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'good', label: 'Bien', hint: '4.0 o más', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'none', label: 'Sin nota', hint: 'aún no calificados', bar: 'bg-foreground/20', text: 'text-faint' },
] as const;

export default function CourseOverviewTab({
  course, semester,
}: {
  course: Course;
  semester?: Semester;
}) {
  const [summary, setSummary] = useState<CourseGradeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${course.id}/grades`, { credentials: 'include' });
      if (res.ok) setSummary(await res.json());
    } catch { /* el panel se degrada a la información del curso */ } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { load(); }, [load]);

  const m = useMemo(() => {
    const students = summary?.students ?? [];
    const scored = students.filter((s) => s.finalScore !== null);
    const avg = scored.length > 0
      ? scored.reduce((a, s) => a + (s.finalScore as number), 0) / scored.length
      : null;

    const counts = { fail: 0, warn: 0, good: 0, none: 0 };
    for (const s of students) {
      if (s.finalScore === null) counts.none++;
      else if (s.finalScore < PASS) counts.fail++;
      else if (s.finalScore < COMFORTABLE) counts.warn++;
      else counts.good++;
    }

    // Celdas sin nota en la tabla: lo que falta por calificar.
    const acts = summary?.activities ?? [];
    const ungraded = students.reduce(
      (a, s) => a + acts.filter((act) => !s.grades[act.id]).length, 0);

    return {
      students, total: students.length, avg, counts, ungraded,
      atRisk: students
        .filter((s) => s.finalScore !== null && (s.finalScore as number) < PASS)
        .sort((a, b) => (a.finalScore as number) - (b.finalScore as number)),
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-surface-border bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Números que responden preguntas ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Inscritos" value={String(m.total)} tone="text-foreground" />
        <Stat icon={GraduationCap} label="Promedio del curso"
          value={formatScore(m.avg)} tone={gradeText(m.avg)} />
        <Stat icon={AlertTriangle} label="Van perdiendo"
          value={String(m.counts.fail)}
          tone={m.counts.fail > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={m.counts.fail > 0 ? 'border-red-500/25 bg-red-500/[0.06]' : undefined} />
        <Stat icon={ClipboardCheck} label="Notas sin poner"
          value={String(m.ungraded)}
          tone={m.ungraded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
          highlight={m.ungraded > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : undefined} />
      </div>

      {/* ── Distribución ── */}
      {m.total > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
            Cómo va el grupo
          </h3>
          {/* Barra segmentada con 2px de separación entre tramos. */}
          <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.06] gap-0.5">
            {BANDS.map((b) => {
              const n = m.counts[b.key];
              if (n === 0) return null;
              return (
                <div
                  key={b.key}
                  className={`h-full ${b.bar}`}
                  style={{ width: `${(n / m.total) * 100}%` }}
                  title={`${b.label}: ${n} de ${m.total}`}
                />
              );
            })}
          </div>
          {/* Etiqueta y conteo por tramo: la identidad nunca depende del color solo. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {BANDS.map((b) => (
              <div key={b.key} className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-sm mt-1.5 shrink-0 ${b.bar}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold tabular-nums ${b.text}`}>
                    {m.counts[b.key]}
                  </p>
                  <p className="text-micro text-subtle leading-tight">
                    {b.label}
                    <span className="block text-faint">{b.hint}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── A quién hay que mirar ── */}
      {m.atRisk.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
            Estudiantes en riesgo ({m.atRisk.length})
          </h3>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
            {m.atRisk.slice(0, 8).map((s) => (
              <Link
                key={s.id}
                href={`/admin/students/${s.id}?from=${course.id}`}
                className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-hover
                           transition-colors duration-[var(--dur-fast)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 leading-snug">
                    {s.lastName}, {s.firstName}
                  </p>
                  <p className="text-micro text-subtle mt-0.5">{s.email}</p>
                </div>
                <span className={`text-lg font-semibold tabular-nums shrink-0 ${gradeText(s.finalScore)}`}>
                  {formatScore(s.finalScore)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── La información del curso, ahora al final y compacta ── */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-subtle">
          <span className="font-mono">{course.code}</span>
          <span>{semester?.label ?? course.semesterId}</span>
          <span>{course.isActive ? 'Activo' : 'Inactivo'}</span>
          {course.schedule.map((slot: CourseSchedule, i: number) => (
            <span key={i} className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="capitalize">{slot.dayOfWeek}</span> {slot.startTime}–{slot.endTime}
              {slot.room && ` · ${slot.room}`}
            </span>
          ))}
        </div>
        {course.description && (
          <p className="text-sm text-muted leading-relaxed">{course.description}</p>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone, highlight,
}: {
  icon: typeof Users; label: string; value: string; tone: string; highlight?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ?? 'border-surface-border bg-surface'}`}>
      <p className="text-micro uppercase tracking-wider text-subtle flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums leading-none mt-2 ${tone}`}>{value}</p>
    </div>
  );
}

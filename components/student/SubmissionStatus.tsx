'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Upload, RotateCcw, Lock, Paperclip, Link as LinkIcon } from 'lucide-react';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import { dueLabel } from '@/lib/activityStatus';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import type { Activity, Submission } from '@/lib/types';

/**
 * SubmissionStatus — "¿qué me toca hacer con esta actividad?"
 *
 * La versión anterior tenía dos problemas serios:
 *
 * 1. Una entrega devuelta por el profesor se mostraba con una banda VERDE de
 *    "Entrega cargada", y el aviso de que había que corregirla quedaba en una
 *    línea pequeña al final. Verde arriba y "corrige esto" abajo: el
 *    estudiante ve el verde y sigue de largo. Ahora "devuelta" es su propio
 *    estado y manda en la pantalla.
 *
 * 2. La alerta de "no has entregado" era igual de estridente faltando tres
 *    semanas que estando vencida. Ahora el tono sigue al plazo real.
 */

type Tone = 'action' | 'warn' | 'info' | 'ok' | 'closed';

const TONE: Record<Tone, { box: string; title: string; icon: string }> = {
  action: { box: 'border-amber-500/30 bg-amber-500/[0.07]', title: 'text-amber-700 dark:text-amber-300', icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  warn: { box: 'border-red-500/30 bg-red-500/[0.07]', title: 'text-red-700 dark:text-red-300', icon: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  info: { box: 'border-surface-border bg-surface', title: 'text-foreground', icon: 'bg-foreground/[0.06] text-subtle' },
  ok: { box: 'border-emerald-500/25 bg-emerald-500/[0.06]', title: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  closed: { box: 'border-surface-border bg-surface-sunken', title: 'text-muted', icon: 'bg-foreground/[0.06] text-subtle' },
};

export default function SubmissionStatus({
  activity, submission, isPastDue, courseId, actId, today,
}: {
  activity: Activity;
  submission: Submission | null;
  isPastDue: boolean;
  courseId: string;
  actId: string;
  today: Date;
}) {
  const submitHref = `/student/courses/${courseId}/activities/${actId}/submit`;
  const canSubmit = !isPastDue || activity.allowLateSubmission;
  const isClosed = activity.status === 'closed';
  const plazo = dueLabel(activity.dueDate, today);

  // ── El estado manda: se resuelve primero, y de ahí sale todo lo demás ──
  const state = (() => {
    if (submission?.status === 'returned') return 'returned' as const;
    if (isClosed) return submission ? ('closed-done' as const) : ('closed-missed' as const);
    if (!submission) {
      if (isPastDue) return canSubmit ? ('late-open' as const) : ('missed' as const);
      return 'todo' as const;
    }
    return submission.status === 'reviewed' ? ('graded' as const) : ('sent' as const);
  })();

  const view = {
    returned: {
      tone: 'action' as Tone, Icon: RotateCcw,
      title: 'Tu profesor te devolvió esta entrega',
      detail: 'Revisa la retroalimentación de abajo y vuelve a enviarla.',
      cta: canSubmit ? { label: 'Corregir y reenviar', href: submitHref } : null,
    },
    todo: {
      tone: 'info' as Tone, Icon: Upload,
      title: 'Aún no has entregado',
      detail: plazo,
      cta: { label: 'Entregar', href: submitHref },
    },
    'late-open': {
      tone: 'warn' as Tone, Icon: AlertTriangle,
      title: 'El plazo ya venció',
      detail: `${plazo}. Todavía puedes entregar, con una penalización del ${activity.latePenaltyPercent ?? 0}%.`,
      cta: { label: 'Entregar de todos modos', href: submitHref },
    },
    missed: {
      tone: 'warn' as Tone, Icon: AlertTriangle,
      title: 'El plazo venció y no se aceptan entregas tardías',
      detail: plazo,
      cta: null,
    },
    sent: {
      tone: 'ok' as Tone, Icon: CheckCircle2,
      title: 'Entregada',
      detail: `Versión ${submission?.version} · ${submission ? formatDateTimeColombia(submission.submittedAt) : ''}${submission?.isLate ? ' · tardía' : ''}`,
      cta: canSubmit ? { label: 'Reenviar', href: submitHref } : null,
    },
    graded: {
      tone: 'ok' as Tone, Icon: CheckCircle2,
      title: 'Calificada',
      detail: 'Tu nota y la retroalimentación están abajo.',
      cta: null,
    },
    'closed-done': {
      tone: 'closed' as Tone, Icon: Lock,
      title: 'Actividad cerrada',
      detail: 'Ya no se aceptan entregas. La tuya quedó registrada.',
      cta: null,
    },
    'closed-missed': {
      tone: 'warn' as Tone, Icon: Lock,
      title: 'Actividad cerrada sin entrega',
      detail: 'El plazo terminó y no registraste ninguna entrega.',
      cta: null,
    },
  }[state];

  const t = TONE[view.tone];
  const Icon = view.Icon;

  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 space-y-4">
      <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">Mi entrega</h3>

      <div className={`rounded-xl border p-4 ${t.box}`}>
        <div className="flex items-start gap-3">
          <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.icon}`}>
            <Icon className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${t.title}`}>{view.title}</p>
            <p className="text-xs text-subtle mt-0.5">{view.detail}</p>
          </div>
        </div>

        {view.cta && (
          <Link
            href={view.cta.href}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                       bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm
                       transition-colors duration-[var(--dur-fast)]
                       active:scale-[0.98] motion-reduce:active:scale-100
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                       focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <Upload className="w-4 h-4" />
            {view.cta.label}
          </Link>
        )}
      </div>

      {/* Requisitos: solo tienen sentido antes de entregar. */}
      {!submission && (activity.requiresFileUpload || activity.requiresLinkSubmission) && (
        <div className="text-xs text-subtle space-y-1">
          {activity.requiresFileUpload && (
            <p className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" />Debes adjuntar un archivo</p>
          )}
          {activity.requiresLinkSubmission && (
            <p className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" />Debes enviar un enlace</p>
          )}
        </div>
      )}

      {submission && <SubmissionDetail submission={submission} />}
    </section>
  );
}

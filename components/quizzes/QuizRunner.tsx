'use client';

import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { Clock, AlertTriangle, Check } from 'lucide-react';
import type { Quiz } from '@/lib/types';

/**
 * QuizRunner — presentar un parcial.
 *
 * Esta pantalla estaba escrita dos veces: una para el estudiante y otra,
 * copiada, para la simulación del docente. Al compararlas coincidían en el
 * 90 %: lo único que cambiaba de verdad era el color de acento.
 *
 * Y eso rompía justo lo que la simulación promete. Su razón de existir es que
 * el docente vea LO QUE VE EL ESTUDIANTE; con dos implementaciones, cada
 * arreglo o mejora en una dejaba a la otra atrás y el ensayo dejaba de ser
 * fiel. Ahora es el mismo componente y la fidelidad está garantizada por
 * construcción, no por acordarse de copiar el cambio.
 *
 * Lo único parametrizado es el acento, porque en simulación conviene que se
 * note a simple vista que no es real.
 */

export type RunnerAccent = 'cyan' | 'purple';

const ACCENT: Record<RunnerAccent, { bar: string; optionOn: string; markOn: string; submit: string }> = {
  cyan: {
    bar: 'bg-cyan-500',
    optionOn: 'border-cyan-500/50 bg-cyan-500/10 text-foreground',
    markOn: 'border-cyan-400 bg-cyan-400',
    submit: '',
  },
  purple: {
    bar: 'bg-purple-500',
    optionOn: 'border-purple-500/50 bg-purple-500/10 text-foreground',
    markOn: 'border-purple-400 bg-purple-400',
    submit: '!bg-purple-500 hover:!bg-purple-400',
  },
};

/** Barajado estable: la misma semilla da siempre el mismo orden. */
export function shuffleArray<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1)) % (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type Answers = Record<string, string | string[]>;

export function countAnswered(answers: Answers): number {
  return Object.values(answers).filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length;
}

export default function QuizRunner({
  quiz, answers, onAnswer, timeLeft, blurWarnings, submitting, onSubmit,
  accent = 'cyan', submitLabel = 'Enviar Parcial',
}: {
  quiz: Quiz;
  answers: Answers;
  onAnswer: (questionId: string, value: string | string[]) => void;
  timeLeft: number | null;
  blurWarnings: number;
  submitting: boolean;
  onSubmit: () => void;
  accent?: RunnerAccent;
  submitLabel?: string;
}) {
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const c = ACCENT[accent];

  const displayQuestions = quiz.shuffleQuestions
    ? shuffleArray(quiz.questions, quiz.id.charCodeAt(0))
    : quiz.questions;

  const answeredCount = countAnswered(answers);
  const totalQuestions = quiz.questions.length;

  function toggleWeighted(questionId: string, optionId: string) {
    const current = answers[questionId];
    const arr = Array.isArray(current) ? [...current] : current ? [current] : [];
    const i = arr.indexOf(optionId);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(optionId);
    onAnswer(questionId, arr);
  }

  return (
    <>
      <div className="sticky top-0 z-20 bg-canvas py-3 border-b border-foreground/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{quiz.title}</h2>
            <Badge variant="info" size="sm">{answeredCount}/{totalQuestions}</Badge>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {blurWarnings > 0 && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="w-3 h-3 mr-0.5" aria-hidden="true" />
                <span className="sr-only">Pérdidas de foco: </span>{blurWarnings}
              </Badge>
            )}

            {timeLeft !== null && (
              <span
                /* El tiempo cambia solo: sin esto un lector de pantalla no lo
                   anuncia y quien no ve la pantalla se queda sin saberlo. */
                role="timer"
                aria-live={timeLeft <= 60 ? 'assertive' : 'off'}
                className={`text-sm font-mono font-bold tabular-nums ${
                  timeLeft <= 60 ? 'text-red-600 dark:text-red-400 animate-pulse'
                    : timeLeft <= 300 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" aria-hidden="true" />
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-1 rounded-full bg-foreground/[0.06] mt-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${c.bar}`}
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
        </div>
      </div>

      {displayQuestions.map((question, idx) => {
        const displayOptions = quiz.shuffleOptions
          ? shuffleArray(question.options, question.id.charCodeAt(0))
          : question.options;
        const isWeighted = question.type === 'weighted';
        const current = answers[question.id];
        const selectedIds = isWeighted
          ? (Array.isArray(current) ? current : current ? [current] : [])
          : [];

        return (
          <div key={question.id} className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-bold text-faint shrink-0 pt-0.5">{idx + 1}.</span>
              <div>
                <MarkdownRenderer content={question.text} className="text-sm font-medium text-foreground/90" />
                <span className="text-micro text-subtle">
                  {question.points} pts · {isWeighted
                    ? 'Selección múltiple (selecciona las correctas)'
                    : 'Selección única'}
                </span>
              </div>
            </div>

            <div className="ml-5 space-y-2" role={isWeighted ? 'group' : 'radiogroup'} aria-label={`Pregunta ${idx + 1}`}>
              {displayOptions.map((opt) => {
                const isSelected = isWeighted ? selectedIds.includes(opt.id) : current === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    /* Se anuncia el estado: antes la selección era solo color,
                       y en un lector de pantalla no existía. */
                    role={isWeighted ? 'checkbox' : 'radio'}
                    aria-checked={isSelected}
                    onClick={() => isWeighted ? toggleWeighted(question.id, opt.id) : onAnswer(question.id, opt.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm min-h-11
                                transition-all duration-[var(--dur-fast)] cursor-pointer
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                      isSelected
                        ? c.optionOn
                        : 'border-foreground/[0.08] bg-foreground/[0.02] text-muted hover:border-foreground/15 hover:bg-foreground/[0.05]'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 mr-2 align-middle border-2
                                      ${isWeighted ? 'rounded' : 'rounded-full'}
                                      ${isSelected ? c.markOn : 'border-foreground/20'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-foreground/[0.06] p-4 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-subtle">{answeredCount} de {totalQuestions} respondidas</p>
          <Button
            variant="primary"
            className={c.submit}
            disabled={submitting || answeredCount === 0}
            onClick={() => {
              if (answeredCount < totalQuestions) { setConfirmIncomplete(true); return; }
              onSubmit();
            }}
          >
            {submitting ? 'Enviando…' : submitLabel}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmIncomplete}
        onClose={() => setConfirmIncomplete(false)}
        onConfirm={() => { setConfirmIncomplete(false); onSubmit(); }}
        title="Envío incompleto"
        message={`Solo respondiste ${answeredCount} de ${totalQuestions} preguntas. ¿Enviar de todas formas?`}
        confirmLabel="Enviar"
        variant="warning"
      />
    </>
  );
}

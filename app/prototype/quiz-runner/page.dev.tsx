'use client';

import React, { useState } from 'react';
import QuizRunner, { type Answers, type RunnerAccent } from '@/components/quizzes/QuizRunner';
import Chip from '@/components/ui/Chip';
import type { Quiz } from '@/lib/types';

/** Taller — la pantalla de presentar parcial, compartida por estudiante y simulación. */
export default function PrototypeQuizRunner() {
  const [accent, setAccent] = useState<RunnerAccent>('cyan');
  const [tiempo, setTiempo] = useState<number | null>(742);
  const [answers, setAnswers] = useState<Answers>({ q1: 'q1b' });

  const quiz = {
    id: 'quiz-demo',
    courseId: 'c1',
    title: 'Parcial 1 — Fundamentos de interacción',
    type: 'graded',
    questions: [
      {
        id: 'q1', text: '¿Qué principio describe la **ley de Fitts**?', type: 'single', points: 2,
        options: [
          { id: 'q1a', text: 'El tiempo para alcanzar un objetivo depende de su tamaño y distancia', weight: 100 },
          { id: 'q1b', text: 'La memoria a corto plazo retiene siete elementos', weight: 0 },
          { id: 'q1c', text: 'Los usuarios leen en forma de F', weight: 0 },
        ],
      },
      {
        id: 'q2', text: 'Selecciona **todas** las heurísticas de Nielsen que apliquen:', type: 'weighted', points: 3,
        options: [
          { id: 'q2a', text: 'Visibilidad del estado del sistema', weight: 50 },
          { id: 'q2b', text: 'Prevención de errores', weight: 50 },
          { id: 'q2c', text: 'Maximizar la densidad de información', weight: 0 },
          { id: 'q2d', text: 'Usar siempre color rojo para lo importante', weight: 0 },
        ],
      },
    ],
    shuffleQuestions: false,
    shuffleOptions: false,
    maxAttempts: 1,
    timeLimit: 30,
    lockBrowser: true,
  } as unknown as Quiz;

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl mx-auto pb-32">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
        <Chip active={accent === 'cyan'} onClick={() => setAccent('cyan')}>Estudiante</Chip>
        <Chip active={accent === 'purple'} onClick={() => setAccent('purple')}>Simulación</Chip>
        <Chip active={tiempo === 742} onClick={() => setTiempo(742)}>12 min</Chip>
        <Chip active={tiempo === 240} onClick={() => setTiempo(240)}>4 min</Chip>
        <Chip active={tiempo === 38} onClick={() => setTiempo(38)}>38 s</Chip>
      </div>

      <QuizRunner
        quiz={quiz}
        answers={answers}
        onAnswer={(q, v) => setAnswers((prev) => ({ ...prev, [q]: v }))}
        timeLeft={tiempo}
        blurWarnings={accent === 'purple' ? 1 : 0}
        submitting={false}
        onSubmit={() => {}}
        accent={accent}
        submitLabel={accent === 'purple' ? 'Enviar simulación' : 'Enviar Parcial'}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { useQuizSession } from '@/lib/useQuizSession';

/** Taller — comprueba que el cronómetro sobrevive a recargas. Sin datos reales. */
export default function PrototypeQuizTimer() {
  // Dos minutos, suficiente para recargar y comprobar que sigue bajando.
  const { started, answers, timeLeft, expired, start, setAnswer, clearSession } =
    useQuizSession('prototipo-demo', 2);

  return (
    <div className="px-4 py-8 max-w-lg mx-auto space-y-4">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño
      </span>
      <h1 className="text-xl font-bold text-foreground">Cronómetro del parcial</h1>

      {!started ? (
        <button onClick={start}
          className="px-4 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold cursor-pointer">
          Comenzar
        </button>
      ) : (
        <div className="space-y-3">
          <p data-testid="time" className="text-3xl font-bold tabular-nums text-foreground">
            {timeLeft === null ? '—' : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
          </p>
          <p data-testid="expired" className="text-sm text-subtle">vencido: {String(expired)}</p>
          <button onClick={() => setAnswer('q1', 'opcion-a')}
            className="px-3 py-2 rounded-lg border border-surface-border text-sm cursor-pointer">
            Responder q1
          </button>
          <p data-testid="answers" className="text-meta font-mono text-subtle">
            {JSON.stringify(answers)}
          </p>
          <button onClick={clearSession}
            className="text-meta text-red-400 underline cursor-pointer">reiniciar sesión</button>
        </div>
      )}
    </div>
  );
}

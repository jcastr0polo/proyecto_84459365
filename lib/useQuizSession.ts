'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useQuizSession — sesión de un parcial que sobrevive a recargas y a que el
 * navegador ponga la pestaña en segundo plano.
 *
 * Arregla tres fallos del cronómetro anterior:
 *
 * 1. Contaba pulsos de setInterval, no tiempo real. Los navegadores frenan
 *    los temporizadores en pestañas de fondo (y móvil los detiene del todo),
 *    así que cambiar de pestaña REGALABA tiempo. Ahora el tiempo restante se
 *    calcula siempre contra una fecha límite fija: da igual cuántos pulsos se
 *    pierdan.
 *
 * 2. Recargar la página reiniciaba el cronómetro desde cero, porque el estado
 *    "empezado" solo vivía en memoria. La fecha límite ahora se guarda, así
 *    que al volver se retoma donde iba, y si ya pasó, se marca vencido.
 *
 * 3. Las respuestas solo estaban en memoria. Si se caía la pestaña en mitad
 *    de un parcial de un solo intento, se perdía todo sin remedio. Ahora se
 *    guardan según se responden.
 *
 * Aviso: esto vive en el navegador, así que protege de accidentes (recargas,
 * caídas, cambios de pestaña), no de alguien que borre el almacenamiento a
 * propósito. Para eso haría falta que el servidor registre el inicio del
 * intento, que es un cambio de API aparte.
 */

export type QuizAnswers = Record<string, string | string[]>;

interface Session {
  deadline: number | null;  // epoch ms; null si el parcial no tiene límite
  answers: QuizAnswers;
}

export function useQuizSession(quizId: string, timeLimitMinutes?: number) {
  const key = `nexus:quiz:${quizId}`;
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const deadlineRef = useRef<number | null>(null);

  const persist = useCallback((s: Session) => {
    try { window.localStorage.setItem(key, JSON.stringify(s)); } catch { /* sin almacenamiento */ }
  }, [key]);

  const clearSession = useCallback(() => {
    deadlineRef.current = null;
    try { window.localStorage.removeItem(key); } catch { /* nada que hacer */ }
  }, [key]);

  // Se retoma la sesión al montar. En el servidor no hay localStorage, así
  // que leerlo en el render provocaría un desajuste de hidratación.
  useEffect(() => {
    let saved: Session | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) saved = JSON.parse(raw) as Session;
    } catch { /* sesión ilegible; se empieza de cero */ }
    if (!saved) return;

    deadlineRef.current = saved.deadline;
    // Retomar una sesión guardada es justamente sincronizar con un sistema
    // externo (localStorage), que no existe en el servidor: leerlo durante el
    // render provocaría un desajuste de hidratación. Ocurre una sola vez.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers(saved.answers ?? {});
    if (saved.deadline !== null && saved.deadline <= Date.now()) {
      setExpired(true);
      setStarted(true);
      setTimeLeft(0);
    } else {
      setStarted(true);
      if (saved.deadline !== null) {
        setTimeLeft(Math.ceil((saved.deadline - Date.now()) / 1000));
      }
    }
  }, [key]);

  const start = useCallback(() => {
    const deadline = timeLimitMinutes ? Date.now() + timeLimitMinutes * 60_000 : null;
    deadlineRef.current = deadline;
    setStarted(true);
    if (deadline !== null) setTimeLeft(Math.ceil((deadline - Date.now()) / 1000));
    persist({ deadline, answers: {} });
  }, [timeLimitMinutes, persist]);

  const setAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      persist({ deadline: deadlineRef.current, answers: next });
      return next;
    });
  }, [persist]);

  // El tiempo restante se recalcula contra la fecha límite en cada pulso, no
  // se decrementa: si el navegador frena el temporizador, el número sigue bien.
  useEffect(() => {
    if (!started || deadlineRef.current === null || expired) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setExpired(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    // Al volver a la pestaña se recalcula de inmediato, sin esperar al pulso.
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [started, expired]);

  return { started, answers, timeLeft, expired, start, setAnswer, clearSession };
}

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import TableroTarjeta, { type AvanceEstudiante } from '@/components/checklist/TableroTarjeta';
import Button from '@/components/ui/Button';

/** Taller — el tablero moviéndose. Datos falsos, nada toca la base. */
const NOMBRES: [string, string][] = [
  ['Restrepo', 'Ana'], ['Cárdenas', 'Bruno'], ['Ochoa', 'Carla'], ['Peña', 'Diego'],
  ['Gómez', 'Elena'], ['Herrera', 'Felipe'], ['Ibáñez', 'Gabriela'], ['Jiménez', 'Hugo'],
  ['Lozano', 'Inés'], ['Mejía', 'Julián'], ['Navarro', 'Karla'], ['Ortiz', 'Luis'],
];
const TOTAL = 6;

export default function PrototipoTablero() {
  const [alumnos, setAlumnos] = useState<AvanceEstudiante[]>(() =>
    NOMBRES.map(([ln, fn], i) => ({
      studentId: `s${i}`, lastName: ln, firstName: fn,
      done: i < 4 ? (i % 3) + 1 : 0,
      itemIds: [], evidences: i === 1 ? [{ itemId: 'x', url: '#', name: 'e' }] : [],
      lastAt: i < 4 ? new Date(Date.now() - (i + 1) * 45_000).toISOString() : null,
    })));
  const [ahora, setAhora] = useState(() => Date.now());
  const [destellos, setDestellos] = useState<Set<string>>(new Set());
  const [auto, setAuto] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  /** Uno cualquiera marca un punto, como pasaría en clase. */
  const marcaAlguien = React.useCallback(() => {
    setAlumnos((prev) => {
      const candidatos = prev.filter((a) => a.done < TOTAL);
      if (candidatos.length === 0) return prev;
      const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
      setDestellos(new Set([elegido.studentId]));
      window.setTimeout(() => setDestellos(new Set()), 1300);
      return prev.map((a) => a.studentId === elegido.studentId
        ? { ...a, done: a.done + 1, lastAt: new Date().toISOString() } : a);
    });
    setAhora(Date.now());
  }, []);

  useEffect(() => {
    if (!auto) return;
    timer.current = window.setInterval(marcaAlguien, 2200);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [auto, marcaAlguien]);

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ordenados = useMemo(() => [...alumnos].sort((a, b) => {
    if (a.lastAt && b.lastAt && a.lastAt !== b.lastAt) return a.lastAt < b.lastAt ? 1 : -1;
    if (a.lastAt && !b.lastAt) return -1;
    if (!a.lastAt && b.lastAt) return 1;
    if (a.done !== b.done) return b.done - a.done;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'es');
  }), [alumnos]);

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller · datos falsos</span>
          <h1 className="text-xl font-bold text-foreground">Tablero en vivo</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={marcaAlguien}>Que marque alguien</Button>
          <Button variant={auto ? 'primary' : 'secondary'} size="sm" onClick={() => setAuto((v) => !v)}>
            {auto ? 'Pausar' : 'Reanudar'}
          </Button>
        </div>
      </div>

      <LayoutGroup>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {ordenados.map((a) => (
              <TableroTarjeta key={a.studentId} alumno={a} total={TOTAL} ahora={ahora}
                recienMarcado={destellos.has(a.studentId)} />
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
    </div>
  );
}

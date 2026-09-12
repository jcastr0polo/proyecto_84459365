'use client';

import React from 'react';
import Link from 'next/link';
import { Target, ChevronRight } from 'lucide-react';
import { gradeText, formatScore, PASS, SCALE_MAX } from '@/lib/gradeScale';
import { toneBox, toneText } from '@/lib/semantics';

export interface NeedItem {
  courseId: string;
  courseName: string;
  current: number | null;
  needed: number;
  remainingWeight: number;
}

/**
 * Qué necesitas en lo que queda.
 *
 * Es la pregunta con la que un estudiante mira sus notas, y la única que el
 * sistema nunca le respondía: veía un 2.6 y no sabía si eso era recuperable o
 * si ya daba igual lo que hiciera. La cuenta siempre estuvo ahí —el peso de
 * cada corte y cuáles tienen nota—; solo faltaba despejarla y decirla.
 *
 * Tres decisiones sobre cómo se dice:
 *
 * · Si el número necesario pasa de 5.0 se dice igual, con el número, y sin
 *   veredicto. "Ya no puedes pasar" es una sentencia que no le corresponde
 *   dar a una pantalla; el dato con un "habla con tu docente" deja la puerta
 *   por donde de verdad se arregla eso: un supletorio, una entrega tardía, una
 *   nota mal puesta.
 * · Solo aparecen los cursos donde de verdad hay algo que hacer. A quien va
 *   con 4.5 no le sirve saber que le basta un 1.0: es ruido.
 * · No se compara con el grupo. Decirle a quien va raspando que está por
 *   debajo de la media no le da ninguna información accionable y sí le quita
 *   ganas.
 */
export default function WhatYouNeed({ items }: { items: NeedItem[] }) {
  /* Solo donde aún se decide algo: si con menos de un 3.0 en lo que queda ya
     pasa, no hay nada que avisar. */
  const relevantes = items
    .filter((i) => i.needed > PASS - 0.5)
    .sort((a, b) => b.needed - a.needed);

  if (relevantes.length === 0) return null;

  return (
    <section>
      <h2 className="type-section text-subtle mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" aria-hidden="true" />
        Qué necesitas en lo que queda
      </h2>

      <div className="space-y-2">
        {relevantes.map((i) => {
          const imposible = i.needed > SCALE_MAX;
          const apretado = !imposible && i.needed >= 4;

          return (
            <Link
              key={i.courseId}
              href={`/student/courses/${i.courseId}/grades`}
              className={`block rounded-xl border p-4 transition-colors duration-[var(--dur-fast)]
                          hover:bg-surface-hover active:bg-surface-sunken
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                          ${imposible ? toneBox.critical
                            : apretado ? toneBox.attention
                            : 'border-surface-border bg-surface'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{i.courseName}</p>
                  <p className="text-xs text-subtle mt-0.5">
                    Vas por <span className={gradeText(i.current)}>{formatScore(i.current)}</span>
                    {' · '}queda por calificar el {i.remainingWeight}% del curso
                  </p>

                  {imposible ? (
                    /* El número, no la sentencia. */
                    <p className={`text-xs mt-2 ${toneText.critical}`}>
                      Para llegar a 3.0 necesitarías {i.needed.toFixed(1)} en lo que queda, y la nota
                      máxima es {SCALE_MAX.toFixed(1)}. Habla con tu docente.
                    </p>
                  ) : (
                    <p className="text-xs text-subtle mt-2">
                      Necesitas un{' '}
                      <strong className={`text-base ${apretado ? toneText.attention : toneText.ok}`}>
                        {i.needed.toFixed(1)}
                      </strong>
                      {' '}de media en lo que falta para pasar con 3.0.
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-faint shrink-0 mt-0.5" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

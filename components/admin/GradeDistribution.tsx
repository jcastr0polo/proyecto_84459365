'use client';

import React, { useState } from 'react';
import { gradeText, PASS } from '@/lib/gradeScale';

export interface Bin { label: string; min: number; count: number }

/**
 * Distribución de notas del semestre.
 *
 * Un panel que lista veinte nombres no dice cómo va el curso; dice quiénes son
 * veinte personas. Lo que un docente lee de un vistazo es DÓNDE se acumula el
 * grupo: si la masa está pegada al 3.0 el problema es del curso, y si hay dos
 * bultos separados el problema es otro —y pide otra respuesta—.
 *
 * Por qué columnas y no una torta
 * ───────────────────────────────
 * La nota es una escala ORDENADA. Una torta no tiene orden: no puede enseñar
 * que el grupo se amontona justo por debajo del corte, que es la única lectura
 * que importa aquí. Y comparar ángulos es bastante menos preciso que comparar
 * longitudes contra una línea base común.
 *
 * El color no es decorativo: son los mismos tres estados que usa toda la
 * aplicación —reprobado, justo, bien—, y por eso el umbral va marcado con una
 * línea y una etiqueta, no solo con el tono. Nadie tiene que distinguir rojo de
 * ámbar para leer el gráfico.
 */
export default function GradeDistribution({
  bins, average, scoredCount, rosterCount,
}: {
  bins: Bin[];
  average: number | null;
  scoredCount: number;
  rosterCount: number;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);

  const total = bins.reduce((a, b) => a + b.count, 0);
  if (total === 0) return null;

  const maximo = Math.max(...bins.map((b) => b.count));
  const reprobados = bins.filter((b) => b.min < PASS).reduce((a, b) => a + b.count, 0);

  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold text-foreground">Cómo va el grupo</h2>
        <button
          onClick={() => setTabla((v) => !v)}
          className="text-micro text-subtle hover:text-foreground transition-colors
                     duration-[var(--dur-fast)] cursor-pointer min-h-11 flex items-center"
        >
          {tabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>

      <p className="text-xs text-subtle mt-1">
        {scoredCount} de {rosterCount} inscripciones con nota
        {reprobados > 0 && (
          <span className="text-red-600 dark:text-red-400"> · {reprobados} bajo 3.0</span>
        )}
      </p>

      {tabla ? (
        /* Toda gráfica necesita su equivalente en texto: con lector de pantalla
           o con la hoja impresa en blanco y negro, las barras no existen. */
        <table className="w-full mt-4 text-xs">
          <thead>
            <tr className="text-subtle text-left">
              <th className="font-medium py-1">Tramo</th>
              <th className="font-medium py-1 text-right">Estudiantes</th>
              <th className="font-medium py-1 text-right">Del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {bins.map((b) => (
              <tr key={b.label}>
                <td className="py-1.5 text-foreground/90 tabular-nums">{b.label}</td>
                <td className="py-1.5 text-right text-foreground tabular-nums">{b.count}</td>
                <td className="py-1.5 text-right text-subtle tabular-nums">
                  {Math.round((b.count / total) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-5">
          <div className="flex items-end gap-1.5 h-32" role="img"
            aria-label={`Distribución de notas: ${bins.map((b) => `${b.count} entre ${b.label}`).join(', ')}`}>
            {bins.map((b, i) => {
              const alto = maximo > 0 ? Math.max(2, (b.count / maximo) * 100) : 2;
              const aprueba = b.min >= PASS;
              return (
                <div
                  key={b.label}
                  className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                >
                  {activo === i && (
                    <div className="absolute -top-1 z-10 px-2 py-1 rounded-md bg-foreground text-canvas
                                    text-micro font-medium whitespace-nowrap pointer-events-none">
                      {b.count} {b.count === 1 ? 'estudiante' : 'estudiantes'}
                    </div>
                  )}
                  {/* Barra fina, con el extremo redondeado y anclada a la
                      línea base. Nada de bloques gruesos saturados. */}
                  <div
                    className={`w-full rounded-t transition-[height,opacity] duration-[var(--dur-base)]
                                ease-[var(--ease-out)] motion-reduce:transition-none
                                ${aprueba
                                  ? (b.min >= 4 ? 'bg-emerald-500' : 'bg-emerald-500/60')
                                  : 'bg-red-500/80'}
                                ${activo !== null && activo !== i ? 'opacity-50' : 'opacity-100'}`}
                    style={{ height: `${alto}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* El umbral, dicho con línea Y con palabra. */}
          <div className="relative mt-1.5">
            <div className="h-px bg-surface-border" />
            <div className="flex gap-1.5 mt-1.5">
              {bins.map((b) => (
                <div key={b.label} className="flex-1 text-center">
                  <p className="text-micro text-subtle tabular-nums">{b.label}</p>
                  <p className={`text-xs font-semibold tabular-nums ${b.count > 0 ? gradeText(b.min + 0.2) : 'text-faint'}`}>
                    {b.count}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-micro text-faint mt-2">
              A la izquierda del 3.0 está lo reprobado.
            </p>
          </div>
        </div>
      )}

      {average !== null && (
        <p className="text-xs text-subtle mt-4 pt-4 border-t border-surface-border">
          Promedio del semestre{' '}
          <strong className={`text-base ${gradeText(average)}`}>{average.toFixed(1)}</strong>
          <span className="text-faint"> sobre 5.0</span>
        </p>
      )}
    </section>
  );
}

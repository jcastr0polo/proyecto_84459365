'use client';

import React from 'react';
import { CalendarClock, CircleDot, Lock, PowerOff } from 'lucide-react';
import { disponibilidadDe } from '@/lib/disponibilidadParcial';
import { toneChip, toneText } from '@/lib/semantics';
import type { Quiz } from '@/lib/types';

type QuizVentana = Pick<Quiz, 'isActive' | 'startDate' | 'endDate'>;

const ICONO = {
  abierto: CircleDot,
  programado: CalendarClock,
  cerrado: Lock,
  /* No un check: «inactivo» no es «listo», y un visto bueno junto a un parcial
     apagado se lee justo al revés de lo que significa. */
  inactivo: PowerOff,
} as const;

const TONO_CHIP = {
  abierto: toneChip.ok,
  programado: toneChip.attention,
  cerrado: toneChip.critical,
  inactivo: toneChip.lifecycle,
} as const;

/**
 * El estado de un parcial, de un vistazo.
 *
 * Antes solo se enseñaba la bandera `isActive`, así que un parcial cuya fecha
 * cerró hace una semana aparecía como «Activo» igual que uno abierto ahora
 * mismo. Para decidir antes de una clase —¿puedo abrirlo ya?, ¿se me cerró?—
 * eso no servía.
 */
export function EstadoParcialBadge({ quiz }: { quiz: QuizVentana }) {
  const d = disponibilidadDe(quiz);
  const Icono = ICONO[d.estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border
                      text-meta font-medium shrink-0 ${TONO_CHIP[d.estado]}`}>
      <Icono className="w-3.5 h-3.5" aria-hidden="true" />
      {d.etiqueta}
    </span>
  );
}

const fecha = (d: Date | null) => (d
  ? d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null);

/** Cuánto falta, en palabras. Un «en 3 días» se lee mejor que una fecha. */
function enPalabras(destino: Date, ahora: Date): string {
  const min = Math.round((destino.getTime() - ahora.getTime()) / 60000);
  const futuro = min >= 0;
  const m = Math.abs(min);
  const texto = m < 60 ? `${m} min`
    : m < 60 * 24 ? `${Math.round(m / 60)} h`
    : `${Math.round(m / (60 * 24))} día${Math.round(m / (60 * 24)) === 1 ? '' : 's'}`;
  return futuro ? `en ${texto}` : `hace ${texto}`;
}

/**
 * La ventana del parcial: cuándo abre y cuándo cierra.
 *
 * Se destaca el dato que importa AHORA —lo que falta para abrir si está
 * programado, lo que queda si está abierto— y el otro queda en gris. Las dos
 * fechas con el mismo peso obligan a leerlas las dos para saber cuál mirar.
 */
export function VentanaParcial({ quiz }: { quiz: QuizVentana }) {
  const ahora = new Date();
  const d = disponibilidadDe(quiz, ahora);

  if (!d.abre && !d.cierra) {
    return (
      <p className="text-meta text-faint">
        Sin fechas{d.estado === 'abierto' ? ' · disponible mientras esté activo' : ''}
      </p>
    );
  }

  const quedaPoco = d.estado === 'abierto' && d.cierra
    && d.cierra.getTime() - ahora.getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
      {d.abre && (
        <span className={d.estado === 'programado' ? toneText.attention : 'text-subtle'}>
          <span className="text-faint">Abre</span> {fecha(d.abre)}
          {d.estado === 'programado' && <span className="font-medium"> · {enPalabras(d.abre, ahora)}</span>}
        </span>
      )}
      {d.cierra && (
        <span className={quedaPoco ? toneText.critical : d.estado === 'cerrado' ? 'text-subtle' : 'text-subtle'}>
          <span className="text-faint">Cierra</span> {fecha(d.cierra)}
          {d.estado === 'abierto' && <span className="font-medium"> · {enPalabras(d.cierra, ahora)}</span>}
          {d.estado === 'cerrado' && <span className="font-medium"> · {enPalabras(d.cierra, ahora)}</span>}
        </span>
      )}
    </div>
  );
}

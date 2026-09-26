'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, LayoutGroup, useReducedMotion, motion } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import NexusMark from '@/components/ui/NexusMark';
import type { AvanceEstudiante } from '@/components/checklist/TableroTarjeta';

const CADA_MS = 3000;

/**
 * El tablero, para proyectar.
 *
 * Esto no es una pantalla de trabajo: es una pantalla para MIRAR, desde el
 * fondo de un aula, mientras el docente habla. Todo lo que no sea la clase
 * avanzando sobra, y lo que queda tiene que leerse a cinco metros.
 *
 * Tres decisiones que salen de ahí:
 *
 * · El tamaño de letra sale del ancho de la ventana y del NÚMERO de
 *   estudiantes, no de una escala fija. Con ocho, las tarjetas son enormes;
 *   con cuarenta, caben todas sin scroll. Una pantalla de proyección que
 *   obliga a hacer scroll no sirve: nadie va a estar desplazándola.
 * · No hay scroll. Si no cabe, encoge.
 * · Los controles se esconden solos a los pocos segundos y vuelven al mover
 *   el ratón. Un aspa flotando sobre la proyección durante una hora es
 *   exactamente el tipo de detalle que estropea una pantalla así.
 */
export default function TableroProyeccion() {
  const { actId } = useParams<{ actId: string }>();
  const router = useRouter();
  const reducir = useReducedMotion();

  const [titulo, setTitulo] = useState('');
  const [curso, setCurso] = useState('');
  const [items, setItems] = useState<{ id: string }[]>([]);
  const [alumnos, setAlumnos] = useState<AvanceEstudiante[]>([]);
  const [enVivo, setEnVivo] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [controles, setControles] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const previas = useRef<Map<string, number>>(new Map());
  const [destellos, setDestellos] = useState<Set<string>>(new Set());
  const ocultar = useRef<number | undefined>(undefined);

  const traer = useCallback(async (primera = false) => {
    try {
      const res = await fetch(`/api/activities/${actId}/lista`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      /* Esta ruta vive fuera de /admin, así que no hereda su guarda. La API
         solo devuelve la clase entera a un docente: si no viene, quien mira
         no tiene por qué ver el avance de sus compañeros. */
      if (!Array.isArray(data.students)) { router.replace('/login'); return; }
      setTitulo(data.activity.title);
      setCurso(data.activity.courseName ?? '');
      setItems(data.items ?? []);
      const nuevos: AvanceEstudiante[] = data.students ?? [];
      if (!primera) {
        const subieron = nuevos.filter((a) => (previas.current.get(a.studentId) ?? 0) < a.done);
        if (subieron.length) {
          setDestellos(new Set(subieron.map((a) => a.studentId)));
          window.setTimeout(() => setDestellos(new Set()), 1600);
        }
      }
      previas.current = new Map(nuevos.map((a) => [a.studentId, a.done]));
      setAlumnos(nuevos);
      setEnVivo(true);
    } catch { setEnVivo(false); }
    finally { if (primera) setCargado(true); }
  }, [actId, router]);

  useEffect(() => { traer(true); }, [traer]);
  useEffect(() => {
    let id: number | undefined;
    const arrancar = () => { id = window.setInterval(() => traer(), CADA_MS); };
    const parar = () => { if (id) window.clearInterval(id); id = undefined; };
    const visibilidad = () => {
      if (document.visibilityState === 'visible') { traer(); arrancar(); } else parar();
    };
    if (document.visibilityState === 'visible') arrancar();
    document.addEventListener('visibilitychange', visibilidad);
    return () => { parar(); document.removeEventListener('visibilitychange', visibilidad); };
  }, [traer]);

  /* Los controles vuelven al mover el ratón y se van a los 3 s. */
  useEffect(() => {
    const despertar = () => {
      setControles(true);
      if (ocultar.current) window.clearTimeout(ocultar.current);
      ocultar.current = window.setTimeout(() => setControles(false), 3000);
    };
    despertar();
    window.addEventListener('mousemove', despertar);
    window.addEventListener('keydown', despertar);
    return () => {
      window.removeEventListener('mousemove', despertar);
      window.removeEventListener('keydown', despertar);
      if (ocultar.current) window.clearTimeout(ocultar.current);
    };
  }, []);

  useEffect(() => {
    const cambio = () => setPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', cambio);
    return () => document.removeEventListener('fullscreenchange', cambio);
  }, []);

  const total = items.length;
  const ordenados = useMemo(() => [...alumnos].sort((a, b) => {
    if (a.lastAt && b.lastAt && a.lastAt !== b.lastAt) return a.lastAt < b.lastAt ? 1 : -1;
    if (a.lastAt && !b.lastAt) return -1;
    if (!a.lastAt && b.lastAt) return 1;
    if (a.done !== b.done) return b.done - a.done;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'es');
  }), [alumnos]);

  /* La rejilla se decide por cuántos hay, no por puntos de ruptura del
     navegador: lo que manda aquí es que quepan todos en una pantalla. */
  const n = ordenados.length;
  const columnas = n <= 6 ? 2 : n <= 12 ? 3 : n <= 24 ? 4 : n <= 40 ? 5 : 6;
  const escala = n <= 6 ? 1.35 : n <= 12 ? 1.1 : n <= 24 ? 0.9 : n <= 40 ? 0.74 : 0.62;

  const terminaron = alumnos.filter((a) => total > 0 && a.done === total).length;
  const marcasTotales = alumnos.reduce((s, a) => s + a.done, 0);
  const pctClase = n * total > 0 ? Math.round((marcasTotales / (n * total)) * 100) : 0;

  if (!cargado) {
    return <div className="h-screen grid place-items-center text-subtle text-lg">Cargando el tablero…</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden px-[2.5vw] py-[2vh]">
      {/* ─── Cabecera ─── */}
      <header className="flex items-end justify-between gap-6 shrink-0 pb-[1.6vh]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <NexusMark size="sm" decorative />
            <p className="text-subtle uppercase tracking-[0.2em]"
               style={{ fontSize: 'clamp(0.7rem, 0.85vw, 1rem)' }}>
              {curso || 'En clase'}
            </p>
          </div>
          <h1 className="font-bold text-foreground tracking-tight truncate mt-1"
              style={{ fontSize: 'clamp(1.4rem, 2.6vw, 3.2rem)', fontFamily: 'var(--font-playfair)' }}>
            {titulo}
          </h1>
        </div>

        <div className="flex items-end gap-[2.5vw] shrink-0">
          <Cifra valor={`${terminaron}`} de={`${n}`} etiqueta="terminaron" />
          <Cifra valor={`${pctClase}%`} etiqueta="de la clase" acento />
          <span className="flex items-center gap-2 pb-2" aria-live="polite">
            <span className={`relative flex h-2.5 w-2.5 ${enVivo ? '' : 'opacity-50'}`} aria-hidden="true">
              {enVivo && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${enVivo ? 'bg-emerald-400' : 'bg-red-500'}`} />
            </span>
            <span className="text-subtle" style={{ fontSize: 'clamp(0.7rem, 0.85vw, 1rem)' }}>
              {enVivo ? 'En vivo' : 'Sin señal'}
            </span>
          </span>
        </div>
      </header>

      {/* ─── La clase ─── */}
      <LayoutGroup>
        {/* Las filas se reparten el alto que queda: en una proyección, media
            pantalla en negro es medio proyector desperdiciado, y cuanto más
            altas las tarjetas más grande es el nombre desde el fondo. */}
        <ul className="flex-1 grid gap-[1.1vw] min-h-0"
            style={{
              gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
              gridAutoRows: '1fr',
            }}>
          <AnimatePresence initial={false}>
            {ordenados.map((a) => (
              <TarjetaProyeccion key={a.studentId} alumno={a} total={total}
                escala={escala} destello={destellos.has(a.studentId)} reducir={Boolean(reducir)} />
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>

      {/* ─── Controles, que se quitan de en medio ─── */}
      <div
        className="fixed top-4 right-4 flex items-center gap-2 transition-opacity duration-300"
        style={{ opacity: controles ? 1 : 0, pointerEvents: controles ? 'auto' : 'none' }}
      >
        <button
          onClick={() => (document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen?.().catch(() => {}))}
          className="p-3 rounded-xl bg-surface-opaque border border-surface-border text-muted
                     hover:text-foreground transition-colors cursor-pointer"
          aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {pantallaCompleta ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
        <button
          onClick={() => router.back()}
          className="p-3 rounded-xl bg-surface-opaque border border-surface-border text-muted
                     hover:text-foreground transition-colors cursor-pointer"
          aria-label="Cerrar el tablero"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Cifra({ valor, de, etiqueta, acento }: { valor: string; de?: string; etiqueta: string; acento?: boolean }) {
  return (
    <div className="text-right">
      <p className={`font-bold tabular-nums leading-none ${acento ? 'text-cyan-400' : 'text-foreground'}`}
         style={{ fontSize: 'clamp(1.6rem, 3vw, 3.6rem)' }}>
        {valor}
        {de && <span className="text-subtle font-medium" style={{ fontSize: '0.5em' }}> / {de}</span>}
      </p>
      <p className="text-subtle uppercase tracking-[0.18em] mt-1"
         style={{ fontSize: 'clamp(0.6rem, 0.72vw, 0.85rem)' }}>{etiqueta}</p>
    </div>
  );
}

function TarjetaProyeccion({
  alumno, total, escala, destello, reducir,
}: {
  alumno: AvanceEstudiante; total: number; escala: number; destello: boolean; reducir: boolean;
}) {
  const completo = total > 0 && alumno.done === total;
  const pct = total > 0 ? (alumno.done / total) * 100 : 0;

  return (
    <motion.li
      layout={reducir ? false : 'position'}
      transition={{ type: 'spring', duration: 0.55, bounce: 0.15 }}
      style={{ zIndex: destello ? 2 : 1 }}
      className={`relative rounded-2xl border overflow-hidden
                  ${completo ? 'border-emerald-500/40 bg-emerald-500/[0.1]'
                             : 'border-surface-border bg-surface-opaque'}`}
    >
      {/* El relleno es el FONDO de la tarjeta, no una barrita: a cinco metros
          una barra de 10px no se ve, un bloque de color sí. */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 ${completo ? 'bg-emerald-500/20' : 'bg-cyan-500/[0.18]'}`}
        style={{
          width: `${pct}%`,
          transition: reducir ? 'none' : 'width 480ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-400"
        style={{ opacity: destello && !reducir ? 1 : 0,
                 transition: destello ? 'opacity 120ms ease-out' : 'opacity 1400ms ease-out' }}
      />

      <div className="relative h-full flex items-center justify-between gap-3 px-[1.3vw]">
        <p className="font-semibold text-foreground truncate"
           style={{ fontSize: `clamp(0.8rem, ${1.15 * escala}vw, 2rem)` }}>
          {alumno.lastName}, {alumno.firstName}
        </p>
        <p className={`font-bold tabular-nums shrink-0 ${completo ? 'text-emerald-400' : 'text-foreground'}`}
           style={{ fontSize: `clamp(0.9rem, ${1.5 * escala}vw, 2.6rem)` }}>
          {alumno.done}<span className="text-subtle" style={{ fontSize: '0.55em' }}>/{total}</span>
        </p>
      </div>
    </motion.li>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { Radio, Pencil, Maximize2 } from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import TableroTarjeta, { type AvanceEstudiante } from '@/components/checklist/TableroTarjeta';
import EditorDeLista from '@/components/checklist/EditorDeLista';
import type { ChecklistItem } from '@/lib/types';

/** Cada cuánto se vuelve a preguntar. */
const CADA_MS = 3000;

/**
 * El tablero: el curso entero avanzando, en vivo, para proyectar.
 *
 * Por qué se pregunta cada 3 s y no hay websocket: en un aula de veinte, tres
 * segundos ya se leen como "en vivo", y una consulta indexada por actividad no
 * pesa nada. Un canal en tiempo real traería claves en el navegador, reglas de
 * fila y un estado de reconexión que mantener, para ganar dos segundos en la
 * única pantalla donde el docente está de pie delante de la clase.
 *
 * Se para cuando la pestaña no se ve. Sin eso, un tablero abierto toda la
 * tarde en un portátil olvidado sigue preguntando hasta mañana.
 */
export default function TableroPage() {
  const { courseId, actId } = useParams<{ courseId: string; actId: string }>();
  const { toast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [alumnos, setAlumnos] = useState<AvanceEstudiante[]>([]);
  const [ahora, setAhora] = useState(() => Date.now());
  const [editando, setEditando] = useState(false);
  const [enVivo, setEnVivo] = useState(true);

  /** Quién acaba de marcar, para el destello. Ref y no estado: no repinta. */
  const marcasPrevias = useRef<Map<string, number>>(new Map());
  const [destellos, setDestellos] = useState<Set<string>>(new Set());

  const traer = useCallback(async (primeraVez = false) => {
    try {
      const res = await fetch(`/api/activities/${actId}/lista`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar');

      setTitulo(data.activity.title);
      const puntos = data.items ?? [];
      setItems(puntos);
      /* Sin puntos no hay nada que mirar: lo que toca es escribirlos, así que
         el editor se abre solo. Solo en la primera carga, para no reabrirlo
         encima del docente en cada vuelta del sondeo. */
      if (primeraVez && puntos.length === 0) setEditando(true);
      setAhora(Date.parse(data.now) || Date.now());

      const nuevos: AvanceEstudiante[] = data.students ?? [];

      /* Quién subió desde la última vuelta. En la primera carga no destella
         nadie: si no, al abrir el tablero parpadea la clase entera. */
      if (!primeraVez) {
        const subieron = nuevos
          .filter((a) => (marcasPrevias.current.get(a.studentId) ?? 0) < a.done)
          .map((a) => a.studentId);
        if (subieron.length > 0) {
          setDestellos(new Set(subieron));
          window.setTimeout(() => setDestellos(new Set()), 1300);
        }
      }
      marcasPrevias.current = new Map(nuevos.map((a) => [a.studentId, a.done]));
      setAlumnos(nuevos);
      setEnVivo(true);
    } catch (e) {
      setEnVivo(false);
      if (primeraVez) toast(e instanceof Error ? e.message : 'Error de conexión', 'error');
    } finally {
      if (primeraVez) setCargando(false);
    }
  }, [actId, toast]);

  useEffect(() => { traer(true); }, [traer]);

  useEffect(() => {
    if (editando) return;                       // editando no se repinta debajo
    let id: number | undefined;
    const arrancar = () => { id = window.setInterval(() => traer(), CADA_MS); };
    const parar = () => { if (id) window.clearInterval(id); id = undefined; };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') { traer(); arrancar(); } else parar();
    };
    if (document.visibilityState === 'visible') arrancar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => { parar(); document.removeEventListener('visibilitychange', alCambiarVisibilidad); };
  }, [traer, editando]);

  /* El más reciente arriba. A igualdad de hora, quien lleva más; y al final,
     por apellido, para que quien no ha empezado no baile en cada vuelta. */
  const ordenados = useMemo(() => [...alumnos].sort((a, b) => {
    if (a.lastAt && b.lastAt && a.lastAt !== b.lastAt) return a.lastAt < b.lastAt ? 1 : -1;
    if (a.lastAt && !b.lastAt) return -1;
    if (!a.lastAt && b.lastAt) return 1;
    if (a.done !== b.done) return b.done - a.done;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'es');
  }), [alumnos]);

  const total = items.length;
  const terminaron = alumnos.filter((a) => total > 0 && a.done === total).length;
  const empezaron = alumnos.filter((a) => a.done > 0).length;
  const marcasTotales = alumnos.reduce((s, a) => s + a.done, 0);
  const posibles = alumnos.length * total;

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <BackLink href={`/admin/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>
          <h1 className="type-page text-foreground mt-1">{titulo}</h1>
          <p className="text-sm text-subtle mt-1 flex items-center gap-2">
            {/* El punto dice si de verdad está llegando información. Sin esto,
                un tablero congelado por wifi caído se ve idéntico a una clase
                que no está marcando nada. */}
            <span className={`relative flex h-2 w-2 ${enVivo ? '' : 'opacity-40'}`} aria-hidden="true">
              {enVivo && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${enVivo ? 'bg-emerald-400' : 'bg-red-500'}`} />
            </span>
            {enVivo ? 'En vivo' : 'Sin conexión — reintentando'}
            <span className="text-faint">·</span>
            {alumnos.length} estudiantes · {total} puntos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditando((v) => !v)}>
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            {editando ? 'Cerrar' : 'Editar lista'}
          </Button>
          <Button variant="secondary" size="sm"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> Proyectar
          </Button>
        </div>
      </div>

      {editando && (
        <EditorDeLista
          activityId={actId}
          items={items}
          onGuardado={(nuevos) => { setItems(nuevos); setEditando(false); traer(); }}
          onCancelar={() => setEditando(false)}
        />
      )}

      {total > 0 && alumnos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Resumen valor={`${empezaron}`} de={`${alumnos.length}`} etiqueta="empezaron" />
          <Resumen valor={`${terminaron}`} de={`${alumnos.length}`} etiqueta="terminaron" />
          <Resumen valor={`${posibles > 0 ? Math.round((marcasTotales / posibles) * 100) : 0}%`} etiqueta="del total marcado" />
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
          <Radio className="w-8 h-8 text-faint mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-muted">Esta lista todavía no tiene puntos.</p>
          <p className="text-xs text-subtle mt-1">Pulsa «Editar lista» y escribe lo que deben hacer.</p>
        </div>
      ) : (
        <LayoutGroup>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {ordenados.map((a) => (
                <TableroTarjeta
                  key={a.studentId}
                  alumno={a}
                  total={total}
                  ahora={ahora}
                  recienMarcado={destellos.has(a.studentId)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>
      )}
    </div>
  );
}

function Resumen({ valor, de, etiqueta }: { valor: string; de?: string; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3">
      <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
        {valor}
        {de && <span className="text-base font-medium text-subtle"> / {de}</span>}
      </p>
      <p className="text-meta text-subtle mt-1.5 uppercase tracking-wider">{etiqueta}</p>
    </div>
  );
}

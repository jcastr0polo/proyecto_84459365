'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Link2, Inbox, CheckCircle2 } from 'lucide-react';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import { gradeText, formatScore } from '@/lib/gradeScale';
import { toneBox, toneText } from '@/lib/semantics';

interface Archivo { id: string; fileName: string; filePath: string; fileSize: number }
interface Entrega {
  id: string; activityId: string; title: string; submittedAt: string;
  isLate: boolean; version: number;
  attachments: Archivo[];
  links: { type: string; url: string; label?: string }[];
  feedbackAttachments: Archivo[];
  score: number | null; maxScore: number | null; feedback: string | null;
}
interface CursoEntregas { courseId: string; courseName: string; courseCode: string; entregas: Entrega[] }

const peso = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`);

const urlDescarga = (p: string) => (p.startsWith('http')
  ? `/api/upload/download?url=${encodeURIComponent(p)}&download=1`
  : `/api/upload/${p.replace('uploads/', '')}?download=1`);

/**
 * Mis entregas.
 *
 * Un estudiante no tenía dónde recuperar su propio trabajo: los archivos
 * estaban, pero había que acordarse de en qué actividad de qué curso se subió
 * cada cosa y entrar una por una. Para rehacer una segunda versión sobre la
 * primera eso es media tarde.
 *
 * Se agrupa por curso y se ordena por fecha, lo más reciente primero, que es
 * como se busca: «lo que entregué la semana pasada». Y junto a cada entrega va
 * lo que el docente devolvió corregido, porque quien viene a por su archivo
 * normalmente viene a por los dos.
 */
export default function MisEntregasPage() {
  const { toast } = useToast();
  const [cargando, setCargando] = useState(true);
  const [cursos, setCursos] = useState<CursoEntregas[]>([]);
  const [semestre, setSemestre] = useState<string | null>(null);
  const [archivos, setArchivos] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/student/entregas');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar');
        setCursos(data.cursos ?? []);
        setSemestre(data.semestre?.label ?? null);
        setArchivos(data.archivos ?? 0);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Error de conexión', 'error');
      } finally { setCargando(false); }
    })();
  }, [toast]);

  if (cargando) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <Skeleton className="h-7 w-48" />
        <SkeletonList rows={4} />
      </div>
    );
  }

  const total = cursos.reduce((n, c) => n + c.entregas.length, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      <div>
        <h1 className="type-page text-foreground">Mis entregas</h1>
        <p className="text-sm text-subtle mt-1">
          {total === 0
            ? 'Todavía no has entregado nada este semestre.'
            : <>Todo lo que has entregado{semestre ? <> en {semestre}</> : ''}: {total} entrega{total !== 1 ? 's' : ''}
               {archivos > 0 && <> · {archivos} archivo{archivos !== 1 ? 's' : ''} para descargar</>}.</>}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6 text-subtle" />}
          title="Nada entregado todavía"
          description="Cuando envíes una actividad, aquí podrás volver a descargar lo que subiste."
        />
      ) : cursos.map((curso) => (
        <section key={curso.courseId} className="space-y-3">
          <h2 className="type-section text-subtle">
            {curso.courseName} <span className="text-faint">· {curso.courseCode}</span>
          </h2>

          {curso.entregas.map((e) => (
            <article key={e.id} className="rounded-xl border border-surface-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link
                    href={`/student/courses/${curso.courseId}/activities/${e.activityId}`}
                    className="text-sm font-semibold text-foreground hover:text-cyan-500 transition-colors"
                  >
                    {e.title}
                  </Link>
                  <p className="text-meta text-subtle mt-0.5">
                    {formatDateTimeColombia(e.submittedAt)}
                    {e.version > 1 && <> · versión {e.version}</>}
                    {e.isLate && <span className={toneText.attention}> · entrega tardía</span>}
                  </p>
                </div>
                {e.score !== null && (
                  <p className="text-sm shrink-0">
                    <span className={`text-lg font-bold ${gradeText(e.score)}`}>{formatScore(e.score)}</span>
                    <span className="text-faint"> / {formatScore(e.maxScore ?? 5)}</span>
                  </p>
                )}
              </div>

              {e.attachments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {e.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={urlDescarga(a.filePath)}
                        download
                        className="flex items-center gap-2.5 rounded-lg border border-surface-border
                                   bg-surface-sunken px-3 py-2.5 min-h-11
                                   hover:bg-surface-hover hover:border-surface-border-hover
                                   transition-colors duration-[var(--dur-fast)]
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                      >
                        <FileText className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                        <span className="text-sm text-foreground/90 truncate flex-1">{a.fileName}</span>
                        <span className="text-meta text-faint shrink-0">{peso(a.fileSize)}</span>
                        <Download className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {e.links.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {e.links.map((l, i) => (
                    <li key={i}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-meta text-subtle hover:text-foreground
                                   transition-colors min-h-11">
                        <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{l.label || l.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {/* Lo que el docente devolvió. Quien viene a por su archivo
                  normalmente viene a por los dos. */}
              {e.feedbackAttachments.length > 0 && (
                <div className={`mt-3 rounded-lg border p-3 ${toneBox.ok}`}>
                  <p className="text-meta font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Tu docente te devolvió
                  </p>
                  <ul className="space-y-1.5">
                    {e.feedbackAttachments.map((a) => (
                      <li key={a.id}>
                        <a href={urlDescarga(a.filePath)} download
                          className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5 min-h-11
                                     hover:bg-surface-hover transition-colors duration-[var(--dur-fast)]
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
                          <FileText className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                          <span className="text-sm text-foreground/90 truncate flex-1">{a.fileName}</span>
                          <Download className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {e.feedback && (
                <p className="mt-3 text-sm text-muted leading-relaxed border-t border-surface-border pt-3">
                  {e.feedback}
                </p>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

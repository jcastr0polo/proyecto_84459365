'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Download, ExternalLink } from 'lucide-react';
import type { AvanceEstudiante } from './TableroTarjeta';

/**
 * Los pantallazos que mandó un estudiante.
 *
 * El tablero contaba las evidencias pero no había dónde abrirlas, que es
 * justo para lo que se piden. Se revisan desde el tablero de trabajo y no
 * desde la pantalla de proyección: esa es para mostrar, y abrir capturas de
 * alguien delante de toda la clase no es lo que se busca.
 *
 * Cada captura va con el texto de SU punto. Un archivo llamado
 * «Captura de pantalla 2026-09-28.png» no dice de qué es, y revisar veinte
 * sin saber a qué corresponden no sirve de nada.
 */
export default function Evidencias({
  alumno, onClose,
}: {
  alumno: AvanceEstudiante | null;
  onClose: () => void;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const verUrl = (u: string) =>
    u.startsWith('http') ? `/api/upload/download?url=${encodeURIComponent(u)}`
                         : `/api/upload/${u.replace('uploads/', '')}`;
  const bajarUrl = (u: string) =>
    u.startsWith('http') ? `/api/upload/download?url=${encodeURIComponent(u)}&download=1`
                         : `/api/upload/${u.replace('uploads/', '')}?download=1`;

  const hora = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <>
      <Modal
        open={Boolean(alumno)}
        onClose={onClose}
        title={alumno ? `${alumno.lastName}, ${alumno.firstName}` : ''}
        maxWidth="lg"
      >
        {alumno && (
          alumno.evidences.length === 0 ? (
            <p className="text-sm text-subtle">
              Todavía no ha subido ningún pantallazo.
            </p>
          ) : (
            <div className="space-y-4">
              {alumno.evidences.map((e) => (
                <div key={e.itemId} className="rounded-xl border border-surface-border bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground min-w-0">
                      {e.itemText || 'Punto de la lista'}
                    </p>
                    <p className="text-meta text-subtle shrink-0">{hora(e.doneAt)}</p>
                  </div>

                  {/* Se pincha para ampliar: a tamaño de tarjeta no se lee una
                      terminal ni una barra de direcciones, que es justo lo que
                      hay que comprobar. */}
                  <button
                    type="button"
                    onClick={() => setAmpliada(verUrl(e.url))}
                    className="block w-full rounded-lg overflow-hidden border border-surface-border
                               cursor-zoom-in focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-cyan-500/40"
                    aria-label={`Ampliar el pantallazo de ${e.itemText}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- vive
                        en el Blob y se sirve por nuestra API, con dominio variable. */}
                    <img src={verUrl(e.url)} alt={`Pantallazo de ${e.itemText}`}
                      className="w-full max-h-72 object-cover object-top bg-surface-sunken" />
                  </button>

                  <div className="flex items-center gap-2 mt-2.5">
                    <a href={verUrl(e.url)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 text-meta text-subtle hover:text-foreground
                                  transition-colors min-h-11">
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Abrir aparte
                    </a>
                    <a href={bajarUrl(e.url)} download
                       className="inline-flex items-center gap-1.5 text-meta text-subtle hover:text-foreground
                                  transition-colors min-h-11">
                      <Download className="w-3.5 h-3.5" aria-hidden="true" /> Descargar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Modal>

      {/* Ampliada: fondo negro y la imagen entera, para leer lo que pone. */}
      {ampliada && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-label="Pantallazo ampliado"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <Button variant="secondary" size="sm" className="absolute top-4 right-4"
            onClick={() => setAmpliada(null)}>
            Cerrar
          </Button>
        </div>
      )}
    </>
  );
}

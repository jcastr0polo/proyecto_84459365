'use client';

import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * La portada del proyecto en la vitrina.
 *
 * Es lo primero que ve de su trabajo alguien de fuera, y hasta ahora la ponía
 * el docente pegando una URL: el estudiante podía elegir el nombre, la
 * descripción y si su proyecto era público, pero no con qué imagen salía.
 *
 * Dos caminos porque hay dos situaciones reales: quien tiene la captura en el
 * portátil la sube —va al mismo Blob que el documento del proyecto— y quien ya
 * la tiene publicada pega la dirección desde el formulario de edición.
 *
 * Vive aparte del formulario a propósito: subir un archivo no es un cambio que
 * se guarde con el resto, ocurre en el momento. Meterlo dentro obligaría a
 * pulsar "Guardar" para algo que ya pasó.
 */
export default function ProjectShowcaseImage({
  projectName, imageUrl, editable, busy, onUpload, onRemove,
}: {
  projectName: string;
  imageUrl?: string;
  /** El docente cierra la edición cuando el proyecto ya no está en curso. */
  editable: boolean;
  busy: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-6 pt-6 border-t border-surface-border">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-meta text-subtle uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Imagen del proyecto
        </p>

        {editable && (
          <div className="flex items-center gap-2">
            {imageUrl && (
              <Button variant="ghost" size="xs" onClick={onRemove} disabled={busy}>
                Quitar
              </Button>
            )}
            {/* Un <label> y no un Button: el que abre el selector de archivos
                tiene que ser la etiqueta del input, si no hay que apañarlo con
                un ref y un click() sintético. El área de pulsación se lleva a
                44px con el mismo pseudo-elemento que usan Chip y Button xs. */}
            <label className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-meta font-medium
              relative after:absolute after:inset-x-0 after:top-1/2 after:-translate-y-1/2
              after:h-11 after:content-[''] transition-colors duration-[var(--dur-fast)]
              focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500/40
              ${busy
                ? 'bg-foreground/5 text-faint cursor-not-allowed'
                : 'bg-foreground/10 text-foreground hover:bg-foreground/15 cursor-pointer'}`}>
              <Upload className={`w-3.5 h-3.5 ${busy ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {busy ? 'Subiendo…' : (imageUrl ? 'Cambiar' : 'Subir imagen')}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif"
                onChange={onUpload}
                disabled={busy}
                className="sr-only"
              />
            </label>
          </div>
        )}
      </div>

      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- la dirección
           puede ser del Blob o de un sitio cualquiera que haya pegado el
           estudiante; next/image exige declarar cada dominio de antemano. */
        <img
          src={imageUrl}
          alt={`Portada de ${projectName}`}
          className="w-full max-h-56 object-cover rounded-lg border border-surface-border bg-surface-sunken"
        />
      ) : (
        <p className="text-xs text-subtle max-w-prose">
          Una captura del proyecto funcionando. Es lo primero que se ve de tu trabajo en la vitrina
          pública. PNG, JPG, WEBP o GIF, hasta 5MB
          {editable && <> — o pega una dirección desde <strong className="text-muted">Editar</strong> si ya la tienes publicada</>}.
        </p>
      )}
    </div>
  );
}

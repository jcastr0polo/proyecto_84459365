'use client';

import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, Link2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import type { ChecklistItem } from '@/lib/types';

/**
 * Escribir los puntos de la lista.
 *
 * Pensado para teclear deprisa delante de la clase: Enter añade la línea
 * siguiente y deja el foco ahí, así que se escribe la lista entera sin tocar
 * el ratón. Lo lento es tener que apuntar a un botón «añadir» entre punto y
 * punto.
 *
 * Los puntos que ya existían conservan su id. Si se regeneraran al guardar,
 * todas las marcas de la clase quedarían huérfanas y el avance de todo el
 * mundo volvería a cero de golpe, en directo.
 */
export default function EditorDeLista({
  activityId, items, onGuardado, onCancelar,
}: {
  activityId: string;
  items: ChecklistItem[];
  onGuardado: (items: ChecklistItem[]) => void;
  onCancelar: () => void;
}) {
  const { toast } = useToast();
  const [borrador, setBorrador] = useState<ChecklistItem[]>(
    items.length > 0 ? items : [{ id: '', text: '', requiresEvidence: false }],
  );
  const [guardando, setGuardando] = useState(false);

  const cambiar = (i: number, parche: Partial<ChecklistItem>) =>
    setBorrador((b) => b.map((x, j) => (j === i ? { ...x, ...parche } : x)));

  const anadirTras = (i: number) =>
    setBorrador((b) => [...b.slice(0, i + 1), { id: '', text: '', requiresEvidence: false }, ...b.slice(i + 1)]);

  const quitar = (i: number) =>
    setBorrador((b) => (b.length === 1 ? [{ id: '', text: '', requiresEvidence: false }] : b.filter((_, j) => j !== i)));

  async function guardar() {
    const limpios = borrador.filter((i) => i.text.trim().length > 0);
    if (limpios.length === 0) { toast('Escribe al menos un punto', 'error'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/lista`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: limpios.map((i) => ({ ...i, text: i.text.trim() })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      toast(`Lista guardada · ${data.items.length} puntos`, 'success');
      onGuardado(data.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error de conexión', 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Puntos de la lista</h2>
        <p className="text-meta text-subtle">Enter para añadir el siguiente</p>
      </div>

      <ol className="space-y-2">
        {borrador.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-3 text-faint shrink-0" aria-hidden="true">
              <GripVertical className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <input
                value={item.text}
                onChange={(e) => cambiar(i, { text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); anadirTras(i);
                    window.setTimeout(() => {
                      const campos = document.querySelectorAll<HTMLInputElement>('[data-punto]');
                      campos[i + 1]?.focus();
                    }, 0);
                  }
                }}
                data-punto
                placeholder={`Punto ${i + 1} — qué tienen que hacer`}
                aria-label={`Punto ${i + 1}`}
                className="w-full px-3 py-2.5 min-h-11 rounded-lg bg-foreground/[0.04]
                           border border-foreground/[0.08] text-sm text-foreground
                           placeholder:text-faint focus:outline-none focus:border-cyan-500/40"
              />
              <label className="mt-1.5 inline-flex items-center gap-2 text-meta text-subtle cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  checked={item.requiresEvidence}
                  onChange={(e) => cambiar(i, { requiresEvidence: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <Link2 className="w-3 h-3" aria-hidden="true" />
                Pedir evidencia para marcarlo
              </label>
            </div>
            <span className="mt-1.5 shrink-0">
              <IconButton label={`Quitar el punto ${i + 1}`} tone="danger"
                icon={<Trash2 className="w-4 h-4" />} onClick={() => quitar(i)} />
            </span>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Button variant="secondary" size="sm" onClick={() => anadirTras(borrador.length - 1)}>
          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Añadir punto
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" size="md" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button variant="primary" size="md" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar lista'}
        </Button>
      </div>
    </div>
  );
}

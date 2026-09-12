'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import CorteCard, { type CorteOverview } from '@/components/admin/CorteCard';
import { toneBox } from '@/lib/semantics';
import ApplyDatesModal from '@/components/admin/ApplyDatesModal';
import Link from 'next/link';
import { CalendarClock, AlertTriangle, ArrowLeft, Plus, Layers } from 'lucide-react';

/** Colores de los tramos; se repiten si hay más de cinco cortes. */
const SEGMENT_COLORS = [
  'bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
];

export default function CortesPage() {
  const params = useParams();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [cortes, setCortes] = useState<CorteOverview[]>([]);
  const [orphanItems, setOrphanItems] = useState<string[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [courseName, setCourseName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [importable, setImportable] = useState<{
    source: string;
    items: { order: number; name: string; weight: number; reportDeadline?: string }[];
    wouldCreate: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCorte, setEditingCorte] = useState<CorteOverview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWeight, setFormWeight] = useState(30);
  const [formOrder, setFormOrder] = useState(1);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formReport, setFormReport] = useState('');

  const fetchCortes = useCallback(async () => {
    try {
      const [cortesRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/cortes/overview`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (!cortesRes.ok) throw new Error('Error cargando cortes');
      const cortesData = await cortesRes.json();
      setCortes(cortesData.cortes ?? []);
      setTotalWeight(cortesData.totalWeight ?? 0);
      setOrphanItems(cortesData.orphanItems ?? []);

      /* Solo hace falta cuando no hay cortes: es el estado en el que cae el
         docente al crear la asignatura. */
      if ((cortesData.cortes ?? []).length === 0) {
        const impRes = await fetch(`/api/courses/${courseId}/cortes/import`);
        if (impRes.ok) setImportable(await impRes.json());
      } else {
        setImportable(null);
      }

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourseName(courseData.course?.name ?? '');
        setSemesterId(courseData.course?.semesterId ?? '');
      }
    } catch {
      toast('Error al cargar cortes', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchCortes(); }, [fetchCortes]);

  function openCreate() {
    setEditingCorte(null);
    setFormName('');
    setFormWeight(Math.min(30, 100 - totalWeight));
    setFormOrder(cortes.length + 1);
    setModalOpen(true);
  }

  function openEdit(corte: CorteOverview) {
    setEditingCorte(corte);
    setFormName(corte.name);
    setFormWeight(corte.weight);
    setFormOrder(corte.order);
    setFormStart(corte.startDate ?? '');
    setFormEnd(corte.endDate ?? '');
    setFormReport(corte.reportDeadline ?? '');
    setModalOpen(true);
  }

  async function importarCortes() {
    setImporting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/cortes/import`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo importar');
      toast(d.message ?? 'Cortes importados', 'success');
      await fetchCortes();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo importar', 'error');
    } finally {
      setImporting(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCorte(null);
    setFormStart('');
    setFormEnd('');
    setFormReport('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isEdit = !!editingCorte;
      const url = isEdit
        ? `/api/courses/${courseId}/cortes/${editingCorte!.id}`
        : `/api/courses/${courseId}/cortes`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: formName,
        weight: formWeight,
        order: formOrder,
        // Se mandan siempre, también vacías: así se puede borrar una fecha.
        startDate: formStart,
        endDate: formEnd,
        reportDeadline: formReport,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al guardar', 'error');
        return;
      }

      toast(isEdit ? 'Corte actualizado' : 'Corte creado', 'success');
      closeModal();
      await fetchCortes();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(corteId: string) {
    try {
      const res = await fetch(`/api/courses/${courseId}/cortes/${corteId}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        /* El backend devuelve la lista de lo que estorba. Decir solo "no se
           puede" deja al docente adivinando qué mover. */
        const lista: string[] = result.blockers ?? [];
        toast(
          lista.length > 0
            ? `${result.error}. ${lista.slice(0, 3).join(', ')}${lista.length > 3 ? `, y ${lista.length - 3} más` : ''}.`
            : (result.error || 'Error al eliminar'),
          'error',
        );
        return;
      }

      toast('Corte eliminado', 'success');
      await fetchCortes();
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  const remainingWeight = 100 - totalWeight;
  const maxWeightForForm = editingCorte
    ? remainingWeight + editingCorte.weight
    : remainingWeight;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/courses/${courseId}`}
          aria-label="Volver al curso"
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors duration-[var(--dur-fast)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Cortes de Evaluación</h1>
          {courseName && (
            <p className="text-sm text-foreground/60 mt-0.5">{courseName}</p>
          )}
        </div>
        <Button onClick={openCreate} disabled={totalWeight >= 100}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Corte
        </Button>
      </div>

      {/*
        Barra segmentada, no un bloque sólido: lo que importa de esta pantalla
        es CÓMO se reparte el 100% entre los cortes, y eso una barra llena de
        un solo color no lo dice. Cada tramo lleva su nombre y su peso.
      */}
      <div className="rounded-xl border border-surface-border bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted">Distribución de pesos</span>
          <span className={`text-sm font-bold tabular-nums ${
            totalWeight === 100
              ? 'text-emerald-600 dark:text-emerald-400'
              : totalWeight > 100
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'}`}>
            {totalWeight}% de 100%
          </span>
        </div>

        <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.08] gap-0.5">
          {[...cortes].sort((a, b) => a.order - b.order).map((corte, i) => (
            <div
              key={corte.id}
              title={`${corte.name}: ${corte.weight}%`}
              style={{ width: `${Math.min(corte.weight, 100)}%` }}
              className={`h-full transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]
                          motion-reduce:transition-none ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
            />
          ))}
        </div>

        {cortes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            {[...cortes].sort((a, b) => a.order - b.order).map((corte, i) => (
              <span key={corte.id} className="flex items-center gap-1.5 text-meta text-subtle">
                <span className={`w-2 h-2 rounded-sm ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                {corte.name} · {corte.weight}%
              </span>
            ))}
          </div>
        )}

        {totalWeight < 100 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            Falta repartir {remainingWeight}%. Mientras no sume 100, la nota
            definitiva del curso se calcula sobre una base incompleta.
          </p>
        )}
        {totalWeight > 100 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-3">
            Los pesos suman más de 100%. Revisa los cortes antes de calificar.
          </p>
        )}
        {totalWeight === 100 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">
            La distribución está completa.
          </p>
        )}
      </div>

      {cortes.length === 0 ? (
        <div className="space-y-3">
          {/*
            Aquí es donde cae el docente nada más crear una asignatura, y en la
            práctica sus cortes son los mismos de las demás del semestre. Que
            lo primero que vea sea "impórtalos" y no "tecléalos de nuevo".
          */}
          {importable && importable.items.length > 0 && (
            <div className={`rounded-xl border p-4 ${toneBox.action}`}>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                {importable.source === 'semester'
                  ? 'El semestre ya tiene un calendario de cortes'
                  : 'Las demás asignaturas del semestre ya tienen sus cortes'}
              </p>
              <p className="text-xs text-subtle mt-1 max-w-prose">
                Se crearán {importable.wouldCreate} {importable.wouldCreate === 1 ? 'corte' : 'cortes'} con
                su nombre, peso y fechas. Después puedes cambiar lo que quieras: importar no ata a nada.
              </p>

              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {importable.items.map((i) => (
                  <li key={i.order}
                    className="text-micro text-muted rounded-md border border-surface-border bg-surface px-2 py-1">
                    {i.name} · {i.weight}%
                    {i.reportDeadline && <span className="text-cyan-600 dark:text-cyan-400"> · reporte {i.reportDeadline.slice(8)}/{i.reportDeadline.slice(5, 7)}</span>}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button onClick={importarCortes} loading={importing}>
                  Importar {importable.wouldCreate} {importable.wouldCreate === 1 ? 'corte' : 'cortes'}
                </Button>
                <Button variant="secondary" onClick={openCreate}>
                  Crearlos a mano
                </Button>
              </div>
            </div>
          )}

          {(!importable || importable.items.length === 0) && (
            <EmptyState
              icon={<Layers className="h-12 w-12" />}
              title="Sin cortes configurados"
              description="Crea los cortes de evaluación para este curso. Ej: Corte 1 (30%), Corte 2 (30%), Corte 3 (40%)"
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear Primer Corte
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Los cortes suelen ser los mismos en todas las asignaturas del
              semestre. Ponerlos uno por uno en cada curso es trabajo repetido
              y es donde se cuela la fecha tecleada distinta. */}
          {semesterId && cortes.some((c) => c.startDate || c.endDate || c.reportDeadline) && (
            <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl
                            border border-surface-border bg-surface-sunken px-4 py-3">
              <p className="text-xs text-subtle max-w-prose">
                ¿Los demás cursos del semestre llevan el mismo calendario? Copia estas fechas
                de una vez, emparejando por orden de corte.
              </p>
              <Button variant="primary" size="sm" className="shrink-0"
                onClick={() => setApplyOpen(true)}
              >
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                Aplicar al semestre
              </Button>
            </div>
          )}

          {/* Lo que no está en ningún corte no entra en ningún reporte de
              notas: si el docente no lo ve aquí, no lo ve en ninguna parte. */}
          {orphanItems.length > 0 && (
            <div className={`rounded-xl border p-4 ${toneBox.attention}`}>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                {orphanItems.length === 1
                  ? '1 ítem calificable sin corte'
                  : `${orphanItems.length} ítems calificables sin corte`}
              </p>
              <p className="text-xs text-subtle mt-1 max-w-prose">
                No pertenecen a ningún corte, así que no aparecen en ningún reporte de notas
                y la definitiva del curso deja de ponderar por corte. Asígnales uno al editarlos.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {orphanItems.map((t) => (
                  <li key={t} className="text-micro text-muted rounded-md border border-surface-border bg-surface px-2 py-1">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cortes.map((corte) => (
            <CorteCard
              key={corte.id}
              corte={corte}
              onEdit={() => openEdit(corte)}
              onDelete={() => handleDelete(corte.id)}
            />
          ))}
        </div>
      )}

      <ApplyDatesModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        semesterId={semesterId}
        courseId={courseId}
        cortes={cortes.map((c) => ({
          order: c.order, name: c.name,
          startDate: c.startDate, endDate: c.endDate, reportDeadline: c.reportDeadline,
        }))}
        onDone={(m) => { toast(m, 'success'); fetchCortes(); }}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCorte ? 'Editar Corte' : 'Nuevo Corte'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del Corte</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Corte 1, Primer Parcial..."
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Peso (%)
              <span className="text-foreground/50 ml-1">
                — Máximo disponible: {maxWeightForForm}%
              </span>
            </label>
            <input
              type="number"
              value={formWeight}
              onChange={(e) => setFormWeight(Number(e.target.value))}
              min={1}
              max={maxWeightForForm}
              step={1}
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Orden</label>
            <input
              type="number"
              value={formOrder}
              onChange={(e) => setFormOrder(Number(e.target.value))}
              min={1}
              step={1}
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              required
            />
          </div>

          {/*
            Las tres fechas.

            El tope de reporte no es el cierre del corte: primero se acaba de
            dictar y calificar, y después hay un plazo para subir las notas a
            la plataforma de la universidad. Esa segunda fecha es la que de
            verdad aprieta, y la que el panel usa para avisar.
          */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="c-ini" className="block text-sm font-medium mb-1">Inicia</label>
              <input id="c-ini" type="date" value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full px-3 py-2 min-h-11 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
            <div>
              <label htmlFor="c-fin" className="block text-sm font-medium mb-1">Cierra</label>
              <input id="c-fin" type="date" value={formEnd} min={formStart || undefined}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full px-3 py-2 min-h-11 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
          </div>

          <div>
            <label htmlFor="c-rep" className="block text-sm font-medium mb-1">
              Tope para reportar notas
            </label>
            <input id="c-rep" type="date" value={formReport} min={formEnd || formStart || undefined}
              onChange={(e) => setFormReport(e.target.value)}
              className="w-full px-3 py-2 min-h-11 rounded-lg border border-foreground/20 bg-canvas text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            <p className="text-xs text-subtle mt-1">
              Fecha límite para subirlas a la plataforma de la universidad. El panel avisa
              cuando se acerca y te dice qué falta por calificar.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || formWeight < 1 || formWeight > maxWeightForForm}>
              {submitting ? 'Guardando...' : editingCorte ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Table, { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import type { Corte } from '@/lib/types';

interface CorteFormData {
  name: string;
  weight: number;
  order: number;
}

export default function CortesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [cortes, setCortes] = useState<Corte[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCorte, setEditingCorte] = useState<Corte | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWeight, setFormWeight] = useState(30);
  const [formOrder, setFormOrder] = useState(1);

  const fetchCortes = useCallback(async () => {
    try {
      const [cortesRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/cortes`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (!cortesRes.ok) throw new Error('Error cargando cortes');
      const cortesData = await cortesRes.json();
      setCortes(cortesData.cortes ?? []);
      setTotalWeight(cortesData.totalWeight ?? 0);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourseName(courseData.course?.name ?? '');
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

  function openEdit(corte: Corte) {
    setEditingCorte(corte);
    setFormName(corte.name);
    setFormWeight(corte.weight);
    setFormOrder(corte.order);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCorte(null);
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

      const payload: CorteFormData = {
        name: formName,
        weight: formWeight,
        order: formOrder,
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
        toast(result.error || 'Error al eliminar', 'error');
        return;
      }

      toast('Corte eliminado', 'success');
      setDeleteConfirm(null);
      await fetchCortes();
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  const remainingWeight = 100 - totalWeight;
  const maxWeightForForm = editingCorte
    ? remainingWeight + editingCorte.weight
    : remainingWeight;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}`)}
          className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
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

      {/* Weight summary card */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground/70">Distribución de Pesos</span>
            <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-emerald-600' : totalWeight > 100 ? 'text-red-500' : 'text-amber-500'}`}>
              {totalWeight}% / 100%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                totalWeight === 100
                  ? 'bg-emerald-500'
                  : totalWeight > 100
                    ? 'bg-red-500'
                    : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
          {totalWeight < 100 && (
            <p className="text-xs text-amber-600 mt-2">
              Falta asignar {remainingWeight}% para completar el 100%
            </p>
          )}
          {totalWeight === 100 && (
            <p className="text-xs text-emerald-600 mt-2">
              ✓ La distribución de pesos está completa
            </p>
          )}
        </div>
      </Card>

      {/* Cortes table */}
      {cortes.length === 0 ? (
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
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Orden</Th>
              <Th>Nombre</Th>
              <Th>Peso (%)</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {cortes.map((corte) => (
              <Tr key={corte.id}>
                <Td>{corte.order}</Td>
                <Td className="font-medium">{corte.name}</Td>
                <Td>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                    {corte.weight}%
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(corte)}
                      className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/60 hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deleteConfirm === corte.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(corte.id)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(corte.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-foreground/60 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

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
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-base text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
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
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-base text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
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
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-base text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              required
            />
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

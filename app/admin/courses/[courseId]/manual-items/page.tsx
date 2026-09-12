'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Table, { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Plus, Pencil, Trash2, ListChecks, Users } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { ManualGradeItem, Corte } from '@/lib/types';


export default function ManualItemsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [items, setItems] = useState<ManualGradeItem[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);

  // Item form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ManualGradeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxScore, setFormMaxScore] = useState(5.0);
  const [formWeight, setFormWeight] = useState(0);
  const [formCorteId, setFormCorteId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Grade entry modal

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, cortesRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/manual-items`),
        fetch(`/api/courses/${courseId}/cortes`),
        fetch(`/api/courses/${courseId}`),
      ]);

      if (itemsRes.ok) {
        const d = await itemsRes.json();
        setItems(d.items ?? []);
      }
      if (cortesRes.ok) {
        const d = await cortesRes.json();
        setCortes(d.cortes ?? []);
      }
      if (courseRes.ok) {
        const d = await courseRes.json();
        setCourseName(d.course?.name ?? '');
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormMaxScore(5.0);
    setFormWeight(0);
    setFormCorteId('');
    setModalOpen(true);
  }

  function openEdit(item: ManualGradeItem) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description ?? '');
    setFormMaxScore(item.maxScore);
    setFormWeight(item.weight);
    setFormCorteId(item.corteId ?? '');
    setModalOpen(true);
  }

  async function handleSaveItem() {
    if (!formTitle.trim()) { toast('Título requerido', 'error'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        maxScore: formMaxScore,
        weight: formWeight,
        corteId: formCorteId || undefined,
      };

      const url = editingItem
        ? `/api/courses/${courseId}/manual-items/${editingItem.id}`
        : `/api/courses/${courseId}/manual-items`;

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error');
      }

      const data = await res.json().catch(() => ({}));
      toast(editingItem ? 'Ítem actualizado' : 'Ítem creado', 'success');
      setModalOpen(false);
      fetchData();

      // Se crea un ítem manual para calificarlo: se abre la ventana en vez de
      // dejar al docente buscándolo en la lista.
      if (!editingItem && data.item) {
        openGrading(data.item);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al guardar', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(itemId: string) {
    try {
      const res = await fetch(`/api/courses/${courseId}/manual-items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast('Item eliminado', 'success');
      setDeleteConfirm(null);
      fetchData();
    } catch {
      toast('Error al eliminar', 'error');
    }
  }

  // Calificar ocurre en su propia página: un modal deja poco alto, obliga a
  // dos zonas de desplazamiento y un clic fuera se lleva lo escrito.
  function openGrading(item: ManualGradeItem) {
    router.push(`/admin/courses/${courseId}/manual-items/${item.id}/grades`);
  }

  function corteName(corteId?: string) {
    if (!corteId) return '—';
    return cortes.find((c) => c.id === corteId)?.name ?? '—';
  }

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
      <button
        onClick={() => router.push(`/admin/courses/${courseId}`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver al curso
      </button>

      {courseName && <p className="text-xs text-subtle">{courseName}</p>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Notas manuales</h1>
        <Button onClick={openCreate} size="sm">
          <Plus size={14} className="mr-1" /> Nuevo item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} className="text-muted" />}
          title="Sin items manuales"
          description="Crea items para registrar notas de actividades externas a la plataforma."
          action={<Button onClick={openCreate} size="sm"><Plus size={14} className="mr-1" /> Crear item</Button>}
        />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>Título</Th>
                <Th>Corte</Th>
                <Th>Peso (%)</Th>
                <Th>Nota máx.</Th>
                <Th className="text-right">Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <div>
                      <span className="font-medium text-foreground">{item.title}</span>
                      {item.description && <p className="text-xs text-subtle mt-0.5 line-clamp-1">{item.description}</p>}
                    </div>
                  </Td>
                  <Td>{corteName(item.corteId)}</Td>
                  <Td>{item.weight}%</Td>
                  <Td>{item.maxScore}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openGrading(item)}
                        className="p-1.5 rounded-md hover:bg-foreground/5 text-muted hover:text-cyan-500 transition-colors"
                        title="Calificar"
                      >
                        <Users size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-md hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-1.5 rounded-md hover:bg-foreground/5 text-muted hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar item' : 'Nuevo item manual'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Título *</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ej: Taller presencial, Exposición..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Descripción</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Corte</label>
              <select
                value={formCorteId}
                onChange={(e) => setFormCorteId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="">Sin corte</option>
                {cortes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Peso (%)</label>
              <input
                type="number"
                value={formWeight}
                onChange={(e) => setFormWeight(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                min={0}
                max={100}
                step={0.1}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Nota máxima</label>
              <input
                type="number"
                value={formMaxScore}
                onChange={(e) => setFormMaxScore(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                min={0.1}
                step={0.1}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} loading={submitting}>{editingItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar item"
        message="¿Eliminar este item y todas sus notas? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}

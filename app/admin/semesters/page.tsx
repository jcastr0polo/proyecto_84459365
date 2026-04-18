'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Table, { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import SemesterForm from '@/components/forms/SemesterForm';
import type { SemesterFormData } from '@/components/forms/SemesterForm';
import type { Semester } from '@/lib/types';

export default function SemestersPage() {
  const { toast } = useToast();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const fetchSemesters = useCallback(async () => {
    try {
      const res = await fetch('/api/semesters');
      if (!res.ok) throw new Error('Error cargando semestres');
      const data = await res.json();
      setSemesters(data.semesters ?? []);
    } catch {
      toast('Error al cargar semestres', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  function openCreate() {
    setEditingSemester(undefined);
    setModalOpen(true);
  }

  function openEdit(sem: Semester) {
    setEditingSemester(sem);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSemester(undefined);
  }

  async function handleSubmit(data: SemesterFormData) {
    setSubmitting(true);
    try {
      const isEdit = !!editingSemester;
      const url = isEdit ? `/api/semesters/${editingSemester!.id}` : '/api/semesters';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { label: data.label, startDate: data.startDate, endDate: data.endDate, isActive: data.isActive }
        : data;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        toast(result.error || 'Error al guardar', 'error');
        return;
      }

      toast(isEdit ? 'Semestre actualizado' : 'Semestre creado', 'success');
      closeModal();
      await fetchSemesters();
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(sem: Semester) {
    const newState = !sem.isActive;
    const confirmMsg = newState
      ? `¿Activar "${sem.label}"? Se desactivarán los demás semestres.`
      : `¿Desactivar "${sem.label}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/semesters/${sem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newState }),
      });

      if (!res.ok) {
        const result = await res.json();
        toast(result.error || 'Error al actualizar', 'error');
        return;
      }

      toast(newState ? 'Semestre activado' : 'Semestre desactivado', 'success');
      await fetchSemesters();
    } catch {
      toast('Error de conexión', 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Semestres</h1>
          <p className="text-sm text-subtle mt-1">Gestión de períodos académicos</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Nuevo Semestre
        </Button>
      </div>

      {/* Content */}
      {semesters.length === 0 ? (
        <EmptyState
          icon={<span>📅</span>}
          title="No hay semestres"
          description="Crea tu primer semestre para comenzar a gestionar cursos."
          action={
            <Button variant="primary" size="sm" onClick={openCreate}>
              Crear semestre
            </Button>
          }
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Etiqueta</Th>
              <Th>Inicio</Th>
              <Th>Fin</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {semesters.map((sem) => (
              <Tr key={sem.id}>
                <Td>
                  <span className="font-mono text-xs text-muted">{sem.id}</span>
                </Td>
                <Td>
                  <span className="font-medium text-foreground/90">{sem.label}</span>
                </Td>
                <Td>{formatDate(sem.startDate)}</Td>
                <Td>{formatDate(sem.endDate)}</Td>
                <Td>
                  {sem.isActive ? (
                    <Badge variant="success" dot size="sm">Activo</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Inactivo</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(sem)}>
                      {sem.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(sem)}>
                      Editar
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingSemester ? 'Editar Semestre' : 'Nuevo Semestre'}
      >
        <SemesterForm
          semester={editingSemester}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

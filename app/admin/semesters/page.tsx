'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateColombia as formatDate } from '@/lib/dateUtils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Table, { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import SemesterForm from '@/components/forms/SemesterForm';
import type { SemesterFormData } from '@/components/forms/SemesterForm';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Semester, AppConfig } from '@/lib/types';
import { Calendar, Globe, Database } from 'lucide-react';

type SettingsTab = 'semesters' | 'general' | 'blob';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'semesters', label: 'Semestres', icon: <Calendar className="w-4 h-4" /> },
  { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
  { id: 'blob', label: 'Blob Sync', icon: <Database className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════
// Tab: General (timezone, config)
// ═══════════════════════════════════════════════
function GeneralTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setTimezone(data.timezone || 'America/Bogota');
      })
      .catch(() => toast('Error cargando configuración', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || 'Error al guardar', 'error');
        return;
      }
      const data = await res.json();
      setConfig(data.config);
      toast('Configuración guardada', 'success');
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  const TIMEZONES = [
    'America/Bogota',
    'America/Mexico_City',
    'America/Lima',
    'America/Santiago',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/Madrid',
    'Europe/London',
  ];

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-bold text-foreground tracking-tight">Configuración General</h2>
        <p className="text-sm text-subtle mt-1">Ajustes globales de la aplicación</p>
      </div>

      {/* Timezone */}
      <div className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] space-y-4">
        <div>
          <label htmlFor="cfg-tz" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Zona Horaria
          </label>
          <select
            id="cfg-tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground text-sm
                       outline-none transition-colors appearance-none cursor-pointer
                       focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-faint">
            Afecta timestamps, comparación de fechas límite, y horario de publicación de actividades.
          </p>
        </div>

        {/* Read-only info */}
        {config && (
          <div className="grid grid-cols-2 gap-3 text-xs text-muted">
            <div>
              <span className="text-subtle">App:</span> {config.appName}
            </div>
            <div>
              <span className="text-subtle">Versión:</span> {config.version}
            </div>
            <div>
              <span className="text-subtle">Locale:</span> {config.locale}
            </div>
            <div>
              <span className="text-subtle">Tema:</span> {config.theme}
            </div>
          </div>
        )}

        <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab: Blob Sync (redirect to existing page)
// ═══════════════════════════════════════════════
function BlobTab() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/blob-sync');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-subtle">Redirigiendo a Blob Sync...</p>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab: Semestres
// ═══════════════════════════════════════════════
function SemestersTab() {
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

  const [toggleTarget, setToggleTarget] = useState<{ sem: Semester; newState: boolean } | null>(null);

  async function toggleActive(sem: Semester) {
    const newState = toggleTarget?.newState ?? !sem.isActive;
    setToggleTarget(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Semestres</h2>
          <p className="text-sm text-subtle mt-1">Gestión de períodos académicos</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Nuevo Semestre
        </Button>
      </div>

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
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
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
                        <Button variant="ghost" size="sm" onClick={() => setToggleTarget({ sem, newState: !sem.isActive })}>
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
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {semesters.map((sem) => (
              <div
                key={sem.id}
                className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground/90">{sem.label}</p>
                    <p className="text-xs text-subtle font-mono mt-0.5">{sem.id}</p>
                  </div>
                  {sem.isActive ? (
                    <Badge variant="success" dot size="sm">Activo</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Inactivo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>Inicio: {formatDate(sem.startDate)}</span>
                  <span>Fin: {formatDate(sem.endDate)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-foreground/[0.06]">
                  <Button variant="ghost" size="sm" onClick={() => setToggleTarget({ sem, newState: !sem.isActive })} className="flex-1">
                    {sem.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(sem)} className="flex-1">
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && toggleActive(toggleTarget.sem)}
        title={toggleTarget?.newState ? 'Activar semestre' : 'Desactivar semestre'}
        message={toggleTarget?.newState
          ? `¿Activar "${toggleTarget?.sem.label}"? Se desactivarán los demás semestres.`
          : `¿Desactivar "${toggleTarget?.sem.label}"?`
        }
        confirmLabel={toggleTarget?.newState ? 'Activar' : 'Desactivar'}
        variant="warning"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Main Settings Page
// ═══════════════════════════════════════════════
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('semesters');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-subtle mt-1">Semestres, zona horaria y sincronización de datos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer
              ${activeTab === tab.id
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-muted hover:text-foreground hover:bg-foreground/[0.06] border border-transparent'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'semesters' && <SemestersTab />}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'blob' && <BlobTab />}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, RotateCcw, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2, Clock, Pencil, X, Check, Eye } from 'lucide-react';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import Chip from '@/components/ui/Chip';
import SearchInput from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import type { SafeUser } from '@/lib/types';

export default function AdminStudentsPage() {
  const { toast } = useToast();

  /**
   * Guarda de una vez los campos que hayan cambiado.
   *
   * En móvil los tres editores se abren juntos, así que confirmarlos uno a
   * uno serían tres toques en tres sitios distintos. Solo envía lo que
   * cambió, para no reescribir datos que nadie tocó.
   */
  async function saveAllEdits(student: SafeUser) {
    const jobs: Promise<void>[] = [];
    if (editingName?.id === student.id &&
        (editingName.first !== student.firstName || editingName.last !== student.lastName)) {
      jobs.push(handleUpdateName(student.id, editingName.first, editingName.last));
    }
    if (editingEmail?.id === student.id && editingEmail.value !== student.email) {
      jobs.push(handleUpdateEmail(student.id, editingEmail.value));
    }
    if (editingDoc?.id === student.id && editingDoc.value !== student.documentNumber) {
      jobs.push(handleUpdateDocument(student.id, editingDoc.value));
    }
    if (jobs.length === 0) toast('No cambiaste nada', 'info');
    await Promise.all(jobs);
    setEditingName(null); setEditingEmail(null); setEditingDoc(null);
  }

  const [students, setStudents] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'never'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{ student: SafeUser; action: 'resetPassword' | 'toggleActive' } | null>(null);
  const [editingName, setEditingName] = useState<{ id: string; first: string; last: string } | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; value: string } | null>(null);
  const [editingDoc, setEditingDoc] = useState<{ id: string; value: string } | null>(null);
  const router = useRouter();

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      if (!res.ok) return;
      const data = await res.json();
      setStudents(data.students ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);


  const counts = useMemo(() => ({
    all: students.length,
    active: students.filter((s) => s.isActive).length,
    inactive: students.filter((s) => !s.isActive).length,
    never: students.filter((s) => !s.lastLoginAt).length,
  }), [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (filter === 'active') list = list.filter((s) => s.isActive);
    else if (filter === 'inactive') list = list.filter((s) => !s.isActive);
    else if (filter === 'never') list = list.filter((s) => !s.lastLoginAt);

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.documentNumber.includes(q)
    );
  }, [students, search, filter]);

  async function handleAction(id: string, action: 'resetPassword' | 'toggleActive') {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message, 'success');
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
      } else {
        toast(data.error || 'Error', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateName(id: string, first: string, last: string) {
    setActionLoading(`${id}-name`);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateName', firstName: first, lastName: last }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message, 'success');
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingName(null);
      } else {
        toast(data.error || 'Error', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateEmail(id: string, newEmail: string) {
    setActionLoading(`${id}-email`);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateEmail', email: newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message, 'success');
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingEmail(null);
      } else {
        toast(data.error || 'Error', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateDocument(id: string, newDoc: string) {
    setActionLoading(`${id}-doc`);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateDocument', documentNumber: newDoc }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message, 'success');
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingDoc(null);
      } else {
        toast(data.error || 'Error', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(d?: string | null) {
    if (!d) return 'Nunca';
    return formatDateTimeColombia(d);
  }

    if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-28" />)}
        </div>
        <SkeletonList rows={6} />
      </div>
    );
  }

  const confirmCopy = confirm?.action === 'resetPassword'
    ? {
        title: '¿Restablecer la contraseña?',
        message: `La contraseña de ${confirm.student.firstName} ${confirm.student.lastName} pasará a ser su número de documento (${confirm.student.documentNumber}) y tendrá que cambiarla al entrar. Su contraseña actual dejará de funcionar.`,
        label: 'Restablecer',
      }
    : confirm
      ? {
          title: '¿Desactivar la cuenta?',
          message: `${confirm.student.firstName} ${confirm.student.lastName} no podrá volver a entrar hasta que reactives su cuenta.`,
          label: 'Desactivar',
        }
      : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ConfirmModal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) handleAction(confirm.student.id, confirm.action);
          setConfirm(null);
        }}
        variant={confirm?.action === 'toggleActive' ? 'danger' : 'warning'}
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message ?? ''}
        confirmLabel={confirmCopy?.label ?? 'Confirmar'}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair)' }}>
          Estudiantes
        </h1>
        <p className="text-sm text-subtle mt-1">
          {counts.all} registrados en el sistema
        </p>
      </div>

      {/*
        Los contadores ahora filtran. Antes eran cuatro tarjetas informativas:
        se veía "Nunca han entrado: 5" y no había forma de ver quiénes son,
        que es justo lo que uno quiere hacer al leer ese número.
      */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todos ({counts.all})
          </Chip>
          <Chip active={filter === 'active'} tone="positive" dot="bg-emerald-500"
            onClick={() => setFilter('active')}>
            Activos ({counts.active})
          </Chip>
          {counts.inactive > 0 && (
            <Chip active={filter === 'inactive'} tone="danger" dot="bg-red-500"
              onClick={() => setFilter('inactive')}>
              Inactivos ({counts.inactive})
            </Chip>
          )}
          {counts.never > 0 && (
            <Chip active={filter === 'never'} tone="warning" dot="bg-amber-500"
              onClick={() => setFilter('never')}>
              Nunca han entrado ({counts.never})
            </Chip>
          )}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, email o documento..."
          className="w-full sm:w-72 sm:ml-auto"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-subtle" />}
          title={search ? 'Sin resultados' : 'No hay estudiantes'}
          description={search ? `No se encontraron estudiantes para "${search}"` : 'Aún no hay estudiantes registrados. Inscríbelos desde un curso.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              /* Sin opacity global: atenuar la tarjeta entera vuelve ilegible
                 el texto. Marcar un estado no es lo mismo que esconderlo. */
              className={`p-4 rounded-xl border transition-colors duration-[var(--dur-fast)]
                ${student.isActive
                  ? 'border-surface-border bg-surface hover:bg-surface-hover'
                  : 'border-red-500/20 bg-red-500/[0.04]'
                }`}
            >
              {/* En móvil se apila: acciones y contenido no pueden pelear por
                  el mismo eje horizontal en 390px. Desde sm vuelve a dos columnas. */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${student.isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingName?.id === student.id ? (
                        <span className="flex items-center gap-1 flex-wrap">
                          <input
                            type="text"
                            value={editingName.first}
                            onChange={(e) => setEditingName({ ...editingName, first: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateName(student.id, editingName.first, editingName.last);
                              if (e.key === 'Escape') setEditingName(null);
                            }}
                            autoFocus
                            placeholder="Nombres"
                            className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-foreground/5
                                       text-foreground text-sm w-36
                                       focus:outline-none focus:border-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={editingName.last}
                            onChange={(e) => setEditingName({ ...editingName, last: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateName(student.id, editingName.first, editingName.last);
                              if (e.key === 'Escape') setEditingName(null);
                            }}
                            placeholder="Apellidos"
                            className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-foreground/5
                                       text-foreground text-sm w-36
                                       focus:outline-none focus:border-cyan-500/50"
                          />
                          <IconButton
                            label="Guardar"
                            tone="positive"
                            onClick={() => handleUpdateName(student.id, editingName.first, editingName.last)}
                            disabled={actionLoading === `${student.id}-name`}
                            icon={<Check className="w-4 h-4" />}
                          />
                          <IconButton
                            label="Cancelar"
                            tone="danger"
                            onClick={() => setEditingName(null)}
                            icon={<X className="w-4 h-4" />}
                          />
                        </span>
                      ) : (
                        <>
                          {/* Sin truncar: con apellidos compuestos, cortar a
                              15 caracteres impide distinguir a dos personas. */}
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {student.firstName} {student.lastName}
                          </p>
                          <span className="hidden sm:contents"><IconButton
                                                        label="Editar nombre"
                            tone="accent" size="sm"
                            onClick={() => setEditingName({ id: student.id, first: student.firstName, last: student.lastName })}
                            icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                        </>
                      )}
                      {!student.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
                      {student.mustChangePassword && <Badge variant="warning" size="sm">Debe cambiar pass</Badge>}
                    </div>
                    <p className="text-meta text-faint truncate mt-0.5 flex items-center gap-1.5">
                      {editingEmail?.id === student.id ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="email"
                            value={editingEmail.value}
                            onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateEmail(student.id, editingEmail.value);
                              if (e.key === 'Escape') setEditingEmail(null);
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-foreground/5
                                       text-foreground text-meta w-52
                                       focus:outline-none focus:border-cyan-500/50"
                          />
                          <IconButton
                            label="Guardar"
                            tone="positive"
                            onClick={() => handleUpdateEmail(student.id, editingEmail.value)}
                            disabled={actionLoading === `${student.id}-email`}
                            icon={<Check className="w-4 h-4" />}
                          />
                          <IconButton
                            label="Cancelar"
                            tone="danger"
                            onClick={() => setEditingEmail(null)}
                            icon={<X className="w-4 h-4" />}
                          />
                        </span>
                      ) : (
                        <>
                          {student.email}
                          <span className="hidden sm:contents"><IconButton
                                                        label="Editar email"
                            tone="accent" size="sm"
                            onClick={() => setEditingEmail({ id: student.id, value: student.email })}
                            icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-subtle">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Doc: {editingDoc?.id === student.id ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingDoc.value}
                              onChange={(e) => setEditingDoc({ ...editingDoc, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateDocument(student.id, editingDoc.value);
                                if (e.key === 'Escape') setEditingDoc(null);
                              }}
                              autoFocus
                              className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-foreground/5
                                         text-foreground text-meta w-32 font-mono
                                         focus:outline-none focus:border-cyan-500/50"
                            />
                            <IconButton
                            label="Guardar"
                            tone="positive"
                            onClick={() => handleUpdateDocument(student.id, editingDoc.value)}
                            disabled={actionLoading === `${student.id}-doc`}
                            icon={<Check className="w-4 h-4" />}
                          />
                            <IconButton
                            label="Cancelar"
                            tone="danger"
                            onClick={() => setEditingDoc(null)}
                            icon={<X className="w-4 h-4" />}
                          />
                          </span>
                        ) : (
                          <>
                            {student.documentNumber}
                            <span className="hidden sm:contents"><IconButton
                            label="Editar documento"
                            tone="accent" size="sm"
                            onClick={() => setEditingDoc({ id: student.id, value: student.documentNumber })}
                            icon={<Pencil className="w-3.5 h-3.5" />} /></span>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Último login: {formatDate(student.lastLoginAt)}
                      </span>
                      {student.lastLoginAt ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Ha ingresado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          Nunca ha ingresado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                {/* En móvil ocupan su propia fila, separadas: apretadas
                    junto al nombre pesaban más que el dato. */}
                <div className="flex items-center gap-1 shrink-0
                                border-t border-surface-border pt-2 -mx-1 px-1
                                sm:border-0 sm:pt-0 sm:mx-0 sm:px-0">
                  {/*
                    En móvil, un solo botón que abre los tres campos.
                    Los lápices sueltos junto a cada dato no caben a 390px,
                    pero esconder la edición sería quitar una herramienta en
                    vez de adaptarla: aquí se edita lo mismo, en un gesto.
                  */}
                  {editingName?.id === student.id ? (
                    <span className="sm:hidden flex items-center gap-2">
                      <Button variant="primary" size="sm" onClick={() => saveAllEdits(student)}>
                        Guardar
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => { setEditingName(null); setEditingEmail(null); setEditingDoc(null); }}>
                        Cancelar
                      </Button>
                    </span>
                  ) : (
                  <span className="sm:hidden">
                    <IconButton
                      label="Editar datos"
                      tone="accent"
                      size="lg"
                      onClick={() => {
                        setEditingName({ id: student.id, first: student.firstName, last: student.lastName });
                        setEditingEmail({ id: student.id, value: student.email });
                        setEditingDoc({ id: student.id, value: student.documentNumber });
                      }}
                      icon={<Pencil className="w-5 h-5" />}
                    />
                  </span>
                  )}
                  <IconButton
                    label="Ver detalle del estudiante"
                    tone="accent" size="lg"
                    onClick={() => router.push(`/admin/students/${student.id}`)}
                    icon={<Eye className="w-5 h-5" />}
                  />
                  {/* Restablecer y desactivar sí piden confirmación: la
                      primera deja al estudiante fuera de su contraseña actual,
                      la segunda le corta el acceso entero. */}
                  <IconButton
                    label="Restablecer contraseña"
                    tone="warning" size="lg"
                    disabled={actionLoading === `${student.id}-resetPassword`}
                    onClick={() => setConfirm({ student, action: 'resetPassword' })}
                    icon={<RotateCcw className={`w-5 h-5 ${actionLoading === `${student.id}-resetPassword` ? 'animate-spin' : ''}`} />}
                  />
                  <IconButton
                    label={student.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                    tone={student.isActive ? 'danger' : 'positive'} size="lg"
                    disabled={actionLoading === `${student.id}-toggleActive`}
                    onClick={() => student.isActive
                      ? setConfirm({ student, action: 'toggleActive' })
                      : handleAction(student.id, 'toggleActive')}
                    icon={student.isActive ? <ShieldOff className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

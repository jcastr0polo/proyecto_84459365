'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, RotateCcw, ShieldCheck, ShieldOff, Search, AlertCircle, CheckCircle2, Clock, Pencil, X, Check, Eye } from 'lucide-react';
import { formatDateTimeColombia } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { SafeUser } from '@/lib/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.documentNumber.includes(q)
    );
  }, [students, search]);

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
        setToast({ msg: data.message, type: 'ok' });
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
      } else {
        setToast({ msg: data.error || 'Error', type: 'err' });
      }
    } catch {
      setToast({ msg: 'Error de conexión', type: 'err' });
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
        setToast({ msg: data.message, type: 'ok' });
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingName(null);
      } else {
        setToast({ msg: data.error || 'Error', type: 'err' });
      }
    } catch {
      setToast({ msg: 'Error de conexión', type: 'err' });
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
        setToast({ msg: data.message, type: 'ok' });
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingEmail(null);
      } else {
        setToast({ msg: data.error || 'Error', type: 'err' });
      }
    } catch {
      setToast({ msg: 'Error de conexión', type: 'err' });
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
        setToast({ msg: data.message, type: 'ok' });
        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...data.student } : s));
        setEditingDoc(null);
      } else {
        setToast({ msg: data.error || 'Error', type: 'err' });
      }
    } catch {
      setToast({ msg: 'Error de conexión', type: 'err' });
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(d?: string | null) {
    if (!d) return 'Nunca';
    return formatDateTimeColombia(d);
  }

  if (loading) return <PageLoader />;

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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border
          ${toast.type === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
          Estudiantes ({students.length})
        </h1>
        <p className="text-sm text-subtle mt-1">
          Todos los usuarios tipo estudiante registrados en el sistema
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl
                     border border-foreground/10 bg-foreground/5
                     text-foreground text-sm placeholder-faint
                     focus:outline-none focus:border-cyan-500/20 focus:ring-1 focus:ring-cyan-500/20
                     transition-all"
        />
      </div>

      {/* Summary */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: students.length, color: 'text-cyan-400' },
            { label: 'Activos', value: students.filter((s) => s.isActive).length, color: 'text-emerald-400' },
            { label: 'Inactivos', value: students.filter((s) => !s.isActive).length, color: 'text-red-400' },
            { label: 'Nunca han entrado', value: students.filter((s) => !s.lastLoginAt).length, color: 'text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl border border-foreground/10 bg-foreground/5 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-faint uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

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
              className={`p-4 rounded-xl border transition-all
                ${student.isActive
                  ? 'border-foreground/10 bg-foreground/5 hover:bg-foreground/[0.04]'
                  : 'border-red-500/20 bg-red-500/5 opacity-60'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: student info */}
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
                          <p className="text-sm font-semibold text-foreground truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <IconButton
                            label="Editar nombre"
                            tone="accent" size="sm"
                            onClick={() => setEditingName({ id: student.id, first: student.firstName, last: student.lastName })}
                            icon={<Pencil className="w-3.5 h-3.5" />}
                          />
                        </>
                      )}
                      {!student.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
                      {student.mustChangePassword && <Badge variant="warning" size="sm">Debe cambiar pass</Badge>}
                    </div>
                    <p className="text-[11px] text-faint truncate mt-0.5 flex items-center gap-1.5">
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
                                       text-foreground text-[11px] w-52
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
                          <IconButton
                            label="Editar email"
                            tone="accent" size="sm"
                            onClick={() => setEditingEmail({ id: student.id, value: student.email })}
                            icon={<Pencil className="w-3.5 h-3.5" />}
                          />
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
                                         text-foreground text-[11px] w-32 font-mono
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
                            <IconButton
                            label="Editar documento"
                            tone="accent" size="sm"
                            onClick={() => setEditingDoc({ id: student.id, value: student.documentNumber })}
                            icon={<Pencil className="w-3.5 h-3.5" />}
                          />
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
                <div className="flex items-center gap-1 shrink-0">
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

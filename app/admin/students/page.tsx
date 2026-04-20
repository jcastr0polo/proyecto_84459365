'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, RotateCcw, ShieldCheck, ShieldOff, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { SafeUser } from '@/lib/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

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

  function formatDate(d?: string | null) {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
                      <p className="text-sm font-semibold text-foreground truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      {!student.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
                      {student.mustChangePassword && <Badge variant="warning" size="sm">Debe cambiar pass</Badge>}
                    </div>
                    <p className="text-[11px] text-faint truncate mt-0.5">
                      {student.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-subtle">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Doc: {student.documentNumber}
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAction(student.id, 'resetPassword')}
                    disabled={actionLoading === `${student.id}-resetPassword`}
                    title="Restablecer contraseña (= nro documento)"
                    className="p-2 rounded-lg text-subtle hover:text-amber-400 hover:bg-amber-500/10
                               transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${actionLoading === `${student.id}-resetPassword` ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleAction(student.id, 'toggleActive')}
                    disabled={actionLoading === `${student.id}-toggleActive`}
                    title={student.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                    className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50
                      ${student.isActive
                        ? 'text-subtle hover:text-red-400 hover:bg-red-500/10'
                        : 'text-subtle hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                  >
                    {student.isActive
                      ? <ShieldOff className="w-4 h-4" />
                      : <ShieldCheck className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

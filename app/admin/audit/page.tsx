'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/ui/SearchInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  Shield, X, LogIn, LogOut, Plus, Pencil, Trash2, Upload, Database, Key, Eye,
  Clock, User, FileText, Hash, Info,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  login:    { label: 'Login',      icon: <LogIn className="w-3 h-3" />,    color: 'text-blue-400',    bg: 'bg-blue-500/15' },
  logout:   { label: 'Logout',     icon: <LogOut className="w-3 h-3" />,   color: 'text-slate-400',   bg: 'bg-slate-500/15' },
  create:   { label: 'Crear',      icon: <Plus className="w-3 h-3" />,     color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  update:   { label: 'Actualizar', icon: <Pencil className="w-3 h-3" />,   color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  delete:   { label: 'Eliminar',   icon: <Trash2 className="w-3 h-3" />,   color: 'text-red-400',     bg: 'bg-red-500/15' },
  upload:   { label: 'Upload',     icon: <Upload className="w-3 h-3" />,   color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  seed:     { label: 'Seed',       icon: <Database className="w-3 h-3" />, color: 'text-purple-400',  bg: 'bg-purple-500/15' },
  password: { label: 'Contraseña', icon: <Key className="w-3 h-3" />,      color: 'text-orange-400',  bg: 'bg-orange-500/15' },
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario', enrollment: 'Inscripción', project: 'Proyecto', activity: 'Actividad',
  course: 'Curso', semester: 'Semestre', grade: 'Calificación', submission: 'Entrega',
  prompt: 'Prompt', blob: 'Blob', quiz: 'Parcial', session: 'Sesión', corte: 'Corte',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit?limit=500');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const uniqueActions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries]);
  const uniqueEntities = useMemo(() => [...new Set(entries.map((e) => e.entity))].sort(), [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterAction) result = result.filter((e) => e.action === filterAction);
    if (filterEntity) result = result.filter((e) => e.entity === filterEntity);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.userName?.toLowerCase().includes(q) ||
        e.details?.toLowerCase().includes(q) ||
        e.entityId?.toLowerCase().includes(q) ||
        e.userId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, filterAction, filterEntity, search]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter((e) => e.timestamp.slice(0, 10) === today);
    return {
      total: entries.length,
      today: todayEntries.length,
      logins: entries.filter((e) => e.action === 'login').length,
      writes: entries.filter((e) => ['create', 'update', 'delete'].includes(e.action)).length,
    };
  }, [entries]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Auditoría</h1>
        <p className="text-sm text-subtle mt-1">Registro de todas las acciones en la plataforma.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total registros" value={stats.total} />
        <MiniStat label="Hoy" value={stats.today} />
        <MiniStat label="Logins" value={stats.logins} />
        <MiniStat label="Escrituras" value={stats.writes} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuario, detalle, ID..." className="w-full sm:w-72" />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.08] text-sm text-foreground"
        >
          <option value="">Todas las acciones</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
          ))}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.08] text-sm text-foreground"
        >
          <option value="">Todas las entidades</option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
          ))}
        </select>
        {(search || filterAction || filterEntity) && (
          <button
            onClick={() => { setSearch(''); setFilterAction(''); setFilterEntity(''); }}
            className="text-xs text-subtle hover:text-muted transition-colors cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      <p className="text-xs text-faint">{filtered.length} de {entries.length} entradas</p>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
          <Shield className="w-8 h-8 text-faint mx-auto mb-2" />
          <p className="text-sm text-subtle">Sin entradas de auditoría</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry, i) => {
            const config = ACTION_CONFIG[entry.action] ?? { label: entry.action, icon: <Info className="w-3 h-3" />, color: 'text-muted', bg: 'bg-foreground/[0.06]' };
            return (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                onClick={() => setSelectedEntry(entry)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.015] hover:bg-foreground/[0.04]
                           border border-transparent hover:border-foreground/[0.06]
                           transition-all duration-200 cursor-pointer group text-left"
              >
                <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0 ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${config.color}`}>{config.label}</span>
                    <Badge variant="neutral" size="sm">{ENTITY_LABELS[entry.entity] ?? entry.entity}</Badge>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {entry.details || `${entry.action} ${entry.entity}${entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}`}
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0 ml-2">
                  <p className="text-xs text-muted truncate max-w-[120px]">{entry.userName || entry.userId.slice(0, 8)}</p>
                </div>
                <span className="text-[10px] text-faint shrink-0 whitespace-nowrap tabular-nums">
                  {formatAuditTime(entry.timestamp)}
                </span>
                <Eye className="w-3.5 h-3.5 text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Detalle de Auditoría">
        {selectedEntry && <AuditDetail entry={selectedEntry} />}
      </Modal>
    </div>
  );
}

function AuditDetail({ entry }: { entry: AuditEntry }) {
  const config = ACTION_CONFIG[entry.action] ?? { label: entry.action, icon: <Info className="w-3 h-3" />, color: 'text-muted', bg: 'bg-foreground/[0.06]' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center ${config.color}`}>
          {config.icon}
        </div>
        <div>
          <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
          <p className="text-xs text-subtle">{ENTITY_LABELS[entry.entity] ?? entry.entity}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Fecha" value={
          new Date(entry.timestamp).toLocaleString('es-CO', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })
        } />
        <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Usuario" value={entry.userName || entry.userId} />
        <DetailRow icon={<Hash className="w-3.5 h-3.5" />} label="User ID" value={entry.userId} mono />
        {entry.entityId && (
          <DetailRow icon={<Hash className="w-3.5 h-3.5" />} label="Entity ID" value={entry.entityId} mono />
        )}
        {entry.details && (
          <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Detalle" value={entry.details} />
        )}
      </div>

      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">Metadata</p>
          <pre className="text-xs text-muted bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg p-3 overflow-x-auto max-h-48">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 flex items-center justify-center text-faint shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-faint uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-muted break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="md" className="text-center">
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] text-subtle uppercase tracking-wider">{label}</p>
    </Card>
  );
}

function formatAuditTime(iso: string): string {
  try {
    const now = Date.now();
    const date = new Date(iso).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

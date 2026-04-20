'use client';

import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  userName?: string;
  details?: string;
}

export default function AuditPage() {
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');

  async function loadAudit() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterAction) params.set('action', filterAction);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAuditLog(json.entries);
    } catch (err) {
      setError(`Error al cargar auditoría: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-sm text-muted mt-1">Registro de acciones realizadas en la plataforma.</p>
      </div>

      {/* Filtros + cargar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={loadAudit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Cargar Log
        </button>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.08] text-sm"
        >
          <option value="">Todas las acciones</option>
          <option value="login">Login</option>
          <option value="create">Crear</option>
          <option value="update">Actualizar</option>
          <option value="delete">Eliminar</option>
          <option value="seed">Seed</option>
          <option value="upload">Upload</option>
        </select>

        {auditLog && (
          <span className="text-xs text-muted">{auditLog.length} entradas</span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {auditLog && auditLog.length === 0 && (
        <p className="text-sm text-muted">No hay entradas de auditoría aún.</p>
      )}

      {auditLog && auditLog.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-foreground/[0.08]">
                <th className="text-left py-2 px-3 font-medium">Fecha</th>
                <th className="text-left py-2 px-3 font-medium">Acción</th>
                <th className="text-left py-2 px-3 font-medium">Entidad</th>
                <th className="text-left py-2 px-3 font-medium">Usuario</th>
                <th className="text-left py-2 px-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-foreground/[0.04] hover:bg-foreground/[0.02]">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString('es-CL', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      entry.action === 'login' ? 'bg-blue-500/20 text-blue-400' :
                      entry.action === 'create' ? 'bg-emerald-500/20 text-emerald-400' :
                      entry.action === 'update' ? 'bg-amber-500/20 text-amber-400' :
                      entry.action === 'delete' ? 'bg-red-500/20 text-red-400' :
                      entry.action === 'seed' ? 'bg-purple-500/20 text-purple-400' :
                      entry.action === 'upload' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-foreground/[0.08] text-muted'
                    }`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono">{entry.entity}</td>
                  <td className="py-2 px-3">{entry.userName || entry.userId}</td>
                  <td className="py-2 px-3 text-muted max-w-[300px] truncate">{entry.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

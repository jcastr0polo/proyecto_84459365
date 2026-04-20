'use client';

import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle, Loader2, HardDrive, Cloud, Server } from 'lucide-react';

interface DiagnosticData {
  environment: {
    IS_VERCEL: boolean;
    HAS_BLOB_TOKEN: boolean;
    BLOB_TOKEN_PREFIX: string;
    NODE_ENV: string;
    CWD: string;
  };
  sourceFiles: Record<string, boolean>;
  tmpFiles: Record<string, boolean>;
  blobFiles: Record<string, { exists: boolean; size?: number; url?: string }>;
  blobListRaw?: { pathname: string; size: number; uploadedAt: string }[];
  blobError?: string;
}

interface SyncResult {
  results: Record<string, { status: string; size?: number; error?: string }>;
}

export default function BlobSyncPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState<'idle' | 'diagnosing' | 'syncing'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics() {
    setLoading('diagnosing');
    setError(null);
    try {
      const res = await fetch('/api/admin/blob-sync');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDiagnostics(data);
    } catch (err) {
      setError(`Error al diagnosticar: ${err}`);
    } finally {
      setLoading('idle');
    }
  }

  async function forceSync() {
    setLoading('syncing');
    setError(null);
    try {
      const res = await fetch('/api/admin/blob-sync', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncResult(data);
      // Re-run diagnostics after sync
      await runDiagnostics();
    } catch (err) {
      setError(`Error al sincronizar: ${err}`);
    } finally {
      setLoading('idle');
    }
  }

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Blob Storage — Diagnóstico y Sync</h1>
        <p className="text-sm text-muted mt-1">Verifica el estado de los archivos JSON en Source, /tmp y Vercel Blob.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={runDiagnostics}
          disabled={loading !== 'idle'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'diagnosing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Diagnosticar
        </button>
        <button
          onClick={forceSync}
          disabled={loading !== 'idle'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Forzar Sync a Blob
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <h3 className="text-sm font-bold text-emerald-400 mb-3">Resultado del Sync</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(syncResult.results).map(([file, result]) => (
              <div key={file} className="flex items-center gap-2 text-xs">
                <StatusIcon ok={result.status === 'SYNCED'} />
                <span className="font-mono">{file}</span>
                {result.size && <span className="text-muted">({(result.size / 1024).toFixed(1)}KB)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {diagnostics && (
        <div className="space-y-6">
          {/* Environment */}
          <div className="p-4 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02]">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" /> Entorno
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>IS_VERCEL: <span className="font-mono">{String(diagnostics.environment.IS_VERCEL)}</span></div>
              <div>HAS_BLOB_TOKEN: <StatusIcon ok={diagnostics.environment.HAS_BLOB_TOKEN} /></div>
              <div>TOKEN: <span className="font-mono">{diagnostics.environment.BLOB_TOKEN_PREFIX}</span></div>
              <div>NODE_ENV: <span className="font-mono">{diagnostics.environment.NODE_ENV}</span></div>
              <div className="col-span-2">CWD: <span className="font-mono text-muted">{diagnostics.environment.CWD}</span></div>
            </div>
          </div>

          {/* File Status Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-2 px-3 font-medium">Archivo</th>
                  <th className="text-center py-2 px-3 font-medium">
                    <div className="flex items-center justify-center gap-1"><HardDrive className="w-3 h-3" /> Source</div>
                  </th>
                  <th className="text-center py-2 px-3 font-medium">
                    <div className="flex items-center justify-center gap-1"><Server className="w-3 h-3" /> /tmp</div>
                  </th>
                  <th className="text-center py-2 px-3 font-medium">
                    <div className="flex items-center justify-center gap-1"><Cloud className="w-3 h-3" /> Blob</div>
                  </th>
                  <th className="text-right py-2 px-3 font-medium">Tamaño Blob</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(diagnostics.sourceFiles).map((file) => {
                  const blobInfo = diagnostics.blobFiles[file] || { exists: false };
                  return (
                    <tr key={file} className="border-b border-foreground/[0.04] hover:bg-foreground/[0.02]">
                      <td className="py-2 px-3 font-mono">{file}</td>
                      <td className="py-2 px-3 text-center">
                        <StatusIcon ok={diagnostics.sourceFiles[file]} />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusIcon ok={diagnostics.tmpFiles[file]} />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusIcon ok={blobInfo.exists} />
                      </td>
                      <td className="py-2 px-3 text-right text-muted">
                        {blobInfo.exists && blobInfo.size ? `${(blobInfo.size / 1024).toFixed(1)} KB` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Blob Error */}
          {diagnostics.blobError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {diagnostics.blobError}
            </div>
          )}

          {/* Raw Blob List */}
          {diagnostics.blobListRaw && diagnostics.blobListRaw.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted hover:text-foreground">
                Raw Blob List ({diagnostics.blobListRaw.length} archivos)
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-foreground/[0.03] overflow-auto max-h-60 font-mono">
                {JSON.stringify(diagnostics.blobListRaw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

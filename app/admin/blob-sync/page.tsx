'use client';

import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle, Loader2, Cloud, Server, Download, AlertTriangle } from 'lucide-react';

const DATA_FILES = [
  'config.json', 'home.json', 'users.json', 'sessions.json',
  'semesters.json', 'courses.json', 'enrollments.json', 'activities.json',
  'submissions.json', 'grades.json', 'prompts.json', 'projects.json', 'audit.json',
  'cortes.json', 'quizzes.json', 'quiz-attempts.json',
];

// Archivos sensibles: advertir antes de hacer seed
const SENSITIVE_FILES = ['users.json', 'sessions.json', 'enrollments.json', 'grades.json', 'submissions.json', 'audit.json', 'quiz-attempts.json'];

interface DiagnosticData {
  environment: {
    IS_VERCEL: boolean;
    HAS_BLOB_TOKEN: boolean;
    BLOB_TOKEN_PREFIX: string;
    NODE_ENV: string;
    CACHE_READY: boolean;
  };
  blobFiles: Record<string, { exists: boolean; size?: number }>;
  totalBlobFiles?: number;
  blobListRaw?: { pathname: string; size: number; uploadedAt: string }[];
  blobError?: string;
}

interface SyncResult {
  results: Record<string, { status: string; size?: number; error?: string }>;
}

export default function BlobSyncPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState<'idle' | 'diagnosing' | 'syncing' | 'downloading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [downloadedData, setDownloadedData] = useState<{ file: string; data: unknown } | null>(null);
  const [activeTab, setActiveTab] = useState<'sync' | 'download'>('sync');

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

  async function forceSync(files?: string[]) {
    setLoading('syncing');
    setError(null);
    setShowConfirm(false);
    try {
      const body = files && files.length > 0 ? JSON.stringify({ files }) : undefined;
      const res = await fetch('/api/admin/blob-sync', {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncResult(data);
      await runDiagnostics();
    } catch (err) {
      setError(`Error al sincronizar: ${err}`);
    } finally {
      setLoading('idle');
    }
  }

  async function downloadFile(file: string) {
    setLoading('downloading');
    setError(null);
    try {
      const res = await fetch(`/api/admin/blob-download?file=${encodeURIComponent(file)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (file === 'all') {
        setDownloadedData({ file: 'all', data: json });
      } else {
        setDownloadedData({ file, data: json.data });
      }
    } catch (err) {
      setError(`Error al descargar: ${err}`);
    } finally {
      setLoading('idle');
    }
  }

  function toggleFile(file: string) {
    const next = new Set(selectedFiles);
    if (next.has(file)) next.delete(file);
    else next.add(file);
    setSelectedFiles(next);
  }

  function selectAll() {
    setSelectedFiles(new Set(DATA_FILES));
  }
  function selectNone() {
    setSelectedFiles(new Set());
  }

  function handleSeedSelected() {
    const files = Array.from(selectedFiles);
    const hasSensitive = files.some((f) => SENSITIVE_FILES.includes(f));
    if (hasSensitive) {
      setShowConfirm(true);
    } else {
      forceSync(files);
    }
  }

  function exportAsFile(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Blob Storage — Base de Datos</h1>
        <p className="text-sm text-muted mt-1">Diagnóstico, sync selectivo y descarga de datos.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-foreground/[0.08] pb-0">
        {[
          { key: 'sync', label: 'Sync & Diagnóstico' },
          { key: 'download', label: 'Descargar Datos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ===== TAB: SYNC ===== */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={runDiagnostics}
              disabled={loading !== 'idle'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'diagnosing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Diagnosticar
            </button>
          </div>

          {/* Selective Sync Section */}
          <div className="p-4 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02]">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Seed Selectivo (data/ → Blob)
            </h3>
            <p className="text-xs text-muted mb-3">
              Selecciona los archivos a subir desde <code>data/</code> al Blob. <strong className="text-amber-400">⚠️ Esto SOBRESCRIBIRÁ la data en producción.</strong>
            </p>

            <div className="flex gap-2 mb-3">
              <button onClick={selectAll} className="text-xs px-2 py-1 rounded bg-foreground/[0.06] hover:bg-foreground/[0.1] cursor-pointer">
                Seleccionar todos
              </button>
              <button onClick={selectNone} className="text-xs px-2 py-1 rounded bg-foreground/[0.06] hover:bg-foreground/[0.1] cursor-pointer">
                Ninguno
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              {DATA_FILES.map((file) => {
                const isSensitive = SENSITIVE_FILES.includes(file);
                return (
                  <label
                    key={file}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      selectedFiles.has(file) ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-foreground/[0.03] border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file)}
                      onChange={() => toggleFile(file)}
                      className="rounded"
                    />
                    <span className="font-mono">{file}</span>
                    {isSensitive && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleSeedSelected}
              disabled={loading !== 'idle' || selectedFiles.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Seed Seleccionado ({selectedFiles.size} archivo{selectedFiles.size !== 1 ? 's' : ''})
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirm && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" /> Advertencia: Archivos Sensibles
              </div>
              <p className="text-sm text-amber-300/80">
                Estás a punto de sobrescribir archivos sensibles en producción:
              </p>
              <ul className="text-xs font-mono text-amber-300/60 list-disc pl-5">
                {Array.from(selectedFiles)
                  .filter((f) => SENSITIVE_FILES.includes(f))
                  .map((f) => <li key={f}>{f}</li>)}
              </ul>
              <p className="text-xs text-amber-300/60">
                Esto eliminará los datos actuales en Blob y los reemplazará con los datos locales de <code>data/</code>.
                Los usuarios, calificaciones y entregas se perderán si no están en los archivos locales.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => forceSync(Array.from(selectedFiles))}
                  className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium cursor-pointer"
                >
                  Confirmar — Sobrescribir
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 rounded bg-foreground/[0.06] text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">Resultado del Seed</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(syncResult.results).map(([file, result]) => (
                  <div key={file} className="flex items-center gap-2 text-xs">
                    <StatusIcon ok={result.status === 'SEEDED'} />
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
              <div className="p-4 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02]">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Entorno
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>IS_VERCEL: <span className="font-mono">{String(diagnostics.environment.IS_VERCEL)}</span></div>
                  <div>HAS_BLOB_TOKEN: <StatusIcon ok={diagnostics.environment.HAS_BLOB_TOKEN} /></div>
                  <div>TOKEN: <span className="font-mono">{diagnostics.environment.BLOB_TOKEN_PREFIX}</span></div>
                  <div>NODE_ENV: <span className="font-mono">{diagnostics.environment.NODE_ENV}</span></div>
                  <div>CACHE_READY: <StatusIcon ok={diagnostics.environment.CACHE_READY} /></div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-foreground/[0.08]">
                      <th className="text-left py-2 px-3 font-medium">Archivo</th>
                      <th className="text-center py-2 px-3 font-medium">
                        <div className="flex items-center justify-center gap-1"><Cloud className="w-3 h-3" /> Blob</div>
                      </th>
                      <th className="text-right py-2 px-3 font-medium">Tamaño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(diagnostics.blobFiles).map((file) => {
                      const blobInfo = diagnostics.blobFiles[file] || { exists: false };
                      return (
                        <tr key={file} className="border-b border-foreground/[0.04] hover:bg-foreground/[0.02]">
                          <td className="py-2 px-3 font-mono">{file}</td>
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

              {diagnostics.blobError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                  {diagnostics.blobError}
                </div>
              )}

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
      )}

      {/* ===== TAB: DOWNLOAD ===== */}
      {activeTab === 'download' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02]">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" /> Descargar Datos del Blob
            </h3>
            <p className="text-xs text-muted mb-4">
              Descarga la data actual que está en memoria (cargada desde Blob). Permite inspeccionar el estado real de producción.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              {DATA_FILES.map((file) => (
                <button
                  key={file}
                  onClick={() => downloadFile(file)}
                  disabled={loading !== 'idle'}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono bg-foreground/[0.04] hover:bg-foreground/[0.08] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {file}
                </button>
              ))}
            </div>

            <button
              onClick={() => downloadFile('all')}
              disabled={loading !== 'idle'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'downloading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Descargar TODO
            </button>
          </div>

          {/* Downloaded Data Viewer */}
          {downloadedData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono">{downloadedData.file}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportAsFile(downloadedData.data, downloadedData.file === 'all' ? 'blob-export-all.json' : downloadedData.file)}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                  >
                    Guardar como archivo
                  </button>
                  <button
                    onClick={() => setDownloadedData(null)}
                    className="text-xs px-3 py-1.5 rounded bg-foreground/[0.06] hover:bg-foreground/[0.1] cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Stats */}
              {Array.isArray(downloadedData.data) && (
                <p className="text-xs text-muted">{downloadedData.data.length} registros</p>
              )}

              <pre className="p-4 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] overflow-auto max-h-[60vh] text-xs font-mono">
                {JSON.stringify(downloadedData.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

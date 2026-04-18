'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  valid: boolean;
  error?: string;
}

interface CSVImporterProps {
  onConfirm: (students: { firstName: string; lastName: string; email: string; documentNumber: string }[]) => Promise<void>;
  loading?: boolean;
}

/**
 * CSVImporter — Componente de importación masiva CSV
 * Drop zone + preview table + validación pre-envío
 */
export default function CSVImporter({ onConfirm, loading = false }: CSVImporterProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  function parseCSV(text: string): ParsedRow[] {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header if it looks like one
    const first = lines[0]?.toLowerCase() ?? '';
    const startIdx = (first.includes('nombre') || first.includes('name') || first.includes('email')) ? 1 : 0;

    return lines.slice(startIdx).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 4) {
        return { firstName: cols[0] ?? '', lastName: cols[1] ?? '', email: cols[2] ?? '', documentNumber: cols[3] ?? '', valid: false, error: 'Faltan columnas (se requieren 4: nombre, apellido, email, documento)' };
      }

      const [firstName, lastName, email, documentNumber] = cols;
      const errors: string[] = [];

      if (!firstName) errors.push('nombre vacío');
      if (!lastName) errors.push('apellido vacío');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email inválido');
      if (!documentNumber || !/^\d{5,}$/.test(documentNumber)) errors.push('documento inválido');

      return {
        firstName, lastName, email, documentNumber,
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join(', ') : undefined,
      };
    });
  }

  const handleFile = useCallback(function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setRows([]);
      setFileName('');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    await onConfirm(validRows.map(({ firstName, lastName, email, documentNumber }) => ({
      firstName, lastName, email, documentNumber,
    })));
  }

  function downloadExample() {
    const csv = 'nombre,apellido,email,documento\nJuan,Pérez,juan.perez@universidad.edu.co,1234567890\nMaría,García,maria.garcia@universidad.edu.co,9876543210\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_estudiantes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Format hint + download */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/10">
        <div>
          <p className="text-sm text-cyan-300 font-medium mb-1">Formato CSV esperado</p>
          <p className="text-xs text-subtle font-mono">nombre, apellido, email, documento</p>
        </div>
        <Button variant="ghost" size="sm" onClick={downloadExample}>
          ↓ Descargar plantilla
        </Button>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          htmlFor="csv-file-input"
          className={`
            relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
            py-16 px-6 text-center transition-all duration-200 cursor-pointer
            ${dragOver
              ? 'border-cyan-500/50 bg-cyan-500/[0.06]'
              : 'border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20 hover:bg-foreground/[0.04]'
            }
          `}
        >
          <input
            ref={fileRef}
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="sr-only"
            aria-label="Seleccionar archivo CSV"
          />
          <div className="mb-3 text-faint" aria-hidden="true"><FileUp className="w-10 h-10 mx-auto" /></div>
          <p className="text-sm font-medium text-muted mb-1">
            Arrastra un archivo CSV aquí
          </p>
          <p className="text-xs text-subtle">
            o haz clic para seleccionar un archivo
          </p>
        </label>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted flex items-center gap-1">
              <FileUp className="w-4 h-4" /> <span className="font-medium text-foreground/80">{fileName}</span>
            </span>
            <Badge variant="info" size="sm">{rows.length} filas</Badge>
            <Badge variant="success" size="sm">{validRows.length} válidas</Badge>
            {invalidRows.length > 0 && (
              <Badge variant="danger" size="sm">{invalidRows.length} con errores</Badge>
            )}
            <button
              onClick={() => { setRows([]); setFileName(''); }}
              className="ml-auto text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-xl border border-foreground/[0.08]">
            <table className="w-full text-sm text-left">
              <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06]">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">#</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Nombre</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Apellido</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Email</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Documento</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.valid ? '' : 'bg-red-500/[0.04]'}>
                    <td className="px-3 py-2 text-xs text-subtle">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs text-muted">{row.firstName || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted">{row.lastName || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted">{row.email || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted font-mono">{row.documentNumber || '—'}</td>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <Badge variant="success" size="sm">✓</Badge>
                      ) : (
                        <span className="text-[10px] text-red-400">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirm button */}
          {validRows.length > 0 && (
            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" loading={loading} onClick={handleConfirm}>
                Confirmar Inscripción ({validRows.length} estudiante{validRows.length !== 1 ? 's' : ''})
              </Button>
              {invalidRows.length > 0 && (
                <p className="text-xs text-amber-400/70">
                  {invalidRows.length} fila{invalidRows.length !== 1 ? 's' : ''} con errores serán ignoradas
                </p>
              )}
            </div>
          )}

          {validRows.length === 0 && (
            <p className="text-sm text-red-400/80 text-center py-4">
              No hay filas válidas para importar. Revisa el formato del CSV.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

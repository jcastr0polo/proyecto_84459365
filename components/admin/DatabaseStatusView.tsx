'use client';

import React from 'react';
import { Database, RefreshCw, Table2, Archive } from 'lucide-react';
import StatTile from '@/components/ui/StatTile';
import BackLink from '@/components/ui/BackLink';
import { toneBox, toneText } from '@/lib/semantics';

export interface TableStat {
  name: string;
  label: string;
  group: string;
  exists: boolean;
  rowCount: number;
}

export interface DbStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
  tables: TableStat[];
  missing: string[];
  extras: string[];
}

/**
 * Estado de la base de datos — parte visual, sin fetch.
 *
 * Separada del contenedor para poder verla en el taller con datos falsos: la
 * pantalla real solo la ve un admin autenticado contra Supabase, así que sin
 * esto no había forma de revisar el diseño ni los estados raros (sin
 * conexión, tabla que falta, tabla vacía).
 */
export default function DatabaseStatusView({
  status, refreshing, onRefresh,
}: {
  status: DbStatus;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const totalRows = status.tables.reduce((a, t) => a + Math.max(0, t.rowCount), 0);
  const emptyTables = status.tables.filter((t) => t.exists && t.rowCount === 0);
  const groups = [...new Set(status.tables.map((t) => t.group))];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackLink href="/admin">Volver al panel</BackLink>

      <div>
        <h1 className="type-page text-foreground">Estado de la base de datos</h1>
        <p className="type-body text-subtle mt-1">
          Las tablas que la aplicación lee, y cuántos registros hay en cada una.
        </p>
      </div>

      {!status.connected && (
        <div className={`rounded-xl border p-4 ${toneBox.critical}`} role="alert">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Sin conexión con la base de datos
          </p>
          <p className="text-xs text-subtle mt-1">{status.error}</p>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Conexión" value={status.connected ? 'OK' : 'Caída'}
          tone={status.connected ? toneText.ok : toneText.critical}
          highlight={status.connected ? undefined : toneBox.critical}
          hint={`${status.latencyMs} ms`} />
        {/* Con la conexión caída no sabemos nada de las tablas. Decir
            "0 vacías · todas con datos" en verde sería tranquilizar justo
            cuando no se puede afirmar nada. */}
        <StatTile label="Tablas"
          value={status.connected ? `${status.tables.length - status.missing.length}/${status.tables.length}` : '—'}
          tone={!status.connected ? undefined : status.missing.length > 0 ? toneText.critical : toneText.ok}
          highlight={status.connected && status.missing.length > 0 ? toneBox.critical : undefined}
          hint={!status.connected ? 'sin comprobar'
            : status.missing.length > 0 ? `faltan ${status.missing.length}` : 'todas presentes'} />
        <StatTile label="Registros" value={status.connected ? totalRows.toLocaleString('es-CO') : '—'}
          hint={status.connected ? 'en total' : 'sin comprobar'} />
        <StatTile label="Vacías" value={status.connected ? String(emptyTables.length) : '—'}
          tone={!status.connected ? undefined : emptyTables.length > 0 ? toneText.lifecycle : toneText.ok}
          hint={!status.connected ? 'sin comprobar'
            : emptyTables.length > 0 ? 'sin datos todavía' : 'todas con datos'} />
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-11 rounded-lg border border-surface-border
                     text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover
                     transition-colors duration-[var(--dur-fast)]
                     active:scale-[0.98] motion-reduce:active:scale-100
                     disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {refreshing ? 'Consultando…' : 'Actualizar'}
        </button>
      )}

      {/* Sin conexión no se listan las tablas en rojo como "No existe":
          seguramente existen, lo que falló fue preguntar. */}
      {status.connected && groups.map((group) => (
        <section key={group}>
          <h2 className="type-section text-subtle mb-2 px-1">{group}</h2>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
            {status.tables.filter((t) => t.group === group).map((t) => (
              <div key={t.name} className="flex items-center gap-3 px-4 py-3 bg-surface">
                <Table2 className={`w-4 h-4 shrink-0 ${t.exists ? 'text-subtle' : toneText.critical}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90">{t.label}</p>
                  <p className="text-micro text-faint font-mono truncate">{t.name}</p>
                </div>
                {!t.exists ? (
                  <span className={`text-xs font-medium ${toneText.critical}`}>No existe</span>
                ) : t.rowCount === 0 ? (
                  /* Una tabla vacía no es un fallo: es ciclo de vida, va en neutro. */
                  <span className="text-xs text-subtle">Sin datos</span>
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {t.rowCount.toLocaleString('es-CO')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {status.connected && status.extras.length > 0 && (
        <section>
          <h2 className="type-section text-subtle mb-2 px-1">Otras tablas en la base</h2>
          <div className={`rounded-xl border p-4 ${toneBox.lifecycle}`}>
            <p className="text-xs text-subtle mb-2">
              Existen en Supabase pero la aplicación no las lee. No es un error: puede ser
              algo en desuso o de otra herramienta.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {status.extras.map((n) => (
                <li key={n}
                  className="text-micro font-mono text-muted rounded-md border border-surface-border bg-surface px-2 py-1">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className={`rounded-xl border p-4 ${toneBox.lifecycle}`}>
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Archive className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
          Sobre el Blob
        </p>
        <p className="text-xs text-subtle mt-1 max-w-prose">
          Los datos viven en Supabase desde la migración. El Blob sigue guardando los
          archivos que suben estudiantes y docentes —entregas, documentos de proyecto,
          adjuntos del chat—, y eso no se toca desde aquí. Las herramientas de sembrado y
          descarga que había en esta pantalla apuntaban al Blob y ya no alimentaban nada,
          así que se retiraron.
        </p>
      </div>

      <p className="text-micro text-faint flex items-center gap-1.5">
        <Database className="w-3 h-3" aria-hidden="true" /> Supabase Postgres · consulta directa, sin caché
      </p>
    </div>
  );
}

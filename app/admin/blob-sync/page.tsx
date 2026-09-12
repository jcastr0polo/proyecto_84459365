'use client';

import React, { useCallback, useEffect, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import DatabaseStatusView, { type DbStatus } from '@/components/admin/DatabaseStatusView';

/**
 * Estado de la base de datos.
 *
 * Esta pantalla era "Blob Storage — Base de Datos", de antes de la migración
 * a Supabase. Tenía tres pestañas y 617 líneas:
 *
 * · "Seed selectivo (data/ → Blob)", con el aviso "SOBRESCRIBIRÁ la data en
 *   producción". Ya no era cierto: desde la migración nadie lee datos del
 *   Blob, así que ese botón escribía donde no alimenta nada. Un botón
 *   peligroso que no hace lo que dice es peor que no tenerlo.
 * · "Descargar datos" del Blob, que devolvía la foto anterior a la migración
 *   presentada como si fuera producción.
 * · "Verificar conexión", que solo miraba la tabla `users`: decía "conectado"
 *   con quince tablas sin comprobar.
 *
 * Queda lo único que hacía falta y no existía: el estado real de las dieciséis
 * tablas que la aplicación lee. La URL se mantiene para no romper marcadores.
 */
export default function DatabaseStatusPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/db-status', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo consultar la base de datos');
      setStatus(await res.json());
      if (manual) toast('Estado actualizado', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al consultar', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          kind="error"
          title="No se pudo consultar la base de datos"
          description="Reintenta; si sigue fallando, revisa las variables de conexión en el entorno."
        />
      </div>
    );
  }

  return <DatabaseStatusView status={status} refreshing={refreshing} onRefresh={() => load(true)} />;
}

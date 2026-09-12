'use client';

import React from 'react';
import DatabaseStatusPanel from '@/components/admin/DatabaseStatusPanel';

/**
 * Estado de la base de datos, como página propia.
 *
 * El contenido vive en un componente porque también se muestra dentro de
 * Configuración → Base de datos. Esta ruta se mantiene para no romper el
 * marcador de quien la tenga guardada, y porque a veces se quiere abrir sola.
 */
export default function DatabaseStatusPage() {
  return <DatabaseStatusPanel standalone />;
}

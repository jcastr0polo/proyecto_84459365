'use client';

import { useEffect } from 'react';

/**
 * useUnsavedGuard — pide confirmación antes de abandonar cambios sin guardar.
 *
 * Se usa donde se puede perder trabajo de verdad: la tabla de calificación
 * (un docente puede llevar treinta notas escritas y ninguna guardada) y el
 * formulario de proyecto.
 *
 * Solo cubre cerrar o recargar la pestaña. La navegación interna del router
 * de Next no dispara beforeunload; para eso haría falta interceptar el
 * router, que es un cambio mayor y con más riesgo de estorbar.
 */
export function useUnsavedGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);
}

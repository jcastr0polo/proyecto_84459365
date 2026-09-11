'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useDraft — guarda un borrador en el navegador y avisa antes de perderlo.
 *
 * El formulario de entrega no guardaba nada: si el estudiante escribía una
 * reflexión larga y cerraba la pestaña, se iba al aire sin aviso. Aquí se
 * pierde trabajo de verdad, así que vale la pena el guardado local.
 *
 * Los archivos no se pueden guardar (un File no es serializable); sí el
 * texto y los enlaces, que es lo que cuesta rehacer.
 *
 * localStorage puede fallar (modo privado, cuota, cookies bloqueadas), así
 * que toda lectura y escritura va protegida: si no se puede guardar, el
 * formulario sigue funcionando igual.
 */
export function useDraft<T extends Record<string, string>>(
  key: string,
  initial: T,
): {
  draft: T;
  setField: (field: keyof T, value: string) => void;
  clearDraft: () => void;
  restored: boolean;
} {
  const storageKey = `nexus:draft:${key}`;
  const [draft, setDraft] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  // Solo se avisa al salir si el usuario escribió algo en esta sesión.
  const dirty = useRef(false);

  // Se restaura después de montar: en el servidor no hay localStorage y
  // leerlo durante el render provocaría un desajuste de hidratación.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<T>;
      const hasContent = Object.values(saved).some((v) => typeof v === 'string' && v.trim() !== '');
      if (hasContent) {
        // La regla react-hooks avisa de setState síncrono en un efecto. Aquí
        // es intencional y es la opción correcta: localStorage no existe en
        // el servidor, así que leerlo durante el render provocaría un
        // desajuste de hidratación. Se ejecuta una sola vez al montar y no
        // encadena renders.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft((prev) => ({ ...prev, ...saved }));
        setRestored(true);
      }
    } catch { /* sin borrador; el formulario arranca vacío */ }
  }, [storageKey]);

  const setField = useCallback((field: keyof T, value: string) => {
    dirty.current = true;
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch { /* cuota llena o almacenamiento bloqueado */ }
      return next;
    });
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    dirty.current = false;
    try { window.localStorage.removeItem(storageKey); } catch { /* nada que hacer */ }
  }, [storageKey]);

  // Aviso del navegador al cerrar o recargar con cambios sin enviar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return { draft, setField, clearDraft, restored };
}

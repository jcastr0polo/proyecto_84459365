'use client';

import { useEffect } from 'react';

/**
 * Si la sesión caduca estando ya dentro, al login.
 *
 * El proxy cubre entrar sin cookie, y los layouts cubren el montaje. Lo que no
 * cubría nadie es lo más molesto: llevas media hora trabajando, la sesión
 * vence, y a partir de ahí cada pantalla se llena de «Error al cargar» y
 * listas vacías. Parece que la aplicación se rompió, no que hay que volver a
 * entrar.
 *
 * Se envuelve fetch una sola vez en lugar de tocar los cerca de cien sitios
 * que llaman a la API. Es un martillo grande, pero la alternativa era repetir
 * el mismo `if (res.status === 401)` por todo el proyecto y que el siguiente
 * que escriba una pantalla se olvide.
 *
 * Lo que NO hace:
 * · No toca peticiones a otros dominios.
 * · No toca /api/auth/login: ahí un 401 significa «contraseña incorrecta», y
 *   echar a alguien al login desde el login es absurdo.
 * · No redirige si ya estás en /login.
 * · Deja pasar la respuesta tal cual: quien llamó sigue viendo su 401 y puede
 *   mostrar lo que quiera mientras ocurre el salto.
 */
export default function SesionCaducada() {
  useEffect(() => {
    const original = window.fetch;
    let saltando = false;

    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status !== 401 || saltando) return res;

      const url = typeof args[0] === 'string' ? args[0]
        : args[0] instanceof Request ? args[0].url
        : String(args[0]);
      let ruta: string;
      try { ruta = new URL(url, window.location.origin).pathname; } catch { return res; }

      if (!ruta.startsWith('/api/')) return res;
      if (ruta.startsWith('/api/auth/login')) return res;
      if (window.location.pathname === '/login') return res;

      saltando = true;
      const volverA = window.location.pathname + window.location.search;
      window.location.assign(`/login?next=${encodeURIComponent(volverA)}&expirada=1`);
      return res;
    };

    return () => { window.fetch = original; };
  }, []);

  return null;
}

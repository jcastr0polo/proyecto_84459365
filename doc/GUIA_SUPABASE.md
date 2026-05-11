# Guía: Conectar Next.js a Supabase (PostgreSQL)

## Problema Común: Error al Compilar (Build)

Cuando conectas Supabase a tu proyecto Next.js, el **build** (`next build`) puede fallar si tu código intenta conectarse a la base de datos durante la compilación. Esto pasa porque:

1. Next.js **pre-renderiza** páginas estáticas durante el build
2. Si un componente o página importa código que se conecta a Supabase al cargar el módulo, **falla** porque las variables de entorno de Supabase no están disponibles en build-time (o el servidor no es accesible)
3. El error típico es: `Error: Supabase not configured` o `fetch failed` durante el build

## Solución: Cliente Build-Safe

### 1. Instalar dependencia

```bash
npm install @supabase/supabase-js
```

### 2. Crear el cliente Supabase (build-safe)

```typescript
// lib/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _checked = false;

/**
 * Retorna el cliente Supabase o null si no está configurado.
 * SEGURO para llamar en build-time — retorna null sin lanzar error.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_checked) return null;

  const url = process.env.SUPABASE_URL;          // ← tu variable
  const key = process.env.SUPABASE_SERVICE_KEY;   // ← tu variable

  _checked = true;

  if (!url || !key) {
    console.warn('[supabase] No configurado — variables de entorno faltantes');
    return null;
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
```

### Reglas clave:

| ✅ Correcto | ❌ Incorrecto |
|---|---|
| `getSupabaseClient()` retorna `null` si no hay env vars | `throw new Error(...)` si no hay env vars |
| Verificar `if (!client) return fallback` | Asumir que el client siempre existe |
| Usar `try/catch` en queries | Queries sin manejo de error |
| Llamar Supabase solo en **funciones async** (runtime) | Llamar Supabase a nivel de módulo (top-level) |

### 3. Usar el cliente en tus funciones de datos

```typescript
// lib/dataService.ts

import { getSupabaseClient } from './supabase';

export async function getUsuarioPorEmail(email: string) {
  const sb = getSupabaseClient();
  
  if (sb) {
    // Supabase disponible → usarlo
    try {
      const { data, error } = await sb
        .from('usuarios')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (!error && data) return data;
    } catch {
      console.warn('[supabase] Query falló, usando fallback');
    }
  }

  // Fallback: leer del JSON/Blob
  console.warn('[usuarios] FALLBACK a JSON — Supabase no disponible');
  const usuarios = await leerUsuariosJSON();
  return usuarios.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}
```

## Errores Comunes y Cómo Evitarlos

### Error 1: "fetch failed" durante `next build`

**Causa:** Estás llamando a Supabase durante el pre-render de una página estática.

**Solución:** Asegúrate de que las páginas que leen de Supabase sean dinámicas:

```typescript
// app/mi-pagina/page.tsx

// Forzar renderizado dinámico (no se pre-renderiza en build)
export const dynamic = 'force-dynamic';
```

O mejor: mueve las llamadas a Supabase a **Route Handlers** (`/api/...`) y haz `fetch` desde el cliente.

### Error 2: "relation does not exist"

**Causa:** La tabla no existe en Supabase.

**Solución:** Crea la tabla primero en el SQL Editor de Supabase antes de hacer queries.

### Error 3: Variables de entorno no disponibles

**Causa:** Las env vars no están configuradas en Vercel.

**Solución:**
1. Si usas la integración de Vercel con Supabase, las variables se configuran automáticamente con un prefijo (ej: `SUPABASE_NEXUS_SUPABASE_URL`)
2. Si las configuras manual, ve a Vercel → Settings → Environment Variables y agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

## Estructura Recomendada

```
lib/
  supabase.ts          ← Cliente build-safe (retorna null si no hay env vars)
  dataService.ts       ← Funciones de datos (Supabase primero, fallback a JSON)
app/
  api/
    mi-recurso/
      route.ts         ← Route Handlers que usan dataService
  mi-pagina/
    page.tsx           ← Páginas que llaman a /api/... desde el cliente
```

## Checklist antes de hacer Push

- [ ] `getSupabaseClient()` retorna `null` (no lanza error) cuando faltan env vars
- [ ] Ningún import de Supabase se ejecuta a nivel de módulo (todo dentro de funciones async)
- [ ] `npx next build` pasa sin errores localmente
- [ ] Las variables de entorno están configuradas en Vercel (Settings → Environment Variables)
- [ ] La tabla existe en Supabase (créala en el SQL Editor)

## Resumen

```
Build time (next build):
  → getSupabaseClient() = null ← no hay env vars, no pasa nada
  → Páginas estáticas se renderizan sin problemas

Runtime (servidor Vercel):
  → getSupabaseClient() = SupabaseClient ← env vars disponibles
  → Queries a PostgreSQL funcionan normalmente
```

La clave es: **nunca asumas que Supabase está disponible**. Siempre verifica que el cliente no sea `null` antes de usarlo.

# Guía: Conectar Next.js a Supabase (PostgreSQL)

> **Para estudiantes** — Copia este archivo a tu carpeta `doc/` y usa el prompt de `PROMPT_0_SUPABASE.md` para implementar la conexión.

---

## 1. Arquitectura de Conexión

```
Tu proyecto Next.js (Vercel)
  │
  ├── lib/supabase.ts          ← Cliente build-safe (NUNCA lanza error si falta config)
  │     ├── getSupabaseClient()     → SupabaseClient | null
  │     ├── requireSupabaseClient() → SupabaseClient (lanza si no hay config)
  │     └── executeSql()            → Para DDL (CREATE TABLE, ALTER, etc.)
  │
  ├── lib/dataService.ts       ← Funciones de datos que usan getSupabaseClient()
  │
  ├── app/setup-database/      ← Página SIN auth para probar conexión y crear tablas
  │     └── page.tsx                (se elimina después del setup)
  │
  └── app/api/                 ← Route Handlers que usan dataService
        └── tu-recurso/route.ts
```

### Flujo de datos

```
Browser → fetch('/api/recurso') → Route Handler → dataService → Supabase (PostgreSQL)
```

**NUNCA** leas de Supabase directamente en un componente de página. Siempre pasa por un Route Handler (`/api/...`) o un Server Action.

---

## 2. El Problema del Build

Next.js ejecuta `next build` para compilar tu proyecto. Durante el build:

1. **Pre-renderiza** páginas estáticas (las que no tienen `export const dynamic = 'force-dynamic'`)
2. Si una página importa código que se conecta a Supabase al cargar el módulo, el **build falla** porque las variables de entorno no están disponibles en ese momento
3. Error típico: `Error: Supabase not configured` o `fetch failed`

### Solución: Cliente Build-Safe

El cliente debe retornar `null` (no lanzar error) cuando las variables de entorno no estén disponibles:

```typescript
// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _checked = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_checked) return null; // Ya verificamos, no hay config

  // ⚠️ AJUSTA estos nombres según tu integración en Vercel
  const url = process.env.TU_PREFIJO_SUPABASE_URL;
  const key = process.env.TU_PREFIJO_SUPABASE_SERVICE_ROLE_KEY;

  _checked = true;

  if (!url || !key) {
    console.warn('[supabase] No configurado — retornando null (build-safe)');
    return null;
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
```

### Reglas de oro

| ✅ Correcto | ❌ Incorrecto |
| --- | --- |
| `getSupabaseClient()` retorna `null` si no hay env vars | `throw new Error(...)` si no hay env vars |
| Verificar `if (!client) return null` antes de query | Asumir que el client siempre existe |
| `try/catch` en TODAS las queries | Queries sin manejo de error |
| Llamar Supabase solo en **funciones async** (runtime) | Código Supabase a nivel de módulo (top-level) |
| `export const dynamic = 'force-dynamic'` en páginas con datos | Páginas estáticas que leen de la BD |

---

## 3. Crear Tablas desde Código (DDL)

El JS client de Supabase usa **PostgREST** que solo puede hacer CRUD (SELECT, INSERT, UPDATE, DELETE). **No puede crear tablas.**

Para ejecutar DDL (`CREATE TABLE`, `ALTER TABLE`, etc.) necesitas una conexión directa a PostgreSQL:

```bash
npm install postgres
```

```typescript
// En lib/supabase.ts — agregar:
import postgres from 'postgres';

export async function executeSql(query: string): Promise<void> {
  const connString = process.env.TU_PREFIJO_POSTGRES_URL;

  if (!connString) {
    throw new Error('POSTGRES_URL no configurado');
  }

  const sql = postgres(connString, {
    ssl: 'require',
    connect_timeout: 10,
    idle_timeout: 5,
    max: 1,
  });

  try {
    await sql.unsafe(query);
  } finally {
    await sql.end();
  }
}
```

### Importante después de crear tablas

PostgREST cachea el schema. Después de un `CREATE TABLE`, el JS client NO ve la tabla nueva hasta que le notifiques:

```sql
-- Siempre incluir al final de tus CREATE TABLE:
NOTIFY pgrst, 'reload schema';
```

### RLS (Row Level Security)

Supabase requiere que habilites RLS en todas las tablas públicas:

```sql
ALTER TABLE mi_tabla ENABLE ROW LEVEL SECURITY;

-- Policy para que service_role (tu backend) tenga acceso total:
CREATE POLICY service_role_all ON mi_tabla
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## 4. Variables de Entorno

### Integración Vercel ↔ Supabase (automática)

Si conectaste Supabase desde el dashboard de Vercel, las variables se crean con un prefijo:

```
TU_PREFIJO_SUPABASE_URL          → URL de la API REST
TU_PREFIJO_SUPABASE_ANON_KEY     → Clave pública (no usar en backend)
TU_PREFIJO_SUPABASE_SERVICE_ROLE_KEY → Clave privada (usar en backend)
TU_PREFIJO_POSTGRES_URL           → Conexión directa a PostgreSQL (para DDL)
```

Ejemplo: si tu proyecto en Supabase se llama "MiApp", el prefijo podría ser `MI_APP_`.

### Verificar en Vercel

1. Vercel → tu proyecto → Settings → Environment Variables
2. Busca las variables con tu prefijo
3. Confirma que existan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, y `POSTGRES_URL`

### Local (.env.local)

Para desarrollo local, crea `.env.local`:

```env
TU_PREFIJO_SUPABASE_URL=https://xxxx.supabase.co
TU_PREFIJO_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
TU_PREFIJO_POSTGRES_URL=postgresql://postgres.xxxx:password@...
```

---

## 5. Patrón de Funciones de Datos

```typescript
// lib/dataService.ts

import { getSupabaseClient } from './supabase';

// Snake_case en la BD → camelCase en TypeScript
interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabaseClient();
  if (!sb) {
    console.error('[dataService] Supabase no disponible');
    return null;
  }

  const { data, error } = await sb
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
}
```

---

## 6. Errores Comunes

| Error | Causa | Solución |
| --- | --- | --- |
| `fetch failed` en build | Página estática llama a Supabase | `export const dynamic = 'force-dynamic'` |
| `relation "X" does not exist` | Tabla no existe | Créala con `executeSql()` o SQL Editor |
| `Could not find table in schema cache` | PostgREST no recargó schema | Agregar `NOTIFY pgrst, 'reload schema'` |
| `RLS Disabled` warning | Tabla sin RLS | `ALTER TABLE X ENABLE ROW LEVEL SECURITY` + crear policy |
| `Supabase not configured` | Env vars faltan | Verificar en Vercel → Settings → Env Variables |

---

## 7. Checklist antes de Push

- [ ] `lib/supabase.ts` tiene `getSupabaseClient()` que retorna `null` sin lanzar error
- [ ] Ningún import de Supabase se ejecuta a nivel de módulo
- [ ] Páginas con datos tienen `export const dynamic = 'force-dynamic'`
- [ ] `npx next build` pasa sin errores localmente
- [ ] Variables de entorno configuradas en Vercel
- [ ] Tablas creadas en Supabase con RLS habilitado
- [ ] Todas las tablas tienen `NOTIFY pgrst, 'reload schema'` después del DDL

---

## 8. Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│                    BUILD TIME (next build)               │
│                                                         │
│  getSupabaseClient() → null (no hay env vars, OK)       │
│  Páginas estáticas se renderizan sin problemas           │
│  ✅ Build exitoso                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    RUNTIME (Vercel)                      │
│                                                         │
│  getSupabaseClient() → SupabaseClient ✅                │
│  Queries a PostgreSQL funcionan normalmente              │
│  executeSql() para DDL (CREATE TABLE)                    │
│  NOTIFY pgrst para refrescar schema cache                │
└─────────────────────────────────────────────────────────┘
```

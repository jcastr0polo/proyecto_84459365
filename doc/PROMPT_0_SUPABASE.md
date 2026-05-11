# Prompt 0 — Setup Base de Datos (Supabase + Next.js)

> **Instrucciones:** Copia este prompt completo y pégalo en tu sesión de IA.
> Antes de ejecutarlo, asegúrate de:
> 1. Tener `doc/GUIA_SUPABASE.md` en tu proyecto (copia el archivo del profesor)
> 2. Haber conectado Supabase a tu proyecto de Vercel (integración desde el dashboard)
> 3. Saber el **prefijo** de tus variables de entorno (ve a Vercel → Settings → Environment Variables y busca las que terminan en `_SUPABASE_URL`)

---

## Prompt

```
Lee el archivo doc/GUIA_SUPABASE.md — es la guía de referencia obligatoria para la conexión a Supabase. Toda implementación debe seguir sus patrones.

## Contexto

Mi proyecto Next.js usa Supabase (PostgreSQL) como base de datos. No uso archivos JSON ni Blob Storage para datos. Todo se lee y escribe directamente en Supabase.

Mi proyecto está desplegado en Vercel con la integración de Supabase. Las variables de entorno tienen un prefijo automático. Necesito que:

1. Revises las variables de entorno disponibles en mi proyecto (busca en los archivos existentes o pregúntame el prefijo)
2. Identifiques las variables: `*_SUPABASE_URL`, `*_SUPABASE_SERVICE_ROLE_KEY`, y `*_POSTGRES_URL`

## Tarea: Crear setup-database

Implementa lo siguiente en orden:

### Paso 1: Instalar dependencias
```bash
npm install @supabase/supabase-js postgres
```

### Paso 2: Crear lib/supabase.ts (BUILD-SAFE)

Crea el archivo `lib/supabase.ts` siguiendo EXACTAMENTE el patrón de GUIA_SUPABASE.md:

- `getSupabaseClient()` → retorna `SupabaseClient | null` (NUNCA lanzar error si faltan env vars)
- `requireSupabaseClient()` → retorna `SupabaseClient` (lanza error, solo para endpoints admin)
- `executeSql(query)` → usa el paquete `postgres` con la variable `*_POSTGRES_URL` para DDL

⚠️ CRÍTICO para el build:
- Si las variables de entorno no existen, `getSupabaseClient()` DEBE retornar `null`, NO lanzar error
- Usar un flag `_checked` para no revisar las env vars más de una vez
- Loguear `console.warn('[supabase] No configurado')` cuando retorne null

### Paso 3: Crear la página /setup-database

Crea `app/setup-database/page.tsx`:
- Página client-side (`'use client'`)
- SIN autenticación (es temporal para setup)
- Debe tener estas funcionalidades:

**Sección 1: Test de Conexión**
- Botón "Probar Conexión" que llama a `GET /api/setup-database`
- Muestra si la conexión fue exitosa o el error
- Muestra las tablas que existen y cuántas filas tiene cada una

**Sección 2: Crear Tablas**
- Botón "Crear Todas las Tablas" que llama a `POST /api/setup-database`
- Muestra resultado paso a paso (tabla creada ✅, error ❌)
- Cada tabla muestra su nombre y estado

**UI:**
- Diseño limpio y simple
- Indicadores de carga (spinner)
- Colores: verde para éxito, rojo para error, amarillo para advertencia
- Mostrar los errores completos para poder depurar

### Paso 4: Crear API /api/setup-database/route.ts

**GET** — Verificar conexión:
- Intentar conectar con `requireSupabaseClient()`
- Listar tablas existentes con su conteo de filas
- Retornar `{ connected: true, tables: {...} }` o `{ connected: false, error: '...' }`
- NO requiere autenticación

**POST** — Crear tablas:
- Recibir `{ action: 'create-all' }` en el body
- Usar `executeSql()` para cada CREATE TABLE (conexión directa a PostgreSQL)
- Cada CREATE TABLE debe incluir:
  - `CREATE TABLE IF NOT EXISTS` (idempotente)
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY service_role_all ON ... FOR ALL TO service_role USING (true) WITH CHECK (true);` (usando DO $$ para no fallar si ya existe)
  - Índices relevantes
  - Al final de TODO: `NOTIFY pgrst, 'reload schema';`
- Retornar resultados paso a paso

### Paso 5: Definir las tablas

Lee mi archivo lib/types.ts (o donde estén mis tipos/interfaces) para entender la estructura de datos de mi proyecto. Crea las tablas SQL que correspondan a mis tipos de TypeScript. Convierte camelCase a snake_case para los nombres de columnas en PostgreSQL.

Si no encuentras tipos definidos o el proyecto está vacío, pregúntame qué tablas necesito.

### Paso 6: Verificar Build

Después de crear todo, ejecuta `npx next build` para verificar que el build pasa sin errores. El build NO debe fallar por conexión a Supabase.

Si falla:
- Verificar que `getSupabaseClient()` retorna null (no lanza error)  
- Verificar que la página `/setup-database` usa `'use client'` y llama a la API via fetch
- Verificar que ningún import ejecuta código de Supabase a nivel de módulo

## Reglas obligatorias

1. **Build-safe**: `getSupabaseClient()` NUNCA lanza error. Retorna null si no hay env vars.
2. **DDL via postgres**: Usar `executeSql()` con el paquete `postgres` para CREATE TABLE. El JS client de Supabase (PostgREST) NO puede hacer DDL.
3. **NOTIFY pgrst**: Después de crear tablas, siempre incluir `NOTIFY pgrst, 'reload schema'` para que el JS client vea las tablas nuevas.
4. **RLS obligatorio**: Todas las tablas deben tener `ENABLE ROW LEVEL SECURITY` + policy para `service_role`.
5. **Snake_case en BD**: Las columnas en PostgreSQL usan snake_case. Los tipos TypeScript usan camelCase. Crear funciones de conversión (rowToEntity / entityToRow).
6. **No JSON/Blob**: Este proyecto NO usa archivos JSON ni Blob Storage. Todos los datos van a Supabase directamente.
7. **setup-database es temporal**: Esta página se elimina después de verificar que todo funciona. No agregar autenticación.
```

---

## Después de ejecutar el prompt

1. Verifica que `npx next build` pasa sin errores
2. Haz push a Vercel
3. Abre `/setup-database` en tu URL de Vercel
4. Click "Probar Conexión" → debe mostrar "Conectado"
5. Click "Crear Todas las Tablas" → debe crear todas las tablas
6. Click "Probar Conexión" de nuevo → debe mostrar las tablas con 0 filas
7. Si todo funciona, **elimina la página** `/setup-database` y su API (o protégela con auth)

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Build falla con "Supabase not configured" | `getSupabaseClient()` lanza error | Cambiar a retornar `null` |
| "Could not find table in schema cache" | PostgREST no recargó | Agregar `NOTIFY pgrst, 'reload schema'` al SQL |
| "relation does not exist" | Tabla no creada | Ejecutar "Crear Todas las Tablas" |
| "RLS Disabled" en Supabase dashboard | Falta `ENABLE ROW LEVEL SECURITY` | Agregar al SQL de creación |
| "POSTGRES_URL not configured" | Variable de entorno faltante | Verificar en Vercel → Settings → Env Variables |
| Conexión OK pero create falla | Falta paquete `postgres` | `npm install postgres` |

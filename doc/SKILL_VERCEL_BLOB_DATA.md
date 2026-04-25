# Skill: Persistencia de datos con Vercel Blob en Next.js (Sin Caché)

> **Problema:** Vercel es serverless con filesystem de solo lectura. No puedes guardar archivos JSON, sesiones ni uploads en disco. Cada ~2 minutos la instancia muere y todo lo que escribiste en memoria se pierde.
>
> **Solución:** Usar **Vercel Blob** como base de datos con **lecturas directas** (sin caché en memoria). Sistema 100% transaccional.
>
> **Regla de oro:** En un sistema transaccional, la caché solo genera errores. CERO caché. Cada lectura va directo a Blob.

---

## 1. Arquitectura General

```
┌─────────────┐     fetch        ┌──────────────┐  readFromBlobDirect()  ┌──────────────┐
│  Frontend    │  (no-store)     │  API Routes   │ ─────────────────────►│  Vercel Blob │
│  (pages)     │ ───────────────►│  /api/*       │                       │  (BD real)   │
│              │◄───────────────│              │◄─────────────────────│              │
│              │  JSON+no-store  │              │                       │              │
└─────────────┘                  └──────────────┘                       └──────────────┘
                                        │
                                        │ writeToBlob()
                                        ▼
                                  ┌──────────────┐
                                  │  Vercel Blob │
                                  │  put() SDK   │
                                  └──────────────┘
```

### Reglas Fundamentales

1. **Blob = fuente de verdad.** Si un dato no está en Blob, no existe.
2. **Escritura: `put()` directo a Blob.** Sin paso intermedio.
3. **Lectura: SIEMPRE directo de Blob vía `get()` del SDK.** Sin caché en memoria. Sin Map. Sin variable global.
4. **Frontend NUNCA importa servicios de datos directamente.** Siempre vía `/api/*`.
5. **`data/` es solo semilla.** Se sube una vez a Blob y nunca más se lee en producción.
6. **Blobs privados requieren `get()` del SDK**, no `fetch(url)`.
7. **CERO caché en TODA la cadena:** sin caché en memoria, sin CDN cache, sin browser cache para datos transaccionales.
8. **Batch reads con `Promise.all()`.** Nunca lecturas secuenciales N+1.

---

## 2. Setup Inicial

### 2.1 Crear Blob Store

1. En el dashboard de Vercel → tu proyecto → **Storage** → **Create** → **Blob Store**
2. Seleccionar **Private** (obligatorio para datos de app)
3. Copiar el token de Read/Write

### 2.2 Variables de Entorno

En Vercel → Settings → Environment Variables:

```
NEXUS_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

En `.env.local` para desarrollo local:
```
NEXUS_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

> **Nota:** El nombre del token es configuración del proyecto. Puede ser `BLOB_READ_WRITE_TOKEN` o cualquier otro nombre, pero debe coincidir con `getBlobToken()`.

### 2.3 Instalar dependencia

```bash
npm install @vercel/blob
```

---

## 3. Implementación Paso a Paso

### 3.1 Capa de Blob (`lib/blobSync.ts`)

Este archivo maneja toda la comunicación con Vercel Blob. **SIN caché en memoria.**

```typescript
import { put, get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// IMPORTANTE: Lazy function, no const. El token no existe en build time.
function getBlobToken() {
  return process.env.NEXUS_READ_WRITE_TOKEN;
}

const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

// Archivos JSON que componen tu "base de datos"
export const DATA_FILES = [
  'users.json',
  'courses.json',
  'enrollments.json',
  // ... todos los que necesites
];

// ═══════════════════════════════════════════════
// Per-file write lock — serializa read-modify-write
// ═══════════════════════════════════════════════
const _fileLocks = new Map<string, Promise<unknown>>();

export async function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const prev = _fileLocks.get(filename) ?? Promise.resolve();
  let resolve: () => void;
  const lock = new Promise<void>((r) => { resolve = r; });
  _fileLocks.set(filename, lock);
  try {
    await prev;
    return await fn();
  } finally {
    resolve!();
    if (_fileLocks.get(filename) === lock) _fileLocks.delete(filename);
  }
}

// ═══════════════════════════════════════════════
// Lectura directa desde Blob (ÚNICA forma)
// ═══════════════════════════════════════════════

/**
 * Lee un archivo directo desde Blob. Sin caché.
 * Retorna null si no existe (en local o sin token).
 */
export async function readFromBlobDirect(filename: string): Promise<string | null> {
  if (!IS_VERCEL) return null;
  const token = getBlobToken();
  if (!token) return null;
  try {
    // ⚠️ USAR get() DEL SDK — NO fetch(url)
    const result = await get(`data/${filename}`, { token, access: 'private' });
    if (result && result.statusCode === 200) {
      return new Response(result.stream).text();
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════
// Escritura: directo a Blob
// ═══════════════════════════════════════════════

export async function writeToBlob(filename: string, content: string): Promise<void> {
  if (!IS_VERCEL) return;
  const token = getBlobToken();
  if (!token) throw new Error('Token not configured');

  await put(`data/${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
}

// ═══════════════════════════════════════════════
// Seed: data/ del repo → Blob (una sola vez)
// ═══════════════════════════════════════════════
export async function seedAllToBlob(): Promise<Record<string, string>> {
  const token = getBlobToken();
  if (!token) throw new Error('Token not configured');
  const results: Record<string, string> = {};
  for (const file of DATA_FILES) {
    const srcPath = path.join(SOURCE_DATA_DIR, file);
    if (!fs.existsSync(srcPath)) { results[file] = 'NOT FOUND'; continue; }
    const content = fs.readFileSync(srcPath, 'utf-8');
    await put(`data/${file}`, content, {
      access: 'private', addRandomSuffix: false, allowOverwrite: true, token,
    });
    results[file] = 'SEEDED';
  }
  return results;
}
```

### 3.2 Capa de Datos (`lib/dataService.ts`)

```typescript
import fs from 'fs';
import path from 'path';
import { writeToBlob, readFromBlobDirect, withFileLock } from './blobSync';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Lee un archivo JSON FRESCO directo de Blob.
 * En Vercel: lee de Blob (siempre fresco, sin caché).
 * En local: lee del filesystem.
 */
export async function readJsonFileFresh<T>(filename: string): Promise<T> {
  if (IS_VERCEL) {
    const raw = await readFromBlobDirect(filename);
    if (raw !== null) return JSON.parse(raw) as T;
    throw new Error(`Cannot read ${filename} from Blob`);
  }
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')) as T;
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';
  if (IS_VERCEL) {
    await writeToBlob(filename, content);
  } else {
    fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf-8');
  }
}

// ─── Helpers tipados (todos async, leen fresco) ───

export async function readUsersFresh(): Promise<User[]> {
  const raw = await readJsonFileFresh<unknown[]>('users.json');
  return z.array(userSchema).parse(raw) as User[];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await readUsersFresh();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

// ... etc para cada entidad
```

### 3.3 Patrón de Batch Reads (evitar N+1)

```typescript
// ❌ MAL — N+1 lecturas secuenciales a Blob
for (const course of courses) {
  const activities = await getActivitiesByCourse(course.id);   // 1 read
  const enrollments = await getEnrollmentsByCourse(course.id); // 1 read
  // Total: 2 × N courses = 2N reads
}

// ✅ BIEN — Batch reads con Promise.all
const [allActivities, allEnrollments] = await Promise.all([
  readActivitiesFresh(),     // 1 read total
  readEnrollmentsFresh(),    // 1 read total
]);
// Luego filtrar en memoria (gratis)
for (const course of courses) {
  const activities = allActivities.filter(a => a.courseId === course.id);
  const enrollments = allEnrollments.filter(e => e.courseId === course.id);
}
```

### 3.4 Write seguro con Lock

```typescript
// ✅ Patrón read-modify-write con lock
await withFileLock('enrollments.json', async () => {
  const enrollments = await readEnrollmentsFresh(); // read DENTRO del lock
  enrollments.push(newEnrollment);
  await writeEnrollments(enrollments);
});
```

### 3.5 Wrapper de Auth (`lib/withAuth.ts`)

```typescript
import { NextResponse } from 'next/server';

export async function withAuth(
  request: Request,
  handler: (user: User) => Promise<NextResponse>,
  requiredRole?: string
): Promise<NextResponse> {
  // 1. Validar sesión (JWT — sin DB read)
  // 2. Buscar usuario (readUsersFresh — directo de Blob)
  // 3. Verificar rol
  // 4. Ejecutar handler
  const response = await handler(user);

  // 5. SIEMPRE: no-cache en respuestas transaccionales
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
```

### 3.6 Safety net en `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  // CERO caché en TODAS las API responses a nivel infraestructura
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};
```

---

## 4. Errores Comunes y Soluciones

### ❌ Error: "BLOB token is undefined"

**Causa:** El token se evalúa a nivel de módulo durante `next build`.

**Solución:** Función lazy, nunca constante global:
```typescript
// ❌ MAL — se evalúa en build time (undefined)
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// ✅ BIEN — se evalúa en runtime
function getBlobToken() {
  return process.env.NEXUS_READ_WRITE_TOKEN;
}
```

### ❌ Error: "Los datos se pierden / no se actualizan"

**Causa 1:** Usas `fetch(blob.url)` para blobs **privados** → falla silenciosamente (401).

**Solución:** Usar `get()` del SDK:
```typescript
// ❌ MAL — falla silenciosamente con blobs privados
const res = await fetch(blob.url);

// ✅ BIEN
import { get } from '@vercel/blob';
const result = await get('data/users.json', { token, access: 'private' });
const text = await new Response(result.stream).text();
```

**Causa 2:** Caché en memoria (Map, variable global) sirve datos stale después de que otra instancia serverless escribió.

**Solución:** Eliminar TODA caché en memoria. Cada lectura va directo a Blob:
```typescript
// ❌ MAL — caché en memoria que se desincroniza entre instancias
const _cache = new Map<string, string>();
function readData(file: string) { return _cache.get(file); }

// ✅ BIEN — lectura directa, siempre fresca
async function readData(file: string) { return readFromBlobDirect(file); }
```

**Causa 3:** CDN/browser cachean las respuestas de API.

**Solución:** Triple defensa:
```
1. next.config.ts → headers() para /api/:path* → no-store
2. withAuth() → response.headers.set('Cache-Control', 'no-store')
3. Rutas públicas sin auth → headers explícitos { 'Cache-Control': 'no-store' }
```

### ❌ Error: "blob already exists"

**Solución:** `allowOverwrite: true` en `put()`:
```typescript
await put('data/users.json', content, {
  access: 'private',
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});
```

### ❌ Error: "Build fails trying to read data"

**Solución:** Pages deben ser `'use client'` y hacer `fetch('/api/...')`:
```typescript
// ❌ MAL — importando dataService en page
import { readUsers } from '@/lib/dataService';

// ✅ BIEN — fetch desde client component
'use client';
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users));
}, []);
```

### ❌ Error: "API lenta — muchas lecturas a Blob"

**Causa:** N+1 reads. Por cada curso haces 3-5 lecturas individuales.

**Solución:** Batch reads al inicio, luego filtrar en memoria:
```typescript
// ❌ MAL — 23 lecturas secuenciales
for (const course of courses) {
  const acts = await getActivitiesByCourse(course.id);
  const grades = await getGradesByStudent(studentId, course.id);
}

// ✅ BIEN — 7 lecturas en paralelo
const [users, enrollments, courses, activities, submissions, projects, grades] =
  await Promise.all([
    readUsersFresh(), readEnrollmentsFresh(), readCoursesFresh(),
    readActivitiesFresh(), readSubmissionsFresh(), readProjectsFresh(),
    readGradesFresh(),
  ]);
// Filtrar en memoria (< 1ms)
```

### ❌ Error: "Escrituras concurrentes corrompen datos"

**Causa:** Dos requests leen el mismo archivo, ambos modifican, el segundo sobrescribe los cambios del primero.

**Solución:** `withFileLock()` serializa escrituras al mismo archivo:
```typescript
await withFileLock('enrollments.json', async () => {
  const data = await readEnrollmentsFresh(); // DENTRO del lock
  data.push(newItem);
  await writeEnrollments(data);
});
```

> **Limitación:** El lock solo funciona dentro de la misma instancia serverless. Para alta concurrencia, considerar una BD real.

---

## 5. Checklist de Despliegue

- [ ] `npm install @vercel/blob`
- [ ] Crear Blob Store en Vercel dashboard (**Private**)
- [ ] Agregar token en env vars de Vercel
- [ ] Token accedido vía función lazy
- [ ] `data/` con JSONs de semilla en el repo
- [ ] API route de seed protegida
- [ ] **CERO caché en memoria** — sin Map, sin variable global, sin loadFromBlob
- [ ] **CERO CDN cache** — `next.config.ts` headers para `/api/:path*`
- [ ] **CERO browser cache** — `withAuth` agrega `no-store` a toda respuesta
- [ ] Lecturas: `get()` del SDK con `access: 'private'`
- [ ] Escrituras: `put()` con `allowOverwrite: true`
- [ ] Batch reads con `Promise.all()` — nunca N+1
- [ ] Write locks con `withFileLock()` para read-modify-write
- [ ] Ningún `page.tsx` importa `dataService` ni `blobSync`
- [ ] Todas las páginas leen vía `fetch('/api/...')`
- [ ] Deploy → visitar `/admin/seed` → datos persistentes

---

## 6. Flujo de Vida del Dato

```
1. SEED (una vez):
   Admin visita /admin/seed
   → lee data/*.json del repo
   → put() a Blob con prefix data/
   → listo

2. LECTURA (cada request):
   API route recibe request
   → readJsonFileFresh('users.json')
   → readFromBlobDirect('users.json')
   → get() del SDK (autenticado, directo)
   → JSON.parse()
   → retorna datos FRESCOS
   (No hay cold start, no hay caché, no hay loadFromBlob)

3. ESCRITURA:
   API route necesita escribir
   → withFileLock('file.json', async () => {
       const data = await readFresh()  // lee FRESCO dentro del lock
       data.push(newItem)
       await write(data)               // put() a Blob
     })
   → siguiente lectura lee el dato nuevo

4. BATCH READ (optimización):
   API route necesita datos de múltiples archivos
   → Promise.all([readUsersFresh(), readCoursesFresh(), ...])
   → todas las lecturas en paralelo (7 reads en ~100ms)
   → filtrar en memoria (< 1ms)
```

---

## 7. Anti-patrones: Lo que NO hacer

| Anti-patrón | Por qué falla | Solución |
|---|---|---|
| `const _cache = new Map()` | Instancias serverless no comparten memoria | Leer directo de Blob |
| `ensureDataReady()` + `loadFromBlob()` | Cold start lento + datos stale entre instancias | Eliminar, leer directo |
| `Cache-Control: public, s-maxage=3600` | CDN sirve datos viejos por 1 hora | `no-store, no-cache, must-revalidate` |
| `fetch(blob.url)` para blobs privados | 401 silencioso → fallback a seed | `get()` del SDK con token |
| N+1 reads en loop | 23 reads secuenciales = 3-5 segundos | `Promise.all()` batch reads |
| `readData()` sync | Bloquea, no puede ir a Blob | Todo async: `await readFresh()` |
| Escribir sin lock | Race condition corrompe datos | `withFileLock()` |

---

## 8. Resumen en Una Línea

> **Blob es tu disco duro. No hay caché. Cada lectura va directo. Cada escritura va con lock. Batch reads con Promise.all. CERO stale data.**

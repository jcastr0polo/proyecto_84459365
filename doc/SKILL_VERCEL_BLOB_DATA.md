# Skill: Persistencia de datos con Vercel Blob en Next.js

> **Problema:** Vercel es serverless con filesystem de solo lectura. No puedes guardar archivos JSON, sesiones ni uploads en disco. Cada ~2 minutos la instancia muere y todo lo que escribiste en memoria se pierde.
>
> **Solución:** Usar **Vercel Blob** como base de datos y un patrón de caché en memoria para lecturas rápidas.

---

## 1. Arquitectura General

```
┌─────────────┐     fetch      ┌──────────────┐   readJsonFile()   ┌──────────────┐
│  Frontend    │ ──────────────►│  API Routes   │ ─────────────────►│  Caché en    │
│  (pages)     │                │  /api/*       │                   │  memoria     │
│              │◄──────────────│              │◄─────────────────│  (Map)       │
│              │     JSON       │              │                   │              │
└─────────────┘                └──────────────┘                   └──────┬───────┘
                                      │                                  │
                                      │ writeJsonFile()                  │ cold start
                                      ▼                                  ▼
                                ┌──────────────┐              ┌──────────────┐
                                │  Vercel Blob │◄─────────────│  loadFromBlob│
                                │  (BD real)   │  get() SDK   │  ()          │
                                └──────────────┘              └──────────────┘
```

### Reglas Fundamentales

1. **Blob = fuente de verdad.** Si un dato no está en Blob, no existe.
2. **Escritura: Blob primero → actualizar caché.** Nunca al revés.
3. **Lectura: siempre desde caché en memoria** (poblada desde Blob en cold start).
4. **Frontend NUNCA importa servicios de datos directamente.** Siempre vía `/api/*`.
5. **`data/` es solo semilla.** Se sube una vez a Blob y nunca más se lee en producción.
6. **Blobs privados requieren `get()` del SDK**, no `fetch(url)`.

---

## 2. Setup Inicial

### 2.1 Crear Blob Store

1. En el dashboard de Vercel → tu proyecto → **Storage** → **Create** → **Blob Store**
2. Seleccionar **Private** (recomendado para datos de app)
3. Copiar el token de Read/Write

### 2.2 Variables de Entorno

En Vercel → Settings → Environment Variables:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

En `.env.local` para desarrollo local:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### 2.3 Instalar dependencia

```bash
npm install @vercel/blob
```

---

## 3. Implementación Paso a Paso

### 3.1 Capa de Blob (`lib/blobSync.ts`)

Este archivo maneja toda la comunicación con Vercel Blob y el caché en memoria.

```typescript
import { put, list, get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// IMPORTANTE: Lazy function, no const. El token no existe en build time.
function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

// Archivos JSON que componen tu "base de datos"
export const DATA_FILES = [
  'users.json',
  'courses.json',
  // ... agrega todos los que necesites
];

// ═══════════════════════════════════════════════
// Caché en memoria (reemplaza el filesystem)
// ═══════════════════════════════════════════════
const _cache = new Map<string, string>();
let _ready = false;
let _initPromise: Promise<void> | null = null;

export function readFromCache(filename: string): string {
  const content = _cache.get(filename);
  if (content === undefined) {
    throw new Error(`${filename} not in cache. Run seed first.`);
  }
  return content;
}

export function isCacheReady(): boolean {
  return _ready;
}

// ═══════════════════════════════════════════════
// Cold Start: Blob → Memoria
// ═══════════════════════════════════════════════
export async function ensureDataReady(): Promise<void> {
  if (!IS_VERCEL || _ready) return;
  if (_initPromise) return _initPromise;

  _initPromise = loadFromBlob()
    .then(() => { _ready = true; })
    .catch((err) => {
      // CRÍTICO: resetear para permitir reintentos
      _initPromise = null;
      _ready = false;
      throw err;
    });

  return _initPromise;
}

async function loadFromBlob(): Promise<void> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  const { blobs } = await list({ prefix: 'data/', token });
  const blobPathnames = new Set(blobs.map((b) => b.pathname));

  if (blobPathnames.size === 0) {
    console.warn('Blob is EMPTY — loading seed data as readonly');
    for (const file of DATA_FILES) {
      const srcPath = path.join(SOURCE_DATA_DIR, file);
      if (fs.existsSync(srcPath)) {
        _cache.set(file, fs.readFileSync(srcPath, 'utf-8'));
      }
    }
    return;
  }

  // ⚠️ USAR get() DEL SDK — NO fetch(url)
  // fetch(url) FALLA SILENCIOSAMENTE con blobs privados
  await Promise.all(
    DATA_FILES.map(async (file) => {
      const blobKey = `data/${file}`;
      if (blobPathnames.has(blobKey)) {
        const result = await get(blobKey, { token, access: 'private' });
        if (result && result.statusCode === 200) {
          const text = await new Response(result.stream).text();
          _cache.set(file, text);
          return;
        }
        throw new Error(`Cannot read ${file} from Blob`);
      }
      // Archivo no existe en Blob — usar seed como fallback
      const srcPath = path.join(SOURCE_DATA_DIR, file);
      if (fs.existsSync(srcPath)) {
        _cache.set(file, fs.readFileSync(srcPath, 'utf-8'));
      }
    })
  );
}

// ═══════════════════════════════════════════════
// Escritura: Blob PRIMERO → Caché
// ═══════════════════════════════════════════════
export async function writeToBlob(
  filename: string,
  content: string
): Promise<void> {
  if (!IS_VERCEL) return;

  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  // 1. Blob primero (si falla, la operación falla)
  await put(`data/${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,  // queremos rutas predecibles
    allowOverwrite: true,     // permitir sobrescribir
    token,
  });

  // 2. Actualizar caché
  _cache.set(filename, content);
}

// ═══════════════════════════════════════════════
// Seed: data/ del repo → Blob (una sola vez)
// ═══════════════════════════════════════════════
export async function seedAllToBlob(): Promise<Record<string, string>> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  const results: Record<string, string> = {};

  for (const file of DATA_FILES) {
    const srcPath = path.join(SOURCE_DATA_DIR, file);
    if (!fs.existsSync(srcPath)) {
      results[file] = 'NOT FOUND';
      continue;
    }
    const content = fs.readFileSync(srcPath, 'utf-8');
    await put(`data/${file}`, content, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    _cache.set(file, content);
    results[file] = 'SEEDED';
  }

  _ready = true;
  return results;
}
```

### 3.2 Capa de Datos (`lib/dataService.ts`)

```typescript
import fs from 'fs';
import path from 'path';
import { writeToBlob, readFromCache, isCacheReady } from './blobSync';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), 'data');

export function readJsonFile<T>(filename: string): T {
  if (IS_VERCEL) {
    if (!isCacheReady()) {
      throw new Error(`Cache not ready for ${filename}. Call ensureDataReady() first.`);
    }
    return JSON.parse(readFromCache(filename)) as T;
  }
  // Local: filesystem directo
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
```

### 3.3 Middleware de Auth/Data (`lib/withAuth.ts`)

Cada API route debe llamar `ensureDataReady()` antes de leer datos. El patrón recomendado es un wrapper:

```typescript
import { ensureDataReady } from './blobSync';

export async function withAuth(
  request: Request,
  handler: (user: User) => Promise<NextResponse>,
  requiredRole?: string
): Promise<NextResponse> {
  // 0. SIEMPRE primero — asegurar caché poblada
  await ensureDataReady();

  // 1. Validar sesión...
  // 2. Verificar rol...
  // 3. Ejecutar handler
  return handler(user);
}
```

### 3.4 API Route de Seed (`app/api/admin/seed/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { seedAllToBlob } from '@/lib/blobSync';

export async function POST(): Promise<NextResponse> {
  // Proteger con auth de admin en producción
  const results = await seedAllToBlob();
  return NextResponse.json({ results });
}
```

---

## 4. Errores Comunes y Soluciones

### ❌ Error: "BLOB token is undefined"

**Causa:** El token se evalúa a nivel de módulo cuando el archivo se importa durante `next build`.

**Solución:** NUNCA hacer `const token = process.env.BLOB_TOKEN` a nivel global. Usar función lazy:
```typescript
// ❌ MAL — se evalúa en build time (undefined)
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// ✅ BIEN — se evalúa en runtime
function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}
```

### ❌ Error: "Los datos se pierden cada 2 minutos"

**Causa:** Estás usando `fetch(blob.url)` para descargar blobs **privados**. Falla silenciosamente (401) y tu fallback carga los datos del seed.

**Solución:** Usar `get()` del SDK con `access: 'private'`:
```typescript
// ❌ MAL — falla silenciosamente con blobs privados
const res = await fetch(blob.url);

// ✅ BIEN — maneja autenticación automáticamente
import { get } from '@vercel/blob';
const result = await get('data/users.json', { token, access: 'private' });
const text = await new Response(result.stream).text();
```

### ❌ Error: "blob already exists"

**Causa:** Vercel Blob no permite sobrescribir por defecto.

**Solución:** Agregar `allowOverwrite: true` en las opciones de `put()`:
```typescript
await put('data/users.json', content, {
  access: 'private',
  addRandomSuffix: false,
  allowOverwrite: true,  // ← necesario para actualizar datos
  token,
});
```

### ❌ Error: "Build fails trying to read data"

**Causa:** Tus `page.tsx` importan `dataService` directamente. Durante `next build` no hay Blob ni caché.

**Solución:** Las páginas deben ser `'use client'` y hacer `fetch('/api/...')` en un `useEffect`. Nunca importar servicios de datos en un page o component.

```typescript
// ❌ MAL — page.tsx importando dataService
import { readUsers } from '@/lib/dataService';
export default function Page() {
  const users = readUsers(); // 💥 falla en build
}

// ✅ BIEN — client component que fetchea
'use client';
export default function Page() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users));
  }, []);
}
```

### ❌ Error: "ensureDataReady queda colgado"

**Causa:** Si `loadFromBlob()` falla, la promesa queda rechazada pero `_initPromise` nunca se resetea. Todas las siguientes llamadas retornan la misma promesa rechazada.

**Solución:** Resetear en el catch:
```typescript
_initPromise = loadFromBlob()
  .then(() => { _ready = true; })
  .catch((err) => {
    _initPromise = null;  // ← permite reintentos
    _ready = false;
    throw err;
  });
```

---

## 5. Checklist de Despliegue

- [ ] `npm install @vercel/blob`
- [ ] Crear Blob Store en Vercel dashboard (Private)
- [ ] Agregar `BLOB_READ_WRITE_TOKEN` en env vars de Vercel
- [ ] Token accedido vía función lazy, no constante global
- [ ] `data/` con JSONs de semilla en el repo
- [ ] API route de seed protegida (`/api/admin/seed`)
- [ ] Todas las lecturas usan `get()` del SDK con `access: 'private'`
- [ ] Todas las escrituras usan `put()` con `allowOverwrite: true`
- [ ] Ningún `page.tsx` ni componente importa `dataService` ni `blobSync`
- [ ] Todas las páginas leen datos vía `fetch('/api/...')`
- [ ] `ensureDataReady()` se llama en cada API route (vía middleware/wrapper)
- [ ] Deploy → visitar `/admin/seed` → datos persistentes

---

## 6. Flujo de Vida del Dato

```
1. SEED (una vez):
   Admin visita /admin/seed
   → lee data/*.json del repo
   → put() a Blob con prefix data/
   → actualiza caché en memoria

2. COLD START (cada ~2 min):
   API route recibe request
   → withAuth() llama ensureDataReady()
   → list() enumera blobs con prefix data/
   → get() descarga cada blob (autenticado)
   → puebla Map en memoria
   → request procede

3. LECTURA:
   API route llama readJsonFile('users.json')
   → lee de Map en memoria (< 1ms)
   → retorna JSON parseado

4. ESCRITURA:
   API route llama writeJsonFile('users.json', data)
   → put() a Blob (fuente de verdad)
   → actualiza Map en memoria
   → próximo cold start lee de Blob (dato persiste)
```

---

## 7. Resumen en Una Línea

> **Blob es tu disco duro. La memoria es tu caché. El SDK es tu driver. `data/` es tu backup inicial.**

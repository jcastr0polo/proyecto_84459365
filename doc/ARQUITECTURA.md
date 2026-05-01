# Arquitectura del Proyecto

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Lenguaje | TypeScript | 5.x |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS | 4.x |
| Animaciones | Framer Motion | 12.x |
| Validación | Zod | 4.x |
| Autenticación | JWT (jose) + bcryptjs | — |
| Iconos | Lucide React | — |
| Deploy | Vercel | — |

## Estructura de Carpetas

```
app/                    ← Rutas (App Router de Next.js)
  layout.tsx            ← Layout raíz (fuentes, tema, providers)
  page.tsx              ← Landing pública
  login/                ← Autenticación
  admin/                ← Panel del docente (protegido)
    courses/            ← CRUD de cursos, actividades, quizzes, notas
    semesters/          ← Gestión de semestres
    students/           ← Gestión de estudiantes
  student/              ← Panel del estudiante (protegido)
    courses/            ← Ver cursos, actividades, entregas, notas
  api/                  ← API Routes (backend serverless)
    auth/               ← Login, logout, sesión
    courses/            ← Cursos, actividades, cortes, quizzes
    grades/             ← Calificaciones
    submissions/        ← Entregas de estudiantes
    upload/             ← Subida y descarga de archivos
    ...

components/             ← Componentes React reutilizables
  ui/                   ← Primitivos: Button, Modal, Table, Toast, Badge...
  activities/           ← Componentes de actividades
  grades/               ← Componentes de calificaciones
  submissions/          ← Componentes de entregas
  ...

lib/                    ← Lógica de negocio y utilidades
  types.ts              ← Todas las interfaces TypeScript
  schemas.ts            ← Esquemas Zod (validación de datos)
  dataService.ts        ← Capa de acceso a datos (lectura/escritura)
  auth.ts               ← Funciones de autenticación (JWT)
  withAuth.ts           ← Middleware de protección de rutas API
  gradeService.ts       ← Lógica de cálculo de notas
  validators.ts         ← Validaciones adicionales
  ...

data/                   ← Archivos JSON (datos iniciales / desarrollo local)
public/                 ← Assets estáticos
doc/                    ← Documentación
```

## Patrón de Arquitectura

### Frontend → API → Data

```
[Componente React]  →  fetch('/api/...')  →  [Route Handler]  →  [dataService]  →  [Persistencia]
    (client)              (HTTP)              (server)            (server)          (JSON/Blob/DB)
```

El frontend **nunca** accede a datos directamente. Siempre pasa por una API Route de Next.js que valida autenticación, permisos y datos antes de leer o escribir.

### Server Components vs Client Components

- **Server Components** (por defecto): renderizan en el servidor, no envían JS al cliente.
- **Client Components** (`'use client'`): necesarios cuando se usa estado (`useState`), efectos (`useEffect`), eventos (`onClick`), o hooks del navegador.
- Las páginas interactivas (formularios, tablas con filtros) son Client Components.
- Los layouts y páginas estáticas pueden ser Server Components.

### API Routes (Route Handlers)

Cada endpoint vive en `app/api/.../route.ts` y exporta funciones HTTP:

```typescript
// app/api/courses/route.ts
export async function GET(request: Request) { ... }   // Listar
export async function POST(request: Request) { ... }  // Crear
```

```typescript
// app/api/courses/[id]/route.ts
export async function GET(request, { params }) { ... }    // Obtener uno
export async function PUT(request, { params }) { ... }    // Actualizar
export async function DELETE(request, { params }) { ... } // Eliminar
```

### Autenticación

- Login genera un **JWT** firmado con `jose`, almacenado en una cookie `HttpOnly`.
- `withAuth(request, handler)` protege cualquier API Route: verifica el JWT, inyecta el usuario, rechaza si no es válido.
- Roles: `admin` (docente) y `student`. Las rutas validan el rol dentro del handler.

### Validación de Datos

Toda entrada del usuario se valida con **Zod** antes de procesarse:

```typescript
const result = createActivitySchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.issues }, { status: 400 });
}
// result.data está tipado y validado
```

Los esquemas viven en `lib/schemas.ts` y las interfaces TypeScript en `lib/types.ts`.

### Capa de Datos

`lib/dataService.ts` abstrae **dónde** se guardan los datos. Expone funciones como:

```typescript
await readActivitiesFresh()         // → Activity[]
await writeActivities(activities)   // → void
await readUsersFresh()              // → User[]
```

Esta abstracción permite cambiar la persistencia sin modificar las API Routes ni los componentes. Lo importante es que las API Routes llamen funciones de servicio, no que sepan cómo se almacenan los datos.

**En desarrollo local**: lee/escribe archivos JSON en `data/`.
**En producción**: se conecta a un servicio de persistencia en la nube.

## Opciones de Persistencia

### Vercel Blob (Almacenamiento de archivos JSON)

Vercel Blob es un almacenamiento de objetos. Se usa para guardar archivos JSON como si fueran tablas.

```typescript
import { put, get } from '@vercel/blob';

// Leer
const result = await get('data/users.json', { token, access: 'private' });
const text = await new Response(result.stream).text();
const users = JSON.parse(text);

// Escribir
await put('data/users.json', JSON.stringify(users), {
  access: 'private',
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});
```

**Ventajas**: sin configuración de base de datos, lectura/escritura directa de JSON, incluido en el free tier de Vercel.
**Limitaciones**: no tiene queries SQL, no tiene índices, toda la "tabla" se lee completa y se filtra en código.
**Paquete**: `@vercel/blob`

### Supabase (Base de datos PostgreSQL)

Supabase provee una base de datos PostgreSQL real con API REST automática y cliente tipado.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Leer
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'student');

// Escribir
const { data, error } = await supabase
  .from('users')
  .insert({ firstName: 'Juan', lastName: 'Pérez', role: 'student' });

// Actualizar
const { error } = await supabase
  .from('users')
  .update({ email: 'nuevo@email.com' })
  .eq('id', userId);
```

**Ventajas**: SQL real, queries con filtros/joins/agregaciones, Row Level Security, real-time subscriptions, dashboard visual.
**Limitaciones**: requiere definir tablas (schema), más setup inicial.
**Paquete**: `@supabase/supabase-js`

### ¿Cuál usar?

| Criterio | Vercel Blob | Supabase |
| -------- | ----------- | -------- |
| Setup | Mínimo (un token) | Crear proyecto + tablas |
| Modelo de datos | JSON libre | Tablas SQL con schema |
| Queries complejas | Manual (filtrar en JS) | SQL nativo |
| Relaciones | Manual | Foreign keys, joins |
| Escalabilidad | Limitada | Alta |
| Free tier | Sí | Sí |

Ambas se integran con Vercel sin problema. La clave es que la **capa de servicio** (`dataService.ts`) encapsule el acceso — así el resto de la app no sabe ni le importa cuál se usa.

## Convenciones

### TypeScript Estricto
- Cero `any`. Todas las interfaces tipadas en `lib/types.ts`.
- `tsc --noEmit` debe pasar limpio antes de cada deploy.

### Nomenclatura
- Archivos de componentes: `PascalCase.tsx` (ej: `GradeCard.tsx`)
- Archivos de utilidad: `camelCase.ts` (ej: `dataService.ts`)
- API Routes: `route.ts` dentro de la carpeta que define la ruta
- Interfaces: `PascalCase` (ej: `Activity`, `Submission`)

### Estilos
- Tailwind CSS utility-first. Sin archivos CSS por componente.
- Variables CSS para temas (dark/light) en `globals.css`.
- Diseño responsive: mobile-first con breakpoints `sm:`, `md:`, `lg:`.

### Componentes UI

Existe una librería de componentes base en `components/ui/`:

| Componente | Uso |
|-----------|-----|
| `Button` | Botones con variantes (primary, secondary, ghost, danger) |
| `Modal` | Diálogos modales |
| `Table` | Tablas con Thead, Tbody, Tr, Th, Td |
| `Card` | Contenedores con borde y padding |
| `Badge` | Etiquetas de estado |
| `Toast` | Notificaciones temporales |
| `SearchInput` | Campo de búsqueda |
| `Pagination` | Paginación de listas |
| `EmptyState` | Estado vacío con icono y mensaje |
| `FileUploadZone` | Zona de arrastrar y soltar archivos |

### Sistema de Calificaciones (ejemplo de lógica de negocio)

- La lógica de cálculo de notas vive en `lib/gradeService.ts`, separada de las rutas API.
- Las API Routes orquestan: autenticar → validar → llamar servicio → responder.
- Los servicios leen datos, aplican reglas, retornan resultados tipados.
- Este patrón aplica para cualquier dominio: separar lógica del transporte HTTP.

### Zona Horaria

Todas las fechas usan **America/Bogota** (UTC-5). Las funciones de formato están en `lib/dateUtils.ts`.

## Flujo de Desarrollo

```bash
npm run dev          # Servidor de desarrollo (Turbopack)
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
npm run build        # Build de producción
```

El deploy a producción es automático: cada `git push` a `main` dispara un build en Vercel.

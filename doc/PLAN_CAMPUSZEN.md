# CampusZen — Plan Maestro del Sistema
> Versión 3.0 | Proyecto Fullstack Individual | Mayo 2026
> Stack: Next.js + TypeScript + Supabase Postgres + Vercel Blob + Vercel
> Estudiante: Lianna Mora | Doc: 1082928103

---

## Índice General

1. [Definición del sistema](#1-definición-del-sistema)
2. [Objetivo principal](#2-objetivo-principal)
3. [Necesidades que cubre](#3-necesidades-que-cubre)
4. [Roles y comportamiento](#4-roles-y-comportamiento)
5. [Casos de uso](#5-casos-de-uso)
6. [Requerimientos funcionales](#6-requerimientos-funcionales)
7. [Reglas de negocio](#7-reglas-de-negocio)
8. [Stack tecnológico](#8-stack-tecnológico)
9. [Arquitectura de persistencia (Supabase + Blob + Seed)](#9-arquitectura-de-persistencia)
10. [Bootstrap y migrations](#10-bootstrap-y-migrations)
11. [Capa de datos unificada (`dataService`)](#11-capa-de-datos-unificada)
12. [Modelo de datos — Supabase Postgres](#12-modelo-de-datos--supabase-postgres)
13. [Auditoría y archivos en Vercel Blob](#13-auditoría-y-archivos-en-vercel-blob)
14. [Arquitectura de rutas](#14-arquitectura-de-rutas)
15. [Requerimientos no funcionales](#15-requerimientos-no-funcionales)
16. [Flujos de usuario](#16-flujos-de-usuario)
17. [Diseño de interfaz](#17-diseño-de-interfaz)
18. [Plan de fases de implementación](#18-plan-de-fases-de-implementación)
19. [Estrategia de seguridad](#19-estrategia-de-seguridad)
20. [Restricciones del sistema](#20-restricciones-del-sistema)
21. [Glosario](#21-glosario)

---

## 1. Definición del sistema

**CampusZen** es una aplicación web diseñada para ayudar a cualquier estudiante universitario a gestionar su vida académica y financiera desde un solo lugar. Integra tres pilares fundamentales: la organización de tareas por materia, el control detallado de gastos universitarios y un panel de resumen que ofrece una visión clara del estado académico y económico del estudiante en tiempo real.

El sistema opera completamente desde el navegador, sin necesidad de instalaciones, y persiste los datos del usuario en una base de datos Postgres gestionada por Supabase. La auditoría de cambios y los archivos binarios (cuando aplique) se almacenan en Vercel Blob para mantener Postgres dedicado solo a datos estructurados consultables con SQL.

CampusZen está pensado no como una herramienta puntual, sino como un acompañante permanente del estudiante a lo largo de toda su carrera universitaria.

---

## 2. Objetivo principal

Centralizar en una sola página web todas las herramientas que un estudiante universitario necesita para mantenerse organizado académica y financieramente, reduciendo el estrés, el olvido de entregas y el descontrol del dinero, con una interfaz simple, accesible desde cualquier dispositivo y disponible en todo momento.

### Objetivos específicos

| ID | Objetivo |
|---|---|
| OE-01 | Permitir al estudiante registrar, editar y hacer seguimiento de sus tareas académicas ordenadas por urgencia. |
| OE-02 | Ofrecer un control de gastos universitarios detallado por categoría y medio de pago. |
| OE-03 | Generar reportes exportables en PDF y Excel para que el estudiante lleve un historial de sus finanzas. |
| OE-04 | Mostrar un dashboard diario que resuma lo más importante sin que el estudiante tenga que buscarlo. |
| OE-05 | Enviar alertas automáticas cuando una tarea esté próxima a vencer (menos de 48 horas). |
| OE-06 | Ser accesible desde cualquier navegador moderno sin costo ni instalación. |

---

## 3. Necesidades que cubre

| Necesidad | Problema real | Cómo lo resuelve CampusZen |
|---|---|---|
| **Organización de tareas** | El estudiante olvida entregas o no sabe cuáles son más urgentes. | Centraliza todas las tareas por materia y las ordena automáticamente por fecha límite. |
| **Control de gastos** | El estudiante no sabe en qué gasta su dinero durante el semestre. | Registra cada gasto con categoría, monto y medio de pago, con resúmenes visuales. |
| **Visión general del día** | Al iniciar el día el estudiante no sabe qué tiene pendiente ni cuánto lleva gastado. | Muestra un dashboard automático al abrir la página con la información más relevante. |
| **Alertas de vencimiento** | El estudiante se entera tarde de que una tarea vence al día siguiente. | Genera alertas visuales cuando una tarea vence en menos de 48 horas. |
| **Persistencia de datos** | La información se pierde al cerrar la página o cambiar de dispositivo. | Guarda los datos en Supabase Postgres, accesibles desde cualquier dispositivo. |
| **Reportes financieros** | El estudiante no puede compartir ni guardar su historial de gastos. | Permite exportar reportes de gastos en PDF y Excel con un clic. |
| **Accesibilidad** | No todos los estudiantes tienen acceso a apps de pago. | Funciona desde cualquier navegador moderno, sin instalaciones ni costos. |
| **Seguimiento académico** | El estudiante no sabe cuántas tareas completó en la semana. | Muestra un resumen semanal de productividad académica y gasto. |

---

## 4. Roles y comportamiento

### 4.1 Estudiante (rol principal)

Es el rol por defecto. Cualquier persona que se registre obtiene este rol.

| Capacidad | Descripción |
|---|---|
| Gestión de tareas | Crea, edita, completa y elimina sus propias tareas. |
| Gestión de gastos | Registra, edita y elimina sus propios gastos. |
| Gestión de materias | Agrega y edita las materias que cursa actualmente. |
| Ver dashboard | Accede a su panel personal con resumen de tareas y gastos. |
| Exportar reportes | Descarga sus gastos en PDF o Excel. |
| Ver alertas | Recibe notificaciones visuales de tareas próximas a vencer. |
| Configurar perfil | Cambia nombre, correo, contraseña, tema y preferencias. |

**Comportamiento del sistema:**
- Al iniciar sesión, el sistema redirige directamente al dashboard.
- Solo puede ver y modificar sus propios datos.
- Si lleva más de 7 días sin ingresar, el dashboard muestra un resumen de lo pendiente al volver.

---

### 4.2 Administrador (rol técnico)

| Capacidad | Descripción |
|---|---|
| Bootstrap del sistema | Acceso exclusivo a `/admin/db-setup` para inicializar Supabase y aplicar migrations. |
| Gestión de usuarios | Ve, suspende o elimina cuentas. |
| Ver auditoría | Consulta el historial de cambios persistido en Vercel Blob. |
| Gestión del sistema | Configuración general y mantenimiento. |

**Comportamiento esperado:**
- No puede ver el contenido específico (tareas, gastos) de ningún usuario.
- Sus acciones quedan registradas en la auditoría de Vercel Blob.

---

### 4.3 Sistema (actor automático)

| Acción automática | Cuándo ocurre |
|---|---|
| Persistir datos | En cada operación CRUD del usuario (Supabase Postgres). |
| Registrar auditoría | En cada operación de escritura (Vercel Blob, particionada por mes). |
| Generar alertas de vencimiento | Calculado al cargar el dashboard: tareas con `due_date < NOW() + 48h`. |
| Calcular resumen semanal | Al entrar a la sección, con query SQL sobre los últimos 7 días. |
| Ordenar tareas por urgencia | En la query de listado (`ORDER BY due_date ASC`). |

---

## 5. Casos de uso

### Módulo 1 — Bootstrap (admin)

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-B1 | Diagnosticar estado del sistema | Admin | Verifica conectividad con Supabase y con Blob, lista migrations aplicadas y pendientes, y muestra conteos por tabla. |
| CU-B2 | Aplicar migrations | Admin | Ejecuta las migrations pendientes de `supabase/migrations/` contra la base de datos remota. |
| CU-B3 | Cargar seed inicial | Admin | Inserta los datos iniciales de `data/seed.json` (admin por defecto) en Supabase. |

### Módulo 2 — Autenticación

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-01 | Registrarse | Estudiante | El usuario crea una cuenta con nombre, correo y contraseña. |
| CU-02 | Iniciar sesión | Todos | El usuario ingresa correo y contraseña. |
| CU-03 | Cerrar sesión | Todos | El usuario cierra su sesión activa. |
| CU-04 | Cambiar contraseña | Todos | El usuario actualiza su contraseña verificando la actual. |

### Módulo 3 — Tareas

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-05 | Agregar tarea | Estudiante | Registra una tarea con materia, descripción, fecha límite y prioridad. |
| CU-06 | Editar tarea | Estudiante | Modifica cualquier campo de una tarea no completada. |
| CU-07 | Ver tareas pendientes | Estudiante | El sistema muestra todas las tareas no completadas, ordenadas por fecha límite. |
| CU-08 | Filtrar tareas por materia | Estudiante | Selecciona una materia para ver solo sus tareas. |
| CU-09 | Marcar tarea como completada | Estudiante | El sistema registra `completed_at`. |
| CU-10 | Eliminar tarea | Estudiante | Borra una tarea con confirmación previa. |
| CU-11 | Recibir alerta de vencimiento | Sistema | Alerta visual para tareas con menos de 48 horas. |

### Módulo 4 — Gastos

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-12 | Registrar gasto | Estudiante | Ingresa nombre, monto, categoría, medio de pago y fecha. |
| CU-13 | Editar gasto | Estudiante | Modifica los datos de un gasto registrado. |
| CU-14 | Eliminar gasto | Estudiante | Elimina con confirmación. |
| CU-15 | Ver gastos por categoría | Estudiante | Total por categoría con gráfica visual. |
| CU-16 | Ver gastos por medio de pago | Estudiante | Totales separados de efectivo y tarjeta. |
| CU-17 | Ver total del mes | Estudiante | Total del mes en curso. |
| CU-18 | Establecer presupuesto mensual | Estudiante | Define monto máximo. Alertas al 80% y 100%. |
| CU-19 | Exportar gastos en PDF | Estudiante | Descarga reporte PDF generado en el servidor. |
| CU-20 | Exportar gastos en Excel | Estudiante | Descarga reporte `.xlsx`. |

### Módulo 5 — Dashboard

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-21 | Ver dashboard principal | Estudiante | Tareas pendientes, alertas, total del mes, progreso del presupuesto. |
| CU-22 | Ver resumen semanal | Estudiante | Resumen de los últimos 7 días. |
| CU-23 | Ver gráfica de gastos | Estudiante | Distribución de gastos por categoría del mes actual. |

### Módulo 6 — Perfil

| ID | Caso de uso | Actor | Descripción |
|---|---|---|---|
| CU-24 | Editar perfil | Estudiante | Actualiza nombre, correo o contraseña. |
| CU-25 | Configurar notificaciones | Estudiante | Activa o desactiva alertas de vencimiento. |
| CU-26 | Gestionar materias | Estudiante | Agrega, edita o desactiva materias. |
| CU-27 | Cambiar tema | Estudiante | Alterna entre modo claro y oscuro. |

---

## 6. Requerimientos funcionales

### Bootstrap del sistema

| ID | Requerimiento |
|---|---|
| RF-B1 | El sistema debe poder ejecutarse sin Supabase configurado, sirviendo los datos del seed local de `data/` para navegación inicial. |
| RF-B2 | El sistema debe ofrecer una página `/admin/db-setup` accesible solo al admin para diagnóstico, aplicación de migrations y carga del seed inicial. |
| RF-B3 | Las migrations deben estar versionadas en `supabase/migrations/` y aplicarse en orden numérico. |
| RF-B4 | Una vez aplicadas las migrations y cargado el seed, el sistema debe persistir todas las operaciones en Supabase. |

### Autenticación

| ID | Requerimiento |
|---|---|
| RF-01 | El sistema debe permitir el registro de nuevos usuarios con nombre, correo y contraseña. |
| RF-02 | El sistema debe validar que el correo tenga formato válido. |
| RF-03 | El sistema debe impedir el registro con un correo ya existente. |
| RF-04 | El sistema debe permitir el inicio de sesión con correo y contraseña. |
| RF-05 | El sistema debe mantener la sesión mediante cookie HttpOnly hasta cierre o expiración (24h). |
| RF-06 | El sistema debe proteger las rutas privadas. |

### Tareas

| ID | Requerimiento |
|---|---|
| RF-07 | El sistema debe permitir crear tareas con: materia, descripción, fecha límite y prioridad. |
| RF-08 | El sistema debe ordenar automáticamente las tareas por fecha límite. |
| RF-09 | El sistema debe permitir filtrar tareas por materia. |
| RF-10 | El sistema debe permitir marcar una tarea como completada, registrando `completed_at`. |
| RF-11 | El sistema debe mostrar alerta visual en tareas con menos de 48 horas. |
| RF-12 | El sistema debe solicitar confirmación antes de eliminar. |
| RF-13 | El sistema debe permitir editar todos los campos de una tarea no completada. |

### Gastos

| ID | Requerimiento |
|---|---|
| RF-14 | El sistema debe permitir registrar gastos con: nombre, monto, categoría, medio de pago y fecha. |
| RF-15 | El sistema debe mostrar el total de gastos del mes en curso. |
| RF-16 | El sistema debe agrupar gastos por categoría con sus totales. |
| RF-17 | El sistema debe mostrar por separado los totales en efectivo y en tarjeta. |
| RF-18 | El sistema debe permitir establecer un presupuesto mensual. |
| RF-19 | El sistema debe alertar al superar 80% y 100% del presupuesto. |
| RF-20 | El sistema debe permitir exportar gastos en PDF (servidor). |
| RF-21 | El sistema debe permitir exportar gastos en Excel (.xlsx). |
| RF-22 | El sistema debe solicitar confirmación antes de eliminar un gasto. |

### Dashboard

| ID | Requerimiento |
|---|---|
| RF-23 | El sistema debe mostrar el dashboard automáticamente al iniciar sesión. |
| RF-24 | El dashboard debe mostrar tareas pendientes, próxima tarea, total del mes y progreso del presupuesto. |
| RF-25 | El sistema debe mostrar gráfica de distribución por categoría. |
| RF-26 | El sistema debe mostrar resumen de los últimos 7 días. |

### Auditoría

| ID | Requerimiento |
|---|---|
| RF-A1 | Toda operación de escritura sobre datos del usuario (crear/editar/eliminar tareas, gastos, materias) debe quedar registrada en auditoría. |
| RF-A2 | La auditoría se persiste en Vercel Blob, particionada por mes (`audit/<YYYYMM>.json`). |
| RF-A3 | El admin puede consultar la auditoría desde `/admin/audit` con filtros por mes y usuario. |

---

## 7. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | El monto de un gasto debe ser mayor a cero. CHECK en Postgres + validación Zod. |
| RN-02 | Toda tarea debe tener materia, descripción y fecha límite. |
| RN-03 | La fecha límite debe ser igual o posterior a la fecha actual. |
| RN-04 | Las categorías de gasto son fijas: `Fotocopias`, `Transporte`, `Comida`, `Materiales`, `Otro`. |
| RN-05 | Una tarea completada no puede volver a pendiente. Es irreversible. |
| RN-06 | Los datos se persisten inmediatamente tras cada operación. |
| RN-07 | Si el usuario no tiene datos, el dashboard muestra mensaje de bienvenida con guía. |
| RN-08 | El resumen semanal toma los últimos 7 días desde la fecha actual. |
| RN-09 | Todo gasto debe especificar medio de pago: `Efectivo` o `Tarjeta`. |
| RN-10 | Los totales de efectivo y tarjeta se muestran siempre por separado. |
| RN-11 | Cada usuario solo ve y modifica sus propios datos. |
| RN-12 | El presupuesto mensual es opcional. Sin presupuesto, no hay alertas de límite. |
| RN-13 | Los reportes exportados incluyen solo los gastos del usuario autenticado. |
| RN-14 | Una tarea pertenece a una sola materia. |
| RN-15 | Anti-duplicado: mismo nombre, monto, categoría y fecha en menos de 1 minuto se rechaza. |
| RN-16 | El sistema arranca en modo seed (lectura desde `data/`) hasta que el admin ejecute el bootstrap. |

---

## 8. Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.x | Rutas, server components, API routes |
| Lenguaje | TypeScript | 5.x | Tipado estático |
| UI | React | 19.x | Componentes del cliente |
| Estilos | Tailwind CSS | 4.x | Utilidades, responsive, tema |
| Animaciones | Framer Motion | 12.x | Transiciones |
| Validación | Zod | 4.x | Validación de formularios y API |
| Autenticación | JWT (jose) + bcryptjs | — | Sesiones HttpOnly |
| Base de datos | Supabase Postgres | — | Datos estructurados |
| Cliente DB (migrations) | `pg` (node-postgres) | 8.x | Ejecutar SQL crudo desde la API route de bootstrap |
| Cliente DB (queries) | `@supabase/supabase-js` | 2.x | Queries del día a día desde el dataService |
| Auditoría y archivos | `@vercel/blob` | — | Logs de auditoría y archivos binarios |
| Gráficas | Recharts | 2.x | Gráfica de gastos por categoría |
| Export PDF | jsPDF + jspdf-autotable | 2.x | Reportes generados en servidor |
| Export Excel | xlsx (SheetJS) | 0.20.x | Reportes en .xlsx |
| Iconos | Lucide React | — | Iconografía |
| Deploy | Vercel | — | Hosting serverless |

### Variables de entorno requeridas

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                  # Conexión Postgres directa (para migrations con pg)

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Auth
JWT_SECRET=                    # Mínimo 32 caracteres aleatorios

# Bootstrap
ADMIN_BOOTSTRAP_SECRET=        # Secreto para autorizar /api/system/bootstrap antes de tener sesión real
```

> Las variables `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET` y `ADMIN_BOOTSTRAP_SECRET` solo se usan en código del servidor. Nunca aparecen en componentes con `'use client'`.

---

## 9. Arquitectura de persistencia

CampusZen usa **tres destinos de persistencia** con responsabilidades claramente separadas. Esto permite optimizar cada caso de uso y mantenerse dentro de los límites del free tier.

### 9.1 Destinos de persistencia

| Destino | Qué guarda | Por qué |
|---|---|---|
| **Supabase Postgres** | Datos estructurados de dominio: usuarios, materias, tareas, gastos. | Necesita queries con JOIN, GROUP BY, agregaciones temporales. SQL aporta valor. |
| **Vercel Blob** | Auditoría completa (append-only, particionada por mes). Archivos binarios futuros (fotos de perfil, reportes persistidos opcionales). | Append-only, pesado, no requiere SQL. Blob es ideal para logs. |
| **`data/` en el repo** | Solo seed inicial: `config.json`, `seed.json` con admin por defecto. | Read-only en producción. Se usa para arrancar antes del bootstrap. |

### 9.2 Reglas de oro

1. **Postgres es la fuente de verdad para datos de dominio.** Si un dato de tarea/gasto/usuario no está en Postgres, no existe.
2. **Blob es la fuente de verdad para auditoría.** No se duplica en Postgres.
3. **`data/` es solo semilla.** Se lee una vez en el bootstrap inicial. Después no se lee nunca más en producción. Nunca se escribe en runtime.
4. **`dataService.ts` es el ÚNICO punto de acceso a datos** de cualquier capa superior (API Routes, services). Nadie importa `supabase.ts` o `blobAudit.ts` directamente — todo pasa por `dataService`.
5. **CERO caché en memoria** para datos transaccionales. Cada lectura va directo a Postgres o a Blob según corresponda.
6. **CERO CDN cache** en `/api/:path*`. Headers `no-store` desde `next.config.ts`.
7. **CERO browser cache** para respuestas con datos del usuario. `withAuth` agrega `no-store` a cada respuesta.
8. **`get()` del SDK de Blob, nunca `fetch(url)`** — los blobs privados fallan silenciosamente con `fetch`.
9. **Token de Blob accedido con función lazy**, nunca constante de módulo. Los tokens no existen en build time.
10. **Read-modify-write sobre el mismo archivo de auditoría** se serializa con `withFileLock()` para evitar race conditions.

---

## 10. Bootstrap y migrations

El sistema arranca con un `data/seed.json` que contiene un admin por defecto. La primera vez que el admin entra, ejecuta el bootstrap desde `/admin/db-setup` y a partir de ahí todo opera contra Supabase.

### 10.1 Estructura del directorio `data/` (solo semilla)

```
data/
  config.json           ← { "version": "1.0", "system_name": "CampusZen" }
  seed.json             ← Admin inicial: { "users": [{ email, password_hash, role: "admin", ... }] }
  README.md             ← Instrucciones para el estudiante
```

> **Importante:** El `password_hash` de `seed.json` se genera **en build time o manualmente con un script**, nunca en runtime. El hash de `admin123` con bcrypt 10 salt rounds queda hardcodeado en el seed.

### 10.2 Estructura de `supabase/migrations/`

```
supabase/
  migrations/
    0001_init_users.sql           ← Fase 1: tabla users
    0002_init_subjects.sql        ← Fase 3: tabla subjects
    0003_init_tasks.sql           ← Fase 4: tabla tasks
    0004_init_expenses.sql        ← Fase 6: tabla expenses
    0005_meta_migrations.sql      ← Tabla _migrations (registra qué se ha aplicado)
```

Cada migration es un archivo SQL idempotente cuando es razonable (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### 10.3 Tabla de control `_migrations`

Se crea en la primera migration y registra qué se ha aplicado:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL       PRIMARY KEY,
  filename    VARCHAR(255) UNIQUE NOT NULL,
  applied_at  TIMESTAMPTZ  DEFAULT NOW()
);
```

### 10.4 API Route de bootstrap

`POST /api/system/bootstrap` — autenticada con `ADMIN_BOOTSTRAP_SECRET` enviado en el body o como header. Hace:

1. Conecta a Postgres con `pg` y `DATABASE_URL`.
2. Crea la tabla `_migrations` si no existe.
3. Lista archivos de `supabase/migrations/`.
4. Para cada archivo no presente en `_migrations`, lo ejecuta y lo registra.
5. Si es la primera vez, carga el seed: lee `data/seed.json` e inserta el usuario admin (saltando si ya existe por email).
6. Retorna un reporte: migrations aplicadas, registros insertados, errores.

### 10.5 API Route de diagnóstico

`GET /api/system/diagnose` — autenticada con sesión admin. Retorna:

- ¿Hay conexión a Supabase? (ping a `SELECT 1`)
- ¿Hay conexión a Blob? (intentar `list()` con prefix vacío y limit 1)
- Migrations aplicadas vs pendientes (comparando `_migrations` con archivos del repo)
- Conteo de registros por tabla principal (`users`, `subjects`, `tasks`, `expenses`)
- Tamaño aproximado del último mes de auditoría en Blob

### 10.6 Página `/admin/db-setup`

UI con dos tabs:

**Tab 1 — Diagnóstico**: muestra estado de Supabase, Blob, migrations, conteos. Botón "Re-diagnosticar".

**Tab 2 — Bootstrap & Migrations**: lista las migrations pendientes (si las hay) y un botón "Ejecutar bootstrap" que llama al endpoint con confirmación previa.

> Esta página es accesible **solo cuando el usuario tiene `role='admin'` en la sesión**. Si el sistema está en modo seed (Supabase aún no inicializado), el admin del `data/seed.json` puede iniciar sesión y entrar a esta página — el `dataService` enruta el login al seed.

---

## 11. Capa de datos unificada

`lib/dataService.ts` es el **único punto de acceso a datos** desde el resto de la aplicación. Encapsula tres backends y decide cuál usar según el estado del sistema y el tipo de operación.

### 11.1 Modos de operación

| Modo | Cuándo aplica | Lecturas | Escrituras |
|---|---|---|---|
| **`seed`** | Sistema sin migrations aplicadas | `data/*.json` (read-only) | Bloqueadas — solo permite ver y hacer login con admin para ejecutar bootstrap. |
| **`live`** | Migrations aplicadas, Supabase listo | Postgres (vía `supabase-js`) | Postgres + auditoría a Blob |

El modo se determina al inicio de cada API request consultando un flag cacheado en memoria por instancia (refrescado vía `SELECT 1 FROM _migrations LIMIT 1`). Sí, esto es una excepción puntual a la regla de "cero caché", justificada porque el modo cambia exactamente una vez en la vida del sistema.

### 11.2 Estructura interna

```
lib/
  dataService.ts          ← ÚNICO punto de acceso. API pública tipada.
  supabase.ts             ← Cliente Supabase (server). Solo lo importa dataService.
  blobAudit.ts            ← Cliente Vercel Blob para auditoría. Solo lo importa dataService.
  pgMigrate.ts            ← Cliente pg para ejecutar migrations. Solo lo importa la API de bootstrap.
  seedReader.ts           ← Lector de data/*.json. Solo lo importa dataService en modo seed.
```

### 11.3 API pública del `dataService`

```typescript
// Auth y usuarios
export async function getUserByEmail(email: string): Promise<User | null>
export async function getUserById(id: string): Promise<User | null>
export async function createUser(data: CreateUserRequest): Promise<User>
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User>

// Materias
export async function getSubjectsByUser(userId: string): Promise<Subject[]>
export async function createSubject(userId: string, data: CreateSubjectRequest): Promise<Subject>
export async function updateSubject(id: string, userId: string, data: UpdateSubjectRequest): Promise<Subject>

// Tareas
export async function getTasks(userId: string, filters?: TaskFilters): Promise<TaskWithSubject[]>
export async function createTask(userId: string, data: CreateTaskRequest): Promise<Task>
export async function completeTask(id: string, userId: string): Promise<Task>
// ...

// Gastos
export async function getExpenses(userId: string, filters?: ExpenseFilters): Promise<Expense[]>
export async function getMonthlySummary(userId: string, year: number, month: number): Promise<ExpenseSummary>
// ...

// Auditoría (siempre va a Blob)
export async function recordAudit(entry: AuditEntry): Promise<void>
export async function readAuditMonth(yyyymm: string): Promise<AuditEntry[]>

// Sistema
export async function getSystemMode(): Promise<'seed' | 'live'>
```

### 11.4 Reglas para implementar `dataService`

1. **Cada función chequea `getSystemMode()` antes de leer/escribir.** En modo `seed` solo permite las operaciones mínimas para login admin y bootstrap.
2. **Cada operación de escritura llama a `recordAudit()` antes de retornar.** La auditoría falla en silencio (try/catch) — si Blob no responde, no debe romper la operación principal.
3. **Las queries usan el cliente de Supabase con `SUPABASE_SERVICE_ROLE_KEY`** y siempre filtran por `user_id` extraído del JWT.
4. **No hay caché en memoria de los resultados** — cada llamada va a Postgres.
5. **Batch reads con `Promise.all()`** cuando el endpoint necesite varios datasets (típico del dashboard).

### 11.5 Reglas para `next.config.ts`

```typescript
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
}
```

---

## 12. Modelo de datos — Supabase Postgres

### Diagrama de entidades

```
┌──────────┐
│  users   │──<┬─── subjects ──<── tasks
│          │   └─── expenses
└──────────┘
```

> No hay tabla `audit` en Postgres. La auditoría vive en Vercel Blob.

### Migration `0001_init_users.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  VARCHAR(100)  NOT NULL,
  email                 VARCHAR(255)  UNIQUE NOT NULL,
  password_hash         TEXT          NOT NULL,
  role                  VARCHAR(10)   DEFAULT 'student'
                        CHECK (role IN ('student', 'admin')),
  theme                 VARCHAR(10)   DEFAULT 'light'
                        CHECK (theme IN ('light', 'dark')),
  budget_monthly        DECIMAL(10,2),
  notifications_enabled BOOLEAN       DEFAULT true,
  is_active             BOOLEAN       DEFAULT true,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL       PRIMARY KEY,
  filename    VARCHAR(255) UNIQUE NOT NULL,
  applied_at  TIMESTAMPTZ  DEFAULT NOW()
);
```

### Migration `0002_init_subjects.sql`

```sql
CREATE TABLE IF NOT EXISTS subjects (
  id         UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID          REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100)  NOT NULL,
  color      VARCHAR(7)    DEFAULT '#40916C',
  is_active  BOOLEAN       DEFAULT true,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
```

### Migration `0003_init_tasks.sql`

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID          REFERENCES users(id) ON DELETE CASCADE,
  subject_id   UUID          REFERENCES subjects(id) ON DELETE SET NULL,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ   NOT NULL,
  priority     VARCHAR(10)   DEFAULT 'media'
               CHECK (priority IN ('alta', 'media', 'baja')),
  status       VARCHAR(15)   DEFAULT 'pendiente'
               CHECK (status IN ('pendiente', 'completada')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
```

### Migration `0004_init_expenses.sql`

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID          REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(200)  NOT NULL,
  amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category       VARCHAR(20)   NOT NULL
                 CHECK (category IN ('Fotocopias','Transporte','Comida','Materiales','Otro')),
  payment_method VARCHAR(10)   NOT NULL
                 CHECK (payment_method IN ('Efectivo','Tarjeta')),
  expense_date   DATE          NOT NULL,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_month ON expenses(user_id, DATE_TRUNC('month', expense_date));
```

### Notas sobre RLS

En esta versión del proyecto **no se activa RLS en Supabase**. La razón: las API Routes usan `SUPABASE_SERVICE_ROLE_KEY` (que bypasea RLS), así que la seguridad real está en el código del `dataService` que siempre filtra por `user_id` del JWT. Activar RLS sería una capa adicional de defensa pero requiere mapear el `auth.uid()` de Supabase con el `userId` propio del JWT, y el sistema de auth no es Supabase Auth — es JWT propio. Mantener RLS desactivado simplifica y el aislamiento queda 100% en el código del servidor.

---

## 13. Auditoría y archivos en Vercel Blob

### 13.1 Auditoría — particionada por mes

**Path:** `audit/<YYYYMM>.json`
**Formato:** array JSON append-only.

**Estructura de cada entrada:**

```typescript
type AuditEntry = {
  id: string;             // UUID generado en cliente del dataService
  timestamp: string;      // ISO 8601
  user_id: string;        // Quien hizo la acción
  user_email: string;     // Snapshot del email para legibilidad
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'register' | 'bootstrap' | 'admin';
  entity: 'user' | 'subject' | 'task' | 'expense' | 'system';
  entity_id?: string;     // ID del recurso afectado (no aplica para login/logout)
  changes?: Record<string, { from: unknown; to: unknown }>;  // Diff para updates
  metadata?: Record<string, unknown>;  // Info adicional (IP, user agent, etc.)
};
```

### 13.2 Lectura y escritura con write-lock

```typescript
// lib/blobAudit.ts (interno, solo lo usa dataService)

const _fileLocks = new Map<string, Promise<unknown>>();

async function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const prev = _fileLocks.get(filename) ?? Promise.resolve();
  let resolve!: () => void;
  const lock = new Promise<void>((r) => { resolve = r; });
  _fileLocks.set(filename, lock);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    if (_fileLocks.get(filename) === lock) _fileLocks.delete(filename);
  }
}

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN; // Lazy, NUNCA constante de módulo
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const yyyymm = entry.timestamp.slice(0, 7).replace('-', '');
  const filename = `audit/${yyyymm}.json`;

  await withFileLock(filename, async () => {
    const existing = await readAuditFile(filename);
    existing.push(entry);
    await writeAuditFile(filename, existing);
  });
}

async function readAuditFile(filename: string): Promise<AuditEntry[]> {
  const token = getBlobToken();
  if (!token) return [];
  try {
    // ⚠️ get() del SDK, NUNCA fetch(url) — los blobs privados fallan silenciosamente con fetch
    const result = await get(filename, { token, access: 'private' });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeAuditFile(filename: string, entries: AuditEntry[]): Promise<void> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  await put(filename, JSON.stringify(entries, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
}
```

### 13.3 Limitaciones documentadas del lock

`withFileLock` solo serializa escrituras dentro de la misma instancia serverless. Vercel puede crear múltiples instancias bajo carga, y dos escrituras en instancias distintas al mismo archivo de auditoría pueden producir una carrera. Para CampusZen (uso individual por usuario, baja concurrencia), el riesgo es prácticamente nulo. Documentado como tradeoff conocido.

### 13.4 Estimación de uso

- Una entrada de auditoría: ~400 bytes
- Usuario activo promedio: ~30 escrituras/mes → 12 KB/mes
- Sistema con 100 usuarios activos: ~1.2 MB/mes → ~14 MB/año
- Plan gratuito de Vercel Blob: 1 GB. Sin presión.

### 13.5 Archivos binarios (futuro)

En esta v1 no hay archivos binarios. Si en una versión futura se agregan (foto de perfil, persistencia de reportes), seguirán este patrón:

| Tipo | Path en Blob |
|---|---|
| Foto de perfil | `users/<userId>/avatar.<ext>` |
| Reporte persistido | `reports/<userId>/<YYYYMM>.<pdf\|xlsx>` |

Las tablas de Postgres guardarían solo el path, no el binario.

---

## 14. Arquitectura de rutas

### Estructura de carpetas

```
app/
  layout.tsx
  page.tsx                       ← Redirige según sesión
  login/page.tsx                 ← Primera cara del sistema
  register/page.tsx              ← Registro
  dashboard/page.tsx             ← Panel principal (protegido)
  tasks/page.tsx
  expenses/page.tsx
  profile/page.tsx
  admin/
    db-setup/page.tsx            ← Bootstrap y diagnóstico (solo admin)
    audit/page.tsx               ← Visualizador de auditoría (solo admin)
    users/page.tsx               ← Gestión de usuarios (solo admin)
  api/
    system/
      bootstrap/route.ts         ← POST: ejecuta migrations + seed
      diagnose/route.ts          ← GET: estado del sistema
      mode/route.ts              ← GET: { mode: 'seed' | 'live' }
    auth/
      login/route.ts
      logout/route.ts
      register/route.ts
      me/route.ts
      change-password/route.ts
    tasks/
      route.ts
      [id]/route.ts
    expenses/
      route.ts
      [id]/route.ts
      summary/route.ts
    subjects/
      route.ts
      [id]/route.ts
    export/
      pdf/route.ts
      xlsx/route.ts
    dashboard/route.ts
    users/
      route.ts
      [id]/route.ts
    audit/route.ts               ← GET: lee auditoría de Blob filtrada por mes/usuario

components/
  ui/
  layout/
  tasks/
  expenses/
  charts/
  admin/
    DiagnosticPanel.tsx          ← Para /admin/db-setup
    BootstrapPanel.tsx
    AuditViewer.tsx              ← Para /admin/audit

lib/
  types.ts
  schemas.ts
  auth.ts
  withAuth.ts
  withRole.ts                    ← Helper para validar rol
  dataService.ts                 ← ÚNICO punto de acceso a datos
  supabase.ts                    ← Solo importado por dataService
  blobAudit.ts                   ← Solo importado por dataService
  pgMigrate.ts                   ← Solo importado por /api/system/bootstrap
  seedReader.ts                  ← Solo importado por dataService en modo seed
  exportService.ts
  dateUtils.ts

supabase/
  migrations/
    0001_init_users.sql
    0002_init_subjects.sql
    0003_init_tasks.sql
    0004_init_expenses.sql

data/
  config.json
  seed.json
  README.md

doc/
  PLAN_CAMPUSZEN.md
  PROMPTS_CAMPUSZEN.md
  ESTADO_EJECUCION_CAMPUSZEN.md
```

### Patrón de acceso a datos

```
[Componente React (client)]
         ↓  fetch('/api/...')
[API Route]
         ↓  withAuth → valida JWT
         ↓  llama
[lib/dataService.ts]
         ├─→ Postgres (datos de dominio)  vía supabase.ts
         └─→ Vercel Blob (auditoría)       vía blobAudit.ts
```

> El frontend nunca importa `dataService`, ni `supabase`, ni `blobAudit`. Todo pasa por API Routes.
> Las API Routes nunca importan `supabase` ni `blobAudit` directamente. Todo pasa por `dataService`.

---

## 15. Requerimientos no funcionales

### Rendimiento

| ID | Requerimiento |
|---|---|
| RNF-01 | El dashboard debe cargar en menos de 3 segundos. |
| RNF-02 | Las operaciones CRUD deben completarse en menos de 2 segundos. |
| RNF-03 | La exportación de reportes no debe tardar más de 5 segundos. |
| RNF-04 | El bootstrap completo (migrations + seed) debe completarse en menos de 30 segundos. |

### Usabilidad

| ID | Requerimiento |
|---|---|
| RNF-05 | La interfaz debe ser usable sin instrucciones previas. |
| RNF-06 | Los mensajes de error deben describir el problema y orientar al usuario. |
| RNF-07 | El sistema debe mostrar indicadores de carga en operaciones >500ms. |
| RNF-08 | Todo formulario debe mantener los datos ingresados si la validación falla. |

### Seguridad

| ID | Requerimiento |
|---|---|
| RNF-09 | Las contraseñas deben hashearse con bcrypt antes de guardarse. |
| RNF-10 | Las sesiones deben gestionarse con JWT en cookie HttpOnly, nunca en localStorage. |
| RNF-11 | Todas las entradas del usuario deben validarse en el servidor con Zod. |
| RNF-12 | Las API Routes privadas deben protegerse con `withAuth`. |
| RNF-13 | El endpoint de bootstrap requiere autenticación con sesión admin **y** verificación de `ADMIN_BOOTSTRAP_SECRET`. |
| RNF-14 | Toda escritura debe registrarse en auditoría sin bloquear la respuesta principal. |

### Compatibilidad

| ID | Requerimiento |
|---|---|
| RNF-15 | El sistema debe funcionar en Chrome, Firefox, Safari y Edge actualizados. |
| RNF-16 | La interfaz debe ser funcional desde 320px de ancho. |

---

## 16. Flujos de usuario

### Flujo de bootstrap (primera vez del admin)

| Paso | Pantalla | Acción |
|---|---|---|
| 1 | Login | Sistema en modo `seed`. Admin ingresa con credenciales del `data/seed.json` (ej: `admin@campuszen.app` / `admin123`). |
| 2 | Dashboard | Admin ve un banner: "El sistema está en modo seed. Por favor ejecuta el bootstrap desde Configuración del sistema." |
| 3 | /admin/db-setup | Admin ve diagnóstico: Supabase OK, Blob OK, 0 migrations aplicadas, 4 pendientes. |
| 4 | /admin/db-setup | Admin hace clic en "Ejecutar bootstrap". Confirma con modal. |
| 5 | Procesando | Sistema corre las 4 migrations + carga el seed. Indicador de progreso. |
| 6 | Completado | Modo cambia a `live`. Banner desaparece. Sistema operativo con Supabase. |

### Flujo de navegación general (estudiante)

| Paso | Pantalla | Acción |
|---|---|---|
| 1 | Login | El estudiante abre CampusZen y ve la pantalla de login. |
| 2 | Dashboard | Ve tareas pendientes, alertas y total del mes. |
| 3 | Tareas | Agrega una tarea, la completa más tarde. |
| 4 | Gastos | Registra un gasto, exporta PDF. |
| 5 | Cualquier pantalla | Cierra sesión y vuelve a /login. |

---

## 17. Diseño de interfaz

### Identidad visual del Login

| Elemento | Especificación |
|---|---|
| **Layout** | Pantalla completa. Formulario centrado vertical y horizontalmente. |
| **Fondo** | Blanco humo (`#F8F9FA`) con un patrón sutil de hojas SVG en una esquina, opacidad baja. |
| **Tarjeta** | Fondo blanco, `border-radius: 16px`, sombra suave, padding generoso, max-w-md. |
| **Logo** | SVG de hoja estilizada en verde salvia (`#40916C`), 48×48px, centrado. |
| **Nombre** | "CampusZen" en Inter Bold 28px, verde oscuro (`#2D6A4F`). |
| **Tagline** | "Tu espacio universitario, en calma." Inter Regular 13px, gris medio. |
| **Botón principal** | "Ingresar" — verde salvia `#40916C`, texto blanco, hover `#2D6A4F`. |
| **Animación de entrada** | Framer Motion: `opacity: 0→1`, `y: 20→0`, duración 0.4s, ease `easeOut`. |

### Paleta de colores

**Modo claro**

| Elemento | Hex |
|---|---|
| Fondo principal | `#F8F9FA` |
| Fondo de tarjetas | `#FFFFFF` |
| Primario | `#40916C` |
| Secundario | `#95D5B2` |
| Texto principal | `#1B1B1B` |
| Texto secundario | `#6C757D` |
| Alerta | `#F4A261` |
| Error | `#E63946` |
| Éxito | `#2D6A4F` |
| Bordes | `#DEE2E6` |

**Modo oscuro**

| Elemento | Hex |
|---|---|
| Fondo principal | `#121212` |
| Fondo de tarjetas | `#1E1E1E` |
| Primario | `#52B788` |
| Secundario | `#74C69D` |
| Texto principal | `#E8E8E8` |
| Texto secundario | `#AAAAAA` |
| Alerta | `#F4A261` |
| Error | `#FF6B6B` |
| Éxito | `#95D5B2` |
| Bordes | `#2C2C2C` |

### Tipografía

| Elemento | Fuente | Tamaño | Peso |
|---|---|---|---|
| Títulos principales | Inter | 24px | Bold 700 |
| Títulos de sección | Inter | 18px | SemiBold 600 |
| Cuerpo | Inter | 14px | Regular 400 |
| Secundario | Inter | 12px | Regular 400 |
| Numéricos | Inter | 16px | Medium 500 |

### Componentes clave

| Componente | Descripción |
|---|---|
| Tarjeta de tarea | Borde izquierdo por prioridad: rojo (Alta), naranja (Media), verde (Baja). |
| Alerta de vencimiento | Banner naranja en el dashboard para tareas con < 48h. |
| Gráfica de gastos | Recharts — barras con paleta verde, una por categoría. |
| Barra de presupuesto | Verde → naranja al 80% → rojo al 100%. |
| Toast | Notificación temporal en esquina inferior derecha. |
| **Banner de modo seed** | Alerta amarilla persistente en el header del dashboard cuando el sistema está sin bootstrapear. Solo visible para admin. |

### Diseño responsivo

| Dispositivo | Comportamiento |
|---|---|
| Computador (≥1024px) | Sidebar fijo, dashboard en grilla de 3 columnas. |
| Tablet (768–1023px) | Sidebar colapsable, dashboard en 2 columnas. |
| Celular (<768px) | Bottom navigation, todo en una columna. |

---

## 18. Plan de fases de implementación

### Fase 1 — Bootstrap, Login y `dataService` base
> Rol: Ingeniero Fullstack Senior — Arquitecto del sistema y seguridad
> Reemplaza el "Hola Mundo". Esta fase establece la arquitectura completa de persistencia.

| # | Tarea |
|---|---|
| 1.1 | Instalar: `bcryptjs jose @supabase/supabase-js @vercel/blob pg @types/bcryptjs @types/pg` |
| 1.2 | Crear proyecto en Supabase. Crear Blob Store privado en Vercel. Configurar todas las variables de entorno (`.env.local` y Vercel). |
| 1.3 | Crear estructura `data/`: `config.json`, `seed.json` con admin inicial (password `admin123` ya hasheado), `README.md`. |
| 1.4 | Crear `supabase/migrations/0001_init_users.sql` con la tabla `users` y la tabla `_migrations`. |
| 1.5 | Crear `lib/supabase.ts`: cliente para server (service role). |
| 1.6 | Crear `lib/blobAudit.ts`: `appendAudit`, `readAuditMonth`, con `withFileLock` y `getBlobToken()` lazy. |
| 1.7 | Crear `lib/pgMigrate.ts`: aplica migrations pendientes leyendo archivos de `supabase/migrations/`, comparando con tabla `_migrations`. |
| 1.8 | Crear `lib/seedReader.ts`: lee `data/seed.json` y `data/config.json` (read-only, solo en modo seed). |
| 1.9 | Crear `lib/dataService.ts` con la API pública del plan. Implementa `getSystemMode()`, `getUserByEmail`, `getUserById`, `createUser`, `updateUser`, `recordAudit`. En modo `seed` enruta a `seedReader`; en modo `live` a Supabase. Cada escritura llama `recordAudit`. |
| 1.10 | Crear `lib/auth.ts`: `hashPassword`, `verifyPassword`, `createJWT`, `verifyJWT`, `getTokenFromCookie`, `setSessionCookie`, `clearSessionCookie`. |
| 1.11 | Crear `lib/withAuth.ts` y `lib/withRole.ts`. `withAuth` agrega header `Cache-Control: no-store` a la respuesta. |
| 1.12 | Crear `next.config.ts` con headers `no-store` para `/api/:path*`. |
| 1.13 | Crear `lib/types.ts` y `lib/schemas.ts` con tipos y schemas Zod de auth y de auditoría. |
| 1.14 | Crear API Routes: `POST /api/system/bootstrap`, `GET /api/system/diagnose`, `GET /api/system/mode`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/change-password`. |
| 1.15 | Crear `app/login/page.tsx` con la identidad visual de CampusZen (logo, nombre, tagline, animación). |
| 1.16 | Crear `app/register/page.tsx`. |
| 1.17 | Actualizar `app/page.tsx`: redirige a `/dashboard` si hay sesión, a `/login` si no. |
| 1.18 | `npm run typecheck` sin errores. Probar: login con admin del seed → ver que `/api/system/mode` retorna `seed` → registrar un estudiante → verificar que falla porque modo seed no acepta escrituras de usuarios nuevos (solo permite login). Verificar que la cookie es HttpOnly. |

---

### Fase 2 — Dashboard, Layout base y página de bootstrap
> Rol: Diseñador Frontend Obsesivo + Ingeniero de Sistemas

| # | Tarea |
|---|---|
| 2.1 | Crear componentes UI base en `components/ui/`: Button, Card, Badge, Toast (con hook), Modal, EmptyState. |
| 2.2 | Configurar variables CSS de paleta (claro/oscuro) en `globals.css`. Configurar Inter con `next/font`. |
| 2.3 | Crear `components/layout/AppLayout.tsx`: sidebar (desktop), bottom nav (mobile), ThemeToggle. |
| 2.4 | Crear `app/admin/db-setup/page.tsx` con dos tabs: Diagnóstico y Bootstrap. Llama a `/api/system/diagnose` y muestra: estado de Supabase, estado de Blob, migrations aplicadas vs pendientes, conteos por tabla. Botón "Ejecutar bootstrap" llama a `/api/system/bootstrap` con confirmación previa. |
| 2.5 | Crear `components/admin/SeedModeBanner.tsx`: banner amarillo persistente que aparece en el dashboard cuando el sistema está en modo `seed`. Solo visible para admin. Link directo a `/admin/db-setup`. |
| 2.6 | Crear `GET /api/dashboard`: retorna conteos y resúmenes consolidados desde `dataService`. En modo `seed` retorna estructura vacía con flag `mode: 'seed'`. |
| 2.7 | Crear `app/dashboard/page.tsx`: tarjetas de resumen, banner de modo seed (si aplica), placeholders para gráfica y alertas. |
| 2.8 | Crear `middleware.ts`: protege rutas `/dashboard`, `/tasks`, `/expenses`, `/profile`, `/admin/*`. Verifica sesión y rol para `/admin/*`. |
| 2.9 | Probar el flujo completo: login admin → ver banner → ir a /admin/db-setup → ejecutar bootstrap → verificar que el banner desaparece y `getSystemMode()` retorna `live`. |

---

### Fase 3 — Módulo de Materias
> Rol: Ingeniero Backend Senior

| # | Tarea |
|---|---|
| 3.1 | Crear `supabase/migrations/0002_init_subjects.sql`. Aplicar desde `/admin/db-setup`. |
| 3.2 | Agregar tipo `Subject` y schemas Zod a `lib/types.ts` y `lib/schemas.ts`. |
| 3.3 | Extender `lib/dataService.ts`: `getSubjectsByUser`, `createSubject`, `updateSubject`, `deactivateSubject`. Cada escritura llama `recordAudit`. |
| 3.4 | API Routes: `GET/POST /api/subjects`, `PUT/DELETE /api/subjects/[id]`. |
| 3.5 | Crear sección "Mis materias" en `/profile`: lista, agregar inline, editar en modal, desactivar con confirmación. |
| 3.6 | DELETE no es físico — usa `is_active=false` (las tareas asociadas deben poder mostrar el nombre de la materia aunque esté desactivada). |

---

### Fase 4 — Módulo de Tareas — Backend
> Rol: Ingeniero Backend Senior

| # | Tarea |
|---|---|
| 4.1 | Crear `supabase/migrations/0003_init_tasks.sql`. Aplicar desde `/admin/db-setup`. |
| 4.2 | Agregar tipo `Task`, `TaskWithSubject` y schemas Zod (RN-02 fechas obligatorias, RN-03 fecha futura, RN-14 materia obligatoria). |
| 4.3 | Extender `dataService.ts`: `getTasks` (con join a subjects, ORDER BY due_date ASC, campo calculado `isUrgent`), `createTask`, `updateTask`, `completeTask`, `deleteTask`. Cada escritura llama `recordAudit`. |
| 4.4 | Validar RN-05 en `updateTask`: una tarea con `status='completada'` no puede modificarse → retornar 400. |
| 4.5 | API Routes: `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/[id]`, `POST /api/tasks/[id]/complete`. |

---

### Fase 5 — Módulo de Tareas — Frontend
> Rol: Diseñador Frontend Obsesivo

| # | Tarea |
|---|---|
| 5.1 | Crear `components/tasks/TaskCard.tsx`: borde izquierdo por prioridad, badges, botones, animación de completar (tachado + fade-out). |
| 5.2 | Crear `components/tasks/TaskForm.tsx`: dropdown de materias, fecha mínimo hoy, selector de prioridad. Validación cliente con mismos criterios que Zod servidor. |
| 5.3 | Crear `components/tasks/AlertBanner.tsx`: banner naranja con tareas urgentes. |
| 5.4 | Crear `app/tasks/page.tsx`: lista, filtro por materia, modal de creación/edición, AnimatePresence con stagger. |
| 5.5 | Integrar `AlertBanner` en `/dashboard` con datos reales de `urgentTasks` del endpoint. |

---

### Fase 6 — Módulo de Gastos — Backend
> Rol: Ingeniero Backend Senior — Lógica financiera

| # | Tarea |
|---|---|
| 6.1 | Crear `supabase/migrations/0004_init_expenses.sql`. Aplicar desde `/admin/db-setup`. |
| 6.2 | Agregar tipo `Expense`, `ExpenseSummary`, `EXPENSE_CATEGORIES`, `PAYMENT_METHODS` y schemas Zod. |
| 6.3 | Extender `dataService.ts`: `getExpenses`, `createExpense` (con validación RN-15 anti-duplicado en último minuto), `updateExpense`, `deleteExpense`, `getMonthlySummary` (totales con SQL GROUP BY). Cada escritura llama `recordAudit`. |
| 6.4 | API Routes: `GET/POST /api/expenses`, `PUT/DELETE /api/expenses/[id]`, `GET /api/expenses/summary`. |
| 6.5 | El summary integra `users.budget_monthly` y devuelve `budgetPercentage` (o `null` si no hay presupuesto). |

---

### Fase 7 — Módulo de Gastos — Frontend
> Rol: Diseñador Frontend Obsesivo

| # | Tarea |
|---|---|
| 7.1 | Instalar `recharts`. |
| 7.2 | Crear `components/expenses/BudgetBar.tsx`: barra con tres estados (verde <80%, naranja 80–99%, rojo ≥100%). Mensaje alternativo si no hay presupuesto. |
| 7.3 | Crear `components/charts/ExpenseChart.tsx`: BarChart de Recharts en ResponsiveContainer. |
| 7.4 | Crear `components/expenses/ExpenseCard.tsx` y `ExpenseForm.tsx`. |
| 7.5 | Crear `app/expenses/page.tsx`: lista, formulario, gráfica, BudgetBar, resumen efectivo vs tarjeta. Botones de exportación deshabilitados hasta Fase 8. |
| 7.6 | Integrar gráfica y total del mes en el dashboard reemplazando los placeholders. |

---

### Fase 8 — Exportación de reportes
> Rol: Ingeniero Backend Senior

| # | Tarea |
|---|---|
| 8.1 | Instalar `jspdf jspdf-autotable xlsx`. |
| 8.2 | Crear `lib/exportService.ts`: `generatePDFBuffer` y `generateExcelBuffer`. |
| 8.3 | API Routes: `GET /api/export/pdf?month=YYYY-MM` y `GET /api/export/xlsx?month=YYYY-MM`. Sin datos en el período → 404. Headers `Content-Type` y `Content-Disposition: attachment` correctos. |
| 8.4 | Habilitar botones de exportación en `/expenses` con spinner de carga. Toast de error si 404. |

---

### Fase 9 — Panel de Administración (usuarios + auditoría)
> Rol: Ingeniero Fullstack Senior

| # | Tarea |
|---|---|
| 9.1 | Crear `app/admin/users/page.tsx`: tabla de usuarios con activar/suspender/eliminar. Solo admin. |
| 9.2 | API Routes: `GET /api/users`, `PUT/DELETE /api/users/[id]` (todas con `withRole('admin')`). |
| 9.3 | Crear `app/admin/audit/page.tsx`: visualizador de auditoría leyendo desde Blob. Filtros por mes y por usuario (filtrado en memoria al leer el mes). Tabla con timestamp, usuario, acción, entidad, cambios. |
| 9.4 | API Route `GET /api/audit?month=YYYYMM&userId=...`: lee de `dataService.readAuditMonth()` y filtra. |
| 9.5 | El admin no puede eliminar su propia cuenta. |

---

### Fase 10 — Perfil, configuración y pulido final
> Rol: Diseñador Frontend Obsesivo + Ingeniero Fullstack

| # | Tarea |
|---|---|
| 10.1 | Crear `app/profile/page.tsx` completo: información personal, cambio de contraseña, presupuesto mensual, notificaciones, tema, materias. |
| 10.2 | Pulir resumen semanal en el dashboard con datos reales de los últimos 7 días. |
| 10.3 | Auditoría de empty states en todos los módulos. |
| 10.4 | Manejo de errores global: red, 401 (sesión expirada), 403 (sin permisos), 500. Toasts apropiados. |
| 10.5 | Revisión responsive en 375px, 768px y 1280px. |
| 10.6 | `npm run typecheck`, `npm run lint`, `npm run build` — cero errores y cero warnings. |
| 10.7 | Verificar que ningún componente cliente importa `dataService`, `supabase`, `blobAudit` ni variables privadas (`SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET`). |
| 10.8 | Deploy en Vercel con todas las variables de entorno. Probar el flujo completo: login admin del seed → bootstrap → registrar estudiante → flujo completo del estudiante. |

---

## 19. Estrategia de seguridad

### Flujo de login

```
1. Validar body con Zod (loginSchema)
2. dataService.getUserByEmail(email)  ← enruta a seed o Postgres según modo
3. Verificar is_active y password con bcrypt.compare()
4. Generar JWT (payload: { userId, role, email }, expira 24h)
5. Establecer cookie HttpOnly, Secure, SameSite=Strict
6. dataService.recordAudit({ action: 'login', ... })
7. Retornar SafeUser (sin password_hash)
```

### Aislamiento de datos

Todas las queries del `dataService` filtran por `user_id` extraído del JWT. El `SUPABASE_SERVICE_ROLE_KEY` solo vive en código del servidor.

### Seguridad del bootstrap

`POST /api/system/bootstrap` requiere **dos condiciones simultáneas**:
1. Sesión válida con `role='admin'` (después del primer login)
2. Header `x-bootstrap-secret` igual a `ADMIN_BOOTSTRAP_SECRET`

Esto previene que alguien con acceso a la cookie de admin (robada o descuidada) pueda re-ejecutar migrations destructivas sin tener acceso también a las variables de entorno del servidor.

### Headers de cache

```typescript
// next.config.ts
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
      { key: 'Pragma', value: 'no-cache' },
    ],
  }];
}
```

Y `withAuth` agrega los mismos headers a cada respuesta como triple defensa (Next.js + middleware + API route).

---

## 20. Restricciones del sistema

| ID | Restricción | Descripción |
|---|---|---|
| RS-01 | Requiere conexión a internet | Aplicación web. |
| RS-02 | Navegadores modernos | Chrome, Firefox, Safari, Edge actualizados. |
| RS-03 | Un usuario por cuenta | Cada cuenta es personal. |
| RS-04 | Categorías fijas | No se pueden crear categorías personalizadas. |
| RS-05 | Sin modo offline | No hay PWA en esta versión. |
| RS-06 | Idioma único | Español. |
| RS-07 | Datos no compartibles | No se transfieren entre usuarios. |
| RS-08 | Exportación solo de gastos | PDF y Excel solo de gastos en v1. |
| RS-09 | Bootstrap obligatorio | Hasta no aplicar migrations + seed, el sistema solo permite login admin. |
| RS-10 | Auditoría no editable | Las entradas en Blob son append-only. No hay endpoint para editar o eliminar entradas. |

---

## 21. Glosario

| Término | Definición |
|---|---|
| **Bootstrap** | Proceso inicial donde el admin aplica migrations y carga el seed para activar Supabase. |
| **Modo seed** | Estado del sistema antes del bootstrap. Solo permite login admin. |
| **Modo live** | Estado normal del sistema, persistiendo en Supabase. |
| **Migration** | Archivo SQL versionado en `supabase/migrations/` que evoluciona el esquema. |
| **Seed** | Datos iniciales en `data/seed.json`. Se cargan una sola vez en el bootstrap. |
| **dataService** | Único punto de acceso a datos. Encapsula Supabase, Blob y el seed reader. |
| **Auditoría** | Registro append-only de cada operación de escritura. Persiste en Vercel Blob. |
| **Dashboard** | Panel principal con resumen del estudiante. |
| **Tarea** | Actividad académica con materia, fecha límite y prioridad. |
| **Materia** | Asignatura universitaria asociada a las tareas. |
| **Gasto** | Erogación con nombre, monto, categoría y medio de pago. |
| **Categoría** | Tipo de gasto: Fotocopias, Transporte, Comida, Materiales, Otro. |
| **Medio de pago** | Efectivo o Tarjeta. |
| **Presupuesto mensual** | Monto máximo definido por el estudiante. |
| **Reporte** | PDF o Excel con historial de gastos. |
| **Alerta de vencimiento** | Notificación visual para tareas con menos de 48h. |
| **JWT** | JSON Web Token — credencial firmada en cookie HttpOnly. |
| **Vercel Blob** | Servicio de Vercel para almacenar archivos. Aquí guarda auditoría y futuros archivos binarios. |

---

> Última actualización: Mayo 2026
> Lianna Mora — Doc: 1082928103
> Curso: Lógica y Programación — SIST0200

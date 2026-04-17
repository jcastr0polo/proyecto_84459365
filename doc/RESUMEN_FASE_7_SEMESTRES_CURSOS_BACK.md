# 📋 Resumen Fase 7 — Semestres y Cursos (Backend)

> **Estado:** ✅ Completada
> **Rol asignado:** Ingeniero Backend Senior
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §4.2, §10.3, §10.4, §11.4

---

## 🎯 Objetivo

Implementar el backend completo para la gestión de semestres y cursos: modelo de datos, validaciones Zod, servicio de datos (CRUD), y endpoints REST protegidos con reglas de negocio académicas.

---

## 📁 Archivos Creados

### Datos (`/data`)

| Archivo | Contenido |
|---------|-----------|
| `semesters.json` | 1 semestre: `202601` (2026 - Primer Semestre, activo) |
| `courses.json` | 3 cursos: LOG-202601, DIS-202601, GER-202601 |

### API Routes

| Ruta | Métodos | Protección |
|------|---------|------------|
| `app/api/semesters/route.ts` | GET, POST | admin |
| `app/api/semesters/[id]/route.ts` | GET, PUT | admin |
| `app/api/courses/route.ts` | GET, POST | GET: admin+student, POST: admin |
| `app/api/courses/[id]/route.ts` | GET, PUT | GET: admin+student, PUT: admin |

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/types.ts` | +Interfaces: `Semester`, `Course`, `CourseSchedule`, `CreateSemesterRequest`, `UpdateSemesterRequest`, `CreateCourseRequest`, `UpdateCourseRequest` |
| `lib/schemas.ts` | +Schemas: `semesterSchema`, `createSemesterSchema`, `updateSemesterSchema`, `courseSchema`, `createCourseSchema`, `updateCourseSchema`, `courseScheduleSchema` |
| `lib/dataService.ts` | +Funciones: `readSemesters`, `writeSemesters`, `getSemesterById`, `getActiveSemester`, `readCourses`, `writeCourses`, `getCourseById`, `getCoursesBySemester` |

---

## 📊 Modelo de Datos

### Semester

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | `string` | Formato YYYYSS (ej: `202601`). Único |
| `label` | `string` | Etiqueta legible |
| `startDate` | `string` | ISO date `YYYY-MM-DD`. Debe ser < endDate |
| `endDate` | `string` | ISO date `YYYY-MM-DD` |
| `isActive` | `boolean` | RN-SEM-01: solo uno activo |
| `createdAt` | `string` | ISO timestamp |

### Course

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | `string` | UUID generado (`course-{uuid}`) |
| `code` | `string` | RN-CUR-01: único por semestre. Inmutable |
| `name` | `string` | Nombre del curso |
| `description` | `string` | Descripción |
| `semesterId` | `string` | FK → Semester.id. Inmutable |
| `category` | `enum` | `programming`, `design`, `management`, `leadership`, `other` |
| `schedule` | `CourseSchedule[]` | RN-CUR-03: mínimo 1 elemento |
| `isActive` | `boolean` | Estado del curso |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp |

### CourseSchedule (embebido)

| Campo | Tipo | Regla |
|-------|------|-------|
| `dayOfWeek` | `enum` | `lunes`, `martes`, `miércoles`, `jueves`, `viernes`, `sábado` |
| `startTime` | `string` | Formato `HH:mm` |
| `endTime` | `string` | Formato `HH:mm` |
| `room` | `string?` | Opcional |
| `modality` | `enum` | `presencial`, `virtual`, `híbrido` |

---

## 🔗 Reglas de Negocio Implementadas

| Regla | Descripción | Implementación |
|-------|-------------|----------------|
| RN-SEM-01 | Solo un semestre activo | Al activar uno (POST/PUT), se desactivan todos los demás |
| RN-SEM-02 | Formato ID YYYYSS | Validación Zod con regex `^\d{4}(01\|02)$` |
| RN-CUR-01 | Código único por semestre | Verificación case-insensitive en POST (409 si duplicado) |
| RN-CUR-02 | Categoría obligatoria | Schema Zod con z.enum (5 valores) |
| RN-CUR-03 | Al menos un horario | Schema Zod `z.array().min(1)` en create y update |
| RN-CUR-04 | Curso activo = semestre activo | Estudiantes solo ven cursos activos en GET |

---

## 🛡️ API Endpoints — Detalle

### `GET /api/semesters`

- **Auth:** admin
- **Respuesta:** `{ semesters: Semester[] }` ordenados por ID descendente

### `POST /api/semesters`

- **Auth:** admin
- **Body:** `{ id, label, startDate, endDate, isActive? }`
- **Validaciones:** ID formato YYYYSS, startDate < endDate, ID único
- **RN-SEM-01:** Si `isActive: true`, desactiva todos los demás
- **Respuesta:** `201 { semester: Semester }`

### `GET /api/semesters/[id]`

- **Auth:** admin
- **Respuesta:** `{ semester: Semester }` o `404`

### `PUT /api/semesters/[id]`

- **Auth:** admin
- **Body:** `{ label?, startDate?, endDate?, isActive? }` (parcial)
- **RN-SEM-01:** Si `isActive: true`, desactiva todos los demás
- **Respuesta:** `{ semester: Semester }` o `404`

### `GET /api/courses`

- **Auth:** admin o student
- **Query:** `?semesterId=` (opcional)
- **Admin:** ve todos los cursos
- **Student:** ve solo cursos activos (filtrado por enrollments en Fase 9)
- **Respuesta:** `{ courses: Course[] }`

### `POST /api/courses`

- **Auth:** admin
- **Body:** `{ code, name, description, semesterId, category, schedule }`
- **Validaciones:** Semestre existe, código único por semestre, schedule mín 1
- **Respuesta:** `201 { course: Course }`

### `GET /api/courses/[id]`

- **Auth:** admin o student (student solo ve activos)
- **Respuesta:** `{ course: Course }` o `404`

### `PUT /api/courses/[id]`

- **Auth:** admin
- **Body:** `{ name?, description?, category?, schedule?, isActive? }` (parcial)
- **Nota:** `code` y `semesterId` son inmutables post-creación
- **Respuesta:** `{ course: Course }` o `404`

---

## ✅ Validación

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run lint` | ✅ 0 errores de Fase 7 |
| JSON data parse | ✅ 1 semestre + 3 cursos cargan correctamente |
| Zod schemas | ✅ 7 schemas (semester, course, schedule + create/update) |

---

## 📊 Datos Iniciales Cargados

### Semestre 202601

| Campo | Valor |
|-------|-------|
| ID | `202601` |
| Label | 2026 - Primer Semestre |
| Período | 2026-02-01 → 2026-06-30 |
| Activo | ✅ |

### Cursos

| Código | Nombre | Categoría | Día | Hora | Salón |
|--------|--------|-----------|-----|------|-------|
| LOG-202601 | Lógica y Programación | programming | Lunes | 08:00-10:00 | Lab 301 |
| DIS-202601 | Diseño de Interfaces RA | design | Martes | 10:00-12:00 | Lab 205 |
| GER-202601 | Gerencia de Proyectos | management | Miércoles | 14:00-16:00 | Aula 102 |

---

## ⚠️ Pendiente para Fases Posteriores

- Filtrado de cursos por enrollment para estudiantes (Fase 9)
- UI de gestión de semestres y cursos (Fase 8)
- Vinculación de actividades a cursos (Fase 11)
- RN-SEM-03: cursos de semestre inactivo como solo lectura (Fase 24)

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos creados | 6 |
| Archivos modificados | 3 |
| Endpoints API | 8 (4 semesters + 4 courses) |
| Schemas Zod | 7 |
| Funciones dataService | 8 |
| Tipos/interfaces nuevos | 7 |
| Líneas de código nuevas | ~550 |

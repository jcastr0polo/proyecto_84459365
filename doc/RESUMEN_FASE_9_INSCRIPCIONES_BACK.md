# 📋 Resumen Fase 9 — Inscripción de Estudiantes (Backend)

> **Estado:** ✅ Completada
> **Rol asignado:** Ingeniero Backend Senior
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §4.2, §5.4, §6.4, §8 (CU-02, CU-11)

---

## 🎯 Objetivo

Implementar el backend completo para la inscripción de estudiantes a cursos: creación automática de usuarios, inscripción individual y masiva, retiro soft-delete, búsqueda de estudiantes, y perfil con cursos inscritos.

---

## 📁 Archivos Creados

### Datos (`/data`)

| Archivo | Descripción |
|---------|-------------|
| `enrollments.json` | Array de inscripciones. Inicia vacío |

### Lógica de Negocio (`/lib`)

| Archivo | Exports principales |
|---------|-------------------|
| `enrollmentService.ts` | `enrollStudent()`, `bulkEnroll()`, `EnrollmentError` |

### API Routes

| Ruta | Métodos | Protección | Descripción |
|------|---------|------------|-------------|
| `/api/courses/[id]/enrollments` | GET, POST | admin | Listar inscritos, inscribir individual |
| `/api/courses/[id]/enrollments/bulk` | POST | admin | Inscripción masiva |
| `/api/courses/[id]/enrollments/[enrollId]` | DELETE | admin | Retirar estudiante (soft-delete) |
| `/api/students` | GET | admin | Buscar estudiantes |
| `/api/students/[id]` | GET | admin + own | Perfil + cursos inscritos |

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/types.ts` | +Interfaces: `Enrollment`, `EnrollStudentRequest`, `BulkEnrollRequest`, `EnrollmentWithStudent`, `BulkEnrollResult` |
| `lib/schemas.ts` | +Schemas: `enrollStudentSchema`, `bulkEnrollSchema`, `enrollmentSchema` |
| `lib/dataService.ts` | +Funciones: `readEnrollments`, `writeEnrollments`, `getEnrollmentsByCourse`, `getEnrollmentsByStudent`, `isStudentEnrolled` |

---

## 📊 Modelo de Datos

### Enrollment

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | `string` | UUID: `enroll-{uuid}` |
| `courseId` | `string` | FK → Course.id |
| `studentId` | `string` | FK → User.id (role: student) |
| `status` | `'active' \| 'withdrawn'` | RN-INS-05: nunca se borra |
| `enrolledAt` | `string` | ISO timestamp |
| `enrolledBy` | `string` | Admin que realizó la inscripción |
| `withdrawnAt` | `string?` | ISO timestamp (solo si withdrawn) |

---

## 🔗 Reglas de Negocio Implementadas

| Regla | Descripción | Implementación |
|-------|-------------|----------------|
| RN-INS-01 | Solo admin inscribe | `withAuth(request, handler, 'admin')` en todos los endpoints |
| RN-INS-02 | No inscripción duplicada activa | `isStudentEnrolled()` verifica antes de crear enrollment |
| RN-INS-03 | Crear usuario automáticamente | `enrollStudent()` busca por email, crea si no existe |
| RN-INS-04 | Password = hash(documento) | `hashPassword(documentNumber)` + `mustChangePassword: true` |
| RN-INS-05 | Retiro soft-delete | `status → 'withdrawn'` + `withdrawnAt`, nunca DELETE físico |

---

## 🛡️ API Endpoints — Detalle

### `GET /api/courses/[id]/enrollments`

- **Auth:** admin
- **Respuesta:** `{ enrollments: EnrollmentWithStudent[], total, active }`
- Incluye datos `SafeUser` (sin passwordHash) del estudiante

### `POST /api/courses/[id]/enrollments`

- **Auth:** admin
- **Body:** `{ firstName, lastName, email, documentNumber, phone? }`
- **Flujo:**
  1. Valida curso existe y está activo
  2. Busca/crea usuario student
  3. Verifica no inscrito activo → 409 si duplicado
  4. Crea enrollment
- **Respuesta:** `201 { enrollment, student, created, message }`

### `POST /api/courses/[id]/enrollments/bulk`

- **Auth:** admin
- **Body:** `{ students: EnrollStudentRequest[] }` (mín 1)
- **Respuesta:** `201 { summary: { total, enrolled, alreadyEnrolled, errors }, success[], alreadyEnrolled[], errors[] }`

### `DELETE /api/courses/[id]/enrollments/[enrollId]`

- **Auth:** admin
- **Acción:** `status → 'withdrawn'`, `withdrawnAt = now()`
- **Idempotente:** Retorna 400 si ya está withdrawn

### `GET /api/students?search=`

- **Auth:** admin
- **Query:** `?search=` busca en firstName, lastName, email, documentNumber
- **Respuesta:** `{ students: SafeUser[], total }`

### `GET /api/students/[id]`

- **Auth:** admin o el propio estudiante
- **Respuesta:** `{ student: SafeUser, enrollments: [{enrollmentId, enrolledAt, course: {id, code, name, category}}], totalCourses }`

---

## 🏗️ Arquitectura — Flujo de Inscripción

```
Admin POST /api/courses/{courseId}/enrollments
  ↓
withAuth (verifica admin)
  ↓
Zod: enrollStudentSchema
  ↓
enrollStudent(courseId, data, adminId)
  ├── getCourseById(courseId) → ¿Existe y activo?
  ├── getUserByEmail(email) → ¿Existe?
  │   ├── NO → crearUsuario(student, bcrypt(doc), mustChange)
  │   └── SÍ → usar existente
  ├── isStudentEnrolled(userId, courseId) → ¿Duplicado?
  │   └── SÍ → EnrollmentError 409
  └── Crear enrollment → writeEnrollments()
  ↓
Response 201: { enrollment, student, created }
```

---

## ✅ Validación

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run lint` | ✅ 0 errores de Fase 9 |
| JSON data parse | ✅ enrollments.json carga correctamente |
| Zod schemas | ✅ 3 schemas (enrollStudent, bulkEnroll, enrollment) |
| Data integrity | ✅ users.json y enrollments.json consistentes |

---

## ⚠️ Pendiente para Fases Posteriores

- UI de inscripción de estudiantes (Fase 10 — Frontend)
- Gestión de actividades vinculadas al enrollment (Fase 11)
- Sistema de notas por enrollment (Fase 13)
- importación CSV de estudiantes (Fase 24)
- Rate limiting en endpoints de creación (Fase 24)

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos creados | 6 |
| Archivos modificados | 3 |
| Endpoints API | 6 (GET+POST enrollments, POST bulk, DELETE withdraw, GET students, GET student) |
| Schemas Zod | 3 |
| Funciones dataService | 5 |
| Tipos/interfaces nuevos | 5 |
| Líneas de código nuevas | ~550 |

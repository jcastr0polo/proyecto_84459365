# 🎓 PLAN MAESTRO — Plataforma de Gestión Académica Docente
> Versión 1.0 | Arquitecto de Software + Analista Funcional | Abril 2026
> Proyecto Fullstack TypeScript + Next.js + Vercel | Base de datos: JSON files

---

## 📋 Índice General

1. [Visión y Alcance](#1-visión-y-alcance)
2. [Actores del Sistema](#2-actores-del-sistema)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Modelo de Datos (JSON as DB)](#4-modelo-de-datos-json-as-db)
5. [Reglas de Negocio](#5-reglas-de-negocio)
6. [Requerimientos Funcionales](#6-requerimientos-funcionales)
7. [Requerimientos No Funcionales](#7-requerimientos-no-funcionales)
8. [Casos de Uso Detallados](#8-casos-de-uso-detallados)
9. [Módulos del Sistema](#9-módulos-del-sistema)
10. [Estructura de Archivos JSON (Data Layer)](#10-estructura-de-archivos-json-data-layer)
11. [Arquitectura de Rutas (App Router)](#11-arquitectura-de-rutas-app-router)
12. [Flujos de Comportamiento](#12-flujos-de-comportamiento)
13. [Diseño de Interfaces (Wireframes Textuales)](#13-diseño-de-interfaces-wireframes-textuales)
14. [Plan de Fases de Implementación](#14-plan-de-fases-de-implementación)
15. [Estrategia de Seguridad](#15-estrategia-de-seguridad)
16. [Integración con Proyectos Estudiantiles](#16-integración-con-proyectos-estudiantiles)
17. [Roadmap Futuro](#17-roadmap-futuro)
18. [Glosario](#18-glosario)

---

## 1. Visión y Alcance

### 1.1 Visión
Construir una **plataforma web de gestión académica** que le permita a un docente universitario administrar completamente sus cursos, actividades, estudiantes, entregas y calificaciones desde un único sistema fullstack desplegado en Vercel, utilizando archivos JSON como base de datos y sirviendo simultáneamente como **caso de estudio y demostración** del uso de herramientas de desarrollo modernas (IA, GitHub, Vercel, Next.js).

### 1.2 Alcance del Semestre 202601

| Curso | Código/ID | Tipo de Actividades Principales |
|-------|-----------|--------------------------------|
| **Lógica y Programación** | LOG-202601 | Proyectos fullstack, ejercicios de código, prompts IA |
| **Diseño de Interfaces RA** | DIS-202601 | Proyectos fullstack, diseño UI/UX, prototipos |
| **Gerencia de Proyectos** | GER-202601 | Documentación, planes, casos de negocio, liderazgo |

### 1.3 Propósito Dual
1. **Herramienta de gestión real**: El docente administra cursos, sube actividades, recibe entregas, califica y exporta notas.
2. **Vitrina de resultados**: Sirve como demostración pública de lo que se puede construir con el stack (Next.js + TypeScript + Vercel + GitHub + IA).

### 1.4 Restricciones Técnicas
- **Sin base de datos tradicional**: Toda la persistencia es en archivos JSON en `/data`.
- **Despliegue en Vercel**: Serverless, sin servidor persistente.
- **Autenticación sin servicios externos**: Login basado en JSON con sesiones por token/cookie.
- **Archivos subidos**: Se almacenan en `/data/uploads/` o servicio externo (futuro).

---

## 2. Actores del Sistema

### 2.1 Tabla de Actores

| Actor | Descripción | Cómo accede |
|-------|-------------|-------------|
| **Docente (Administrador)** | Profesor titular. Gestiona todo el sistema. Crea cursos, actividades, inscribe estudiantes, califica, exporta notas. | Login con credenciales de administrador |
| **Estudiante** | Alumno inscrito en uno o más cursos. Consulta actividades, sube entregas, revisa notas. | Login con email + número de documento (clave inicial) |
| **Visitante (Público)** | Cualquier persona que accede a la URL. Ve la página de inicio/vitrina pública. | Sin login — acceso a rutas públicas |

### 2.2 Características por Actor

#### Docente (Admin)
- Es **único** en el sistema (un solo docente/administrador).
- Tiene acceso total a todos los módulos.
- Puede impersonar la vista de un estudiante para verificar experiencia.
- Es quien crea las credenciales de los estudiantes al inscribirlos.
- Gestiona múltiples cursos simultáneamente.
- Sube material de actividades (PDFs, imágenes, documentos).
- Define prompts de IA para actividades de los cursos de Lógica y Diseño.
- Registra horarios, fechas de clase, periodos académicos.

#### Estudiante
- Pertenece a uno o más cursos del semestre activo.
- Su cuenta se crea automáticamente al ser inscrito por el docente.
- Credencial inicial: `email` + `número de documento` como contraseña.
- Puede (y debería) cambiar su contraseña tras el primer inicio de sesión.
- Sube entregas de actividades dentro de los plazos definidos.
- Consulta sus notas publicadas.
- En cursos de Lógica/Diseño: comparte enlaces a sus proyectos fullstack (GitHub + Vercel).
- En cursos de Gerencia/Liderazgo: sube documentos, reportes, presentaciones.

#### Visitante
- Accede únicamente a la landing page pública.
- Ve información general del sistema y los cursos (sin datos privados).
- Puede ver la vitrina de proyectos destacados (si el docente lo habilita).

---

## 3. Roles y Permisos

### 3.1 Matriz de Permisos (RBAC)

| Recurso / Acción | Admin (Docente) | Estudiante | Visitante |
|-------------------|:-:|:-:|:-:|
| Ver landing pública | ✅ | ✅ | ✅ |
| Login / Logout | ✅ | ✅ | ❌ |
| Cambiar contraseña propia | ✅ | ✅ | ❌ |
| **SEMESTRES** | | | |
| Crear/editar semestre | ✅ | ❌ | ❌ |
| Ver semestre activo | ✅ | ✅ | ❌ |
| **CURSOS** | | | |
| Crear/editar/eliminar curso | ✅ | ❌ | ❌ |
| Ver curso (si inscrito) | ✅ | ✅ | ❌ |
| Definir horario del curso | ✅ | ❌ | ❌ |
| **ESTUDIANTES** | | | |
| Inscribir estudiante en curso | ✅ | ❌ | ❌ |
| Ver lista de estudiantes | ✅ | ❌ | ❌ |
| Editar datos de estudiante | ✅ | ❌ | ❌ |
| Ver perfil propio | ✅ | ✅ | ❌ |
| **ACTIVIDADES** | | | |
| Crear/editar/eliminar actividad | ✅ | ❌ | ❌ |
| Subir archivos de actividad | ✅ | ❌ | ❌ |
| Ver actividades del curso | ✅ | ✅ | ❌ |
| Descargar material de actividad | ✅ | ✅ | ❌ |
| **ENTREGAS** | | | |
| Subir entrega (respuesta) | ❌ | ✅ | ❌ |
| Ver entregas de todos los estudiantes | ✅ | ❌ | ❌ |
| Ver entrega propia | ✅ | ✅ | ❌ |
| Editar/resubir entrega (antes del plazo) | ❌ | ✅ | ❌ |
| **CALIFICACIONES** | | | |
| Asignar nota a entrega | ✅ | ❌ | ❌ |
| Publicar notas | ✅ | ❌ | ❌ |
| Ver nota propia (si publicada) | ✅ | ✅ | ❌ |
| Exportar notas (CSV/Excel) | ✅ | ❌ | ❌ |
| **PROMPTS IA** | | | |
| Crear/editar prompt | ✅ | ❌ | ❌ |
| Ver prompt asignado a actividad | ✅ | ✅ | ❌ |
| **PROYECTOS ESTUDIANTILES** | | | |
| Registrar proyecto (URL GitHub + Vercel) | ❌ | ✅ | ❌ |
| Ver proyectos de todos | ✅ | ❌ | ❌ |
| Ver vitrina pública de proyectos | ✅ | ✅ | ✅ |
| **CONFIGURACIÓN** | | | |
| Configurar sistema | ✅ | ❌ | ❌ |
| Ver info del sistema | ✅ | ❌ | ❌ |

### 3.2 Definición de Roles en JSON

```json
{
  "roles": [
    {
      "id": "admin",
      "label": "Administrador (Docente)",
      "permissions": ["*"]
    },
    {
      "id": "student",
      "label": "Estudiante",
      "permissions": [
        "view:own-profile",
        "update:own-password",
        "view:enrolled-courses",
        "view:course-activities",
        "download:activity-material",
        "create:submission",
        "update:own-submission",
        "view:own-submissions",
        "view:own-grades",
        "view:assigned-prompts",
        "create:project-link",
        "update:own-project-link"
      ]
    }
  ]
}
```

---

## 4. Modelo de Datos (JSON as DB)

### 4.1 Diagrama de Entidades (Textual)

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│   SEMESTRE    │────<│    CURSO     │────<│   HORARIO      │
│              │     │              │     │   (por curso)   │
└──────────────┘     └──────┬───────┘     └────────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
              ┌─────▼─────┐   ┌─────▼──────┐
              │ INSCRIPCIÓN│   │ ACTIVIDAD  │
              │ (curso↔est)│   │            │
              └─────┬─────┘   └─────┬──────┘
                    │               │
              ┌─────▼─────┐   ┌─────▼──────┐
              │ ESTUDIANTE │   │  ENTREGA   │
              │  (usuario) │   │(submission)│
              └─────┬─────┘   └─────┬──────┘
                    │               │
                    └───────┬───────┘
                      ┌─────▼──────┐
                      │CALIFICACIÓN│
                      │  (grade)   │
                      └────────────┘

┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  PROMPT IA   │     │  PROYECTO    │     │  USUARIO       │
│              │     │ ESTUDIANTIL  │     │ (auth/login)   │
└──────────────┘     └──────────────┘     └────────────────┘
```

### 4.2 Entidades y Atributos

#### USUARIO (`data/users.json`)
```typescript
interface User {
  id: string;                          // UUID generado
  email: string;                       // Email único (login)
  passwordHash: string;                // Hash de la contraseña
  role: 'admin' | 'student';          // Rol del usuario
  mustChangePassword: boolean;         // true al crear, false tras cambio
  firstName: string;
  lastName: string;
  documentNumber: string;              // Cédula / documento identidad
  phone?: string;
  isActive: boolean;                   // Puede desactivarse sin eliminar
  createdAt: string;                   // ISO 8601
  updatedAt: string;
  lastLoginAt?: string;
}
```

#### SEMESTRE (`data/semesters.json`)
```typescript
interface Semester {
  id: string;                          // Ej: "202601"
  label: string;                       // Ej: "2026 - Primer Semestre"
  startDate: string;                   // Fecha inicio del semestre
  endDate: string;                     // Fecha fin del semestre
  isActive: boolean;                   // Solo uno activo a la vez
  createdAt: string;
}
```

#### CURSO (`data/courses.json`)
```typescript
interface Course {
  id: string;                          // UUID
  code: string;                        // Código visible: "LOG-202601"
  name: string;                        // "Lógica y Programación"
  description: string;                 // Descripción del curso
  semesterId: string;                  // FK a Semester.id
  category: 'programming' | 'design' | 'management' | 'leadership' | 'other';
  schedule: CourseSchedule[];          // Horarios de clase
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CourseSchedule {
  dayOfWeek: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado';
  startTime: string;                   // "08:00"
  endTime: string;                     // "10:00"
  room?: string;                       // Aula / salón
  modality: 'presencial' | 'virtual' | 'híbrido';
}
```

#### INSCRIPCIÓN (`data/enrollments.json`)
```typescript
interface Enrollment {
  id: string;
  studentId: string;                   // FK a User.id (role: student)
  courseId: string;                     // FK a Course.id
  enrolledAt: string;                  // Fecha de inscripción
  status: 'active' | 'inactive' | 'withdrawn';
  enrolledBy: string;                  // userId del admin que inscribió
}
```

#### ACTIVIDAD (`data/activities.json`)
```typescript
interface Activity {
  id: string;
  courseId: string;                     // FK a Course.id
  title: string;                       // "Proyecto Fullstack - Fase 1"
  description: string;                 // Descripción detallada (Markdown)
  type: 'project' | 'exercise' | 'document' | 'presentation' | 'prompt' | 'exam' | 'other';
  category: 'individual' | 'group';
  attachments: ActivityAttachment[];   // Archivos adjuntos del docente
  promptId?: string;                   // FK a Prompt.id (si aplica)
  dueDate: string;                     // Fecha límite de entrega
  publishDate: string;                 // Fecha en que se hace visible
  maxScore: number;                    // Nota máxima (ej: 5.0)
  weight: number;                      // Peso porcentual (ej: 20 = 20%)
  allowLateSubmission: boolean;        // Permitir entregas tardías
  latePenaltyPercent?: number;         // Penalización por entrega tardía (ej: 10 = -10%)
  status: 'draft' | 'published' | 'closed';
  requiresFileUpload: boolean;         // ¿Requiere subir archivo?
  requiresLinkSubmission: boolean;     // ¿Requiere enviar enlace (GitHub/Vercel)?
  createdAt: string;
  updatedAt: string;
}

interface ActivityAttachment {
  id: string;
  fileName: string;                    // "guia-proyecto-fase1.pdf"
  filePath: string;                    // "uploads/activities/act-001/guia.pdf"
  fileSize: number;                    // Bytes
  mimeType: string;
  uploadedAt: string;
}
```

#### ENTREGA / SUBMISSION (`data/submissions.json`)
```typescript
interface Submission {
  id: string;
  activityId: string;                  // FK a Activity.id
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id (denormalizado para consultas)
  content?: string;                    // Texto/comentario del estudiante
  attachments: SubmissionAttachment[]; // Archivos adjuntos
  links: SubmissionLink[];             // Enlaces (GitHub, Vercel, etc.)
  submittedAt: string;                 // Fecha/hora de entrega
  isLate: boolean;                     // Calculado: submittedAt > activity.dueDate
  status: 'submitted' | 'reviewed' | 'returned' | 'resubmitted';
  version: number;                     // 1, 2, 3... (re-entregas)
  createdAt: string;
  updatedAt: string;
}

interface SubmissionAttachment {
  id: string;
  fileName: string;
  filePath: string;                    // "uploads/submissions/sub-001/archivo.pdf"
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface SubmissionLink {
  type: 'github' | 'vercel' | 'figma' | 'other';
  url: string;
  label?: string;                      // "Repositorio principal"
}
```

#### CALIFICACIÓN (`data/grades.json`)
```typescript
interface Grade {
  id: string;
  submissionId: string;                // FK a Submission.id
  activityId: string;                  // FK a Activity.id
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  score: number;                       // Nota numérica (ej: 4.5)
  maxScore: number;                    // Nota máxima posible
  feedback?: string;                   // Retroalimentación del docente
  isPublished: boolean;                // ¿Visible para el estudiante?
  publishedAt?: string;                // Fecha de publicación
  gradedBy: string;                    // userId del admin
  gradedAt: string;
  updatedAt: string;
}
```

#### PROMPT IA (`data/prompts.json`)
```typescript
interface AIPrompt {
  id: string;
  courseId: string;                     // FK a Course.id
  activityId?: string;                 // FK a Activity.id (si está vinculado)
  title: string;                       // "Prompt Fase 1 - Setup del Proyecto"
  content: string;                     // El texto completo del prompt (Markdown)
  version: number;                     // Versionado: 1, 2, 3...
  tags: string[];                      // ["nextjs", "typescript", "setup"]
  isTemplate: boolean;                 // ¿Es plantilla reutilizable?
  createdAt: string;
  updatedAt: string;
}
```

#### PROYECTO ESTUDIANTIL (`data/projects.json`)
```typescript
interface StudentProject {
  id: string;
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  activityId?: string;                 // FK a Activity.id (si está vinculado)
  projectName: string;                 // "Mi Portafolio Web"
  description?: string;
  githubUrl: string;                   // URL del repositorio
  vercelUrl?: string;                  // URL del deploy en Vercel
  figmaUrl?: string;                   // URL de prototipo en Figma
  isPublic: boolean;                   // ¿Compartir en vitrina pública?
  isFeatured: boolean;                 // ¿Destacado por el docente?
  status: 'in-progress' | 'submitted' | 'reviewed' | 'featured';
  createdAt: string;
  updatedAt: string;
}
```

#### SESIONES (`data/sessions.json`)
```typescript
interface Session {
  id: string;                          // Token de sesión
  userId: string;                      // FK a User.id
  createdAt: string;
  expiresAt: string;                   // TTL de la sesión
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 5. Reglas de Negocio

### 5.1 Reglas de Autenticación (RN-AUTH)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-AUTH-01 | **Creación de cuenta estudiante** | Solo el administrador puede crear cuentas de estudiantes. Se crean al inscribir al estudiante en un curso. |
| RN-AUTH-02 | **Contraseña inicial** | La contraseña inicial de todo estudiante es su número de documento de identidad. |
| RN-AUTH-03 | **Cambio obligatorio de contraseña** | Al primer inicio de sesión, el sistema debe solicitar cambio de contraseña (`mustChangePassword = true`). |
| RN-AUTH-04 | **Login por email** | El identificador de inicio de sesión es siempre el email institucional o personal del estudiante. |
| RN-AUTH-05 | **Sesión con expiración** | Las sesiones expiran tras 24 horas de inactividad. El token se almacena en cookie HttpOnly. |
| RN-AUTH-06 | **Admin único** | Existe un solo usuario administrador. Se configura inicialmente en `data/users.json`. |
| RN-AUTH-07 | **Desactivación sin borrado** | Las cuentas se desactivan (`isActive: false`), nunca se eliminan físicamente del JSON. |

### 5.2 Reglas de Semestres (RN-SEM)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-SEM-01 | **Semestre activo único** | Solo puede haber un semestre con `isActive: true` a la vez. |
| RN-SEM-02 | **Formato de ID** | El ID del semestre sigue el formato `YYYYSS` donde SS es 01 (primer semestre) o 02 (segundo semestre). Ej: `202601`. |
| RN-SEM-03 | **Cursos vinculados** | Un curso siempre pertenece a un semestre. Al desactivar un semestre, sus cursos quedan de solo lectura. |
| RN-SEM-04 | **Historial preservado** | Los semestres anteriores y todos sus datos se conservan para consulta histórica. |

### 5.3 Reglas de Cursos (RN-CUR)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-CUR-01 | **Código único por semestre** | No pueden existir dos cursos con el mismo código en el mismo semestre. |
| RN-CUR-02 | **Categoría obligatoria** | Todo curso debe tener una categoría que define los tipos de actividades habilitadas. |
| RN-CUR-03 | **Horario asociado** | Todo curso debe tener al menos un horario de clase registrado. |
| RN-CUR-04 | **Curso activo = semestre activo** | Un curso solo está operativo si su semestre está activo. |

### 5.4 Reglas de Inscripción (RN-INS)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-INS-01 | **Inscripción por admin** | Solo el docente/admin puede inscribir estudiantes en cursos. |
| RN-INS-02 | **Sin duplicados** | Un estudiante no puede estar inscrito dos veces en el mismo curso. |
| RN-INS-03 | **Creación automática de usuario** | Si el email del estudiante no existe en `users.json`, se crea automáticamente al inscribirlo (con `role: student`, `mustChangePassword: true`, y password = documento). |
| RN-INS-04 | **Multi-curso** | Un estudiante puede estar inscrito en varios cursos simultáneamente. |
| RN-INS-05 | **Retiro sin borrado** | Al retirar un estudiante, el status cambia a `withdrawn`. Sus entregas y notas se conservan. |

### 5.5 Reglas de Actividades (RN-ACT)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-ACT-01 | **Actividad vinculada a curso** | Toda actividad pertenece a exactamente un curso. |
| RN-ACT-02 | **Estados de actividad** | `draft` → `published` → `closed`. Solo las publicadas son visibles para estudiantes. |
| RN-ACT-03 | **Fecha de publicación** | Una actividad en estado `published` con `publishDate` futuro no se muestra hasta esa fecha. |
| RN-ACT-04 | **Fecha límite** | `dueDate` define el corte. Entregas después de esta fecha se marcan como `isLate: true`. |
| RN-ACT-05 | **Entregas tardías opcionales** | Si `allowLateSubmission: false`, el sistema bloquea entregas después del `dueDate`. |
| RN-ACT-06 | **Penalización configurable** | Si hay entrega tardía permitida, se aplica `latePenaltyPercent` a la nota. |
| RN-ACT-07 | **Peso porcentual** | La suma de `weight` de todas las actividades de un curso debería sumar 100%. El sistema avisa si no cuadra. |
| RN-ACT-08 | **Archivos adjuntos del docente** | El docente puede adjuntar PDFs, imágenes, documentos como material de la actividad. |
| RN-ACT-09 | **Prompt vinculable** | Una actividad puede tener un prompt de IA asociado que el estudiante debe seguir. |

### 5.6 Reglas de Entregas (RN-ENT)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-ENT-01 | **Una entrega por actividad por estudiante** | Un estudiante solo puede tener una entrega activa por actividad (la última versión). |
| RN-ENT-02 | **Versionamiento** | Al re-entregar, se incrementa `version` y se actualiza `submittedAt`. La versión anterior se conserva en historial. |
| RN-ENT-03 | **Entrega = archivo y/o enlace** | Según la actividad, la entrega puede requerir archivo, enlace (GitHub/Vercel) o ambos. |
| RN-ENT-04 | **Solo estudiantes inscritos** | Solo un estudiante con inscripción `active` en el curso puede entregar. |
| RN-ENT-05 | **Bloqueo post-calificación** | Una vez calificada y publicada la nota, la entrega no puede modificarse (a menos que el docente la "devuelva"). |
| RN-ENT-06 | **Tipos de enlace para fullstack** | Para cursos de programación/diseño, los enlaces obligatorios incluyen GitHub (`githubUrl`) y opcionalmente Vercel (`vercelUrl`). |

### 5.7 Reglas de Calificaciones (RN-CAL)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-CAL-01 | **Nota dentro del rango** | `score` debe estar entre 0 y `maxScore` (definido en la actividad). |
| RN-CAL-02 | **Publicación explícita** | Las notas no son visibles para el estudiante hasta que `isPublished: true`. |
| RN-CAL-03 | **Publicación masiva** | El docente puede publicar todas las notas de una actividad de golpe. |
| RN-CAL-04 | **Retroalimentación** | El campo `feedback` es opcional pero recomendado. |
| RN-CAL-05 | **Nota definitiva del curso** | Se calcula como promedio ponderado: `Σ(score/maxScore × weight)` de todas las actividades calificadas. |
| RN-CAL-06 | **Exportación de notas** | El docente puede exportar las notas definitivas en formato CSV compatible con el sistema institucional de notas. |
| RN-CAL-07 | **Escala de notas** | La escala es de 0.0 a 5.0 (estándar colombiano). La nota aprobatoria es ≥ 3.0. |

### 5.8 Reglas de Prompts IA (RN-PRM)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-PRM-01 | **Prompts del docente** | Solo el administrador crea y edita prompts. |
| RN-PRM-02 | **Versionamiento** | Los prompts tienen versión. Al editar se incrementa la versión, conservando histórico. |
| RN-PRM-03 | **Plantillas reutilizables** | Un prompt marcado como `isTemplate: true` puede usarse como base para nuevos prompts. |
| RN-PRM-04 | **Vinculación a actividad** | Un prompt puede vincularse a una actividad específica para que los estudiantes lo ejecuten. |

### 5.9 Reglas de Proyectos Estudiantiles (RN-PRY)

| ID | Regla | Detalle |
|----|-------|---------|
| RN-PRY-01 | **Registro por estudiante** | El estudiante registra su proyecto con URL de GitHub y opcionalmente Vercel/Figma. |
| RN-PRY-02 | **Validación de URLs** | Las URLs de GitHub deben empezar con `https://github.com/`. Las de Vercel con `https://` y dominio `.vercel.app`. |
| RN-PRY-03 | **Vitrina pública** | Los proyectos con `isPublic: true` e `isFeatured: true` aparecen en la vitrina pública. |
| RN-PRY-04 | **Docente destaca proyectos** | Solo el docente puede marcar `isFeatured: true`. |

---

## 6. Requerimientos Funcionales

### 6.1 Módulo de Autenticación (RF-AUTH)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-AUTH-01 | Login | 🔴 Alta | El sistema debe permitir iniciar sesión con email y contraseña. |
| RF-AUTH-02 | Logout | 🔴 Alta | El sistema debe permitir cerrar sesión, destruyendo el token. |
| RF-AUTH-03 | Cambio de contraseña | 🔴 Alta | El usuario debe poder cambiar su contraseña. Obligatorio en el primer login. |
| RF-AUTH-04 | Protección de rutas | 🔴 Alta | Las rutas privadas deben redirigir al login si no hay sesión activa. |
| RF-AUTH-05 | Indicador de sesión | 🟡 Media | Mostrar nombre del usuario y rol en la barra de navegación. |
| RF-AUTH-06 | Recuperar contraseña | 🟢 Baja | (Futuro) Enviar enlace de recuperación por email. |

### 6.2 Módulo de Semestres (RF-SEM)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-SEM-01 | Crear semestre | 🔴 Alta | El admin crea un semestre con ID, nombre, fechas de inicio/fin. |
| RF-SEM-02 | Activar semestre | 🔴 Alta | El admin activa un semestre (desactiva el anterior automáticamente). |
| RF-SEM-03 | Listar semestres | 🟡 Media | Ver historial de semestres con filtros por estado. |
| RF-SEM-04 | Editar semestre | 🟡 Media | Modificar fechas y nombre de un semestre existente. |

### 6.3 Módulo de Cursos (RF-CUR)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-CUR-01 | Crear curso | 🔴 Alta | El admin crea un curso con nombre, código, descripción, categoría y semestre. |
| RF-CUR-02 | Definir horario | 🔴 Alta | Al crear/editar un curso, definir días, horas, salón y modalidad. |
| RF-CUR-03 | Listar cursos del semestre | 🔴 Alta | Ver todos los cursos del semestre activo. Estudiantes solo ven los suyos. |
| RF-CUR-04 | Dashboard del curso | 🔴 Alta | Página principal del curso con resumen: próximas actividades, entregas pendientes, horarios. |
| RF-CUR-05 | Editar curso | 🟡 Media | Modificar datos de un curso existente. |
| RF-CUR-06 | Calendario del curso | 🟡 Media | Visualizar actividades y fechas clave en un calendario. |

### 6.4 Módulo de Estudiantes e Inscripciones (RF-EST)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-EST-01 | Inscribir estudiante | 🔴 Alta | El admin agrega un estudiante a un curso proporcionando: nombre, apellido, email, documento. |
| RF-EST-02 | Inscripción masiva | 🟡 Media | Cargar lista de estudiantes desde CSV/JSON para inscripción en lote. |
| RF-EST-03 | Listar estudiantes del curso | 🔴 Alta | Ver tabla con todos los estudiantes inscritos, estado y datos de contacto. |
| RF-EST-04 | Retirar estudiante | 🟡 Media | Cambiar estado de inscripción a `withdrawn`. |
| RF-EST-05 | Perfil del estudiante | 🟡 Media | Vista con datos del estudiante, cursos inscritos, entregas y notas. |
| RF-EST-06 | Buscar estudiante | 🟡 Media | Buscar por nombre, email o documento en todos los cursos. |

### 6.5 Módulo de Actividades (RF-ACT)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-ACT-01 | Crear actividad | 🔴 Alta | El admin crea actividad con título, descripción, tipo, fecha límite, peso, nota máxima. |
| RF-ACT-02 | Adjuntar archivos | 🔴 Alta | Subir PDFs, imágenes, documentos como material de la actividad. |
| RF-ACT-03 | Vincular prompt | 🟡 Media | Asociar un prompt de IA a la actividad. |
| RF-ACT-04 | Publicar actividad | 🔴 Alta | Cambiar estado de `draft` a `published`. Puede programarse con `publishDate`. |
| RF-ACT-05 | Listar actividades del curso | 🔴 Alta | Ver todas las actividades del curso con estados, fechas y entregas pendientes. |
| RF-ACT-06 | Cerrar actividad | 🟡 Media | Cambiar estado a `closed`, bloqueando nuevas entregas. |
| RF-ACT-07 | Editar actividad | 🟡 Media | Modificar una actividad (advertir si ya hay entregas). |
| RF-ACT-08 | Ver detalle de actividad | 🔴 Alta | Ver descripción completa, archivos adjuntos, prompt asociado, estado de entrega (para estudiante). |

### 6.6 Módulo de Entregas (RF-ENT)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-ENT-01 | Enviar entrega | 🔴 Alta | El estudiante sube su entrega: archivos, enlaces (GitHub/Vercel/Figma), comentarios. |
| RF-ENT-02 | Re-entregar | 🟡 Media | El estudiante puede actualizar su entrega antes del cierre (incrementa versión). |
| RF-ENT-03 | Ver mis entregas | 🔴 Alta | El estudiante ve el listado de sus entregas por curso con estados. |
| RF-ENT-04 | Ver todas las entregas (admin) | 🔴 Alta | El docente ve todas las entregas de una actividad con filtros por estado. |
| RF-ENT-05 | Descargar entrega | 🟡 Media | El docente descarga los archivos adjuntos de una entrega. |
| RF-ENT-06 | Devolver entrega | 🟡 Media | El docente marca una entrega como "devuelta", habilitando re-entrega. |

### 6.7 Módulo de Calificaciones (RF-CAL)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-CAL-01 | Calificar entrega | 🔴 Alta | El docente asigna nota numérica (0-5) y retroalimentación a una entrega. |
| RF-CAL-02 | Calificación rápida | 🟡 Media | Vista tipo tabla donde se califican múltiples entregas de una actividad rápidamente. |
| RF-CAL-03 | Publicar notas | 🔴 Alta | Publicar notas de una actividad para que los estudiantes las vean. |
| RF-CAL-04 | Ver mis notas (estudiante) | 🔴 Alta | El estudiante ve sus notas publicadas por actividad y nota acumulada del curso. |
| RF-CAL-05 | Resumen de notas del curso | 🔴 Alta | El docente ve tabla resumen: estudiantes × actividades × notas × nota definitiva. |
| RF-CAL-06 | Exportar notas CSV | 🔴 Alta | Exportar tabla de notas definitivas en CSV compatible con sistema institucional. |
| RF-CAL-07 | Estadísticas de notas | 🟢 Baja | Promedio, mediana, distribución de notas por actividad y curso. |

### 6.8 Módulo de Prompts IA (RF-PRM)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-PRM-01 | Crear prompt | 🔴 Alta | El docente crea un prompt con título, contenido Markdown, tags. |
| RF-PRM-02 | Listar prompts | 🟡 Media | Ver todos los prompts organizados por curso y etiquetas. |
| RF-PRM-03 | Vincular prompt a actividad | 🟡 Media | Asociar un prompt a una actividad para que el estudiante lo encuentre en el detalle. |
| RF-PRM-04 | Gestionar plantillas | 🟢 Baja | Marcar prompts como plantilla y clonarlos para nuevas actividades. |
| RF-PRM-05 | Compartir prompt con estudiantes | 🔴 Alta | Los estudiantes ven el prompt vinculado a su actividad y pueden copiarlo. |

### 6.9 Módulo de Proyectos Estudiantiles (RF-PRY)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-PRY-01 | Registrar proyecto | 🔴 Alta | El estudiante registra su proyecto con nombre, GitHub URL, Vercel URL opcional. |
| RF-PRY-02 | Actualizar proyecto | 🟡 Media | Actualizar URLs y descripción del proyecto. |
| RF-PRY-03 | Listar proyectos del curso | 🔴 Alta | El docente ve todos los proyectos registrados por curso. |
| RF-PRY-04 | Vitrina pública | 🟡 Media | Página pública que muestra proyectos destacados como portafolio del semestre. |
| RF-PRY-05 | Destacar proyecto | 🟡 Media | El docente marca proyectos sobresalientes para la vitrina. |

### 6.10 Módulo de Configuración y Dashboard (RF-CFG)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|-----------|-------------|
| RF-CFG-01 | Dashboard admin | 🔴 Alta | Panel principal con: cursos activos, estadísticas, entregas pendientes, próximos vencimientos. |
| RF-CFG-02 | Dashboard estudiante | 🔴 Alta | Panel con: cursos inscritos, actividades pendientes, entregas realizadas, notas. |
| RF-CFG-03 | Configuración del sistema | 🟡 Media | Editar nombre de la app, tema, y otros ajustes desde `config.json`. |
| RF-CFG-04 | Información del semestre | 🟡 Media | Página con calendario, horarios de todos los cursos, fechas clave. |

---

## 7. Requerimientos No Funcionales

### 7.1 Rendimiento (RNF-PERF)

| ID | Requerimiento | Métrica |
|----|--------------|---------|
| RNF-PERF-01 | Tiempo de carga inicial | < 3 segundos en conexión 3G |
| RNF-PERF-02 | Tiempo de respuesta API | < 500ms para lectura de JSON |
| RNF-PERF-03 | Tamaño del bundle | < 200KB (gzipped) para primera carga |

### 7.2 Seguridad (RNF-SEG)

| ID | Requerimiento | Detalle |
|----|--------------|---------|
| RNF-SEG-01 | Contraseñas hasheadas | Nunca almacenar contraseñas en texto plano. Usar bcrypt o similar. |
| RNF-SEG-02 | Cookies HttpOnly | Tokens de sesión en cookies HttpOnly, Secure, SameSite=Strict. |
| RNF-SEG-03 | Validación de entrada | Toda entrada del usuario se valida con Zod antes de procesarse. |
| RNF-SEG-04 | Protección de rutas API | Middleware que verifica sesión y rol en cada Route Handler protegido. |
| RNF-SEG-05 | Sanitización de archivos | Validar tipo y tamaño de archivos subidos. Renombrar para evitar path traversal. |

### 7.3 Usabilidad (RNF-USA)

| ID | Requerimiento | Detalle |
|----|--------------|---------|
| RNF-USA-01 | Responsive design | Funcional en desktop, tablet y móvil. |
| RNF-USA-02 | Navegación intuitiva | Máximo 3 clics para llegar a cualquier función principal. |
| RNF-USA-03 | Feedback visual | Indicadores de carga, éxito y error en todas las operaciones. |
| RNF-USA-04 | Tema oscuro/claro | Soporte para ambos temas, controlado desde configuración. |

### 7.4 Mantenibilidad (RNF-MAN)

| ID | Requerimiento | Detalle |
|----|--------------|---------|
| RNF-MAN-01 | TypeScript estricto | `strict: true` en tsconfig. Cero `any`. |
| RNF-MAN-02 | Validación con Zod | Schemas de Zod para toda lectura/escritura de JSON. |
| RNF-MAN-03 | Documentación viva | Cada fase genera su resumen. El plan se mantiene actualizado. |
| RNF-MAN-04 | Estructura modular | Código organizado por dominios en carpetas claras. |

### 7.5 Disponibilidad (RNF-DIS)

| ID | Requerimiento | Detalle |
|----|--------------|---------|
| RNF-DIS-01 | Despliegue en Vercel | Deploy automático en cada push a `main`. |
| RNF-DIS-02 | Preview por PR | Cada Pull Request genera un preview en Vercel. |
| RNF-DIS-03 | Uptime objetivo | 99.9% (dependiente de Vercel). |

---

## 8. Casos de Uso Detallados

### CU-01: Iniciar Sesión

| Campo | Valor |
|-------|-------|
| **Actor** | Docente / Estudiante |
| **Precondición** | El usuario tiene una cuenta creada en el sistema |
| **Flujo principal** | 1. El usuario accede a `/login` <br> 2. Ingresa email y contraseña <br> 3. El sistema valida credenciales contra `users.json` <br> 4. Si son correctas, crea sesión en `sessions.json` y establece cookie <br> 5. Redirige al dashboard correspondiente al rol |
| **Flujo alternativo A** | Si `mustChangePassword: true`, redirige a `/change-password` antes del dashboard |
| **Flujo alternativo B** | Si credenciales incorrectas, muestra error "Email o contraseña incorrectos" (sin especificar cuál) |
| **Flujo alternativo C** | Si `isActive: false`, muestra "Cuenta desactivada. Contacte al administrador" |
| **Postcondición** | El usuario está autenticado y tiene sesión activa |

### CU-02: Inscribir Estudiante en Curso

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | El docente está autenticado. Existe al menos un curso activo. |
| **Flujo principal** | 1. El docente navega al curso → pestaña "Estudiantes" <br> 2. Hace clic en "Inscribir Estudiante" <br> 3. Completa el formulario: nombre, apellido, email, documento <br> 4. El sistema verifica si el email ya existe en `users.json` <br> 5a. Si NO existe: crea usuario con `role: student`, `password: hash(documento)`, `mustChangePassword: true` <br> 5b. Si YA existe: usa el usuario existente <br> 6. Crea registro en `enrollments.json` con `status: active` <br> 7. Muestra confirmación |
| **Flujo alternativo** | Si el estudiante ya está inscrito en ese curso, muestra "El estudiante ya está inscrito" |
| **Postcondición** | El estudiante aparece en la lista del curso y puede iniciar sesión |

### CU-03: Crear Actividad

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | El docente está autenticado. Existe un curso activo. |
| **Flujo principal** | 1. El docente navega al curso → pestaña "Actividades" <br> 2. Hace clic en "Nueva Actividad" <br> 3. Completa: título, descripción (Markdown), tipo, categoría, fecha límite, peso, nota máxima <br> 4. Opcionalmente adjunta archivos (PDF, imágenes) <br> 5. Opcionalmente vincula un prompt de IA <br> 6. Define si requiere archivo, enlace, o ambos <br> 7. Guarda como borrador (`draft`) o publica directamente |
| **Postcondición** | La actividad aparece en el listado del curso (visible para estudiantes solo si está publicada) |

### CU-04: Enviar Entrega (Submission)

| Campo | Valor |
|-------|-------|
| **Actor** | Estudiante |
| **Precondición** | El estudiante está inscrito en el curso. La actividad está publicada y no cerrada. La fecha actual es ≤ dueDate (o `allowLateSubmission: true`). |
| **Flujo principal** | 1. El estudiante navega a la actividad <br> 2. Ve la descripción, archivos adjuntos y prompt (si existe) <br> 3. Hace clic en "Enviar Entrega" <br> 4. Según la configuración de la actividad: <br> 4a. Sube archivo(s) si `requiresFileUpload: true` <br> 4b. Ingresa URL(s) si `requiresLinkSubmission: true` <br> 4c. Agrega comentario opcional <br> 5. Confirma el envío <br> 6. Sistema registra en `submissions.json` con `version: 1` |
| **Flujo alternativo A** | Si es después del `dueDate` y `allowLateSubmission: true`: se acepta con `isLate: true` |
| **Flujo alternativo B** | Si es después del `dueDate` y `allowLateSubmission: false`: muestra "Plazo vencido" |
| **Flujo alternativo C** | Si ya existe entrega previa: incrementa `version` y actualiza |
| **Postcondición** | La entrega aparece en el listado del docente y del estudiante |

### CU-05: Calificar Entrega

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | Existe al menos una entrega para la actividad. |
| **Flujo principal** | 1. El docente navega a la actividad → "Ver Entregas" <br> 2. Selecciona una entrega <br> 3. Revisa archivos, enlaces y comentarios del estudiante <br> 4. Asigna nota numérica (0-5) <br> 5. Escribe retroalimentación (opcional) <br> 6. Guarda la calificación en `grades.json` con `isPublished: false` |
| **Postcondición** | La nota queda registrada pero no visible para el estudiante hasta publicación |

### CU-06: Publicar Notas de una Actividad

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | Existen calificaciones registradas para la actividad. |
| **Flujo principal** | 1. El docente navega a la actividad → "Calificaciones" <br> 2. Revisa la tabla de notas <br> 3. Hace clic en "Publicar Notas" <br> 4. Confirma la acción <br> 5. Sistema actualiza `isPublished: true` y `publishedAt` en todas las notas de esa actividad |
| **Postcondición** | Los estudiantes pueden ver sus notas en la actividad |

### CU-07: Exportar Notas del Curso

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | El curso tiene actividades calificadas. |
| **Flujo principal** | 1. El docente navega al curso → "Notas" <br> 2. Ve la tabla resumen: filas = estudiantes, columnas = actividades, última columna = definitiva <br> 3. Hace clic en "Exportar CSV" <br> 4. Sistema calcula notas definitivas (promedio ponderado) <br> 5. Genera archivo CSV con formato: `Documento, Nombre, Apellido, Act1, Act2, ..., Definitiva` <br> 6. Se descarga automáticamente |
| **Postcondición** | El docente tiene un CSV listo para cargar al sistema institucional |

### CU-08: Registrar Proyecto Estudiantil

| Campo | Valor |
|-------|-------|
| **Actor** | Estudiante |
| **Precondición** | El estudiante está inscrito en un curso de tipo `programming` o `design`. |
| **Flujo principal** | 1. El estudiante navega al curso → "Mi Proyecto" <br> 2. Completa: nombre del proyecto, URL GitHub (obligatorio), URL Vercel (opcional), descripción <br> 3. Marca si desea que sea público en la vitrina <br> 4. Guarda en `projects.json` |
| **Postcondición** | El proyecto aparece en el listado del docente. Si es público y destacado, aparece en la vitrina. |

### CU-09: Gestionar Prompts de IA

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | El docente está autenticado. |
| **Flujo principal** | 1. El docente navega a "Prompts" desde el menú principal o desde un curso <br> 2. Hace clic en "Nuevo Prompt" <br> 3. Escribe título, contenido en Markdown, tags <br> 4. Opcionalmente lo marca como plantilla <br> 5. Guarda en `prompts.json` <br> 6. Puede vincularlo a una actividad existente |
| **Postcondición** | El prompt está disponible para vincularse a actividades |

### CU-10: Ver Dashboard Estudiante

| Campo | Valor |
|-------|-------|
| **Actor** | Estudiante |
| **Precondición** | El estudiante está autenticado e inscrito en al menos un curso. |
| **Flujo principal** | 1. Al iniciar sesión, ve su dashboard con: <br> 2. Lista de cursos inscritos con horarios <br> 3. Actividades pendientes (ordenadas por fecha límite) <br> 4. Últimas entregas realizadas con estado <br> 5. Notas publicadas recientes <br> 6. Puede navegar a cualquier curso haciendo clic |
| **Postcondición** | El estudiante tiene visibilidad completa de su estado académico |

### CU-11: Inscripción Masiva de Estudiantes

| Campo | Valor |
|-------|-------|
| **Actor** | Docente (Admin) |
| **Precondición** | El docente tiene un archivo CSV con la lista de estudiantes. |
| **Flujo principal** | 1. El docente navega al curso → "Estudiantes" → "Importar" <br> 2. Sube archivo CSV con columnas: nombre, apellido, email, documento <br> 3. Sistema valida el formato y muestra preview <br> 4. El docente confirma <br> 5. Sistema procesa cada fila: crea usuarios nuevos o vincula existentes <br> 6. Muestra resumen: X inscritos, Y ya existían, Z errores |
| **Postcondición** | Todos los estudiantes válidos están inscritos en el curso |

### CU-12: Cambiar Contraseña (Primer Login)

| Campo | Valor |
|-------|-------|
| **Actor** | Estudiante |
| **Precondición** | El estudiante acaba de iniciar sesión por primera vez (`mustChangePassword: true`). |
| **Flujo principal** | 1. Tras login exitoso, el sistema redirige a `/change-password` <br> 2. Muestra mensaje: "Por seguridad, debes cambiar tu contraseña" <br> 3. El estudiante ingresa nueva contraseña (mín. 8 caracteres) y confirmación <br> 4. Sistema actualiza `passwordHash` y `mustChangePassword: false` <br> 5. Redirige al dashboard |
| **Postcondición** | La contraseña ha sido actualizada. Próximos logins van directo al dashboard. |

---

## 9. Módulos del Sistema

### 9.1 Mapa de Módulos

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATAFORMA DOCENTE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐  │
│  │   AUTH     │  │ SEMESTRES │  │       CURSOS           │  │
│  │  Login     │  │  CRUD     │  │  CRUD + Horarios       │  │
│  │  Logout    │  │  Activar  │  │  Dashboard por curso   │  │
│  │  Password  │  │           │  │  Calendario            │  │
│  └───────────┘  └───────────┘  └────────────────────────┘  │
│                                                             │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │   ESTUDIANTES     │  │       ACTIVIDADES            │   │
│  │  Inscripción      │  │  CRUD + Archivos adjuntos    │   │
│  │  Import CSV       │  │  Vincular prompts            │   │
│  │  Listado + Perfil │  │  Publicar / Cerrar           │   │
│  └───────────────────┘  └──────────────────────────────┘   │
│                                                             │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │   ENTREGAS        │  │     CALIFICACIONES           │   │
│  │  Submit archivos  │  │  Calificar entregas          │   │
│  │  Submit enlaces   │  │  Publicar notas              │   │
│  │  Versionamiento   │  │  Exportar CSV                │   │
│  │  Historial        │  │  Estadísticas                │   │
│  └───────────────────┘  └──────────────────────────────┘   │
│                                                             │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │   PROMPTS IA      │  │   PROYECTOS ESTUDIANTILES    │   │
│  │  CRUD             │  │  Registro por estudiante     │   │
│  │  Plantillas       │  │  Listado por curso           │   │
│  │  Vincular a act.  │  │  Vitrina pública             │   │
│  └───────────────────┘  └──────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LANDING / VITRINA PÚBLICA               │  │
│  │  Home animado + Info cursos + Proyectos destacados   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Dependencias entre Módulos

```
AUTH ──────────────> Todos los módulos (prerequisito de acceso)
SEMESTRES ────────> CURSOS (un curso pertenece a un semestre)
CURSOS ───────────> ACTIVIDADES, ESTUDIANTES, PROYECTOS
ESTUDIANTES ──────> ENTREGAS, CALIFICACIONES
ACTIVIDADES ──────> ENTREGAS, PROMPTS
ENTREGAS ─────────> CALIFICACIONES
```

---

## 10. Estructura de Archivos JSON (Data Layer)

### 10.1 Estructura de la carpeta `/data`

```
📁 data/
├── 📄 config.json              # Configuración global de la app
├── 📄 home.json                # Contenido de la landing page
├── 📄 users.json               # Usuarios (admin + estudiantes)
├── 📄 sessions.json            # Sesiones activas
├── 📄 semesters.json           # Semestres académicos
├── 📄 courses.json             # Cursos por semestre
├── 📄 enrollments.json         # Inscripciones estudiante↔curso
├── 📄 activities.json          # Actividades por curso
├── 📄 submissions.json         # Entregas de estudiantes
├── 📄 grades.json              # Calificaciones
├── 📄 prompts.json             # Prompts de IA
├── 📄 projects.json            # Proyectos estudiantiles
├── 📄 README.md                # Documentación de la capa de datos
│
└── 📁 uploads/                 # Archivos subidos
    ├── 📁 activities/          # Material del docente por actividad
    │   ├── 📁 act-{id}/
    │   │   ├── guia.pdf
    │   │   └── rubrica.pdf
    │   └── ...
    └── 📁 submissions/         # Archivos de entregas por estudiante
        ├── 📁 sub-{id}/
        │   ├── informe.pdf
        │   └── presentacion.pptx
        └── ...
```

### 10.2 Archivo Inicial: `users.json`

```json
[
  {
    "id": "admin-001",
    "email": "docente@universidad.edu.co",
    "passwordHash": "$2b$10$...",
    "role": "admin",
    "mustChangePassword": false,
    "firstName": "Jhonatan",
    "lastName": "Docente",
    "documentNumber": "84459365",
    "phone": "",
    "isActive": true,
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z",
    "lastLoginAt": null
  }
]
```

### 10.3 Archivo Inicial: `semesters.json`

```json
[
  {
    "id": "202601",
    "label": "2026 - Primer Semestre",
    "startDate": "2026-02-01",
    "endDate": "2026-06-30",
    "isActive": true,
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
]
```

### 10.4 Archivo Inicial: `courses.json`

```json
[
  {
    "id": "course-log-202601",
    "code": "LOG-202601",
    "name": "Lógica y Programación",
    "description": "Fundamentos de lógica de programación aplicada al desarrollo fullstack con TypeScript, Next.js y Vercel.",
    "semesterId": "202601",
    "category": "programming",
    "schedule": [
      {
        "dayOfWeek": "lunes",
        "startTime": "08:00",
        "endTime": "10:00",
        "room": "Lab 301",
        "modality": "presencial"
      }
    ],
    "isActive": true,
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  },
  {
    "id": "course-dis-202601",
    "code": "DIS-202601",
    "name": "Diseño de Interfaces RA",
    "description": "Diseño de interfaces de usuario, experiencia de usuario y prototipado en proyectos fullstack.",
    "semesterId": "202601",
    "category": "design",
    "schedule": [
      {
        "dayOfWeek": "martes",
        "startTime": "10:00",
        "endTime": "12:00",
        "room": "Lab 205",
        "modality": "presencial"
      }
    ],
    "isActive": true,
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  },
  {
    "id": "course-ger-202601",
    "code": "GER-202601",
    "name": "Gerencia de Proyectos",
    "description": "Metodologías de gestión, liderazgo, planificación y seguimiento de proyectos de tecnología.",
    "semesterId": "202601",
    "category": "management",
    "schedule": [
      {
        "dayOfWeek": "miércoles",
        "startTime": "14:00",
        "endTime": "16:00",
        "room": "Aula 102",
        "modality": "presencial"
      }
    ],
    "isActive": true,
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
]
```

### 10.5 Consideraciones de Escritura en Vercel

> ⚠️ **IMPORTANTE**: Vercel es un entorno serverless con sistema de archivos **de solo lectura en producción**. Las escrituras a archivos JSON solo funcionan en desarrollo local.

**Soluciones para producción:**

| Opción | Complejidad | Descripción |
|--------|-------------|-------------|
| **A. Vercel KV / Blob** | Baja | Usar Vercel KV (Redis) o Vercel Blob para persistencia en producción |
| **B. API de GitHub** | Media | Hacer commits a los JSON del repo desde la API (los datos viven en Git) |
| **C. Servicio externo** | Media | Usar Supabase, Firebase, o Turso con la misma estructura |
| **D. Solo desarrollo local** | Ninguna | La aplicación escribe JSON solo en `npm run dev`, en producción es solo lectura |

**Recomendación**: Iniciar con **opción D** (desarrollo local) y migrar a **opción A** (Vercel KV/Blob) cuando se necesite persistencia en producción.

---

## 11. Arquitectura de Rutas (App Router)

### 11.1 Rutas Públicas

```
/                           → Landing page (vitrina pública)
/login                      → Formulario de login
/showcase                   → Vitrina de proyectos estudiantiles destacados
```

### 11.2 Rutas del Admin (Docente)

```
/admin                      → Dashboard del administrador
/admin/semesters            → Gestión de semestres
/admin/courses              → Listado de cursos
/admin/courses/[courseId]   → Dashboard del curso
/admin/courses/[courseId]/students      → Lista de estudiantes inscritos
/admin/courses/[courseId]/students/new  → Inscribir estudiante
/admin/courses/[courseId]/students/import → Inscripción masiva CSV
/admin/courses/[courseId]/activities           → Lista de actividades
/admin/courses/[courseId]/activities/new       → Crear actividad
/admin/courses/[courseId]/activities/[actId]   → Detalle de actividad
/admin/courses/[courseId]/activities/[actId]/submissions  → Ver entregas
/admin/courses/[courseId]/activities/[actId]/grades       → Calificar
/admin/courses/[courseId]/grades        → Resumen de notas del curso
/admin/courses/[courseId]/grades/export → Exportar CSV
/admin/courses/[courseId]/projects      → Proyectos del curso
/admin/prompts              → Gestión de prompts IA
/admin/prompts/new          → Crear prompt
/admin/prompts/[promptId]   → Editar prompt
/admin/settings             → Configuración del sistema
```

### 11.3 Rutas del Estudiante

```
/student                    → Dashboard del estudiante
/student/courses            → Mis cursos inscritos
/student/courses/[courseId]             → Vista del curso
/student/courses/[courseId]/activities  → Actividades del curso
/student/courses/[courseId]/activities/[actId]           → Detalle de actividad
/student/courses/[courseId]/activities/[actId]/submit    → Enviar entrega
/student/courses/[courseId]/grades     → Mis notas del curso
/student/courses/[courseId]/project    → Mi proyecto (registro/edición)
/student/profile            → Mi perfil
/student/change-password    → Cambiar contraseña
```

### 11.4 Rutas API (Route Handlers)

```
POST   /api/auth/login          → Iniciar sesión
POST   /api/auth/logout         → Cerrar sesión
POST   /api/auth/change-password → Cambiar contraseña
GET    /api/auth/me             → Datos del usuario actual

GET    /api/semesters           → Listar semestres
POST   /api/semesters           → Crear semestre
PUT    /api/semesters/[id]      → Editar semestre

GET    /api/courses             → Listar cursos (filtrar por semestre)
POST   /api/courses             → Crear curso
GET    /api/courses/[id]        → Detalle del curso
PUT    /api/courses/[id]        → Editar curso

GET    /api/courses/[id]/enrollments       → Listar inscritos
POST   /api/courses/[id]/enrollments       → Inscribir estudiante
POST   /api/courses/[id]/enrollments/bulk  → Inscripción masiva
DELETE /api/courses/[id]/enrollments/[enrollId] → Retirar estudiante

GET    /api/courses/[id]/activities        → Listar actividades
POST   /api/courses/[id]/activities        → Crear actividad
GET    /api/activities/[id]                → Detalle de actividad
PUT    /api/activities/[id]                → Editar actividad
POST   /api/activities/[id]/publish        → Publicar actividad

POST   /api/activities/[id]/submissions    → Enviar entrega
GET    /api/activities/[id]/submissions    → Listar entregas (admin)
GET    /api/submissions/[id]               → Detalle de entrega

POST   /api/grades                         → Calificar entrega
PUT    /api/grades/[id]                    → Editar calificación
POST   /api/activities/[id]/grades/publish → Publicar notas
GET    /api/courses/[id]/grades            → Resumen de notas del curso
GET    /api/courses/[id]/grades/export     → Exportar CSV

GET    /api/prompts                        → Listar prompts
POST   /api/prompts                        → Crear prompt
PUT    /api/prompts/[id]                   → Editar prompt

GET    /api/projects                       → Listar proyectos
POST   /api/projects                       → Registrar proyecto
PUT    /api/projects/[id]                  → Actualizar proyecto

POST   /api/upload                         → Subir archivo
GET    /api/upload/[...path]               → Descargar archivo

GET    /api/config                         → Configuración del sistema
PUT    /api/config                         → Editar configuración
```

---

## 12. Flujos de Comportamiento

### 12.1 Flujo de Inicio del Semestre

```
┌─────────────────┐
│ Admin crea       │
│ semestre 202601  │
└───────┬─────────┘
        ▼
┌─────────────────┐
│ Admin crea       │
│ 3 cursos         │
│ + horarios       │
└───────┬─────────┘
        ▼
┌─────────────────┐
│ Admin inscribe   │
│ estudiantes      │
│ (manual o CSV)   │
└───────┬─────────┘
        ▼
┌─────────────────┐     ┌─────────────────┐
│ Estudiantes      │────>│ Cambian          │
│ reciben email +  │     │ contraseña       │
│ doc como clave   │     │ primer login     │
└─────────────────┘     └───────┬─────────┘
                                ▼
                        ┌─────────────────┐
                        │ Ven sus cursos   │
                        │ y horarios       │
                        └─────────────────┘
```

### 12.2 Flujo de una Actividad Completa

```
┌──────────────────┐
│ Admin crea        │
│ actividad (draft) │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin adjunta     │
│ archivos + prompt │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin publica     │
│ actividad         │
└───────┬──────────┘
        ▼
┌──────────────────┐         ┌──────────────────┐
│ Estudiantes ven   │────────>│ Descargan         │
│ la actividad      │         │ material + prompt │
└───────┬──────────┘         └───────┬──────────┘
        │                            ▼
        │                    ┌──────────────────┐
        │                    │ Trabajan en la    │
        │                    │ actividad         │
        │                    └───────┬──────────┘
        │                            ▼
        │                    ┌──────────────────┐
        └───────────────────>│ Envían entrega    │
                             │ (archivos/links)  │
                             └───────┬──────────┘
                                     ▼
                             ┌──────────────────┐
                             │ Admin revisa      │
                             │ entregas          │
                             └───────┬──────────┘
                                     ▼
                             ┌──────────────────┐
                             │ Admin califica    │
                             │ + feedback        │
                             └───────┬──────────┘
                                     ▼
                             ┌──────────────────┐
                             │ Admin publica     │
                             │ notas             │
                             └───────┬──────────┘
                                     ▼
                             ┌──────────────────┐
                             │ Estudiantes ven   │
                             │ sus notas         │
                             └──────────────────┘
```

### 12.3 Flujo de Cierre del Semestre

```
┌──────────────────┐
│ Admin cierra      │
│ todas las         │
│ actividades       │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin califica    │
│ pendientes        │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin publica     │
│ TODAS las notas   │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin exporta     │
│ notas CSV por     │
│ cada curso        │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin carga CSV   │
│ al sistema        │
│ institucional     │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin destaca     │
│ proyectos         │
│ para vitrina      │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Admin desactiva   │
│ semestre           │
│ (queda histórico) │
└──────────────────┘
```

### 12.4 Flujo de Compartir Proyecto Fullstack (Lógica / Diseño)

```
┌──────────────────┐
│ Estudiante trabaja │
│ en su proyecto     │
│ fullstack con IA   │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Sube repo a       │
│ GitHub             │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Despliega en      │
│ Vercel             │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Registra URLs     │
│ en la plataforma  │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Docente revisa    │
│ proyecto live     │
│ + código GitHub   │
└───────┬──────────┘
        ▼
┌──────────────────┐
│ Docente califica  │
│ y opcionalmente   │
│ destaca proyecto  │
└──────────────────┘
```

---

## 13. Diseño de Interfaces (Wireframes Textuales)

### 13.1 Login (`/login`)

```
┌──────────────────────────────────────────┐
│            🎓 Plataforma Académica        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  📧 Email                          │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ tu-email@universidad.edu.co  │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  🔒 Contraseña                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ ••••••••••                   │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │      INICIAR SESIÓN          │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│        Fullstack TypeScript + Vercel      │
└──────────────────────────────────────────┘
```

### 13.2 Dashboard Admin (`/admin`)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 Plataforma Académica    Semestre: 202601    👤 Jhonatan ▼│
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│ 📊 Dashboard│  ┌─────────────────────────────────────────┐  │
│ 📚 Cursos   │  │ 📊 RESUMEN DEL SEMESTRE 202601          │  │
│ 👥 Estudiantes│ │                                         │  │
│ 📝 Prompts  │  │  3 Cursos activos                       │  │
│ ⚙️ Config   │  │  45 Estudiantes inscritos               │  │
│            │  │  12 Actividades programadas             │  │
│            │  │  8 Entregas pendientes de calificar     │  │
│            │  └─────────────────────────────────────────┘  │
│            │                                                │
│            │  ┌─────────────────────────────────────────┐  │
│            │  │ 📚 MIS CURSOS                            │  │
│            │  │                                         │  │
│            │  │ ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │
│            │  │ │ Lógica  │ │ Diseño  │ │ Gerencia │  │  │
│            │  │ │ y Prog. │ │ Int. RA │ │ de Proy. │  │  │
│            │  │ │ 15 est. │ │ 18 est. │ │ 12 est.  │  │  │
│            │  │ │ Lun 8-10│ │ Mar10-12│ │ Mié14-16 │  │  │
│            │  │ └─────────┘ └─────────┘ └──────────┘  │  │
│            │  └─────────────────────────────────────────┘  │
│            │                                                │
│            │  ┌─────────────────────────────────────────┐  │
│            │  │ ⏰ PRÓXIMOS VENCIMIENTOS                  │  │
│            │  │                                         │  │
│            │  │ • Proyecto Fase 2 (Lógica) - 20 Abr     │  │
│            │  │ • Prototipo UI (Diseño) - 22 Abr        │  │
│            │  │ • Plan de Proyecto (Gerencia) - 25 Abr   │  │
│            │  └─────────────────────────────────────────┘  │
└────────────┴────────────────────────────────────────────────┘
```

### 13.3 Dashboard Estudiante (`/student`)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 Plataforma Académica                    👤 María López ▼ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👋 Hola, María | Semestre 202601                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────┐    │
│  │ 📚 MIS CURSOS (2)     │  │ 🔔 PENDIENTES (3)       │    │
│  │                      │  │                         │    │
│  │ • Lógica y Prog.     │  │ ⚠️ Proyecto Fase 2       │    │
│  │   Lun 8:00-10:00     │  │   Vence: 20 Abr          │    │
│  │   Lab 301             │  │                         │    │
│  │                      │  │ ⚠️ Prototipo UI           │    │
│  │ • Diseño Int. RA     │  │   Vence: 22 Abr          │    │
│  │   Mar 10:00-12:00    │  │                         │    │
│  │   Lab 205             │  │ 📄 Análisis de caso      │    │
│  │                      │  │   Vence: 25 Abr          │    │
│  └──────────────────────┘  └─────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 MIS NOTAS RECIENTES                               │   │
│  │                                                     │   │
│  │ ✅ Proyecto Fase 1 (Lógica)    4.5 / 5.0            │   │
│  │ ✅ Wireframe Home (Diseño)     4.2 / 5.0            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 13.4 Vista de Actividad (Estudiante)

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Lógica y Programación > Actividades > Proyecto Fase 2    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📝 Proyecto Fullstack - Fase 2: Capa de Datos       │   │
│  │                                                     │   │
│  │ Tipo: Proyecto Individual                            │   │
│  │ Fecha límite: 20 de Abril 2026, 23:59               │   │
│  │ Peso: 20% | Nota máxima: 5.0                         │   │
│  │ Estado: 🟢 Abierta                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 DESCRIPCIÓN                                       │   │
│  │                                                     │   │
│  │ Implementar la capa de datos del proyecto usando     │   │
│  │ archivos JSON como base de datos. Seguir el prompt   │   │
│  │ proporcionado para ejecutar la fase con asistente IA.│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📎 MATERIAL ADJUNTO                                   │   │
│  │ 📄 guia-fase-2.pdf (245 KB)         [Descargar]      │   │
│  │ 📄 rubrica-evaluacion.pdf (120 KB)  [Descargar]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 PROMPT DE IA ASIGNADO                             │   │
│  │                                                     │   │
│  │ "Actúa como Ingeniero Fullstack Senior..."           │   │
│  │ [Ver prompt completo]  [📋 Copiar]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📤 MI ENTREGA                                        │   │
│  │                                                     │   │
│  │ Estado: Sin entregar                                 │   │
│  │                                                     │   │
│  │ ┌──────────────────────────────────────────────┐    │   │
│  │ │           ENVIAR ENTREGA                      │    │   │
│  │ └──────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 13.5 Tabla de Notas del Curso (Admin)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📚 Lógica y Programación > Notas                    [Exportar CSV] 📥   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────┐    │
│ │ Estudiante     │ Fase 1 │ Fase 2 │ Fase 3 │ Examen │ Definitiva│    │
│ │                │  (20%) │  (20%) │  (25%) │  (35%) │   (100%)  │    │
│ ├────────────────┼────────┼────────┼────────┼────────┼───────────┤    │
│ │ María López    │  4.5   │  4.2   │   -    │   -    │   4.34*   │    │
│ │ Carlos Ruiz    │  3.8   │  4.0   │   -    │   -    │   3.90*   │    │
│ │ Ana García     │  5.0   │   -    │   -    │   -    │   5.00*   │    │
│ │ Pedro Torres   │  2.5   │  3.5   │   -    │   -    │   3.00*   │    │
│ └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│ * Nota parcial (actividades pendientes no incluidas)                     │
│                                                                          │
│ 📊 Estadísticas: Promedio: 3.81 | Aprobados: 75% | Más alta: 5.0       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Plan de Fases de Implementación

### 14.1 Fase 6 — Autenticación y Sesiones
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2-3 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 6.1 | Crear `data/users.json` | Con usuario admin inicial (password hasheado) |
| 6.2 | Crear `data/sessions.json` | Array vacío inicial |
| 6.3 | Implementar lib de auth | `lib/auth.ts`: hashPassword, verifyPassword, createSession, validateSession |
| 6.4 | API `/api/auth/login` | POST: valida credenciales, crea sesión, establece cookie |
| 6.5 | API `/api/auth/logout` | POST: destruye sesión y cookie |
| 6.6 | API `/api/auth/me` | GET: retorna datos del usuario actual desde la cookie |
| 6.7 | API `/api/auth/change-password` | POST: cambiar contraseña |
| 6.8 | Middleware de protección | Verificar sesión en rutas privadas |
| 6.9 | Página `/login` | UI de login con formulario |
| 6.10 | Página `/change-password` | UI de cambio de contraseña |
| 6.11 | Tipos y validaciones Zod | Schemas para User, Session, LoginRequest, etc. |

### 14.2 Fase 7 — Gestión de Semestres y Cursos
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 7.1 | Crear `data/semesters.json` y `data/courses.json` | Con datos iniciales del 202601 |
| 7.2 | APIs de semestres | CRUD completo en `/api/semesters` |
| 7.3 | APIs de cursos | CRUD completo en `/api/courses` |
| 7.4 | Página admin de semestres | `/admin/semesters` |
| 7.5 | Página admin de cursos | `/admin/courses` con cards y horarios |
| 7.6 | Dashboard del curso | `/admin/courses/[id]` con resumen |
| 7.7 | Tipos y validaciones Zod | Schemas para Semester, Course, CourseSchedule |

### 14.3 Fase 8 — Inscripción de Estudiantes
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 8.1 | Crear `data/enrollments.json` | Array vacío inicial |
| 8.2 | API de inscripciones | CRUD en `/api/courses/[id]/enrollments` |
| 8.3 | Lógica de auto-creación de usuario | Si el email no existe, crear usuario con password = hash(documento) |
| 8.4 | Inscripción masiva | Endpoint de importación CSV `/api/courses/[id]/enrollments/bulk` |
| 8.5 | UI de inscripción individual | Formulario en `/admin/courses/[id]/students/new` |
| 8.6 | UI de importación CSV | Upload + preview + confirmación |
| 8.7 | Lista de estudiantes | Tabla con filtros y búsqueda |
| 8.8 | Perfil del estudiante | Vista detallada con cursos y entregas |

### 14.4 Fase 9 — Actividades y Material
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2-3 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 9.1 | Crear `data/activities.json` | Array vacío inicial |
| 9.2 | Sistema de upload de archivos | API `/api/upload` con validación de tipo y tamaño |
| 9.3 | API de actividades | CRUD completo con publicación y cierre |
| 9.4 | UI de creación de actividad | Formulario con upload de archivos y Markdown |
| 9.5 | UI de listado de actividades | Vista por curso con filtros por estado |
| 9.6 | UI de detalle de actividad | Descripción, archivos, prompt vinculado |
| 9.7 | Tipos y validaciones Zod | Schemas para Activity, ActivityAttachment |

### 14.5 Fase 10 — Entregas de Estudiantes
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 10.1 | Crear `data/submissions.json` | Array vacío inicial |
| 10.2 | API de entregas | Submit, re-submit, listar por actividad y por estudiante |
| 10.3 | Validación de plazos | Verificar dueDate, allowLateSubmission |
| 10.4 | UI de envío de entrega | Formulario con upload + enlaces + comentarios |
| 10.5 | UI de mis entregas (estudiante) | Listado con estados |
| 10.6 | UI de todas las entregas (admin) | Tabla con filtros por estado |
| 10.7 | Descarga de archivos | Endpoint para descarga segura |

### 14.6 Fase 11 — Calificaciones y Exportación
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 2-3 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 11.1 | Crear `data/grades.json` | Array vacío inicial |
| 11.2 | API de calificaciones | Calificar, editar, publicar masivas |
| 11.3 | Cálculo de nota definitiva | Promedio ponderado por peso de actividades |
| 11.4 | Exportación CSV | Generar archivo CSV con formato institucional |
| 11.5 | UI de calificación rápida | Vista tipo tabla para calificar en lote |
| 11.6 | UI de notas del estudiante | Vista con notas publicadas y acumulado |
| 11.7 | UI de resumen de notas del curso | Tabla pivote: estudiantes × actividades |
| 11.8 | Estadísticas básicas | Promedio, mediana, distribución |

### 14.7 Fase 12 — Prompts de IA
> **Rol**: Ingeniero Fullstack Senior
> **Duración estimada**: 1-2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 12.1 | Crear `data/prompts.json` | Array vacío o migrar prompts existentes de `doc/PROMPTS.md` |
| 12.2 | API de prompts | CRUD con versionamiento |
| 12.3 | Vinculación prompt ↔ actividad | Relación en actividades |
| 12.4 | UI de gestión de prompts (admin) | Editor Markdown con preview |
| 12.5 | UI de vista de prompt (estudiante) | Vista con botón de copiar |
| 12.6 | Sistema de plantillas | Clonar prompts para reutilizar |

### 14.8 Fase 13 — Proyectos Estudiantiles y Vitrina
> **Rol**: Diseñador UX/UI + Ingeniero Fullstack
> **Duración estimada**: 1-2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 13.1 | Crear `data/projects.json` | Array vacío inicial |
| 13.2 | API de proyectos | CRUD con validación de URLs |
| 13.3 | UI de registro de proyecto (estudiante) | Formulario con GitHub + Vercel URLs |
| 13.4 | UI de listado de proyectos (admin) | Tabla con links directos |
| 13.5 | Vitrina pública `/showcase` | Grid de proyectos destacados con cards |
| 13.6 | Feature de destacar proyecto | Admin marca `isFeatured: true` |

### 14.9 Fase 14 — Dashboards y Navegación
> **Rol**: Diseñador UX/UI
> **Duración estimada**: 2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 14.1 | Layout con sidebar (admin) | Navegación lateral con menú colapsable |
| 14.2 | Layout con navbar (estudiante) | Navegación superior limpia |
| 14.3 | Dashboard admin completo | Resumen con widgets y métricas |
| 14.4 | Dashboard estudiante completo | Cursos, pendientes, notas |
| 14.5 | Landing page pública actualizada | Información general + acceso a login + vitrina |
| 14.6 | Tema oscuro/claro | Toggle controlado desde `config.json` |
| 14.7 | Responsive design | Adaptación mobile-first |

### 14.10 Fase 15 — Pulido, Testing y Deploy
> **Rol**: Ingeniero Fullstack + QA
> **Duración estimada**: 1-2 sesiones

| # | Tarea | Detalle |
|---|-------|---------|
| 15.1 | Validación de todas las rutas | Verificar acceso por rol |
| 15.2 | Manejo de errores global | Error boundaries, páginas 404/500 |
| 15.3 | Feedback visual | Loading states, toasts, confirmaciones |
| 15.4 | Optimización de performance | Code splitting, lazy loading |
| 15.5 | Revisión de seguridad | Validación de inputs, sanitización |
| 15.6 | Deploy en Vercel | Configuración final de producción |
| 15.7 | Documentación final | Actualizar ESTADO_EJECUCION.md y resúmenes |

---

## 15. Estrategia de Seguridad

### 15.1 Autenticación

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Cliente    │────>│  /api/auth   │────>│ users.json   │
│  (Browser)   │     │  /login      │     │ (bcrypt)     │
└──────┬──────┘     └──────┬───────┘     └──────────────┘
       │                   │
       │  Cookie HttpOnly  │
       │<──────────────────┘
       │
       │   Cada request
       │──────────────────>│
       │                   │ Middleware valida
       │                   │ cookie → sessions.json
       │                   │
       │   200 / 401       │
       │<──────────────────┘
```

### 15.2 Hashing de Contraseñas

```typescript
// Usar bcryptjs (funciona en Edge/Serverless)
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

### 15.3 Validación de Archivos

| Validación | Regla |
|------------|-------|
| Tamaño máximo | 10 MB por archivo |
| Tipos permitidos (actividades) | PDF, DOCX, PPTX, XLSX, PNG, JPG, GIF, MD, TXT |
| Tipos permitidos (entregas) | PDF, DOCX, PPTX, XLSX, PNG, JPG, GIF, ZIP, MD, TXT |
| Renombrado | `{timestamp}-{uuid}-{sanitized-name}.{ext}` |
| Path traversal | Sanitizar nombre: eliminar `..`, `/`, `\`, caracteres especiales |

### 15.4 Protección de Rutas API

```typescript
// Middleware pattern para Route Handlers
export async function withAuth(
  request: Request,
  handler: (user: User) => Promise<Response>,
  requiredRole?: 'admin' | 'student'
): Promise<Response> {
  const session = await validateSession(request);
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });
  
  const user = await getUserById(session.userId);
  if (!user || !user.isActive) return Response.json({ error: 'Cuenta inactiva' }, { status: 403 });
  
  if (requiredRole && user.role !== requiredRole) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 });
  }
  
  return handler(user);
}
```

---

## 16. Integración con Proyectos Estudiantiles

### 16.1 Contexto
Los estudiantes de **Lógica y Programación** y **Diseño de Interfaces RA** desarrollan proyectos fullstack similares a esta misma plataforma, utilizando:
- Next.js + TypeScript
- Vercel para deploy
- GitHub para versionamiento
- Asistentes de IA (Copilot, Claude, etc.) con prompts guiados

### 16.2 Flujo de Trabajo con Prompts

```
 DOCENTE                          ESTUDIANTE
    │                                 │
    │ 1. Crea prompt en la            │
    │    plataforma                   │
    │                                 │
    │ 2. Vincula prompt a             │
    │    actividad                    │
    │                                 │
    │                                 │ 3. Ve la actividad y
    │                                 │    copia el prompt
    │                                 │
    │                                 │ 4. Pega el prompt en su
    │                                 │    sesión de IA
    │                                 │
    │                                 │ 5. Ejecuta las instrucciones
    │                                 │    del prompt en su proyecto
    │                                 │
    │                                 │ 6. Sube cambios a GitHub
    │                                 │    y despliega en Vercel
    │                                 │
    │                                 │ 7. Registra URLs del proyecto
    │                                 │    en la plataforma
    │                                 │
    │                                 │ 8. Envía la entrega con
    │                                 │    enlaces y archivos
    │                                 │
    │ 9. Revisa entrega:              │
    │    - Visita Vercel URL          │
    │    - Revisa código en GitHub    │
    │    - Lee documentación          │
    │                                 │
    │ 10. Califica y da feedback      │
    │                                 │
```

### 16.3 Información que los Estudiantes Comparten

| Dato | Obligatorio | Ejemplo |
|------|:-----------:|---------|
| URL del repositorio GitHub | ✅ | `https://github.com/estudiante/mi-proyecto` |
| URL del deploy en Vercel | 🟡 Recomendado | `https://mi-proyecto.vercel.app` |
| URL de Figma (Diseño) | 🟡 Según curso | `https://figma.com/file/...` |
| Plan de infraestructura (MD) | ✅ Para Lógica/Diseño | Archivo en `/doc/` del repo |
| Estado de ejecución (MD) | ✅ Para Lógica/Diseño | Archivo en `/doc/` del repo |
| Resúmenes de fases (MD) | 🟡 Recomendado | Archivos en `/doc/` del repo |

### 16.4 Uso desde Gerencia de Proyectos / Liderazgo

Para cursos no técnicos, la plataforma sirve como:

| Funcionalidad | Uso en Gerencia/Liderazgo |
|---------------|--------------------------|
| Actividades con archivos | Subir casos de estudio, lecturas, rúbricas |
| Entregas con archivos | Estudiantes suben informes, presentaciones, planes |
| Prompts (opcional) | Guías de IA para análisis de casos |
| Calificaciones + Export | Calificar y exportar al sistema institucional |
| Sin enlaces GitHub/Vercel | `requiresLinkSubmission: false` en estas actividades |

---

## 17. Roadmap Futuro

### 17.1 Corto Plazo (Semestre 202601)
- [x] Setup del proyecto (Fases 1-5)
- [ ] Autenticación y sesiones (Fase 6)
- [ ] Gestión de semestres y cursos (Fase 7)
- [ ] Inscripción de estudiantes (Fase 8)
- [ ] Actividades y material (Fase 9)
- [ ] Entregas de estudiantes (Fase 10)
- [ ] Calificaciones y exportación (Fase 11)
- [ ] Prompts de IA (Fase 12)
- [ ] Proyectos estudiantiles y vitrina (Fase 13)
- [ ] Dashboards y navegación (Fase 14)
- [ ] Deploy y pulido (Fase 15)

### 17.2 Mediano Plazo (Semestre 202602)
- [ ] Migrar persistencia a Vercel KV/Blob para producción
- [ ] Notificaciones por email (actividades publicadas, notas disponibles)
- [ ] Sistema de notificaciones in-app
- [ ] Recuperación de contraseña por email
- [ ] Búsqueda global (estudiantes, actividades, entregas)
- [ ] Historial de auditoría (quién hizo qué y cuándo)
- [ ] Reportes avanzados por curso y por estudiante
- [ ] Soporte para múltiples docentes (multi-tenancy básico)

### 17.3 Largo Plazo
- [ ] Integración con LMS institucional (Moodle, Canvas)
- [ ] API pública para que proyectos estudiantiles consuman datos
- [ ] Sistema de rúbricas detalladas por criterio
- [ ] Calificación asistida por IA (sugerencias basadas en rúbrica)
- [ ] Plugin de GitHub App para verificar commits y actividad
- [ ] Dashboard de métricas de uso de IA por estudiante
- [ ] Aplicación móvil (PWA o React Native)
- [ ] Soporte multi-idioma (i18n)

---

## 18. Glosario

| Término | Definición |
|---------|------------|
| **Actividad** | Tarea académica asignada por el docente dentro de un curso (proyecto, ejercicio, examen, etc.) |
| **Admin** | Usuario con rol de administrador. En esta plataforma es el docente titular. |
| **App Router** | Sistema de enrutamiento de Next.js basado en la estructura de carpetas en `/app`. |
| **Entrega (Submission)** | Respuesta del estudiante a una actividad. Puede incluir archivos, enlaces y comentarios. |
| **Enrollment** | Registro de inscripción que vincula un estudiante con un curso. |
| **JSON as DB** | Patrón arquitectónico donde archivos JSON reemplazan una base de datos convencional. |
| **Prompt** | Instrucción estructurada diseñada para guiar a un asistente de IA en la ejecución de una tarea. |
| **Route Handler** | Función serverless de Next.js que maneja peticiones HTTP en `/app/api/`. |
| **Semestre** | Periodo académico que agrupa cursos. Formato: `YYYYSS` (ej: 202601). |
| **Vitrina** | Página pública que muestra proyectos estudiantiles destacados como portafolio. |
| **Vercel** | Plataforma de despliegue serverless donde se hospeda la aplicación. |
| **Zod** | Librería de validación de schemas en TypeScript usada para validar datos JSON. |

---

## 📌 Notas Finales

1. **Este plan es vivo**: Se actualiza conforme avanza la implementación. Cada fase genera su propio resumen.
2. **Prioridad es funcionalidad**: Primero que funcione, después que sea bonito, después que sea óptimo.
3. **Los datos son el centro**: La carpeta `/data` es la fuente de verdad. Todo CRUD lee y escribe JSON.
4. **Seguridad pragmática**: Hashing de passwords, cookies HttpOnly, validación Zod. Sin over-engineering.
5. **El proyecto ES el producto**: Esta plataforma se usa para enseñar cómo se construyen plataformas.

---

> **Última actualización**: 16 de Abril de 2026
> **Autor**: Plan generado con asistencia de IA como parte del proceso de desarrollo del proyecto.

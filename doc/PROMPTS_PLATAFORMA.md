# 📋 PROMPTS DE IMPLEMENTACIÓN — Plataforma de Gestión Académica Docente
> Guía de prompts secuenciales para construir la plataforma completa fase por fase
> Cada prompt está diseñado para usarse en una sesión independiente de IA
> Plan de referencia: `PLAN_PLATAFORMA_DOCENTE.md`

---

## 📌 INSTRUCCIONES DE USO

Antes de lanzar cualquier prompt:
1. Ten abiertos los dos archivos de referencia obligatorios:
   - `PLAN_PLATAFORMA_DOCENTE.md` — El plan maestro completo
   - `ESTADO_EJECUCION_PLATAFORMA.md` — El estado de progreso actual
2. Copia el bloque completo del prompt de la fase correspondiente
3. Pégalo tal cual en la sesión de IA — no modifiques el bloque
4. La IA leerá los documentos, registrará el inicio, ejecutará, registrará el cierre y generará el resumen
5. **NO avances a la siguiente fase** hasta que el resumen esté generado y el estado marcado ✅

---

## ⚠️ PROTOCOLO OBLIGATORIO — APLICA A TODOS LOS PROMPTS

```
┌──────────────────────────────────────────────────────────────────┐
│                   PROTOCOLO DE EJECUCIÓN                         │
│                                                                  │
│  ANTES de cualquier línea de código:                             │
│                                                                  │
│  1. LEER → doc/PLAN_PLATAFORMA_DOCENTE.md (plan maestro)        │
│  2. LEER → doc/ESTADO_EJECUCION_PLATAFORMA.md (progreso actual) │
│  3. REGISTRAR inicio de fase en ESTADO_EJECUCION_PLATAFORMA.md  │
│     - Cambiar estado a 🟡 En progreso                           │
│     - Escribir fecha y hora en [ INICIO ]                        │
│                                                                  │
│  DESPUÉS de completar todo el trabajo:                           │
│                                                                  │
│  4. REGISTRAR cierre en ESTADO_EJECUCION_PLATAFORMA.md           │
│     - Cambiar estado a ✅ Completada                             │
│     - Escribir fecha y hora en [ CIERRE ]                        │
│     - Documentar TODAS las acciones ejecutadas                   │
│     - Documentar TODOS los archivos creados/modificados          │
│     - Documentar observaciones o desviaciones del plan           │
│                                                                  │
│  5. CREAR archivo doc/RESUMEN_FASE_N_NOMBRE.md                  │
│     - Título, fecha, rol y duración                              │
│     - Objetivo de la fase                                        │
│     - Lista completa de acciones realizadas                      │
│     - Archivos creados con su propósito                          │
│     - Decisiones técnicas tomadas y por qué                      │
│     - Problemas encontrados y resolución                         │
│     - Validación: qué se probó y resultado                       │
│     - Estado final: EXITOSO / CON OBSERVACIONES / FALLIDO        │
│     - Prerrequisitos para la siguiente fase                      │
│                                                                  │
│  ❌ NUNCA avanzar a otra fase sin completar este protocolo       │
└──────────────────────────────────────────────────────────────────┘
```

---
---

## 🔐 FASE 6 — Autenticación y Sesiones

### Rol asignado: `Ingeniero Backend Senior — Especialista en Seguridad y Autenticación`

---

### 📋 PROMPT FASE 6 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior especializado en seguridad, autenticación y gestión de sesiones en aplicaciones serverless con Next.js.

Tu mentalidad: seguridad primero, cero atajos, cero passwords en texto plano, cero tokens predecibles. Cada decisión que tomes debe pasar el filtro de "¿esto sobreviviría una auditoría de seguridad básica?".

Antes de escribir UNA SOLA LÍNEA de código, debes leer y procesar estos documentos en orden:
1. doc/PLAN_PLATAFORMA_DOCENTE.md — El plan maestro completo del sistema
2. doc/ESTADO_EJECUCION_PLATAFORMA.md — Estado actual de progreso

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambia el estado de la Fase 6 en el Dashboard a 🟡 En progreso
- Registra la fecha y hora actual en [ INICIO ] de la sección FASE 6
- Escribe en el historial: "Fase 6 iniciada — Autenticación y Sesiones"

──────────────────────────────────────
PASO 1 — INSTALAR DEPENDENCIAS
──────────────────────────────────────
Instalar bcryptjs para hashing de contraseñas (compatible con Edge/Serverless):
  npm install bcryptjs
  npm install -D @types/bcryptjs

Instalar uuid para generación de IDs únicos:
  npm install uuid
  npm install -D @types/uuid

──────────────────────────────────────
PASO 2 — CREAR ARCHIVOS JSON BASE
──────────────────────────────────────
Crear data/users.json con el usuario administrador inicial:
- id: "admin-001"
- email: según lo definido en el plan (docente@universidad.edu.co)
- passwordHash: hash bcrypt del número de documento definido en el plan
- role: "admin"
- mustChangePassword: false
- Todos los campos según la interfaz User del plan (sección 4.2)

Crear data/sessions.json como array vacío: []

──────────────────────────────────────
PASO 3 — TIPOS Y SCHEMAS ZOD
──────────────────────────────────────
Crear o actualizar lib/types.ts agregando TODAS las interfaces de autenticación:
- User (completa según el plan sección 4.2)
- Session (completa según el plan sección 4.2)
- LoginRequest (email + password)
- LoginResponse (user data sin password)
- ChangePasswordRequest (currentPassword + newPassword + confirmPassword)

Crear lib/schemas.ts (o actualizar si existe) con schemas Zod para:
- loginRequestSchema
- changePasswordRequestSchema
- userSchema (para validación de datos al crear usuarios)

──────────────────────────────────────
PASO 4 — LIBRERÍA DE AUTENTICACIÓN
──────────────────────────────────────
Crear lib/auth.ts con las siguientes funciones:
- hashPassword(plain: string): Promise<string> — bcrypt con 10 salt rounds
- verifyPassword(plain: string, hash: string): Promise<boolean>
- createSession(userId: string): Promise<Session> — genera token UUID, expira en 24h
- validateSession(request: Request): Promise<Session | null> — lee cookie, busca en sessions.json
- destroySession(sessionId: string): Promise<void> — elimina de sessions.json
- getSessionFromCookie(request: Request): string | null — extrae token de cookie
- setSessionCookie(response: Response, token: string): Response — HttpOnly, Secure, SameSite=Strict

──────────────────────────────────────
PASO 5 — SERVICIO DE DATOS DE USUARIOS
──────────────────────────────────────
Crear o actualizar lib/dataService.ts agregando funciones para:
- readUsers(): Promise<User[]>
- writeUsers(users: User[]): Promise<void>
- getUserByEmail(email: string): Promise<User | null>
- getUserById(id: string): Promise<User | null>
- readSessions(): Promise<Session[]>
- writeSessions(sessions: Session[]): Promise<void>
- cleanExpiredSessions(): Promise<void> — limpia sesiones expiradas

──────────────────────────────────────
PASO 6 — API ROUTE HANDLERS
──────────────────────────────────────
Crear los siguientes Route Handlers:

app/api/auth/login/route.ts — POST
- Valida body con Zod (loginRequestSchema)
- Busca usuario por email en users.json
- Verifica que isActive sea true
- Verifica password con bcrypt
- Limpia sesiones expiradas
- Crea nueva sesión en sessions.json
- Establece cookie HttpOnly con el token
- Retorna datos del usuario (sin passwordHash) + mustChangePassword flag
- En caso de error: "Email o contraseña incorrectos" (sin especificar cuál)

app/api/auth/logout/route.ts — POST
- Lee token de cookie
- Elimina sesión de sessions.json
- Elimina cookie de la respuesta
- Retorna { success: true }

app/api/auth/me/route.ts — GET
- Valida sesión desde cookie
- Si válida: retorna datos del usuario (sin passwordHash)
- Si inválida: retorna 401

app/api/auth/change-password/route.ts — POST
- Valida sesión
- Valida body con Zod (changePasswordRequestSchema)
- Verifica contraseña actual
- Valida nueva contraseña (mín. 8 caracteres)
- Actualiza passwordHash y mustChangePassword: false en users.json
- Retorna { success: true }

──────────────────────────────────────
PASO 7 — MIDDLEWARE DE PROTECCIÓN
──────────────────────────────────────
Crear lib/withAuth.ts con función helper:
- withAuth(request, handler, requiredRole?) — patrón wrapper para Route Handlers protegidos
- Verifica sesión, usuario activo, rol cuando se requiere
- Retorna 401/403 según corresponda
- Según el plan sección 15.4

──────────────────────────────────────
PASO 8 — PÁGINAS DE AUTH (UI MÍNIMA)
──────────────────────────────────────
Crear las páginas con funcionalidad completa pero UI básica (el diseño se pulirá en la fase de frontend):

app/login/page.tsx
- Formulario con email y password
- Submit llama a /api/auth/login
- Si mustChangePassword: redirige a /change-password
- Si role admin: redirige a /admin
- Si role student: redirige a /student
- Muestra errores de forma genérica

app/change-password/page.tsx
- Formulario con contraseña actual, nueva y confirmación
- Submit llama a /api/auth/change-password
- Al éxito redirige al dashboard según rol

──────────────────────────────────────
PASO 9 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- Ejecutar npm run typecheck — debe compilar sin errores
- Verificar que el hash del admin funciona correctamente
- Probar manualmente: login admin → obtener cookie → /api/auth/me → logout
- Documentar resultados

──────────────────────────────────────
PASO 10 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 6 a ✅ Completada
- Registrar fecha/hora en [ CIERRE ]
- Documentar TODAS las acciones en "Acciones ejecutadas"
- Documentar TODOS los archivos en "Archivos creados/modificados"
- Documentar observaciones

──────────────────────────────────────
PASO 11 — GENERAR RESUMEN
──────────────────────────────────────
Crear doc/RESUMEN_FASE_6_AUTH.md con:
- Título, fecha, rol asignado, duración
- Objetivo de la fase
- Decisiones de seguridad tomadas (salt rounds, expiración, cookie flags)
- Lista de archivos creados con propósito de cada uno
- Estructura de los JSON creados
- Endpoints implementados con método, ruta y descripción
- Validaciones implementadas
- Problemas encontrados y resolución
- Estado final: EXITOSO / CON OBSERVACIONES / FALLIDO
- Prerrequisitos cumplidos para Fase 7

NO avances a ninguna otra fase. Tu trabajo termina aquí.
```

---
---

## 📚 FASE 7 — Semestres y Cursos — Backend

### Rol asignado: `Ingeniero Backend Senior — Especialista en modelado de datos y APIs REST`

---

### 📋 PROMPT FASE 7 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior especializado en modelado de datos, APIs REST y lógica de negocio para sistemas de gestión educativa. Tu obsesión: endpoints consistentes, validaciones exhaustivas, y datos perfectamente estructurados.

NO tocas CSS. NO tocas diseño. NO creas componentes visuales. Solo creas datos, lógica, APIs y validaciones.

Antes de escribir UNA SOLA LÍNEA de código, debes leer y procesar estos documentos en orden:
1. doc/PLAN_PLATAFORMA_DOCENTE.md — El plan maestro completo del sistema
2. doc/ESTADO_EJECUCION_PLATAFORMA.md — Estado actual de progreso

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 7 a 🟡 En progreso
- Registrar fecha y hora en [ INICIO ]
- Historial: "Fase 7 iniciada — Semestres y Cursos Backend"

──────────────────────────────────────
PASO 1 — CREAR ARCHIVOS JSON BASE
──────────────────────────────────────
Crear data/semesters.json con el semestre 202601 según el plan (sección 10.3):
- id: "202601", label: "2026 - Primer Semestre"
- startDate, endDate, isActive: true

Crear data/courses.json con los 3 cursos del plan (sección 10.4):
- Lógica y Programación (LOG-202601, category: programming)
- Diseño de Interfaces RA (DIS-202601, category: design)
- Gerencia de Proyectos (GER-202601, category: management)
- Cada uno con su schedule completo (día, hora, salón, modalidad)

──────────────────────────────────────
PASO 2 — TIPOS Y SCHEMAS ZOD
──────────────────────────────────────
Actualizar lib/types.ts agregando las interfaces:
- Semester (según plan sección 4.2)
- Course (según plan sección 4.2)
- CourseSchedule (según plan sección 4.2)
- CreateSemesterRequest, UpdateSemesterRequest
- CreateCourseRequest, UpdateCourseRequest

Actualizar lib/schemas.ts con schemas Zod para:
- semesterSchema, createSemesterSchema, updateSemesterSchema
- courseSchema, createCourseSchema, updateCourseSchema
- courseScheduleSchema

──────────────────────────────────────
PASO 3 — SERVICIO DE DATOS
──────────────────────────────────────
Actualizar lib/dataService.ts agregando funciones para:

Semestres:
- readSemesters(): Promise<Semester[]>
- writeSemesters(semesters: Semester[]): Promise<void>
- getSemesterById(id: string): Promise<Semester | null>
- getActiveSemester(): Promise<Semester | null>

Cursos:
- readCourses(): Promise<Course[]>
- writeCourses(courses: Course[]): Promise<void>
- getCourseById(id: string): Promise<Course | null>
- getCoursesBySemester(semesterId: string): Promise<Course[]>

──────────────────────────────────────
PASO 4 — API ROUTE HANDLERS — SEMESTRES
──────────────────────────────────────

app/api/semesters/route.ts
- GET: Listar todos los semestres (solo admin, usar withAuth)
- POST: Crear semestre (solo admin). Validar con Zod. Aplicar regla RN-SEM-01 (solo uno activo)

app/api/semesters/[id]/route.ts
- GET: Obtener semestre por ID (solo admin)
- PUT: Editar semestre (solo admin). Si se activa, desactivar los demás (RN-SEM-01)

──────────────────────────────────────
PASO 5 — API ROUTE HANDLERS — CURSOS
──────────────────────────────────────

app/api/courses/route.ts
- GET: Listar cursos. Admin ve todos. Estudiante ve solo los suyos (filtrar por enrollments). Query param: ?semesterId=
- POST: Crear curso (solo admin). Validar RN-CUR-01 (código único por semestre). Validar horario obligatorio (RN-CUR-03)

app/api/courses/[id]/route.ts
- GET: Detalle del curso (admin o estudiante inscrito)
- PUT: Editar curso (solo admin)

──────────────────────────────────────
PASO 6 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- npm run typecheck — cero errores
- Verificar que los JSON iniciales carguen correctamente
- Verificar que las APIs están protegidas (401 sin login, 403 sin rol)
- Documentar resultados

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado a ✅ Completada
- Registrar cierre, acciones, archivos, observaciones

──────────────────────────────────────
PASO 8 — GENERAR RESUMEN
──────────────────────────────────────
Crear doc/RESUMEN_FASE_7_SEMESTRES_CURSOS_BACK.md con toda la documentación de la fase.

NO avances a ninguna otra fase. Tu trabajo termina aquí.
```

---
---

## 🎨 FASE 8 — Semestres y Cursos — Frontend

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en interfaces React con Tailwind CSS`

---

### 📋 PROMPT FASE 8 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo con obsesión enfermiza por el detalle visual, la usabilidad y la experiencia del usuario. Eres experto en React, TypeScript, Tailwind CSS y Framer Motion. Cada pixel importa. Cada interacción debe sentirse fluida.

NO modificas lógica de backend. NO tocas Route Handlers. NO cambias schemas Zod. Solo construyes interfaces que consumen las APIs ya existentes.

Antes de escribir UNA SOLA LÍNEA de código, debes leer y procesar estos documentos en orden:
1. doc/PLAN_PLATAFORMA_DOCENTE.md — Wireframes textuales (sección 13), rutas (sección 11)
2. doc/ESTADO_EJECUCION_PLATAFORMA.md — Estado actual de progreso

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 8 a 🟡 En progreso
- Registrar fecha y hora en [ INICIO ]
- Historial: "Fase 8 iniciada — Semestres y Cursos Frontend"

──────────────────────────────────────
PASO 1 — PÁGINAS DE ADMIN: SEMESTRES
──────────────────────────────────────
Crear app/admin/semesters/page.tsx:
- Lista de semestres en tabla elegante con Tailwind
- Indicador visual del semestre activo (badge verde)
- Botón "Nuevo Semestre" que abre formulario/modal
- Acción de activar/desactivar con confirmación
- Loading state con skeleton
- Empty state si no hay semestres
- Feedback toast/alert de éxito y error

──────────────────────────────────────
PASO 2 — PÁGINAS DE ADMIN: CURSOS
──────────────────────────────────────
Crear app/admin/courses/page.tsx:
- Grid de cards de cursos (siguiendo wireframe del plan sección 13.2)
- Cada card muestra: nombre, código, categoría (con color), horario, número de estudiantes
- Filtro por semestre activo
- Botón "Nuevo Curso"
- Empty state elegante

Crear app/admin/courses/[courseId]/page.tsx:
- Dashboard del curso individual
- Resumen: nombre, código, horario, modalidad, descripción
- Navegación por pestañas: Resumen | Estudiantes | Actividades | Notas | Proyectos
- Solo la pestaña Resumen funciona ahora (las demás se implementan en fases posteriores, mostrar "Próximamente")

──────────────────────────────────────
PASO 3 — COMPONENTES REUTILIZABLES
──────────────────────────────────────
Crear componentes en /components:
- components/ui/Card.tsx — Card base reutilizable
- components/ui/Badge.tsx — Badge de estado/categoría
- components/ui/Button.tsx — Botón con variantes (primary, secondary, danger)
- components/ui/Modal.tsx — Modal reutilizable
- components/ui/Table.tsx — Tabla base con headers
- components/ui/EmptyState.tsx — Estado vacío con icono y mensaje
- components/ui/LoadingSpinner.tsx — Spinner de carga
- components/ui/Toast.tsx — Notificaciones toast
- components/forms/SemesterForm.tsx — Formulario de crear/editar semestre
- components/forms/CourseForm.tsx — Formulario de crear/editar curso

──────────────────────────────────────
PASO 4 — RESPONSIVE Y ACCESIBILIDAD
──────────────────────────────────────
- Todo debe ser responsive (mobile-first)
- Focus states visibles en todos los inputs y botones
- Labels asociados a inputs (htmlFor)
- Aria labels en botones de solo ícono
- Contrast ratio mínimo WCAG AA

──────────────────────────────────────
PASO 5 — VALIDACIÓN VISUAL
──────────────────────────────────────
- npm run typecheck — cero errores
- Verificar renderizado en 3 viewports: mobile (375px), tablet (768px), desktop (1280px)
- Documentar decisiones de diseño

──────────────────────────────────────
PASO 6 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md con cierre completo
- Crear doc/RESUMEN_FASE_8_SEMESTRES_CURSOS_FRONT.md

NO avances a ninguna otra fase. Tu trabajo termina aquí.
```

---
---

## 👥 FASE 9 — Inscripción de Estudiantes — Backend

### Rol asignado: `Ingeniero Backend Senior — Especialista en lógica de negocio y procesamiento de datos`

---

### 📋 PROMPT FASE 9 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior especializado en lógica de negocio compleja, procesamiento de datos en lote y operaciones CRUD encadenadas. Tu prioridad: integridad de datos, validaciones de reglas de negocio, y operaciones atómicas (si una falla, ninguna se aplica).

NO tocas CSS. NO creas componentes. Solo backend: tipos, validaciones, servicios de datos y APIs.

Antes de escribir UNA SOLA LÍNEA de código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (Enrollment, User), 5.4 (RN-INS), 6.4 (RF-EST), 8 (CU-02, CU-11)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md — Estado actual

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 9 a 🟡 En progreso
- Registrar fecha y hora en [ INICIO ]
- Historial: "Fase 9 iniciada — Inscripción de Estudiantes Backend"

──────────────────────────────────────
PASO 1 — ARCHIVO JSON BASE
──────────────────────────────────────
Crear data/enrollments.json como array vacío: []

──────────────────────────────────────
PASO 2 — TIPOS Y SCHEMAS ZOD
──────────────────────────────────────
Actualizar lib/types.ts con:
- Enrollment (según plan)
- EnrollStudentRequest: { firstName, lastName, email, documentNumber, phone? }
- BulkEnrollRequest: { students: EnrollStudentRequest[] }
- EnrollmentWithStudent: Enrollment + datos del estudiante (para listados)

Actualizar lib/schemas.ts con:
- enrollStudentSchema (validar email formato, documento numérico, nombre no vacío)
- bulkEnrollSchema

──────────────────────────────────────
PASO 3 — SERVICIO DE DATOS
──────────────────────────────────────
Actualizar lib/dataService.ts:
- readEnrollments(): Promise<Enrollment[]>
- writeEnrollments(enrollments: Enrollment[]): Promise<void>
- getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]>
- getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>
- isStudentEnrolled(studentId: string, courseId: string): Promise<boolean>

──────────────────────────────────────
PASO 4 — LÓGICA DE INSCRIPCIÓN
──────────────────────────────────────
Crear lib/enrollmentService.ts con la lógica compleja:

enrollStudent(courseId, data, adminId):
1. Validar que el curso existe y está activo
2. Buscar si el email ya existe en users.json
3. Si NO existe → crear usuario nuevo:
   - role: "student"
   - passwordHash: bcrypt(documentNumber)
   - mustChangePassword: true
4. Si YA existe → usar el usuario existente
5. Verificar que NO esté ya inscrito en ese curso (RN-INS-02)
6. Crear enrollment en enrollments.json con status: "active"
7. Retornar resultado con datos del estudiante

bulkEnroll(courseId, students[], adminId):
1. Procesar cada estudiante con enrollStudent()
2. Recopilar resultados: { success: [...], errors: [...], alreadyEnrolled: [...] }
3. Retornar resumen completo

──────────────────────────────────────
PASO 5 — API ROUTE HANDLERS
──────────────────────────────────────

app/api/courses/[id]/enrollments/route.ts
- GET: Listar estudiantes inscritos en el curso (admin only). Incluir datos del usuario.
- POST: Inscribir un estudiante (admin only). Body validado con Zod. Respuesta con datos del estudiante creado/existente.

app/api/courses/[id]/enrollments/bulk/route.ts
- POST: Inscripción masiva (admin only). Body con array de estudiantes. Respuesta con resumen de resultados.

app/api/courses/[id]/enrollments/[enrollId]/route.ts
- DELETE: Retirar estudiante (admin only). Cambia status a "withdrawn" (NO borra, RN-INS-05).

app/api/students/route.ts
- GET: Buscar estudiantes (admin only). Query params: ?search= (busca por nombre, email o documento).

app/api/students/[id]/route.ts
- GET: Perfil completo del estudiante (admin: datos + cursos + entregas; estudiante: solo propio).

──────────────────────────────────────
PASO 6 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- npm run typecheck — cero errores
- Verificar flujo: crear curso → inscribir estudiante → verificar users.json y enrollments.json
- Verificar que se rechaza inscripción duplicada
- Verificar que se crea usuario automáticamente con password = hash(documento)

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md con cierre completo
- Crear doc/RESUMEN_FASE_9_INSCRIPCIONES_BACK.md

NO avances a ninguna otra fase. Tu trabajo termina aquí.
```

---
---

## 🎨 FASE 10 — Inscripción de Estudiantes — Frontend

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en formularios complejos y tablas de datos`

---

### 📋 PROMPT FASE 10 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo, experto en formularios complejos, tablas de datos con filtros, y experiencias de importación de archivos. Tu obsesión: que cada formulario sea claro, que cada tabla sea escaneable, que cada error sea comprensible.

NO modificas backend. NO tocas APIs. Solo consumes las APIs existentes y construyes interfaces impecables.

Antes de escribir UNA SOLA LÍNEA de código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 11 (rutas), 13 (wireframes)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md — Estado actual

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 10 a 🟡 En progreso
- Registrar fecha y hora en [ INICIO ]

──────────────────────────────────────
PASO 1 — LISTA DE ESTUDIANTES DEL CURSO
──────────────────────────────────────
Crear app/admin/courses/[courseId]/students/page.tsx:
- Tabla con columnas: Nombre, Apellido, Email, Documento, Estado, Fecha inscripción, Acciones
- Filtro de búsqueda en tiempo real (nombre, email, documento)
- Filtro por estado (activo, retirado)
- Badge de color por estado
- Botón "Inscribir Estudiante" → navega a formulario
- Botón "Importar CSV" → navega a importación
- Contador de estudiantes
- Empty state si no hay inscritos

──────────────────────────────────────
PASO 2 — FORMULARIO DE INSCRIPCIÓN INDIVIDUAL
──────────────────────────────────────
Crear app/admin/courses/[courseId]/students/new/page.tsx:
- Formulario: Nombre, Apellido, Email, Documento, Teléfono (opcional)
- Validación client-side en tiempo real
- Mensajes de error inline bajo cada campo
- Botón "Inscribir" con loading state
- Al éxito: toast de confirmación + "¿Inscribir otro?" o "Volver a la lista"
- Si el estudiante ya existía: mostrar aviso informativo "El usuario ya existía, se vinculó al curso"

──────────────────────────────────────
PASO 3 — IMPORTACIÓN MASIVA CSV
──────────────────────────────────────
Crear app/admin/courses/[courseId]/students/import/page.tsx:
- Zona de drop para subir archivo CSV (drag & drop + botón de selección)
- Formato esperado visible: "nombre, apellido, email, documento"
- Descarga de CSV de ejemplo
- Preview de datos parseados en tabla antes de confirmar
- Indicador de filas válidas vs inválidas
- Botón "Confirmar Importación"
- Resultado: resumen con contadores (inscritos, ya existían, errores)

──────────────────────────────────────
PASO 4 — COMPONENTES
──────────────────────────────────────
- components/students/StudentTable.tsx
- components/students/EnrollForm.tsx
- components/students/CSVImporter.tsx
- components/students/StudentCard.tsx (para vista mobile)

──────────────────────────────────────
PASO 5 — VALIDACIÓN Y RESPONSIVE
──────────────────────────────────────
- npm run typecheck — cero errores
- Mobile: tabla cambia a cards apiladas
- Documentar decisiones de diseño

──────────────────────────────────────
PASO 6 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_10_INSCRIPCIONES_FRONT.md

NO avances a ninguna otra fase. Tu trabajo termina aquí.
```

---
---

## 📝 FASE 11 — Actividades y Material — Backend

### Rol asignado: `Ingeniero Backend Senior — Especialista en gestión de archivos y lógica temporal`

---

### 📋 PROMPT FASE 11 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior especializado en gestión de archivos en entornos serverless, lógica temporal (fechas, plazos, publicación programada) y APIs de contenido enriquecido. Tu obsesión: manejo seguro de uploads, validación de tipos MIME, y lógica de estados impecable.

NO tocas CSS. NO creas componentes visuales. Solo backend.

Antes de escribir UNA SOLA LÍNEA de código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (Activity, ActivityAttachment), 5.5 (RN-ACT), 6.5 (RF-ACT), 8 (CU-03), 15.3 (validación de archivos)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Cambiar estado de Fase 11 a 🟡 En progreso
- Registrar fecha y hora en [ INICIO ]

──────────────────────────────────────
PASO 1 — ARCHIVOS JSON Y CARPETAS
──────────────────────────────────────
- Crear data/activities.json como array vacío: []
- Crear carpeta data/uploads/activities/ (con .gitkeep)
- Crear carpeta data/uploads/submissions/ (con .gitkeep)

──────────────────────────────────────
PASO 2 — TIPOS Y SCHEMAS
──────────────────────────────────────
Actualizar lib/types.ts con:
- Activity (completa según plan)
- ActivityAttachment
- CreateActivityRequest
- UpdateActivityRequest

Schemas Zod en lib/schemas.ts:
- activitySchema, createActivitySchema, updateActivitySchema
- Validar: título no vacío, maxScore > 0, weight 0-100, dueDate > publishDate

──────────────────────────────────────
PASO 3 — SISTEMA DE UPLOAD
──────────────────────────────────────
Crear lib/uploadService.ts:
- uploadFile(file: File, destination: string): Promise<ActivityAttachment>
  - Validar tipo MIME (según tabla del plan sección 15.3)
  - Validar tamaño (max 10MB)
  - Renombrar: {timestamp}-{uuid}-{sanitized-name}.{ext}
  - Sanitizar nombre (sin .., /, \, caracteres especiales)
  - Guardar en data/uploads/{destination}/
  - Retornar metadata del archivo

app/api/upload/route.ts — POST
- Recibe FormData con archivo
- Parámetro destination (activities/act-{id} o submissions/sub-{id})
- Solo usuarios autenticados
- Retorna metadata

app/api/upload/[...path]/route.ts — GET
- Sirve archivos estáticos desde data/uploads/
- Solo usuarios autenticados
- Validar que el path no contenga ".." (path traversal)

──────────────────────────────────────
PASO 4 — SERVICIO DE DATOS
──────────────────────────────────────
Actualizar lib/dataService.ts:
- readActivities(): Promise<Activity[]>
- writeActivities(activities: Activity[]): Promise<void>
- getActivitiesByCourse(courseId: string): Promise<Activity[]>
- getActivityById(id: string): Promise<Activity | null>

──────────────────────────────────────
PASO 5 — API ROUTE HANDLERS
──────────────────────────────────────

app/api/courses/[id]/activities/route.ts
- GET: Listar actividades del curso. Admin ve todas (draft+published+closed). Estudiante solo published con publishDate <= now.
- POST: Crear actividad (admin only). Validar Zod. Estado inicial: "draft".

app/api/activities/[id]/route.ts
- GET: Detalle de actividad (admin o estudiante inscrito si published)
- PUT: Editar actividad (admin only). Advertencia si ya hay entregas.

app/api/activities/[id]/publish/route.ts
- POST: Cambiar estado a "published" (admin only). Validar que tiene al menos título y dueDate.

──────────────────────────────────────
PASO 6 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- npm run typecheck — cero errores
- Verificar upload de archivo y descarga
- Verificar estados: draft → published → closed
- Verificar que estudiantes no ven drafts

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_11_ACTIVIDADES_BACK.md

NO avances a ninguna otra fase.
```

---
---

## 🎨 FASE 12 — Actividades y Material — Frontend

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en contenido rico, Markdown y experiencia de carga de archivos`

---

### 📋 PROMPT FASE 12 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo, experto en interfaces de contenido enriquecido, renderizado de Markdown, zonas de upload drag-and-drop, y presentación clara de información temporal (fechas, plazos, estados). Cada detalle visual comunica información.

NO modificas backend. Solo construyes interfaces que consumen APIs existentes.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 11, 13 (wireframe de actividad sección 13.4)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 12 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — LISTA DE ACTIVIDADES (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/activities/page.tsx:
- Lista de actividades con: título, tipo (badge color), fecha límite, peso, estado (badge), número de entregas
- Filtros por estado (draft/published/closed) y tipo
- Ordenamiento por fecha
- Botón "Nueva Actividad"
- Indicador visual de peso acumulado (barra de progreso con la suma de weights)

──────────────────────────────────────
PASO 2 — CREAR/EDITAR ACTIVIDAD (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/activities/new/page.tsx:
- Formulario dividido en secciones claras:
  1. Información básica: título, tipo (select), categoría (individual/grupo)
  2. Descripción: textarea con soporte Markdown + preview en vivo
  3. Configuración: fecha límite (date picker), fecha publicación, peso %, nota máxima
  4. Opciones: permitir entrega tardía (toggle), penalización %, requiere archivo (toggle), requiere enlace (toggle)
  5. Archivos adjuntos: zona de drop para subir PDFs/documentos del docente
  6. Prompt IA: selector para vincular un prompt existente (o "sin prompt")
- Botones: "Guardar borrador" y "Guardar y Publicar"

──────────────────────────────────────
PASO 3 — DETALLE DE ACTIVIDAD (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/activities/[actId]/page.tsx:
- Cabecera: título, estado, tipo, fecha límite con countdown
- Descripción renderizada como Markdown
- Lista de archivos adjuntos con descarga
- Prompt vinculado (si existe) con preview
- Barra de acciones: Publicar, Cerrar, Editar, Ver entregas
- Estadísticas: X entregaron, Y pendientes, Z tardías

──────────────────────────────────────
PASO 4 — VISTA DE ACTIVIDAD (ESTUDIANTE)
──────────────────────────────────────
Crear app/student/courses/[courseId]/activities/[actId]/page.tsx:
- Siguiendo exactamente el wireframe del plan sección 13.4
- Cabecera con título, tipo, peso, nota máxima, estado, fecha límite
- Descripción en Markdown
- Archivos adjuntos con botón de descarga
- Prompt asignado con botón "Copiar al portapapeles"
- Sección "Mi Entrega" con estado y botón de enviar

──────────────────────────────────────
PASO 5 — COMPONENTES
──────────────────────────────────────
- components/activities/ActivityCard.tsx
- components/activities/ActivityForm.tsx
- components/activities/ActivityDetail.tsx
- components/activities/MarkdownRenderer.tsx
- components/ui/FileUploadZone.tsx (drag & drop reutilizable)
- components/ui/DatePicker.tsx (o wrapper de input date)
- components/ui/Countdown.tsx (cuenta regresiva)

──────────────────────────────────────
PASO 6 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_12_ACTIVIDADES_FRONT.md

NO avances a ninguna otra fase.
```

---
---

## 📤 FASE 13 — Entregas de Estudiantes — Backend

### Rol asignado: `Ingeniero Backend Senior — Especialista en workflows de estado y versionamiento`

---

### 📋 PROMPT FASE 13 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior especializado en máquinas de estado, versionamiento de datos, y workflows complejos de entrega-revisión-calificación. Tu obsesión: estados consistentes, transiciones válidas, y cero entregas corruptas.

Solo backend. No tocas CSS ni componentes.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (Submission), 5.6 (RN-ENT), 6.6 (RF-ENT), 8 (CU-04)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 13 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — ARCHIVO JSON
──────────────────────────────────────
Crear data/submissions.json como array vacío: []

──────────────────────────────────────
PASO 2 — TIPOS Y SCHEMAS
──────────────────────────────────────
Actualizar lib/types.ts:
- Submission (completa según plan)
- SubmissionAttachment
- SubmissionLink
- CreateSubmissionRequest
- SubmissionWithDetails (incluye datos del estudiante y actividad para listados admin)

Schemas Zod en lib/schemas.ts:
- submissionSchema, createSubmissionSchema
- submissionLinkSchema (validar URLs de GitHub/Vercel según RN-PRY-02)
- Validar que al menos hay archivo o enlace según requiresFileUpload/requiresLinkSubmission de la actividad

──────────────────────────────────────
PASO 3 — SERVICIO DE DATOS
──────────────────────────────────────
Actualizar lib/dataService.ts:
- readSubmissions(): Promise<Submission[]>
- writeSubmissions(submissions: Submission[]): Promise<void>
- getSubmissionsByActivity(activityId: string): Promise<Submission[]>
- getSubmissionsByStudent(studentId: string): Promise<Submission[]>
- getSubmission(activityId: string, studentId: string): Promise<Submission | null>

──────────────────────────────────────
PASO 4 — LÓGICA DE ENTREGAS
──────────────────────────────────────
Crear lib/submissionService.ts:

submitWork(activityId, studentId, data):
1. Verificar que la actividad existe y está published
2. Verificar que el estudiante está inscrito en el curso (enrollment active)
3. Verificar plazo: si now > dueDate y !allowLateSubmission → error
4. Si now > dueDate y allowLateSubmission → marcar isLate: true
5. Verificar si ya existe entrega previa:
   a. Si no existe → crear con version: 1
   b. Si existe y status != "reviewed" con nota publicada → incrementar version
   c. Si existe y está bloqueada → error
6. Guardar archivos adjuntos si hay
7. Guardar en submissions.json

returnSubmission(submissionId, adminId):
- Cambiar status a "returned" → permite re-entrega

──────────────────────────────────────
PASO 5 — API ROUTE HANDLERS
──────────────────────────────────────

app/api/activities/[id]/submissions/route.ts
- GET: Admin → todas las entregas de la actividad con datos del estudiante. Filtros: ?status=
- POST: Estudiante → enviar entrega. FormData con archivos + JSON con enlaces.

app/api/submissions/[id]/route.ts
- GET: Detalle de entrega (admin o estudiante dueño)
- PUT: Admin → devolver entrega (cambiar status a "returned")

──────────────────────────────────────
PASO 6 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- npm run typecheck — cero errores
- Verificar flujo completo: publicar actividad → estudiante entrega → admin ve la entrega
- Verificar entrega tardía
- Verificar re-entrega (versionamiento)
- Verificar bloqueos

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_13_ENTREGAS_BACK.md

NO avances a ninguna otra fase.
```

---
---

## 🎨 FASE 14 — Entregas de Estudiantes — Frontend

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en experiencia de envío y flujos multi-paso`

---

### 📋 PROMPT FASE 14 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo, experto en interfaces de envío de archivos, formularios multi-paso, indicadores de estado y feedback inmediato. Tu misión: que el estudiante nunca dude de si su entrega se envió correctamente.

NO modificas backend. Solo consumes APIs.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 11, 13
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 14 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — FORMULARIO DE ENTREGA (ESTUDIANTE)
──────────────────────────────────────
Crear app/student/courses/[courseId]/activities/[actId]/submit/page.tsx:
- Resumen de la actividad arriba (título, fecha límite, estado)
- Indicador visual si está a tiempo, próximo a vencer, o vencido
- Sección de archivos: drag & drop + lista de archivos seleccionados con tamaño y botón quitar
- Sección de enlaces (si requiresLinkSubmission):
  - Input para GitHub URL (validación: empieza con https://github.com/)
  - Input para Vercel URL (validación: termina en .vercel.app)
  - Input para Figma URL (opcional)
  - Input para otro enlace (opcional)
- Textarea para comentarios
- Barra de progreso de upload
- Botón "Enviar Entrega" con confirmación modal: "¿Estás seguro? Esta acción registrará tu entrega."
- Pantalla de éxito: "✅ Entrega registrada" con resumen

──────────────────────────────────────
PASO 2 — MIS ENTREGAS (ESTUDIANTE)
──────────────────────────────────────
Crear vista dentro de app/student/courses/[courseId]/activities/page.tsx:
- Lista de actividades con indicador de estado de entrega (entregada/pendiente/calificada)
- Badge visual: 🟢 Entregada | 🟡 Pendiente | 🔴 Vencida | ✅ Calificada
- Al hacer clic → detalle de la actividad con su entrega

──────────────────────────────────────
PASO 3 — VER ENTREGAS (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/activities/[actId]/submissions/page.tsx:
- Tabla: Estudiante, Fecha entrega, Estado, Versión, Archivos, Enlaces, Acciones
- Filtros por estado
- Click en entrega → modal o página con detalle completo
- Botón "Devolver" para habilitar re-entrega
- Links directos a GitHub/Vercel del estudiante (abren en nueva pestaña)
- Indicador visual de entregas tardías

──────────────────────────────────────
PASO 4 — COMPONENTES
──────────────────────────────────────
- components/submissions/SubmitForm.tsx
- components/submissions/SubmissionCard.tsx
- components/submissions/SubmissionDetail.tsx
- components/submissions/LinkInput.tsx (validación de URL en tiempo real)

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_14_ENTREGAS_FRONT.md

NO avances a ninguna otra fase.
```

---
---

## 📊 FASE 15 — Calificaciones y Notas — Backend

### Rol asignado: `Ingeniero Backend Senior + Experto en Educación — Especialista en sistemas de evaluación académica`

---

### 📋 PROMPT FASE 15 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior con doble especialidad: arquitectura de APIs y sistemas de evaluación académica universitaria con estándares colombianos (escala 0.0-5.0, aprobación ≥ 3.0). Tu mentalidad: las notas son datos críticos, una nota mal calculada es inaceptable.

Solo backend. No tocas CSS.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (Grade), 5.7 (RN-CAL), 6.7 (RF-CAL), 8 (CU-05, CU-06, CU-07)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 15 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — ARCHIVO JSON
──────────────────────────────────────
Crear data/grades.json como array vacío: []

──────────────────────────────────────
PASO 2 — TIPOS Y SCHEMAS
──────────────────────────────────────
Actualizar lib/types.ts:
- Grade (completa según plan)
- CreateGradeRequest: { submissionId, activityId, studentId, courseId, score, feedback? }
- UpdateGradeRequest: { score?, feedback? }
- CourseGradeSummary: tabla pivote por curso
- StudentGradeSummary: notas de un estudiante en un curso
- GradeExportRow: fila para CSV

Schemas Zod:
- gradeSchema, createGradeSchema
- Validar: score >= 0 && score <= maxScore (RN-CAL-01)

──────────────────────────────────────
PASO 3 — SERVICIO DE DATOS
──────────────────────────────────────
Actualizar lib/dataService.ts:
- readGrades(): Promise<Grade[]>
- writeGrades(grades: Grade[]): Promise<void>
- getGradesByActivity(activityId: string): Promise<Grade[]>
- getGradesByStudent(studentId: string, courseId: string): Promise<Grade[]>
- getGradeForSubmission(submissionId: string): Promise<Grade | null>

──────────────────────────────────────
PASO 4 — LÓGICA DE CALIFICACIONES
──────────────────────────────────────
Crear lib/gradeService.ts:

gradeSubmission(data, adminId):
1. Verificar que la submission existe
2. Verificar que no hay nota previa (o actualizar si existe)
3. Si entrega tardía: aplicar penalización (score * (1 - latePenaltyPercent/100))
4. Guardar en grades.json con isPublished: false

publishGrades(activityId, adminId):
- Actualizar todas las notas de la actividad: isPublished: true, publishedAt: now

calculateFinalGrade(studentId, courseId):
- Obtener todas las actividades del curso con sus pesos
- Obtener notas del estudiante
- Calcular: Σ (score/maxScore × weight) / Σ (weights de actividades calificadas)
- Escala 0.0-5.0
- Redondear a 1 decimal
- Retornar: { finalScore, details[], isPartial (si faltan actividades) }

──────────────────────────────────────
PASO 5 — API ROUTE HANDLERS
──────────────────────────────────────

app/api/grades/route.ts
- POST: Calificar una entrega (admin only)

app/api/grades/[id]/route.ts
- PUT: Editar calificación (admin only)

app/api/activities/[id]/grades/publish/route.ts
- POST: Publicar todas las notas de la actividad (admin only)

app/api/courses/[id]/grades/route.ts
- GET: Resumen de notas del curso. Admin: tabla completa (estudiantes × actividades × definitiva). Estudiante: solo sus notas.

──────────────────────────────────────
PASO 6 — VALIDACIÓN Y PRUEBAS
──────────────────────────────────────
- npm run typecheck
- Verificar flujo: entrega → calificar → publicar → estudiante ve nota
- Verificar cálculo de definitiva con ejemplo:
  - Act1 (20%, score 4.0/5.0) + Act2 (30%, score 3.5/5.0) = (0.8×20 + 0.7×30) / 50 × 5.0
- Verificar penalización por entrega tardía

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_15_CALIFICACIONES_BACK.md

NO avances a ninguna otra fase.
```

---
---

## 🎨 FASE 16 — Calificaciones y Notas — Frontend

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en tablas de datos complejas y visualización de métricas`

---

### 📋 PROMPT FASE 16 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo, experto en tablas de datos complejas con múltiples niveles, visualización de métricas educativas, y flujos de calificación eficientes. Tu misión: que el docente pueda calificar 30 estudiantes en 10 minutos sin frustración.

NO modificas backend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 11, 13 (wireframe notas sección 13.5)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 16 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — CALIFICACIÓN RÁPIDA (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/activities/[actId]/grades/page.tsx:
- Tabla: Estudiante | Entrega (link) | Archivos | Score (input editable) | Feedback (textarea) | Estado
- Input de score inline con validación 0-maxScore
- Tab key avanza al siguiente input (flujo rápido tipo spreadsheet)
- Botón "Guardar todo" (batch save)
- Botón "Publicar Notas" con confirmación modal
- Indicador: X calificados / Y total

──────────────────────────────────────
PASO 2 — RESUMEN DE NOTAS DEL CURSO (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/grades/page.tsx:
- Tabla pivote siguiendo wireframe sección 13.5
- Filas: estudiantes
- Columnas: cada actividad (con peso %) + columna Definitiva
- Celdas coloreadas: verde ≥ 4.0, amarillo ≥ 3.0, rojo < 3.0
- Fila de estadísticas: promedio por actividad
- Pie: estadísticas generales (promedio, mediana, aprobados, reprobados)
- Botón "Exportar CSV" prominente

──────────────────────────────────────
PASO 3 — MIS NOTAS (ESTUDIANTE)
──────────────────────────────────────
Crear app/student/courses/[courseId]/grades/page.tsx:
- Lista de actividades con: título, peso, nota (si publicada), feedback
- Nota no publicada: "Pendiente de publicación"
- Barra visual de progreso de la nota acumulada
- Nota definitiva parcial/total al fondo con tamaño grande
- Color: verde si ≥ 3.0, rojo si < 3.0

──────────────────────────────────────
PASO 4 — COMPONENTES
──────────────────────────────────────
- components/grades/GradeTable.tsx (tabla de calificación rápida)
- components/grades/GradeSummaryTable.tsx (tabla pivote)
- components/grades/GradeCard.tsx (vista del estudiante)
- components/grades/ScoreInput.tsx (input validado para notas)
- components/grades/GradeStats.tsx (estadísticas)

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_16_CALIFICACIONES_FRONT.md

NO avances a ninguna otra fase.
```

---
---

## 📤 FASE 17 — Exportación de Notas

### Rol asignado: `Ingeniero Backend Senior + Experto en Educación Superior — Especialista en interoperabilidad de datos académicos`

---

### 📋 PROMPT FASE 17 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Backend Senior con expertise en interoperabilidad de datos académicos y estándares de sistemas de notas universitarios colombianos. Tu entregable: un CSV que el docente pueda cargar directamente al sistema institucional sin editar una sola celda.

Solo backend + la acción de descarga en frontend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 5.7 (RN-CAL-06, RN-CAL-07), 6.7 (RF-CAL-06), 8 (CU-07)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 17 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — LÓGICA DE EXPORTACIÓN
──────────────────────────────────────
Crear lib/exportService.ts:

generateGradesCSV(courseId):
1. Obtener curso, actividades, estudiantes inscritos, notas
2. Calcular nota definitiva de cada estudiante
3. Generar CSV con formato:
   ```
   Documento,Nombre,Apellido,Email,[Actividad1 (Peso%)],[Actividad2 (Peso%)],...,Definitiva,Estado
   84459365,María,López,maria@email.com,4.5,4.2,...,4.35,Aprobado
   ```
4. Estado: "Aprobado" si definitiva ≥ 3.0, "Reprobado" si < 3.0
5. Separador: coma (,)
6. Encoding: UTF-8 con BOM (para que Excel abra bien los acentos)
7. Retornar string del CSV

generateGradesJSON(courseId):
- Misma lógica pero retorna array de objetos (para consumo programático)

──────────────────────────────────────
PASO 2 — API ROUTE HANDLER
──────────────────────────────────────

app/api/courses/[id]/grades/export/route.ts
- GET: Genera y retorna archivo CSV
- Headers: Content-Type: text/csv; charset=utf-8
- Content-Disposition: attachment; filename="notas-{courseCode}-{date}.csv"
- Solo admin

──────────────────────────────────────
PASO 3 — BOTÓN DE DESCARGA (FRONTEND MÍNIMO)
──────────────────────────────────────
- Agregar botón "Exportar CSV" en la página de resumen de notas del curso (ya creada en Fase 16)
- Al hacer clic: fetch al endpoint → trigger descarga del archivo
- Loading state en el botón durante la generación

──────────────────────────────────────
PASO 4 — VALIDACIÓN
──────────────────────────────────────
- Generar CSV de ejemplo con datos de prueba
- Verificar que abre correctamente en Excel/LibreOffice
- Verificar acentos (María, López, etc.)
- Verificar cálculos de notas definitivas
- npm run typecheck

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_17_EXPORTACION.md

NO avances a ninguna otra fase.
```

---
---

## 🤖 FASE 18 — Prompts de IA — Backend y Frontend

### Rol asignado: `Ingeniero Fullstack + Experto en IA Educativa — Especialista en diseño de experiencias de prompting`

---

### 📋 PROMPT FASE 18 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Fullstack con especialidad en IA aplicada a la educación. Entiendes cómo los docentes crean prompts estructurados para que sus estudiantes los ejecuten en asistentes de IA (Copilot, Claude, ChatGPT). Tu obsesión: que el docente pueda crear, versionar y distribuir prompts de forma eficiente, y que el estudiante pueda copiarlos con un clic.

Full stack para esta fase: backend + frontend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (AIPrompt), 5.8 (RN-PRM), 6.8 (RF-PRM), 8 (CU-09), 16.2
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 18 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — DATOS Y BACKEND
──────────────────────────────────────
Crear data/prompts.json como array vacío: []

Tipos en lib/types.ts:
- AIPrompt (según plan)
- CreatePromptRequest, UpdatePromptRequest

Schemas Zod en lib/schemas.ts

Servicio en lib/dataService.ts:
- readPrompts, writePrompts, getPromptById, getPromptsByCourse

APIs:
- app/api/prompts/route.ts — GET (listar, filtrar por curso y tags), POST (crear, admin only)
- app/api/prompts/[id]/route.ts — GET (detalle), PUT (editar, admin only, incrementar versión)

──────────────────────────────────────
PASO 2 — FRONTEND ADMIN
──────────────────────────────────────
Crear app/admin/prompts/page.tsx:
- Lista de prompts con: título, curso asociado, versión, tags, fecha
- Filtros por curso y tags
- Botón "Nuevo Prompt"

Crear app/admin/prompts/new/page.tsx:
- Editor de Markdown a pantalla completa con preview en vivo (split view)
- Campos: título, contenido (Markdown), tags (input con chips), curso vinculado, ¿es plantilla?
- Preview del prompt tal como lo verá el estudiante
- Botones: Guardar, Guardar y Vincular a Actividad

Crear app/admin/prompts/[promptId]/page.tsx:
- Mismo editor pero con datos cargados
- Indicador de versión actual
- Historial de versiones (versión anterior se puede ver)

──────────────────────────────────────
PASO 3 — FRONTEND ESTUDIANTE
──────────────────────────────────────
En la vista de detalle de actividad (ya existente), asegurar que:
- Si la actividad tiene promptId, se muestra el prompt completo
- Renderizado en Markdown con syntax highlighting para bloques de código
- Botón "📋 Copiar Prompt" que copia todo el contenido al portapapeles
- Toast de confirmación: "Prompt copiado al portapapeles"
- Botón "Ver en pantalla completa" para prompts largos

──────────────────────────────────────
PASO 4 — COMPONENTES
──────────────────────────────────────
- components/prompts/PromptEditor.tsx (Markdown split editor)
- components/prompts/PromptViewer.tsx (vista de solo lectura con copy)
- components/prompts/PromptCard.tsx (card para listados)
- components/prompts/TagInput.tsx (input con chips para tags)

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_18_PROMPTS.md

NO avances a ninguna otra fase.
```

---
---

## 🌟 FASE 19 — Proyectos Estudiantiles y Vitrina

### Rol asignado: `Diseñador UX/UI Senior + Ingeniero Fullstack — Especialista en portafolios digitales y showcases`

---

### 📋 PROMPT FASE 19 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador UX/UI Senior con expertise en portafolios digitales y showcases de proyectos tecnológicos, combinado con Ingeniero Fullstack para la implementación completa. Tu obsesión: que la vitrina de proyectos sea tan atractiva que cualquier visitante quiera explorar cada proyecto.

Full stack para esta fase.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 4.2 (StudentProject), 5.9 (RN-PRY), 6.9 (RF-PRY), 8 (CU-08), 16
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 19 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — BACKEND
──────────────────────────────────────
Crear data/projects.json como array vacío: []

Tipos, schemas, servicios de datos y APIs según el plan:
- app/api/projects/route.ts — GET (listar, filtrar por curso), POST (crear, estudiante autenticado)
- app/api/projects/[id]/route.ts — GET, PUT
- Validación de URLs (RN-PRY-02)

──────────────────────────────────────
PASO 2 — REGISTRO DE PROYECTO (ESTUDIANTE)
──────────────────────────────────────
Crear app/student/courses/[courseId]/project/page.tsx:
- Si no tiene proyecto: formulario de registro
- Si ya tiene proyecto: vista con edición
- Campos: nombre del proyecto, GitHub URL (obligatorio), Vercel URL (opcional), Figma URL (opcional), descripción, ¿hacer público?
- Preview de cómo se verá en la vitrina

──────────────────────────────────────
PASO 3 — LISTA DE PROYECTOS (ADMIN)
──────────────────────────────────────
Crear app/admin/courses/[courseId]/projects/page.tsx:
- Tabla/grid de proyectos del curso
- Links directos a GitHub y Vercel (abren en nueva pestaña)
- Toggle "Destacar" para marcar isFeatured
- Estado del proyecto (badge)


──────────────────────────────────────
PASO 4 — VITRINA PÚBLICA
──────────────────────────────────────
Crear app/showcase/page.tsx (ruta PÚBLICA, sin login):
- Grid de cards de proyectos destacados (isFeatured && isPublic)
- Cada card: nombre del proyecto, estudiante (nombre), curso, descripción corta
- Botones: "Ver en Vercel" + "Ver en GitHub"
- Animaciones de entrada con Framer Motion (stagger)
- Filtro por curso
- Diseño impactante: fondo oscuro, cards con hover effects, gradientes sutiles
- Header con nombre de la plataforma y semestre

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_19_PROYECTOS_VITRINA.md

NO avances a ninguna otra fase.
```

---
---

## 📊 FASE 20 — Dashboard Admin

### Rol asignado: `Diseñador Frontend Obsesivo — Especialista en dashboards ejecutivos y métricas en tiempo real`

---

### 📋 PROMPT FASE 20 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo especializado en dashboards ejecutivos, widgets de métricas, y visualización de datos educativos. Cada widget debe contar una historia. El docente debe abrir el dashboard y saber exactamente qué necesita su atención. Tu referencia visual: los dashboards de Vercel y Linear.

NO modificas backend (solo consumes APIs existentes).

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Sección 13.2 (wireframe dashboard admin), 6.10 (RF-CFG-01)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 20 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — DASHBOARD PRINCIPAL
──────────────────────────────────────
Crear/actualizar app/admin/page.tsx siguiendo wireframe sección 13.2:

Widget row superior:
- Card "Cursos Activos" — número + lista rápida
- Card "Estudiantes Inscritos" — total, desglose por curso
- Card "Actividades" — total, publicadas vs borradores
- Card "Entregas Pendientes" — número que necesitan calificación

Sección "Mis Cursos":
- Grid de 3 cards (uno por curso del 202601)
- Cada card: nombre, código, estudiantes, horario, categoría (badge)
- Click → navega al dashboard del curso

Sección "Próximos Vencimientos":
- Lista de actividades próximas a vencer (ordenadas por dueDate)
- Indicador visual de urgencia (rojo, amarillo, verde)

Sección "Actividad Reciente":
- Timeline de últimas acciones: entregas recibidas, notas publicadas, inscripciones

──────────────────────────────────────
PASO 2 — COMPONENTES DE DASHBOARD
──────────────────────────────────────
- components/dashboard/StatCard.tsx (card de métrica con número grande)
- components/dashboard/CourseCard.tsx (card de curso del docente)
- components/dashboard/DeadlineList.tsx (próximos vencimientos)
- components/dashboard/ActivityTimeline.tsx (actividad reciente)

──────────────────────────────────────
PASO 3 — ANIMACIONES Y PULIDO
──────────────────────────────────────
- Números que aparecen con animación de conteo (Framer Motion)
- Cards con hover sutil
- Skeleton loading en cada widget independiente
- Responsive: en mobile los widgets se apilan verticalmente

──────────────────────────────────────
PASO 4 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_20_DASHBOARD_ADMIN.md

NO avances a ninguna otra fase.
```

---
---

## 🎓 FASE 21 — Dashboard Estudiante

### Rol asignado: `Diseñador Frontend Obsesivo + Experto en UX Educativo — Especialista en experiencia del estudiante`

---

### 📋 PROMPT FASE 21 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador Frontend Obsesivo con especialidad en UX para plataformas educativas universitarias. Entiendes la psicología del estudiante: quiere saber rápidamente qué tiene pendiente, cuánto tiempo le queda, y cómo van sus notas. Cada elemento visual debe reducir ansiedad y aumentar claridad.

NO modificas backend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Sección 13.3 (wireframe dashboard estudiante), 6.10 (RF-CFG-02)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 21 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — DASHBOARD ESTUDIANTE
──────────────────────────────────────
Crear/actualizar app/student/page.tsx siguiendo wireframe sección 13.3:

Saludo personalizado: "👋 Hola, {nombre} | Semestre 202601"

Sección "Mis Cursos":
- Cards de cursos inscritos con: nombre, horario, modalidad, salón
- Badge de categoría por color

Sección "Pendientes":
- Lista de actividades pendientes de entrega ordenadas por urgencia
- Indicador visual: ⚠️ Urgente (< 48h) | 🔶 Próximo (< 1 semana) | 🟢 Tranquilo
- Click → navega a la actividad

Sección "Mis Notas Recientes":
- Últimas notas publicadas con: actividad, curso, nota, fecha
- Color visual: verde ≥ 4.0, amarillo ≥ 3.0, rojo < 3.0

──────────────────────────────────────
PASO 2 — VISTAS DE CURSO (ESTUDIANTE)
──────────────────────────────────────
Crear app/student/courses/page.tsx:
- Grid de cursos inscritos con detalle

Crear/mejorar app/student/courses/[courseId]/page.tsx:
- Dashboard del curso para el estudiante
- Horario prominente
- Lista de actividades con estados de entrega
- Mi nota acumulada del curso

──────────────────────────────────────
PASO 3 — PERFIL Y CAMBIO DE CONTRASEÑA
──────────────────────────────────────
Crear app/student/profile/page.tsx:
- Datos del estudiante (nombre, email, documento, teléfono)
- Lista de cursos inscritos
- Enlace a cambiar contraseña

Mejorar app/change-password/page.tsx:
- Diseño visual consistente con el resto del sistema
- Indicador de fortaleza de contraseña
- Reglas visibles: mínimo 8 caracteres

──────────────────────────────────────
PASO 4 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_21_DASHBOARD_ESTUDIANTE.md

NO avances a ninguna otra fase.
```

---
---

## 🏠 FASE 22 — Landing Pública y Vitrina

### Rol asignado: `Diseñador UX/UI Senior — Especialista en landing pages de alto impacto visual`

---

### 📋 PROMPT FASE 22 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador UX/UI Senior especializado en landing pages de alto impacto visual y experiencias de marca. Tu trabajo anterior en la Fase 5 creó el "Hola Mundo" — ahora lo transformas en una landing page completa que vende la plataforma como caso de estudio y da acceso a todas las rutas.

Tu referencia visual: landing pages de Vercel, Linear y Stripe. Elegancia minimalista con impacto.

NO modificas backend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Sección 1 (visión), 11.1 (rutas públicas), 16.4
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 22 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — REDISEÑO DEL HOME
──────────────────────────────────────
Actualizar app/page.tsx:

Sección Hero:
- Título grande y animado (Framer Motion, mantener esencia de Fase 5)
- Subtítulo: "Plataforma de Gestión Académica | Fullstack TypeScript"
- Botón "Iniciar Sesión" → /login
- Botón secundario "Ver Proyectos" → /showcase

Sección "Cursos del Semestre":
- Cards de los 3 cursos (info pública, sin datos privados)
- Nombre, descripción corta, categoría

Sección "Stack Tecnológico":
- Grid de logos/iconos: Next.js, TypeScript, React, Tailwind, Vercel, GitHub
- Breve descripción del stack

Sección "¿Cómo funciona?":
- 3-4 pasos visuales: Docente crea actividad → Estudiante ejecuta con IA → Entrega proyecto → Calificación y feedback

Footer:
- Info del semestre, enlace al repo GitHub, "Construido con Next.js + IA"

──────────────────────────────────────
PASO 2 — ANIMACIONES
──────────────────────────────────────
- Hero: texto con stagger como en Fase 5
- Secciones: fade-in al hacer scroll (intersection observer + Framer Motion)
- Cards: hover effects sutiles
- Smooth scroll entre secciones

──────────────────────────────────────
PASO 3 — SEO Y META
──────────────────────────────────────
- Actualizar metadata en layout.tsx
- Open Graph tags
- Favicon
- Descripción meta adecuada

──────────────────────────────────────
PASO 4 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_22_LANDING.md

NO avances a ninguna otra fase.
```

---
---

## 🧩 FASE 23 — Navegación, Layout y Temas

### Rol asignado: `Diseñador de Sistemas de Diseño — Especialista en design systems, navegación y consistencia visual`

---

### 📋 PROMPT FASE 23 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Diseñador de Sistemas de Diseño (Design System Architect), obsesionado con la consistencia visual, la jerarquía de navegación y los tokens de diseño. Tu misión: que toda la aplicación se sienta como UN solo producto, no como piezas sueltas. Cada página debe compartir patrones, colores, tipografía y componentes base.

NO modificas lógica de backend.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 7.3 (usabilidad), 11 (rutas), 13 (wireframes)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 23 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — LAYOUT ADMIN
──────────────────────────────────────
Crear app/admin/layout.tsx:
- Sidebar izquierdo con menú:
  - 📊 Dashboard
  - 📚 Cursos
  - 👥 Estudiantes (búsqueda global)
  - 📝 Prompts
  - ⚙️ Configuración
- Header superior: nombre app, semestre activo, avatar/nombre del usuario, botón logout
- Sidebar colapsable en mobile (hamburger)
- Active state en item de menú actual
- Breadcrumbs bajo el header

──────────────────────────────────────
PASO 2 — LAYOUT ESTUDIANTE
──────────────────────────────────────
Crear app/student/layout.tsx:
- Navbar superior (sin sidebar):
  - Logo + nombre del app
  - Links: Inicio | Mis Cursos | Mi Perfil
  - Avatar/nombre + botón logout
- Mobile: hamburger menu

──────────────────────────────────────
PASO 3 — SISTEMA DE TEMAS
──────────────────────────────────────
Implementar tema oscuro/claro controlado desde config.json:
- CSS variables para colores base
- Clases de Tailwind para dark mode
- Toggle en la UI (header)
- Persistir preferencia en localStorage
- Respetar prefers-color-scheme del SO como default

──────────────────────────────────────
PASO 4 — TOKENS DE DISEÑO
──────────────────────────────────────
Actualizar app/globals.css con variables CSS:
- Colores: primary, secondary, accent, success, warning, error, background, foreground
- Spacing consistente
- Border radius estándar
- Shadows: sm, md, lg
- Transition durations: fast (150ms), normal (300ms), slow (500ms)

──────────────────────────────────────
PASO 5 — REFACTOR DE CONSISTENCIA
──────────────────────────────────────
Revisar TODAS las páginas creadas en fases anteriores y asegurar:
- Uso consistente de los componentes base (Button, Card, Badge, Table, Modal, etc.)
- Paleta de colores uniforme (usar variables CSS)
- Tipografía consistente
- Espaciado uniforme
- Loading states en todas las páginas

──────────────────────────────────────
PASO 6 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_23_LAYOUT_TEMAS.md

NO avances a ninguna otra fase.
```

---
---

## 🔒 FASE 24 — Seguridad, Validación y Errores

### Rol asignado: `Ingeniero de Seguridad + QA — Especialista en hardening de aplicaciones web y manejo de errores`

---

### 📋 PROMPT FASE 24 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero de Seguridad y QA combinados. Tu mentalidad: "Si un estudiante curioso o un atacante intenta algo inesperado, ¿el sistema responde correctamente?". Piensas en edge cases, inputs maliciosos, accesos no autorizados, y errores no manejados.

Revisas TODO el código existente con ojo de auditor.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Secciones 7.2 (seguridad), 15 (estrategia de seguridad)
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 24 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — AUDITORÍA DE SEGURIDAD
──────────────────────────────────────
Revisar CADA Route Handler y verificar:
- ¿Tiene validación de sesión (withAuth)?
- ¿Tiene validación de rol donde corresponde?
- ¿Valida body con Zod?
- ¿Sanitiza inputs?
- ¿Maneja errores sin exponer stack traces?
- ¿Los archivos subidos se validan correctamente?
Documentar hallazgos y corregir TODO lo encontrado.

──────────────────────────────────────
PASO 2 — MIDDLEWARE GLOBAL
──────────────────────────────────────
Crear/actualizar middleware.ts en la raíz:
- Proteger rutas /admin/* → requiere sesión + role admin
- Proteger rutas /student/* → requiere sesión + role student
- Proteger rutas /api/* (excepto /api/auth/login) → requiere sesión
- Redirigir a /login si no hay sesión
- Redirigir a /change-password si mustChangePassword

──────────────────────────────────────
PASO 3 — MANEJO DE ERRORES
──────────────────────────────────────
Crear app/not-found.tsx — Página 404 personalizada
Crear app/error.tsx — Error boundary global
Crear app/admin/error.tsx — Error boundary para admin
Crear app/student/error.tsx — Error boundary para estudiante

Cada error page:
- Diseño visual consistente con el sistema
- Mensaje amigable (no stack traces)
- Botón "Volver al inicio" o "Reintentar"

──────────────────────────────────────
PASO 4 — VALIDACIÓN DE FORMULARIOS
──────────────────────────────────────
Revisar que TODOS los formularios del frontend tengan:
- Validación client-side en tiempo real
- Mensajes de error claros bajo cada campo
- Disabled submit si hay errores
- Protección contra double-submit (loading state)

──────────────────────────────────────
PASO 5 — HEADERS DE SEGURIDAD
──────────────────────────────────────
En next.config.ts agregar headers de seguridad:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy (básico)

──────────────────────────────────────
PASO 6 — LIMPIEZA DE SESIONES
──────────────────────────────────────
Implementar limpieza automática de sesiones expiradas:
- Ejecutar cleanExpiredSessions() al inicio de cada request de login
- O cron-like en un endpoint dedicado

──────────────────────────────────────
PASO 7 — REGISTRO DE CIERRE Y RESUMEN
──────────────────────────────────────
- Actualizar ESTADO_EJECUCION_PLATAFORMA.md
- Crear doc/RESUMEN_FASE_24_SEGURIDAD.md
  - INCLUIR: lista de vulnerabilidades encontradas y corregidas
  - INCLUIR: checklist de seguridad con estado de cada item

NO avances a ninguna otra fase.
```

---
---

## 🚀 FASE 25 — Pulido Final y Deploy

### Rol asignado: `Ingeniero Fullstack Senior + QA Lead — Especialista en optimización, testing y despliegue en producción`

---

### 📋 PROMPT FASE 25 — COPIAR Y PEGAR COMPLETO

```
Actúa EXCLUSIVAMENTE como Ingeniero Fullstack Senior y QA Lead con experiencia en lanzamientos a producción. Tu mentalidad: "La aplicación no se despliega hasta que todo funcione perfectamente". Eres metódico, corres cada validación, y documentas todo.

Antes de escribir código:
1. LEER doc/PLAN_PLATAFORMA_DOCENTE.md — Todo el documento como referencia final
2. LEER doc/ESTADO_EJECUCION_PLATAFORMA.md — Verificar que las fases 6-24 están completadas

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
Registrar inicio de Fase 25 en ESTADO_EJECUCION_PLATAFORMA.md

──────────────────────────────────────
PASO 1 — VALIDACIÓN COMPLETA
──────────────────────────────────────
Ejecutar y documentar resultado de CADA uno:
- npm run typecheck → 0 errores
- npm run lint → 0 errores (o documentar warnings)
- npm run build → build exitoso sin errores
- Verificar que TODAS las rutas del plan (sección 11) existen

──────────────────────────────────────
PASO 2 — CHECKLIST FUNCIONAL
──────────────────────────────────────
Verificar manualmente (o documentar cómo verificar) cada flujo:
- [ ] Login como admin
- [ ] Ver dashboard admin
- [ ] Crear semestre
- [ ] Crear curso con horario
- [ ] Inscribir estudiante → se crea usuario automáticamente
- [ ] Login como estudiante → pide cambio de contraseña
- [ ] Cambiar contraseña → redirige al dashboard
- [ ] Crear actividad con archivos adjuntos
- [ ] Publicar actividad
- [ ] Estudiante ve actividad y descarga material
- [ ] Estudiante envía entrega con archivo y enlace
- [ ] Admin ve entrega
- [ ] Admin califica entrega
- [ ] Admin publica notas
- [ ] Estudiante ve su nota
- [ ] Admin exporta CSV de notas
- [ ] Crear prompt → vincular a actividad
- [ ] Estudiante copia prompt
- [ ] Estudiante registra proyecto
- [ ] Admin destaca proyecto
- [ ] Visitante ve vitrina pública
- [ ] Logout funciona correctamente
- [ ] 404 page se muestra para rutas inexistentes
- [ ] Rutas protegidas redirigen a login

──────────────────────────────────────
PASO 3 — OPTIMIZACIÓN DE PERFORMANCE
──────────────────────────────────────
- Verificar que no hay componentes "use client" innecesarios (preferir Server Components)
- Verificar lazy loading de componentes pesados
- Verificar que las imágenes usan next/image
- Verificar tamaño del bundle con npm run build (reportar tamaños)

──────────────────────────────────────
PASO 4 — PREPARAR PARA DEPLOY
──────────────────────────────────────
- Verificar que .env.example está actualizado
- Verificar que .gitignore incluye: node_modules, .next, .env.local
- Verificar que data/*.json tienen datos de ejemplo válidos
- Crear o actualizar README.md del proyecto con:
  - Descripción del proyecto
  - Stack tecnológico
  - Cómo ejecutar en desarrollo
  - Estructura de carpetas
  - Variables de entorno

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE FINAL
──────────────────────────────────────
En ESTADO_EJECUCION_PLATAFORMA.md:
- Marcar Fase 25 como ✅ Completada
- Documentar todo
- Escribir NOTA FINAL: "Plataforma de Gestión Académica Docente v1.0 — Lista para deploy"

──────────────────────────────────────
PASO 6 — RESUMEN FINAL
──────────────────────────────────────
Crear doc/RESUMEN_FASE_25_DEPLOY.md con:
- Resumen ejecutivo de todo el proyecto
- Lista completa de todas las fases ejecutadas (6-25) con estados
- Métricas: archivos creados, líneas de código, endpoints, páginas
- Estado de cada módulo
- Checklist funcional con resultados
- Recomendaciones para el roadmap futuro (sección 17 del plan)
- Estado final: LISTO PARA PRODUCCIÓN / REQUIERE CORRECCIONES

Este es el último prompt. La plataforma está completa. 🎓
```

---
---

## 📊 RESUMEN DE FASES Y ROLES

| Fase | Nombre | Rol Exclusivo | Tipo |
|:----:|--------|--------------|:----:|
| 6 | Autenticación y Sesiones | Ingeniero Backend Senior — Seguridad | Backend |
| 7 | Semestres y Cursos — Backend | Ingeniero Backend Senior — APIs REST | Backend |
| 8 | Semestres y Cursos — Frontend | Diseñador Frontend Obsesivo | Frontend |
| 9 | Inscripción Estudiantes — Backend | Ingeniero Backend Senior — Lógica de Negocio | Backend |
| 10 | Inscripción Estudiantes — Frontend | Diseñador Frontend Obsesivo — Formularios | Frontend |
| 11 | Actividades — Backend | Ingeniero Backend Senior — Archivos y Temporal | Backend |
| 12 | Actividades — Frontend | Diseñador Frontend Obsesivo — Markdown y Upload | Frontend |
| 13 | Entregas — Backend | Ingeniero Backend Senior — Workflows | Backend |
| 14 | Entregas — Frontend | Diseñador Frontend Obsesivo — Envío y Feedback | Frontend |
| 15 | Calificaciones — Backend | Ingeniero Backend + Experto Educación | Backend |
| 16 | Calificaciones — Frontend | Diseñador Frontend Obsesivo — Tablas Complejas | Frontend |
| 17 | Exportación de Notas | Ingeniero Backend + Experto Educación | Backend |
| 18 | Prompts de IA | Ingeniero Fullstack + Experto IA Educativa | Fullstack |
| 19 | Proyectos y Vitrina | Diseñador UX/UI + Ingeniero Fullstack | Fullstack |
| 20 | Dashboard Admin | Diseñador Frontend Obsesivo — Dashboards | Frontend |
| 21 | Dashboard Estudiante | Diseñador Frontend + Experto UX Educativo | Frontend |
| 22 | Landing Pública | Diseñador UX/UI Senior — Landing Pages | Frontend |
| 23 | Navegación y Temas | Diseñador de Sistemas de Diseño | Frontend |
| 24 | Seguridad y Errores | Ingeniero de Seguridad + QA | Transversal |
| 25 | Pulido y Deploy | Ingeniero Fullstack Senior + QA Lead | Transversal |

---

## 📐 REGLAS DE ORO

1. **Cada prompt = un solo rol**. No mezcles backend con diseño en la misma sesión.
2. **Siempre leer los 2 documentos** antes de empezar: Plan + Estado de Ejecución.
3. **Siempre registrar inicio** en ESTADO_EJECUCION_PLATAFORMA.md antes de escribir código.
4. **Siempre registrar cierre** con documentación completa de lo realizado.
5. **Siempre generar resumen de fase** como archivo independiente.
6. **Nunca avanzar** a la siguiente fase sin completar la actual.
7. **El plan es ley**: si algo no está en PLAN_PLATAFORMA_DOCENTE.md, no se implementa.
8. **Desviaciones se documentan**: si algo se implementó diferente al plan, se explica por qué.

---

> **Última actualización**: 16 de Abril de 2026
> **Total de fases**: 20 (Fases 6-25)
> **Estimación total**: 25-35 sesiones de IA

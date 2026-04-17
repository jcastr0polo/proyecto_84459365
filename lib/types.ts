/**
 * lib/types.ts
 * Tipos e interfaces globales TypeScript para toda la aplicación
 * 
 * Principios:
 * - Todos los tipos deben ser tipados estáticamente (no 'any')
 * - Usar literales para campos con opciones limitadas
 * - Exportar individualmente (no default export)
 * - Documentar interfaces complejas
 */

/**
 * AppConfig — Configuración global de la aplicación
 * 
 * Se carga una sola vez desde /data/config.json
 * Contiene valores que afectan toda la aplicación
 */
export interface AppConfig {
  appName: string;     // Nombre único de la app (ej: "Mi App TypeScript")
  version: string;     // Versión semántica (ej: "1.0.0")
  locale: string;      // Localización ISO (ej: "es-CO", "en-US", "fr-FR")
  theme: 'light' | 'dark';  // Tema visual: "light" o "dark"
}

/**
 * HomeData — Contenido e información de la página HOME
 * 
 * Se carga desde /data/home.json
 * Incluye sección héroe para el landing page y metadata SEO
 */
export interface HomeData {
  hero: {
    title: string;               // Título principal visible (ej: "Hola Mundo")
    subtitle: string;            // Subtítulo (ej: "TypeScript + Next.js + Vercel")
    description: string;         // Descripción adicional
    animationStyle: 'typewriter' | 'fadeIn' | 'slideUp';  // Estilo de animación
  };
  meta: {
    pageTitle: string;           // Título para la etiqueta <title> del HTML
    description: string;         // Meta description para SEO
  };
}

// ────────────────────────────────────────────────────────────
// FASE 6 — Autenticación y Sesiones
// ────────────────────────────────────────────────────────────

/**
 * User — Usuario del sistema (admin o estudiante)
 * Se almacena en /data/users.json
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'student';
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

/**
 * SafeUser — Datos del usuario sin información sensible (para respuestas API)
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Session — Sesión activa del usuario
 * Se almacena en /data/sessions.json
 */
export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * LoginRequest — Datos requeridos para iniciar sesión
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * LoginResponse — Datos retornados tras login exitoso
 */
export interface LoginResponse {
  user: SafeUser;
  mustChangePassword: boolean;
}

/**
 * ChangePasswordRequest — Datos para cambiar contraseña
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ────────────────────────────────────────────────────────────
// FASE 7 — Semestres y Cursos
// ────────────────────────────────────────────────────────────

/**
 * Semester — Período académico
 * Se almacena en /data/semesters.json
 * Regla RN-SEM-01: Solo uno activo a la vez
 * Formato ID: YYYYSS (ej: "202601")
 */
export interface Semester {
  id: string;                          // Ej: "202601"
  label: string;                       // Ej: "2026 - Primer Semestre"
  startDate: string;                   // Fecha inicio (ISO date: "2026-02-01")
  endDate: string;                     // Fecha fin (ISO date: "2026-06-30")
  isActive: boolean;                   // Solo uno activo a la vez (RN-SEM-01)
  createdAt: string;                   // ISO timestamp
}

/**
 * CourseSchedule — Horario de una clase
 * Embebido dentro de Course.schedule[]
 */
export interface CourseSchedule {
  dayOfWeek: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado';
  startTime: string;                   // "08:00" (HH:mm)
  endTime: string;                     // "10:00" (HH:mm)
  room?: string;                       // Aula / salón (opcional)
  modality: 'presencial' | 'virtual' | 'híbrido';
}

/**
 * Course — Curso/materia del semestre
 * Se almacena en /data/courses.json
 * Regla RN-CUR-01: código único por semestre
 * Regla RN-CUR-03: al menos un horario
 */
export interface Course {
  id: string;                          // UUID o slug: "course-log-202601"
  code: string;                        // Código visible: "LOG-202601"
  name: string;                        // "Lógica y Programación"
  description: string;                 // Descripción del curso
  semesterId: string;                  // FK a Semester.id
  category: 'programming' | 'design' | 'management' | 'leadership' | 'other';
  schedule: CourseSchedule[];          // Horarios (min 1, RN-CUR-03)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * CreateSemesterRequest — Datos para crear un semestre
 */
export interface CreateSemesterRequest {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

/**
 * UpdateSemesterRequest — Datos para editar un semestre (parcial)
 */
export interface UpdateSemesterRequest {
  label?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

/**
 * CreateCourseRequest — Datos para crear un curso
 */
export interface CreateCourseRequest {
  code: string;
  name: string;
  description: string;
  semesterId: string;
  category: Course['category'];
  schedule: CourseSchedule[];
}

/**
 * UpdateCourseRequest — Datos para editar un curso (parcial)
 */
export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  category?: Course['category'];
  schedule?: CourseSchedule[];
  isActive?: boolean;
}

// ────────────────────────────────────────────────────────────
// FASE 9 — Inscripción de Estudiantes
// ────────────────────────────────────────────────────────────

/**
 * Enrollment — Inscripción de un estudiante a un curso
 * Se almacena en /data/enrollments.json
 * Regla RN-INS-02: Un estudiante no puede estar inscrito dos veces al mismo curso activo
 * Regla RN-INS-05: Se retira cambiando status, nunca se borra físicamente
 */
export interface Enrollment {
  id: string;                    // UUID
  courseId: string;              // FK → Course.id
  studentId: string;            // FK → User.id (role: student)
  status: 'active' | 'withdrawn';
  enrolledAt: string;            // ISO timestamp
  enrolledBy: string;            // adminId que inscribió
  withdrawnAt?: string;          // ISO timestamp (solo si status === 'withdrawn')
}

/**
 * EnrollStudentRequest — Datos para inscribir un estudiante
 * Si el email no existe, se crea el usuario automáticamente
 */
export interface EnrollStudentRequest {
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  phone?: string;
}

/**
 * BulkEnrollRequest — Inscripción masiva
 */
export interface BulkEnrollRequest {
  students: EnrollStudentRequest[];
}

/**
 * EnrollmentWithStudent — Enrollment con datos del estudiante embebidos
 * Usado en GET /api/courses/[id]/enrollments para listar con información completa
 */
export interface EnrollmentWithStudent extends Enrollment {
  student: SafeUser;
}

/**
 * BulkEnrollResult — Resultado de la inscripción masiva
 */
export interface BulkEnrollResult {
  success: { enrollment: Enrollment; student: SafeUser; created: boolean }[];
  alreadyEnrolled: { email: string; studentId: string }[];
  errors: { email: string; error: string }[];
}

// ────────────────────────────────────────────────────────────
// FASE 11 — Actividades y Material
// ────────────────────────────────────────────────────────────

/**
 * ActivityAttachment — Archivo adjunto de una actividad (material del docente)
 * Embebido en Activity.attachments[]
 */
export interface ActivityAttachment {
  id: string;                          // UUID
  fileName: string;                    // "guia-proyecto-fase1.pdf"
  filePath: string;                    // "uploads/activities/act-xxx/guia.pdf"
  fileSize: number;                    // Bytes
  mimeType: string;                    // "application/pdf"
  uploadedAt: string;                  // ISO 8601
}

/**
 * Activity — Actividad académica vinculada a un curso
 * Se almacena en /data/activities.json
 * RN-ACT-01: Toda actividad pertenece a exactamente un curso
 * RN-ACT-02: Estados draft → published → closed
 * RN-ACT-03: publishDate futuro → no visible hasta esa fecha
 */
export interface Activity {
  id: string;                          // UUID
  courseId: string;                     // FK a Course.id
  title: string;                       // "Proyecto Fullstack - Fase 1"
  description: string;                 // Descripción detallada (Markdown)
  type: 'project' | 'exercise' | 'document' | 'presentation' | 'prompt' | 'exam' | 'other';
  category: 'individual' | 'group';
  attachments: ActivityAttachment[];   // Archivos adjuntos del docente
  promptId?: string;                   // FK a Prompt.id (si aplica)
  dueDate: string;                     // Fecha límite de entrega (ISO date)
  publishDate: string;                 // Fecha de publicación visible (ISO date)
  maxScore: number;                    // Nota máxima (ej: 5.0)
  weight: number;                      // Peso porcentual (ej: 20 = 20%)
  allowLateSubmission: boolean;        // Permitir entregas tardías
  latePenaltyPercent?: number;         // Penalización por entrega tardía (ej: 10 = -10%)
  status: 'draft' | 'published' | 'closed';
  requiresFileUpload: boolean;         // ¿Requiere subir archivo?
  requiresLinkSubmission: boolean;     // ¿Requiere enviar enlace (GitHub/Vercel)?
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}

/**
 * CreateActivityRequest — Datos para crear una actividad
 */
export interface CreateActivityRequest {
  title: string;
  description: string;
  type: Activity['type'];
  category: Activity['category'];
  dueDate: string;
  publishDate: string;
  maxScore: number;
  weight: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  requiresFileUpload?: boolean;
  requiresLinkSubmission?: boolean;
}

/**
 * UpdateActivityRequest — Datos para editar una actividad (parcial)
 */
export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  type?: Activity['type'];
  category?: Activity['category'];
  dueDate?: string;
  publishDate?: string;
  maxScore?: number;
  weight?: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  requiresFileUpload?: boolean;
  requiresLinkSubmission?: boolean;
  status?: 'draft' | 'published' | 'closed';
}

// ────────────────────────────────────────────────────────────
// FASE 13 — Entregas de Estudiantes
// ────────────────────────────────────────────────────────────

/**
 * SubmissionAttachment — Archivo adjunto de una entrega de estudiante
 */
export interface SubmissionAttachment {
  id: string;
  fileName: string;
  filePath: string;              // "uploads/submissions/sub-xxx/archivo.pdf"
  fileSize: number;
  mimeType: string;
  uploadedAt: string;            // ISO 8601
}

/**
 * SubmissionLink — Enlace adjunto de una entrega
 * RN-ENT-06: GitHub/Vercel para cursos de programación
 */
export interface SubmissionLink {
  type: 'github' | 'vercel' | 'figma' | 'other';
  url: string;
  label?: string;                // "Repositorio principal"
}

/**
 * Submission — Entrega de un estudiante para una actividad
 * RN-ENT-01: Una entrega por actividad por estudiante (última versión)
 * RN-ENT-02: Versionamiento — re-entrega incrementa version
 * RN-ENT-05: Bloqueada después de calificación (salvo "returned")
 */
export interface Submission {
  id: string;
  activityId: string;            // FK a Activity.id
  studentId: string;             // FK a User.id
  courseId: string;               // FK a Course.id (denormalizado)
  content?: string;              // Texto/comentario del estudiante
  attachments: SubmissionAttachment[];
  links: SubmissionLink[];
  submittedAt: string;           // ISO 8601
  isLate: boolean;               // submittedAt > activity.dueDate
  status: 'submitted' | 'reviewed' | 'returned' | 'resubmitted';
  version: number;               // 1, 2, 3... (re-entregas)
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}

/**
 * CreateSubmissionRequest — Datos para enviar una entrega
 * RN-ENT-03: Al menos archivo o enlace según requisitos de la actividad
 */
export interface CreateSubmissionRequest {
  content?: string;
  links?: SubmissionLink[];
}

/**
 * SubmissionWithDetails — Entrega con datos del estudiante y actividad
 * Para listados admin con información contextual
 */
export interface SubmissionWithDetails extends Submission {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  activity: {
    id: string;
    title: string;
    type: Activity['type'];
    dueDate: string;
  };
}

// ────────────────────────────────────────────────────────────
// FASE 15 — Calificaciones y Notas
// ────────────────────────────────────────────────────────────

/**
 * Grade — Calificación asignada a una entrega
 * Se almacena en /data/grades.json
 * RN-CAL-01: score entre 0 y maxScore
 * RN-CAL-02: isPublished controla visibilidad
 * RN-CAL-07: Escala colombiana 0.0–5.0, aprobación ≥ 3.0
 */
export interface Grade {
  id: string;                          // UUID
  submissionId: string;                // FK a Submission.id
  activityId: string;                  // FK a Activity.id
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  score: number;                       // Nota numérica (ej: 4.5)
  maxScore: number;                    // Nota máxima posible (de la actividad)
  feedback?: string;                   // Retroalimentación del docente
  isPublished: boolean;                // ¿Visible para el estudiante?
  publishedAt?: string;                // ISO 8601 — Fecha de publicación
  gradedBy: string;                    // userId del admin que calificó
  gradedAt: string;                    // ISO 8601
  updatedAt: string;                   // ISO 8601
}

/**
 * CreateGradeRequest — Datos para calificar una entrega
 * RF-CAL-01: Score + feedback opcionales
 */
export interface CreateGradeRequest {
  submissionId: string;
  activityId: string;
  studentId: string;
  courseId: string;
  score: number;
  feedback?: string;
}

/**
 * UpdateGradeRequest — Datos para editar una calificación
 */
export interface UpdateGradeRequest {
  score?: number;
  feedback?: string;
}

/**
 * CourseGradeSummary — Tabla pivote de notas por curso
 * RF-CAL-05: Admin ve estudiantes × actividades × definitiva
 */
export interface CourseGradeSummary {
  courseId: string;
  courseName: string;
  activities: {
    id: string;
    title: string;
    type: Activity['type'];
    maxScore: number;
    weight: number;
  }[];
  students: {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
    email: string;
    grades: Record<string, {           // activityId → grade info
      score: number;
      maxScore: number;
      isPublished: boolean;
      feedback?: string;
    } | null>;
    finalScore: number | null;         // Nota definitiva 0.0–5.0 (null si no hay notas)
    isPartial: boolean;                // true si faltan actividades por calificar
    isApproved: boolean | null;        // finalScore ≥ 3.0 (null si no hay notas)
  }[];
}

/**
 * StudentGradeSummary — Notas de un estudiante en un curso
 * RF-CAL-04: Estudiante ve sus notas publicadas + acumulada
 */
export interface StudentGradeSummary {
  studentId: string;
  courseId: string;
  courseName: string;
  activities: {
    id: string;
    title: string;
    type: Activity['type'];
    maxScore: number;
    weight: number;
    grade: {
      score: number;
      maxScore: number;
      feedback?: string;
      gradedAt: string;
      publishedAt?: string;
    } | null;                          // null si no calificada o no publicada
  }[];
  finalScore: number | null;           // Nota definitiva 0.0–5.0
  isPartial: boolean;                  // Faltan actividades por calificar
  isApproved: boolean | null;          // finalScore ≥ 3.0
}

/**
 * GradeExportRow — Fila para exportación CSV
 * CU-07: Formato compatible con sistema institucional colombiano
 */
export interface GradeExportRow {
  documentNumber: string;              // Documento del estudiante
  firstName: string;
  lastName: string;
  email: string;
  [activityTitle: string]: string | number;  // Notas por actividad (dinámico)
  finalScore: string | number;         // Nota definitiva 0.0–5.0
  status: string | number;             // "Aprobado" | "Reprobado" | "Pendiente"
}

/**
 * FinalGradeResult — Resultado del cálculo de nota definitiva
 * RN-CAL-05: Promedio ponderado Σ(score/maxScore × weight) / Σ(weights)
 */
export interface FinalGradeResult {
  finalScore: number;                  // 0.0–5.0, redondeado a 1 decimal
  details: {
    activityId: string;
    activityTitle: string;
    score: number;
    maxScore: number;
    weight: number;
    normalizedScore: number;           // score/maxScore (0.0–1.0)
    weightedContribution: number;      // normalizedScore × weight
  }[];
  totalWeight: number;                 // Suma de pesos considerados
  isPartial: boolean;                  // true si faltan actividades
  isApproved: boolean;                 // finalScore ≥ 3.0
}

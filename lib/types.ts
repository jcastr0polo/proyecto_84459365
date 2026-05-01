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
  timezone: string;    // IANA timezone (ej: "America/Bogota")
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
  corteId?: string;                    // FK a Corte.id (período de evaluación)
  title: string;                       // "Proyecto Fullstack - Fase 1"
  description: string;                 // Descripción detallada (Markdown)
  type: 'project' | 'exercise' | 'document' | 'presentation' | 'prompt' | 'exam' | 'other';
  category: 'individual' | 'group';
  attachments: ActivityAttachment[];   // Archivos adjuntos del docente
  promptId?: string;                   // FK a Prompt.id (si aplica)
  dueDate: string;                     // Fecha límite de entrega (ISO date)
  dueTime?: string;                    // Hora límite HH:mm (default "23:59")
  publishDate: string;                 // Fecha de publicación visible (ISO date)
  publishTime?: string;                // Hora de publicación HH:mm (default "00:00")
  maxScore: number;                    // Nota máxima (ej: 5.0)
  weight: number;                      // Peso porcentual (ej: 20 = 20%)
  allowLateSubmission: boolean;        // Permitir entregas tardías
  latePenaltyPercent?: number;         // Penalización por entrega tardía (ej: 10 = -10%)
  status: 'draft' | 'published' | 'closed';
  requiresFileUpload: boolean;         // ¿Requiere subir archivo?
  requiresLinkSubmission: boolean;     // ¿Requiere enviar enlace (GitHub/Vercel)?
  projectRequired?: boolean;           // Solo visible para estudiantes con proyecto registrado
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
  dueTime?: string;
  publishDate: string;
  publishTime?: string;
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
  dueTime?: string;
  publishDate?: string;
  publishTime?: string;
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
  cortes: {
    id: string;
    name: string;
    weight: number;
    order: number;
  }[];
  activities: {
    id: string;
    title: string;
    type: Activity['type'] | 'quiz' | 'manual';
    maxScore: number;
    weight: number;
    corteId?: string;
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
    corteScores: Record<string, number | null>;  // corteId → nota 0.0–5.0
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
  cortes: {
    id: string;
    name: string;
    weight: number;
    order: number;
  }[];
  corteScores: Record<string, number | null>;  // corteId → nota 0.0–5.0
  activities: {
    id: string;
    title: string;
    type: Activity['type'] | 'quiz' | 'manual';
    maxScore: number;
    weight: number;
    corteId?: string;
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

// ────────────────────────────────────────────────────────────
// Cortes Académicos (Períodos de Evaluación)
// ────────────────────────────────────────────────────────────

/**
 * Corte — Período de evaluación dentro de un curso
 * Se almacena en /data/cortes.json
 *
 * Modelo de evaluación colombiano:
 * - Un curso tiene N cortes (ej: Corte 1: 30%, Corte 2: 30%, Corte 3: 40%)
 * - La suma de weight de todos los cortes de un curso debe ser 100
 * - Las actividades se asignan a un corte (Activity.corteId)
 * - Dentro de un corte, los weight de las actividades suman el 100% de ese corte
 * - Nota definitiva = Σ(nota_corte × weight_corte / 100)
 *   donde nota_corte = promedio ponderado de actividades del corte
 */
export interface Corte {
  id: string;                          // UUID
  courseId: string;                     // FK a Course.id
  name: string;                        // "Corte 1", "Primer Parcial", etc.
  weight: number;                      // Porcentaje sobre la definitiva (ej: 30)
  order: number;                       // Orden de visualización (1, 2, 3...)
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}

/**
 * CreateCorteRequest — Datos para crear un corte
 */
export interface CreateCorteRequest {
  name: string;
  weight: number;
  order?: number;
}

/**
 * UpdateCorteRequest — Datos para editar un corte (parcial)
 */
export interface UpdateCorteRequest {
  name?: string;
  weight?: number;
  order?: number;
}

// ────────────────────────────────────────────────────────────
// FASE 18 — Prompts de IA
// ────────────────────────────────────────────────────────────

/**
 * AIPrompt — Prompt estructurado para asistentes de IA
 * Se almacena en /data/prompts.json
 * RN-PRM-01: Solo admin crea/edita
 * RN-PRM-02: Versionamiento automático al editar
 * RN-PRM-03: Plantillas reutilizables
 * RN-PRM-04: Vinculable a actividad
 */
export interface AIPrompt {
  id: string;                          // UUID
  courseId: string;                     // FK a Course.id
  activityId?: string;                 // FK a Activity.id (si vinculado)
  title: string;                       // Título descriptivo
  content: string;                     // Texto completo del prompt (Markdown)
  version: number;                     // Versionado: 1, 2, 3...
  tags: string[];                      // Tags para filtrado
  isTemplate: boolean;                 // ¿Es plantilla reutilizable?
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}

/**
 * CreatePromptRequest — Datos para crear un prompt
 */
export interface CreatePromptRequest {
  courseId: string;
  activityId?: string;
  title: string;
  content: string;
  tags: string[];
  isTemplate: boolean;
}

/**
 * UpdatePromptRequest — Datos para editar un prompt (incrementa versión)
 */
export interface UpdatePromptRequest {
  title?: string;
  content?: string;
  tags?: string[];
  isTemplate?: boolean;
  activityId?: string | null;
}

// ────────────────────────────────────────────────────────────
// FASE 19 — Proyectos Estudiantiles
// ────────────────────────────────────────────────────────────

/**
 * StudentProject — Proyecto fullstack registrado por un estudiante
 * Se almacena en /data/projects.json
 * RN-PRY-01: Estudiante registra con GitHub URL obligatorio
 * RN-PRY-02: Validación de URLs (GitHub, Vercel)
 * RN-PRY-03: isPublic && isFeatured → vitrina pública
 * RN-PRY-04: Solo admin marca isFeatured
 */
export interface StudentProject {
  id: string;                          // UUID
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  activityId?: string;                 // FK a Activity.id (si vinculado)
  projectName: string;                 // "Mi Portafolio Web"
  description?: string;                // Descripción del proyecto
  githubUrl: string;                   // URL del repositorio (obligatorio)
  vercelUrl?: string;                  // URL del deploy en Vercel
  figmaUrl?: string;                   // URL de prototipo en Figma
  documentUrl?: string;                // URL del archivo MD subido al Blob
  isPublic: boolean;                   // ¿Compartir en vitrina pública?
  isFeatured: boolean;                 // ¿Destacado por el docente?
  isBlockedFromShowcase?: boolean;     // Admin bloquea publicación en vitrina
  showcaseDescription?: string;        // Descripción para la vitrina (editable por admin)
  showcaseImageUrl?: string;           // Imagen para la vitrina (editable por admin)
  status: 'in-progress' | 'submitted' | 'reviewed' | 'featured';
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}

/**
 * CreateProjectRequest — Datos para registrar un proyecto
 */
export interface CreateProjectRequest {
  projectName: string;
  description?: string;
  githubUrl: string;
  vercelUrl?: string;
  figmaUrl?: string;
  isPublic?: boolean;
}

/**
 * UpdateProjectRequest — Datos para actualizar un proyecto
 */
export interface UpdateProjectRequest {
  projectName?: string;
  description?: string;
  githubUrl?: string;
  vercelUrl?: string;
  figmaUrl?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  isBlockedFromShowcase?: boolean;
  showcaseDescription?: string;
  showcaseImageUrl?: string;
  status?: StudentProject['status'];
}

// ────────────────────────────────────────────────────────────
// Parciales / Quizzes
// ────────────────────────────────────────────────────────────

/**
 * QuizOption — Opción de respuesta para una pregunta
 * Para tipo 'single': una es correcta (weight=100), las demás weight=0
 * Para tipo 'weighted': cada opción tiene un peso 0-100 indicando qué tan correcta es
 */
export interface QuizOption {
  id: string;
  text: string;
  weight: number;                      // 0-100 (100 = totalmente correcta, 0 = incorrecta)
}

/**
 * QuizQuestion — Pregunta de un parcial
 */
export interface QuizQuestion {
  id: string;
  text: string;                        // Enunciado (soporta Markdown)
  type: 'single' | 'weighted';        // Única respuesta vs respuestas ponderadas
  options: QuizOption[];               // Opciones de respuesta (min 2)
  points: number;                      // Puntaje máximo de la pregunta
  order: number;                       // Orden de visualización
}

/**
 * Quiz — Parcial/examen vinculado a un curso
 * Se almacena en /data/quizzes.json
 *
 * Dos modos:
 * - training: práctica libre, sin nota, intentos ilimitados, resultados inmediatos
 * - graded: calificable, intentos limitados, control de visibilidad de resultados
 *
 * Visibilidad de resultados (solo modo graded):
 * - immediate: el estudiante ve su nota al terminar
 * - after_all: se muestran cuando todos los estudiantes terminan
 * - manual: el docente libera manualmente los resultados
 */
export interface Quiz {
  id: string;                          // UUID
  courseId: string;                     // FK a Course.id
  title: string;                       // "Parcial 1 — Fundamentos TypeScript"
  description?: string;                // Instrucciones (Markdown)
  type: 'training' | 'graded';
  resultVisibility: 'immediate' | 'after_all' | 'manual';
  resultsReleased: boolean;            // Para modo 'manual': ¿resultados liberados?
  questions: QuizQuestion[];           // Preguntas embebidas
  timeLimit?: number;                  // Minutos (null = sin límite)
  shuffleQuestions: boolean;           // Mezclar orden de preguntas
  shuffleOptions: boolean;             // Mezclar orden de opciones
  maxAttempts: number;                 // 1 para graded, 0 = ilimitado
  lockBrowser: boolean;                // Anti-trampas: auto-enviar si pierde foco
  isActive: boolean;                   // ¿Visible para estudiantes?
  startDate?: string;                  // Fecha desde que está disponible
  endDate?: string;                    // Fecha hasta que se puede responder
  weight?: number;                     // Peso porcentual sobre la definitiva (ej: 20 = 20%)
  corteId?: string;                    // FK a Corte.id (período de evaluación)
  maxScore?: number;                   // Nota máxima (default: 5.0, escala colombiana)
  createdAt: string;
  updatedAt: string;
}

/**
 * QuizAnswer — Respuesta del estudiante a una pregunta
 */
export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string;            // Para single: la opción elegida
  selectedOptionIds?: string[];        // Para weighted: múltiples opciones elegidas
  pointsEarned: number;               // Se calcula automáticamente
}

/**
 * QuizAttempt — Intento de un estudiante en un parcial
 * Se almacena en /data/quiz-attempts.json
 */
export interface QuizAttempt {
  id: string;                          // UUID
  quizId: string;                      // FK a Quiz.id
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  answers: QuizAnswer[];
  score: number;                       // Puntaje obtenido
  maxScore: number;                    // Puntaje máximo posible
  percentage: number;                  // score/maxScore * 100
  attemptNumber: number;               // 1, 2, 3...
  startedAt: string;                   // ISO 8601
  completedAt?: string;                // ISO 8601 (null si en progreso)
  blurCount: number;                   // Veces que perdió foco de la ventana
  autoSubmitted: boolean;              // true si se envió por pérdida de foco
  flagged: boolean;                    // Marcado como sospechoso por el sistema
}

/**
 * QuizSimulation — Simulación de parcial por el docente
 * Se almacena en /data/quiz-simulations.json
 */
export interface QuizSimulation {
  id: string;                          // UUID
  quizId: string;                      // FK a Quiz.id
  courseId: string;                     // FK a Course.id
  adminId: string;                     // FK a User.id (docente)
  adminName: string;                   // Nombre del docente
  quizTitle: string;                   // Título del parcial (snapshot)
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  blurCount: number;
  autoSubmitted: boolean;
  simulatedAt: string;                 // ISO 8601
}

/**
 * CreateQuizRequest — Datos para crear un parcial
 */
export interface CreateQuizRequest {
  title: string;
  description?: string;
  type: 'training' | 'graded';
  resultVisibility: 'immediate' | 'after_all' | 'manual';
  timeLimit?: number;
  lockBrowser?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number;
  startDate?: string;
  endDate?: string;
  questions: {
    text: string;
    type: 'single' | 'weighted';
    points: number;
    options: {
      text: string;
      weight: number;
    }[];
  }[];
}

/**
 * UpdateQuizRequest — Datos para editar un parcial
 */
export interface UpdateQuizRequest {
  title?: string;
  description?: string;
  type?: 'training' | 'graded';
  resultVisibility?: 'immediate' | 'after_all' | 'manual';
  resultsReleased?: boolean;
  timeLimit?: number;
  lockBrowser?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  questions?: {
    text: string;
    type: 'single' | 'weighted';
    points: number;
    options: {
      text: string;
      weight: number;
    }[];
  }[];
}

/**
 * SubmitQuizRequest — Datos para enviar respuestas de un parcial
 */
export interface SubmitQuizRequest {
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
}

// ────────────────────────────────────────────────────────────
// Ítems de calificación manual (actividades externas)
// ────────────────────────────────────────────────────────────

/**
 * ManualGradeItem — Actividad externa/offline que el docente califica manualmente.
 * No requiere entrega en plataforma. Ej: exposición, quiz oral, taller en clase.
 * Se almacena en /data/manual-grade-items.json
 */
export interface ManualGradeItem {
  id: string;                          // UUID
  courseId: string;                     // FK a Course.id
  corteId?: string;                    // FK a Corte.id
  title: string;                       // "Exposición Tema 3"
  description?: string;                // Descripción opcional
  maxScore: number;                    // Nota máxima (default: 5.0)
  weight: number;                      // Peso porcentual (ej: 10 = 10%)
  createdAt: string;
  updatedAt: string;
}

/**
 * ManualGrade — Nota asignada a un estudiante en un ManualGradeItem.
 * Se almacena dentro de manual-grades.json
 */
export interface ManualGrade {
  id: string;                          // UUID
  itemId: string;                      // FK a ManualGradeItem.id
  studentId: string;                   // FK a User.id
  courseId: string;                     // FK a Course.id
  score: number;                       // Nota numérica
  maxScore: number;                    // Nota máxima
  feedback?: string;                   // Retroalimentación opcional
  gradedBy: string;                    // FK a User.id (admin)
  gradedAt: string;                    // ISO 8601
  updatedAt: string;
}

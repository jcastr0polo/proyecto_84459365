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

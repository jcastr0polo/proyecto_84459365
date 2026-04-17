/**
 * lib/schemas.ts
 * Esquemas Zod para validación de autenticación y sesiones
 * 
 * Fase 6 — Autenticación y Sesiones
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// AUTH SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * loginRequestSchema — Validación del body de POST /api/auth/login
 */
export const loginRequestSchema = z.object({
  email: z.string()
    .min(1, 'El email es requerido')
    .email('Formato de email inválido'),
  password: z.string()
    .min(1, 'La contraseña es requerida'),
});

/**
 * changePasswordRequestSchema — Validación del body de POST /api/auth/change-password
 */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string()
    .min(1, 'La contraseña actual es requerida'),
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string()
    .min(1, 'La confirmación de contraseña es requerida'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

/**
 * userSchema — Validación completa de un User en users.json
 */
export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  role: z.enum(['admin', 'student']),
  mustChangePassword: z.boolean(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  documentNumber: z.string().min(1),
  phone: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});

/**
 * sessionSchema — Validación de una Session en sessions.json
 */
export const sessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string(),
  expiresAt: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Tipos inferidos — Auth
export type LoginRequestZod = z.infer<typeof loginRequestSchema>;
export type ChangePasswordRequestZod = z.infer<typeof changePasswordRequestSchema>;
export type UserZod = z.infer<typeof userSchema>;
export type SessionZod = z.infer<typeof sessionSchema>;

// ────────────────────────────────────────────────────────────
// FASE 7 — SEMESTRES Y CURSOS SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * courseScheduleSchema — Horario de clase embebido
 */
export const courseScheduleSchema = z.object({
  dayOfWeek: z.enum(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  room: z.string().optional(),
  modality: z.enum(['presencial', 'virtual', 'híbrido']),
});

/**
 * semesterSchema — Validación completa de un Semester en semesters.json
 */
export const semesterSchema = z.object({
  id: z.string().regex(/^\d{4}(01|02)$/, 'Formato YYYYSS requerido (ej: 202601)'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  isActive: z.boolean(),
  createdAt: z.string(),
});

/**
 * createSemesterSchema — Validación del body de POST /api/semesters
 */
export const createSemesterSchema = z.object({
  id: z.string().regex(/^\d{4}(01|02)$/, 'Formato YYYYSS requerido (ej: 202601)'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  isActive: z.boolean().optional().default(false),
});

/**
 * updateSemesterSchema — Validación del body de PUT /api/semesters/[id]
 */
export const updateSemesterSchema = z.object({
  label: z.string().min(1, 'La etiqueta es requerida').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido').optional(),
  isActive: z.boolean().optional(),
});

/**
 * courseSchema — Validación completa de un Course en courses.json
 */
export const courseSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  semesterId: z.string().min(1),
  category: z.enum(['programming', 'design', 'management', 'leadership', 'other']),
  schedule: z.array(courseScheduleSchema).min(1, 'Al menos un horario es requerido (RN-CUR-03)'),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createCourseSchema — Validación del body de POST /api/courses
 */
export const createCourseSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  semesterId: z.string().min(1, 'El semestre es requerido'),
  category: z.enum(['programming', 'design', 'management', 'leadership', 'other']),
  schedule: z.array(courseScheduleSchema).min(1, 'Al menos un horario es requerido (RN-CUR-03)'),
});

/**
 * updateCourseSchema — Validación del body de PUT /api/courses/[id]
 */
export const updateCourseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  category: z.enum(['programming', 'design', 'management', 'leadership', 'other']).optional(),
  schedule: z.array(courseScheduleSchema).min(1, 'Al menos un horario es requerido (RN-CUR-03)').optional(),
  isActive: z.boolean().optional(),
});

// Tipos inferidos — Semestres y Cursos
export type CourseScheduleZod = z.infer<typeof courseScheduleSchema>;
export type SemesterZod = z.infer<typeof semesterSchema>;
export type CreateSemesterZod = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterZod = z.infer<typeof updateSemesterSchema>;
export type CourseZod = z.infer<typeof courseSchema>;
export type CreateCourseZod = z.infer<typeof createCourseSchema>;
export type UpdateCourseZod = z.infer<typeof updateCourseSchema>;

// ────────────────────────────────────────────────────────────
// FASE 9 — INSCRIPCIÓN DE ESTUDIANTES SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * enrollStudentSchema — Validación del body para inscribir un estudiante
 */
export const enrollStudentSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido').trim(),
  lastName: z.string().min(1, 'Apellido es requerido').trim(),
  email: z.string().email('Email inválido').trim().toLowerCase(),
  documentNumber: z.string()
    .regex(/^\d+$/, 'Documento debe ser numérico')
    .min(5, 'Documento debe tener mínimo 5 dígitos'),
  phone: z.string().optional(),
});

/**
 * bulkEnrollSchema — Validación del body para inscripción masiva
 */
export const bulkEnrollSchema = z.object({
  students: z.array(enrollStudentSchema).min(1, 'Al menos un estudiante es requerido'),
});

/**
 * enrollmentSchema — Validación completa de un Enrollment en enrollments.json
 */
export const enrollmentSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(['active', 'withdrawn']),
  enrolledAt: z.string(),
  enrolledBy: z.string(),
  withdrawnAt: z.string().optional(),
});

// Tipos inferidos — Inscripciones
export type EnrollStudentZod = z.infer<typeof enrollStudentSchema>;
export type BulkEnrollZod = z.infer<typeof bulkEnrollSchema>;
export type EnrollmentZod = z.infer<typeof enrollmentSchema>;

// ────────────────────────────────────────────────────────────
// FASE 11 — ACTIVIDADES Y MATERIAL SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * activityAttachmentSchema — Validación de un archivo adjunto de actividad
 */
export const activityAttachmentSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
  uploadedAt: z.string(),
});

/**
 * activitySchema — Validación completa de una Activity en activities.json
 */
export const activitySchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  type: z.enum(['project', 'exercise', 'document', 'presentation', 'prompt', 'exam', 'other']),
  category: z.enum(['individual', 'group']),
  attachments: z.array(activityAttachmentSchema),
  promptId: z.string().optional(),
  dueDate: z.string(),
  publishDate: z.string(),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0'),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100'),
  allowLateSubmission: z.boolean(),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'published', 'closed']),
  requiresFileUpload: z.boolean(),
  requiresLinkSubmission: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createActivitySchema — Validación del body de POST /api/courses/[id]/activities
 * Valida: título no vacío, maxScore > 0, weight 0-100, dueDate > publishDate
 */
export const createActivitySchema = z.object({
  title: z.string().min(1, 'El título es requerido').trim(),
  description: z.string().min(1, 'La descripción es requerida'),
  type: z.enum(['project', 'exercise', 'document', 'presentation', 'prompt', 'exam', 'other']),
  category: z.enum(['individual', 'group']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido'),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido'),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0'),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100'),
  allowLateSubmission: z.boolean().optional().default(false),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  requiresFileUpload: z.boolean().optional().default(false),
  requiresLinkSubmission: z.boolean().optional().default(false),
}).refine((data) => new Date(data.dueDate) > new Date(data.publishDate), {
  message: 'La fecha límite debe ser posterior a la fecha de publicación',
  path: ['dueDate'],
});

/**
 * updateActivitySchema — Validación del body de PUT /api/activities/[id]
 */
export const updateActivitySchema = z.object({
  title: z.string().min(1, 'El título es requerido').trim().optional(),
  description: z.string().optional(),
  type: z.enum(['project', 'exercise', 'document', 'presentation', 'prompt', 'exam', 'other']).optional(),
  category: z.enum(['individual', 'group']).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido').optional(),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido').optional(),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0').optional(),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100').optional(),
  allowLateSubmission: z.boolean().optional(),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  requiresFileUpload: z.boolean().optional(),
  requiresLinkSubmission: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
});

// Tipos inferidos — Actividades
export type ActivityAttachmentZod = z.infer<typeof activityAttachmentSchema>;
export type ActivityZod = z.infer<typeof activitySchema>;
export type CreateActivityZod = z.infer<typeof createActivitySchema>;
export type UpdateActivityZod = z.infer<typeof updateActivitySchema>;

// ────────────────────────────────────────────────────────────
// FASE 13 — ENTREGAS DE ESTUDIANTES SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * submissionLinkSchema — Validación de enlace de entrega
 * RN-ENT-06: URLs de GitHub/Vercel para cursos de programación
 */
export const submissionLinkSchema = z.object({
  type: z.enum(['github', 'vercel', 'figma', 'other']),
  url: z.string()
    .url('URL inválida')
    .refine((url) => {
      try {
        const u = new URL(url);
        return ['http:', 'https:'].includes(u.protocol);
      } catch {
        return false;
      }
    }, 'Solo se permiten URLs HTTP/HTTPS'),
  label: z.string().max(100).optional(),
});

/**
 * submissionAttachmentSchema — Validación de archivo adjunto de entrega
 */
export const submissionAttachmentSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
  uploadedAt: z.string(),
});

/**
 * submissionSchema — Validación completa de una Submission en submissions.json
 */
export const submissionSchema = z.object({
  id: z.string().min(1),
  activityId: z.string().min(1),
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  content: z.string().optional(),
  attachments: z.array(submissionAttachmentSchema),
  links: z.array(submissionLinkSchema),
  submittedAt: z.string(),
  isLate: z.boolean(),
  status: z.enum(['submitted', 'reviewed', 'returned', 'resubmitted']),
  version: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createSubmissionSchema — Validación del body de POST (entrega de estudiante)
 * RN-ENT-03: Validación de contenido mínimo
 */
export const createSubmissionSchema = z.object({
  content: z.string().max(5000, 'El comentario no puede exceder 5000 caracteres').optional(),
  links: z.array(submissionLinkSchema).max(10, 'Máximo 10 enlaces').optional(),
});

// Tipos inferidos — Entregas
export type SubmissionLinkZod = z.infer<typeof submissionLinkSchema>;
export type SubmissionAttachmentZod = z.infer<typeof submissionAttachmentSchema>;
export type SubmissionZod = z.infer<typeof submissionSchema>;
export type CreateSubmissionZod = z.infer<typeof createSubmissionSchema>;

// ────────────────────────────────────────────────────────────
// FASE 15 — CALIFICACIONES SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * gradeSchema — Validación completa de un Grade en grades.json
 * RN-CAL-01: score entre 0 y maxScore
 */
export const gradeSchema = z.object({
  id: z.string().min(1),
  submissionId: z.string().min(1),
  activityId: z.string().min(1),
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  score: z.number().min(0, 'La nota no puede ser negativa'),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0'),
  feedback: z.string().max(5000, 'La retroalimentación no puede exceder 5000 caracteres').optional(),
  isPublished: z.boolean(),
  publishedAt: z.string().optional(),
  gradedBy: z.string().min(1),
  gradedAt: z.string(),
  updatedAt: z.string(),
}).refine((data) => data.score <= data.maxScore, {
  message: 'La nota no puede exceder la nota máxima',
  path: ['score'],
});

/**
 * createGradeSchema — Validación del body de POST /api/grades
 * RF-CAL-01: Calificar entrega con nota y retroalimentación
 * RN-CAL-01: score >= 0 && score <= maxScore (validación en servicio contra actividad)
 */
export const createGradeSchema = z.object({
  submissionId: z.string().min(1, 'El ID de la entrega es requerido'),
  activityId: z.string().min(1, 'El ID de la actividad es requerido'),
  studentId: z.string().min(1, 'El ID del estudiante es requerido'),
  courseId: z.string().min(1, 'El ID del curso es requerido'),
  score: z.number().min(0, 'La nota no puede ser negativa'),
  feedback: z.string().max(5000, 'La retroalimentación no puede exceder 5000 caracteres').optional(),
});

/**
 * updateGradeSchema — Validación del body de PUT /api/grades/[id]
 */
export const updateGradeSchema = z.object({
  score: z.number().min(0, 'La nota no puede ser negativa').optional(),
  feedback: z.string().max(5000, 'La retroalimentación no puede exceder 5000 caracteres').optional(),
});

// Tipos inferidos — Calificaciones
export type GradeZod = z.infer<typeof gradeSchema>;
export type CreateGradeZod = z.infer<typeof createGradeSchema>;
export type UpdateGradeZod = z.infer<typeof updateGradeSchema>;

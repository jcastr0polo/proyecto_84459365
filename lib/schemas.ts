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
  corteId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  type: z.enum(['project', 'exercise', 'document', 'presentation', 'prompt', 'exam', 'other']),
  category: z.enum(['individual', 'group']),
  attachments: z.array(activityAttachmentSchema),
  promptId: z.string().optional(),
  dueDate: z.string(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  publishDate: z.string(),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0'),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100'),
  allowLateSubmission: z.boolean(),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'published', 'closed']),
  requiresFileUpload: z.boolean(),
  requiresLinkSubmission: z.boolean(),
  projectRequired: z.boolean().optional(),
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
  corteId: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido'),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional().default('23:59'),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido'),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional().default('00:00'),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0'),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100'),
  allowLateSubmission: z.boolean().optional().default(false),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  requiresFileUpload: z.boolean().optional().default(false),
  requiresLinkSubmission: z.boolean().optional().default(false),
  projectRequired: z.boolean().optional().default(false),
}).refine((data) => {
  const dueH = (data.dueTime || '23:59').split(':').map(Number);
  const pubH = (data.publishTime || '00:00').split(':').map(Number);
  const dueMs = new Date(data.dueDate).getTime() + (dueH[0] * 60 + dueH[1]) * 60000;
  const pubMs = new Date(data.publishDate).getTime() + (pubH[0] * 60 + pubH[1]) * 60000;
  return dueMs > pubMs;
}, {
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
  corteId: z.string().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido').optional(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional(),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/, 'Formato de fecha inválido').optional(),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional(),
  maxScore: z.number().positive('La nota máxima debe ser mayor que 0').optional(),
  weight: z.number().min(0, 'El peso no puede ser negativo').max(100, 'El peso no puede superar 100').optional(),
  allowLateSubmission: z.boolean().optional(),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  requiresFileUpload: z.boolean().optional(),
  requiresLinkSubmission: z.boolean().optional(),
  projectRequired: z.boolean().optional(),
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

// ────────────────────────────────────────────────────────────
// FASE 18 — PROMPTS DE IA SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * promptSchema — Validación completa de un AIPrompt en prompts.json
 */
export const promptSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  activityId: z.string().optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  version: z.number().int().positive(),
  tags: z.array(z.string()),
  isTemplate: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createPromptSchema — Validación del body de POST /api/prompts
 */
export const createPromptSchema = z.object({
  courseId: z.string().min(1, 'El ID del curso es requerido'),
  activityId: z.string().optional(),
  title: z.string().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres'),
  content: z.string().min(1, 'El contenido del prompt es requerido'),
  tags: z.array(z.string().max(50)).max(20, 'Máximo 20 tags').default([]),
  isTemplate: z.boolean().default(false),
});

/**
 * updatePromptSchema — Validación del body de PUT /api/prompts/[id]
 * RN-PRM-02: Al editar se incrementa la versión
 */
export const updatePromptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isTemplate: z.boolean().optional(),
  activityId: z.string().nullable().optional(),
});

// Tipos inferidos — Prompts
export type PromptZod = z.infer<typeof promptSchema>;
export type CreatePromptZod = z.infer<typeof createPromptSchema>;
export type UpdatePromptZod = z.infer<typeof updatePromptSchema>;

// ────────────────────────────────────────────────────────────
// FASE 19 — PROYECTOS ESTUDIANTILES SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * githubUrlSchema — Validación de URL de GitHub
 * RN-PRY-02: Debe empezar con https://github.com/
 */
const githubUrlSchema = z.string()
  .url('URL de GitHub inválida')
  .refine((url) => url.startsWith('https://github.com/'), {
    message: 'La URL de GitHub debe empezar con https://github.com/',
  });

/**
 * vercelUrlSchema — Validación de URL de Vercel
 * RN-PRY-02: Debe ser HTTPS y terminar en .vercel.app
 */
const vercelUrlSchema = z.string()
  .url('URL de Vercel inválida')
  .refine((url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
    } catch { return false; }
  }, { message: 'La URL de Vercel debe ser HTTPS y terminar en .vercel.app' });

/**
 * projectSchema — Validación completa de un StudentProject en projects.json
 */
export const projectSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  activityId: z.string().optional(),
  projectName: z.string().min(1),
  description: z.string().optional(),
  githubUrl: githubUrlSchema,
  vercelUrl: vercelUrlSchema.optional(),
  figmaUrl: z.string().url().optional(),
  documentUrl: z.string().optional(),
  isPublic: z.boolean(),
  isFeatured: z.boolean(),
  isBlockedFromShowcase: z.boolean().optional(),
  showcaseDescription: z.string().optional(),
  showcaseImageUrl: z.string().optional(),
  status: z.enum(['in-progress', 'submitted', 'reviewed', 'featured']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createProjectSchema — Validación del body de POST /api/projects
 * RN-PRY-01: GitHub URL obligatorio
 */
export const createProjectSchema = z.object({
  projectName: z.string().min(1, 'El nombre del proyecto es requerido').max(300).trim(),
  description: z.string().max(1000, 'La descripción no puede exceder 1000 caracteres').optional(),
  githubUrl: githubUrlSchema,
  vercelUrl: vercelUrlSchema.optional().or(z.literal('')),
  figmaUrl: z.string().url('URL de Figma inválida').optional().or(z.literal('')),
  isPublic: z.boolean().optional().default(false),
});

/**
 * updateProjectSchema — Validación del body de PUT /api/projects/[id]
 * RN-PRY-04: isFeatured solo puede ser seteado por admin (validar en API)
 */
export const updateProjectSchema = z.object({
  projectName: z.string().min(1).max(300).trim().optional(),
  description: z.string().max(1000).optional(),
  githubUrl: githubUrlSchema.optional(),
  vercelUrl: vercelUrlSchema.optional().or(z.literal('')),
  figmaUrl: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBlockedFromShowcase: z.boolean().optional(),
  showcaseDescription: z.string().max(500).optional().or(z.literal('')),
  showcaseImageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['in-progress', 'submitted', 'reviewed', 'featured']).optional(),
});

// Tipos inferidos — Proyectos
export type ProjectZod = z.infer<typeof projectSchema>;
export type CreateProjectZod = z.infer<typeof createProjectSchema>;
export type UpdateProjectZod = z.infer<typeof updateProjectSchema>;

// ────────────────────────────────────────────────────────────
// CORTES ACADÉMICOS SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * corteSchema — Validación completa de un Corte en cortes.json
 */
export const corteSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(1, 'El peso mínimo es 1%').max(100, 'El peso máximo es 100%'),
  order: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * createCorteSchema — Validación del body de POST /api/courses/[id]/cortes
 */
export const createCorteSchema = z.object({
  name: z.string().min(1, 'El nombre del corte es requerido').max(100).trim(),
  weight: z.number().min(1, 'El peso mínimo es 1%').max(100, 'El peso máximo es 100%'),
  order: z.number().int().min(1).optional(),
});

/**
 * updateCorteSchema — Validación del body de PUT /api/courses/[id]/cortes/[corteId]
 */
export const updateCorteSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  weight: z.number().min(1).max(100).optional(),
  order: z.number().int().min(1).optional(),
});

// Tipos inferidos — Cortes
export type CorteZod = z.infer<typeof corteSchema>;
export type CreateCorteZod = z.infer<typeof createCorteSchema>;
export type UpdateCorteZod = z.infer<typeof updateCorteSchema>;

// ────────────────────────────────────────────────────────────
// QUIZ / PARCIALES SCHEMAS
// ────────────────────────────────────────────────────────────

const quizOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const quizQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(['single', 'weighted']),
  options: z.array(quizOptionSchema).min(2),
  points: z.number().min(0),
  order: z.number().int().min(0),
});

export const quizSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['training', 'graded']),
  resultVisibility: z.enum(['immediate', 'after_all', 'manual']),
  resultsReleased: z.boolean(),
  questions: z.array(quizQuestionSchema),
  timeLimit: z.number().int().min(1).nullable().optional(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  lockBrowser: z.boolean(),
  maxAttempts: z.number().int().min(0),
  isActive: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const quizOptionInput = z.object({
  text: z.string().min(1, 'El texto de la opción es requerido').max(500),
  weight: z.number().min(0).max(100),
});

const quizQuestionInput = z.object({
  text: z.string().min(1, 'El enunciado es requerido').max(2000),
  type: z.enum(['single', 'weighted']),
  points: z.number().min(0.01, 'El puntaje mínimo es 0.01'),
  options: z.array(quizOptionInput).min(2, 'Mínimo 2 opciones'),
});

export const createQuizSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200).trim(),
  description: z.string().max(5000).optional(),
  type: z.enum(['training', 'graded']),
  resultVisibility: z.enum(['immediate', 'after_all', 'manual']).optional(),
  timeLimit: z.number().int().min(1).nullable().optional(),
  lockBrowser: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  maxAttempts: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  questions: z.array(quizQuestionInput).min(1, 'Al menos una pregunta'),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['training', 'graded']).optional(),
  resultVisibility: z.enum(['immediate', 'after_all', 'manual']).optional(),
  resultsReleased: z.boolean().optional(),
  timeLimit: z.number().int().min(1).nullable().optional(),
  lockBrowser: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  maxAttempts: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  questions: z.array(quizQuestionInput).min(1).optional(),
});

export const submitQuizSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptionId: z.string().min(1),
  })).min(1, 'Debes responder al menos una pregunta'),
  blurCount: z.number().int().min(0).optional(),
  autoSubmitted: z.boolean().optional(),
});

const quizAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  pointsEarned: z.number().min(0),
});

export const quizAttemptSchema = z.object({
  id: z.string().min(1),
  quizId: z.string().min(1),
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  answers: z.array(quizAnswerSchema),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100),
  attemptNumber: z.number().int().min(1),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  blurCount: z.number().int().min(0),
  autoSubmitted: z.boolean(),
  flagged: z.boolean(),
});

export const quizSimulationSchema = z.object({
  id: z.string().min(1),
  quizId: z.string().min(1),
  courseId: z.string().min(1),
  adminId: z.string().min(1),
  adminName: z.string().min(1),
  quizTitle: z.string().min(1),
  answers: z.array(quizAnswerSchema),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100),
  blurCount: z.number().int().min(0),
  autoSubmitted: z.boolean(),
  simulatedAt: z.string(),
});

// Tipos inferidos — Quizzes
export type QuizZod = z.infer<typeof quizSchema>;
export type CreateQuizZod = z.infer<typeof createQuizSchema>;
export type UpdateQuizZod = z.infer<typeof updateQuizSchema>;
export type SubmitQuizZod = z.infer<typeof submitQuizSchema>;
export type QuizAttemptZod = z.infer<typeof quizAttemptSchema>;
export type QuizSimulationZod = z.infer<typeof quizSimulationSchema>;

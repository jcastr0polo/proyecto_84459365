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

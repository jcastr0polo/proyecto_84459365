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

// Tipos inferidos
export type LoginRequestZod = z.infer<typeof loginRequestSchema>;
export type ChangePasswordRequestZod = z.infer<typeof changePasswordRequestSchema>;
export type UserZod = z.infer<typeof userSchema>;
export type SessionZod = z.infer<typeof sessionSchema>;

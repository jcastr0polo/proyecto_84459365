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

# 📋 Resumen Fase 6 — Autenticación y Sesiones

> **Estado:** ✅ Completada  
> **Rol asignado:** Ingeniero Backend Senior  
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §15, PROMPTS_PLATAFORMA.md Prompt #1  

---

## 🎯 Objetivo

Implementar el sistema completo de autenticación basado en sesiones con cookies HttpOnly, incluyendo login, logout, cambio de contraseña y middleware de protección de rutas. Sin JWT, sin dependencias de sesión externas.

---

## 📦 Dependencias Instaladas

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `bcryptjs` | 3.0.3 | Hashing de contraseñas (10 salt rounds) |
| `uuid` | 13.0.0 | Generación de tokens de sesión (UUID v4) |
| `@types/bcryptjs` | 2.4.6 | Tipos TypeScript |
| `@types/uuid` | 10.0.0 | Tipos TypeScript |

---

## 📁 Archivos Creados

### Datos (`/data`)

| Archivo | Descripción |
|---------|-------------|
| `users.json` | Array de usuarios. Precargado con admin: `docente@universidad.edu.co` |
| `sessions.json` | Array de sesiones activas. Inicia vacío |

### Librería (`/lib`)

| Archivo | Exports principales |
|---------|-------------------|
| `schemas.ts` | `loginRequestSchema`, `changePasswordRequestSchema`, `userSchema`, `sessionSchema` (Zod) |
| `auth.ts` | `hashPassword`, `verifyPassword`, `createSession`, `validateSession`, `destroySession`, `setSessionCookie`, `clearSessionCookie`, `cleanExpiredSessions` |
| `withAuth.ts` | `withAuth` (middleware wrapper), `toSafeUser` |

### API Routes (`/app/api/auth`)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/auth/login` | POST | Login con email + contraseña → cookie + SafeUser |
| `/api/auth/logout` | POST | Destruir sesión + limpiar cookie |
| `/api/auth/me` | GET | Datos del usuario autenticado (protegido) |
| `/api/auth/change-password` | POST | Cambiar contraseña (protegido) |

### Páginas (`/app`)

| Ruta | Descripción |
|------|-------------|
| `/login` | Formulario de inicio de sesión (Client Component) |
| `/change-password` | Formulario de cambio de contraseña (Client Component) |

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/types.ts` | +Tipos: `User`, `SafeUser`, `Session`, `LoginRequest`, `LoginResponse`, `ChangePasswordRequest` |
| `lib/dataService.ts` | +Funciones: `writeJsonFile`, `readUsers`, `writeUsers`, `getUserByEmail`, `getUserById`, `readSessions`, `writeSessions`, `cleanExpiredSessions` |

---

## 🔐 Decisiones de Seguridad

| Decisión | Detalle |
|----------|---------|
| **Hashing** | bcrypt con 10 salt rounds (≈100ms por hash) |
| **Tokens de sesión** | UUID v4 (criptográficamente seguro, 36 chars) |
| **Cookie** | HttpOnly, SameSite=Strict, Secure (prod), Path=/, Max-Age=86400 |
| **Expiración** | 24 horas. Sesiones expiradas se limpian en cada login |
| **Mensajes de error** | Genéricos en login ("Email o contraseña incorrectos") — no revelan existencia de email |
| **Password policy** | Mínimo 8 caracteres, nueva ≠ actual |
| **Primer login** | `mustChangePassword: true` fuerza redirección a `/change-password` |
| **Cuentas desactivadas** | `isActive: false` → 403, no pueden iniciar sesión |

---

## 👤 Usuario Admin Precargado

| Campo | Valor |
|-------|-------|
| ID | `admin-001` |
| Email | `docente@universidad.edu.co` |
| Contraseña | `84459365` (hasheada con bcrypt) |
| Rol | `admin` |
| Nombre | Docente Administrador |
| Documento | 84459365 |
| mustChangePassword | `true` |

---

## 🏗️ Arquitectura Implementada

```
Request → Route Handler → withAuth middleware → Business Logic → Response
                             ↓
                      validateSession(cookie)
                             ↓
                      getUserById(session.userId)
                             ↓
                      check isActive + role
```

### Patrón withAuth

```typescript
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    // user ya está validado, activo y con rol correcto
    return NextResponse.json({ data: '...' });
  }, 'admin'); // rol opcional
}
```

---

## ✅ Validación

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run lint` | ✅ 0 errores de Fase 6 (2 warnings pre-existentes de fases anteriores) |
| Zod schemas | ✅ loginRequest, changePassword, user, session |
| Tipos TypeScript | ✅ Estrictos, sin `any` |

---

## 🔗 Reglas de Negocio Cubiertas

| Regla | Estado |
|-------|--------|
| RN-AUTH-01: Un solo admin (docente) | ✅ |
| RN-AUTH-02: Contraseña inicial = cédula | ✅ (84459365) |
| RN-AUTH-03: Cambio obligatorio primer login | ✅ (mustChangePassword) |
| RN-AUTH-04: Login por email | ✅ |
| RN-AUTH-05: Sesión 24h con cookie HttpOnly | ✅ |
| RN-AUTH-07: Cuentas desactivadas bloqueadas | ✅ |
| CU-01: Flujo de inicio de sesión | ✅ |
| CU-12: Flujo de cambio de contraseña | ✅ |

---

## ⚠️ Pendiente para Fases Posteriores

- Páginas `/admin` y `/student` aún no existen (redirección post-login)
- Middleware global Next.js para protección de rutas (Fase 24)
- Registro de estudiantes (Fase 9)
- Rate limiting en login (Fase 24)
- CSRF protection adicional (Fase 24)

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos creados | 10 |
| Archivos modificados | 2 |
| Líneas de código nuevas | ~750 |
| Dependencias añadidas | 4 (2 runtime + 2 dev) |
| Endpoints API | 4 |
| Páginas UI | 2 |

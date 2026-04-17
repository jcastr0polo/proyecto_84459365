# RESUMEN FASE 23 — Navegación, Layout y Temas

> Fase completada: 17 de Abril 2026
> Rol: Diseñador de Sistemas de Diseño (Design System Architect)

---

## Objetivo

Unificar toda la aplicación como un solo producto coherente. Sistema de temas oscuro/claro, tokens de diseño CSS, layouts diferenciados para admin (sidebar) y student (top navbar), breadcrumbs, y migración de páginas compartidas (login, change-password) a Tailwind + tokens.

---

## Archivos Creados

| Archivo | Descripción |
| ------- | ----------- |
| `components/ThemeProvider.tsx` | Context provider para temas dark/light + ThemeToggle button + localStorage persistence + OS prefers-color-scheme + useSyncExternalStore hydration |
| `app/admin/students/page.tsx` | Página global de búsqueda de estudiantes (nuevo item de navegación) — filtro por nombre, email, documento, curso |

## Archivos Modificados

| Archivo | Cambio |
| ------- | ------ |
| `app/globals.css` | Reescritura completa: 100+ CSS custom properties para dark/light themes (backgrounds, surfaces, text, accent, semantic, shadows, radius, spacing, transitions), scrollbar styling, selection colors |
| `app/layout.tsx` | ThemeProvider wrapper, suppressHydrationWarning, token-based body classes |
| `app/admin/layout.tsx` | Reescrito: 5 nav items (Dashboard, Cursos, Estudiantes, Prompts, Configuración), breadcrumbs dinámicos, semester badge, ThemeToggle, change-password link, CSS tokens |
| `app/student/layout.tsx` | Reescrito: de sidebar a TOP NAVBAR horizontal, user dropdown menu, mobile hamburger, ThemeToggle, CSS tokens |
| `app/login/page.tsx` | Reescrito: de inline styles a Tailwind + CSS tokens + motion entrance + toggle mostrar/ocultar contraseña |
| `app/change-password/page.tsx` | Migrado a CSS tokens (surface-border, accent-bg, success-bg) |
| `app/showcase/ShowcaseClient.tsx` | Migrado bg-black a CSS token |

---

## Sistema de Temas

### Arquitectura

1. `ThemeProvider` envuelve el árbol en `app/layout.tsx`
2. Establece `data-theme` attribute en `<html>` element
3. CSS custom properties cambian según `[data-theme="dark"]` / `[data-theme="light"]`
4. Tailwind clases usan `var(--color-*)` para ser theme-aware

### Persistencia

| Prioridad | Fuente |
| --------- | ------ |
| 1 | localStorage (`platform-theme`) |
| 2 | OS preference (`prefers-color-scheme`) |
| 3 | Config default (`dark`) |

### Toggle

- Componente `ThemeToggle` disponible para cualquier layout
- Ícono sol/luna, tooltip con label accesible
- Ubicado en header de admin y navbar de student

---

## Tokens de Diseño CSS

### Categorías

| Categoría | Variables | Ejemplo |
| --------- | --------- | ------- |
| Backgrounds | 3 | `--color-bg-primary/secondary/tertiary` |
| Surfaces | 5 | `--color-surface`, `--color-surface-hover`, etc. |
| Text | 4 | `--color-text-primary` → `--color-text-quaternary` |
| Accent | 4 | `--color-accent`, `--color-accent-bg`, etc. |
| Semantic | 12 | success/warning/error/info × (color, bg, border) |
| Shadows | 3 | `--shadow-sm/md/lg` |
| Border Radius | 6 | `--radius-sm` → `--radius-full` |
| Spacing | 12 | `--space-1` → `--space-16` |
| Transitions | 3 | `--transition-fast/normal/slow` |

### Dark Theme (default)

- Background: #000000 → #111111
- Text: #ffffff → rgba(255,255,255,0.20)
- Accent: #06b6d4 (cyan-500)
- Surfaces: rgba(255,255,255, 0.02-0.06)

### Light Theme

- Background: #ffffff → #f5f5f5
- Text: #0a0a0a → rgba(10,10,10,0.25)
- Accent: #0891b2 (cyan-600, deeper for contrast)
- Surfaces: rgba(0,0,0, 0.02-0.06)

---

## Admin Layout

| Feature | Detalle |
| ------- | ------- |
| Sidebar | 5 items: Dashboard, Cursos, Estudiantes, Prompts, Configuración |
| Breadcrumbs | Dinámicos basados en pathname con labels legibles |
| Semester badge | Green pulse dot + semester label en header |
| ThemeToggle | Sol/luna en header |
| User section | Avatar initials, nombre, role, change-password, logout |
| Mobile | Hamburger → sidebar slide-in con backdrop |

## Student Layout

| Feature | Detalle |
| ------- | ------- |
| Navbar | Horizontal top bar (no sidebar) |
| Nav links | Inicio, Mis Cursos, Mi Perfil |
| User dropdown | Avatar → dropdown con Perfil, Cambiar contraseña, Cerrar sesión |
| ThemeToggle | En navbar |
| Mobile | Hamburger → dropdown nav + links, close on nav click |

---

## Consistencia Visual

### Login Page

- Rediseñada de inline styles a Tailwind + CSS tokens
- Motion entrance animation
- Toggle mostrar/ocultar contraseña
- Error toast con token colors

### Change Password

- Migrada a CSS token variables para títulos, borders, backgrounds
- Theme-aware success/error states

---

## Validaciones

- **TypeScript**: `npx tsc --noEmit` → 0 errores
- **ESLint**: `npx eslint` → 0 errores, 0 warnings en archivos nuevos/modificados

---

## Stack

- Next.js 16.2.2 + React 19.2.4 + TypeScript 5
- Tailwind CSS 4 + Framer Motion 12.38.0
- CSS Custom Properties (100+ tokens)
- Dark/Light theme via data-theme attribute
- No modificaciones de backend

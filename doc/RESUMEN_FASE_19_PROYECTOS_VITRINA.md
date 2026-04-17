# RESUMEN FASE 19 — Proyectos Estudiantiles y Vitrina Pública

> Fase completada: 17 de Abril 2026
> Rol: Diseñador UX/UI Senior + Ingeniero Fullstack

---

## Objetivo

Implementar el sistema completo de Proyectos Estudiantiles: registro por parte del estudiante (con URLs de GitHub, Vercel, Figma), gestión administrativa con toggle de "destacar", y una vitrina pública impactante con animaciones Framer Motion para mostrar los proyectos más destacados del semestre.

---

## Archivos Creados

### Backend (Tipos, Schemas, Data, API)

| Archivo | Descripción |
|---------|-------------|
| `data/projects.json` | Base de datos JSON para proyectos (inicializada vacía) |
| `lib/types.ts` | Interfaces `StudentProject`, `CreateProjectRequest`, `UpdateProjectRequest` |
| `lib/schemas.ts` | Schemas Zod con validadores de URL: `githubUrlSchema`, `vercelUrlSchema`, `projectSchema`, `createProjectSchema`, `updateProjectSchema` |
| `lib/dataService.ts` | Funciones: `readProjects`, `writeProjects`, `getProjectById`, `getProjectsByCourse`, `getProjectByStudentAndCourse` |
| `app/api/projects/route.ts` | GET (listar con filtros: courseId, featured, public, enrichment con nombres) + POST (crear, estudiante autenticado inscrito en curso) |
| `app/api/projects/[id]/route.ts` | GET (detalle con enrichment, sin auth) + PUT (admin: isFeatured/status; estudiante: solo campos propios) |

### Frontend (Páginas)

| Archivo | Descripción |
|---------|-------------|
| `app/student/courses/[courseId]/project/page.tsx` | Registro/edición de proyecto. Validación de URLs en tiempo real. Toggle "publicar en vitrina". Preview de cómo se ve en la vitrina. |
| `app/admin/courses/[courseId]/projects/page.tsx` | Grid de proyectos del curso. Toggle ⭐ destacar. Links directos a GitHub/Vercel/Figma. Control de estado por proyecto. Stats (total, destacados, públicos). |
| `app/showcase/page.tsx` | **Server Component** público (sin auth). Lee datos de `dataService` directamente. Filtra `isPublic && isFeatured`. Pasa datos enriquecidos a `ShowcaseClient`. |
| `app/showcase/ShowcaseClient.tsx` | **Client Component** con Framer Motion. Hero header con stats. Filtro por curso. Grid animado con stagger. Cards con hover effects, gradientes sutiles cyan/purple, botones a GitHub/Vercel/Figma. |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/types.ts` | Agregadas interfaces `StudentProject`, `CreateProjectRequest`, `UpdateProjectRequest` |
| `lib/schemas.ts` | Agregados `githubUrlSchema`, `vercelUrlSchema`, `projectSchema`, `createProjectSchema`, `updateProjectSchema` |
| `lib/dataService.ts` | Agregadas 5 funciones CRUD para proyectos + imports actualizados |

---

## Reglas de Negocio Implementadas

| Regla | Descripción |
|-------|-------------|
| RN-PRY-01 | Estudiante registra proyecto con GitHub URL obligatorio |
| RN-PRY-02 | Validación de URLs: GitHub debe empezar con `https://github.com/`, Vercel debe ser HTTPS y terminar en `.vercel.app` |
| RN-PRY-03 | Solo proyectos con `isPublic: true` e `isFeatured: true` aparecen en la vitrina pública |
| RN-PRY-04 | Solo el admin puede marcar `isFeatured: true` — estudiantes no pueden modificar este campo |

---

## Flujos Implementados

### Estudiante: Registrar Proyecto
1. Navegar al curso → "Mi Proyecto"
2. Si no tiene proyecto → formulario de registro con campos: nombre, descripción, GitHub (requerido), Vercel, Figma, toggle público
3. Validación de URLs en tiempo real (borde rojo si inválida)
4. Preview de cómo se verá en la vitrina (si "público" está activo)
5. Si ya tiene proyecto → vista con datos, links, badges de estado → botón "Editar"

### Admin: Gestionar Proyectos
1. Navegar al curso → "Proyectos Estudiantiles"
2. Ver grid con todos los proyectos del curso
3. Stats: total, destacados, públicos
4. Click ⭐ para toggle destacar/no destacar
5. Buttons de estado: En progreso → Entregado → Revisado → Destacado
6. Links directos a GitHub/Vercel/Figma (abren en nueva pestaña)

### Visitante: Vitrina Pública
1. Acceder a `/showcase` (sin login requerido)
2. Hero header animado con título, descripción del semestre, stats
3. Filtros por curso (pills con conteo)
4. Grid de cards con animaciones stagger (spring)
5. Cada card: nombre, estudiante, curso, descripción, tech dots
6. Botones: "GitHub" + "Ver Demo" (Vercel) + Figma (si existe)
7. Hover: cards se elevan (-4px), gradientes se activan, bordes se iluminan

---

## Decisiones de Diseño (Showcase)

| Aspecto | Decisión |
|---------|----------|
| Arquitectura | Server Component lee datos → Client Component anima |
| Animaciones | Framer Motion: stagger 0.08s, spring (stiffness 200, damping 20), hover y: -4 |
| Visual | Fondo negro, gradientes cyan/purple sutiles, cards con backdrop-blur |
| Tipografía | Título con gradient text (cyan-400 → cyan-300) |
| Background | Glow difuso de 600px con blur 120px centrado |
| Cards | border-white/[0.06], hover to border-white/[0.12], bg gradient de cyan-500/10 a purple-500/5 |
| Footer | Mención al stack y semestre |

---

## Validaciones

- **TypeScript**: `npx tsc --noEmit` → 0 errores
- **ESLint**: `npx eslint .` → 0 errores nuevos

---

## Stack Tecnológico

- Next.js 16.2.2 + React 19.2.4 + TypeScript 5
- Tailwind CSS 4 + Framer Motion 12.38.0
- Zod para validación de schemas (incluye URL validation)
- JSON files como base de datos
- Dark theme (#000 bg, #06b6d4 cyan accent)
- Server Components para la vitrina pública (sin auth, lectura directa de datos)

# RESUMEN FASE 18 — Prompts de IA (Backend y Frontend)

> Fase completada: 17 de Abril 2026
> Rol: Ingeniero Fullstack + Experto IA Educativa

---

## Objetivo

Implementar el sistema completo de gestión de Prompts de IA para la plataforma académica: creación, edición con versionamiento automático, distribución a estudiantes mediante vinculación a actividades, y funcionalidad de copia al portapapeles.

---

## Archivos Creados

### Backend (Tipos, Schemas, Data, API)

| Archivo | Descripción |
|---------|-------------|
| `data/prompts.json` | Base de datos JSON para prompts (inicializada vacía) |
| `lib/types.ts` | Interfaces `AIPrompt`, `CreatePromptRequest`, `UpdatePromptRequest` + campo `promptId?` en `Activity` |
| `lib/schemas.ts` | Schemas Zod: `promptSchema`, `createPromptSchema`, `updatePromptSchema` |
| `lib/dataService.ts` | Funciones: `readPrompts`, `writePrompts`, `getPromptById`, `getPromptsByCourse` |
| `app/api/prompts/route.ts` | GET (listar con filtros: courseId, tag, isTemplate) + POST (crear, admin only) |
| `app/api/prompts/[id]/route.ts` | GET (detalle) + PUT (editar con versionamiento automático, admin only) |

### Frontend (Componentes)

| Archivo | Descripción |
|---------|-------------|
| `components/prompts/TagInput.tsx` | Input de chips con Enter/coma para agregar, backspace/× para eliminar, max 10 |
| `components/prompts/PromptCard.tsx` | Tarjeta para listados con title, course badge, version, tags, preview |
| `components/prompts/PromptEditor.tsx` | Editor Markdown split-view con preview en vivo, campos: título, curso, tags, template |
| `components/prompts/PromptViewer.tsx` | Visor read-only con renderizado Markdown, botón "📋 Copiar Prompt", modo pantalla completa |

### Frontend (Páginas Admin)

| Archivo | Descripción |
|---------|-------------|
| `app/admin/prompts/page.tsx` | Listado con stats, filtros (curso, plantilla, búsqueda), grid de PromptCards |
| `app/admin/prompts/new/page.tsx` | Formulario de creación con PromptEditor, POST a /api/prompts |
| `app/admin/prompts/[promptId]/page.tsx` | Detalle/edición con vista y modo editor, info de versión, PUT a /api/prompts/[id] |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `app/admin/layout.tsx` | Agregada entrada "🤖 Prompts IA" en `NAV_ITEMS` del sidebar |
| `components/activities/ActivityDetail.tsx` | Nueva prop `promptSlot?: React.ReactNode` renderizada entre adjuntos y requisitos |
| `app/student/courses/[courseId]/activities/[actId]/page.tsx` | Fetch de prompt vinculado si `activity.promptId` existe, muestra `PromptViewer` con copy |

---

## Reglas de Negocio Implementadas

| Regla | Descripción |
|-------|-------------|
| RN-PRM-01 | Solo admin puede crear y editar prompts (withAuth + 'admin') |
| RN-PRM-02 | Versionamiento automático: cada PUT incrementa `version` |
| RN-PRM-03 | Soporte de plantillas reutilizables (`isTemplate`) |
| RN-PRM-04 | Vinculación prompt → actividad vía `promptId` |
| RN-PRM-05 | Estudiantes pueden ver y copiar el prompt desde el detalle de actividad |

---

## Flujos Implementados

### Admin: Gestión de Prompts
1. Sidebar → "Prompts IA" → Lista con stats y filtros
2. Clic "Nuevo Prompt" → Editor split-view → Crear
3. Clic en card → Vista detalle con copy → Botón "Editar" → Editor con datos precargados → Guardar nueva versión

### Estudiante: Consumo de Prompt
1. Detalle de actividad → Si actividad tiene `promptId` → Se muestra sección "Prompt de IA"
2. PromptViewer con renderizado Markdown
3. Botón "📋 Copiar Prompt" → clipboard + toast de confirmación
4. Botón pantalla completa para prompts largos

---

## Validaciones

- **TypeScript**: `npx tsc --noEmit` → 0 errores
- **ESLint**: `npx eslint .` → 0 errores nuevos (3 warnings pre-existentes)

---

## Stack Tecnológico

- Next.js 16.2.2 + React 19.2.4 + TypeScript 5
- Tailwind CSS 4 + framer-motion 12.38.0
- Zod para validación de schemas
- JSON files como base de datos
- Dark theme (#000 bg, #06b6d4 cyan accent)

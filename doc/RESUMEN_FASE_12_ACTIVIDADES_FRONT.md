# Resumen Fase 12 — Actividades y Material (Frontend)

> **Estado:** Completada
> **Rol asignado:** Diseñador Frontend Obsesivo
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §11, §13, §13.4

---

## Objetivo

Construir la interfaz completa para gestión de actividades académicas: lista con filtros y peso acumulado, formulario con descripción Markdown y preview en vivo, vista de detalle con countdown y acciones, y vista de estudiante con sección de entrega.

---

## Archivos Creados (11) + Modificados (1)

### Componentes UI Reutilizables

| Componente | Descripción |
| ---------- | ----------- |
| FileUploadZone.tsx | Drag & drop con validación de tamaño, feedback visual |
| DatePicker.tsx | Wrapper date/datetime-local con estilo unificado y errores |
| Countdown.tsx | Cuenta regresiva con urgencia: rojo < 6h, ámbar < 1d |

### Componentes de Actividades

| Componente | Descripción |
| ---------- | ----------- |
| MarkdownRenderer.tsx | Markdown a HTML ligero (headings, bold, code, links, listas) |
| ActivityCard.tsx | Card para lista: badges tipo/estado, fecha, peso, countdown |
| ActivityForm.tsx | Formulario 5 secciones con preview MD y toggle de opciones |
| ActivityDetail.tsx | Vista detalle reutilizable admin/student con slots |

### Páginas Admin

| Ruta | Descripción |
| ---- | ----------- |
| /admin/courses/[courseId]/activities | Lista con filtros estado/tipo, barra peso acumulado |
| /admin/courses/[courseId]/activities/new | Crear actividad con upload de archivos |
| /admin/courses/[courseId]/activities/[actId] | Detalle con publicar/cerrar/editar/entregas |

### Página Estudiante

| Ruta | Descripción |
| ---- | ----------- |
| /student/courses/[courseId]/activities/[actId] | Detalle con sección Mi Entrega (placeholder Fase 14) |

### Modificado

| Archivo | Cambio |
| ------- | ------ |
| app/admin/courses/[courseId]/page.tsx | Tab Actividades activo con navegación |

---

## Decisiones de Diseño

### Lista de Actividades

- Grid 2 columnas en desktop, 1 en mobile
- Filtros por estado (draft/published/closed) y tipo (7 opciones)
- Barra de peso acumulado con colores: cyan < 100%, verde = 100%, rojo > 100%
- Badges de tipo con colores diferenciados por categoría
- Badges de estado con dot indicator
- Ordenamiento por fecha límite ascendente

### Formulario de Actividad (5 secciones)

1. **Información Básica**: título, tipo (select), categoría (individual/grupo)
2. **Descripción**: textarea Markdown + toggle preview en vivo
3. **Configuración**: fechas (DatePicker), nota máxima, peso porcentual
4. **Opciones**: toggles switch (entrega tardía, penalización, archivo, enlace)
5. **Archivos Adjuntos**: FileUploadZone con lista de archivos subidos

### Markdown Renderer

- Renderizado ligero sin dependencias externas
- Soporta: headings, bold, italic, code blocks, inline code, links, listas, blockquotes, hr
- Sanitización XSS: escapa HTML antes de procesar
- Estilo prose-invert con colores del tema oscuro

### Countdown

- Actualización cada segundo via setInterval
- Colores de urgencia: rojo (< 6h), ámbar (< 1d), normal
- Modo compact (días+horas) y full (d/h/m/s con labels)
- Auto-cleanup del interval cuando expira

### Vista Estudiante (§13.4)

- Cabecera con badges tipo/estado/categoría
- Info row: publicación, fecha límite, nota máxima, peso
- Descripción en Markdown renderizado
- Archivos adjuntos con descarga
- Requisitos de entrega (archivo, enlace, tardía)
- Sección "Mi Entrega" como placeholder (se activará en Fase 14)

---

## Accesibilidad

| Criterio | Implementación |
| -------- | -------------- |
| Labels | htmlFor en todos los inputs del formulario |
| File input | aria-label en FileUploadZone |
| Selects | aria-label en filtros de estado y tipo |
| Switch | role="switch" + aria-checked en toggles |
| Focus | focus:border-cyan-500/50 + focus:ring en todos los inputs |
| Color scheme | [color-scheme:dark] en DatePicker para inputs nativos |

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npm run typecheck | 0 errores |
| npm run lint | 0 errores de Fase 12 (2 warnings pre-existentes) |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 11 |
| Archivos modificados | 1 |
| Componentes UI | 3 |
| Componentes activities | 4 |
| Páginas admin | 3 |
| Páginas student | 1 |
| Líneas de código nuevas | ~1200 |

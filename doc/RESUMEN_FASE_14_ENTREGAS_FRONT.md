# Resumen Fase 14 — Entregas de Estudiantes (Frontend)

> **Estado:** Completada
> **Rol asignado:** Diseñador Frontend Obsesivo
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §14

---

## Objetivo

Construir la interfaz completa para entregas de estudiantes: formulario de entrega con archivos y enlaces, lista de actividades con estado de entrega, y tabla administrativa de submissions con filtros y detalle modal.

---

## Archivos Creados (7) + Modificados (2)

### Componentes de Submissions

| Componente | Descripción |
| ---------- | ----------- |
| LinkInput.tsx | Input URL con validación regex por tipo (github/vercel/figma/otro) |
| SubmissionCard.tsx | Card compacta: status badge, versión, late indicator, conteos archivos/enlaces |
| SubmissionDetail.tsx | Vista detalle completa: archivos descargables, enlaces clickables, botón devolver (admin) |
| SubmitForm.tsx | Formulario multi-sección con drag&drop, enlaces condicionales, barra progreso, modal confirmación, pantalla éxito |

### Páginas Estudiante

| Ruta | Descripción |
| ---- | ----------- |
| /student/courses/[courseId]/activities | Lista actividades con badges estado entrega (🟢/🟡/🔴/✅) |
| /student/courses/[courseId]/activities/[actId]/submit | Formulario de entrega con validaciones |

### Página Admin

| Ruta | Descripción |
| ---- | ----------- |
| /admin/courses/[courseId]/activities/[actId]/submissions | Tabla de entregas con filtros status, modal detalle, devolver |

### Modificados

| Archivo | Cambio |
| ------- | ------ |
| app/admin/courses/[courseId]/activities/[actId]/page.tsx | Botón "Ver Entregas" conectado a navegación real (antes: toast placeholder) |
| app/student/courses/[courseId]/activities/[actId]/page.tsx | Sección "Mi Entrega" con fetch real + navegación a submit (antes: placeholder "Próximamente") |

---

## Decisiones de Diseño

### LinkInput — Validación por tipo

- **GitHub**: regex `github\.com/.+/.+` → valida usuario/repo
- **Vercel**: regex `\.vercel\.app` → cualquier subdominio
- **Figma**: regex `figma\.com/(file|proto|design)` → rutas válidas de Figma
- **Otro**: solo protocolo HTTP/HTTPS
- Iconos emoji por tipo: 🐙 GitHub, ▲ Vercel, 🎨 Figma, 🔗 Otro
- Validación en tiempo real después de primer blur (useMemo derivado)

### SubmitForm — Flujo de entrega

1. **Resumen de actividad**: título, tipo, fecha límite con countdown
2. **Archivos**: FileUploadZone con drag&drop, lista de archivos subidos con tamaño y eliminar
3. **Enlaces**: condicional según `requiresLink` de la actividad, campos dinámicos add/remove
4. **Comentarios**: textarea opcional
5. **Barra de progreso**: 4 secciones visuales (resumen/archivos/enlaces/comentarios)
6. **Modal de confirmación**: resumen final antes de enviar + checkbox aceptación
7. **Pantalla de éxito**: animación fade-in con enlace a ver entrega

### Lista de Actividades Estudiante

- Estado derivado por actividad:
  - 🟢 **Entregada**: tiene submission con status submitted/resubmitted
  - 🟡 **Pendiente**: sin entrega y antes de fecha límite
  - 🔴 **Vencida**: sin entrega y pasada fecha límite
  - ✅ **Calificada**: submission con status reviewed + nota
- Badges visuales con colores diferenciados
- Link directo a "Entregar" o "Ver entrega" según estado

### Tabla Admin de Submissions

- Tabla responsiva con columnas: estudiante, estado, versión, fecha, tarde, acciones
- Filtro por estado (todos/submitted/reviewed/returned/resubmitted)
- Modal de detalle con SubmissionDetail completo
- Botón "Devolver" en modal con confirmación
- EmptyState cuando no hay entregas

---

## Accesibilidad

| Criterio | Implementación |
| -------- | -------------- |
| Labels | htmlFor en todos los inputs del formulario de entrega |
| File input | aria-label en FileUploadZone integrado |
| Links | target=_blank con rel=noopener noreferrer en enlaces de submission |
| Focus | focus:border-cyan-500/50 + focus:ring en inputs de LinkInput |
| Modal | Overlay con click-to-close en modal de detalle y confirmación |
| States | aria-disabled en botón submit cuando formulario incompleto |

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npx tsc --noEmit | 0 errores |
| npx eslint . | 0 errores de Fase 14 (2 warnings pre-existentes) |

---

## Correcciones Realizadas

| Problema | Solución |
| -------- | -------- |
| ESLint: setState dentro de useEffect en LinkInput | Refactorizado a useMemo derivado (sin side effects) |
| Table import pattern | Default export Table + named exports Thead/Th/Tbody/Tr/Td |
| Admin detail placeholder toast | Reemplazado con router.push a /submissions |
| Student detail disabled button | Reemplazado con fetch de submission existente + navegación live |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 7 |
| Archivos modificados | 2 |
| Componentes submissions | 4 |
| Páginas student | 2 |
| Páginas admin | 1 |
| Líneas de código nuevas | ~1100 |

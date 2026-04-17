# Resumen Fase 16 — Calificaciones y Notas (Frontend)

> **Estado:** Completada
> **Rol asignado:** Diseñador Frontend Obsesivo
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §11, §13.5

---

## Objetivo

Construir la interfaz completa de calificaciones: calificación rápida estilo spreadsheet para 30+ entregas en minutos, tabla pivote con vista panorámica del curso, y vista de "Mis Notas" para estudiantes con escala colombiana 0.0–5.0.

---

## Archivos Creados (8)

### Componentes de Calificaciones (5)

| Componente | Descripción |
| ---------- | ----------- |
| ScoreInput.tsx | Input inline validado 0–maxScore, Tab/Enter flow, color coding por ratio (emerald/amber/red), patrón editing/draft sin useEffect |
| GradeStats.tsx | Panel 7 métricas: promedio, mediana, más alta/baja, aprobados %, reprobados %, sin nota. Helper `calculateStats` exportado |
| GradeTable.tsx | Tabla calificación rápida: score + feedback inline, Tab flow entre inputs, contador X/Y calificados, cambios sin guardar, batch save |
| GradeSummaryTable.tsx | Tabla pivote §13.5: filas=estudiantes, columnas=actividades(peso%) + definitiva. Sticky left col, promedios row, footnotes, color-coded cells |
| GradeCard.tsx | Card alumno con barra progreso animada (framer-motion), score grande, feedback expandible, estado aprobado/reprobado |

### Páginas (3)

| Ruta | Rol | Descripción |
| ---- | --- | ----------- |
| /admin/courses/[courseId]/activities/[actId]/grades | Admin | Calificación rápida: fetch entregas + notas existentes, batch save, modal publicar notas |
| /admin/courses/[courseId]/grades | Admin | Resumen del curso: tabla pivote, estadísticas, exportar CSV (BOM UTF-8 para Excel) |
| /student/courses/[courseId]/grades | Estudiante | Mis Notas: GradeCards por actividad, barra progreso calificación, definitiva grande animada |

---

## Decisiones de Diseño

### ScoreInput — Patrón Editing/Draft

- **Problema:** React 19 strict mode prohíbe `useEffect(setState)` y `ref.current` en render
- **Solución:** Estado `editing` + `draft` — al focus copia valor actual a draft, al blur commita draft a parent
- Input muestra `displayValue = editing ? draft : parentValue`
- Sin refs durante render, sin effects para sync

### GradeTable — UX Spreadsheet

- **Tab key** avanza al siguiente ScoreInput (`onTab` callback + focus programático)
- **Enter** también avanza (misma UX que spreadsheet)
- **Contador** visual: "12 / 30 calificados" con cambios sin guardar
- **Batch save:** solo envía filas modificadas (set tracking)
- **Feedback inline:** textarea resize-y con placeholder sutil

### GradeSummaryTable — Wireframe §13.5

- **Doble header:** fila nombres + fila pesos (%)
- **Sticky left column:** nombre estudiante siempre visible en scroll horizontal
- **Última columna:** Definitiva con fondo cyan/4%
- **Fila de promedios:** al final con borde superior doble
- **Indicadores:** ● = no publicada, * = nota parcial
- **Color cells:** emerald ≥ 4.0, amber ≥ 3.0, red < 3.0

### CSV Export

- BOM `\uFEFF` para compatibilidad Excel con acentos
- Nombre archivo: `notas_{curso}_{fecha}.csv`
- Columnas: Documento, Apellidos, Nombres, Correo, [Actividades], Definitiva, Estado
- Estado: "Aprobado" / "Reprobado" / "Pendiente"

### Student Grades — Experiencia

- **Barra de progreso:** X de Y actividades calificadas (animated)
- **GradeCards:** animación stagger con framer-motion (delay por index)
- **Definitiva:** texto 5xl con color dinámico + badge Aprobado/Reprobado
- Si nota parcial: asterisco y nota informativa
- Si sin notas: "Sin notas publicadas"

---

## Accesibilidad

| Criterio | Implementación |
| -------- | -------------- |
| Labels | aria-label en ScoreInput: "Nota (0-{maxScore})" |
| Keyboard | Tab/Enter navegan entre score inputs |
| Focus ring | focus:border-cyan-500/50 + ring en ScoreInput |
| Color | Nunca solo color — siempre texto acompañante (Aprobado/Reprobado) |
| Truncation | title tooltip en nombres de actividad truncados |
| Motion | Animaciones respetuosas (<300ms), sin autoplay loop |

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npx tsc --noEmit | 0 errores |
| npx eslint . | 0 errores de Fase 16 (3 warnings pre-existentes) |

---

## Correcciones Realizadas

| Problema | Solución |
| -------- | -------- |
| ESLint: setState en useEffect (ScoreInput) | Patrón editing/draft con focus/blur (sin useEffect) |
| ESLint: ref.current en render (ScoreInput) | Eliminado — derivado display value sin refs |
| ESLint: prefer-const + unused vars (admin grades) | const + eliminación de params no usados |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 8 |
| Componentes de calificación | 5 |
| Páginas admin | 2 |
| Páginas student | 1 |
| Líneas de código nuevas | ~850 |

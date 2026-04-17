# Resumen Fase 15 — Calificaciones y Notas (Backend)

> **Estado:** Completada
> **Rol asignado:** Ingeniero Backend Senior + Experto Educación
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §4.2, §5.7 (RN-CAL), §6.7 (RF-CAL), §8 (CU-05, CU-06, CU-07)

---

## Objetivo

Implementar el backend completo de calificaciones académicas: calificar entregas con penalización por tardanza, publicar notas de forma explícita, calcular nota definitiva ponderada en escala colombiana (0.0–5.0), y proveer endpoints diferenciados por rol (admin: tabla completa, estudiante: solo notas publicadas).

---

## Archivos Creados (5) + Modificados (3)

### Datos

| Archivo | Descripción |
| ------- | ----------- |
| data/grades.json | Array vacío — almacén de calificaciones |

### Servicio de Calificaciones

| Archivo | Descripción |
| ------- | ----------- |
| lib/gradeService.ts | Lógica de negocio: calificar, editar, publicar, calcular definitiva, resúmenes |

### API Route Handlers

| Ruta | Método | Descripción |
| ---- | ------ | ----------- |
| /api/grades | POST | Calificar una entrega (admin) |
| /api/grades/[id] | PUT | Editar calificación existente (admin) |
| /api/activities/[id]/grades/publish | POST | Publicar notas de una actividad (admin) |
| /api/courses/[id]/grades | GET | Resumen de notas — admin: CourseGradeSummary, student: StudentGradeSummary |

### Modificados

| Archivo | Cambio |
| ------- | ------ |
| lib/types.ts | +7 interfaces: Grade, CreateGradeRequest, UpdateGradeRequest, CourseGradeSummary, StudentGradeSummary, GradeExportRow, FinalGradeResult |
| lib/schemas.ts | +3 schemas Zod: gradeSchema (con refine), createGradeSchema, updateGradeSchema |
| lib/dataService.ts | +6 funciones CRUD: readGrades, writeGrades, getGradesByActivity, getGradesByStudent, getGradeForSubmission, getGradeById |

---

## Reglas de Negocio Implementadas

| ID | Regla | Implementación |
| -- | ----- | -------------- |
| RN-CAL-01 | Nota dentro del rango | Zod refine(score ≤ maxScore) + validación en gradeSubmission contra actividad |
| RN-CAL-02 | Publicación explícita | `isPublished: false` por defecto; estudiante no ve hasta publicación |
| RN-CAL-03 | Publicación masiva | `publishGrades(activityId)` actualiza todas las notas de golpe |
| RN-CAL-04 | Retroalimentación | Campo `feedback` opcional en Grade y endpoints |
| RN-CAL-05 | Nota definitiva | Promedio ponderado: Σ(score/maxScore × weight) / Σ(weights) × 5.0 |
| RN-CAL-06 | Exportación CSV | GradeExportRow tipado (frontend implementará descarga) |
| RN-CAL-07 | Escala colombiana | 0.0–5.0, aprobación ≥ 3.0, redondeo a 1 decimal |

---

## Funciones del Servicio (gradeService.ts)

### gradeSubmission(data, adminId)

1. Verifica existencia de submission y actividad
2. Valida coherencia: submission pertenece a actividad, estudiante y curso coinciden
3. Valida score ∈ [0, maxScore] (RN-CAL-01)
4. Si entrega tardía + latePenaltyPercent > 0: `finalScore = score × (1 - penalty/100)`, mínimo 0
5. Si ya existe nota: actualiza (upsert) en vez de duplicar
6. Si no existe: crea con `isPublished: false` (RN-CAL-02)
7. Marca submission como `status: 'reviewed'`

### updateGrade(gradeId, data, adminId)

- Valida score contra maxScore de la actividad
- Actualiza solo los campos proporcionados (score y/o feedback)

### publishGrades(activityId)

- Actualiza todas las notas no publicadas: `isPublished: true`, `publishedAt: now`
- Lanza error si no hay notas pendientes

### calculateFinalGrade(studentId, courseId)

- **Fórmula:** Σ(score/maxScore × weight) / Σ(weights de actividades calificadas) × 5.0
- **Ejemplo:** Act1(20%, 4.0/5.0) + Act2(30%, 3.5/5.0) → (16+21)/50 × 5.0 = **3.7**
- Retorna `isPartial: true` si faltan actividades por calificar
- Retorna `isApproved: finalScore ≥ 3.0`

### getCourseGradeSummary(courseId)

- Tabla pivote: filas=estudiantes inscritos, columnas=actividades, última=definitiva
- Incluye todas las notas (publicadas y no publicadas) para admin

### getStudentGradeSummary(studentId, courseId)

- Solo notas **publicadas** (RN-CAL-02)
- Calcula definitiva solo con notas visibles al estudiante

---

## Casos de Uso Cubiertos

| CU | Descripción | Endpoint |
| -- | ----------- | -------- |
| CU-05 | Calificar Entrega | POST /api/grades |
| CU-06 | Publicar Notas | POST /api/activities/[id]/grades/publish |
| CU-07 | Exportar Notas (datos) | GET /api/courses/[id]/grades (admin) |

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npx tsc --noEmit | 0 errores |
| npx eslint . | 0 errores de Fase 15 (1 warning funcional: _user en publish route — misma categoría que warnings pre-existentes) |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 5 |
| Archivos modificados | 3 |
| Interfaces TypeScript | 7 |
| Schemas Zod | 3 |
| Funciones dataService | 6 |
| Funciones gradeService | 6 |
| Endpoints API | 4 |
| Líneas de código nuevas | ~700 |

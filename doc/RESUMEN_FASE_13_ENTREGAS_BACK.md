# Resumen Fase 13 — Entregas de Estudiantes (Backend)

> **Estado:** Completada
> **Rol asignado:** Ingeniero Backend Senior
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §4.2, §5.6, §6.6, §8 CU-04, §15.3

---

## Objetivo

Implementar el backend completo para el flujo de entregas de estudiantes: modelo de datos con versionamiento, máquina de estado de entregas, validación de plazos/requisitos, upload de archivos asociados, y API para envío, listado y devolución.

---

## Archivos Creados (3) + Modificados (3)

### Datos

| Archivo | Descripción |
| ------- | ----------- |
| data/submissions.json | Array vacío inicial |

### Servicios

| Archivo | Descripción |
| ------- | ----------- |
| lib/submissionService.ts | submitWork, returnSubmission con máquina de estado |

### API Routes

| Ruta | Métodos | Descripción |
| ---- | ------- | ----------- |
| /api/activities/[id]/submissions | GET, POST | Listar entregas / Enviar entrega |
| /api/submissions/[id] | GET, PUT | Detalle entrega / Devolver entrega |

### Modificados

| Archivo | Cambio |
| ------- | ------ |
| lib/types.ts | +5 interfaces: Submission, SubmissionAttachment, SubmissionLink, CreateSubmissionRequest, SubmissionWithDetails |
| lib/schemas.ts | +4 schemas: submissionSchema, submissionAttachmentSchema, submissionLinkSchema, createSubmissionSchema |
| lib/dataService.ts | +6 funciones: readSubmissions, writeSubmissions, getSubmissionsByActivity, getSubmissionsByStudent, getSubmission, getSubmissionById |

---

## Máquina de Estado

```text
  [Estudiante entrega]          [Admin califica]         [Admin devuelve]
        |                            |                        |
        v                            v                        v
   submitted ───────────────> reviewed ──────────────> returned
        ^                                                     |
        |                                                     |
        └──────────────── resubmitted <───────────────────────┘
                         [Estudiante re-envía]
```

### Transiciones válidas

| Desde | Hacia | Acción | Actor |
| ----- | ----- | ------ | ----- |
| (nuevo) | submitted | Enviar entrega (v1) | Estudiante |
| submitted | submitted | Re-enviar (v+1) | Estudiante |
| submitted | reviewed | Calificar (Fase 15) | Admin |
| reviewed | returned | Devolver | Admin |
| returned | resubmitted | Re-enviar (v+1) | Estudiante |
| resubmitted | reviewed | Re-calificar (Fase 15) | Admin |

### Bloqueos

| Estado | Puede re-enviar | Razón |
| ------ | --------------- | ----- |
| submitted | Sí (v+1) | Aún no calificada |
| reviewed | No | Debe ser devuelta primero |
| returned | Sí (v+1) | Devuelta por admin |
| resubmitted | Sí (v+1) | Aún no re-calificada |

---

## Reglas de Negocio Implementadas

| Regla | Implementación |
| ----- | -------------- |
| RN-ENT-01 | Una entrega por actividad por estudiante (getSubmission) |
| RN-ENT-02 | Versionamiento: re-entrega incrementa version, preserva id |
| RN-ENT-03 | Validación de requiresFileUpload y requiresLinkSubmission |
| RN-ENT-04 | Verificación de inscripción activa via isStudentEnrolled |
| RN-ENT-05 | Bloqueo post-calificación: status "reviewed" impide re-envío |
| RN-ENT-06 | Links con schema URL validado (HTTP/HTTPS, max 10 enlaces) |

---

## Flujo de Entrega (submitWork)

1. Verificar que la actividad existe y está `published`
2. Verificar que `activity.courseId` coincide con el curso
3. Verificar inscripción activa del estudiante
4. Verificar plazo: `now > dueDate && !allowLateSubmission` → error
5. Calcular `isLate`: `now > dueDate && allowLateSubmission`
6. Buscar entrega previa:
   - No existe → crear con `version: 1`, `status: submitted`
   - Existe con status `returned` → `version+1`, `status: resubmitted`
   - Existe con status `submitted`/`resubmitted` → `version+1`, actualizar
   - Existe con status `reviewed` → error (bloqueada)
7. Validar requisitos de la actividad (archivos/enlaces)
8. Guardar en submissions.json

---

## Visibilidad por Rol

| Endpoint | Admin | Estudiante |
| -------- | ----- | ---------- |
| GET /activities/[id]/submissions | Todas con datos del estudiante + filtro status | Solo su propia entrega |
| POST /activities/[id]/submissions | No (403) | Enviar entrega (FormData + JSON) |
| GET /submissions/[id] | Cualquier entrega | Solo la propia |
| PUT /submissions/[id] | Devolver entrega | No (403) |

---

## Schemas Zod

### submissionLinkSchema

- type: enum github/vercel/figma/other
- url: URL válida, solo HTTP/HTTPS
- label: max 100 chars, opcional

### createSubmissionSchema

- content: max 5000 chars, opcional
- links: array de submissionLinkSchema, max 10

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npm run typecheck | 0 errores |
| npm run lint | 0 errores de Fase 13 (2 warnings pre-existentes) |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 3 |
| Archivos modificados | 3 |
| Tipos nuevos | 5 |
| Schemas nuevos | 4 |
| Funciones dataService | 6 |
| Funciones submissionService | 2 |
| API endpoints | 4 (2 rutas, 4 handlers) |
| Líneas de código nuevas | ~500 |

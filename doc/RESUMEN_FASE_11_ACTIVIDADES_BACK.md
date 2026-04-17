# Resumen Fase 11 — Actividades y Material (Backend)

> **Estado:** Completada
> **Rol asignado:** Ingeniero Backend Senior
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §4.2, §5.5, §6.5, §8 CU-03, §15.3

---

## Objetivo

Implementar el backend completo para gestión de actividades académicas: modelo de datos, sistema de upload de archivos con validación MIME, API de CRUD de actividades con lógica de estados (draft/published/closed), y control de visibilidad temporal para estudiantes.

---

## Archivos Creados (8) + Modificados (3)

### Datos

| Archivo | Descripción |
| ------- | ----------- |
| data/activities.json | Array vacío inicial |
| data/uploads/activities/.gitkeep | Carpeta para archivos de actividades |
| data/uploads/submissions/.gitkeep | Carpeta para archivos de entregas (prep Fase 13) |

### Servicios

| Archivo | Descripción |
| ------- | ----------- |
| lib/uploadService.ts | uploadFile, deleteFile, readUploadedFile con validación completa |

### API Routes

| Ruta | Métodos | Descripción |
| ---- | ------- | ----------- |
| /api/upload | POST | Subir archivo via FormData con validación MIME y tamaño |
| /api/upload/[...path] | GET | Servir archivos con auth y prevención path traversal |
| /api/courses/[id]/activities | GET, POST | Listar actividades del curso / Crear actividad |
| /api/activities/[id] | GET, PUT | Detalle / Editar actividad |
| /api/activities/[id]/publish | POST | Publicar actividad (draft a published) |

### Modificados

| Archivo | Cambio |
| ------- | ------ |
| lib/types.ts | +4 interfaces: Activity, ActivityAttachment, CreateActivityRequest, UpdateActivityRequest |
| lib/schemas.ts | +4 schemas: activitySchema, activityAttachmentSchema, createActivitySchema (con refine), updateActivitySchema |
| lib/dataService.ts | +4 funciones: readActivities, writeActivities, getActivitiesByCourse, getActivityById |

---

## Reglas de Negocio Implementadas

| Regla | Implementación |
| ----- | -------------- |
| RN-ACT-01 | Toda actividad vinculada a un courseId validado |
| RN-ACT-02 | Estados: draft -> published -> closed. Transiciones validadas en PUT |
| RN-ACT-03 | Estudiantes no ven actividades con publishDate futuro |
| RN-ACT-04 | dueDate almacenado para control de entregas tardías |
| RN-ACT-05 | allowLateSubmission configurable por actividad |
| RN-ACT-06 | latePenaltyPercent almacenado para cálculo en Fase 15 |
| RN-ACT-07 | Peso porcentual (weight 0-100) validado por Zod |
| RN-ACT-08 | Adjuntos via uploadService con validación MIME |

---

## Sistema de Upload

### Validaciones (Plan §15.3)

| Validación | Implementación |
| ---------- | -------------- |
| Tamaño máximo | 10 MB por archivo |
| MIME actividades | PDF, DOCX, PPTX, XLSX, PNG, JPG, GIF, MD, TXT |
| MIME entregas | Todo lo anterior + ZIP |
| Extensión vs MIME | Verifica que extensión coincida con MIME declarado |
| Renombrado | {timestamp}-{uuid8}-{sanitized-name}.{ext} |
| Path traversal | Elimina .., /, \, caracteres especiales |
| Archivos vacíos | Rechazados |
| Archivos ocultos | Puntos iniciales eliminados del nombre |

### Endpoints de Archivo

| Endpoint | Auth | Descripción |
| -------- | ---- | ----------- |
| POST /api/upload | Cualquier usuario autenticado | FormData con file + destination |
| GET /api/upload/[...path] | Cualquier usuario autenticado | Sirve archivo con Content-Type correcto |

---

## Visibilidad por Rol

| Endpoint | Admin | Estudiante |
| -------- | ----- | ---------- |
| GET /courses/[id]/activities | Todas (draft+published+closed) | Solo published con publishDate pasada |
| GET /activities/[id] | Cualquier actividad | Solo published+visible en su curso |
| POST /courses/[id]/activities | Crear actividad | No permitido (403) |
| PUT /activities/[id] | Editar cualquier campo | No permitido (403) |
| POST /activities/[id]/publish | Publicar draft | No permitido (403) |

---

## Validación Zod

### createActivitySchema

- title: min 1 char, trim
- description: min 1 char
- type: enum 7 valores
- category: individual o group
- dueDate: formato fecha ISO
- publishDate: formato fecha ISO
- maxScore: positivo
- weight: 0-100
- refine: dueDate > publishDate

### updateActivitySchema

- Todos los campos opcionales
- status: enum draft/published/closed (transiciones validadas en handler)

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npm run typecheck | 0 errores |
| npm run lint | 0 errores de Fase 11 (2 warnings pre-existentes) |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 8 |
| Archivos modificados | 3 |
| Tipos nuevos | 4 |
| Schemas nuevos | 4 |
| Funciones dataService | 4 |
| API endpoints | 7 (3 rutas, 7 handlers) |
| Líneas de código nuevas | ~600 |

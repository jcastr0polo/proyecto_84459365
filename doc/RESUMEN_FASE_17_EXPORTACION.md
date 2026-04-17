# Resumen Fase 17 — Exportación de Notas

> **Estado:** Completada
> **Rol asignado:** Ingeniero Backend Senior + Experto Educación
> **Referencia:** PLAN_PLATAFORMA_DOCENTE.md §5.7 (RN-CAL-06, RN-CAL-07), §6.7 (RF-CAL-06), §8 (CU-07)

---

## Objetivo

Implementar el endpoint de exportación de notas en formato CSV listo para cargar directamente al sistema institucional colombiano sin editar una sola celda. UTF-8 con BOM para Excel, RFC 4180, ordenado alfabéticamente, escala 0.0–5.0.

---

## Archivos Creados (2) + Modificados (1)

### Servicio de Exportación

| Archivo | Descripción |
| ------- | ----------- |
| lib/exportService.ts | `generateGradesCSV()` + `generateGradesJSON()` — lógica de exportación con formato institucional |

### API Route Handler

| Ruta | Método | Descripción |
| ---- | ------ | ----------- |
| /api/courses/[id]/grades/export | GET | Genera y descarga CSV (por defecto) o JSON (?format=json) |

### Modificado

| Archivo | Cambio |
| ------- | ------ |
| app/admin/courses/[courseId]/grades/page.tsx | Botón "Exportar CSV" usa endpoint server-side con loading state (antes: generación client-side) |

---

## Formato CSV Generado

### Especificación

| Atributo | Valor |
| -------- | ----- |
| Encoding | UTF-8 con BOM (`\uFEFF`) |
| Separador | Coma (`,`) |
| Line ending | CRLF (`\r\n`) |
| Escapado | RFC 4180 — comillas dobles para valores con coma/comillas/saltos |
| Orden filas | Alphabético por apellido (`localeCompare('es-CO')`) |
| Nombre archivo | `notas-{courseCode}-{YYYY-MM-DD}.csv` |

### Columnas

```text
Documento | Apellidos | Nombres | Email | [Actividad1 (Peso%)] | ... | Definitiva | Estado
```

### Ejemplo

```csv
Documento,Apellidos,Nombres,Email,"Proyecto Fase 1 (20%)","Proyecto Fase 2 (30%)",Definitiva,Estado
84459365,López,María,maria@email.com,4.5,4.2,4.3,Aprobado
12345678,Ruiz,Carlos,carlos@email.com,3.8,4.0,3.9,Aprobado
98765432,Torres,Pedro,pedro@email.com,2.5,3.5,3.1,Aprobado
```

### Estado

- `Aprobado` — definitiva ≥ 3.0
- `Reprobado` — definitiva < 3.0
- `Pendiente` — sin notas calculadas

---

## Funciones del Servicio

### generateGradesCSV(courseId)

1. Obtiene curso (para código en filename)
2. Llama a `getCourseGradeSummary()` (reutiliza Fase 15)
3. Ordena estudiantes por apellido (locale colombiana)
4. Genera headers: Documento, Apellidos, Nombres, Email, [Actividades con peso%], Definitiva, Estado
5. Genera filas con `escapeCSV()` (RFC 4180)
6. Prepone BOM UTF-8
7. Retorna `{ csv: string, filename: string }`

### generateGradesJSON(courseId)

- Misma lógica pero retorna array tipado `GradeExportRow[]`
- Incluye resumen: totalStudents, approved, failed, pending, average
- Para consumo programático o integraciones futuras

---

## Endpoint API

### GET /api/courses/[id]/grades/export

| Parámetro | Tipo | Por defecto | Descripción |
| --------- | ---- | ----------- | ----------- |
| format | query | csv | `csv` o `json` |

**Response CSV:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="notas-LOG-202601-2026-04-17.csv"
Cache-Control: no-cache, no-store, must-revalidate
```

**Response JSON (format=json):**
```json
{
  "course": { "id": "...", "code": "LOG-202601", "name": "..." },
  "exportDate": "2026-04-17T...",
  "rows": [...],
  "summary": { "totalStudents": 15, "approved": 12, "failed": 2, "pending": 1, "average": 3.8 }
}
```

---

## Cambio en Frontend

El botón "Exportar CSV" en la página de resumen de notas del curso ahora:
1. Hace `fetch` al endpoint `/api/courses/{id}/grades/export`
2. Muestra spinner "Exportando..." durante la generación
3. Extrae `filename` del header `Content-Disposition`
4. Crea `Blob` → `URL.createObjectURL` → trigger download
5. Muestra toast de confirmación

---

## Validación

| Check | Resultado |
| ----- | --------- |
| npx tsc --noEmit | 0 errores |
| npx eslint . | 0 errores de Fase 17 (3 warnings pre-existentes) |

---

## Métricas

| Métrica | Valor |
| ------- | ----- |
| Archivos creados | 2 |
| Archivos modificados | 1 |
| Funciones exportService | 2 (generateGradesCSV, generateGradesJSON) |
| Endpoints API | 1 (GET con dual format) |
| Líneas de código nuevas | ~200 |

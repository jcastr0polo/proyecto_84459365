/**
 * lib/exportService.ts
 * Servicio de exportación de notas — Fase 17
 *
 * RF-CAL-06: Exportar tabla de notas definitivas en CSV
 * RN-CAL-06: Formato compatible con sistema institucional colombiano
 * RN-CAL-07: Escala 0.0–5.0, aprobación ≥ 3.0
 * CU-07: Exportar Notas del Curso
 *
 * Formato CSV:
 * - Separador: coma (,)
 * - Encoding: UTF-8 con BOM (\uFEFF) para Excel
 * - Columnas: Documento, Apellidos, Nombres, Email, [Actividades], Definitiva, Estado
 */

import { getCourseById } from '@/lib/dataService';
import { getCourseGradeSummary, GradeError } from '@/lib/gradeService';
import type { CourseGradeSummary, GradeExportRow } from '@/lib/types';

// BOM UTF-8 para compatibilidad Excel con acentos
const UTF8_BOM = '\uFEFF';

// Escala colombiana
const APPROVAL_THRESHOLD = 3.0;

/**
 * Escapar valor para CSV (RFC 4180)
 * - Si contiene coma, comillas dobles o salto de línea → envolver en comillas
 * - Las comillas internas se duplican
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Determinar estado del estudiante según nota definitiva
 * RN-CAL-07: ≥ 3.0 = Aprobado, < 3.0 = Reprobado, null = Pendiente
 */
function getStatus(finalScore: number | null): string {
  if (finalScore === null) return 'Pendiente';
  return finalScore >= APPROVAL_THRESHOLD ? 'Aprobado' : 'Reprobado';
}

/**
 * generateGradesCSV — Genera archivo CSV de notas del curso
 *
 * CU-07: Formato listo para cargar al sistema institucional
 * Columnas: Documento | Apellidos | Nombres | Email | Act1(Peso%) | ... | Definitiva | Estado
 *
 * @returns { csv: string, filename: string }
 */
export async function generateGradesCSV(courseId: string): Promise<{ csv: string; filename: string }> {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  const summary = await getCourseGradeSummary(courseId);

  // Build header row
  const headers = [
    'Documento',
    'Apellidos',
    'Nombres',
    'Email',
    ...summary.activities.map((a) => `${a.title} (${a.weight}%)`),
    'Definitiva',
    'Estado',
  ];

  // Build data rows (sorted by lastName, firstName for institutional format)
  const sortedStudents = [...summary.students].sort((a, b) => {
    const lastCmp = a.lastName.localeCompare(b.lastName, 'es-CO');
    return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName, 'es-CO');
  });

  const dataRows = sortedStudents.map((student) => {
    const activityScores = summary.activities.map((act) => {
      const grade = student.grades[act.id];
      return grade ? grade.score.toFixed(1) : '';
    });

    return [
      student.documentNumber,
      student.lastName,
      student.firstName,
      student.email,
      ...activityScores,
      student.finalScore !== null ? student.finalScore.toFixed(1) : '',
      getStatus(student.finalScore),
    ];
  });

  // Assemble CSV
  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...dataRows.map((row) => row.map(escapeCSV).join(',')),
  ];

  const csv = UTF8_BOM + csvLines.join('\r\n') + '\r\n';

  // Filename: notas-{courseCode}-{YYYY-MM-DD}.csv
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeCode = course.code.replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `notas-${safeCode}-${dateStr}.csv`;

  return { csv, filename };
}

/**
 * generateGradesJSON — Mismo cálculo pero retorna array de objetos
 *
 * Para consumo programático (API responses, integrations)
 */
export async function generateGradesJSON(courseId: string): Promise<{
  course: { id: string; code: string; name: string };
  exportDate: string;
  rows: GradeExportRow[];
  summary: {
    totalStudents: number;
    approved: number;
    failed: number;
    pending: number;
    average: number | null;
  };
}> {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  const data: CourseGradeSummary = await getCourseGradeSummary(courseId);

  const sortedStudents = [...data.students].sort((a, b) => {
    const lastCmp = a.lastName.localeCompare(b.lastName, 'es-CO');
    return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName, 'es-CO');
  });

  const rows: GradeExportRow[] = sortedStudents.map((student) => {
    const row: GradeExportRow = {
      documentNumber: student.documentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      finalScore: student.finalScore !== null ? student.finalScore : '',
      status: getStatus(student.finalScore),
    };

    // Add activity scores as dynamic keys
    for (const act of data.activities) {
      const grade = student.grades[act.id];
      row[`${act.title} (${act.weight}%)`] = grade ? grade.score : '';
    }

    return row;
  });

  // Summary statistics
  const scored = sortedStudents.filter((s) => s.finalScore !== null);
  const average = scored.length > 0
    ? scored.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) / scored.length
    : null;

  return {
    course: { id: course.id, code: course.code, name: course.name },
    exportDate: new Date().toISOString(),
    rows,
    summary: {
      totalStudents: sortedStudents.length,
      approved: sortedStudents.filter((s) => s.isApproved === true).length,
      failed: sortedStudents.filter((s) => s.isApproved === false).length,
      pending: sortedStudents.filter((s) => s.finalScore === null).length,
      average: average !== null ? Math.round(average * 10) / 10 : null,
    },
  };
}

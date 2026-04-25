/**
 * lib/gradeService.ts
 * Servicio de calificaciones — Fase 15
 *
 * Lógica de negocio:
 * - Calificar entregas (RN-CAL-01)
 * - Publicar notas (RN-CAL-02, RN-CAL-03)
 * - Calcular nota definitiva ponderada (RN-CAL-05)
 * - Penalización por entrega tardía
 * - Escala colombiana 0.0–5.0, aprobación ≥ 3.0 (RN-CAL-07)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getSubmissionById,
  getActivityById,
  getGradeForSubmission,
  getGradesByStudent,
  getGradeById,
  readGrades,
  readGradesFresh,
  writeGrades,
  getActivitiesByCourse,
  getEnrollmentsByCourse,
  getCourseById,
  getUserById,
} from '@/lib/dataService';
import { readSubmissions, readSubmissionsFresh, writeSubmissions } from '@/lib/dataService';
import { withFileLock } from '@/lib/blobSync';
import type {
  Grade,
  Submission,
  Activity,
  CreateGradeRequest,
  UpdateGradeRequest,
  FinalGradeResult,
  CourseGradeSummary,
  StudentGradeSummary,
} from '@/lib/types';

// ────────────────────────────────────────────────────────────
// ERRORES
// ────────────────────────────────────────────────────────────

export class GradeError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'GradeError';
    this.statusCode = statusCode;
  }
}

// ────────────────────────────────────────────────────────────
// ESCALA COLOMBIANA
// ────────────────────────────────────────────────────────────

const SCALE_MAX = 5.0;
const APPROVAL_THRESHOLD = 3.0;

/**
 * Redondear a 1 decimal (estándar colombiano)
 */
function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

// ────────────────────────────────────────────────────────────
// CALIFICAR ENTREGA
// ────────────────────────────────────────────────────────────

/**
 * gradeSubmission — Calificar una entrega
 *
 * 1. Verificar que la submission existe
 * 2. Verificar que la actividad existe y obtener maxScore
 * 3. Verificar score dentro del rango (RN-CAL-01)
 * 4. Si entrega tardía + penalización: aplicar descuento
 * 5. Si ya tiene nota: actualizar en lugar de duplicar
 * 6. Guardar con isPublished: false (RN-CAL-02)
 * 7. Marcar submission como 'reviewed'
 */
export async function gradeSubmission(data: CreateGradeRequest, adminId: string): Promise<Grade> {
  // 1. Verificar submission
  const submission = getSubmissionById(data.submissionId);
  if (!submission) {
    throw new GradeError('Entrega no encontrada', 404);
  }

  // 2. Verificar actividad
  const activity = getActivityById(data.activityId);
  if (!activity) {
    throw new GradeError('Actividad no encontrada', 404);
  }

  // Verificar coherencia: la submission pertenece a la actividad
  if (submission.activityId !== activity.id) {
    throw new GradeError('La entrega no corresponde a esta actividad', 400);
  }

  // Verificar coherencia: studentId y courseId coinciden
  if (submission.studentId !== data.studentId) {
    throw new GradeError('El estudiante no coincide con la entrega', 400);
  }
  if (submission.courseId !== data.courseId) {
    throw new GradeError('El curso no coincide con la entrega', 400);
  }

  // 3. Validar score dentro del rango (RN-CAL-01)
  if (data.score < 0 || data.score > activity.maxScore) {
    throw new GradeError(
      `La nota debe estar entre 0 y ${activity.maxScore}`,
      400
    );
  }

  // 4. Penalización por entrega tardía
  let finalScore = data.score;
  if (submission.isLate && activity.latePenaltyPercent && activity.latePenaltyPercent > 0) {
    const penalty = finalScore * (activity.latePenaltyPercent / 100);
    finalScore = roundTo1Decimal(finalScore - penalty);
    // No permitir nota negativa por penalización
    if (finalScore < 0) finalScore = 0;
  }

  const now = new Date().toISOString();

  // 5. Verificar si ya existe calificación para esta entrega
  const existingGrade = getGradeForSubmission(data.submissionId);

  let grade: Grade;

  if (existingGrade) {
    // Actualizar la nota existente
    grade = await withFileLock('grades.json', async () => {
      const grades = await readGradesFresh();
      const idx = grades.findIndex((g) => g.id === existingGrade.id);
      grades[idx] = {
        ...existingGrade,
        score: finalScore,
        maxScore: activity.maxScore,
        feedback: data.feedback,
        gradedBy: adminId,
        gradedAt: now,
        updatedAt: now,
      };
      await writeGrades(grades);
      return grades[idx];
    });
  } else {
    // 6. Crear nueva calificación con isPublished: false (RN-CAL-02)
    grade = {
      id: uuidv4(),
      submissionId: data.submissionId,
      activityId: data.activityId,
      studentId: data.studentId,
      courseId: data.courseId,
      score: finalScore,
      maxScore: activity.maxScore,
      feedback: data.feedback,
      isPublished: false,
      gradedBy: adminId,
      gradedAt: now,
      updatedAt: now,
    };
    await withFileLock('grades.json', async () => {
      const grades = await readGradesFresh();
      grades.push(grade);
      await writeGrades(grades);
    });
  }

  // 7. Marcar submission como 'reviewed'
  await withFileLock('submissions.json', async () => {
    const submissions = await readSubmissionsFresh();
    const subIdx = submissions.findIndex((s) => s.id === submission.id);
    if (subIdx !== -1) {
      submissions[subIdx] = {
        ...submissions[subIdx],
        status: 'reviewed',
        updatedAt: now,
      };
      await writeSubmissions(submissions);
    }
  });

  return grade;
}

// ────────────────────────────────────────────────────────────
// EDITAR CALIFICACIÓN
// ────────────────────────────────────────────────────────────

/**
 * updateGrade — Editar una calificación existente
 */
export async function updateGrade(gradeId: string, data: UpdateGradeRequest, adminId: string): Promise<Grade> {
  const existing = getGradeById(gradeId);
  if (!existing) {
    throw new GradeError('Calificación no encontrada', 404);
  }

  const activity = getActivityById(existing.activityId);

  // Validar score si se proporciona
  if (data.score !== undefined) {
    const maxScore = activity?.maxScore ?? existing.maxScore;
    if (data.score < 0 || data.score > maxScore) {
      throw new GradeError(
        `La nota debe estar entre 0 y ${maxScore}`,
        400
      );
    }
  }

  const now = new Date().toISOString();

  return withFileLock('grades.json', async () => {
    const grades = await readGradesFresh();
    const idx = grades.findIndex((g) => g.id === gradeId);

    grades[idx] = {
      ...existing,
      score: data.score !== undefined ? data.score : existing.score,
      feedback: data.feedback !== undefined ? data.feedback : existing.feedback,
      gradedBy: adminId,
      gradedAt: now,
      updatedAt: now,
    };

    await writeGrades(grades);
    return grades[idx];
  });
}

// ────────────────────────────────────────────────────────────
// CALIFICAR EN LOTE (batch)
// ────────────────────────────────────────────────────────────

export interface BatchGradeItem {
  submissionId: string;
  activityId: string;
  studentId: string;
  courseId: string;
  score: number;
  feedback?: string;
  existingGradeId?: string;
}

export interface BatchGradeResult {
  saved: number;
  errors: { submissionId: string; error: string }[];
}

/**
 * gradeSubmissionBatch — Calificar múltiples entregas en un solo ciclo de escritura.
 *
 * Evita el problema de "last write wins" al escribir grades.json y
 * submissions.json una sola vez con todas las notas.
 */
export async function gradeSubmissionBatch(
  items: BatchGradeItem[],
  adminId: string
): Promise<BatchGradeResult> {
  if (items.length === 0) return { saved: 0, errors: [] };

  const now = new Date().toISOString();
  const errors: { submissionId: string; error: string }[] = [];

  // Pre-validate all items before writing anything
  const validated: {
    item: BatchGradeItem;
    submission: Submission;
    activity: Activity;
    finalScore: number;
    existingGradeId?: string;
  }[] = [];

  for (const item of items) {
    const submission = getSubmissionById(item.submissionId);
    if (!submission) {
      errors.push({ submissionId: item.submissionId, error: 'Entrega no encontrada' });
      continue;
    }

    const activity = getActivityById(item.activityId);
    if (!activity) {
      errors.push({ submissionId: item.submissionId, error: 'Actividad no encontrada' });
      continue;
    }

    if (submission.activityId !== activity.id) {
      errors.push({ submissionId: item.submissionId, error: 'La entrega no corresponde a esta actividad' });
      continue;
    }

    if (item.score < 0 || item.score > activity.maxScore) {
      errors.push({ submissionId: item.submissionId, error: `Nota fuera de rango (0–${activity.maxScore})` });
      continue;
    }

    // Late penalty
    let finalScore = item.score;
    if (submission.isLate && activity.latePenaltyPercent && activity.latePenaltyPercent > 0) {
      const penalty = finalScore * (activity.latePenaltyPercent / 100);
      finalScore = roundTo1Decimal(finalScore - penalty);
      if (finalScore < 0) finalScore = 0;
    }

    validated.push({
      item,
      submission,
      activity,
      finalScore,
      existingGradeId: item.existingGradeId,
    });
  }

  if (validated.length === 0) return { saved: 0, errors };

  // Single write to grades.json
  await withFileLock('grades.json', async () => {
    const grades = await readGradesFresh();

    for (const v of validated) {
      // Check if grade already exists (by existingGradeId or by submissionId)
      const existIdx = v.existingGradeId
        ? grades.findIndex((g) => g.id === v.existingGradeId)
        : grades.findIndex((g) => g.submissionId === v.item.submissionId);

      if (existIdx !== -1) {
        // Update existing grade
        grades[existIdx] = {
          ...grades[existIdx],
          score: v.finalScore,
          maxScore: v.activity.maxScore,
          feedback: v.item.feedback,
          gradedBy: adminId,
          gradedAt: now,
          updatedAt: now,
        };
      } else {
        // Create new grade
        grades.push({
          id: uuidv4(),
          submissionId: v.item.submissionId,
          activityId: v.item.activityId,
          studentId: v.item.studentId,
          courseId: v.item.courseId,
          score: v.finalScore,
          maxScore: v.activity.maxScore,
          feedback: v.item.feedback,
          isPublished: false,
          gradedBy: adminId,
          gradedAt: now,
          updatedAt: now,
        });
      }
    }

    await writeGrades(grades);
  });

  // Single write to submissions.json — mark all as 'reviewed'
  await withFileLock('submissions.json', async () => {
    const submissions = await readSubmissionsFresh();

    for (const v of validated) {
      const idx = submissions.findIndex((s) => s.id === v.submission.id);
      if (idx !== -1) {
        submissions[idx] = {
          ...submissions[idx],
          status: 'reviewed',
          updatedAt: now,
        };
      }
    }

    await writeSubmissions(submissions);
  });

  return { saved: validated.length, errors };
}

// ────────────────────────────────────────────────────────────
// PUBLICAR NOTAS (RN-CAL-02, RN-CAL-03)
// ────────────────────────────────────────────────────────────

/**
 * publishGrades — Publicar todas las notas de una actividad
 * RN-CAL-03: Publicación masiva
 */
export async function publishGrades(activityId: string): Promise<{ published: number }> {
  const activity = getActivityById(activityId);
  if (!activity) {
    throw new GradeError('Actividad no encontrada', 404);
  }

  return withFileLock('grades.json', async () => {
    const grades = await readGradesFresh();
    const now = new Date().toISOString();
    let published = 0;

    for (let i = 0; i < grades.length; i++) {
      if (grades[i].activityId === activityId && !grades[i].isPublished) {
        grades[i] = {
          ...grades[i],
          isPublished: true,
          publishedAt: now,
          updatedAt: now,
        };
        published++;
      }
    }

    if (published === 0) {
      throw new GradeError('No hay notas pendientes de publicar para esta actividad', 400);
    }

    await writeGrades(grades);
    return { published };
  });
}

// ────────────────────────────────────────────────────────────
// CÁLCULO DE NOTA DEFINITIVA (RN-CAL-05, RN-CAL-07)
// ────────────────────────────────────────────────────────────

/**
 * calculateFinalGrade — Calcula el promedio ponderado de un estudiante en un curso
 *
 * Fórmula: Σ(score/maxScore × weight) / Σ(weights de actividades calificadas) × 5.0
 * Escala: 0.0 – 5.0 (estándar colombiano)
 * Aprobación: ≥ 3.0
 * Redondeo: 1 decimal
 */
export function calculateFinalGrade(studentId: string, courseId: string, allGrades?: Grade[]): FinalGradeResult {
  // Obtener todas las actividades publicadas del curso
  const activities = getActivitiesByCourse(courseId)
    .filter((a) => a.status === 'published' || a.status === 'closed');

  // Obtener notas del estudiante en este curso
  const studentGrades = allGrades
    ? allGrades.filter((g) => g.studentId === studentId && g.courseId === courseId)
    : getGradesByStudent(studentId, courseId);

  const details: FinalGradeResult['details'] = [];
  let sumWeightedScores = 0;
  let sumWeights = 0;

  for (const activity of activities) {
    const grade = studentGrades.find((g) => g.activityId === activity.id);
    if (grade) {
      const normalizedScore = grade.score / grade.maxScore; // 0.0–1.0
      const weightedContribution = normalizedScore * activity.weight;

      details.push({
        activityId: activity.id,
        activityTitle: activity.title,
        score: grade.score,
        maxScore: grade.maxScore,
        weight: activity.weight,
        normalizedScore: roundTo1Decimal(normalizedScore * 100) / 100, // Keep as fraction
        weightedContribution: roundTo1Decimal(weightedContribution * 100) / 100,
      });

      sumWeightedScores += weightedContribution;
      sumWeights += activity.weight;
    }
  }

  // Si no hay notas, retornar vacío
  if (sumWeights === 0) {
    return {
      finalScore: 0,
      details: [],
      totalWeight: 0,
      isPartial: true,
      isApproved: false,
    };
  }

  // Nota definitiva en escala 0.0–5.0
  const rawFinal = (sumWeightedScores / sumWeights) * SCALE_MAX;
  const finalScore = roundTo1Decimal(rawFinal);

  // ¿Faltan actividades por calificar?
  const totalActivitiesWeight = activities.reduce((acc, a) => acc + a.weight, 0);
  const isPartial = sumWeights < totalActivitiesWeight;

  return {
    finalScore,
    details,
    totalWeight: sumWeights,
    isPartial,
    isApproved: finalScore >= APPROVAL_THRESHOLD,
  };
}

// ────────────────────────────────────────────────────────────
// RESUMEN DE NOTAS DEL CURSO (RF-CAL-05)
// ────────────────────────────────────────────────────────────

/**
 * getCourseGradeSummary — Tabla pivote de notas por curso (vista admin)
 * Filas: estudiantes, Columnas: actividades, Última columna: definitiva
 */
export async function getCourseGradeSummary(courseId: string): Promise<CourseGradeSummary> {
  const course = getCourseById(courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  // Actividades del curso (solo publicadas/cerradas tienen sentido para notas)
  const activities = getActivitiesByCourse(courseId)
    .filter((a) => a.status === 'published' || a.status === 'closed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Estudiantes inscritos activos
  const enrollments = getEnrollmentsByCourse(courseId)
    .filter((e) => e.status === 'active');

  // Todas las notas del curso — FRESH desde Blob
  const freshGrades = await readGradesFresh();
  const allGrades = freshGrades.filter((g) => g.courseId === courseId);

  const students = enrollments.map((enrollment) => {
    const student = getUserById(enrollment.studentId);
    if (!student) return null;

    // Map de notas por actividad
    const gradesMap: CourseGradeSummary['students'][number]['grades'] = {};
    for (const activity of activities) {
      const grade = allGrades.find(
        (g) => g.activityId === activity.id && g.studentId === student.id
      );
      gradesMap[activity.id] = grade
        ? {
            score: grade.score,
            maxScore: grade.maxScore,
            isPublished: grade.isPublished,
            feedback: grade.feedback,
          }
        : null;
    }

    // Calcular definitiva (pasar allGrades para evitar leer de caché)
    const finalResult = calculateFinalGrade(student.id, courseId, freshGrades);

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      documentNumber: student.documentNumber,
      email: student.email,
      grades: gradesMap,
      finalScore: finalResult.totalWeight > 0 ? finalResult.finalScore : null,
      isPartial: finalResult.isPartial,
      isApproved: finalResult.totalWeight > 0 ? finalResult.isApproved : null,
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    courseId,
    courseName: course.name,
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      maxScore: a.maxScore,
      weight: a.weight,
    })),
    students,
  };
}

// ────────────────────────────────────────────────────────────
// RESUMEN DE NOTAS DEL ESTUDIANTE (RF-CAL-04)
// ────────────────────────────────────────────────────────────

/**
 * getStudentGradeSummary — Notas de un estudiante en un curso
 * Solo muestra notas publicadas (RN-CAL-02)
 */
export async function getStudentGradeSummary(studentId: string, courseId: string): Promise<StudentGradeSummary> {
  const course = getCourseById(courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  // Actividades visibles (publicadas/cerradas)
  const activities = getActivitiesByCourse(courseId)
    .filter((a) => a.status === 'published' || a.status === 'closed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Notas DEL estudiante en este curso — FRESH desde Blob, solo publicadas
  const freshGrades = await readGradesFresh();
  const studentGrades = freshGrades
    .filter((g) => g.studentId === studentId && g.courseId === courseId && g.isPublished);

  const activityDetails: StudentGradeSummary['activities'] = activities.map((activity) => {
    const grade = studentGrades.find((g) => g.activityId === activity.id);
    return {
      id: activity.id,
      title: activity.title,
      type: activity.type,
      maxScore: activity.maxScore,
      weight: activity.weight,
      grade: grade
        ? {
            score: grade.score,
            maxScore: grade.maxScore,
            feedback: grade.feedback,
            gradedAt: grade.gradedAt,
            publishedAt: grade.publishedAt,
          }
        : null,
    };
  });

  // Calcular definitiva solo con notas publicadas
  let sumWeighted = 0;
  let sumWeights = 0;
  for (const act of activityDetails) {
    if (act.grade) {
      const normalized = act.grade.score / act.grade.maxScore;
      sumWeighted += normalized * act.weight;
      sumWeights += act.weight;
    }
  }

  const totalWeight = activities.reduce((acc, a) => acc + a.weight, 0);
  const finalScore = sumWeights > 0 ? roundTo1Decimal((sumWeighted / sumWeights) * SCALE_MAX) : null;

  return {
    studentId,
    courseId,
    courseName: course.name,
    activities: activityDetails,
    finalScore,
    isPartial: sumWeights < totalWeight,
    isApproved: finalScore !== null ? finalScore >= APPROVAL_THRESHOLD : null,
  };
}

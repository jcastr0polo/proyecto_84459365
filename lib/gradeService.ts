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
  readSubmissionsFresh,
  readActivitiesFresh,
  readGradesFresh,
  readCoursesFresh,
  readEnrollmentsFresh,
  readUsersFresh,
  readCortesFresh,
  readQuizzesFresh,
  readQuizAttemptsFresh,
  readManualGradeItemsFresh,
  readManualGradesFresh,
  writeGrades,
  writeSubmissions,
} from '@/lib/dataService';
import { nowColombiaISO } from '@/lib/dateUtils';
import { withFileLock } from '@/lib/dataService';
import type {
  Grade,
  Submission,
  Activity,
  Course,
  User,
  Enrollment,
  Corte,
  Quiz,
  QuizAttempt,
  ManualGradeItem,
  ManualGrade,
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

/**
 * Identificador de "nota sin entrega".
 *
 * Hasta ahora toda nota se guardaba atada a una entrega, así que a quien no
 * entregaba no se le podía poner un cero: no aparecía en la tabla de
 * calificación y su peso quedaba fuera de la definitiva, que salía inflada.
 *
 * La columna submission_id es NOT NULL y tiene índice único, pero NO tiene
 * clave foránea contra submissions. Eso permite usar un identificador
 * sintético y estable por (actividad, estudiante) sin tocar el esquema de una
 * base con notas reales: cumple el NOT NULL y, de regalo, el índice único
 * garantiza justo lo que queremos, una sola nota por estudiante y actividad.
 *
 * Si algún día se limpia el esquema, basta con permitir NULL en la columna y
 * añadir un índice único sobre (activity_id, student_id).
 */
const NO_SUBMISSION_PREFIX = 'nosub';

export function noSubmissionId(activityId: string, studentId: string): string {
  return `${NO_SUBMISSION_PREFIX}:${activityId}:${studentId}`;
}

export function isNoSubmissionId(id: string): boolean {
  return id.startsWith(`${NO_SUBMISSION_PREFIX}:`);
}

/**
 * Identificador de "parcial no presentado".
 *
 * El mismo problema que `nosub`, pero en parciales: si un estudiante nunca
 * abrió el parcial no existe ningún intento suyo, y el cálculo dejaba fuera
 * TODO el peso del parcial. Resultado: al que no lo presentó le salía la
 * definitiva más alta que al que lo presentó y sacó 2.0.
 *
 * `quiz_attempts` tampoco tiene clave foránea ni índice único, así que un id
 * derivado de (parcial, estudiante) es estable, reconocible y idempotente: si
 * se marca dos veces, es la misma fila.
 *
 * Es una acción explícita del docente, nunca automática: que un parcial esté
 * sin presentar hoy no significa un cero — puede estar abierto, o haber
 * supletorio. El cero lo pone quien decide que ya no hay más plazo.
 */
const NO_ATTEMPT_PREFIX = 'noattempt';

export function noAttemptId(quizId: string, studentId: string): string {
  return `${NO_ATTEMPT_PREFIX}:${quizId}:${studentId}`;
}

export function isNoAttemptId(id: string): boolean {
  return id.startsWith(`${NO_ATTEMPT_PREFIX}:`);
}

/**
 * Ajuste del docente sobre una nota ya calculada.
 *
 * Comportamiento y participación no son un ítem más del sílabo: no compiten
 * por peso ni diluyen a los demás. Si la apreciación fuera un ítem con peso,
 * para subir un corte de 3.0 a 3.5 tendría que pesar 30 % del corte, porque al
 * sumar peso también reparte. Un ajuste es una suma sobre el resultado.
 *
 * Se guarda como nota manual con peso 0 sobre un ítem sintético, con el mismo
 * criterio que `nosub` y `noattempt`: id derivado de (curso, corte), estable e
 * idempotente, sin tocar el esquema.
 *
 * Se guarda la NOTA RESULTANTE, no la diferencia, por dos razones: la columna
 * score está validada como no negativa, y una diferencia guardada se aplicaría
 * en silencio sobre una base que cambió. La diferencia se muestra siempre en
 * pantalla, calculada contra la base del momento.
 *
 * `corteId` vacío = el ajuste es sobre la definitiva del curso.
 */
const ADJUST_PREFIX = 'ajuste';

export function adjustItemId(courseId: string, corteId?: string): string {
  return `${ADJUST_PREFIX}:${courseId}:${corteId ?? 'final'}`;
}

export function isAdjustItemId(id: string): boolean {
  return id.startsWith(`${ADJUST_PREFIX}:`);
}

/** null si no es un ítem de ajuste; corteId undefined = ajuste de la definitiva. */
export function parseAdjustItemId(id: string): { courseId: string; corteId?: string } | null {
  if (!isAdjustItemId(id)) return null;
  const [, courseId, corte] = id.split(':');
  if (!courseId) return null;
  return { courseId, corteId: corte === 'final' ? undefined : corte };
}

const SCALE_MAX = 5.0;
const APPROVAL_THRESHOLD = 3.0;

/**
 * Redondear a 1 decimal (estándar colombiano)
 */
function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Ninguna nota puede salirse de la escala, venga de donde venga. */
function clampScore(value: number): number {
  return roundTo1Decimal(Math.min(SCALE_MAX, Math.max(0, value)));
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
  // Batch read: 3 files in parallel (1 Blob request each)
  const [allSubmissions, allActivities, allGrades] = await Promise.all([
    readSubmissionsFresh(),
    readActivitiesFresh(),
    readGradesFresh(),
  ]);

  // 1. Verificar submission
  const submission = allSubmissions.find((s) => s.id === data.submissionId);
  if (!submission) {
    throw new GradeError('Entrega no encontrada', 404);
  }

  // 2. Verificar actividad
  const activity = allActivities.find((a) => a.id === data.activityId);
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

  const now = nowColombiaISO();

  // 5. Verificar si ya existe calificación para esta entrega
  const existingGrade = allGrades.find((g) => g.submissionId === data.submissionId) ?? null;

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
  // Batch read: 2 files in parallel
  const [allGrades, allActivities] = await Promise.all([
    readGradesFresh(),
    readActivitiesFresh(),
  ]);

  const existing = allGrades.find((g) => g.id === gradeId) ?? null;
  if (!existing) {
    throw new GradeError('Calificación no encontrada', 404);
  }

  const activity = allActivities.find((a) => a.id === existing.activityId) ?? null;

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

  const now = nowColombiaISO();

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

  const now = nowColombiaISO();
  const errors: { submissionId: string; error: string }[] = [];

  // Batch read: 2 files in parallel (instead of N reads per item)
  const [allSubmissions, allActivities] = await Promise.all([
    readSubmissionsFresh(),
    readActivitiesFresh(),
  ]);

  // Pre-validate all items before writing anything
  const validated: {
    item: BatchGradeItem;
    submission: Submission | undefined;
    activity: Activity;
    finalScore: number;
    existingGradeId?: string;
  }[] = [];

  for (const item of items) {
    // Un identificador sintético significa "este estudiante no entregó": no
    // hay entrega que buscar ni coherencia que validar contra ella.
    const noSubmission = isNoSubmissionId(item.submissionId);
    const submission = noSubmission
      ? undefined
      : allSubmissions.find((s) => s.id === item.submissionId);

    if (!noSubmission && !submission) {
      errors.push({ submissionId: item.submissionId, error: 'Entrega no encontrada' });
      continue;
    }

    const activity = allActivities.find((a) => a.id === item.activityId);
    if (!activity) {
      errors.push({ submissionId: item.submissionId, error: 'Actividad no encontrada' });
      continue;
    }

    if (submission && submission.activityId !== activity.id) {
      errors.push({ submissionId: item.submissionId, error: 'La entrega no corresponde a esta actividad' });
      continue;
    }

    if (item.score < 0 || item.score > activity.maxScore) {
      errors.push({ submissionId: item.submissionId, error: `Nota fuera de rango (0–${activity.maxScore})` });
      continue;
    }

    // Penalización por tardanza: no aplica si no hubo entrega.
    let finalScore = item.score;
    if (submission?.isLate && activity.latePenaltyPercent && activity.latePenaltyPercent > 0) {
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

  // Marcar como revisadas solo las que existen: quien no entregó no tiene
  // entrega que actualizar.
  const withSubmission = validated.filter((v) => v.submission !== undefined);
  if (withSubmission.length > 0) {
  await withFileLock('submissions.json', async () => {
    const submissions = await readSubmissionsFresh();

    for (const v of withSubmission) {
      const idx = submissions.findIndex((s) => s.id === v.submission!.id);
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
  }

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
  const allActivities = await readActivitiesFresh();
  const activity = allActivities.find((a) => a.id === activityId) ?? null;
  if (!activity) {
    throw new GradeError('Actividad no encontrada', 404);
  }

  return withFileLock('grades.json', async () => {
    const grades = await readGradesFresh();
    const now = nowColombiaISO();
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
 * Acepta arrays pre-cargados para evitar lecturas adicionales a Blob.
 * Incluye actividades, parciales calificables y notas manuales.
 */
/**
 * calculateCorteScores — Nota por corte de un estudiante (pura, sin I/O)
 *
 * Nota del corte = promedio ponderado de sus ítems calificados, en escala 0.0–5.0.
 * Solo pondera lo que ya tiene nota: un corte a medio calificar refleja lo cursado
 * hasta ahora, no penaliza lo que aún no se ha calificado.
 *
 * El array `grades` debe venir ya filtrado por el llamador según a quién se le muestra:
 * el estudiante solo ve notas publicadas (isPublished), el admin las ve todas.
 *
 * `activities`, `quizzes` y `manualItems` deben venir acotados al curso.
 *
 * @returns Record<corteId, nota 0.0–5.0 | null> — null si el corte no tiene nada calificado
 */
export function calculateCorteScores(
  studentId: string,
  cortes: Corte[],
  activities: Activity[],
  grades: Grade[],
  quizzes: Quiz[],
  attempts: QuizAttempt[],
  manualItems: ManualGradeItem[],
  manualGrades: ManualGrade[],
): Record<string, number | null> {
  const corteScores: Record<string, number | null> = {};

  for (const corte of cortes) {
    let sumWeighted = 0;
    let sumWeights = 0;

    for (const act of activities.filter((a) => a.corteId === corte.id)) {
      const grade = grades.find((g) => g.activityId === act.id && g.studentId === studentId);
      if (grade) {
        sumWeighted += (grade.score / grade.maxScore) * act.weight;
        sumWeights += act.weight;
      }
    }

    for (const quiz of quizzes.filter((q) => q.corteId === corte.id)) {
      const quizAttempts = attempts.filter((a) => a.quizId === quiz.id && a.studentId === studentId);
      if (quizAttempts.length > 0) {
        const best = quizAttempts.reduce((b, a) => a.percentage > b.percentage ? a : b);
        sumWeighted += (best.percentage / 100) * quiz.weight!;
        sumWeights += quiz.weight!;
      }
    }

    for (const item of manualItems.filter((i) => i.corteId === corte.id)) {
      // Un ajuste no promedia con lo demás: se aplica sobre el resultado.
      if (isAdjustItemId(item.id)) continue;
      // `manualGrades` llega ya filtrado por quien llama, igual que `grades`:
      // el estudiante solo pasa las publicadas, el admin las pasa todas.
      const mg = manualGrades.find((g) => g.itemId === item.id && g.studentId === studentId);
      if (mg) {
        sumWeighted += (mg.score / mg.maxScore) * item.weight;
        sumWeights += item.weight;
      }
    }

    const base = sumWeights > 0
      ? roundTo1Decimal((sumWeighted / sumWeights) * SCALE_MAX)
      : null;

    // El ajuste manda sobre la base, pero solo si hay base: un corte donde
    // todavía no se ha calificado nada no puede tener nota "ajustada".
    const adjustment = manualGrades.find(
      (g) => g.itemId === adjustItemId(corte.courseId, corte.id) && g.studentId === studentId,
    );
    corteScores[corte.id] = base !== null && adjustment
      ? clampScore(adjustment.score)
      : base;
  }

  return corteScores;
}

/**
 * resolveFinalScore — Definitiva respetando el peso de cada corte.
 *
 * Hasta ahora `Corte.weight` decía "Porcentaje sobre la definitiva" y no se
 * usaba para nada: calculateFinalGrade ni siquiera recibe los cortes. La
 * definitiva era un promedio plano de todos los ítems del curso, así que un
 * corte que pesa 70 % y otro que pesa 30 % pesaban lo mismo si sus ítems
 * internos sumaban parecido. Con 5.0 en el primero y 1.0 en el segundo salía
 * 3.0 en vez de 3.8.
 *
 * Salvaguarda: si el curso tiene cortes pero hay ítems calificables SIN corte
 * asignado, ponderar por corte los dejaría fuera de la definitiva sin avisar.
 * En ese caso se mantiene el cálculo plano y se devuelve el aviso, para que el
 * docente asigne el corte y el curso pase solo al modo correcto.
 */
export interface FinalScoreResolution {
  finalScore: number | null;
  isPartial: boolean;
  isApproved: boolean | null;
  /** 'cortes' = ponderado por peso de corte · 'flat' = promedio plano de ítems */
  basis: 'cortes' | 'flat';
  /** Peso de corte con nota / peso total declarado (solo en basis 'cortes') */
  countedCorteWeight: number;
  totalCorteWeight: number;
  /** Títulos de los ítems que impiden usar los pesos de corte */
  orphanItems: string[];
}

/** Los ítems que deberían tener corte asignado, para detectar huérfanos. */
export function gradableItemsOf(
  activities: { title: string; corteId?: string }[],
  quizzes: { title: string; corteId?: string }[],
  manualItems: { id: string; title: string; corteId?: string }[],
): { title: string; corteId?: string }[] {
  return [
    ...activities.map((a) => ({ title: a.title, corteId: a.corteId })),
    ...quizzes.map((q) => ({ title: `[Parcial] ${q.title}`, corteId: q.corteId })),
    ...manualItems.filter((i) => !isAdjustItemId(i.id))
      .map((i) => ({ title: `[Manual] ${i.title}`, corteId: i.corteId })),
  ];
}

export function resolveFinalScore(
  cortes: Corte[],
  corteScores: Record<string, number | null>,
  flat: FinalGradeResult,
  gradableItems: { title: string; corteId?: string }[] = [],
  /** Ajuste del docente sobre la definitiva. Manda sobre todo lo demás. */
  finalOverride?: number | null,
): FinalScoreResolution {
  const totalCorteWeight = cortes.reduce((acc, c) => acc + c.weight, 0);
  const orphanItems = cortes.length > 0
    ? gradableItems.filter((i) => !i.corteId).map((i) => i.title)
    : [];

  const usable = cortes.length > 0 && totalCorteWeight > 0 && orphanItems.length === 0;

  // El ajuste sobre la definitiva solo aplica si ya hay algo calculado: no se
  // le pone nota a un curso sin calificar nada.
  const applyOverride = (computed: number | null) =>
    computed !== null && finalOverride !== null && finalOverride !== undefined
      ? clampScore(finalOverride)
      : computed;

  if (!usable) {
    const flatScore = applyOverride(flat.totalWeight > 0 ? flat.finalScore : null);
    return {
      finalScore: flatScore,
      isPartial: flat.isPartial,
      isApproved: flatScore !== null ? flatScore >= APPROVAL_THRESHOLD : null,
      basis: 'flat',
      countedCorteWeight: 0,
      totalCorteWeight,
      orphanItems,
    };
  }

  // Solo entran los cortes que ya tienen algo calificado: un corte que no ha
  // empezado no debe arrastrar la definitiva hacia abajo.
  let weighted = 0;
  let counted = 0;
  for (const corte of cortes) {
    const score = corteScores[corte.id];
    if (score === null || score === undefined || corte.weight <= 0) continue;
    weighted += score * corte.weight;
    counted += corte.weight;
  }

  if (counted === 0) {
    return {
      finalScore: null, isPartial: true, isApproved: null,
      basis: 'cortes', countedCorteWeight: 0, totalCorteWeight, orphanItems,
    };
  }

  const finalScore = applyOverride(roundTo1Decimal(weighted / counted))!;
  return {
    finalScore,
    isPartial: counted < totalCorteWeight || flat.isPartial,
    isApproved: finalScore >= APPROVAL_THRESHOLD,
    basis: 'cortes',
    countedCorteWeight: counted,
    totalCorteWeight,
    orphanItems,
  };
}

export function calculateFinalGrade(
  studentId: string,
  courseId: string,
  allActivities: Activity[],
  allGrades: Grade[],
  allQuizzes?: Quiz[],
  allAttempts?: QuizAttempt[],
  allManualItems?: ManualGradeItem[],
  allManualGrades?: ManualGrade[],
): FinalGradeResult {
  // Actividades publicadas/cerradas del curso
  const activities = allActivities
    .filter((a) => a.courseId === courseId && (a.status === 'published' || a.status === 'closed'));

  // Notas del estudiante en este curso
  const studentGrades = allGrades
    .filter((g) => g.studentId === studentId && g.courseId === courseId);

  const details: FinalGradeResult['details'] = [];
  let sumWeightedScores = 0;
  let sumWeights = 0;

  // ── Activity grades ──
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
        normalizedScore: roundTo1Decimal(normalizedScore * 100) / 100,
        weightedContribution: roundTo1Decimal(weightedContribution * 100) / 100,
      });

      sumWeightedScores += weightedContribution;
      sumWeights += activity.weight;
    }
  }

  // ── Quiz grades (graded quizzes with weight) ──
  if (allQuizzes && allAttempts) {
    const courseQuizzes = allQuizzes.filter(
      (q) => q.courseId === courseId && q.type === 'graded' && q.weight && q.weight > 0
    );
    for (const quiz of courseQuizzes) {
      const quizAttempts = allAttempts.filter(
        (a) => a.quizId === quiz.id && a.studentId === studentId
      );
      if (quizAttempts.length > 0) {
        const bestAttempt = quizAttempts.reduce((best, a) => a.percentage > best.percentage ? a : best);
        const quizMaxScore = quiz.maxScore ?? SCALE_MAX;
        const score = roundTo1Decimal((bestAttempt.percentage / 100) * quizMaxScore);
        const normalizedScore = score / quizMaxScore;
        const weightedContribution = normalizedScore * quiz.weight!;

        details.push({
          activityId: quiz.id,
          activityTitle: isNoAttemptId(bestAttempt.id)
            ? `[Parcial] ${quiz.title} — no presentó`
            : `[Parcial] ${quiz.title}`,
          score,
          maxScore: quizMaxScore,
          weight: quiz.weight!,
          normalizedScore: roundTo1Decimal(normalizedScore * 100) / 100,
          weightedContribution: roundTo1Decimal(weightedContribution * 100) / 100,
        });

        sumWeightedScores += weightedContribution;
        sumWeights += quiz.weight!;
      }
    }
  }

  // ── Manual grades ──
  if (allManualItems && allManualGrades) {
    // Los ajustes no son ítems del sílabo: no promedian ni aparecen en el desglose.
    const courseItems = allManualItems.filter((i) => i.courseId === courseId && !isAdjustItemId(i.id));
    for (const item of courseItems) {
      const grade = allManualGrades.find(
        (g) => g.itemId === item.id && g.studentId === studentId
      );
      if (grade) {
        const normalizedScore = grade.score / grade.maxScore;
        const weightedContribution = normalizedScore * item.weight;

        details.push({
          activityId: item.id,
          activityTitle: `[Manual] ${item.title}`,
          score: grade.score,
          maxScore: grade.maxScore,
          weight: item.weight,
          normalizedScore: roundTo1Decimal(normalizedScore * 100) / 100,
          weightedContribution: roundTo1Decimal(weightedContribution * 100) / 100,
        });

        sumWeightedScores += weightedContribution;
        sumWeights += item.weight;
      }
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

  // ¿Faltan ítems por calificar?
  const totalActivitiesWeight = activities.reduce((acc, a) => acc + a.weight, 0);
  const totalQuizWeight = (allQuizzes ?? [])
    .filter((q) => q.courseId === courseId && q.type === 'graded' && q.weight && q.weight > 0)
    .reduce((acc, q) => acc + (q.weight ?? 0), 0);
  const totalManualWeight = (allManualItems ?? [])
    .filter((i) => i.courseId === courseId && !isAdjustItemId(i.id))
    .reduce((acc, i) => acc + i.weight, 0);
  const totalExpectedWeight = totalActivitiesWeight + totalQuizWeight + totalManualWeight;
  const isPartial = sumWeights < totalExpectedWeight;

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
 * Filas: estudiantes, Columnas: actividades agrupadas por corte, Última columna: definitiva
 * Incluye nota por corte para cada estudiante.
 *
 * Performance: lee 6 archivos en paralelo (6 requests a Blob), luego todo es cálculo en memoria.
 */
export async function getCourseGradeSummary(courseId: string): Promise<CourseGradeSummary> {
  // ── Batch read: 10 files in parallel ──
  console.log('[gradeService] getCourseGradeSummary: starting parallel reads for', courseId);

  const results = await Promise.allSettled([
    readCoursesFresh(),
    readActivitiesFresh(),
    readEnrollmentsFresh(),
    readGradesFresh(),
    readUsersFresh(),
    readCortesFresh(),
    readQuizzesFresh(),
    readQuizAttemptsFresh(),
    readManualGradeItemsFresh(),
    readManualGradesFresh(),
  ]);

  const labels = ['courses', 'activities', 'enrollments', 'grades', 'users', 'cortes', 'quizzes', 'quiz-attempts', 'manual-items', 'manual-grades'];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      console.error(`[gradeService] FAILED to read ${labels[i]}:`, (results[i] as PromiseRejectedResult).reason);
    } else {
      const val = (results[i] as PromiseFulfilledResult<unknown>).value;
      console.log(`[gradeService] OK ${labels[i]}: ${Array.isArray(val) ? val.length + ' items' : 'loaded'}`);
    }
  }

  // If any critical file failed, throw with details
  const failed = labels.filter((_, i) => results[i].status === 'rejected');
  if (failed.length > 0) {
    throw new GradeError(`Error leyendo datos: ${failed.join(', ')}`, 500);
  }

  const [allCourses, allActivities, allEnrollments, allGrades, allUsers, allCortes, allQuizzes, allAttempts, allManualItems, allManualGrades] = results.map(
    (r) => (r as PromiseFulfilledResult<unknown>).value
  ) as [Course[], Activity[], Enrollment[], Grade[], User[], Corte[], Quiz[], QuizAttempt[], ManualGradeItem[], ManualGrade[]];

  const course = allCourses.find((c) => c.id === courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  // Actividades del curso (publicadas/cerradas)
  const activities = allActivities
    .filter((a) => a.courseId === courseId && (a.status === 'published' || a.status === 'closed'))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Cortes del curso
  const courseCortes = allCortes
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => a.order - b.order);

  // Estudiantes inscritos activos
  const enrollments = allEnrollments
    .filter((e) => e.courseId === courseId && e.status === 'active');

  // Notas del curso
  const courseGrades = allGrades.filter((g) => g.courseId === courseId);

  // Map de usuarios para lookup rápido
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // ── Build per-corte activity groups ──
  const cortesInfo: CourseGradeSummary['cortes'] = courseCortes.map((corte) => ({
    id: corte.id,
    name: corte.name,
    weight: corte.weight,
    order: corte.order,
  }));

  // Quizzes & manual items for the course
  const courseQuizzes = allQuizzes.filter(
    (q) => q.courseId === courseId && q.type === 'graded' && q.weight && q.weight > 0
  );
  // Los ajustes viven en la misma tabla pero no son ítems calificables: no son
  // columna de la tabla de notas ni renglón del desglose del estudiante.
  const courseManualItems = allManualItems.filter(
    (i) => i.courseId === courseId && !isAdjustItemId(i.id),
  );

  const students = enrollments.map((enrollment) => {
    const student = userMap.get(enrollment.studentId);
    if (!student) return null;

    // Map de notas por actividad
    const gradesMap: CourseGradeSummary['students'][number]['grades'] = {};
    for (const activity of activities) {
      const grade = courseGrades.find(
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

    // Quiz grades
    for (const quiz of courseQuizzes) {
      const attempts = allAttempts.filter(
        (a) => a.quizId === quiz.id && a.studentId === student.id
      );
      if (attempts.length > 0) {
        const best = attempts.reduce((b, a) => a.percentage > b.percentage ? a : b);
        const maxScore = quiz.maxScore ?? 100;
        gradesMap[quiz.id] = {
          score: roundTo1Decimal((best.percentage / 100) * maxScore),
          maxScore,
          isPublished: true,
          ...(isNoAttemptId(best.id) ? { feedback: 'No presentó' } : {}),
        };
      } else {
        gradesMap[quiz.id] = null;
      }
    }

    // Manual grade items
    for (const item of courseManualItems) {
      const mg = allManualGrades.find(
        (g) => g.itemId === item.id && g.studentId === student.id
      );
      gradesMap[item.id] = mg
        ? {
            score: mg.score,
            maxScore: mg.maxScore,
            isPublished: true,
            feedback: mg.feedback,
          }
        : null;
    }

    // ── Per-corte score calculation ──
    // Admin: courseGrades sin filtrar por isPublished (ve también lo no publicado)
    const corteScores = calculateCorteScores(
      student.id, courseCortes, activities, courseGrades,
      courseQuizzes, allAttempts, courseManualItems, allManualGrades,
    );

    // Definitiva (all sources, pure in-memory)
    const finalResult = calculateFinalGrade(
      student.id, courseId, allActivities, allGrades,
      allQuizzes, allAttempts, allManualItems, allManualGrades
    );

    const finalAdjustment = allManualGrades.find(
      (g) => g.itemId === adjustItemId(courseId) && g.studentId === student.id,
    );
    const gradable = gradableItemsOf(activities, courseQuizzes, courseManualItems);
    const resolved = resolveFinalScore(
      courseCortes, corteScores, finalResult, gradable,
      finalAdjustment?.score ?? null,
    );

    // Y las mismas notas como si no hubiera ningún ajuste, para que la
    // pantalla de ajuste pueda enseñar base → resultado.
    const withoutAdjustments = allManualGrades.filter((g) => !isAdjustItemId(g.itemId));
    const corteScoresRaw = calculateCorteScores(
      student.id, courseCortes, activities, courseGrades,
      courseQuizzes, allAttempts, courseManualItems, withoutAdjustments,
    );
    const finalScoreRaw = resolveFinalScore(
      courseCortes, corteScoresRaw, finalResult, gradable, null,
    ).finalScore;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      documentNumber: student.documentNumber,
      email: student.email,
      grades: gradesMap,
      corteScores,
      corteScoresRaw,
      finalScore: resolved.finalScore,
      finalScoreRaw,
      isPartial: resolved.isPartial,
      isApproved: resolved.isApproved,
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  // Build unified activities list (activities + quizzes + manual items)
  const allActivityEntries: CourseGradeSummary['activities'] = [
    ...activities.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      maxScore: a.maxScore,
      weight: a.weight,
      corteId: a.corteId,
    })),
    ...courseQuizzes.map((q) => ({
      id: q.id,
      title: q.title,
      type: 'quiz' as const,
      maxScore: q.maxScore ?? 100,
      weight: q.weight!,
      ...(q.corteId ? { corteId: q.corteId } : {}),
    })),
    ...courseManualItems.map((i) => ({
      id: i.id,
      title: i.title,
      type: 'manual' as const,
      maxScore: i.maxScore,
      weight: i.weight,
      ...(i.corteId ? { corteId: i.corteId } : {}),
    })),
  ];

  return {
    courseId,
    courseName: course.name,
    cortes: cortesInfo,
    activities: allActivityEntries,
    students,
  };
}

// ────────────────────────────────────────────────────────────
// RESUMEN DE NOTAS DEL ESTUDIANTE (RF-CAL-04)
// ────────────────────────────────────────────────────────────

/**
 * getStudentGradeSummary — Notas de un estudiante en un curso
 * Solo muestra notas publicadas (RN-CAL-02)
 * Incluye notas por corte.
 *
 * Performance: 3 parallel Blob reads, then pure in-memory.
 */
export async function getStudentGradeSummary(studentId: string, courseId: string): Promise<StudentGradeSummary> {
  console.log('[gradeService] getStudentGradeSummary: starting parallel reads for', studentId, courseId);

  const results = await Promise.allSettled([
    readCoursesFresh(),
    readActivitiesFresh(),
    readGradesFresh(),
    readCortesFresh(),
    readQuizzesFresh(),
    readQuizAttemptsFresh(),
    readManualGradeItemsFresh(),
    readManualGradesFresh(),
  ]);

  const labels = ['courses', 'activities', 'grades', 'cortes', 'quizzes', 'quiz-attempts', 'manual-items', 'manual-grades'];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      console.error(`[gradeService] FAILED to read ${labels[i]}:`, (results[i] as PromiseRejectedResult).reason);
    } else {
      const val = (results[i] as PromiseFulfilledResult<unknown>).value;
      console.log(`[gradeService] OK ${labels[i]}: ${Array.isArray(val) ? val.length + ' items' : 'loaded'}`);
    }
  }

  const failed = labels.filter((_, i) => results[i].status === 'rejected');
  if (failed.length > 0) {
    throw new GradeError(`Error leyendo datos: ${failed.join(', ')}`, 500);
  }

  const [allCourses, allActivities, allGrades, allCortes, allQuizzes, allAttempts, allManualItems, allManualGrades] = results.map(
    (r) => (r as PromiseFulfilledResult<unknown>).value
  ) as [Course[], Activity[], Grade[], Corte[], Quiz[], QuizAttempt[], ManualGradeItem[], ManualGrade[]];

  const course = allCourses.find((c) => c.id === courseId);
  if (!course) {
    throw new GradeError('Curso no encontrado', 404);
  }

  // Actividades visibles (publicadas/cerradas)
  const activities = allActivities
    .filter((a) => a.courseId === courseId && (a.status === 'published' || a.status === 'closed'))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Cortes del curso
  const courseCortes = allCortes
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => a.order - b.order);

  // Notas publicadas del estudiante
  const studentGrades = allGrades
    .filter((g) => g.studentId === studentId && g.courseId === courseId && g.isPublished);

  const activityDetails: StudentGradeSummary['activities'] = activities.map((activity) => {
    const grade = studentGrades.find((g) => g.activityId === activity.id);
    return {
      id: activity.id,
      title: activity.title,
      type: activity.type,
      maxScore: activity.maxScore,
      weight: activity.weight,
      corteId: activity.corteId,
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

  // Per-corte scores (activities + quizzes + manual)
  const courseQuizzes = allQuizzes.filter(
    (q) => q.courseId === courseId && q.type === 'graded' && q.weight && q.weight > 0
  );
  // Los ajustes viven en la misma tabla pero no son ítems calificables: no son
  // columna de la tabla de notas ni renglón del desglose del estudiante.
  const courseManualItems = allManualItems.filter(
    (i) => i.courseId === courseId && !isAdjustItemId(i.id),
  );

  // Add quizzes as visible items in the activities list
  const quizDetails: StudentGradeSummary['activities'] = courseQuizzes.map((quiz) => {
    const attempts = allAttempts.filter(
      (a) => a.quizId === quiz.id && a.studentId === studentId
    );
    const best = attempts.length > 0
      ? attempts.reduce((b, a) => a.percentage > b.percentage ? a : b)
      : null;
    const maxScore = quiz.maxScore ?? 100;
    return {
      id: quiz.id,
      title: quiz.title,
      type: 'quiz' as const,
      maxScore,
      weight: quiz.weight!,
      ...(quiz.corteId ? { corteId: quiz.corteId } : {}),
      grade: best
        ? {
            score: roundTo1Decimal((best.percentage / 100) * maxScore),
            maxScore,
            // Un 0 sin explicación se lee como error del sistema. Si el cero
            // viene de no haberlo presentado, que lo diga.
            ...(isNoAttemptId(best.id) ? { feedback: 'No presentaste este parcial.' } : {}),
            gradedAt: best.completedAt ?? new Date().toISOString(),
          }
        : null,
    };
  });

  // Add manual grade items as visible items
  const manualDetails: StudentGradeSummary['activities'] = courseManualItems.map((item) => {
    // Solo las publicadas, igual que las notas de actividad. Las guardadas
    // antes de que existiera la columna se leen como publicadas.
    const mg = allManualGrades.find(
      (g) => g.itemId === item.id && g.studentId === studentId && g.isPublished !== false
    );
    return {
      id: item.id,
      title: item.title,
      type: 'manual' as const,
      maxScore: item.maxScore,
      weight: item.weight,
      ...(item.corteId ? { corteId: item.corteId } : {}),
      grade: mg
        ? {
            score: mg.score,
            maxScore: mg.maxScore,
            feedback: mg.feedback,
            gradedAt: mg.gradedAt,
          }
        : null,
    };
  });

  // Merge all graded items
  const allDetails = [...activityDetails, ...quizDetails, ...manualDetails];

  // Todo lo que ve el estudiante se calcula solo con lo publicado.
  // `studentGrades` ya viene filtrado; las manuales se filtran aquí.
  const publishedManualGrades = allManualGrades.filter((g) => g.isPublished !== false);

  const corteScores = calculateCorteScores(
    studentId, courseCortes, activities, studentGrades,
    courseQuizzes, allAttempts, courseManualItems, publishedManualGrades,
  );

  // La definitiva recibía allGrades sin filtrar, así que se movía con notas
  // que el docente aún no había publicado: el estudiante no veía la nota de
  // la actividad, pero sí su efecto en la definitiva.
  const finalResult = calculateFinalGrade(
    studentId, courseId, allActivities, studentGrades,
    allQuizzes, allAttempts, allManualItems, publishedManualGrades
  );

  const finalAdjustment = publishedManualGrades.find(
    (g) => g.itemId === adjustItemId(courseId) && g.studentId === studentId,
  );
  const resolved = resolveFinalScore(
    courseCortes, corteScores, finalResult,
    gradableItemsOf(activities, courseQuizzes, courseManualItems),
    finalAdjustment?.score ?? null,
  );
  const finalScore = resolved.finalScore;

  return {
    studentId,
    courseId,
    courseName: course.name,
    cortes: courseCortes.map((c) => ({ id: c.id, name: c.name, weight: c.weight, order: c.order })),
    corteScores,
    activities: allDetails,
    finalScore,
    isPartial: resolved.isPartial,
    isApproved: resolved.isApproved,
  };
}

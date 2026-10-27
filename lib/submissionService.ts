/**
 * lib/submissionService.ts
 * Servicio de entregas de estudiantes — Fase 13
 *
 * Máquina de estado: submitted → reviewed → returned → resubmitted → reviewed
 * Versionamiento: cada re-entrega incrementa version
 * Reglas: RN-ENT-01 a RN-ENT-06
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getActivityById,
  isStudentEnrolled,
  getSubmission,
  readSubmissionsFresh,
  writeSubmissions,
  appendSubmissions,
  patchSubmission,
  deleteSubmissions,
  readGradesFresh,
} from '@/lib/dataService';
import { nowColombiaISO, parseDateTimeColombia } from '@/lib/dateUtils';
import { withFileLock } from '@/lib/dataService';
import { supabaseColumnExists } from '@/lib/supabase';
import type {
  Submission,
  SubmissionAttachment,
  SubmissionLink,
  Activity,
} from '@/lib/types';

// ────────────────────────────────────────────────────────────
// ERRORES
// ────────────────────────────────────────────────────────────

export class SubmissionError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SubmissionError';
    this.statusCode = statusCode;
  }
}

// ────────────────────────────────────────────────────────────
// VALIDACIONES AUXILIARES
// ────────────────────────────────────────────────────────────

/**
 * Verifica que la actividad permite entregas
 */
function validateActivityForSubmission(activity: Activity): void {
  if (activity.status !== 'published') {
    throw new SubmissionError(
      `La actividad no está publicada. Estado actual: "${activity.status}"`,
      400
    );
  }
}

/**
 * Verifica plazo de entrega
 * Returns isLate flag
 */
function checkDeadline(activity: Activity): boolean {
  const now = new Date();
  const dueDate = parseDateTimeColombia(activity.dueDate, activity.dueTime || '23:59');

  if (now > dueDate) {
    if (!activity.allowLateSubmission) {
      throw new SubmissionError(
        'El plazo de entrega ha vencido y no se permiten entregas tardías',
        400
      );
    }
    return true; // isLate
  }

  return false;
}

/**
 * Verifica que la entrega cumple con los requisitos de la actividad
 * RN-ENT-03: Al menos archivo o enlace según configuración
 */
function validateRequirements(
  activity: Activity,
  attachments: SubmissionAttachment[],
  links: SubmissionLink[]
): void {
  if (activity.requiresFileUpload && attachments.length === 0) {
    throw new SubmissionError(
      'Esta actividad requiere adjuntar al menos un archivo',
      400
    );
  }

  if (activity.requiresLinkSubmission && links.length === 0) {
    throw new SubmissionError(
      'Esta actividad requiere enviar al menos un enlace',
      400
    );
  }

  // Si no requiere nada específico, debe tener al menos algo
  if (
    !activity.requiresFileUpload &&
    !activity.requiresLinkSubmission &&
    attachments.length === 0 &&
    links.length === 0 &&
    !links // fallback: content can be enough
  ) {
    // Actually: if it doesn't require anything specific, content alone is valid
  }
}

// ────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: ENVIAR ENTREGA
// ────────────────────────────────────────────────────────────

/**
 * submitWork — Enviar o re-enviar una entrega
 *
 * Flujo:
 * 1. Verificar que la actividad existe y está published
 * 2. Verificar que el estudiante está inscrito con enrollment active
 * 3. Verificar plazo (isLate o error)
 * 4. Verificar entrega previa:
 *    a. No existe → crear version:1, status: "submitted"
 *    b. Existe con status "returned" → incrementar version, status: "resubmitted"
 *    c. Existe con status "submitted"/"resubmitted" → actualizar, incrementar version
 *    d. Existe con status "reviewed" → bloqueada (debe ser devuelta primero)
 * 5. Validar requisitos (archivos/enlaces)
 * 6. Guardar
 */
/**
 * Sin las columnas de grupo no se puede registrar un grupo.
 *
 * La escritura tolera que falten —si no, con la migración pendiente nadie
 * podría entregar— pero tolerar significa guardar SIN el dato del grupo, y
 * eso es justo lo que no se puede hacer en silencio: el estudiante elige a su
 * compañero, le decimos «entregado», y el compañero sigue apareciendo como
 * que no entregó. Pasó. Aquí se para y se dice.
 */
async function exigirColumnasDeGrupo(): Promise<void> {
  if (await supabaseColumnExists('submissions', 'group_id')) return;
  throw new SubmissionError(
    'Las entregas en grupo todavía no están habilitadas en esta plataforma. '
    + 'Avísale a tu docente: tiene que aplicar un cambio pendiente. '
    + 'Mientras tanto, cada uno puede subir su propia entrega.',
    503,
  );
}

export async function submitWork(
  activityId: string,
  studentId: string,
  courseId: string,
  content: string | undefined,
  attachments: SubmissionAttachment[],
  links: SubmissionLink[],
  /**
   * Compañeros de grupo, sin incluir a quien entrega. Solo en actividades
   * marcadas como grupales; en las demás se ignora.
   */
  groupMemberIds: string[] = [],
): Promise<Submission> {
  // 1. Verificar actividad
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new SubmissionError('Actividad no encontrada', 404);
  }
  validateActivityForSubmission(activity);

  // Verificar que el courseId corresponde
  if (activity.courseId !== courseId) {
    throw new SubmissionError('La actividad no pertenece a este curso', 400);
  }

  // 2. Verificar inscripción activa
  if (!(await isStudentEnrolled(studentId, courseId))) {
    throw new SubmissionError('No estás inscrito activamente en este curso', 403);
  }

  // 3. Verificar plazo
  const isLate = checkDeadline(activity);

  // 4. Verificar entrega previa
  const existing = await getSubmission(activityId, studentId);
  const now = nowColombiaISO();

  if (existing) {
    // RN-ENT-05: Si tiene status "reviewed" → bloqueada
    if (existing.status === 'reviewed') {
      throw new SubmissionError(
        'Esta entrega ya fue calificada. El docente debe devolverla para permitir re-entrega.',
        400
      );
    }

    // 5. Validar requisitos antes de actualizar
    validateRequirements(activity, attachments, links);

    // Re-entrega: incrementar versión
    const updatedSubmission: Submission = {
      ...existing,
      content,
      attachments,
      links,
      submittedAt: now,
      isLate,
      status: existing.status === 'returned' ? 'resubmitted' : 'submitted',
      version: existing.version + 1,
      updatedAt: now,
    };

    /* Al reenviar también se rehace el GRUPO, no solo el archivo.
       Antes este camino ignoraba los compañeros elegidos: quien entregaba
       solo y luego reenviaba marcando a alguien, veía el selector, lo usaba,
       y su compañero seguía apareciendo como que no había entregado. */
    const todas = await readSubmissionsFresh();
    const esGrupalR = activity.category === 'group';
    const deseados = esGrupalR
      ? [...new Set([studentId, ...groupMemberIds])]
      : [studentId];

    if (esGrupalR && activity.groupMaxSize && deseados.length > activity.groupMaxSize) {
      throw new SubmissionError(
        `Esta actividad es para grupos de máximo ${activity.groupMaxSize} personas, `
        + `y están ${deseados.length} contándote a ti.`,
        400,
      );
    }
    if (esGrupalR && deseados.length > 1) await exigirColumnasDeGrupo();

    const actuales = existing.groupId
      ? todas.filter((x) => x.groupId === existing.groupId)
      : [existing];
    const yaEnGrupo = new Set(actuales.map((x) => x.studentId));

    /* Quien se añade no puede venir de otro grupo ni haber entregado aparte:
       crearle una segunda fila dejaría dos entregas suyas y el docente no
       sabría cuál es la buena. */
    const aAnadir = deseados.filter((id) => !yaEnGrupo.has(id));
    for (const id of aAnadir) {
      if (!(await isStudentEnrolled(id, courseId))) {
        throw new SubmissionError('Alguien de tu grupo no está inscrito en este curso', 400);
      }
      if (todas.some((x) => x.activityId === activityId && x.studentId === id)) {
        throw new SubmissionError(
          'Alguien a quien añadiste ya tiene su propia entrega en esta actividad. '
          + 'Habla con esa persona antes de incluirla.',
          409,
        );
      }
    }

    /* A quien se saca del grupo se le quita la fila, salvo que ya tenga nota:
       borrar una entrega calificada es destruir el trabajo del docente. */
    const aQuitar = actuales.filter((x) => !deseados.includes(x.studentId));
    if (aQuitar.length > 0) {
      const notas = await readGradesFresh();
      const conNota = aQuitar.filter((x) => notas.some((g) => g.submissionId === x.id));
      if (conNota.length > 0) {
        throw new SubmissionError(
          'No puedes sacar del grupo a alguien cuya entrega ya fue calificada.',
          409,
        );
      }
    }

    const groupId = deseados.length > 1
      ? (existing.groupId ?? `grp-${uuidv4()}`)
      : undefined;
    const nuevoEstado = existing.status === 'returned' ? 'resubmitted' : 'submitted';

    const comunes = {
      content, attachments, links, submittedAt: now, isLate,
      status: nuevoEstado as Submission['status'],
      ...(groupId ? { groupId, submittedBy: studentId } : {}),
    };

    await Promise.all([
      // los que siguen: misma versión+1
      ...actuales
        .filter((x) => deseados.includes(x.studentId))
        .map((fila) => patchSubmission(fila.id, { ...comunes, version: fila.version + 1 })),
      // los que entran: fila nueva, en la versión del grupo
      aAnadir.length > 0
        ? appendSubmissions(aAnadir.map((id) => ({
            id: uuidv4(), activityId, studentId: id, courseId,
            version: existing.version + 1,
            createdAt: now, updatedAt: now,
            ...comunes,
          } as Submission)))
        : Promise.resolve(),
      // los que salen
      aQuitar.length > 0 ? deleteSubmissions(aQuitar.map((x) => x.id)) : Promise.resolve(),
    ]);

    return updatedSubmission;
  }

  // 5. Validar requisitos para nueva entrega
  validateRequirements(activity, attachments, links);

  /* 6. Quiénes quedan cubiertos por esta entrega.
     En una actividad individual, solo quien entrega: los compañeros que
     pudieran venir en la petición se ignoran, no se confía en el cliente para
     decidir si algo es grupal. */
  const esGrupal = activity.category === 'group';
  const miembros = esGrupal
    ? [...new Set([studentId, ...groupMemberIds])]
    : [studentId];

  if (esGrupal && activity.groupMaxSize && miembros.length > activity.groupMaxSize) {
    /* El cupo cuenta el grupo ENTERO, quien sube incluido: «máximo 3» son
       tres personas, no tres compañeros más quien entrega. */
    throw new SubmissionError(
      `Esta actividad es para grupos de máximo ${activity.groupMaxSize} personas, `
      + `y están ${miembros.length} contándote a ti.`,
      400,
    );
  }

  if (esGrupal && miembros.length > 1) await exigirColumnasDeGrupo();

  if (esGrupal && miembros.length > 1) {
    /* Todos tienen que estar inscritos y ninguno puede haber entregado ya:
       si no, el segundo grupo que incluya a alguien repetido le pisaría su
       entrega anterior sin que nadie se entere. */
    const todas = await readSubmissionsFresh();
    const yaEntregaron = todas.filter(
      (x) => x.activityId === activityId && miembros.includes(x.studentId));
    if (yaEntregaron.length > 0) {
      throw new SubmissionError(
        'Alguien de tu grupo ya entregó esta actividad. Revisa con tu grupo quién la subió.',
        409,
      );
    }
    for (const id of miembros) {
      if (!(await isStudentEnrolled(id, courseId))) {
        throw new SubmissionError('Alguien de tu grupo no está inscrito en este curso', 400);
      }
    }
  }

  const groupId = esGrupal && miembros.length > 1 ? `grp-${uuidv4()}` : undefined;

  /* Una fila por miembro, con los MISMOS archivos. El archivo en el Blob es
     uno solo: lo que se repite es la ficha, que es lo que hace que calificar,
     contar y «mis entregas» sigan funcionando sin saber de grupos. */
  const filas: Submission[] = miembros.map((id) => ({
    id: uuidv4(),
    activityId,
    studentId: id,
    courseId,
    content,
    attachments,
    links,
    submittedAt: now,
    isLate,
    status: 'submitted',
    version: 1,
    ...(groupId ? { groupId, submittedBy: studentId } : {}),
    createdAt: now,
    updatedAt: now,
  }));

  await appendSubmissions(filas);

  return filas.find((f) => f.studentId === studentId)!;
}

// ────────────────────────────────────────────────────────────
// DEVOLVER ENTREGA (ADMIN)
// ────────────────────────────────────────────────────────────

/**
 * returnSubmission — Devolver entrega para permitir re-envío
 *
 * Solo admin puede devolver.
 * Cambia status a "returned" → habilita re-entrega del estudiante.
 */
export async function returnSubmission(submissionId: string): Promise<Submission> {
  return withFileLock('submissions.json', async () => {
    const submissions = await readSubmissionsFresh();
    const index = submissions.findIndex((s) => s.id === submissionId);

    if (index === -1) {
      throw new SubmissionError('Entrega no encontrada', 404);
    }

    const submission = submissions[index];

    // Solo se puede devolver si está en status "submitted", "reviewed" o "resubmitted"
    if (submission.status === 'returned') {
      throw new SubmissionError('Esta entrega ya fue devuelta', 400);
    }

    const updatedSubmission: Submission = {
      ...submission,
      status: 'returned',
      updatedAt: nowColombiaISO(),
    };

    submissions[index] = updatedSubmission;
    await writeSubmissions(submissions);

    return updatedSubmission;
  });
}

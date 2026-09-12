/**
 * GET    /api/courses/[id]/quizzes/[quizId]/attempts — Intentos de un parcial (admin)
 * POST   /api/courses/[id]/quizzes/[quizId]/attempts — Marcar "no presentó" (0) (admin)
 * DELETE /api/courses/[id]/quizzes/[quizId]/attempts — Deshacer ese 0 (admin)
 *
 * Módulo de Parciales / Quizzes
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  getCourseById,
  getQuizById,
  readQuizAttemptsFresh,
  appendQuizAttempts,
  deleteQuizAttempts,
  readUsersFresh,
  getEnrollmentsByCourse,
  nowColombiaISO,
} from '@/lib/dataService';
import { noAttemptId, isNoAttemptId } from '@/lib/gradeService';
import { dispatchWrite, extractRequestMeta, auditSnapshot } from '@/lib/auditService';
import type { SafeUser, QuizAttempt } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string; quizId: string }> };

/** Inscritos activos del curso, ordenados por apellido. */
async function activeRoster(courseId: string) {
  const [enrollments, users] = await Promise.all([
    getEnrollmentsByCourse(courseId),
    readUsersFresh(),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));
  return enrollments
    .filter((e) => e.status === 'active')
    .map((e) => byId.get(e.studentId))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      documentNumber: u.documentNumber,
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'es'));
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { id, quizId } = await params;

    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz || quiz.courseId !== id) {
      return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
    }

    const [allAttempts, allUsers, roster] = await Promise.all([
      readQuizAttemptsFresh(),
      readUsersFresh(),
      activeRoster(id),
    ]);

    const quizAttempts = allAttempts.filter((a) => a.quizId === quizId);

    // Enriquecer con datos del estudiante
    const enriched = quizAttempts.map((attempt) => {
      const student = allUsers.find((u) => u.id === attempt.studentId);
      const safeStudent: Partial<SafeUser> | null = student
        ? {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            documentNumber: student.documentNumber,
          }
        : null;

      return { ...attempt, student: safeStudent, noAttempt: isNoAttemptId(attempt.id) };
    });

    // Ordenar por fecha completado (más reciente primero)
    enriched.sort((a, b) => {
      const dateA = a.completedAt || a.startedAt;
      const dateB = b.completedAt || b.startedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    /*
     * Quién NO presentó. Antes esta pantalla solo listaba intentos, así que
     * los ausentes eran invisibles: no había forma de verlos ni de ponerles
     * el cero, y su peso desaparecía de la definitiva.
     */
    const withAttempt = new Set(quizAttempts.map((a) => a.studentId));
    const missing = roster.filter((s) => !withAttempt.has(s.id));

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        weight: quiz.weight ?? null,
        maxScore: quiz.questions.reduce((s, q) => s + q.points, 0),
        questions: quiz.questions,
      },
      attempts: enriched,
      total: enriched.length,
      missing,
      enrolledCount: roster.length,
    });
  }, 'admin');
}

/**
 * POST — Registrar 0 por no presentar.
 * Body: { studentIds: string[] }
 *
 * Escribe un intento sintético con 0 puntos para que el peso del parcial
 * entre en la definitiva. Es idempotente: el id se deriva de (parcial,
 * estudiante), y a quien ya tiene un intento real no se le toca nada.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      const body = await request.json().catch(() => ({}));
      const studentIds: unknown = body?.studentIds;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ error: 'Campo "studentIds" (array) requerido' }, { status: 400 });
      }

      const course = await getCourseById(id);
      if (!course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      const quiz = await getQuizById(quizId);
      if (!quiz || quiz.courseId !== id) {
        return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
      }
      if (quiz.type !== 'graded') {
        return NextResponse.json(
          { error: 'Solo los parciales calificables cuentan en la nota: un entrenamiento no necesita cero' },
          { status: 400 },
        );
      }

      const roster = await activeRoster(id);
      const rosterIds = new Set(roster.map((s) => s.id));
      const invalid = studentIds.filter((s) => typeof s !== 'string' || !rosterIds.has(s));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: 'Hay estudiantes que no tienen inscripción activa en este curso' },
          { status: 400 },
        );
      }

      const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);
      const now = nowColombiaISO();

      /* Se lee para saber a quién NO hay que ponerle 0, pero se escribe solo
         lo nuevo. Reescribir la tabla aquí es peligroso justo cuando más se
         usa: el docente pulsa "poner 0 a los que faltan" a la hora del cierre,
         que es exactamente cuando los rezagados están enviando. */
      {
        const attempts = await readQuizAttemptsFresh();
        const created: QuizAttempt[] = [];
        const skipped: string[] = [];

        for (const studentId of studentIds as string[]) {
          const existing = attempts.find((a) => a.quizId === quizId && a.studentId === studentId);
          if (existing) { skipped.push(studentId); continue; }

          created.push({
            id: noAttemptId(quizId, studentId),
            quizId,
            studentId,
            courseId: id,
            answers: [],
            score: 0,
            maxScore,
            percentage: 0,
            attemptNumber: 1,
            startedAt: now,
            completedAt: now,
            blurCount: 0,
            autoSubmitted: false,
            flagged: false,
          });
        }

        if (created.length === 0) {
          return NextResponse.json({
            created: 0,
            skipped: skipped.length,
            message: 'Esos estudiantes ya tienen un intento registrado',
          });
        }

        const names = created
          .map((a) => roster.find((s) => s.id === a.studentId))
          .map((s) => (s ? `${s.lastName}, ${s.firstName}` : '?'));

        await dispatchWrite(
          () => appendQuizAttempts(created),
          {
            action: 'create',
            entity: 'quiz',
            entityId: quizId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Registró 0 por no presentar el parcial "${quiz.title}" a ${created.length} estudiante(s): ${names.join('; ')}`,
            after: auditSnapshot({ quizId, studentIds: created.map((a) => a.studentId) }),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({
          created: created.length,
          skipped: skipped.length,
          message: created.length === 1
            ? '0 registrado. El peso del parcial ya cuenta en su definitiva.'
            : `${created.length} ceros registrados. El peso del parcial ya cuenta en sus definitivas.`,
        }, { status: 201 });
      }
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * DELETE — Deshacer el 0 por no presentar.
 * Body: { studentIds: string[] }
 *
 * Solo borra intentos sintéticos. Un intento real no se puede borrar desde
 * aquí: si alguien presentó, su nota no se deshace por accidente.
 */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const { id, quizId } = await params;

      const body = await request.json().catch(() => ({}));
      const studentIds: unknown = body?.studentIds;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ error: 'Campo "studentIds" (array) requerido' }, { status: 400 });
      }

      const quiz = await getQuizById(quizId);
      if (!quiz || quiz.courseId !== id) {
        return NextResponse.json({ error: 'Parcial no encontrado' }, { status: 404 });
      }

      const targets = new Set(studentIds as string[]);

      {
        const attempts = await readQuizAttemptsFresh();
        const removed = attempts.filter(
          (a) => a.quizId === quizId && targets.has(a.studentId) && isNoAttemptId(a.id),
        );

        if (removed.length === 0) {
          return NextResponse.json({ error: 'No hay ceros por no presentar que deshacer' }, { status: 404 });
        }

        const removedIds = removed.map((a) => a.id);

        await dispatchWrite(
          () => deleteQuizAttempts(removedIds),
          {
            action: 'delete',
            entity: 'quiz',
            entityId: quizId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            details: `Deshizo el 0 por no presentar del parcial "${quiz.title}" a ${removed.length} estudiante(s)`,
            before: auditSnapshot({ quizId, studentIds: removed.map((a) => a.studentId) }),
            ...extractRequestMeta(request),
          },
        );

        return NextResponse.json({
          removed: removed.length,
          message: removed.length === 1
            ? 'Cero deshecho. El estudiante vuelve a poder presentar.'
            : `${removed.length} ceros deshechos.`,
        });
      }
    } catch {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}

/**
 * GET /api/student/entregas — lo que este estudiante ha entregado este semestre
 *
 * Existe porque un estudiante no tenía dónde recuperar su propio trabajo. Los
 * archivos estaban, pero repartidos: había que acordarse de en qué actividad
 * de qué curso se subió cada cosa y entrar uno por uno. Para rehacer una
 * segunda versión sobre la primera, eso es media tarde.
 *
 * Solo del semestre en curso. Lo de semestres cerrados no se borra, pero
 * mezclarlo aquí convierte una lista útil en un archivo histórico.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import {
  readSubmissionsFresh, readActivitiesFresh, readCoursesFresh,
  readSemestersFresh, readEnrollmentsFresh, readGradesFresh,
} from '@/lib/dataService';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    try {
      const [submissions, activities, courses, semesters, enrollments, grades] = await Promise.all([
        readSubmissionsFresh(), readActivitiesFresh(), readCoursesFresh(),
        readSemestersFresh(), readEnrollmentsFresh(), readGradesFresh(),
      ]);

      const semestre = semesters.find((s) => s.isActive) ?? null;
      if (!semestre) return NextResponse.json({ semestre: null, cursos: [] });

      /* Sus cursos del semestre en curso. Una inscripción retirada no debería
         borrarle el acceso a lo que ya entregó, pero tampoco tiene sentido
         listar cursos que ya no son suyos: manda la inscripción activa. */
      const misCursos = courses.filter((c) =>
        c.semesterId === semestre.id
        && enrollments.some((e) => e.courseId === c.id && e.studentId === user.id && e.status === 'active'));

      const actPorId = new Map(activities.map((a) => [a.id, a]));
      const mias = submissions.filter((s) => s.studentId === user.id);

      const cursos = misCursos.map((curso) => {
        const entregas = mias
          .filter((s) => s.courseId === curso.id)
          .map((s) => {
            const act = actPorId.get(s.activityId);
            /* La nota solo si está publicada: el resto de la aplicación
               respeta esa decisión y esta pantalla no puede ser la rendija. */
            const nota = grades.find((g) => g.submissionId === s.id && g.isPublished);
            return {
              id: s.id,
              activityId: s.activityId,
              title: act?.title ?? 'Actividad eliminada',
              submittedAt: s.submittedAt,
              isLate: s.isLate,
              version: s.version,
              status: s.status,
              attachments: s.attachments.map((a) => ({
                id: a.id, fileName: a.fileName, filePath: a.filePath,
                fileSize: a.fileSize, mimeType: a.mimeType,
              })),
              links: s.links,
              /* Lo que el docente le devolvió corregido, si lo hubo. */
              feedbackAttachments: (s.feedbackAttachments ?? []).map((a) => ({
                id: a.id, fileName: a.fileName, filePath: a.filePath, fileSize: a.fileSize,
              })),
              score: nota ? nota.score : null,
              maxScore: nota ? nota.maxScore : null,
              feedback: nota?.feedback ?? null,
            };
          })
          .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

        return { courseId: curso.id, courseName: curso.name, courseCode: curso.code, entregas };
      }).filter((c) => c.entregas.length > 0);

      return NextResponse.json({
        semestre: { id: semestre.id, label: semestre.label },
        cursos,
        total: cursos.reduce((n, c) => n + c.entregas.length, 0),
        archivos: cursos.reduce((n, c) => n + c.entregas.reduce((m, e) => m + e.attachments.length, 0), 0),
      });
    } catch (error) {
      console.error('[mis entregas]', error);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
  });
}

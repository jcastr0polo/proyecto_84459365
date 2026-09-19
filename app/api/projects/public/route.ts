/**
 * GET /api/projects/public — Proyectos públicos para la vitrina (sin auth)
 *
 * Antes devolvía TODOS los proyectos públicos y los rotulaba con la etiqueta
 * del semestre ACTIVO. Como el semestre nuevo empieza sin proyectos, la vitrina
 * enseñaba los del semestre anterior diciendo que eran de este: no es que
 * sobrara un filtro, es que el rótulo mentía.
 *
 * Ahora cada proyecto viaja con su semestre —el de su curso— y la vitrina
 * agrupa por ahí. La vitrina sigue siendo acumulativa a propósito: el trabajo
 * de un semestre pasado no deja de ser bueno, y esconderlo dejaría la página
 * pública vacía cada vez que empieza un semestre. Lo que no puede es estar mal
 * etiquetado.
 */

import { NextResponse } from 'next/server';
import { readProjectsFresh, readUsersFresh, readCoursesFresh, readSemestersFresh } from '@/lib/dataService';

export async function GET(): Promise<NextResponse> {
  const [projects, users, courses, semesters] = await Promise.all([
    readProjectsFresh(), readUsersFresh(), readCoursesFresh(), readSemestersFresh(),
  ]);

  const featured = projects.filter((p) => p.isPublic && !p.isBlockedFromShowcase);

  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const semesterMap = new Map(semesters.map((s) => [s.id, s]));

  const enriched = featured.map((p) => {
    const course = courseMap.get(p.courseId);
    const semester = course ? semesterMap.get(course.semesterId) : undefined;
    return {
      id: p.id,
      projectName: p.projectName,
      description: p.showcaseDescription || p.description,
      githubUrl: p.githubUrl,
      vercelUrl: p.vercelUrl,
      figmaUrl: p.figmaUrl,
      showcaseImageUrl: p.showcaseImageUrl,
      studentName: userMap.get(p.studentId) ?? 'Estudiante',
      courseName: course?.name ?? 'Curso',
      courseId: p.courseId,
      semesterId: course?.semesterId ?? '',
      semesterLabel: semester?.label ?? 'Sin semestre',
    };
  });

  /* Solo los semestres que de verdad tienen algo que enseñar, del más nuevo al
     más viejo. El id de semestre es "AAAAN" (202602), así que ordena solo. */
  const semestresConProyectos = Array.from(
    new Map(enriched.map((p) => [p.semesterId, p.semesterLabel])).entries(),
  )
    .map(([id, label]) => ({ id, label, count: enriched.filter((p) => p.semesterId === id).length }))
    .sort((a, b) => b.id.localeCompare(a.id));

  const activo = semesters.find((s) => s.isActive);

  return NextResponse.json({
    projects: enriched,
    courses: Array.from(new Set(featured.map((p) => p.courseId)))
      .map((id) => ({ id, name: courseMap.get(id)?.name ?? 'Curso' })),
    semesters: semestresConProyectos,
    /** El semestre en curso, tenga proyectos o no: sirve para decirlo cuando no los tiene. */
    activeSemester: activo ? { id: activo.id, label: activo.label } : null,
  });
}

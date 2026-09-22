/**
 * GET /api/projects/public — Proyectos del semestre en curso para la vitrina
 *
 * La vitrina enseña el semestre que se está cursando y nada más. Antes
 * devolvía TODOS los proyectos públicos y los rotulaba con la etiqueta del
 * semestre activo, así que en agosto la página seguía enseñando el trabajo de
 * febrero diciendo que era de ahora.
 *
 * Los proyectos de semestres cerrados no se borran ni dejan de ser públicos en
 * la base: simplemente no salen aquí. El docente los sigue viendo en
 * Cursos › Proyectos, y si algún día se quiere una hemeroteca, el dato está.
 *
 * Consecuencia asumida: al empezar un semestre la vitrina está vacía hasta que
 * alguien publique. Es preferible a que un visitante crea que el trabajo del
 * semestre pasado es el de este.
 */

import { NextResponse } from 'next/server';
import { readProjectsFresh, readUsersFresh, readCoursesFresh, readSemestersFresh } from '@/lib/dataService';

export async function GET(): Promise<NextResponse> {
  const [projects, users, courses, semesters] = await Promise.all([
    readProjectsFresh(), readUsersFresh(), readCoursesFresh(), readSemestersFresh(),
  ]);

  const activo = semesters.find((s) => s.isActive) ?? null;

  /* Sin semestre activo no se enseña nada: es preferible una vitrina vacía a
     una que no sabe de cuándo es lo que muestra. */
  const cursosDelSemestre = new Set(
    activo ? courses.filter((c) => c.semesterId === activo.id).map((c) => c.id) : [],
  );

  const featured = projects.filter(
    (p) => p.isPublic && !p.isBlockedFromShowcase && cursosDelSemestre.has(p.courseId),
  );

  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const enriched = featured.map((p) => ({
    id: p.id,
    projectName: p.projectName,
    description: p.showcaseDescription || p.description,
    githubUrl: p.githubUrl,
    vercelUrl: p.vercelUrl,
    figmaUrl: p.figmaUrl,
    showcaseImageUrl: p.showcaseImageUrl,
    studentName: userMap.get(p.studentId) ?? 'Estudiante',
    courseName: courseMap.get(p.courseId)?.name ?? 'Curso',
    courseId: p.courseId,
  }));

  return NextResponse.json({
    projects: enriched,
    courses: Array.from(new Set(featured.map((p) => p.courseId)))
      .map((id) => ({ id, name: courseMap.get(id)?.name ?? 'Curso' })),
    semesterLabel: activo?.label ?? null,
  });
}

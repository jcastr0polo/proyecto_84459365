import { readProjects, readUsers, readCourses, readSemesters } from '@/lib/dataService';
import ShowcaseClient from './ShowcaseClient';
import type { ShowcaseProject } from './ShowcaseClient';

/**
 * /showcase — Vitrina Pública de Proyectos Estudiantiles
 * Fase 19 — Ruta PÚBLICA, sin autenticación
 * Server Component: lee datos directamente de dataService
 * RN-PRY-03: Solo muestra proyectos con isPublic && isFeatured
 */
export default function ShowcasePage() {
  const projects = readProjects();
  const users = readUsers();
  const courses = readCourses();
  const semesters = readSemesters();

  // Only show public + featured projects
  const featured = projects.filter((p) => p.isPublic && p.isFeatured);

  // Build lookup maps
  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  const courseMap = new Map(courses.map((c) => [c.id, c.name]));

  // Enrich projects
  const enriched: ShowcaseProject[] = featured.map((p) => ({
    id: p.id,
    projectName: p.projectName,
    description: p.description,
    githubUrl: p.githubUrl,
    vercelUrl: p.vercelUrl,
    figmaUrl: p.figmaUrl,
    studentName: userMap.get(p.studentId) ?? 'Estudiante',
    courseName: courseMap.get(p.courseId) ?? 'Curso',
    courseId: p.courseId,
  }));

  // Courses that have featured projects (for filter buttons)
  const coursesWithProjects = Array.from(new Set(featured.map((p) => p.courseId)))
    .map((id) => ({ id, name: courseMap.get(id) ?? 'Curso' }));

  // Active semester label
  const activeSemester = semesters.find((s) => s.isActive);
  const semesterLabel = activeSemester?.label ?? '2026';

  return (
    <ShowcaseClient
      projects={enriched}
      semesterLabel={semesterLabel}
      courses={coursesWithProjects}
    />
  );
}

export const metadata = {
  title: 'Vitrina de Proyectos Estudiantiles',
  description: 'Proyectos fullstack destacados construidos por estudiantes con Next.js, TypeScript y asistentes de IA.',
};

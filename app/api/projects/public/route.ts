/**
 * GET /api/projects/public — Proyectos públicos destacados (sin auth)
 * Para la vitrina pública /showcase
 */

import { NextResponse } from 'next/server';
import { readProjectsFresh, readUsersFresh, readCoursesFresh, readSemestersFresh } from '@/lib/dataService';

export async function GET(): Promise<NextResponse> {
  const projects = await readProjectsFresh();
  const users = await readUsersFresh();
  const courses = await readCoursesFresh();
  const semesters = await readSemestersFresh();

  const featured = projects.filter((p) => p.isPublic && p.isFeatured && !p.isBlockedFromShowcase);

  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  const courseMap = new Map(courses.map((c) => [c.id, c.name]));

  const enriched = featured.map((p) => ({
    id: p.id,
    projectName: p.projectName,
    description: p.showcaseDescription || p.description,
    githubUrl: p.githubUrl,
    vercelUrl: p.vercelUrl,
    figmaUrl: p.figmaUrl,
    showcaseImageUrl: p.showcaseImageUrl,
    studentName: userMap.get(p.studentId) ?? 'Estudiante',
    courseName: courseMap.get(p.courseId) ?? 'Curso',
    courseId: p.courseId,
  }));

  const coursesWithProjects = Array.from(new Set(featured.map((p) => p.courseId)))
    .map((id) => ({ id, name: courseMap.get(id) ?? 'Curso' }));

  const activeSemester = semesters.find((s) => s.isActive);

  return NextResponse.json({
    projects: enriched,
    courses: coursesWithProjects,
    semesterLabel: activeSemester?.label ?? '2026',
  });
}

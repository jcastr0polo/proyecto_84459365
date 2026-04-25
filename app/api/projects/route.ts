import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readProjectsFresh, writeProjects, getProjectByStudentAndCourse, readCoursesFresh, readUsersFresh, readEnrollmentsFresh, withFileLock } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { createProjectSchema } from '@/lib/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/projects — Listar proyectos
 * Query params: courseId, featured, public
 * Acceso: Admin ve todo, Estudiante ve los suyos
 */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const featured = searchParams.get('featured');
    const isPublicFilter = searchParams.get('public');

    let projects = await readProjectsFresh();

    // Students only see their own projects (unless it's the public showcase filter)
    if (user.role === 'student' && isPublicFilter !== 'true') {
      projects = projects.filter((p) => p.studentId === user.id);
    }

    if (courseId) {
      projects = projects.filter((p) => p.courseId === courseId);
    }

    if (featured === 'true') {
      projects = projects.filter((p) => p.isFeatured);
    }

    if (isPublicFilter === 'true') {
      projects = projects.filter((p) => p.isPublic);
    }

    // Enrich with student names, course names
    const users = await readUsersFresh();
    const courses = await readCoursesFresh();
    const userMap = new Map(users.map((u) => [u.id, { firstName: u.firstName, lastName: u.lastName }]));
    const courseMap = new Map(courses.map((c) => [c.id, c.name]));

    const enriched = projects.map((p) => ({
      ...p,
      studentName: userMap.has(p.studentId)
        ? `${userMap.get(p.studentId)!.firstName} ${userMap.get(p.studentId)!.lastName}`
        : 'Desconocido',
      courseName: courseMap.get(p.courseId) ?? 'Curso desconocido',
    }));

    return NextResponse.json({ projects: enriched });
  });
}

/**
 * POST /api/projects — Registrar proyecto (Estudiante)
 * RN-PRY-01: Estudiante registra con GitHub URL obligatorio
 * Body: { courseId, projectName, description?, githubUrl, vercelUrl?, figmaUrl?, isPublic? }
 */
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Solo estudiantes pueden registrar proyectos' }, { status: 403 });
    }

    const body = await request.json();
    const courseId = body.courseId;

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // Validate student is enrolled in the course
    const enrollments = await readEnrollmentsFresh();
    const enrolled = enrollments.find(
      (e) => e.studentId === user.id && e.courseId === courseId && e.status === 'active'
    );
    if (!enrolled) {
      return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
    }

    // Validate course exists
    const courses = await readCoursesFresh();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Validate body
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newProject = {
      id: uuidv4(),
      studentId: user.id,
      courseId,
      projectName: parsed.data.projectName,
      description: parsed.data.description || undefined,
      githubUrl: parsed.data.githubUrl,
      vercelUrl: parsed.data.vercelUrl || undefined,
      figmaUrl: parsed.data.figmaUrl || undefined,
      isPublic: parsed.data.isPublic ?? false,
      isFeatured: false,
      status: 'in-progress' as const,
      createdAt: now,
      updatedAt: now,
    };

    const projects = await withFileLock('projects.json', async () => {
      const pjs = await readProjectsFresh();
      // Check if student already has a project (inside lock to avoid duplicates)
      const existing = pjs.find((p) => p.studentId === user.id && p.courseId === courseId);
      if (existing) {
        throw new Error('ALREADY_EXISTS');
      }
      pjs.push(newProject);
      await dispatchWrite(
        () => writeProjects(pjs),
        { action: 'create', entity: 'project', entityId: newProject.id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Registró proyecto "${newProject.projectName}"` }
      );
      return pjs;
    }).catch((err) => {
      if (err.message === 'ALREADY_EXISTS') return null;
      throw err;
    });

    if (!projects) {
      return NextResponse.json({ error: 'Ya tienes un proyecto registrado en este curso. Usa PUT para actualizar.' }, { status: 409 });
    }

    return NextResponse.json({ project: newProject }, { status: 201 });
  });
}

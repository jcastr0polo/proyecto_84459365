import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readProjects, writeProjects, getProjectById, readUsers, readCourses } from '@/lib/dataService';
import { updateProjectSchema } from '@/lib/schemas';

/**
 * GET /api/projects/[id] — Detalle de un proyecto
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  // Enrich with student name and course name
  const users = readUsers();
  const courses = readCourses();
  const student = users.find((u) => u.id === project.studentId);
  const course = courses.find((c) => c.id === project.courseId);

  return NextResponse.json({
    project: {
      ...project,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
      courseName: course?.name ?? 'Curso desconocido',
    },
  });
}

/**
 * PUT /api/projects/[id] — Actualizar proyecto
 * Estudiante puede editar su propio proyecto (excepto isFeatured y status)
 * Admin puede editar todo (RN-PRY-04: solo admin marca isFeatured)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params;
    const projects = readProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const project = projects[index];

    // Students can only edit their own project
    if (user.role === 'student' && project.studentId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para editar este proyecto' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Students cannot change isFeatured or status (RN-PRY-04)
    if (user.role === 'student') {
      delete updates.isFeatured;
      delete updates.status;
    }

    // Apply updates
    const updated = {
      ...project,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      ),
      // Clean empty strings for optional URL fields
      vercelUrl: updates.vercelUrl === '' ? undefined : (updates.vercelUrl ?? project.vercelUrl),
      figmaUrl: updates.figmaUrl === '' ? undefined : (updates.figmaUrl ?? project.figmaUrl),
      updatedAt: new Date().toISOString(),
    };

    projects[index] = updated;
    await writeProjects(projects);

    return NextResponse.json({ project: updated });
  });
}

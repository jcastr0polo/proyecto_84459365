import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readProjectsFresh, writeProjects, getProjectById, readUsersFresh, readCoursesFresh, withFileLock, nowColombiaISO } from '@/lib/dataService';
import { dispatchWrite } from '@/lib/auditService';
import { updateProjectSchema } from '@/lib/schemas';

/**
 * GET /api/projects/[id] — Detalle de un proyecto
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  // Enrich with student name and course name
  const users = await readUsersFresh();
  const courses = await readCoursesFresh();
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
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Students cannot change admin-only fields
    if (user.role === 'student') {
      delete updates.isFeatured;
      delete updates.status;
      delete updates.isBlockedFromShowcase;
      delete updates.showcaseDescription;
      delete updates.showcaseImageUrl;
    }

    // If admin blocks from showcase, force isPublic = false
    if (updates.isBlockedFromShowcase === true) {
      updates.isPublic = false;
    }

    return withFileLock('projects.json', async () => {
      const projects = await readProjectsFresh();
      const index = projects.findIndex((p) => p.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      const project = projects[index];

      // Students can only edit their own project
      if (user.role === 'student' && project.studentId !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para editar este proyecto' }, { status: 403 });
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
        showcaseDescription: updates.showcaseDescription === '' ? undefined : (updates.showcaseDescription ?? project.showcaseDescription),
        showcaseImageUrl: updates.showcaseImageUrl === '' ? undefined : (updates.showcaseImageUrl ?? project.showcaseImageUrl),
        updatedAt: nowColombiaISO(),
      };

      projects[index] = updated;
      await dispatchWrite(
        () => writeProjects(projects),
        { action: 'update', entity: 'project', entityId: id, userId: user.id, userName: `${user.firstName} ${user.lastName}`, details: `Actualizó proyecto "${updated.projectName}"` }
      );

      return NextResponse.json({ project: updated });
    });
  });
}

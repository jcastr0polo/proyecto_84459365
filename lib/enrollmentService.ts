/**
 * enrollmentService.ts — Lógica de negocio de inscripciones
 *
 * Fase 9 — Inscripción de Estudiantes Backend
 *
 * Reglas de negocio:
 * - RN-INS-01: Solo el admin puede inscribir estudiantes
 * - RN-INS-02: No inscripción duplicada activa en el mismo curso
 * - RN-INS-03: Si el email no existe, se crea un usuario student
 * - RN-INS-04: Password inicial = hash(documentNumber), mustChangePassword = true
 * - RN-INS-05: Retiro cambia status a "withdrawn", no borra el registro
 */

import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth';
import { toSafeUser } from '@/lib/withAuth';
import {
  getCourseById,
  readUsersFresh,
  writeUsers,
  getUserByEmail,
  readEnrollmentsFresh,
  writeEnrollments,
  isStudentEnrolled,
} from '@/lib/dataService';
import { withFileLock } from '@/lib/blobSync';
import type {
  User,
  SafeUser,
  Enrollment,
  EnrollStudentRequest,
  BulkEnrollResult,
} from '@/lib/types';

interface EnrollResult {
  enrollment: Enrollment;
  student: SafeUser;
  /** true si se creó un usuario nuevo, false si ya existía */
  created: boolean;
}

/**
 * Inscribir un estudiante en un curso.
 *
 * Flujo:
 * 1. Valida que el curso existe y está activo
 * 2. Busca usuario por email: si no existe → crea student
 * 3. Verifica que no esté ya inscrito activo (RN-INS-02)
 * 4. Crea enrollment
 * 5. Retorna resultado
 */
export async function enrollStudent(
  courseId: string,
  data: EnrollStudentRequest,
  adminId: string
): Promise<EnrollResult> {
  // 1. Validar curso
  const course = await getCourseById(courseId);
  if (!course) {
    throw new EnrollmentError('Curso no encontrado', 404);
  }
  if (!course.isActive) {
    throw new EnrollmentError('El curso no está activo', 400);
  }

  // 2. Buscar o crear usuario
  let user = await getUserByEmail(data.email);
  let created = false;
  let enrollmentResult: Enrollment | undefined;

  if (!user) {
    // Crear nuevo usuario student
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(data.documentNumber);

    const newUser: User = {
      id: `student-${uuidv4()}`,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: 'student',
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      documentNumber: data.documentNumber,
      mustChangePassword: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await withFileLock('users.json', async () => {
      const users = await readUsersFresh();
      users.push(newUser);
      await writeUsers(users);
    });
    user = newUser;
    created = true;
  }

  // 3. Verificar no inscrito activo (RN-INS-02)
  // Verificar dentro del lock para evitar duplicados concurrentes
  await withFileLock('enrollments.json', async () => {
    const enrollments = await readEnrollmentsFresh();
    const alreadyEnrolled = enrollments.some(
      (e) => e.studentId === user!.id && e.courseId === courseId && e.status === 'active'
    );
    if (alreadyEnrolled) {
      throw new EnrollmentError(
        `El estudiante ${data.email} ya está inscrito en este curso`,
        409,
        'ALREADY_ENROLLED'
      );
    }

    // 4. Crear enrollment
    const enrollment: Enrollment = {
      id: `enroll-${uuidv4()}`,
      courseId,
      studentId: user!.id,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      enrolledBy: adminId,
    };

    enrollments.push(enrollment);
    await writeEnrollments(enrollments);

    enrollmentResult = enrollment;
  });

  // 5. Retornar resultado
  return {
    enrollment: enrollmentResult!,
    student: toSafeUser(user),
    created,
  };
}

/**
 * Inscripción masiva de estudiantes en un curso.
 * Procesa cada estudiante individualmente y recopila resultados.
 */
export async function bulkEnroll(
  courseId: string,
  students: EnrollStudentRequest[],
  adminId: string
): Promise<BulkEnrollResult> {
  const result: BulkEnrollResult = {
    success: [],
    alreadyEnrolled: [],
    errors: [],
  };

  for (const studentData of students) {
    try {
      const enrolled = await enrollStudent(courseId, studentData, adminId);
      result.success.push(enrolled);
    } catch (err) {
      if (err instanceof EnrollmentError && err.code === 'ALREADY_ENROLLED') {
        const user = await getUserByEmail(studentData.email);
        result.alreadyEnrolled.push({
          email: studentData.email,
          studentId: user?.id ?? 'unknown',
        });
      } else if (err instanceof EnrollmentError) {
        result.errors.push({
          email: studentData.email,
          error: err.message,
        });
      } else {
        result.errors.push({
          email: studentData.email,
          error: 'Error desconocido al inscribir estudiante',
        });
      }
    }
  }

  return result;
}

/**
 * Error personalizado para operaciones de inscripción
 */
export class EnrollmentError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'EnrollmentError';
  }
}

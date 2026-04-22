import fs from 'fs';
import path from 'path';
import { HomeDataSchema, AppConfigSchema } from './validators';
import type { HomeData, AppConfig, User, Session, Semester, Course, Enrollment, Activity, Submission, Grade, AIPrompt, StudentProject } from './types';
import { userSchema, sessionSchema, semesterSchema, courseSchema, enrollmentSchema, activitySchema, submissionSchema, gradeSchema, promptSchema, projectSchema } from './schemas';
import { z } from 'zod';
import { writeToBlob, readFromCache, isCacheReady, readFromBlobDirect } from './blobSync';

// ────────────────────────────────────────────────────────────
// Lectura/escritura de datos
// En Vercel runtime: lectura de caché en memoria (Blob), escritura a Blob
// En Vercel build: lectura del filesystem data/ (disponible durante build)
// En local: lectura/escritura directa al filesystem
// ────────────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Lee un archivo JSON.
 * En Vercel: lee del caché en memoria (Blob). Falla si caché no está listo.
 * En local: lee del filesystem.
 */
export function readJsonFile<T>(filename: string): T {
  if (IS_VERCEL) {
    if (!isCacheReady()) {
      throw new Error(`[dataService] Cache not ready for ${filename}. Call ensureDataReady() first. If this is build time, this file should not be read server-side.`);
    }
    const raw = readFromCache(filename);
    return JSON.parse(raw) as T;
  }
  // Local: filesystem directo
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Lee un archivo JSON FRESCO directamente de Blob (sin caché).
 * Usar SOLO en ciclos read-modify-write donde la data puede estar stale
 * por concurrencia entre instancias serverless.
 * En local: lee del filesystem (no hay concurrencia).
 */
export async function readJsonFileFresh<T>(filename: string): Promise<T> {
  if (IS_VERCEL) {
    const raw = await readFromBlobDirect(filename);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
    // Fallback a caché si Blob no responde
    return readJsonFile<T>(filename);
  }
  // Local: filesystem directo
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Lee y valida /data/home.json con tipado estricto
 * 
 * @returns HomeData validado con Zod
 * @throws ZodError si la estructura no es válida
 * 
 * Garantiza:
 * - ✅ El archivo existe
 * - ✅ JSON es válido
 * - ✅ Estructura matches HomeDataSchema
 * - ✅ Valores literales son correctos
 * 
 * Uso (recomendado):
 *   const home = readHomeData();
 *   console.log(home.hero.title);  // Tipado como string ✅
 */
export function readHomeData(): HomeData {
  const raw = readJsonFile<HomeData>('home.json');
  return HomeDataSchema.parse(raw);
}

/**
 * Lee y valida /data/config.json con tipado estricto
 * 
 * @returns AppConfig validado con Zod
 * @throws ZodError si la estructura no es válida
 * 
 * Garantiza:
 * - ✅ El archivo existe
 * - ✅ JSON es válido
 * - ✅ Estructura matches AppConfigSchema
 * - ✅ Versión es semántica (MAJOR.MINOR.PATCH)
 * - ✅ Locale es formato ISO válido
 * - ✅ Theme es "light" o "dark"
 * 
 * Uso (recomendado):
 *   const config = readAppConfig();
 *   console.log(config.appName);  // Tipado como string ✅
 *   console.log(config.theme);    // Tipado como 'light' | 'dark' ✅
 */
export function readAppConfig(): AppConfig {
  const raw = readJsonFile<AppConfig>('config.json');
  return AppConfigSchema.parse(raw);
}

// ────────────────────────────────────────────────────────────
// Escritura genérica de JSON
// ────────────────────────────────────────────────────────────

/**
 * Escribe un objeto como JSON.
 * En Vercel: escribe a Blob (BD) + actualiza caché en memoria.
 * En local: escribe directo al filesystem.
 */
export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';

  if (IS_VERCEL) {
    // Blob primero (si falla, la operación falla)
    await writeToBlob(filename, content);
  } else {
    // Local: filesystem directo
    const filePath = path.join(SOURCE_DATA_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

// ────────────────────────────────────────────────────────────
// FASE 6 — Usuarios
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/users.json
 */
export function readUsers(): User[] {
  const raw = readJsonFile<unknown[]>('users.json');
  return z.array(userSchema).parse(raw) as User[];
}

/**
 * Lee users.json FRESCO directo de Blob (sin caché).
 * Usar antes de write para evitar sobrescribir datos de otra instancia.
 */
export async function readUsersFresh(): Promise<User[]> {
  const raw = await readJsonFileFresh<unknown[]>('users.json');
  return z.array(userSchema).parse(raw) as User[];
}

/**
 * Escribe el array completo de usuarios en /data/users.json
 */
export async function writeUsers(users: User[]): Promise<void> {
  await writeJsonFile('users.json', users);
}

/**
 * Busca un usuario por email (case-insensitive)
 */
export function getUserByEmail(email: string): User | null {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/**
 * Busca un usuario por ID
 */
export function getUserById(id: string): User | null {
  const users = readUsers();
  return users.find((u) => u.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 6 — Sesiones
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/sessions.json
 */
export function readSessions(): Session[] {
  const raw = readJsonFile<unknown[]>('sessions.json');
  return z.array(sessionSchema).parse(raw) as Session[];
}

/**
 * Escribe el array completo de sesiones en /data/sessions.json
 */
export async function writeSessions(sessions: Session[]): Promise<void> {
  await writeJsonFile('sessions.json', sessions);
}

// ────────────────────────────────────────────────────────────
// FASE 7 — Semestres
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/semesters.json
 */
export function readSemesters(): Semester[] {
  const raw = readJsonFile<unknown[]>('semesters.json');
  return z.array(semesterSchema).parse(raw) as Semester[];
}

/**
 * Escribe el array completo de semestres en /data/semesters.json
 */
export async function writeSemesters(semesters: Semester[]): Promise<void> {
  await writeJsonFile('semesters.json', semesters);
}

/**
 * Busca un semestre por ID
 */
export function getSemesterById(id: string): Semester | null {
  const semesters = readSemesters();
  return semesters.find((s) => s.id === id) ?? null;
}

/**
 * Retorna el semestre activo (solo debería haber uno, RN-SEM-01)
 */
export function getActiveSemester(): Semester | null {
  const semesters = readSemesters();
  return semesters.find((s) => s.isActive) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 7 — Cursos
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/courses.json
 */
export function readCourses(): Course[] {
  const raw = readJsonFile<unknown[]>('courses.json');
  return z.array(courseSchema).parse(raw) as Course[];
}

/**
 * Escribe el array completo de cursos en /data/courses.json
 */
export async function writeCourses(courses: Course[]): Promise<void> {
  await writeJsonFile('courses.json', courses);
}

/**
 * Busca un curso por ID
 */
export function getCourseById(id: string): Course | null {
  const courses = readCourses();
  return courses.find((c) => c.id === id) ?? null;
}

/**
 * Lista cursos de un semestre específico
 */
export function getCoursesBySemester(semesterId: string): Course[] {
  const courses = readCourses();
  return courses.filter((c) => c.semesterId === semesterId);
}

// ────────────────────────────────────────────────────────────
// FASE 9 — Inscripciones (Enrollments)
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/enrollments.json
 */
export function readEnrollments(): Enrollment[] {
  const raw = readJsonFile<unknown[]>('enrollments.json');
  return z.array(enrollmentSchema).parse(raw) as Enrollment[];
}

export async function readEnrollmentsFresh(): Promise<Enrollment[]> {
  const raw = await readJsonFileFresh<unknown[]>('enrollments.json');
  return z.array(enrollmentSchema).parse(raw) as Enrollment[];
}

/**
 * Escribe el array completo de enrollments en /data/enrollments.json
 */
export async function writeEnrollments(enrollments: Enrollment[]): Promise<void> {
  await writeJsonFile('enrollments.json', enrollments);
}

/**
 * Lista inscripciones de un curso específico
 */
export function getEnrollmentsByCourse(courseId: string): Enrollment[] {
  const enrollments = readEnrollments();
  return enrollments.filter((e) => e.courseId === courseId);
}

/**
 * Lista inscripciones de un estudiante específico
 */
export function getEnrollmentsByStudent(studentId: string): Enrollment[] {
  const enrollments = readEnrollments();
  return enrollments.filter((e) => e.studentId === studentId);
}

/**
 * Verifica si un estudiante ya está inscrito (activo) en un curso
 * RN-INS-02: No puede haber inscripción duplicada activa
 */
export function isStudentEnrolled(studentId: string, courseId: string): boolean {
  const enrollments = readEnrollments();
  return enrollments.some(
    (e) => e.studentId === studentId && e.courseId === courseId && e.status === 'active'
  );
}

// ────────────────────────────────────────────────────────────
// FASE 11 — Actividades
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/activities.json
 */
export function readActivities(): Activity[] {
  const raw = readJsonFile<unknown[]>('activities.json');
  return z.array(activitySchema).parse(raw) as Activity[];
}

/**
 * Escribe el array completo de actividades en /data/activities.json
 */
export async function writeActivities(activities: Activity[]): Promise<void> {
  await writeJsonFile('activities.json', activities);
}

/**
 * Lista actividades de un curso específico
 */
export function getActivitiesByCourse(courseId: string): Activity[] {
  const activities = readActivities();
  return activities.filter((a) => a.courseId === courseId);
}

/**
 * Busca una actividad por ID
 */
export function getActivityById(id: string): Activity | null {
  const activities = readActivities();
  return activities.find((a) => a.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 13 — Entregas de Estudiantes
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/submissions.json
 */
export function readSubmissions(): Submission[] {
  const raw = readJsonFile<unknown[]>('submissions.json');
  return z.array(submissionSchema).parse(raw) as Submission[];
}

export async function readSubmissionsFresh(): Promise<Submission[]> {
  const raw = await readJsonFileFresh<unknown[]>('submissions.json');
  return z.array(submissionSchema).parse(raw) as Submission[];
}

/**
 * Escribe el array completo de entregas en /data/submissions.json
 */
export async function writeSubmissions(submissions: Submission[]): Promise<void> {
  await writeJsonFile('submissions.json', submissions);
}

/**
 * Lista entregas de una actividad específica
 */
export function getSubmissionsByActivity(activityId: string): Submission[] {
  const submissions = readSubmissions();
  return submissions.filter((s) => s.activityId === activityId);
}

/**
 * Lista entregas de un estudiante específico
 */
export function getSubmissionsByStudent(studentId: string): Submission[] {
  const submissions = readSubmissions();
  return submissions.filter((s) => s.studentId === studentId);
}

/**
 * Busca una entrega específica por actividad y estudiante
 * RN-ENT-01: Una entrega por actividad por estudiante
 */
export function getSubmission(activityId: string, studentId: string): Submission | null {
  const submissions = readSubmissions();
  return submissions.find(
    (s) => s.activityId === activityId && s.studentId === studentId
  ) ?? null;
}

/**
 * Busca una entrega por ID
 */
export function getSubmissionById(id: string): Submission | null {
  const submissions = readSubmissions();
  return submissions.find((s) => s.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 15 — Calificaciones
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/grades.json
 */
export function readGrades(): Grade[] {
  const raw = readJsonFile<unknown[]>('grades.json');
  return z.array(gradeSchema).parse(raw) as Grade[];
}

export async function readGradesFresh(): Promise<Grade[]> {
  const raw = await readJsonFileFresh<unknown[]>('grades.json');
  return z.array(gradeSchema).parse(raw) as Grade[];
}

/**
 * Escribe el array completo de calificaciones en /data/grades.json
 */
export async function writeGrades(grades: Grade[]): Promise<void> {
  await writeJsonFile('grades.json', grades);
}

/**
 * Lista calificaciones de una actividad específica
 */
export function getGradesByActivity(activityId: string): Grade[] {
  const grades = readGrades();
  return grades.filter((g) => g.activityId === activityId);
}

/**
 * Lista calificaciones de un estudiante en un curso específico
 */
export function getGradesByStudent(studentId: string, courseId: string): Grade[] {
  const grades = readGrades();
  return grades.filter((g) => g.studentId === studentId && g.courseId === courseId);
}

/**
 * Busca la calificación de una entrega específica
 */
export function getGradeForSubmission(submissionId: string): Grade | null {
  const grades = readGrades();
  return grades.find((g) => g.submissionId === submissionId) ?? null;
}

/**
 * Busca una calificación por ID
 */
export function getGradeById(id: string): Grade | null {
  const grades = readGrades();
  return grades.find((g) => g.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 18 — Prompts de IA
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/prompts.json
 */
export function readPrompts(): AIPrompt[] {
  const raw = readJsonFile<unknown[]>('prompts.json');
  return z.array(promptSchema).parse(raw) as AIPrompt[];
}

/**
 * Escribe el array completo de prompts en /data/prompts.json
 */
export async function writePrompts(prompts: AIPrompt[]): Promise<void> {
  await writeJsonFile('prompts.json', prompts);
}

/**
 * Busca un prompt por ID
 */
export function getPromptById(id: string): AIPrompt | null {
  const prompts = readPrompts();
  return prompts.find((p) => p.id === id) ?? null;
}

/**
 * Lista prompts de un curso específico
 */
export function getPromptsByCourse(courseId: string): AIPrompt[] {
  const prompts = readPrompts();
  return prompts.filter((p) => p.courseId === courseId);
}

/**
 * Busca un prompt vinculado a una actividad específica
 */
export function getPromptByActivity(activityId: string): AIPrompt | null {
  const prompts = readPrompts();
  return prompts.find((p) => p.activityId === activityId) ?? null;
}

// ────────────────────────────────────────────────────────────
// FASE 19 — Proyectos Estudiantiles
// ────────────────────────────────────────────────────────────

/**
 * Lee y valida /data/projects.json
 */
export function readProjects(): StudentProject[] {
  const raw = readJsonFile<unknown[]>('projects.json');
  return z.array(projectSchema).parse(raw) as StudentProject[];
}

export async function readProjectsFresh(): Promise<StudentProject[]> {
  const raw = await readJsonFileFresh<unknown[]>('projects.json');
  return z.array(projectSchema).parse(raw) as StudentProject[];
}

/**
 * Escribe el array completo de proyectos en /data/projects.json
 */
export async function writeProjects(projects: StudentProject[]): Promise<void> {
  await writeJsonFile('projects.json', projects);
}

/**
 * Busca un proyecto por ID
 */
export function getProjectById(id: string): StudentProject | null {
  const projects = readProjects();
  return projects.find((p) => p.id === id) ?? null;
}

/**
 * Lista proyectos de un curso específico
 */
export function getProjectsByCourse(courseId: string): StudentProject[] {
  const projects = readProjects();
  return projects.filter((p) => p.courseId === courseId);
}

/**
 * Busca el proyecto de un estudiante en un curso específico
 * Un estudiante solo puede tener un proyecto por curso
 */
export function getProjectByStudentAndCourse(studentId: string, courseId: string): StudentProject | null {
  const projects = readProjects();
  return projects.find((p) => p.studentId === studentId && p.courseId === courseId) ?? null;
}

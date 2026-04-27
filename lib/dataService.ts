import fs from 'fs';
import path from 'path';
import { HomeDataSchema, AppConfigSchema } from './validators';
import type { HomeData, AppConfig, User, Session, Semester, Course, Enrollment, Activity, Submission, Grade, AIPrompt, StudentProject, Corte, Quiz, QuizAttempt, QuizSimulation, ManualGradeItem, ManualGrade } from './types';
import { userSchema, sessionSchema, semesterSchema, courseSchema, enrollmentSchema, activitySchema, submissionSchema, gradeSchema, promptSchema, projectSchema, corteSchema, quizSchema, quizAttemptSchema, quizSimulationSchema, manualGradeItemSchema, manualGradeSchema } from './schemas';
import { z } from 'zod';
import { writeToBlob, writeToBlobVerified, readFromBlobDirect, withFileLock } from './blobSync';

// ────────────────────────────────────────────────────────────
// Lectura/escritura de datos
// En Vercel runtime: lectura directa desde Blob (sin caché)
// En local: lectura/escritura directa al filesystem
// ────────────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

/**
 * @deprecated Usa readJsonFileFresh en su lugar.
 * Solo se mantiene para backward compat en admin/blob-download.
 */
export function readJsonFile<T>(filename: string): T {
  // Local: filesystem directo
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Lee un archivo JSON FRESCO directamente de Blob (sin caché).
 * En Vercel: lee directo de Blob (SIEMPRE fresco).
 * En local: lee del filesystem.
 */
// Files that can be auto-initialized as empty arrays when missing from Blob
const AUTO_INIT_FILES = new Set([
  'manual-grade-items.json',
  'manual-grades.json',
]);

export async function readJsonFileFresh<T>(filename: string): Promise<T> {
  if (IS_VERCEL) {
    const raw = await readFromBlobDirect(filename);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
    // New files that haven't been seeded yet → auto-init as []
    if (AUTO_INIT_FILES.has(filename)) {
      // Fire-and-forget: seed the file for next time (don't block or fail)
      writeToBlob(filename, '[]').catch(() => {});
      return [] as unknown as T;
    }
    // Sin fallback a caché — si Blob no responde, es un error real
    throw new Error(`[dataService] Cannot read ${filename} from Blob. Blob may be down or token invalid.`);
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
export async function readHomeData(): Promise<HomeData> {
  const raw = await readJsonFileFresh<HomeData>('home.json');
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
export async function readAppConfig(): Promise<AppConfig> {
  const raw = await readJsonFileFresh<AppConfig>('config.json');
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

/**
 * Escritura CRÍTICA con verificación read-back.
 * Usar para datos que no pueden perderse: quiz-attempts, submissions en examen.
 * En Vercel: escribe + lee de vuelta para verificar integridad.
 * En local: escribe al filesystem (sin verificación necesaria).
 */
export async function writeJsonFileCritical<T>(filename: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';

  if (IS_VERCEL) {
    await writeToBlobVerified(filename, content);
  } else {
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
 * Busca un usuario por email (case-insensitive) — lee fresco de Blob
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await readUsersFresh();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/**
 * Busca un usuario por ID — lee fresco de Blob
 */
export async function getUserById(id: string): Promise<User | null> {
  const users = await readUsersFresh();
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

export async function readSemestersFresh(): Promise<Semester[]> {
  const raw = await readJsonFileFresh<unknown[]>('semesters.json');
  return z.array(semesterSchema).parse(raw) as Semester[];
}

/**
 * Escribe el array completo de semestres en /data/semesters.json
 */
export async function writeSemesters(semesters: Semester[]): Promise<void> {
  await writeJsonFile('semesters.json', semesters);
}

/**
 * Busca un semestre por ID — lee fresco de Blob
 */
export async function getSemesterById(id: string): Promise<Semester | null> {
  const semesters = await readSemestersFresh();
  return semesters.find((s) => s.id === id) ?? null;
}

/**
 * Retorna el semestre activo (solo debería haber uno, RN-SEM-01) — lee fresco de Blob
 */
export async function getActiveSemester(): Promise<Semester | null> {
  const semesters = await readSemestersFresh();
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

export async function readCoursesFresh(): Promise<Course[]> {
  const raw = await readJsonFileFresh<unknown[]>('courses.json');
  return z.array(courseSchema).parse(raw) as Course[];
}

/**
 * Escribe el array completo de cursos en /data/courses.json
 */
export async function writeCourses(courses: Course[]): Promise<void> {
  await writeJsonFile('courses.json', courses);
}

/**
 * Busca un curso por ID — lee fresco de Blob
 */
export async function getCourseById(id: string): Promise<Course | null> {
  const courses = await readCoursesFresh();
  return courses.find((c) => c.id === id) ?? null;
}

/**
 * Lista cursos de un semestre específico — lee fresco de Blob
 */
export async function getCoursesBySemester(semesterId: string): Promise<Course[]> {
  const courses = await readCoursesFresh();
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
 * Lista inscripciones de un curso específico — lee fresco de Blob
 */
export async function getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
  const enrollments = await readEnrollmentsFresh();
  return enrollments.filter((e) => e.courseId === courseId);
}

/**
 * Lista inscripciones de un estudiante específico — lee fresco de Blob
 */
export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const enrollments = await readEnrollmentsFresh();
  return enrollments.filter((e) => e.studentId === studentId);
}

/**
 * Verifica si un estudiante ya está inscrito (activo) en un curso — lee fresco de Blob
 * RN-INS-02: No puede haber inscripción duplicada activa
 */
export async function isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
  const enrollments = await readEnrollmentsFresh();
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

export async function readActivitiesFresh(): Promise<Activity[]> {
  const raw = await readJsonFileFresh<unknown[]>('activities.json');
  return z.array(activitySchema).parse(raw) as Activity[];
}

/**
 * Escribe el array completo de actividades en /data/activities.json
 */
export async function writeActivities(activities: Activity[]): Promise<void> {
  await writeJsonFile('activities.json', activities);
}

/**
 * Lista actividades de un curso específico — lee fresco de Blob
 */
export async function getActivitiesByCourse(courseId: string): Promise<Activity[]> {
  const activities = await readActivitiesFresh();
  return activities.filter((a) => a.courseId === courseId);
}

/**
 * Busca una actividad por ID — lee fresco de Blob
 */
export async function getActivityById(id: string): Promise<Activity | null> {
  const activities = await readActivitiesFresh();
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
 * Lista entregas de una actividad específica — lee fresco de Blob
 */
export async function getSubmissionsByActivity(activityId: string): Promise<Submission[]> {
  const submissions = await readSubmissionsFresh();
  return submissions.filter((s) => s.activityId === activityId);
}

/**
 * Lista entregas de un estudiante específico — lee fresco de Blob
 */
export async function getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  const submissions = await readSubmissionsFresh();
  return submissions.filter((s) => s.studentId === studentId);
}

/**
 * Busca una entrega específica por actividad y estudiante — lee fresco de Blob
 * RN-ENT-01: Una entrega por actividad por estudiante
 */
export async function getSubmission(activityId: string, studentId: string): Promise<Submission | null> {
  const submissions = await readSubmissionsFresh();
  return submissions.find(
    (s) => s.activityId === activityId && s.studentId === studentId
  ) ?? null;
}

/**
 * Busca una entrega por ID — lee fresco de Blob
 */
export async function getSubmissionById(id: string): Promise<Submission | null> {
  const submissions = await readSubmissionsFresh();
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
 * Lista calificaciones de una actividad específica — lee fresco de Blob
 */
export async function getGradesByActivity(activityId: string): Promise<Grade[]> {
  const grades = await readGradesFresh();
  return grades.filter((g) => g.activityId === activityId);
}

/**
 * Lista calificaciones de un estudiante en un curso específico — lee fresco de Blob
 */
export async function getGradesByStudent(studentId: string, courseId: string): Promise<Grade[]> {
  const grades = await readGradesFresh();
  return grades.filter((g) => g.studentId === studentId && g.courseId === courseId);
}

/**
 * Busca la calificación de una entrega específica — lee fresco de Blob
 */
export async function getGradeForSubmission(submissionId: string): Promise<Grade | null> {
  const grades = await readGradesFresh();
  return grades.find((g) => g.submissionId === submissionId) ?? null;
}

/**
 * Busca una calificación por ID — lee fresco de Blob
 */
export async function getGradeById(id: string): Promise<Grade | null> {
  const grades = await readGradesFresh();
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

export async function readPromptsFresh(): Promise<AIPrompt[]> {
  const raw = await readJsonFileFresh<unknown[]>('prompts.json');
  return z.array(promptSchema).parse(raw) as AIPrompt[];
}

/**
 * Escribe el array completo de prompts en /data/prompts.json
 */
export async function writePrompts(prompts: AIPrompt[]): Promise<void> {
  await writeJsonFile('prompts.json', prompts);
}

/**
 * Busca un prompt por ID — lee fresco de Blob
 */
export async function getPromptById(id: string): Promise<AIPrompt | null> {
  const prompts = await readPromptsFresh();
  return prompts.find((p) => p.id === id) ?? null;
}

/**
 * Lista prompts de un curso específico — lee fresco de Blob
 */
export async function getPromptsByCourse(courseId: string): Promise<AIPrompt[]> {
  const prompts = await readPromptsFresh();
  return prompts.filter((p) => p.courseId === courseId);
}

/**
 * Busca un prompt vinculado a una actividad específica — lee fresco de Blob
 */
export async function getPromptByActivity(activityId: string): Promise<AIPrompt | null> {
  const prompts = await readPromptsFresh();
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
 * Busca un proyecto por ID — lee fresco de Blob
 */
export async function getProjectById(id: string): Promise<StudentProject | null> {
  const projects = await readProjectsFresh();
  return projects.find((p) => p.id === id) ?? null;
}

/**
 * Lista proyectos de un curso específico — lee fresco de Blob
 */
export async function getProjectsByCourse(courseId: string): Promise<StudentProject[]> {
  const projects = await readProjectsFresh();
  return projects.filter((p) => p.courseId === courseId);
}

/**
 * Busca el proyecto de un estudiante en un curso específico — lee fresco de Blob
 * Un estudiante solo puede tener un proyecto por curso
 */
export async function getProjectByStudentAndCourse(studentId: string, courseId: string): Promise<StudentProject | null> {
  const projects = await readProjectsFresh();
  return projects.find((p) => p.studentId === studentId && p.courseId === courseId) ?? null;
}

// ────────────────────────────────────────────────────────────
// Cortes Académicos (Períodos de Evaluación)
// ────────────────────────────────────────────────────────────

export function readCortes(): Corte[] {
  const raw = readJsonFile<unknown[]>('cortes.json');
  return z.array(corteSchema).parse(raw) as Corte[];
}

export async function readCortesFresh(): Promise<Corte[]> {
  const raw = await readJsonFileFresh<unknown[]>('cortes.json');
  return z.array(corteSchema).parse(raw) as Corte[];
}

export async function writeCortes(cortes: Corte[]): Promise<void> {
  await writeJsonFile('cortes.json', cortes);
}

export async function getCortesByCourse(courseId: string): Promise<Corte[]> {
  const cortes = await readCortesFresh();
  return cortes.filter((c) => c.courseId === courseId).sort((a, b) => a.order - b.order);
}

export async function getCorteById(id: string): Promise<Corte | null> {
  const cortes = await readCortesFresh();
  return cortes.find((c) => c.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// Parciales / Quizzes
// ────────────────────────────────────────────────────────────

export async function readQuizzesFresh(): Promise<Quiz[]> {
  const raw = await readJsonFileFresh<unknown[]>('quizzes.json');
  return z.array(quizSchema).parse(raw) as Quiz[];
}

export async function writeQuizzes(quizzes: Quiz[]): Promise<void> {
  await writeJsonFile('quizzes.json', quizzes);
}

export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  const quizzes = await readQuizzesFresh();
  return quizzes.filter((q) => q.courseId === courseId);
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const quizzes = await readQuizzesFresh();
  return quizzes.find((q) => q.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────
// Quiz Attempts (Intentos de parcial)
// ────────────────────────────────────────────────────────────

export async function readQuizAttemptsFresh(): Promise<QuizAttempt[]> {
  const raw = await readJsonFileFresh<unknown[]>('quiz-attempts.json');
  return z.array(quizAttemptSchema).parse(raw) as QuizAttempt[];
}

export async function writeQuizAttempts(attempts: QuizAttempt[]): Promise<void> {
  await writeJsonFileCritical('quiz-attempts.json', attempts);
}

export async function getAttemptsByQuiz(quizId: string): Promise<QuizAttempt[]> {
  const attempts = await readQuizAttemptsFresh();
  return attempts.filter((a) => a.quizId === quizId);
}

export async function getAttemptsByStudent(studentId: string, quizId: string): Promise<QuizAttempt[]> {
  const attempts = await readQuizAttemptsFresh();
  return attempts.filter((a) => a.studentId === studentId && a.quizId === quizId);
}

// ────────────────────────────────────────────────────────────
// Quiz Simulations (Simulaciones de parcial por docente)
// ────────────────────────────────────────────────────────────

export async function readQuizSimulationsFresh(): Promise<QuizSimulation[]> {
  const raw = await readJsonFileFresh<unknown[]>('quiz-simulations.json');
  return z.array(quizSimulationSchema).parse(raw) as QuizSimulation[];
}

export async function writeQuizSimulations(simulations: QuizSimulation[]): Promise<void> {
  await writeJsonFile('quiz-simulations.json', simulations);
}

// ────────────────────────────────────────────────────────────
// Manual Grade Items (actividades externas)
// ────────────────────────────────────────────────────────────

export async function readManualGradeItemsFresh(): Promise<ManualGradeItem[]> {
  const raw = await readJsonFileFresh<unknown[]>('manual-grade-items.json');
  return z.array(manualGradeItemSchema).parse(raw) as ManualGradeItem[];
}

export async function writeManualGradeItems(items: ManualGradeItem[]): Promise<void> {
  await writeJsonFile('manual-grade-items.json', items);
}

export async function readManualGradesFresh(): Promise<ManualGrade[]> {
  const raw = await readJsonFileFresh<unknown[]>('manual-grades.json');
  return z.array(manualGradeSchema).parse(raw) as ManualGrade[];
}

export async function writeManualGrades(grades: ManualGrade[]): Promise<void> {
  await writeJsonFile('manual-grades.json', grades);
}

// ────────────────────────────────────────────────────────────
// Re-exports desde blobSync — dataService es el ÚNICO punto de
// acceso a datos. Ningún otro archivo debe importar de blobSync.
// ────────────────────────────────────────────────────────────
export { withFileLock, DATA_FILES, seedAllToBlob, seedFilesToBlob, readFromBlobDirect, writeToBlobVerified } from './blobSync';

// ────────────────────────────────────────────────────────────
// Re-exports desde dateUtils — Centralización de fechas Colombia
// Todas las rutas y servicios importan de aquí (no de dateUtils directo)
// ────────────────────────────────────────────────────────────
export {
  nowColombiaISO,
  parseDateColombia,
  parseDateTimeColombia,
  nowColombia,
  isPast,
  isFuture,
  formatDateColombia,
  formatDateTimeColombia,
  formatTimeColombia,
  formatDateShort,
  COLOMBIA_TZ,
} from './dateUtils';

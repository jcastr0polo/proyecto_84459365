/**
 * lib/dataService.ts
 *
 * Single point of access to structured data. Reads and writes go to Supabase
 * Postgres exclusively. Public function signatures preserved from the pre-cutover
 * Blob/JSON era — callers don't need to know about the swap.
 *
 * If Supabase is unreachable, calls throw. No silent fallback. Per the design
 * decision (big-bang cutover) the legacy JSON utilities at the bottom of this
 * file are kept as @deprecated escape hatches but are not in the productive
 * data path.
 *
 * See docs/superpowers/specs/2026-05-26-supabase-migration-design.md
 */

import fs from 'fs';
import path from 'path';
import { HomeDataSchema, AppConfigSchema } from './validators';
import type {
  ChecklistTick,
  HomeData, AppConfig, User, Session, Semester, Course, Enrollment, Activity,
  Submission, Grade, AIPrompt, StudentProject, Corte, Quiz, QuizAttempt,
  QuizSimulation, ManualGradeItem, ManualGrade,
} from './types';
import {
  userSchema, sessionSchema, semesterSchema, courseSchema, enrollmentSchema,
  activitySchema, submissionSchema, gradeSchema, promptSchema, projectSchema,
  corteSchema,
} from './schemas';
import { z } from 'zod';
import {
  // Reads
  supabaseReadUsers, supabaseGetUserByEmail, supabaseGetUserById,
  supabaseReadSessions, supabaseReadSemesters, supabaseGetSemesterById,
  supabaseReadCourses, supabaseGetCourseById,
  supabaseReadEnrollments,
  supabaseReadActivities, supabaseGetActivityById,
  supabaseReadSubmissions, supabaseGetSubmissionById,
  supabaseReadGrades, supabaseGetGradeById,
  supabaseReadCortes, supabaseGetCorteById,
  supabaseReadPrompts, supabaseGetPromptById,
  supabaseReadProjects, supabaseGetProjectById,
  supabaseReadQuizzes, supabaseGetQuizById,
  supabaseReadQuizAttempts, supabaseReadQuizSimulations,
  supabaseReadManualGradeItems, supabaseReadManualGrades,
  supabaseReadConfig, supabaseReadHome,
  // Writes (replace-all)
  supabaseReplaceUsers, supabaseReplaceSessions, supabaseReplaceSemesters,
  supabaseReplaceCourses, supabaseReplaceEnrollments, supabaseReplaceActivities,
  supabaseReplaceSubmissions, supabaseUpdateSubmission,
  supabaseUpdateActivity, supabaseReadTicks, supabaseInsertTick, supabaseDeleteTick,
  supabaseReplaceGrades, supabaseReplaceCortes,
  supabaseReplacePrompts, supabaseReplaceProjects, supabaseUpdateProject,
  supabaseReplaceQuizzes,
  supabaseReplaceQuizAttempts, supabaseReplaceQuizSimulations,
  supabaseInsertQuizAttempt, supabaseInsertQuizSimulation,
  supabaseInsertQuizAttempts, supabaseDeleteQuizAttempts,
  supabaseReplaceManualGradeItems, supabaseReplaceManualGrades,
  supabaseUpsertAppSetting,
} from './supabase';

// ────────────────────────────────────────────────────────────
// LEGACY: JSON / Blob utilities (kept but not in productive data path)
//
// Per the big-bang cutover decision, these helpers stay in the codebase
// as an inspection/manual-recovery escape hatch (see /admin/database).
// No productive code below this section calls them.
// ────────────────────────────────────────────────────────────

const SOURCE_DATA_DIR = path.join(process.cwd(), 'data');

/** @deprecated Supabase is the source of truth. Legacy JSON snapshot reader. */
export function readJsonFile<T>(filename: string): T {
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/** @deprecated Use the Supabase reader for each entity instead. */
export async function readJsonFileFresh<T>(filename: string): Promise<T> {
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/** @deprecated No longer used by the data path. Kept for /admin/database. */
export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';
  const filePath = path.join(SOURCE_DATA_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/** @deprecated No longer used by the data path. Kept for /admin/database. */
export async function writeJsonFileCritical<T>(filename: string, data: T): Promise<void> {
  await writeJsonFile(filename, data);
}

// ────────────────────────────────────────────────────────────
// Configuration: home + app config
// Stored as rows in `app_settings` (key/value); JSON files are no longer used.
// ────────────────────────────────────────────────────────────

export async function readHomeData(): Promise<HomeData> {
  const data = await supabaseReadHome();
  if (!data) throw new Error('[dataService] No `home` setting in app_settings');
  return HomeDataSchema.parse(data);
}

export async function readAppConfig(): Promise<AppConfig> {
  const data = await supabaseReadConfig();
  if (!data) throw new Error('[dataService] No `config` setting in app_settings');
  return AppConfigSchema.parse(data);
}

export async function writeHomeData(data: HomeData): Promise<void> {
  await supabaseUpsertAppSetting('home', data as unknown as Record<string, unknown>);
}

export async function writeAppConfig(data: AppConfig): Promise<void> {
  await supabaseUpsertAppSetting('config', data as unknown as Record<string, unknown>);
}

// ════════════════════════════════════════════════════════════════
// FASE 6 — Usuarios
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readUsersFresh()` (async, Supabase). */
export function readUsers(): User[] {
  const raw = readJsonFile<unknown[]>('users.json');
  return z.array(userSchema).parse(raw) as User[];
}

export async function readUsersFresh(): Promise<User[]> {
  return supabaseReadUsers();
}

export async function writeUsers(users: User[]): Promise<void> {
  await supabaseReplaceUsers(users);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return supabaseGetUserByEmail(email);
}

export async function getUserById(id: string): Promise<User | null> {
  return supabaseGetUserById(id);
}

// ════════════════════════════════════════════════════════════════
// FASE 6 — Sesiones
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readSessionsFresh()` (async, Supabase). */
export function readSessions(): Session[] {
  const raw = readJsonFile<unknown[]>('sessions.json');
  return z.array(sessionSchema).parse(raw) as Session[];
}

export async function readSessionsFresh(): Promise<Session[]> {
  return supabaseReadSessions();
}

export async function writeSessions(sessions: Session[]): Promise<void> {
  await supabaseReplaceSessions(sessions);
}

// ════════════════════════════════════════════════════════════════
// FASE 7 — Semestres
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readSemestersFresh()`. */
export function readSemesters(): Semester[] {
  const raw = readJsonFile<unknown[]>('semesters.json');
  return z.array(semesterSchema).parse(raw) as Semester[];
}

export async function readSemestersFresh(): Promise<Semester[]> {
  return supabaseReadSemesters();
}

export async function writeSemesters(semesters: Semester[]): Promise<void> {
  await supabaseReplaceSemesters(semesters);
}

export async function getSemesterById(id: string): Promise<Semester | null> {
  return supabaseGetSemesterById(id);
}

export async function getActiveSemester(): Promise<Semester | null> {
  const semesters = await supabaseReadSemesters();
  return semesters.find((s) => s.isActive) ?? null;
}

// ════════════════════════════════════════════════════════════════
// FASE 7 — Cursos
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readCoursesFresh()`. */
export function readCourses(): Course[] {
  const raw = readJsonFile<unknown[]>('courses.json');
  return z.array(courseSchema).parse(raw) as Course[];
}

export async function readCoursesFresh(): Promise<Course[]> {
  return supabaseReadCourses();
}

export async function writeCourses(courses: Course[]): Promise<void> {
  await supabaseReplaceCourses(courses);
}

export async function getCourseById(id: string): Promise<Course | null> {
  return supabaseGetCourseById(id);
}

export async function getCoursesBySemester(semesterId: string): Promise<Course[]> {
  const courses = await supabaseReadCourses();
  return courses.filter((c) => c.semesterId === semesterId);
}

// ════════════════════════════════════════════════════════════════
// FASE 9 — Inscripciones
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readEnrollmentsFresh()`. */
export function readEnrollments(): Enrollment[] {
  const raw = readJsonFile<unknown[]>('enrollments.json');
  return z.array(enrollmentSchema).parse(raw) as Enrollment[];
}

export async function readEnrollmentsFresh(): Promise<Enrollment[]> {
  return supabaseReadEnrollments();
}

export async function writeEnrollments(enrollments: Enrollment[]): Promise<void> {
  await supabaseReplaceEnrollments(enrollments);
}

export async function getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
  const enrollments = await supabaseReadEnrollments();
  return enrollments.filter((e) => e.courseId === courseId);
}

export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const enrollments = await supabaseReadEnrollments();
  return enrollments.filter((e) => e.studentId === studentId);
}

export async function isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
  const enrollments = await supabaseReadEnrollments();
  return enrollments.some(
    (e) => e.studentId === studentId && e.courseId === courseId && e.status === 'active'
  );
}

// ════════════════════════════════════════════════════════════════
// FASE 11 — Actividades
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readActivitiesFresh()`. */
export function readActivities(): Activity[] {
  const raw = readJsonFile<unknown[]>('activities.json');
  return z.array(activitySchema).parse(raw) as Activity[];
}

export async function readActivitiesFresh(): Promise<Activity[]> {
  return supabaseReadActivities();
}

export async function writeActivities(activities: Activity[]): Promise<void> {
  await supabaseReplaceActivities(activities);
}

export async function getActivitiesByCourse(courseId: string): Promise<Activity[]> {
  const activities = await supabaseReadActivities();
  return activities.filter((a) => a.courseId === courseId);
}

export async function getActivityById(id: string): Promise<Activity | null> {
  return supabaseGetActivityById(id);
}

// ════════════════════════════════════════════════════════════════
// FASE 13 — Entregas
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readSubmissionsFresh()`. */
export function readSubmissions(): Submission[] {
  const raw = readJsonFile<unknown[]>('submissions.json');
  return z.array(submissionSchema).parse(raw) as Submission[];
}

export async function readSubmissionsFresh(): Promise<Submission[]> {
  return supabaseReadSubmissions();
}

/**
 * Cambia una entrega sin tocar las demás. Es lo que debe usar todo lo que
 * modifica UNA entrega: reescribir la tabla entera mientras un estudiante
 * entrega se lleva esa entrega por delante.
 */
/** Cambia una actividad sin reescribir las demás. */
export async function patchActivity(id: string, patch: Partial<Activity>): Promise<void> {
  await supabaseUpdateActivity(id, patch);
}

// ────────────────────────────────────────────────────────────
// Listas de tareas
// ────────────────────────────────────────────────────────────

export async function readTicks(activityId: string): Promise<ChecklistTick[]> {
  return supabaseReadTicks(activityId);
}

export async function addTick(t: ChecklistTick): Promise<void> {
  await supabaseInsertTick(t);
}

export async function removeTick(activityId: string, studentId: string, itemId: string): Promise<void> {
  await supabaseDeleteTick(activityId, studentId, itemId);
}

export async function patchSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  await supabaseUpdateSubmission(id, patch);
}

export async function writeSubmissions(submissions: Submission[]): Promise<void> {
  await supabaseReplaceSubmissions(submissions);
}

export async function getSubmissionsByActivity(activityId: string): Promise<Submission[]> {
  const submissions = await supabaseReadSubmissions();
  return submissions.filter((s) => s.activityId === activityId);
}

export async function getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  const submissions = await supabaseReadSubmissions();
  return submissions.filter((s) => s.studentId === studentId);
}

export async function getSubmission(activityId: string, studentId: string): Promise<Submission | null> {
  const submissions = await supabaseReadSubmissions();
  return submissions.find((s) => s.activityId === activityId && s.studentId === studentId) ?? null;
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  return supabaseGetSubmissionById(id);
}

// ════════════════════════════════════════════════════════════════
// FASE 15 — Calificaciones
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readGradesFresh()`. */
export function readGrades(): Grade[] {
  const raw = readJsonFile<unknown[]>('grades.json');
  return z.array(gradeSchema).parse(raw) as Grade[];
}

export async function readGradesFresh(): Promise<Grade[]> {
  return supabaseReadGrades();
}

export async function writeGrades(grades: Grade[]): Promise<void> {
  await supabaseReplaceGrades(grades);
}

export async function getGradesByActivity(activityId: string): Promise<Grade[]> {
  const grades = await supabaseReadGrades();
  return grades.filter((g) => g.activityId === activityId);
}

export async function getGradesByStudent(studentId: string, courseId: string): Promise<Grade[]> {
  const grades = await supabaseReadGrades();
  return grades.filter((g) => g.studentId === studentId && g.courseId === courseId);
}

export async function getGradeForSubmission(submissionId: string): Promise<Grade | null> {
  const grades = await supabaseReadGrades();
  return grades.find((g) => g.submissionId === submissionId) ?? null;
}

export async function getGradeById(id: string): Promise<Grade | null> {
  return supabaseGetGradeById(id);
}

// ════════════════════════════════════════════════════════════════
// FASE 18 — Prompts IA
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readPromptsFresh()`. */
export function readPrompts(): AIPrompt[] {
  const raw = readJsonFile<unknown[]>('prompts.json');
  return z.array(promptSchema).parse(raw) as AIPrompt[];
}

export async function readPromptsFresh(): Promise<AIPrompt[]> {
  return supabaseReadPrompts();
}

export async function writePrompts(prompts: AIPrompt[]): Promise<void> {
  await supabaseReplacePrompts(prompts);
}

export async function getPromptById(id: string): Promise<AIPrompt | null> {
  return supabaseGetPromptById(id);
}

export async function getPromptsByCourse(courseId: string): Promise<AIPrompt[]> {
  const prompts = await supabaseReadPrompts();
  return prompts.filter((p) => p.courseId === courseId);
}

export async function getPromptByActivity(activityId: string): Promise<AIPrompt | null> {
  const prompts = await supabaseReadPrompts();
  return prompts.find((p) => p.activityId === activityId) ?? null;
}

// ════════════════════════════════════════════════════════════════
// FASE 19 — Proyectos Estudiantiles
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readProjectsFresh()`. */
export function readProjects(): StudentProject[] {
  const raw = readJsonFile<unknown[]>('projects.json');
  return z.array(projectSchema).parse(raw) as StudentProject[];
}

export async function readProjectsFresh(): Promise<StudentProject[]> {
  return supabaseReadProjects();
}

/** Cambia un proyecto sin reescribir los demás. Ver supabaseUpdateProject. */
export async function patchProject(id: string, patch: Partial<StudentProject>): Promise<void> {
  await supabaseUpdateProject(id, patch);
}

export async function writeProjects(projects: StudentProject[]): Promise<void> {
  await supabaseReplaceProjects(projects);
}

export async function getProjectById(id: string): Promise<StudentProject | null> {
  return supabaseGetProjectById(id);
}

export async function getProjectsByCourse(courseId: string): Promise<StudentProject[]> {
  const projects = await supabaseReadProjects();
  return projects.filter((p) => p.courseId === courseId);
}

export async function getProjectByStudentAndCourse(studentId: string, courseId: string): Promise<StudentProject | null> {
  const projects = await supabaseReadProjects();
  return projects.find((p) => p.studentId === studentId && p.courseId === courseId) ?? null;
}

// ════════════════════════════════════════════════════════════════
// Cortes
// ════════════════════════════════════════════════════════════════

/** @deprecated Sync reader. Use `readCortesFresh()`. */
export function readCortes(): Corte[] {
  const raw = readJsonFile<unknown[]>('cortes.json');
  return z.array(corteSchema).parse(raw) as Corte[];
}

export async function readCortesFresh(): Promise<Corte[]> {
  return supabaseReadCortes();
}

export async function writeCortes(cortes: Corte[]): Promise<void> {
  await supabaseReplaceCortes(cortes);
}

export async function getCortesByCourse(courseId: string): Promise<Corte[]> {
  const cortes = await supabaseReadCortes();
  return cortes.filter((c) => c.courseId === courseId).sort((a, b) => a.order - b.order);
}

export async function getCorteById(id: string): Promise<Corte | null> {
  return supabaseGetCorteById(id);
}

// ════════════════════════════════════════════════════════════════
// Quizzes
// ════════════════════════════════════════════════════════════════

export async function readQuizzesFresh(): Promise<Quiz[]> {
  return supabaseReadQuizzes();
}

export async function writeQuizzes(quizzes: Quiz[]): Promise<void> {
  await supabaseReplaceQuizzes(quizzes);
}

export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  const quizzes = await supabaseReadQuizzes();
  return quizzes.filter((q) => q.courseId === courseId);
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  return supabaseGetQuizById(id);
}

// ────────────────────────────────────────────────────────────
// Quiz attempts
// ────────────────────────────────────────────────────────────

export async function readQuizAttemptsFresh(): Promise<QuizAttempt[]> {
  return supabaseReadQuizAttempts();
}

export async function writeQuizAttempts(attempts: QuizAttempt[]): Promise<void> {
  await supabaseReplaceQuizAttempts(attempts);
}

/**
 * Añade un intento sin releer ni reescribir los demás.
 *
 * Es lo que debe usar todo lo que CREA un intento. writeQuizAttempts se queda
 * solo para lo que de verdad reemplaza el conjunto entero.
 */
export async function appendQuizAttempt(attempt: QuizAttempt): Promise<void> {
  await supabaseInsertQuizAttempt(attempt);
}

/** Varios intentos de golpe (los ceros por no presentar), sin tocar los demás. */
export async function appendQuizAttempts(items: QuizAttempt[]): Promise<void> {
  await supabaseInsertQuizAttempts(items);
}

/** Borra intentos concretos por id. */
export async function deleteQuizAttempts(ids: string[]): Promise<void> {
  await supabaseDeleteQuizAttempts(ids);
}

export async function getAttemptsByQuiz(quizId: string): Promise<QuizAttempt[]> {
  const attempts = await supabaseReadQuizAttempts();
  return attempts.filter((a) => a.quizId === quizId);
}

export async function getAttemptsByStudent(studentId: string, quizId: string): Promise<QuizAttempt[]> {
  const attempts = await supabaseReadQuizAttempts();
  return attempts.filter((a) => a.studentId === studentId && a.quizId === quizId);
}

// ────────────────────────────────────────────────────────────
// Quiz simulations
// ────────────────────────────────────────────────────────────

export async function readQuizSimulationsFresh(): Promise<QuizSimulation[]> {
  return supabaseReadQuizSimulations();
}

export async function writeQuizSimulations(simulations: QuizSimulation[]): Promise<void> {
  await supabaseReplaceQuizSimulations(simulations);
}

/** Añade una simulación sin tocar las demás. */
export async function appendQuizSimulation(sim: QuizSimulation): Promise<void> {
  await supabaseInsertQuizSimulation(sim);
}

// ────────────────────────────────────────────────────────────
// Manual grade items
// ────────────────────────────────────────────────────────────

export async function readManualGradeItemsFresh(): Promise<ManualGradeItem[]> {
  return supabaseReadManualGradeItems();
}

export async function writeManualGradeItems(items: ManualGradeItem[]): Promise<void> {
  await supabaseReplaceManualGradeItems(items);
}

export async function readManualGradesFresh(): Promise<ManualGrade[]> {
  return supabaseReadManualGrades();
}

export async function writeManualGrades(grades: ManualGrade[]): Promise<void> {
  await supabaseReplaceManualGrades(grades);
}

// ────────────────────────────────────────────────────────────
// Re-exports from blobSync. Las funciones de sembrado y lectura directa del
// Blob se retiraron: desde la migración a Supabase nadie las llamaba.
// Productive data path does not use these — kept for the manual escape
// hatch documented in the design.
// ────────────────────────────────────────────────────────────
export { withFileLock, DATA_FILES } from './blobSync';

// ────────────────────────────────────────────────────────────
// Re-exports from dateUtils (unchanged)
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

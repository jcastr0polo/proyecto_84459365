import fs from 'fs';
import path from 'path';
import { HomeDataSchema, AppConfigSchema } from './validators';
import type { HomeData, AppConfig, User, Session, Semester, Course, Enrollment } from './types';
import { userSchema, sessionSchema, semesterSchema, courseSchema, enrollmentSchema } from './schemas';
import { z } from 'zod';

/**
 * Lee un archivo JSON de la carpeta /data y lo parsea con tipado genérico.
 * 
 * @param filename - Nombre del archivo JSON (ej: "config.json", "home.json")
 * @returns Objeto parseado con tipo T
 * @throws Error si el archivo no existe o el JSON es inválido
 * 
 * Uso (bajo nivel):
 *   const config = readJsonFile<AppConfig>('config.json');
 *   const home = readJsonFile<HomeData>('home.json');
 */
export function readJsonFile<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'data', filename);
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
 * Escribe un objeto como JSON en la carpeta /data
 * @param filename - Nombre del archivo (ej: "users.json")
 * @param data - Objeto a serializar
 */
export function writeJsonFile<T>(filename: string, data: T): void {
  const filePath = path.join(process.cwd(), 'data', filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
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
 * Escribe el array completo de usuarios en /data/users.json
 */
export function writeUsers(users: User[]): void {
  writeJsonFile('users.json', users);
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
export function writeSessions(sessions: Session[]): void {
  writeJsonFile('sessions.json', sessions);
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
export function writeSemesters(semesters: Semester[]): void {
  writeJsonFile('semesters.json', semesters);
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
export function writeCourses(courses: Course[]): void {
  writeJsonFile('courses.json', courses);
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

/**
 * Escribe el array completo de enrollments en /data/enrollments.json
 */
export function writeEnrollments(enrollments: Enrollment[]): void {
  writeJsonFile('enrollments.json', enrollments);
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

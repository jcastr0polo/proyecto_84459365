/**
 * lib/supabase.ts
 * Supabase data access layer — Postgres is the source of truth for all
 * structured data (users, courses, activities, submissions, …).
 *
 * - Reads / single-row writes go through `supabase-js` (PostgREST).
 * - Whole-array writes go through a pooled `postgres` connection so we can
 *   wrap DELETE + INSERT in one transaction (legacy `writeXxx(array)` API
 *   semantics from the Blob era).
 *
 * BUILD-SAFE: getSupabaseClient() returns null when env vars are missing,
 * so Next.js page pre-rendering at build time does not crash.
 * `requireSupabaseClient()` and the pool getter throw at runtime if config is
 * missing — there is no JSON/Blob fallback in the productive data path
 * (big-bang cutover, see docs/superpowers/specs/2026-05-26-supabase-migration-design.md).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import type {
  User, Session, Semester, Course, Enrollment, Activity, Submission, Grade,
  Corte, AIPrompt, StudentProject, Quiz, QuizAttempt, QuizSimulation,
  ManualGradeItem, ManualGrade, AppConfig, HomeData,
  ActivityAttachment, SubmissionAttachment, SubmissionLink, CourseSchedule,
  QuizQuestion, QuizAnswer, CorteTemplateItem,
} from '@/lib/types';
import type { AuditEntry } from '@/lib/auditService';
import { nowColombiaISO } from '@/lib/dateUtils';

// ── Build-safe client ──────────────────────────────────────────

let _client: SupabaseClient | null = null;
let _checked = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_checked) return null;

  const url = process.env.SUPABASE_NEXUS_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_NEXUS_SUPABASE_SERVICE_ROLE_KEY;

  _checked = true;

  if (!url || !serviceKey) {
    console.warn('[supabase] Not configured at build time — client deferred');
    return null;
  }

  _client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _client;
}

export function requireSupabaseClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase not configured: SUPABASE_NEXUS_SUPABASE_URL and SUPABASE_NEXUS_SUPABASE_SERVICE_ROLE_KEY are required'
    );
  }
  return client;
}

// ── Direct Postgres pool (for DDL + transactions) ──────────────

type Sql = ReturnType<typeof postgres>;

let _pg: Sql | null = null;
/** true cuando ya se cambió al enlace sin pooler tras un fallo de conexión. */
let _pgEsReserva = false;

const OPCIONES_PG = {
  ssl: 'require' as const,
  /*
   * Falla rápido. Con quince segundos, la pantalla de estado de la base se
   * quedaba cargando todo ese rato desde Vercel y luego se caía sin decir por
   * qué. Ninguna LECTURA depende ya de esta conexión —eso va por PostgREST—,
   * así que si no se puede abrir es mejor saberlo pronto.
   */
  connect_timeout: 6,
  /*
   * Pocas conexiones y que se suelten rápido.
   *
   * En Vercel cada instancia levanta su propio grupo, así que un `max` alto se
   * multiplica por el número de instancias vivas y agota los huecos del
   * pooler. Y cuando el pooler se agota, el síntoma es de los malos: las
   * lecturas siguen funcionando —van por PostgREST— pero NINGUNA escritura
   * pasa. La aplicación parece viva y no guarda nada.
   */
  idle_timeout: 10,
  max: 2,
  /*
   * El pooler de Supabase (puerto 6543) trabaja en modo transacción y ahí las
   * sentencias preparadas no sobreviven entre consultas.
   */
  prepare: false,
};

function urlPooler(): string | undefined {
  return process.env.SUPABASE_NEXUS_POSTGRES_URL ?? process.env.POSTGRES_URL;
}

function urlDirecta(): string | undefined {
  return process.env.SUPABASE_NEXUS_POSTGRES_URL_NON_POOLING;
}

function getPgPool(): Sql {
  if (_pg) return _pg;
  const connString = urlPooler() ?? urlDirecta();
  if (!connString) {
    throw new Error('Postgres URL not configured (SUPABASE_NEXUS_POSTGRES_URL)');
  }
  _pg = postgres(connString, OPCIONES_PG);
  return _pg;
}

/** ¿El error es de "no pude ni abrir la conexión"? */
function esFalloDeConexion(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? '';
  return ['CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(code);
}

/**
 * Ejecuta contra Postgres, con el enlace directo como reserva.
 *
 * Todas las escrituras de la aplicación pasan por aquí. El pooler es lo
 * correcto en Vercel —cada instancia abre pocas conexiones y las suelta—,
 * pero cuando se queda sin huecos deja de aceptar conexiones nuevas, y
 * entonces las lecturas siguen yendo por PostgREST mientras las escrituras
 * fallan en silencio: la pantalla responde y nada se guarda.
 *
 * Comprobado contra la base real: con el pooler saturado, el enlace sin
 * pooler (5432) seguía entrando sin problema. Así que ante un fallo de
 * CONEXIÓN —no ante un error de SQL, que hay que dejar salir— se reintenta
 * una vez por ahí y se recuerda para el resto de la vida de la instancia.
 */
async function conPg<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  try {
    return await fn(getPgPool());
  } catch (e) {
    const directa = urlDirecta();
    if (_pgEsReserva || !directa || !esFalloDeConexion(e)) throw e;

    console.warn('[supabase] el pooler no acepta conexiones; se pasa al enlace directo');
    try { await _pg?.end({ timeout: 1 }); } catch { /* daba igual */ }
    _pg = postgres(directa, OPCIONES_PG);
    _pgEsReserva = true;
    return fn(_pg);
  }
}

/**
 * Execute raw SQL. Used for DDL (CREATE TABLE, etc.) that PostgREST can't do.
 * Each call opens its own short-lived connection.
 */
export async function executeSql(query: string): Promise<{ rowCount: number }> {
  const connString =
    process.env.SUPABASE_NEXUS_POSTGRES_URL ??
    process.env.POSTGRES_URL;

  if (!connString) {
    throw new Error('PostgreSQL URL not configured.');
  }

  const sql = postgres(connString, { ssl: 'require', connect_timeout: 10, idle_timeout: 5, max: 1 });
  try {
    const result = await sql.unsafe(query);
    return { rowCount: result.count ?? 0 };
  } finally {
    await sql.end();
  }
}

// ── Generic helpers ────────────────────────────────────────────

async function readAllRows<TRow>(table: string): Promise<TRow[]> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from(table).select('*');
  if (error) throw new Error(`[supabase] readAll ${table}: ${error.message}`);
  return (data ?? []) as TRow[];
}

async function getOneRow<TRow>(table: string, idColumn: string, id: string): Promise<TRow | null> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from(table).select('*').eq(idColumn, id).maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[supabase] getOne ${table}: ${error.message}`);
  }
  return (data as TRow) ?? null;
}

/**
 * Replace the entire contents of `table` with `rows`, transactionally.
 * Matches the legacy `writeXxx(arr)` semantics of the Blob/JSON layer.
 */
async function replaceAllRows<T extends object>(
  table: string,
  rows: T[],
): Promise<void> {
  await conPg((sql) => sql.begin(async (tx) => {
    await tx.unsafe(`DELETE FROM "${table}"`);
    if (rows.length > 0) {
      const cols = Object.keys(rows[0] as Record<string, unknown>);
      const values = rows as unknown as Record<string, never>[];
      await tx`INSERT INTO ${tx(table)} ${tx(values, ...cols)}`;
    }
  }));
}

async function insertOneRow<T extends Record<string, unknown>>(table: string, row: T): Promise<void> {
  const sb = requireSupabaseClient();
  const { error } = await sb.from(table).insert(row);
  if (error) throw new Error(`[supabase] insert ${table}: ${error.message}`);
}

/** Añade varias filas de una vez, sin tocar las que ya están. */
async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const sb = requireSupabaseClient();
  // El tipado genérico de supabase-js rechaza un array de Record suelto; la
  // forma de la fila ya la garantiza el *ToRow que la construye.
  const { error } = await sb.from(table).insert(rows as never);
  if (error) throw new Error(`[supabase] insert ${table} (${rows.length}): ${error.message}`);
}

/** Borra por id, sin tocar el resto de la tabla. */
async function deleteRowsById(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sb = requireSupabaseClient();
  const { error } = await sb.from(table).delete().in('id', ids);
  if (error) throw new Error(`[supabase] delete ${table} (${ids.length}): ${error.message}`);
}

// ════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════

interface SupabaseUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'student';
  must_change_password: boolean;
  first_name: string;
  last_name: string;
  document_number: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

function rowToUser(r: SupabaseUserRow): User {
  return {
    id: r.id, email: r.email, passwordHash: r.password_hash, role: r.role,
    mustChangePassword: r.must_change_password,
    firstName: r.first_name, lastName: r.last_name, documentNumber: r.document_number,
    phone: r.phone ?? undefined, isActive: r.is_active,
    createdAt: r.created_at, updatedAt: r.updated_at,
    lastLoginAt: r.last_login_at ?? undefined,
  };
}

function userToRow(u: User): SupabaseUserRow {
  return {
    id: u.id, email: u.email, password_hash: u.passwordHash, role: u.role,
    must_change_password: u.mustChangePassword,
    first_name: u.firstName, last_name: u.lastName, document_number: u.documentNumber,
    phone: u.phone ?? null, is_active: u.isActive,
    created_at: u.createdAt, updated_at: u.updatedAt,
    last_login_at: u.lastLoginAt ?? null,
  };
}

export async function supabaseReadUsers(): Promise<User[]> {
  const rows = await readAllRows<SupabaseUserRow>('users');
  return rows.map(rowToUser);
}

export async function supabaseGetUserByEmail(email: string): Promise<User | null> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('users').select('*').ilike('email', email).maybeSingle();
  if (error || !data) return null;
  return rowToUser(data as SupabaseUserRow);
}

export async function supabaseGetUserById(id: string): Promise<User | null> {
  const row = await getOneRow<SupabaseUserRow>('users', 'id', id);
  return row ? rowToUser(row) : null;
}

export async function supabaseReplaceUsers(users: User[]): Promise<void> {
  await replaceAllRows('users', users.map(userToRow));
}

export async function supabaseUpsertUsers(users: User[]): Promise<void> {
  if (users.length === 0) return;
  const sb = requireSupabaseClient();
  const rows = users.map(userToRow);
  const { error } = await sb.from('users').upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  if (error) throw new Error(`[supabase] upsertUsers: ${error.message}`);
}

export async function supabaseUpdateUser(
  id: string,
  fields: Partial<Pick<User,
    'passwordHash' | 'mustChangePassword' | 'lastLoginAt' | 'updatedAt' |
    'isActive' | 'firstName' | 'lastName' | 'phone' | 'documentNumber' | 'email'
  >>,
): Promise<void> {
  const sb = requireSupabaseClient();
  const update: Record<string, unknown> = {};
  if (fields.passwordHash !== undefined) update.password_hash = fields.passwordHash;
  if (fields.mustChangePassword !== undefined) update.must_change_password = fields.mustChangePassword;
  if (fields.lastLoginAt !== undefined) update.last_login_at = fields.lastLoginAt;
  if (fields.updatedAt !== undefined) update.updated_at = fields.updatedAt;
  if (fields.isActive !== undefined) update.is_active = fields.isActive;
  if (fields.firstName !== undefined) update.first_name = fields.firstName;
  if (fields.lastName !== undefined) update.last_name = fields.lastName;
  if (fields.phone !== undefined) update.phone = fields.phone;
  if (fields.documentNumber !== undefined) update.document_number = fields.documentNumber;
  if (fields.email !== undefined) update.email = fields.email;
  if (Object.keys(update).length === 0) return;
  const { error } = await sb.from('users').update(update).eq('id', id);
  if (error) throw new Error(`[supabase] updateUser: ${error.message}`);
}

// ════════════════════════════════════════════════════════════════
// SESSIONS
// ════════════════════════════════════════════════════════════════

interface SupabaseSessionRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

function rowToSession(r: SupabaseSessionRow): Session {
  return {
    id: r.id, userId: r.user_id,
    createdAt: r.created_at, expiresAt: r.expires_at,
    ipAddress: r.ip_address ?? undefined,
    userAgent: r.user_agent ?? undefined,
  };
}

function sessionToRow(s: Session): SupabaseSessionRow {
  return {
    id: s.id, user_id: s.userId,
    created_at: s.createdAt, expires_at: s.expiresAt,
    ip_address: s.ipAddress ?? null,
    user_agent: s.userAgent ?? null,
  };
}

export async function supabaseReadSessions(): Promise<Session[]> {
  const rows = await readAllRows<SupabaseSessionRow>('sessions');
  return rows.map(rowToSession);
}

export async function supabaseReplaceSessions(sessions: Session[]): Promise<void> {
  await replaceAllRows('sessions', sessions.map(sessionToRow));
}

// ════════════════════════════════════════════════════════════════
// SEMESTERS
// ════════════════════════════════════════════════════════════════

interface SupabaseSemesterRow {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  /* Añadida después: en filas anteriores a la migración llega como null. */
  corte_template?: CorteTemplateItem[] | null;
  created_at: string;
}

function rowToSemester(r: SupabaseSemesterRow): Semester {
  return {
    id: r.id, label: r.label,
    startDate: r.start_date, endDate: r.end_date,
    isActive: r.is_active,
    ...(Array.isArray(r.corte_template) && r.corte_template.length > 0
      ? { corteTemplate: r.corte_template }
      : {}),
    createdAt: r.created_at,
  };
}

function semesterToRow(s: Semester): SupabaseSemesterRow {
  return {
    id: s.id, label: s.label,
    start_date: s.startDate, end_date: s.endDate,
    is_active: s.isActive,
    corte_template: s.corteTemplate ?? null,
    created_at: s.createdAt,
  };
}

export async function supabaseReadSemesters(): Promise<Semester[]> {
  const rows = await readAllRows<SupabaseSemesterRow>('semesters');
  return rows.map(rowToSemester);
}

export async function supabaseGetSemesterById(id: string): Promise<Semester | null> {
  const row = await getOneRow<SupabaseSemesterRow>('semesters', 'id', id);
  return row ? rowToSemester(row) : null;
}

export async function supabaseReplaceSemesters(items: Semester[]): Promise<void> {
  await replaceAllRows('semesters', items.map(semesterToRow));
}

// ════════════════════════════════════════════════════════════════
// COURSES
// ════════════════════════════════════════════════════════════════

interface SupabaseCourseRow {
  id: string;
  code: string;
  name: string;
  description: string;
  semester_id: string;
  category: Course['category'];
  schedule: CourseSchedule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function rowToCourse(r: SupabaseCourseRow): Course {
  return {
    id: r.id, code: r.code, name: r.name, description: r.description,
    semesterId: r.semester_id, category: r.category,
    schedule: r.schedule ?? [], isActive: r.is_active,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function courseToRow(c: Course): Record<string, unknown> {
  return {
    id: c.id, code: c.code, name: c.name, description: c.description,
    semester_id: c.semesterId, category: c.category,
    schedule: (c.schedule ?? []),
    is_active: c.isActive,
    created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

export async function supabaseReadCourses(): Promise<Course[]> {
  const rows = await readAllRows<SupabaseCourseRow>('courses');
  return rows.map(rowToCourse);
}

export async function supabaseGetCourseById(id: string): Promise<Course | null> {
  const row = await getOneRow<SupabaseCourseRow>('courses', 'id', id);
  return row ? rowToCourse(row) : null;
}

export async function supabaseReplaceCourses(items: Course[]): Promise<void> {
  await replaceAllRows('courses', items.map(courseToRow));
}

// ════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ════════════════════════════════════════════════════════════════

interface SupabaseEnrollmentRow {
  id: string;
  course_id: string;
  student_id: string;
  status: Enrollment['status'];
  enrolled_at: string;
  enrolled_by: string;
  withdrawn_at: string | null;
}

function rowToEnrollment(r: SupabaseEnrollmentRow): Enrollment {
  return {
    id: r.id, courseId: r.course_id, studentId: r.student_id,
    status: r.status, enrolledAt: r.enrolled_at, enrolledBy: r.enrolled_by,
    withdrawnAt: r.withdrawn_at ?? undefined,
  };
}

function enrollmentToRow(e: Enrollment): SupabaseEnrollmentRow {
  return {
    id: e.id, course_id: e.courseId, student_id: e.studentId,
    status: e.status, enrolled_at: e.enrolledAt, enrolled_by: e.enrolledBy,
    withdrawn_at: e.withdrawnAt ?? null,
  };
}

export async function supabaseReadEnrollments(): Promise<Enrollment[]> {
  const rows = await readAllRows<SupabaseEnrollmentRow>('enrollments');
  return rows.map(rowToEnrollment);
}

export async function supabaseReplaceEnrollments(items: Enrollment[]): Promise<void> {
  await replaceAllRows('enrollments', items.map(enrollmentToRow));
}

// ════════════════════════════════════════════════════════════════
// ACTIVITIES
// ════════════════════════════════════════════════════════════════

interface SupabaseActivityRow {
  id: string;
  course_id: string;
  corte_id: string | null;
  title: string;
  description: string;
  type: Activity['type'];
  category: Activity['category'];
  attachments: ActivityAttachment[];
  prompt_id: string | null;
  due_date: string;
  due_time: string | null;
  publish_date: string;
  publish_time: string | null;
  max_score: number;
  weight: number;
  allow_late_submission: boolean;
  late_penalty_percent: number | null;
  status: Activity['status'];
  requires_file_upload: boolean;
  requires_link_submission: boolean;
  project_required: boolean | null;
  created_at: string;
  updated_at: string;
}

function rowToActivity(r: SupabaseActivityRow): Activity {
  return {
    id: r.id, courseId: r.course_id,
    corteId: r.corte_id ?? undefined,
    title: r.title, description: r.description,
    type: r.type, category: r.category,
    attachments: r.attachments ?? [],
    promptId: r.prompt_id ?? undefined,
    dueDate: r.due_date, dueTime: r.due_time ?? undefined,
    publishDate: r.publish_date, publishTime: r.publish_time ?? undefined,
    maxScore: Number(r.max_score), weight: Number(r.weight),
    allowLateSubmission: r.allow_late_submission,
    latePenaltyPercent: r.late_penalty_percent === null ? undefined : Number(r.late_penalty_percent),
    status: r.status,
    requiresFileUpload: r.requires_file_upload,
    requiresLinkSubmission: r.requires_link_submission,
    projectRequired: r.project_required ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function activityToRow(a: Activity): Record<string, unknown> {
  return {
    id: a.id, course_id: a.courseId,
    corte_id: a.corteId ?? null,
    title: a.title, description: a.description,
    type: a.type, category: a.category,
    attachments: (a.attachments ?? []),
    prompt_id: a.promptId ?? null,
    due_date: a.dueDate, due_time: a.dueTime ?? null,
    publish_date: a.publishDate, publish_time: a.publishTime ?? null,
    max_score: a.maxScore, weight: a.weight,
    allow_late_submission: a.allowLateSubmission,
    late_penalty_percent: a.latePenaltyPercent ?? null,
    status: a.status,
    requires_file_upload: a.requiresFileUpload,
    requires_link_submission: a.requiresLinkSubmission,
    project_required: a.projectRequired ?? null,
    created_at: a.createdAt, updated_at: a.updatedAt,
  };
}

export async function supabaseReadActivities(): Promise<Activity[]> {
  const rows = await readAllRows<SupabaseActivityRow>('activities');
  return rows.map(rowToActivity);
}

export async function supabaseGetActivityById(id: string): Promise<Activity | null> {
  const row = await getOneRow<SupabaseActivityRow>('activities', 'id', id);
  return row ? rowToActivity(row) : null;
}

export async function supabaseReplaceActivities(items: Activity[]): Promise<void> {
  await replaceAllRows('activities', items.map(activityToRow));
}

// ════════════════════════════════════════════════════════════════
// SUBMISSIONS
// ════════════════════════════════════════════════════════════════

interface SupabaseSubmissionRow {
  id: string;
  activity_id: string;
  student_id: string;
  course_id: string;
  content: string | null;
  attachments: SubmissionAttachment[];
  /* Llega con su migración; en filas anteriores viene null. */
  feedback_attachments?: SubmissionAttachment[] | null;
  links: SubmissionLink[];
  submitted_at: string;
  is_late: boolean;
  status: Submission['status'];
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToSubmission(r: SupabaseSubmissionRow): Submission {
  return {
    id: r.id, activityId: r.activity_id, studentId: r.student_id, courseId: r.course_id,
    content: r.content ?? undefined,
    attachments: r.attachments ?? [],
    ...(r.feedback_attachments?.length ? { feedbackAttachments: r.feedback_attachments } : {}),
    links: r.links ?? [],
    submittedAt: r.submitted_at, isLate: r.is_late,
    status: r.status, version: r.version,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function submissionToRow(s: Submission): Record<string, unknown> {
  return {
    id: s.id, activity_id: s.activityId, student_id: s.studentId, course_id: s.courseId,
    content: s.content ?? null,
    attachments: (s.attachments ?? []),
    feedback_attachments: (s.feedbackAttachments ?? []),
    links: (s.links ?? []),
    submitted_at: s.submittedAt, is_late: s.isLate,
    status: s.status, version: s.version,
    created_at: s.createdAt, updated_at: s.updatedAt,
  };
}

export async function supabaseReadSubmissions(): Promise<Submission[]> {
  const rows = await readAllRows<SupabaseSubmissionRow>('submissions');
  return rows.map(rowToSubmission);
}

export async function supabaseGetSubmissionById(id: string): Promise<Submission | null> {
  const row = await getOneRow<SupabaseSubmissionRow>('submissions', 'id', id);
  return row ? rowToSubmission(row) : null;
}

/**
 * Igual que con cortes.reported_at: la devolución del docente vive en una
 * columna que llega con su migración, y entregar o calificar no puede romperse
 * en el rato que va de desplegar el código a aplicarla.
 */
/**
 * Actualiza UNA entrega, sin releer ni reescribir las demás.
 *
 * Lo usa la devolución del docente, que ocurre a lo largo de días mientras los
 * estudiantes siguen entregando. Con la reescritura completa, subir un
 * documento corregido en el mismo instante en que alguien entrega se lleva por
 * delante esa entrega —el mismo fallo que tenían los intentos de parcial—.
 *
 * Tolera que aún falte la columna, igual que la escritura completa.
 */
export async function supabaseUpdateSubmission(
  id: string,
  patch: Partial<Submission>,
): Promise<void> {
  const sb = requireSupabaseClient();
  const fila: Record<string, unknown> = { updated_at: nowColombiaISO() };
  if (patch.feedbackAttachments !== undefined) fila.feedback_attachments = patch.feedbackAttachments;
  if (patch.status !== undefined) fila.status = patch.status;

  const { error } = await sb.from('submissions').update(fila).eq('id', id);
  if (!error) return;
  if (!faltaColumna(error, 'feedback_attachments')) {
    throw new Error(`[supabase] update submissions ${id}: ${error.message}`);
  }
  throw new Error(
    'Falta la columna submissions.feedback_attachments. Aplica la migración '
    + '"2026-09-devolucion-docente" en Configuración › Base de datos.',
  );
}

export async function supabaseReplaceSubmissions(items: Submission[]): Promise<void> {
  const filas = items.map(submissionToRow);
  try {
    await replaceAllRows('submissions', filas);
  } catch (e) {
    if (!faltaColumna(e, 'feedback_attachments')) throw e;
    console.warn(
      '[supabase] falta la columna submissions.feedback_attachments. Aplica la '
      + 'migración "2026-09-devolucion-docente" en Configuración › Base de datos; '
      + 'hasta entonces no se guardan los documentos que devuelvas.',
    );
    await replaceAllRows('submissions', filas.map((f) => {
      const sinColumna = { ...f };
      delete sinColumna.feedback_attachments;
      return sinColumna;
    }));
  }
}

// ════════════════════════════════════════════════════════════════
// GRADES
// ════════════════════════════════════════════════════════════════

interface SupabaseGradeRow {
  id: string;
  submission_id: string;
  activity_id: string;
  student_id: string;
  course_id: string;
  score: number;
  max_score: number;
  feedback: string | null;
  is_published: boolean;
  published_at: string | null;
  graded_by: string;
  graded_at: string;
  updated_at: string;
}

function rowToGrade(r: SupabaseGradeRow): Grade {
  return {
    id: r.id, submissionId: r.submission_id,
    activityId: r.activity_id, studentId: r.student_id, courseId: r.course_id,
    score: Number(r.score), maxScore: Number(r.max_score),
    feedback: r.feedback ?? undefined,
    isPublished: r.is_published,
    publishedAt: r.published_at ?? undefined,
    gradedBy: r.graded_by, gradedAt: r.graded_at, updatedAt: r.updated_at,
  };
}

function gradeToRow(g: Grade): SupabaseGradeRow {
  return {
    id: g.id, submission_id: g.submissionId,
    activity_id: g.activityId, student_id: g.studentId, course_id: g.courseId,
    score: g.score, max_score: g.maxScore,
    feedback: g.feedback ?? null,
    is_published: g.isPublished,
    published_at: g.publishedAt ?? null,
    graded_by: g.gradedBy, graded_at: g.gradedAt, updated_at: g.updatedAt,
  };
}

export async function supabaseReadGrades(): Promise<Grade[]> {
  const rows = await readAllRows<SupabaseGradeRow>('grades');
  return rows.map(rowToGrade);
}

export async function supabaseGetGradeById(id: string): Promise<Grade | null> {
  const row = await getOneRow<SupabaseGradeRow>('grades', 'id', id);
  return row ? rowToGrade(row) : null;
}

export async function supabaseReplaceGrades(items: Grade[]): Promise<void> {
  await replaceAllRows('grades', items.map(gradeToRow));
}

// ════════════════════════════════════════════════════════════════
// CORTES
// ════════════════════════════════════════════════════════════════

interface SupabaseCorteRow {
  id: string;
  course_id: string;
  name: string;
  weight: number;
  order: number;
  /* Añadidas después: en filas anteriores a la migración llegan como null. */
  start_date?: string | null;
  end_date?: string | null;
  report_deadline?: string | null;
  reported_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** La columna es DATE; el driver puede devolver Date o cadena. */
function toISODate(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToCorte(r: SupabaseCorteRow): Corte {
  return {
    id: r.id, courseId: r.course_id, name: r.name,
    weight: Number(r.weight), order: r.order,
    ...(toISODate(r.start_date) ? { startDate: toISODate(r.start_date)! } : {}),
    ...(toISODate(r.end_date) ? { endDate: toISODate(r.end_date)! } : {}),
    ...(toISODate(r.report_deadline) ? { reportDeadline: toISODate(r.report_deadline)! } : {}),
    /* Marca de tiempo completa, no fecha suelta: interesa cuándo se reportó. */
    ...(r.reported_at ? { reportedAt: String(r.reported_at) } : {}),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function corteToRow(c: Corte): SupabaseCorteRow {
  return {
    id: c.id, course_id: c.courseId, name: c.name,
    weight: c.weight, order: c.order,
    start_date: c.startDate ?? null,
    end_date: c.endDate ?? null,
    report_deadline: c.reportDeadline ?? null,
    reported_at: c.reportedAt ?? null,
    created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

export async function supabaseReadCortes(): Promise<Corte[]> {
  const rows = await readAllRows<SupabaseCorteRow>('cortes');
  return rows.map(rowToCorte);
}

export async function supabaseGetCorteById(id: string): Promise<Corte | null> {
  const row = await getOneRow<SupabaseCorteRow>('cortes', 'id', id);
  return row ? rowToCorte(row) : null;
}

/**
 * ¿Este error es "falta esta columna" y no otra cosa?
 *
 * Se exige el SQLSTATE 42703 además del nombre: sin el código, cualquier error
 * cuyo texto mencione la columna por casualidad haría que se dejara de
 * escribir un dato bueno.
 */
export function faltaColumna(e: unknown, columna: string): boolean {
  const err = e as { code?: string; message?: string } | null;
  const texto = `${err?.message ?? ''} ${String(e)}`;
  return err?.code === '42703' && texto.includes(columna);
}

/**
 * Escribir cortes tolera que aún falte `reported_at`.
 *
 * La columna llega con su migración, y entre desplegar el código y aplicarla
 * puede pasar un rato. Sin esta salvaguarda, durante ese rato el INSERT
 * mencionaría una columna que no existe y editar CUALQUIER corte devolvería un
 * 500: una función nueva a medio llegar no puede romper las que ya andaban.
 * No se memoriza el resultado a propósito: así, en cuanto se aplique la
 * migración, la marca empieza a guardarse sin esperar a que se recicle la
 * instancia. Escribir cortes es raro; el reintento no cuesta nada.
 */
export async function supabaseReplaceCortes(items: Corte[]): Promise<void> {
  const filas = items.map(corteToRow);
  try {
    await replaceAllRows('cortes', filas);
  } catch (e) {
    if (!faltaColumna(e, 'reported_at')) throw e;
    console.warn(
      '[supabase] falta la columna cortes.reported_at. Aplica la migración '
      + '"2026-09-corte-reportado" en Configuración › Base de datos; hasta entonces '
      + 'la marca de "notas reportadas" no se guarda.',
    );
    await replaceAllRows('cortes', filas.map((f) => {
      const sinColumna = { ...f };
      delete sinColumna.reported_at;
      return sinColumna;
    }));
  }
}

// ════════════════════════════════════════════════════════════════
// PROMPTS (AIPrompt)
// ════════════════════════════════════════════════════════════════

interface SupabasePromptRow {
  id: string;
  course_id: string;
  activity_id: string | null;
  title: string;
  content: string;
  version: number;
  tags: string[];
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

function rowToPrompt(r: SupabasePromptRow): AIPrompt {
  return {
    id: r.id, courseId: r.course_id, activityId: r.activity_id ?? undefined,
    title: r.title, content: r.content,
    version: r.version, tags: r.tags ?? [],
    isTemplate: r.is_template,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function promptToRow(p: AIPrompt): Record<string, unknown> {
  return {
    id: p.id, course_id: p.courseId, activity_id: p.activityId ?? null,
    title: p.title, content: p.content,
    version: p.version, tags: (p.tags ?? []),
    is_template: p.isTemplate,
    created_at: p.createdAt, updated_at: p.updatedAt,
  };
}

export async function supabaseReadPrompts(): Promise<AIPrompt[]> {
  const rows = await readAllRows<SupabasePromptRow>('prompts');
  return rows.map(rowToPrompt);
}

export async function supabaseGetPromptById(id: string): Promise<AIPrompt | null> {
  const row = await getOneRow<SupabasePromptRow>('prompts', 'id', id);
  return row ? rowToPrompt(row) : null;
}

export async function supabaseReplacePrompts(items: AIPrompt[]): Promise<void> {
  await replaceAllRows('prompts', items.map(promptToRow));
}

// ════════════════════════════════════════════════════════════════
// PROJECTS (StudentProject)
// ════════════════════════════════════════════════════════════════

interface SupabaseProjectRow {
  id: string;
  student_id: string;
  course_id: string;
  activity_id: string | null;
  project_name: string;
  description: string | null;
  github_url: string;
  vercel_url: string | null;
  figma_url: string | null;
  document_url: string | null;
  is_public: boolean;
  is_featured: boolean;
  is_blocked_from_showcase: boolean | null;
  showcase_description: string | null;
  showcase_image_url: string | null;
  status: StudentProject['status'];
  created_at: string;
  updated_at: string;
}

function rowToProject(r: SupabaseProjectRow): StudentProject {
  return {
    id: r.id, studentId: r.student_id, courseId: r.course_id,
    activityId: r.activity_id ?? undefined,
    projectName: r.project_name,
    description: r.description ?? undefined,
    githubUrl: r.github_url,
    vercelUrl: r.vercel_url ?? undefined,
    figmaUrl: r.figma_url ?? undefined,
    documentUrl: r.document_url ?? undefined,
    isPublic: r.is_public, isFeatured: r.is_featured,
    isBlockedFromShowcase: r.is_blocked_from_showcase ?? undefined,
    showcaseDescription: r.showcase_description ?? undefined,
    showcaseImageUrl: r.showcase_image_url ?? undefined,
    status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function projectToRow(p: StudentProject): SupabaseProjectRow {
  return {
    id: p.id, student_id: p.studentId, course_id: p.courseId,
    activity_id: p.activityId ?? null,
    project_name: p.projectName,
    description: p.description ?? null,
    github_url: p.githubUrl,
    vercel_url: p.vercelUrl ?? null,
    figma_url: p.figmaUrl ?? null,
    document_url: p.documentUrl ?? null,
    is_public: p.isPublic, is_featured: p.isFeatured,
    is_blocked_from_showcase: p.isBlockedFromShowcase ?? null,
    showcase_description: p.showcaseDescription ?? null,
    showcase_image_url: p.showcaseImageUrl ?? null,
    status: p.status,
    created_at: p.createdAt, updated_at: p.updatedAt,
  };
}

export async function supabaseReadProjects(): Promise<StudentProject[]> {
  const rows = await readAllRows<SupabaseProjectRow>('projects');
  return rows.map(rowToProject);
}

export async function supabaseGetProjectById(id: string): Promise<StudentProject | null> {
  const row = await getOneRow<SupabaseProjectRow>('projects', 'id', id);
  return row ? rowToProject(row) : null;
}

/**
 * Cambia UN proyecto, sin tocar los demás.
 *
 * Los estudiantes editan su proyecto y suben su imagen alrededor de las mismas
 * fechas de entrega. Reescribir la tabla entera para guardar un campo se lleva
 * por delante lo que otro guardó en ese instante: el mismo fallo de los
 * intentos de parcial y de las entregas.
 */
export async function supabaseUpdateProject(
  id: string,
  patch: Partial<StudentProject>,
): Promise<void> {
  const sb = requireSupabaseClient();
  const fila: Record<string, unknown> = { updated_at: nowColombiaISO() };
  if (patch.showcaseImageUrl !== undefined) fila.showcase_image_url = patch.showcaseImageUrl || null;
  if (patch.showcaseDescription !== undefined) fila.showcase_description = patch.showcaseDescription || null;
  if (patch.documentUrl !== undefined) fila.document_url = patch.documentUrl || null;
  if (patch.isPublic !== undefined) fila.is_public = patch.isPublic;

  const { error } = await sb.from('projects').update(fila).eq('id', id);
  if (error) throw new Error(`[supabase] update projects ${id}: ${error.message}`);
}

export async function supabaseReplaceProjects(items: StudentProject[]): Promise<void> {
  await replaceAllRows('projects', items.map(projectToRow));
}

// ════════════════════════════════════════════════════════════════
// QUIZZES
// ════════════════════════════════════════════════════════════════

interface SupabaseQuizRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: Quiz['type'];
  result_visibility: Quiz['resultVisibility'];
  results_released: boolean;
  questions: QuizQuestion[];
  time_limit: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  max_attempts: number;
  lock_browser: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  weight: number | null;
  corte_id: string | null;
  max_score: number | null;
  created_at: string;
  updated_at: string;
}

function rowToQuiz(r: SupabaseQuizRow): Quiz {
  return {
    id: r.id, courseId: r.course_id,
    title: r.title, description: r.description ?? undefined,
    type: r.type, resultVisibility: r.result_visibility,
    resultsReleased: r.results_released,
    questions: r.questions ?? [],
    timeLimit: r.time_limit ?? undefined,
    shuffleQuestions: r.shuffle_questions, shuffleOptions: r.shuffle_options,
    maxAttempts: r.max_attempts, lockBrowser: r.lock_browser,
    isActive: r.is_active,
    startDate: r.start_date ?? undefined, endDate: r.end_date ?? undefined,
    weight: r.weight === null ? undefined : Number(r.weight),
    corteId: r.corte_id ?? undefined,
    maxScore: r.max_score === null ? undefined : Number(r.max_score),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function quizToRow(q: Quiz): Record<string, unknown> {
  return {
    id: q.id, course_id: q.courseId,
    title: q.title, description: q.description ?? null,
    type: q.type, result_visibility: q.resultVisibility,
    results_released: q.resultsReleased,
    questions: (q.questions ?? []),
    time_limit: q.timeLimit ?? null,
    shuffle_questions: q.shuffleQuestions, shuffle_options: q.shuffleOptions,
    max_attempts: q.maxAttempts, lock_browser: q.lockBrowser,
    is_active: q.isActive,
    start_date: q.startDate ?? null, end_date: q.endDate ?? null,
    weight: q.weight ?? null, corte_id: q.corteId ?? null,
    max_score: q.maxScore ?? null,
    created_at: q.createdAt, updated_at: q.updatedAt,
  };
}

export async function supabaseReadQuizzes(): Promise<Quiz[]> {
  const rows = await readAllRows<SupabaseQuizRow>('quizzes');
  return rows.map(rowToQuiz);
}

export async function supabaseGetQuizById(id: string): Promise<Quiz | null> {
  const row = await getOneRow<SupabaseQuizRow>('quizzes', 'id', id);
  return row ? rowToQuiz(row) : null;
}

export async function supabaseReplaceQuizzes(items: Quiz[]): Promise<void> {
  await replaceAllRows('quizzes', items.map(quizToRow));
}

// ════════════════════════════════════════════════════════════════
// QUIZ ATTEMPTS
// ════════════════════════════════════════════════════════════════

interface SupabaseQuizAttemptRow {
  id: string;
  quiz_id: string;
  student_id: string;
  course_id: string;
  answers: QuizAnswer[];
  score: number;
  max_score: number;
  percentage: number;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  blur_count: number;
  auto_submitted: boolean;
  flagged: boolean;
}

function rowToQuizAttempt(r: SupabaseQuizAttemptRow): QuizAttempt {
  return {
    id: r.id, quizId: r.quiz_id, studentId: r.student_id, courseId: r.course_id,
    answers: r.answers ?? [],
    score: Number(r.score), maxScore: Number(r.max_score), percentage: Number(r.percentage),
    attemptNumber: r.attempt_number,
    startedAt: r.started_at, completedAt: r.completed_at ?? undefined,
    blurCount: r.blur_count, autoSubmitted: r.auto_submitted, flagged: r.flagged,
  };
}

function quizAttemptToRow(a: QuizAttempt): Record<string, unknown> {
  return {
    id: a.id, quiz_id: a.quizId, student_id: a.studentId, course_id: a.courseId,
    answers: (a.answers ?? []),
    score: a.score, max_score: a.maxScore, percentage: a.percentage,
    attempt_number: a.attemptNumber,
    started_at: a.startedAt, completed_at: a.completedAt ?? null,
    blur_count: a.blurCount, auto_submitted: a.autoSubmitted, flagged: a.flagged,
  };
}

/**
 * supabaseRunStatements — Aplica sentencias de esquema, en una transacción.
 *
 * SOLO para las migraciones declaradas en lib/migrations.ts. No hay ninguna
 * ruta por la que el cliente pueda enviar sentencias: la API recibe el ID de
 * una migración y el texto sale de aquí, del repositorio, donde se revisó en
 * un commit. Una caja de texto libre contra producción sería otra cosa.
 *
 * Todo o nada: si una falla, no queda nada aplicado a medias.
 */
export async function supabaseRunStatements(statements: string[]): Promise<void> {
  await conPg(async (sql) => {
    await sql.begin(async (tx) => {
      for (const stmt of statements) await tx.unsafe(stmt);
    });
    // PostgREST cachea el esquema: sin esto el cliente JS no ve lo nuevo.
    await sql`NOTIFY pgrst, 'reload schema'`;
  });
}

/**
 * supabaseTableStats — Existencia y número de filas de cada tabla.
 *
 * El chequeo anterior (/api/admin/supabase-migrate) solo miraba `users`, así
 * que decía "conectado" con quince tablas sin comprobar. Se resuelve en dos
 * viajes y no en dieciséis: uno para saber qué tablas hay y otro en paralelo
 * para contar, porque contra Supabase la latencia por consulta se nota.
 */
export async function supabaseTableStats(
  tables: string[],
): Promise<{ present: string[]; counts: Record<string, number> }> {
  const sb = requireSupabaseClient();

  /*
   * Por el mismo camino que todo lo demás, no por conexión directa.
   *
   * La primera versión consultaba information_schema con el pool de Postgres.
   * En local funcionaba; en Vercel la pantalla se quedaba cargando quince
   * segundos —el connect_timeout— y se caía, porque desde allí la conexión
   * directa no llega. Todo el resto de la aplicación va por PostgREST, así
   * que esto también.
   *
   * `head: true` no trae ninguna fila, solo la cuenta: las dieciséis salen en
   * menos de un segundo.
   */
  const resultados = await Promise.all(tables.map(async (t) => {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    // count null = la tabla no existe. count 0 = existe y está vacía.
    return { table: t, exists: count !== null, n: count ?? 0 };
  }));

  const present = resultados.filter((r) => r.exists).map((r) => r.table);
  const counts: Record<string, number> = {};
  for (const r of resultados) if (r.exists) counts[r.table] = r.n;

  return { present, counts };
}

/**
 * ¿Existe esta columna? Sonda por PostgREST, sin conexión directa.
 *
 * Pedir una columna que no existe devuelve el error 42703 de Postgres. Es la
 * forma de comprobar una migración sin depender del pool, que desde Vercel no
 * responde.
 */
export async function supabaseColumnExists(table: string, column: string): Promise<boolean> {
  const sb = requireSupabaseClient();
  const { error } = await sb.from(table).select(column).limit(1);
  if (!error) return true;
  if (error.code === '42703') return false;
  throw new Error(`No se pudo comprobar ${table}.${column}: ${error.message}`);
}

export async function supabaseReadQuizAttempts(): Promise<QuizAttempt[]> {
  const rows = await readAllRows<SupabaseQuizAttemptRow>('quiz_attempts');
  return rows.map(rowToQuizAttempt);
}

export async function supabaseReplaceQuizAttempts(items: QuizAttempt[]): Promise<void> {
  await replaceAllRows('quiz_attempts', items.map(quizAttemptToRow));
}

/**
 * Añade UN intento, sin tocar los demás.
 *
 * El envío de un parcial venía haciendo lo que se hacía contra el Blob: leer
 * los intentos, empujar el nuevo y reescribir la colección entera. Contra un
 * fichero era lo único posible; contra Postgres es una carrera. Veinte
 * estudiantes enviando cerca de la hora límite se reparten en varias
 * instancias serverless —el cerrojo de blobSync solo serializa dentro de una—,
 * dos leen los mismos N intentos, cada una escribe N+1, y el segundo DELETE
 * se lleva por delante el intento del primero. Sin error y sin rastro: el
 * estudiante ve "enviado" y su parcial no existe.
 *
 * Un INSERT de una fila no puede perder nada de nadie.
 */
export async function supabaseInsertQuizAttempt(attempt: QuizAttempt): Promise<void> {
  await insertOneRow('quiz_attempts', quizAttemptToRow(attempt));
}

/** Los ceros por no presentar: se añaden los nuevos, no se reescribe la tabla. */
export async function supabaseInsertQuizAttempts(items: QuizAttempt[]): Promise<void> {
  await insertRows('quiz_attempts', items.map(quizAttemptToRow));
}

/** Deshacer un cero por no presentar: borra esas filas y solo esas. */
export async function supabaseDeleteQuizAttempts(ids: string[]): Promise<void> {
  await deleteRowsById('quiz_attempts', ids);
}

// ════════════════════════════════════════════════════════════════
// QUIZ SIMULATIONS
// ════════════════════════════════════════════════════════════════

interface SupabaseQuizSimulationRow {
  id: string;
  quiz_id: string;
  course_id: string;
  admin_id: string;
  admin_name: string;
  quiz_title: string;
  answers: QuizAnswer[];
  score: number;
  max_score: number;
  percentage: number;
  blur_count: number;
  auto_submitted: boolean;
  simulated_at: string;
}

function rowToQuizSimulation(r: SupabaseQuizSimulationRow): QuizSimulation {
  return {
    id: r.id, quizId: r.quiz_id, courseId: r.course_id,
    adminId: r.admin_id, adminName: r.admin_name, quizTitle: r.quiz_title,
    answers: r.answers ?? [],
    score: Number(r.score), maxScore: Number(r.max_score), percentage: Number(r.percentage),
    blurCount: r.blur_count, autoSubmitted: r.auto_submitted,
    simulatedAt: r.simulated_at,
  };
}

function quizSimulationToRow(s: QuizSimulation): Record<string, unknown> {
  return {
    id: s.id, quiz_id: s.quizId, course_id: s.courseId,
    admin_id: s.adminId, admin_name: s.adminName, quiz_title: s.quizTitle,
    answers: (s.answers ?? []),
    score: s.score, max_score: s.maxScore, percentage: s.percentage,
    blur_count: s.blurCount, auto_submitted: s.autoSubmitted,
    simulated_at: s.simulatedAt,
  };
}

export async function supabaseReadQuizSimulations(): Promise<QuizSimulation[]> {
  const rows = await readAllRows<SupabaseQuizSimulationRow>('quiz_simulations');
  return rows.map(rowToQuizSimulation);
}

export async function supabaseReplaceQuizSimulations(items: QuizSimulation[]): Promise<void> {
  await replaceAllRows('quiz_simulations', items.map(quizSimulationToRow));
}

/** Añade UNA simulación. Mismo motivo que en los intentos. */
export async function supabaseInsertQuizSimulation(sim: QuizSimulation): Promise<void> {
  await insertOneRow('quiz_simulations', quizSimulationToRow(sim));
}

// ════════════════════════════════════════════════════════════════
// MANUAL GRADE ITEMS
// ════════════════════════════════════════════════════════════════

interface SupabaseManualGradeItemRow {
  id: string;
  course_id: string;
  corte_id: string | null;
  title: string;
  description: string | null;
  max_score: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

function rowToManualGradeItem(r: SupabaseManualGradeItemRow): ManualGradeItem {
  return {
    id: r.id, courseId: r.course_id,
    corteId: r.corte_id ?? undefined,
    title: r.title, description: r.description ?? undefined,
    maxScore: Number(r.max_score), weight: Number(r.weight),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function manualGradeItemToRow(m: ManualGradeItem): SupabaseManualGradeItemRow {
  return {
    id: m.id, course_id: m.courseId,
    corte_id: m.corteId ?? null,
    title: m.title, description: m.description ?? null,
    max_score: m.maxScore, weight: m.weight,
    created_at: m.createdAt, updated_at: m.updatedAt,
  };
}

export async function supabaseReadManualGradeItems(): Promise<ManualGradeItem[]> {
  const rows = await readAllRows<SupabaseManualGradeItemRow>('manual_grade_items');
  return rows.map(rowToManualGradeItem);
}

export async function supabaseReplaceManualGradeItems(items: ManualGradeItem[]): Promise<void> {
  await replaceAllRows('manual_grade_items', items.map(manualGradeItemToRow));
}

// ════════════════════════════════════════════════════════════════
// MANUAL GRADES
// ════════════════════════════════════════════════════════════════

interface SupabaseManualGradeRow {
  id: string;
  item_id: string;
  student_id: string;
  course_id: string;
  score: number;
  max_score: number;
  feedback: string | null;
  is_published: boolean | null;
  graded_by: string;
  graded_at: string;
  updated_at: string;
}

function rowToManualGrade(r: SupabaseManualGradeRow): ManualGrade {
  return {
    id: r.id, itemId: r.item_id, studentId: r.student_id, courseId: r.course_id,
    score: Number(r.score), maxScore: Number(r.max_score),
    feedback: r.feedback ?? undefined,
    // Si la columna todavía no existe, lo guardado antes se considera
    // publicado: así el despliegue no le esconde notas a nadie.
    isPublished: r.is_published ?? true,
    gradedBy: r.graded_by, gradedAt: r.graded_at, updatedAt: r.updated_at,
  };
}

function manualGradeToRow(g: ManualGrade): SupabaseManualGradeRow {
  return {
    id: g.id, item_id: g.itemId, student_id: g.studentId, course_id: g.courseId,
    score: g.score, max_score: g.maxScore,
    feedback: g.feedback ?? null,
    is_published: g.isPublished ?? true,
    graded_by: g.gradedBy, graded_at: g.gradedAt, updated_at: g.updatedAt,
  };
}

export async function supabaseReadManualGrades(): Promise<ManualGrade[]> {
  const rows = await readAllRows<SupabaseManualGradeRow>('manual_grades');
  return rows.map(rowToManualGrade);
}

export async function supabaseReplaceManualGrades(items: ManualGrade[]): Promise<void> {
  await replaceAllRows('manual_grades', items.map(manualGradeToRow));
}

// ════════════════════════════════════════════════════════════════
// AUDIT LOG (append-only)
// ════════════════════════════════════════════════════════════════

interface SupabaseAuditRow {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entity_id: string | null;
  user_id: string;
  user_name: string | null;
  details: string | null;
  metadata: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
}

function rowToAuditEntry(r: SupabaseAuditRow): AuditEntry {
  return {
    id: r.id, timestamp: r.timestamp,
    action: r.action, entity: r.entity,
    entityId: r.entity_id ?? undefined,
    userId: r.user_id, userName: r.user_name ?? undefined,
    details: r.details ?? undefined,
    metadata: r.metadata ?? undefined,
    before: r.before_state ?? undefined,
    after: r.after_state ?? undefined,
    ip: r.ip ?? undefined,
    userAgent: r.user_agent ?? undefined,
  };
}

function auditEntryToRow(e: AuditEntry): Record<string, unknown> {
  return {
    id: e.id, timestamp: e.timestamp,
    action: e.action, entity: e.entity,
    entity_id: e.entityId ?? null,
    user_id: e.userId, user_name: e.userName ?? null,
    details: e.details ?? null,
    metadata: e.metadata ?? null,
    before_state: e.before ?? null,
    after_state: e.after ?? null,
    ip: e.ip ?? null,
    user_agent: e.userAgent ?? null,
  };
}

export async function supabaseReadAuditLog(limit = 1000): Promise<AuditEntry[]> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`[supabase] readAudit: ${error.message}`);
  return (data ?? []).map((r) => rowToAuditEntry(r as SupabaseAuditRow));
}

export async function supabaseInsertAuditEntry(entry: AuditEntry): Promise<void> {
  await insertOneRow('audit_log', auditEntryToRow(entry));
}

// ════════════════════════════════════════════════════════════════
// APP SETTINGS (config + home)
// ════════════════════════════════════════════════════════════════

interface SupabaseAppSettingRow {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export async function supabaseReadAppSetting<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const row = await getOneRow<SupabaseAppSettingRow>('app_settings', 'key', key);
  return row ? (row.value as T) : null;
}

export async function supabaseUpsertAppSetting(key: string, value: Record<string, unknown>): Promise<void> {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('app_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key', ignoreDuplicates: false },
    );
  if (error) throw new Error(`[supabase] upsertAppSetting(${key}): ${error.message}`);
}

export async function supabaseReadConfig(): Promise<AppConfig | null> {
  return supabaseReadAppSetting<AppConfig>('config');
}

export async function supabaseReadHome(): Promise<HomeData | null> {
  return supabaseReadAppSetting<HomeData>('home');
}

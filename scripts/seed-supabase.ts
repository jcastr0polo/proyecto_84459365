/**
 * scripts/seed-supabase.ts
 *
 * One-shot seed: create all Supabase tables and import data from
 * `doc/blob-export-all.json` (the export produced by /admin/blob-sync "Descargar TODO").
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS and INSERT ... ON CONFLICT DO UPDATE.
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts                 # uses doc/blob-export-all.json
 *   npx tsx scripts/seed-supabase.ts path/to/file.json
 *
 * Requires .env.local with SUPABASE_NEXUS_POSTGRES_URL (or SUPABASE_NEXUS_POSTGRES_URL_NON_POOLING).
 */

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// ── env loader ─────────────────────────────────────────────────

function loadEnv(filename: string): void {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnv('.env.local');

// ── DDL ────────────────────────────────────────────────────────

const DDL = `
-- Users (already exists, keep as-is)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Semesters
CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  semester_id TEXT NOT NULL,
  category TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester_id);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  enrolled_at TEXT NOT NULL,
  enrolled_by TEXT NOT NULL,
  withdrawn_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_course_student ON enrollments(course_id, student_id);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  corte_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_id TEXT,
  due_date TEXT NOT NULL,
  due_time TEXT,
  publish_date TEXT NOT NULL,
  publish_time TEXT,
  max_score NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  late_penalty_percent NUMERIC,
  status TEXT NOT NULL,
  requires_file_upload BOOLEAN NOT NULL DEFAULT false,
  requires_link_submission BOOLEAN NOT NULL DEFAULT false,
  project_required BOOLEAN,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);
CREATE INDEX IF NOT EXISTS idx_activities_corte ON activities(corte_id);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  content TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TEXT NOT NULL,
  is_late BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_activity ON submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  feedback TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TEXT,
  graded_by TEXT NOT NULL,
  graded_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grades_activity ON grades(activity_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_submission ON grades(submission_id);

-- Cortes
CREATE TABLE IF NOT EXISTS cortes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cortes_course ON cortes(course_id);

-- Prompts (AIPrompt)
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  activity_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompts_course ON prompts(course_id);
CREATE INDEX IF NOT EXISTS idx_prompts_activity ON prompts(activity_id);

-- Projects (StudentProject)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  activity_id TEXT,
  project_name TEXT NOT NULL,
  description TEXT,
  github_url TEXT NOT NULL,
  vercel_url TEXT,
  figma_url TEXT,
  document_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_blocked_from_showcase BOOLEAN,
  showcase_description TEXT,
  showcase_image_url TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_course ON projects(course_id);
CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  result_visibility TEXT NOT NULL,
  results_released BOOLEAN NOT NULL DEFAULT false,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit INTEGER,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  lock_browser BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_date TEXT,
  end_date TEXT,
  weight NUMERIC,
  corte_id TEXT,
  max_score NUMERIC,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  attempt_number INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  blur_count INTEGER NOT NULL DEFAULT 0,
  auto_submitted BOOLEAN NOT NULL DEFAULT false,
  flagged BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);

-- Quiz simulations
CREATE TABLE IF NOT EXISTS quiz_simulations (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  blur_count INTEGER NOT NULL DEFAULT 0,
  auto_submitted BOOLEAN NOT NULL DEFAULT false,
  simulated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_simulations_quiz ON quiz_simulations(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_simulations_admin ON quiz_simulations(admin_id);

-- Manual grade items
CREATE TABLE IF NOT EXISTS manual_grade_items (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  corte_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_manual_grade_items_course ON manual_grade_items(course_id);

-- Manual grades
CREATE TABLE IF NOT EXISTS manual_grades (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  feedback TEXT,
  graded_by TEXT NOT NULL,
  graded_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_manual_grades_item ON manual_grades(item_id);
CREATE INDEX IF NOT EXISTS idx_manual_grades_student ON manual_grades(student_id);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT,
  details TEXT,
  metadata JSONB,
  before_state JSONB,
  after_state JSONB,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);

-- App settings (key/value: config + home)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TEXT NOT NULL DEFAULT now()::text
);
`;

const RLS = `
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','sessions','semesters','courses','enrollments','activities','submissions',
    'grades','cortes','prompts','projects','quizzes','quiz_attempts','quiz_simulations',
    'manual_grade_items','manual_grades','audit_log','app_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_all') THEN
      EXECUTE format('CREATE POLICY service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
`;

// ── Row type helper ────────────────────────────────────────────

type Row = Record<string, unknown>;

// nil → null shorthand: turn undefined into null (Postgres-friendly)
function n<T>(v: T | undefined | null): T | null {
  return v === undefined || v === null ? null : v;
}

// ── Per-entity mappers (object → snake_case row) ───────────────

function mapUser(u: Record<string, unknown>): Row {
  return {
    id: u.id,
    email: u.email,
    password_hash: u.passwordHash,
    role: u.role,
    must_change_password: u.mustChangePassword ?? true,
    first_name: u.firstName,
    last_name: u.lastName,
    document_number: u.documentNumber,
    phone: n(u.phone as string | undefined),
    is_active: u.isActive ?? true,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
    last_login_at: n(u.lastLoginAt as string | undefined),
  };
}

function mapSession(s: Record<string, unknown>): Row {
  return {
    id: s.id,
    user_id: s.userId,
    created_at: s.createdAt,
    expires_at: s.expiresAt,
    ip_address: n(s.ipAddress as string | undefined),
    user_agent: n(s.userAgent as string | undefined),
  };
}

function mapSemester(s: Record<string, unknown>): Row {
  return {
    id: s.id,
    label: s.label,
    start_date: s.startDate,
    end_date: s.endDate,
    is_active: s.isActive ?? false,
    created_at: s.createdAt,
  };
}

function mapCourse(c: Record<string, unknown>): Row {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description ?? '',
    semester_id: c.semesterId,
    category: c.category,
    schedule: (c.schedule ?? []),
    is_active: c.isActive ?? true,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function mapEnrollment(e: Record<string, unknown>): Row {
  return {
    id: e.id,
    course_id: e.courseId,
    student_id: e.studentId,
    status: e.status,
    enrolled_at: e.enrolledAt,
    enrolled_by: e.enrolledBy,
    withdrawn_at: n(e.withdrawnAt as string | undefined),
  };
}

function mapActivity(a: Record<string, unknown>): Row {
  return {
    id: a.id,
    course_id: a.courseId,
    corte_id: n(a.corteId as string | undefined),
    title: a.title,
    description: a.description ?? '',
    type: a.type,
    category: a.category,
    attachments: (a.attachments ?? []),
    prompt_id: n(a.promptId as string | undefined),
    due_date: a.dueDate,
    due_time: n(a.dueTime as string | undefined),
    publish_date: a.publishDate,
    publish_time: n(a.publishTime as string | undefined),
    max_score: a.maxScore,
    weight: a.weight,
    allow_late_submission: a.allowLateSubmission ?? false,
    late_penalty_percent: n(a.latePenaltyPercent as number | undefined),
    status: a.status,
    requires_file_upload: a.requiresFileUpload ?? false,
    requires_link_submission: a.requiresLinkSubmission ?? false,
    project_required: n(a.projectRequired as boolean | undefined),
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

function mapSubmission(s: Record<string, unknown>): Row {
  return {
    id: s.id,
    activity_id: s.activityId,
    student_id: s.studentId,
    course_id: s.courseId,
    content: n(s.content as string | undefined),
    attachments: (s.attachments ?? []),
    links: (s.links ?? []),
    submitted_at: s.submittedAt,
    is_late: s.isLate ?? false,
    status: s.status,
    version: s.version ?? 1,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function mapGrade(g: Record<string, unknown>): Row {
  return {
    id: g.id,
    submission_id: g.submissionId,
    activity_id: g.activityId,
    student_id: g.studentId,
    course_id: g.courseId,
    score: g.score,
    max_score: g.maxScore,
    feedback: n(g.feedback as string | undefined),
    is_published: g.isPublished ?? false,
    published_at: n(g.publishedAt as string | undefined),
    graded_by: g.gradedBy,
    graded_at: g.gradedAt,
    updated_at: g.updatedAt,
  };
}

function mapCorte(c: Record<string, unknown>): Row {
  return {
    id: c.id,
    course_id: c.courseId,
    name: c.name,
    weight: c.weight,
    order: c.order,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function mapPrompt(p: Record<string, unknown>): Row {
  return {
    id: p.id,
    course_id: p.courseId,
    activity_id: n(p.activityId as string | undefined),
    title: p.title,
    content: p.content,
    version: p.version ?? 1,
    tags: (p.tags ?? []),
    is_template: p.isTemplate ?? false,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function mapProject(p: Record<string, unknown>): Row {
  return {
    id: p.id,
    student_id: p.studentId,
    course_id: p.courseId,
    activity_id: n(p.activityId as string | undefined),
    project_name: p.projectName,
    description: n(p.description as string | undefined),
    github_url: p.githubUrl,
    vercel_url: n(p.vercelUrl as string | undefined),
    figma_url: n(p.figmaUrl as string | undefined),
    document_url: n(p.documentUrl as string | undefined),
    is_public: p.isPublic ?? false,
    is_featured: p.isFeatured ?? false,
    is_blocked_from_showcase: n(p.isBlockedFromShowcase as boolean | undefined),
    showcase_description: n(p.showcaseDescription as string | undefined),
    showcase_image_url: n(p.showcaseImageUrl as string | undefined),
    status: p.status ?? 'in-progress',
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function mapQuiz(q: Record<string, unknown>): Row {
  return {
    id: q.id,
    course_id: q.courseId,
    title: q.title,
    description: n(q.description as string | undefined),
    type: q.type,
    result_visibility: q.resultVisibility,
    results_released: q.resultsReleased ?? false,
    questions: (q.questions ?? []),
    time_limit: n(q.timeLimit as number | undefined),
    shuffle_questions: q.shuffleQuestions ?? false,
    shuffle_options: q.shuffleOptions ?? false,
    max_attempts: q.maxAttempts ?? 1,
    lock_browser: q.lockBrowser ?? false,
    is_active: q.isActive ?? false,
    start_date: n(q.startDate as string | undefined),
    end_date: n(q.endDate as string | undefined),
    weight: n(q.weight as number | undefined),
    corte_id: n(q.corteId as string | undefined),
    max_score: n(q.maxScore as number | undefined),
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}

function mapQuizAttempt(a: Record<string, unknown>): Row {
  return {
    id: a.id,
    quiz_id: a.quizId,
    student_id: a.studentId,
    course_id: a.courseId,
    answers: (a.answers ?? []),
    score: a.score,
    max_score: a.maxScore,
    percentage: a.percentage,
    attempt_number: a.attemptNumber ?? 1,
    started_at: a.startedAt,
    completed_at: n(a.completedAt as string | undefined),
    blur_count: a.blurCount ?? 0,
    auto_submitted: a.autoSubmitted ?? false,
    flagged: a.flagged ?? false,
  };
}

function mapQuizSimulation(s: Record<string, unknown>): Row {
  return {
    id: s.id,
    quiz_id: s.quizId,
    course_id: s.courseId,
    admin_id: s.adminId,
    admin_name: s.adminName,
    quiz_title: s.quizTitle,
    answers: (s.answers ?? []),
    score: s.score,
    max_score: s.maxScore,
    percentage: s.percentage,
    blur_count: s.blurCount ?? 0,
    auto_submitted: s.autoSubmitted ?? false,
    simulated_at: s.simulatedAt,
  };
}

function mapManualGradeItem(m: Record<string, unknown>): Row {
  return {
    id: m.id,
    course_id: m.courseId,
    corte_id: n(m.corteId as string | undefined),
    title: m.title,
    description: n(m.description as string | undefined),
    max_score: m.maxScore,
    weight: m.weight,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

function mapManualGrade(g: Record<string, unknown>): Row {
  return {
    id: g.id,
    item_id: g.itemId,
    student_id: g.studentId,
    course_id: g.courseId,
    score: g.score,
    max_score: g.maxScore,
    feedback: n(g.feedback as string | undefined),
    graded_by: g.gradedBy,
    graded_at: g.gradedAt,
    updated_at: g.updatedAt,
  };
}

function mapAudit(a: Record<string, unknown>): Row {
  return {
    id: a.id,
    timestamp: a.timestamp,
    action: a.action,
    entity: a.entity,
    entity_id: n(a.entityId as string | undefined),
    user_id: a.userId,
    user_name: n(a.userName as string | undefined),
    details: n(a.details as string | undefined),
    metadata: a.metadata ?? null,
    before_state: a.before ?? null,
    after_state: a.after ?? null,
    ip: n(a.ip as string | undefined),
    user_agent: n(a.userAgent as string | undefined),
  };
}

// ── Generic upsert helper ──────────────────────────────────────

type Sql = ReturnType<typeof postgres>;

async function upsertBatch(
  sql: Sql,
  table: string,
  rows: Row[],
  pk: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const cols = Object.keys(rows[0]);
  const updateCols = cols.filter((c) => c !== pk);
  const setClause = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');

  // Chunk to avoid huge single statements (audit_log has 385+ rows).
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    if (updateCols.length === 0) {
      await sql`INSERT INTO ${sql(table)} ${sql(chunk, ...cols)} ON CONFLICT (${sql(pk)}) DO NOTHING`;
    } else {
      await sql.unsafe(
        `INSERT INTO "${table}" ${'${VALUES}'} ON CONFLICT ("${pk}") DO UPDATE SET ${setClause}`
          .replace(
            '${VALUES}',
            `(${cols.map((c) => `"${c}"`).join(', ')}) VALUES ` +
              chunk
                .map(
                  (_, ri) =>
                    `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`,
                )
                .join(', '),
          ),
        chunk.flatMap((r) => cols.map((c) => (r[c] === undefined ? null : r[c]))) as never[],
      );
    }
    total += chunk.length;
  }
  return total;
}

// ── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const seedPath = process.argv[2] ?? 'doc/blob-export-all.json';
  const absSeedPath = path.resolve(process.cwd(), seedPath);

  if (!fs.existsSync(absSeedPath)) {
    console.error(`✗ Seed file not found: ${absSeedPath}`);
    process.exit(1);
  }

  const connString =
    process.env.SUPABASE_NEXUS_POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_NEXUS_POSTGRES_URL;

  if (!connString) {
    console.error('✗ SUPABASE_NEXUS_POSTGRES_URL not set. Check .env.local.');
    process.exit(1);
  }

  console.log(`→ Reading seed: ${absSeedPath}`);
  const raw = fs.readFileSync(absSeedPath, 'utf-8');
  const seed = JSON.parse(raw) as Record<string, unknown>;

  console.log(`→ Connecting to Postgres…`);
  const sql = postgres(connString, {
    ssl: 'require',
    connect_timeout: 20,
    idle_timeout: 5,
    max: 4,
  });

  try {
    console.log(`→ Running DDL (CREATE TABLE IF NOT EXISTS × 18)…`);
    await sql.unsafe(DDL);
    console.log(`→ Enabling RLS + policies…`);
    await sql.unsafe(RLS);

    type Job = {
      label: string;
      table: string;
      pk: string;
      rows: Row[];
    };

    const arr = (k: string): Record<string, unknown>[] =>
      Array.isArray(seed[k]) ? (seed[k] as Record<string, unknown>[]) : [];

    const jobs: Job[] = [
      { label: 'users',                table: 'users',               pk: 'id',  rows: arr('users.json').map(mapUser) },
      { label: 'semesters',            table: 'semesters',           pk: 'id',  rows: arr('semesters.json').map(mapSemester) },
      { label: 'courses',              table: 'courses',             pk: 'id',  rows: arr('courses.json').map(mapCourse) },
      { label: 'sessions',             table: 'sessions',            pk: 'id',  rows: arr('sessions.json').map(mapSession) },
      { label: 'cortes',               table: 'cortes',              pk: 'id',  rows: arr('cortes.json').map(mapCorte) },
      { label: 'enrollments',          table: 'enrollments',         pk: 'id',  rows: arr('enrollments.json').map(mapEnrollment) },
      { label: 'activities',           table: 'activities',          pk: 'id',  rows: arr('activities.json').map(mapActivity) },
      { label: 'submissions',          table: 'submissions',         pk: 'id',  rows: arr('submissions.json').map(mapSubmission) },
      { label: 'grades',               table: 'grades',              pk: 'id',  rows: arr('grades.json').map(mapGrade) },
      { label: 'prompts',              table: 'prompts',             pk: 'id',  rows: arr('prompts.json').map(mapPrompt) },
      { label: 'projects',             table: 'projects',            pk: 'id',  rows: arr('projects.json').map(mapProject) },
      { label: 'quizzes',              table: 'quizzes',             pk: 'id',  rows: arr('quizzes.json').map(mapQuiz) },
      { label: 'quiz_attempts',        table: 'quiz_attempts',       pk: 'id',  rows: arr('quiz-attempts.json').map(mapQuizAttempt) },
      { label: 'quiz_simulations',     table: 'quiz_simulations',    pk: 'id',  rows: arr('quiz-simulations.json').map(mapQuizSimulation) },
      { label: 'manual_grade_items',   table: 'manual_grade_items',  pk: 'id',  rows: arr('manual-grade-items.json').map(mapManualGradeItem) },
      { label: 'manual_grades',        table: 'manual_grades',       pk: 'id',  rows: arr('manual-grades.json').map(mapManualGrade) },
      { label: 'audit_log',            table: 'audit_log',           pk: 'id',  rows: arr('audit.json').map(mapAudit) },
    ];

    console.log(`\n→ Importing data:\n`);
    for (const job of jobs) {
      try {
        const n = await upsertBatch(sql, job.table, job.rows, job.pk);
        console.log(`  ✓ ${job.label.padEnd(22)} ${String(n).padStart(4)} row(s)`);
      } catch (err) {
        console.error(`  ✗ ${job.label}: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }

    // app_settings: config + home
    const settingsRows: Row[] = [];
    if (seed['config.json']) {
      settingsRows.push({
        key: 'config',
        value: (seed['config.json'] as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      });
    }
    if (seed['home.json']) {
      settingsRows.push({
        key: 'home',
        value: (seed['home.json'] as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      });
    }
    const settingsCount = await upsertBatch(sql, 'app_settings', settingsRows, 'key');
    console.log(`  ✓ ${'app_settings'.padEnd(22)} ${String(settingsCount).padStart(4)} row(s)`);

    console.log(`\n✓ Seed complete.\n`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err);
  process.exit(1);
});

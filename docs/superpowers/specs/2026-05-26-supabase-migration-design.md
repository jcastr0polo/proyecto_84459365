# Supabase migration design — Vercel Blob → Postgres

**Date:** 2026-05-26
**Status:** Approved, in implementation
**Owner:** Jhonatan Castro

## Goal

Move the platform's structured data from Vercel Blob (JSON-per-collection) to Supabase Postgres. Keep Vercel Blob exclusively for user-uploaded files. Single source of truth: Supabase.

## Decisions (from brainstorming)

| # | Decision |
|---|----------|
| 1 | **Big-bang cutover.** No automatic fallback. If Supabase is down, the app fails loudly. |
| 2 | **Migrate everything,** including `sessions`, `audit`, `config`, `home`. The latter two collapse into an `app_settings` key/value table. |
| 3 | **JSONB for nested arrays** (attachments, links, schedule, quiz questions, answers). One row per top-level entity. |
| 4 | **Local seed script** (`scripts/seed-supabase.ts`). One-shot, idempotent. |
| 5 | **Conserve, don't delete.** `lib/blobSync.ts`, `readJsonFile*`/`writeJsonFile*`, `/admin/blob-sync` stay in the repo (marked deprecated). They are no longer in the productive data path but remain available as manual escape hatches and inspection tools. `/data/*.json` and existing blob JSONs stay as historical snapshot. |

## Storage roles (post-cutover)

| Layer | Role |
|-------|------|
| Supabase Postgres | Single source of truth for 17 entities (users, sessions, semesters, courses, enrollments, activities, submissions, grades, cortes, prompts, projects, quizzes, quiz_attempts, quiz_simulations, manual_grade_items, manual_grades, audit_log, plus `app_settings` for config/home). |
| Vercel Blob (via `uploadService.ts`) | User-uploaded files only (PDF, images, attachments). Unchanged. |
| `/data/*.json`, `lib/blobSync.ts`, `/admin/blob-sync` | Conserved, disconnected from the runtime data path. |

## Schema conventions

- **PK:** `id text` (IDs are domain strings like `stu-uuid`, not native UUIDs).
- **camelCase ↔ snake_case** mapping at the data-service boundary, identical to the existing `users` pattern.
- **Timestamps:** TS `createdAt`/`updatedAt` ↔ SQL `created_at`/`updated_at` (text ISO strings — keeps Zod schemas happy).
- **Nested arrays:** stored as `jsonb` columns; not normalized.
- **No hard FK constraints.** Zod schemas + app-level invariants are the integrity layer (consistent with current code).
- **RLS:** every table has `ENABLE ROW LEVEL SECURITY` + policy `service_role_all FOR ALL TO service_role USING (true) WITH CHECK (true)`.
- **PostgREST schema reload:** `NOTIFY pgrst, 'reload schema';` runs at end of DDL.

## Tables

| Table | Indexed columns | JSONB columns |
|-------|----------------|---------------|
| `users` (already exists) | `email` unique | — |
| `sessions` | `token` unique, `user_id` | — |
| `semesters` | `is_active` | — |
| `courses` | `semester_id` | `schedule` |
| `enrollments` | `course_id`, `student_id`, `(course_id, student_id)` unique | — |
| `activities` | `course_id` | `attachments` |
| `submissions` | `activity_id`, `student_id` | `attachments`, `links` |
| `grades` | `activity_id`, `student_id`, `submission_id` unique | — |
| `cortes` | `course_id` | — |
| `prompts` | `course_id`, `activity_id` | — |
| `projects` | `course_id`, `student_id` | — |
| `quizzes` | `course_id`, `activity_id` | `questions` |
| `quiz_attempts` | `quiz_id`, `student_id` | `answers` |
| `quiz_simulations` | `quiz_id`, `student_id` | `answers` |
| `manual_grade_items` | `course_id` | — |
| `manual_grades` | `item_id`, `student_id` | — |
| `audit_log` | `timestamp` desc, `actor_id` | `details` |
| `app_settings` | PK `key` | `value` |

## Data-service refactor

- Public API of `lib/dataService.ts` is **preserved.** Function signatures stay identical. Only the implementation changes.
- For each entity, add to `lib/supabase.ts`:
  - `interface Supabase<Entity>Row` (snake_case)
  - `rowTo<Entity>` / `<entity>ToRow` mappers
  - `supabaseRead<Entity>()`, `supabaseGet<Entity>ById()`, `supabaseUpsert<Entity>()`, optional `supabaseDelete<Entity>()`
- `dataService.readXxxFresh()` and `writeXxx()` delegate to the Supabase helpers. No Blob calls in the productive path.
- `readJsonFile*` / `writeJsonFile*` stay in `dataService.ts`, marked `@deprecated` with a note pointing at the migration.

`lib/supabase.ts` will grow to ~1500 LOC. If it crosses ~2000, split into `lib/supabase/<entity>.ts`. Not splitting up front (YAGNI).

## Seed script

`scripts/seed-supabase.ts`:
1. Load `.env.local` (`SUPABASE_NEXUS_POSTGRES_URL` + service role key).
2. Read `blob-export-all.json` (path configurable; default `/Users/jhonatan/Docker/proyectos_usa/proyecto_sergio/doc/blob-export-all.json`).
3. Run DDL (`CREATE TABLE IF NOT EXISTS …` for every table + RLS + policy + `NOTIFY pgrst`).
4. For each entity, batch upsert by `id`. Idempotent — re-runnable.
5. Print a report: rows inserted/updated per table, errors.

Run: `npx tsx scripts/seed-supabase.ts`

## Rollback

- If the seed corrupts data: re-run (idempotent) or truncate + re-run.
- If Supabase is down in prod: app surfaces a 500. Manual recovery: revert the `dataService` impl swap and the app reads from Blob again.
- `/admin/blob-sync` still works against the Blob snapshot (useful for inspecting the pre-cutover state).

## Out of scope

- File uploads / `uploadService.ts` (unchanged).
- Moving sessions to JWT/cookie (separate concern).
- Database backups / scheduled exports (can be added later — Supabase has its own).
- Performance tuning / advanced indexes (data volume is small).

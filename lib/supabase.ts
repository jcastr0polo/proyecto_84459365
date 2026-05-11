/**
 * lib/supabase.ts
 * Supabase client for server-side operations.
 *
 * Uses service_role key for admin operations (migrations, bulk inserts).
 * Env vars come from the Vercel Supabase integration (prefix SUPABASE_NEXUS_).
 *
 * BUILD-SAFE: getSupabaseClient() returns null when env vars are missing.
 * This prevents build-time crashes (Next.js pre-renders pages during build
 * and would fail if it tries to connect to Supabase without credentials).
 * All callers MUST handle null gracefully (fall back to JSON/Blob).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

let _client: SupabaseClient | null = null;
let _checked = false;

/**
 * Returns the Supabase client or null if not configured.
 * Safe to call at build time — will return null without throwing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_checked) return null; // Already checked, env vars were missing

  const url = process.env.SUPABASE_NEXUS_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_NEXUS_SUPABASE_SERVICE_ROLE_KEY;

  _checked = true;

  if (!url || !serviceKey) {
    console.warn('[supabase] Not configured — using JSON/Blob fallback');
    return null;
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return _client;
}

/**
 * Requires Supabase client — throws if not configured.
 * Use only in admin endpoints where Supabase is mandatory (e.g., migration).
 */
export function requireSupabaseClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase not configured: SUPABASE_NEXUS_SUPABASE_URL and SUPABASE_NEXUS_SUPABASE_SERVICE_ROLE_KEY are required'
    );
  }
  return client;
}

// ── Helpers: snake_case ↔ camelCase ─────────────────────────

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

function rowToUser(row: SupabaseUserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    mustChangePassword: row.must_change_password,
    firstName: row.first_name,
    lastName: row.last_name,
    documentNumber: row.document_number,
    phone: row.phone ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

function userToRow(u: User): SupabaseUserRow {
  return {
    id: u.id,
    email: u.email,
    password_hash: u.passwordHash,
    role: u.role,
    must_change_password: u.mustChangePassword,
    first_name: u.firstName,
    last_name: u.lastName,
    document_number: u.documentNumber,
    phone: u.phone ?? null,
    is_active: u.isActive,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
    last_login_at: u.lastLoginAt ?? null,
  };
}

// ── User queries ────────────────────────────────────────────

/**
 * Get user by email from Supabase. Returns null if not found or Supabase unavailable.
 */
export async function supabaseGetUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error || !data) return null;
    return rowToUser(data as SupabaseUserRow);
  } catch {
    console.warn('[supabase] getUserByEmail failed, falling back to JSON');
    return null;
  }
}

/**
 * Get user by ID from Supabase. Returns null if not found or Supabase unavailable.
 */
export async function supabaseGetUserById(id: string): Promise<User | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToUser(data as SupabaseUserRow);
  } catch {
    console.warn('[supabase] getUserById failed, falling back to JSON');
    return null;
  }
}

/**
 * Upsert all users to Supabase. Best-effort — does not throw on failure.
 */
export async function supabaseUpsertUsers(users: User[]): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || users.length === 0) return;

  try {
    const rows = users.map(userToRow);
    const { error } = await sb
      .from('users')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error('[supabase] upsertUsers error:', error.message);
    }
  } catch (err) {
    console.error('[supabase] upsertUsers failed:', err);
  }
}

/**
 * Update specific fields of a user in Supabase. Best-effort.
 */
export async function supabaseUpdateUser(
  id: string,
  fields: Partial<Pick<User, 'passwordHash' | 'mustChangePassword' | 'lastLoginAt' | 'updatedAt' | 'isActive' | 'firstName' | 'lastName' | 'phone' | 'documentNumber' | 'email'>>
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  try {
    // Convert camelCase fields to snake_case
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

    const { error } = await sb
      .from('users')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('[supabase] updateUser error:', error.message);
    }
  } catch (err) {
    console.error('[supabase] updateUser failed:', err);
  }
}

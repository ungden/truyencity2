/**
 * Shared Supabase helper - dùng chung cho tất cả tracker files
 * 
 * Giải quyết:
 * 1. 6 file copy-paste cùng lazy init pattern
 * 2. Không check error từ Supabase calls
 * 3. Non-null assertion trên env vars
 */

import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// LAZY SUPABASE SINGLETON
// ============================================================================

let _supabase: SupabaseClient | null = null;

/**
 * Get shared Supabase client (lazy init)
 * Validates env vars upfront thay vì crash sâu bên trong
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error(
        'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
      );
    }
    
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Reset Supabase client (cho testing)
 */
export function resetSupabase(): void {
  _supabase = null;
}

// ============================================================================
// ERROR-SAFE SUPABASE WRAPPERS
// ============================================================================

export interface DbResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Safe select query - check error, return clean result
 */
export async function safeSelect<T = Record<string, unknown>>(
  table: string,
  query: {
    projectId?: string;
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<DbResult<T[]>> {
  try {
    const supabase = getSupabase();
    let q = supabase.from(table).select('*');
    
    if (query.projectId) {
      q = q.eq('project_id', query.projectId);
    }
    
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        q = q.eq(key, value);
      }
    }
    
    if (query.orderBy) {
      q = q.order(query.orderBy.column, { ascending: query.orderBy.ascending ?? true });
    }
    
    const { data, error } = await q;
    
    if (error) {
      console.warn(`[DB] Select ${table} failed:`, error.message);
      return { data: null, error: error.message };
    }
    
    return { data: data as T[], error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown DB error';
    console.warn(`[DB] Select ${table} error:`, msg);
    return { data: null, error: msg };
  }
}

/**
 * Safe upsert - check error, log warning
 */
export async function safeUpsert(
  table: string,
  data: Record<string, unknown>,
  options?: { onConflict?: string }
): Promise<DbResult<null>> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(table)
      .upsert(data, options ? { onConflict: options.onConflict } : undefined);
    
    if (error) {
      console.warn(`[DB] Upsert ${table} failed:`, error.message);
      return { data: null, error: error.message };
    }
    
    return { data: null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown DB error';
    console.warn(`[DB] Upsert ${table} error:`, msg);
    return { data: null, error: msg };
  }
}

/**
 * Safe insert - check error, log warning
 */
export async function safeInsert(
  table: string,
  data: Record<string, unknown>
): Promise<DbResult<null>> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(table).insert(data);
    
    if (error) {
      console.warn(`[DB] Insert ${table} failed:`, error.message);
      return { data: null, error: error.message };
    }
    
    return { data: null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown DB error';
    console.warn(`[DB] Insert ${table} error:`, msg);
    return { data: null, error: msg };
  }
}

/**
 * Safe update with filter
 */
export async function safeUpdate(
  table: string,
  data: Record<string, unknown>,
  filters: Record<string, unknown>
): Promise<DbResult<null>> {
  try {
    const supabase = getSupabase();
    let q = supabase.from(table).update(data);
    
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    
    const { error } = await q;
    
    if (error) {
      console.warn(`[DB] Update ${table} failed:`, error.message);
      return { data: null, error: error.message };
    }
    
    return { data: null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown DB error';
    console.warn(`[DB] Update ${table} error:`, msg);
    return { data: null, error: msg };
  }
}

// ============================================================================
// PROJECT RECORD HELPER
// ============================================================================

/**
 * Ensure ai_story_projects record exists for this projectId.
 * 
 * Sprint 2/3 tables have FK `project_id -> ai_story_projects(id)`.
 * Without a valid project record, all tracker DB writes fail.
 * 
 * Strategy:
 * 1. Check if project already exists → skip if yes
 * 2. Find an existing user_id (required FK to auth.users)
 * 3. Insert minimal project record
 * 4. If anything fails → log warning, trackers work in-memory only
 */
export async function ensureProjectRecord(
  projectId: string,
  meta?: {
    title?: string;
    genre?: string;
    mainCharacter?: string;
    targetChapters?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();

    // 1. Check if project already exists
    const { data: existing, error: checkError } = await supabase
      .from('ai_story_projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    if (checkError) {
      console.warn(`[DB] Check project failed: ${checkError.message}`);
      return { success: false, error: checkError.message };
    }

    if (existing) {
      console.log(`[DB] Project ${projectId.substring(0, 8)}... already exists`);
      return { success: true };
    }

    // 2. Find an existing user_id to satisfy FK constraint
    //    (In production, this comes from auth context)
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (userError || !users?.length) {
      console.warn(`[DB] No users found for project record. DB persistence disabled.`);
      return { success: false, error: 'No users available for FK constraint' };
    }

    const userId = users[0].id;

    // 3. Insert minimal project record
    const { error: insertError } = await supabase
      .from('ai_story_projects')
      .insert({
        id: projectId,
        user_id: userId,
        main_character: meta?.mainCharacter || 'Unknown',
        genre: meta?.genre || 'tien-hiep',
        total_planned_chapters: meta?.targetChapters || 200,
        status: 'active',
        writing_style: 'webnovel_chinese',
        target_chapter_length: 2500,
        ai_model: 'gemini-3-flash-preview',
        temperature: 1.0,
        current_chapter: 0,
        world_description: meta?.title || 'Story Writing Factory Project',
      });

    if (insertError) {
      console.warn(`[DB] Insert project failed: ${insertError.message}`);
      return { success: false, error: insertError.message };
    }

    console.log(`[DB] Created project record: ${projectId.substring(0, 8)}...`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.warn(`[DB] ensureProjectRecord error: ${msg}`);
    return { success: false, error: msg };
  }
}

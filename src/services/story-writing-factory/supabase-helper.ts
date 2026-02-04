/**
 * Shared Supabase helper - dùng chung cho tất cả tracker files
 * 
 * Giải quyết:
 * 1. 6 file copy-paste cùng lazy init pattern
 * 2. Không check error từ Supabase calls
 * 3. Non-null assertion trên env vars
 */

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

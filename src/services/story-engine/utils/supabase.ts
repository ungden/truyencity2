/**
 * Story Engine v2 — Supabase Client Singleton
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createOfflineSupabaseClient, shouldUseOfflineSupabase } from './offline-supabase';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  if (shouldUseOfflineSupabase()) {
    _client = createOfflineSupabaseClient({ rootDir: process.cwd() }) as unknown as SupabaseClient;
    return _client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}

import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy-load env vars to avoid build-time errors
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { url: '', key: '' };
  }

  return { url, key };
};

export function createSupabaseFromAuthHeader(req: NextRequest): { client: SupabaseClient | null; token: string | null } {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    return { client: null, token: null };
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { client: null, token: null };
  }
  const token = authHeader.slice(7).trim();

  const client = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return { client, token };
}

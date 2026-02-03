import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Singleton instance
let _instance: SupabaseClient | null = null;

// Create supabase client with lazy initialization
// This avoids build-time errors when env vars aren't available
function createSupabaseClient(): SupabaseClient {
  if (_instance) return _instance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During build, env vars might be empty - client will fail at runtime if actually used
  _instance = createClient(supabaseUrl, supabaseKey);
  return _instance;
}

// Export a proxy that lazily creates the client on first property access
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = createSupabaseClient();
    const value = Reflect.get(client, prop, client);
    // Bind functions to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

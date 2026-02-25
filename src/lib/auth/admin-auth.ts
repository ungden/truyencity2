/**
 * Shared admin authentication utility.
 * Replaces 5 duplicate copies across admin/cron routes.
 *
 * Supports two auth methods:
 * 1. Bearer CRON_SECRET — for service-to-service calls
 * 2. Supabase session user with role='admin' — for browser admin UI
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/integrations/supabase/server';

export async function isAuthorizedAdmin(request: NextRequest): Promise<boolean> {
  // Method 1: Bearer token (cron/service auth)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Method 2: Supabase session user with admin role
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

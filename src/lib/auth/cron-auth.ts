/**
 * Shared cron authentication utility.
 * Replaces 7 duplicate copies across cron/seed routes.
 */

import { NextRequest } from 'next/server';

export function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // Allow in development without secret
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

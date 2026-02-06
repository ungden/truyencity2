/**
 * Factory API Authentication Helper
 * Shared auth middleware for all factory routes.
 * 
 * Supports:
 * 1. Session-based auth (cookies from browser admin UI)
 * 2. CRON_SECRET Bearer token (for automated/cron calls)
 * 3. Rate limiting
 * 4. Security logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/integrations/supabase/server';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/security/rate-limiter';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';

export interface FactoryAuthResult {
  success: true;
  userId: string;
  timer: () => number;
  rateCheck: { remaining: number; resetIn: number };
}

export interface FactoryAuthError {
  success: false;
  response: NextResponse;
}

/**
 * Authenticate a factory API request.
 * Returns either { success: true, userId, timer, rateCheck } or { success: false, response }
 * 
 * Auth methods (tried in order):
 * 1. Bearer CRON_SECRET - for automated/internal calls
 * 2. Supabase session cookie - for browser admin UI
 */
export async function factoryAuth(
  request: NextRequest,
  endpoint: string = '/api/factory'
): Promise<FactoryAuthResult | FactoryAuthError> {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  // 1. Rate limit check (before auth to prevent brute force)
  const clientId = getClientIdentifier(request);
  const rateCheck = rateLimiter.check(clientId, RATE_LIMIT_CONFIGS.standard);

  if (!rateCheck.allowed) {
    logger.securityEvent('rate_limit_exceeded', requestContext.ip || 'unknown', {
      endpoint,
      method: request.method,
    });
    return {
      success: false,
      response: createRateLimitResponse(rateCheck.resetIn) as NextResponse,
    };
  }

  // 2. Check for CRON_SECRET auth (internal/automated calls)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader && cronSecret) {
    const token = authHeader.replace('Bearer ', '');
    if (token === cronSecret) {
      return {
        success: true,
        userId: 'system:cron',
        timer,
        rateCheck: { remaining: rateCheck.remaining, resetIn: rateCheck.resetIn },
      };
    }
  }

  // 3. Session-based auth (browser admin UI)
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.securityEvent('auth_failed', requestContext.ip || 'unknown', {
        endpoint,
        reason: authError?.message || 'no_session',
      });
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized. Login required.' },
          { status: 401 }
        ),
      };
    }

    return {
      success: true,
      userId: user.id,
      timer,
      rateCheck: { remaining: rateCheck.remaining, resetIn: rateCheck.resetIn },
    };
  } catch (error) {
    logger.error('Factory auth error', error as Error, requestContext);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
      ),
    };
  }
}

/**
 * Wrap a response with rate limit headers and API logging
 */
export function finalizeResponse(
  response: NextResponse,
  auth: FactoryAuthResult,
  endpoint: string,
  method: string
): NextResponse {
  logger.apiRequest(method, endpoint, response.status, auth.timer(), {
    userId: auth.userId,
  });
  return addRateLimitHeaders(response, auth.rateCheck.remaining, auth.rateCheck.resetIn) as NextResponse;
}

import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/services/billing/subscription-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import { cacheService, CACHE_TTL } from '@/lib/cache/cache-service';

/**
 * GET /api/billing/tiers
 * Get all subscription tier information (public endpoint)
 */
export async function GET(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    // Try cache first
    const cached = cacheService.get<unknown>('tier_limits');
    if (cached) {
      logger.apiRequest('GET', '/api/billing/tiers', 200, timer(), { cached: true });
      return NextResponse.json({ tiers: cached });
    }

    const supabase = await createServerClient();
    const tiers = await subscriptionService.getTierLimits(supabase);

    // Cache for 1 hour
    cacheService.set('tier_limits', tiers, CACHE_TTL.tierLimits);

    logger.apiRequest('GET', '/api/billing/tiers', 200, timer(), { cached: false });

    return NextResponse.json({
      tiers,
      pricing: {
        currency: 'VND',
        note: 'Giá chưa bao gồm VAT',
      },
    });
  } catch (error) {
    logger.error('Failed to get tiers', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

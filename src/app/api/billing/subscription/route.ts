import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/services/billing/subscription-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rate-limiter';

/**
 * GET /api/billing/subscription
 * Get current user's subscription info
 */
export async function GET(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.standard
    );

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const subscription = await subscriptionService.getSubscription(supabase, user.id);

    if (!subscription) {
      // Initialize subscription if not found
      const newSub = await subscriptionService.initializeSubscription(supabase, user.id);
      if (!newSub) {
        return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
      }

      logger.apiRequest('GET', '/api/billing/subscription', 200, timer(), { userId: user.id });
      return NextResponse.json({ subscription: newSub });
    }

    // Get tier limits
    const tierLimits = await subscriptionService.getTierLimit(supabase, subscription.tier);

    logger.apiRequest('GET', '/api/billing/subscription', 200, timer(), { userId: user.id });

    return NextResponse.json({
      subscription,
      limits: tierLimits,
    });
  } catch (error) {
    logger.error('Failed to get subscription', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/subscription
 * Upgrade or cancel subscription
 */
export async function POST(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (stricter for billing operations)
    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.strict
    );

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const body = await request.json();
    const { action, tier, reason, paymentInfo } = body;

    switch (action) {
      case 'upgrade':
        if (!tier) {
          return NextResponse.json({ error: 'Tier is required' }, { status: 400 });
        }

        const upgradeResult = await subscriptionService.upgradeSubscription(
          supabase,
          user.id,
          tier,
          paymentInfo
        );

        if (!upgradeResult.success) {
          return NextResponse.json({ error: upgradeResult.error }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/subscription', 200, timer(), {
          userId: user.id,
          action: 'upgrade',
          tier,
        });

        return NextResponse.json({ success: true, message: 'Subscription upgraded' });

      case 'cancel':
        const cancelResult = await subscriptionService.cancelSubscription(
          supabase,
          user.id,
          reason
        );

        if (!cancelResult.success) {
          return NextResponse.json({ error: cancelResult.error }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/subscription', 200, timer(), {
          userId: user.id,
          action: 'cancel',
        });

        return NextResponse.json({ success: true, message: 'Subscription cancelled' });

      case 'check_write':
        const canWrite = await subscriptionService.canUserWriteChapter(supabase, user.id);

        logger.apiRequest('POST', '/api/billing/subscription', 200, timer(), {
          userId: user.id,
          action: 'check_write',
        });

        return NextResponse.json(canWrite);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Subscription operation failed', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

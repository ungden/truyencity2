/**
 * VIP Order API — Create orders and check payment status
 *
 * POST: Create a new VIP order (returns QR code URL + bank info)
 * GET:  Check order payment status (for polling)
 */

import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sepayService } from '@/services/billing/sepay-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rate-limiter';
import { z } from 'zod';

export const maxDuration = 15;

// ── Schemas ────────────────────────────────────────────────────

const CreateOrderSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

const CheckStatusSchema = z.object({
  order_id: z.string().uuid(),
});

// ── POST: Create VIP order ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: strict (prevent order spam)
    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.strict
    );
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const rawBody = await request.json();
    const parseResult = CreateOrderSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { plan } = parseResult.data;

    // Check if user is already VIP
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('reader_tier, reader_tier_expires_at')
      .eq('user_id', user.id)
      .single();

    if (sub?.reader_tier === 'vip' && sub.reader_tier_expires_at) {
      const expiresAt = new Date(sub.reader_tier_expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json(
          {
            error: 'Already VIP',
            expires_at: sub.reader_tier_expires_at,
          },
          { status: 400 }
        );
      }
    }

    const result = await sepayService.createVipOrder(supabase, user.id, plan);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.apiRequest('POST', '/api/billing/vip-order', 200, timer(), {
      userId: user.id,
      plan,
      orderId: result.order.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('VIP order creation failed', error as Error, requestContext);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── GET: Check order status ────────────────────────────────────

export async function GET(request: NextRequest) {
  const timer = createTimer();

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: standard (polling every 2-3 seconds)
    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.standard
    );
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const orderId = request.nextUrl.searchParams.get('order_id');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const parseResult = CheckStatusSchema.safeParse({ order_id: orderId });
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
    }

    const result = await sepayService.getOrderStatus(
      supabase,
      parseResult.data.order_id,
      user.id
    );

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    logger.apiRequest('GET', '/api/billing/vip-order', 200, timer(), {
      userId: user.id,
      orderId,
      status: result.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('VIP order status check failed', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

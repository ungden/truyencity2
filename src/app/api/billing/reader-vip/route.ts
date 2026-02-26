import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { readerVipService } from '@/services/billing/reader-vip-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rate-limiter';
import { z } from 'zod';

export const maxDuration = 15;

/**
 * GET /api/billing/reader-vip
 * Get reader VIP status, limits, and usage
 */
export async function GET(request: NextRequest) {
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

    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.standard
    );
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const status = await readerVipService.getReaderStatus(supabase, user.id);

    if (!status) {
      return NextResponse.json(
        { error: 'Failed to get reader status' },
        { status: 500 }
      );
    }

    logger.apiRequest('GET', '/api/billing/reader-vip', 200, timer(), {
      userId: user.id,
    });

    return NextResponse.json({ status });
  } catch (error) {
    logger.error('Failed to get reader VIP status', error as Error, requestContext);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Zod schemas for POST actions
const ReaderVipActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('upgrade'),
    payment_method: z.enum(['apple_iap', 'google_play', 'vnpay', 'momo']),
    store_tx_id: z.string().min(1),
    auto_renew: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('cancel'),
  }),
  z.object({
    action: z.literal('record_tts'),
    seconds: z.number().int().positive().max(86400),
  }),
  z.object({
    action: z.literal('record_download'),
    chapters: z.number().int().positive().max(1000),
  }),
  z.object({
    action: z.literal('get_tiers'),
  }),
]);

/**
 * POST /api/billing/reader-vip
 * Actions: upgrade, cancel, record_tts, record_download, get_tiers
 */
export async function POST(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    const rawBody = await request.json();
    const parseResult = ReaderVipActionSchema.safeParse(rawBody);

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

    const body = parseResult.data;

    // get_tiers is public (no auth needed)
    if (body.action === 'get_tiers') {
      const supabase = await createServerClient();
      const tiers = await readerVipService.getReaderTierLimits(supabase);
      logger.apiRequest('POST', '/api/billing/reader-vip', 200, timer(), {
        action: 'get_tiers',
      });
      return NextResponse.json({ tiers });
    }

    // All other actions require auth
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      body.action === 'upgrade' || body.action === 'cancel'
        ? RATE_LIMIT_CONFIGS.strict
        : RATE_LIMIT_CONFIGS.standard
    );
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    switch (body.action) {
      case 'upgrade': {
        const result = await readerVipService.upgradeToVip(supabase, user.id, {
          payment_method: body.payment_method,
          store_tx_id: body.store_tx_id,
          auto_renew: body.auto_renew,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/reader-vip', 200, timer(), {
          userId: user.id,
          action: 'upgrade',
        });

        return NextResponse.json({
          success: true,
          message: 'Nang cap VIP thanh cong!',
        });
      }

      case 'cancel': {
        const result = await readerVipService.cancelVip(supabase, user.id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/reader-vip', 200, timer(), {
          userId: user.id,
          action: 'cancel',
        });

        return NextResponse.json({
          success: true,
          message: 'Da huy tu dong gia han VIP',
        });
      }

      case 'record_tts': {
        const result = await readerVipService.recordTTSUsage(
          supabase,
          user.id,
          body.seconds
        );

        if (!result) {
          return NextResponse.json(
            { error: 'Failed to record TTS usage' },
            { status: 500 }
          );
        }

        return NextResponse.json(result);
      }

      case 'record_download': {
        const result = await readerVipService.recordDownloadUsage(
          supabase,
          user.id,
          body.chapters
        );

        if (!result) {
          return NextResponse.json(
            { error: 'Failed to record download usage' },
            { status: 500 }
          );
        }

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Reader VIP operation failed', error as Error, requestContext);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

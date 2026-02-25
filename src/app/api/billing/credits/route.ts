import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { creditService, CREDIT_PACKAGES } from '@/services/billing/credit-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rate-limiter';
import { CreditActionSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';

export const maxDuration = 15;

/**
 * GET /api/billing/credits
 * Get user's credit balance and transaction history
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

    const action = request.nextUrl.searchParams.get('action') || 'balance';

    switch (action) {
      case 'balance':
        const credits = await creditService.getCredits(supabase, user.id);

        if (!credits) {
          const newCredits = await creditService.initializeCredits(supabase, user.id);
          return NextResponse.json({ credits: newCredits });
        }

        logger.apiRequest('GET', '/api/billing/credits', 200, timer(), { userId: user.id });
        return NextResponse.json({ credits });

      case 'history':
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
        const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

        const transactions = await creditService.getTransactionHistory(
          supabase,
          user.id,
          limit,
          offset
        );

        logger.apiRequest('GET', '/api/billing/credits', 200, timer(), {
          userId: user.id,
          action: 'history',
        });

        return NextResponse.json({ transactions });

      case 'packages':
        const packages = creditService.getCreditPackages();

        logger.apiRequest('GET', '/api/billing/credits', 200, timer(), {
          userId: user.id,
          action: 'packages',
        });

        return NextResponse.json({ packages });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Failed to get credits', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/credits
 * Purchase credits or process refund
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

    const rawBody = await request.json();
    const parseResult = CreditActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const validatedBody = parseResult.data;

    switch (validatedBody.action) {
      case 'purchase':
        const { packageId, paymentMethod, paymentProviderId } = validatedBody;

        // Validate package exists
        const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
        if (!pkg) {
          return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
        }

        const purchaseResult = await creditService.addCreditsFromPurchase(
          supabase,
          user.id,
          packageId,
          {
            payment_method: paymentMethod,
            payment_provider_id: paymentProviderId,
          }
        );

        if (!purchaseResult.success) {
          return NextResponse.json({ error: purchaseResult.error }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/credits', 200, timer(), {
          userId: user.id,
          action: 'purchase',
          packageId,
        });

        return NextResponse.json({
          success: true,
          newBalance: purchaseResult.newBalance,
          message: `Đã mua ${pkg.credits + pkg.bonus_credits} credits`,
        });

      case 'consume':
        // This is typically called internally when writing chapters
        const { chapterId, wordCount } = validatedBody;

        const consumeResult = await creditService.consumeChapterCredit(
          supabase,
          user.id,
          chapterId,
          wordCount
        );

        if (!consumeResult.success) {
          return NextResponse.json({
            error: 'Cannot consume credit',
            reason: consumeResult.reason,
          }, { status: 400 });
        }

        logger.apiRequest('POST', '/api/billing/credits', 200, timer(), {
          userId: user.id,
          action: 'consume',
        });

        return NextResponse.json({
          success: true,
          daily_used: consumeResult.daily_used,
          balance: consumeResult.balance,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Credit operation failed', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

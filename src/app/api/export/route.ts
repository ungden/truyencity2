import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { exportService, ExportFormat } from '@/services/export/export-service';
import { subscriptionService } from '@/services/billing/subscription-service';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rate-limiter';
import { ExportNovelSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';

export const maxDuration = 120;

/**
 * GET /api/export
 * Get available export formats for user
 */
export async function GET(request: NextRequest) {
  const timer = createTimer();

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await subscriptionService.getSubscription(supabase, user.id);
    const tier = subscription?.tier || 'free';
    const formats = exportService.getAvailableFormats(tier);

    logger.apiRequest('GET', '/api/export', 200, timer(), { userId: user.id });

    return NextResponse.json({
      formats,
      tier,
      message: tier === 'free'
        ? 'Nâng cấp lên Creator hoặc Pro để xuất EPUB/PDF'
        : undefined,
    });
  } catch (error) {
    logger.error('Failed to get export formats', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/export
 * Export a novel to specified format
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

    // Rate limiting
    const rateCheck = rateLimiter.check(
      getClientIdentifier(request, user.id),
      RATE_LIMIT_CONFIGS.standard
    );

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const rawBody = await request.json();
    const parseResult = ExportNovelSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const { novelId, format, chapters, includeMetadata, includeCover, title, author } = parseResult.data;

    // Check format access based on subscription
    const subscription = await subscriptionService.getSubscription(supabase, user.id);
    const tier = subscription?.tier || 'free';
    const availableFormats = exportService.getAvailableFormats(tier);

    if (!availableFormats.includes(format as ExportFormat)) {
      return NextResponse.json({
        error: `Format ${format} requires a higher subscription tier`,
        availableFormats,
      }, { status: 403 });
    }

    // Perform export
    const result = await exportService.exportStory(supabase, user.id, {
      novelId,
      format: format as ExportFormat,
      chapters,
      includeMetadata,
      includeCover,
      title,
      author,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.apiRequest('POST', '/api/export', 200, timer(), {
      userId: user.id,
      novelId,
      format,
    });

    // Return file data
    return new NextResponse(result.content as string, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    logger.error('Export failed', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

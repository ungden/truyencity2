import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * AI Editor Rewrite — DISABLED
 *
 * Previously used V1 story-writing-factory engine for chapter rewrites.
 * V2 story-engine has built-in retry/rewrite via Critic pipeline (up to 3 retries).
 * Running V1 rewriter on V2-written chapters degrades quality due to standard mismatch.
 *
 * To re-enable: migrate to V2 engine's rewrite mechanism or remove entirely.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'AI Editor Rewrite disabled — V2 Critic handles rewrites inline. See route.ts for details.',
    skipped: true,
  });
}

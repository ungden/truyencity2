import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * AI Editor Scan — DISABLED
 *
 * Previously used V1 story-writing-factory engine for quality scanning.
 * V2 story-engine Critic already handles quality scoring inline during chapter writing.
 * Running V1 editor on V2-written chapters causes quality standard mismatch and wastes AI calls.
 *
 * To re-enable: migrate to V2 Critic scoring or remove entirely.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'AI Editor Scan disabled — V2 Critic handles quality inline. See route.ts for details.',
    skipped: true,
  });
}

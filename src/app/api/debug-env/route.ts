import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hasGeminiKey = !!geminiKey;

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    gemini: {
      hasKey: hasGeminiKey,
      keyLength: geminiKey.length,
      keyPreview: hasGeminiKey ? `${geminiKey.slice(0, 8)}...` : 'Not found',
    },
    supabase: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cron: {
      hasSecret: !!process.env.CRON_SECRET,
    },
  });
}

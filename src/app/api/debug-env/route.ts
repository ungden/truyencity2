import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Require CRON_SECRET to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    gemini: {
      hasKey: !!process.env.GEMINI_API_KEY,
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

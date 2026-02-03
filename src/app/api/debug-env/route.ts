import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

export async function GET(request: NextRequest) {
  const nextKey = process.env.OPENROUTER_API_KEY || '';
  const nextHasKey = !!nextKey;

  let edgeResult: { success: boolean; modelsCount?: number; error?: string } = {
    success: false,
  };

  try {
    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body: { action: 'models' },
    });

    if (error) {
      edgeResult = { success: false, error: error.message || 'Edge invoke error' };
    } else if (data?.success === true) {
      edgeResult = { success: true, modelsCount: data.modelsCount ?? 0 };
    } else {
      edgeResult = { success: false, error: data?.error || 'Unknown edge error' };
    }
  } catch (e) {
    edgeResult = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    next: {
      hasKey: nextHasKey,
      keyLength: nextKey.length,
      keyPreview: nextHasKey ? `${nextKey.slice(0, 8)}...` : 'Not found',
      keys: Object.keys(process.env).filter((k) => k.includes('OPENROUTER') || k.includes('SUPABASE')),
    },
    edge: edgeResult,
  });
}
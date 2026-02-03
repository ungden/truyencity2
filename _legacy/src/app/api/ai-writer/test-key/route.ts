import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body: { action: 'models' },
    });

    if (error) {
      console.error('Supabase invoke error on test-key:', error);
      return NextResponse.json(
        { success: false, keyWorking: false, error: error.message || 'Edge invoke error' },
        { status: 500 }
      );
    }

    if (data.success === false) {
      console.error('Edge function returned an error on test-key:', data.error, data.detail);
      return NextResponse.json(
        { success: false, keyWorking: false, error: data.error, detail: data.detail },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, keyWorking: true, modelsCount: data.modelsCount ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('API Route Error on test-key:', err);
    return NextResponse.json({ success: false, keyWorking: false, error: msg }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'deepseek/deepseek-chat-v3-0324', temperature = 0.7, max_tokens = 3000 } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body: {
        model,
        temperature,
        max_tokens,
        messages: [
          {
            role: "system",
            content: "Bạn là tác giả webnovel chuyên nghiệp, chuyên viết truyện tu tiên phong cách Trung Quốc. Văn phong của bạn sinh động, có nhiều hội thoại và miêu tả chi tiết. Hãy viết bằng tiếng Việt với phong cách webnovel hiện đại."
          },
          { role: "user", content: prompt }
        ]
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Edge invoke error' }, { status: 500 });
    }

    if ((data as any)?.success === false) {
      const d: any = data;
      return NextResponse.json({ error: d.error || 'OpenRouter error', detail: d.detail }, { status: 500 });
    }

    const content = (data as any)?.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return NextResponse.json({ error: 'No content generated' }, { status: 500 });
    }

    return NextResponse.json({ content: content.trim(), usage: (data as any).usage, model: (data as any).model });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
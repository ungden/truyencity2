import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { title, author, description } = await request.json();

    const analysisPrompt = `Dựa vào thông tin truyện sau, hãy phân tích và tạo thông tin cần thiết cho AI Writer:

**Tên truyện:** ${title}
**Tác giả:** ${author || 'Không rõ'}
**Mô tả:** ${description || 'Không có mô tả'}

Hãy suy đoán và tạo:
1. Tên nhân vật chính (nam, phong cách phù hợp với truyện)
2. Hệ thống tu luyện/sức mạnh (5-7 cấp độ, phù hợp với thể loại)
3. Mô tả thế giới (200-300 từ, dựa trên tên và mô tả truyện)

Trả về JSON format:
{
  "mainCharacter": "...",
  "cultivationSystem": "...",
  "worldDescription": "..."
}`;

    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body: {
        model: 'deepseek/deepseek-chat-v3-0324',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Bạn là chuyên gia phân tích truyện và tạo thông tin cho AI Writer. Luôn trả về JSON hợp lệ.' },
          { role: 'user', content: analysisPrompt }
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

    try {
      const result = JSON.parse(content);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON response from AI' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
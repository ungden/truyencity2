import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';
import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { genre = 'tien-hiep', topic, topicId, model = 'deepseek/deepseek-chat-v3-0324' } = await request.json();

    const genreConfig = GENRE_CONFIG[genre as GenreKey];
    if (!genreConfig) {
      return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
    }

    // Require a topic and resolve slug (support both `topic` and legacy `topicId` as slug)
    const topicSlug = topic ?? topicId;
    if (!topicSlug) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Fetch topic from DB to ensure correctness
    const { data: dbTopic, error: topicError } = await supabase
      .from('genre_topics')
      .select('name, slug, description, example, tags')
      .eq('genre_id', genre)
      .eq('slug', topicSlug)
      .eq('status', 'active')
      .single();

    if (topicError || !dbTopic) {
      return NextResponse.json({ error: 'Invalid topic for selected genre', detail: { genre, topicSlug } }, { status: 400 });
    }

    const topicBlock = `Chủ đề: "${dbTopic.name}"
Mô tả: ${dbTopic.description || ''}
Gợi ý: ${dbTopic.example || ''}${Array.isArray(dbTopic.tags) && dbTopic.tags.length ? `\nTừ khóa ưu tiên: ${dbTopic.tags.join(', ')}` : ''}

`;

    // Khóa hệ thống năng lực tùy theo thể loại (lấy field bắt buộc đầu tiên và đổi sang camelCase)
    const primaryField = genreConfig.requiredFields[0];
    const dynamicKey = primaryField.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    let prompt = `Tạo một ý tưởng truyện ${genreConfig.name} hoàn chỉnh.

${topicBlock}QUY TẮC QUAN TRỌNG: Bối cảnh là THẾ GIỚI SONG SONG hư cấu, không dùng tên thật (quốc gia, thành phố, địa danh, tổ chức, nhân vật nổi tiếng). BẮT BUỘC dùng tên mới.

RÀNG BUỘC ĐỊNH DẠNG JSON:
- Chỉ trả về MỘT JSON object duy nhất, không có markdown, không văn bản thừa ngoài JSON.
- Mọi trường trong JSON phải là chuỗi (string).
- Trường "${dynamicKey}" PHẢI là một chuỗi duy nhất. KHÔNG trả về object hoặc array cho trường này. Nếu cần trình bày danh sách cấp độ, hãy viết trong CHUỖI bằng nhiều dòng, ví dụ:
  "Cấp 1: ...\\n- Cơ chế: ...\\n- Điều kiện: ...\\n- Rủi ro: ...\\n- Đo lường: ...\\nCấp 2: ..."

Yêu cầu:
1. Tên truyện (hấp dẫn, phong cách webnovel)
2. Tên nhân vật chính (phù hợp thể loại/chủ đề)
3. Hệ thống năng lực/${genreConfig.name} độc đáo (${dynamicKey}) với 5-7 cấp độ, mỗi cấp có:
   - Tên cấp độ độc đáo (tránh rập khuôn phổ biến như 'Luyện Khí/Trúc Cơ/Kim Đan' nếu không phù hợp)
   - Nguyên lý vận hành, nguồn lực cần thiết
   - Điều kiện thăng cấp, chi phí, rủi ro và điểm yếu
   - Cách đo lường tiến bộ (dấu mốc, nghi lễ, thử thách)
4. Mô tả thế giới (200-300 từ, tuân thủ thế giới song song)
5. Mô tả truyện (100-150 từ, có hook/xung đột)
6. Yếu tố "level up" rõ ràng và nhất quán với chủ đề

Trả về JSON duy nhất (không markdown):
{
  "title": "...",
  "mainCharacter": "...",
  "${dynamicKey}": "...",
  "worldDescription": "...",
  "description": "..."
}`;

    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body: {
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Bạn là chuyên gia tạo ý tưởng truyện webnovel. Luôn trả về JSON hợp lệ theo format yêu cầu. Không thêm markdown hoặc text khác ngoài JSON.',
          },
          { role: 'user', content: prompt },
        ],
      },
    });

    if (error) {
      console.error('Supabase invoke error:', error);
      return NextResponse.json({ error: error.message || 'Edge invoke error' }, { status: 500 });
    }

    if (data.success === false) {
      console.error('Edge function returned an error:', data.error, data.detail);
      return NextResponse.json({ error: data.error, detail: data.detail }, { status: 500 });
    }

    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return NextResponse.json({ error: 'No content generated from AI' }, { status: 500 });
    }

    try {
      const idea = JSON.parse(content);
      return NextResponse.json(idea);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const idea = JSON.parse(match[0]);
          return NextResponse.json(idea);
        } catch {
          // Fall through to final error
        }
      }
      return NextResponse.json(
        { error: 'Invalid JSON response from AI', debug: { raw: content.slice(0, 500) } },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { extractJSON } from '@/services/story-engine/utils/json-repair';

export const maxDuration = 120;

interface ArticleItem {
  article_type: string;
  title: string;
  content: string;
  platform_hint: string;
}

const ARTICLE_TYPES = [
  { type: 'review', label: 'Review hấp dẫn', platform: 'general' },
  { type: 'teaser', label: 'Teaser/Hook gây tò mò', platform: 'general' },
  { type: 'character_spotlight', label: 'Giới thiệu nhân vật chính', platform: 'facebook' },
  { type: 'social_short', label: 'Caption social media ngắn', platform: 'tiktok' },
  { type: 'listicle', label: 'Listicle lý do nên đọc', platform: 'facebook' },
  { type: 'emotional', label: 'Emotional hook', platform: 'zalo' },
  { type: 'world_intro', label: 'Giới thiệu thế giới quan', platform: 'general' },
];

// GET: fetch existing articles for a novel
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const novelId = request.nextUrl.searchParams.get('novel_id');
  if (!novelId) {
    return NextResponse.json({ error: 'novel_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('novel_articles')
    .select('*')
    .eq('novel_id', novelId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data });
}

// POST: generate articles for a novel
export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { novel_id?: string; count?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { novel_id, count = 7 } = body;
  if (!novel_id) {
    return NextResponse.json({ error: 'novel_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load novel data
  const { data: novel, error: novelErr } = await supabase
    .from('novels')
    .select('id,title,author,description,genres,status,total_chapters')
    .eq('id', novel_id)
    .single();

  if (novelErr || !novel) {
    return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
  }

  // Load synopsis if available
  const { data: synopsisRow } = await supabase
    .from('story_synopsis')
    .select('synopsis_text,mc_current_state,active_allies,active_enemies,open_threads')
    .eq('project_id', novel_id)
    .maybeSingle();

  // Load first 5 chapter summaries
  const { data: summaries } = await supabase
    .from('chapter_summaries')
    .select('chapter_number,title,summary')
    .eq('project_id', novel_id)
    .order('chapter_number', { ascending: true })
    .limit(5);

  // Build context for AI
  const novelContext = [
    `Tên truyện: ${novel.title}`,
    `Tác giả: ${novel.author || 'Ẩn danh'}`,
    `Thể loại: ${(novel.genres || []).join(', ')}`,
    `Trạng thái: ${novel.status || 'Đang ra'}`,
    `Số chương: ${novel.total_chapters || 0}`,
    novel.description ? `Mô tả gốc: ${novel.description}` : '',
    synopsisRow?.synopsis_text ? `Tóm tắt cốt truyện: ${synopsisRow.synopsis_text}` : '',
    synopsisRow?.mc_current_state ? `Trạng thái nhân vật chính: ${synopsisRow.mc_current_state}` : '',
    synopsisRow?.active_allies ? `Đồng minh: ${synopsisRow.active_allies}` : '',
    synopsisRow?.active_enemies ? `Kẻ thù: ${synopsisRow.active_enemies}` : '',
    summaries && summaries.length > 0
      ? `Tóm tắt các chương đầu:\n${summaries.map(s => `- Chương ${s.chapter_number} "${s.title}": ${s.summary}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');

  const articleTypesForPrompt = ARTICLE_TYPES.slice(0, count).map((a, i) =>
    `${i + 1}. Loại "${a.type}" (${a.label}) — platform: ${a.platform}`
  ).join('\n');

  const prompt = `Bạn là chuyên gia content marketing cho nền tảng đọc truyện online TruyenCity. Nhiệm vụ: viết ${count} bài giới thiệu ĐA DẠNG cho bộ truyện dưới đây, mỗi bài có phong cách và mục đích khác nhau.

## Thông tin truyện:
${novelContext}

## Yêu cầu cho ${count} bài viết:
${articleTypesForPrompt}

## Quy tắc QUAN TRỌNG:
- Viết bằng tiếng Việt CÓ DẤU đầy đủ
- KHÔNG nhắc tới AI, máy tính, hay công nghệ — viết như người thật giới thiệu
- Mỗi bài phải có tiêu đề hấp dẫn và nội dung riêng biệt
- Bài review: 300-500 từ, phân tích sâu, có nhận xét cá nhân
- Bài teaser: 150-300 từ, kết thúc bằng câu gây tò mò
- Bài character_spotlight: 200-400 từ, tập trung nhân vật chính
- Bài social_short: 50-150 từ, ngắn gọn, dùng emoji phù hợp, có hashtag
- Bài listicle: 200-400 từ, dạng "X lý do nên đọc"
- Bài emotional: 150-300 từ, khai thác cảm xúc mạnh
- Bài world_intro: 200-400 từ, vẽ nên bức tranh thế giới quan
- Giọng văn tự nhiên, không sáo rỗng, như một reader thật sự hào hứng chia sẻ
- KHÔNG spoil nội dung quan trọng sau chương 10

## Format trả về (JSON array):
[
  {
    "article_type": "review",
    "title": "Tiêu đề bài viết",
    "content": "Nội dung bài viết...",
    "platform_hint": "general"
  },
  ...
]

Trả về ĐÚNG ${count} object trong array.`;

  try {
    const response = await callGemini(prompt, {
      model: 'deepseek-v4-flash',
      temperature: 0.9,
      maxTokens: 16000,
    }, { jsonMode: true });

    const parsed = JSON.parse(extractJSON(response.content)) as ArticleItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'AI trả về format không hợp lệ' }, { status: 500 });
    }

    // Validate and insert
    const rows = parsed.map((article: ArticleItem) => ({
      novel_id,
      article_type: article.article_type || 'review',
      title: article.title || 'Không có tiêu đề',
      content: article.content || '',
      platform_hint: article.platform_hint || 'general',
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('novel_articles')
      .insert(rows)
      .select();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ articles: inserted });
  } catch (err) {
    console.error('[novel-articles] Generation failed:', err);
    return NextResponse.json({ error: 'Tạo bài viết thất bại' }, { status: 500 });
  }
}

// DELETE: remove a single article
export async function DELETE(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('novel_articles')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

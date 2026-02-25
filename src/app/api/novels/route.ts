import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/integrations/supabase/server';
import { CreateNovelSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parseResult = CreateNovelSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const { title, ai_author_id, description, status, genres, cover_url } = parseResult.data;

    // Lấy tên tác giả theo ai_author_id để lưu cùng (giữ tương thích UI hiện tại)
    const { data: authorRecord, error: authorFetchError } = await supabase
      .from('ai_authors')
      .select('name')
      .eq('id', ai_author_id)
      .single();

    if (authorFetchError || !authorRecord?.name) {
      return NextResponse.json({ error: 'Không tìm thấy tác giả AI' }, { status: 404 });
    }

    const authorName = authorRecord.name;

    // Create new novel
    const { data: novel, error: insertError } = await supabase
      .from('novels')
      .insert({
        title,
        ai_author_id,
        author: authorName, // tên hiển thị để các trang hiện tại không lỗi
        description,
        status,
        genres,
        cover_url: cover_url || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create novel' }, { status: 500 });
    }

    return NextResponse.json({ novel });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
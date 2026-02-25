import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/integrations/supabase/server';
import { AuthorGenerator, generateQuickAuthor } from '@/services/story-writing-factory/author-generator';
import { AIAuthorGenerateSchema, AIAuthorBatchSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';

export const maxDuration = 120;

/**
 * POST /api/ai-authors/generate
 * Generate a new AI author profile (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify auth + admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const rawBody = await request.json();
    const parseResult = AIAuthorGenerateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const { genre, style, gender, age_group, use_ai, save_to_db } = parseResult.data;

    let generatedAuthor;

    if (use_ai) {
      // Use AI for detailed profile generation
      const generator = new AuthorGenerator('gemini', 'gemini-3-flash-preview');
      generatedAuthor = await generator.generateAuthor({
        genre,
        style,
        gender,
        age_group,
        specialty_count: 2,
      });
    } else {
      // Quick generation without AI (faster, uses templates)
      const quickAuthor = generateQuickAuthor(genre);
      generatedAuthor = {
        ...quickAuthor,
        avatar_prompt: `Anime-style portrait of an Asian writer, mysterious aura, traditional aesthetic`,
      };
    }

    // Optionally save to database
    if (save_to_db) {
      const { data: savedAuthor, error: saveError } = await supabase
        .from('ai_authors')
        .insert({
          name: generatedAuthor.name,
          bio: generatedAuthor.bio,
          writing_style_description: generatedAuthor.writing_style_description,
          ai_prompt_persona: generatedAuthor.ai_prompt_persona,
          specialized_genres: generatedAuthor.specialized_genres,
          status: 'active',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving author:', saveError);
        return NextResponse.json({
          generated: generatedAuthor,
          saved: false,
          error: 'Không thể lưu tác giả vào database',
        });
      }

      return NextResponse.json({
        generated: generatedAuthor,
        saved: true,
        author: savedAuthor,
      });
    }

    return NextResponse.json({
      generated: generatedAuthor,
      saved: false,
    });
  } catch (error) {
    console.error('Author generation error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo tác giả AI' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-authors/generate/batch
 * Generate multiple authors at once
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify auth + admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const rawBody = await request.json();
    const parseResult = AIAuthorBatchSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const { count, genres, save_to_db } = parseResult.data;

    // Limit batch size
    const batchCount = Math.min(count, 10);

    const generator = new AuthorGenerator('gemini', 'gemini-3-flash-preview');
    const authors = await generator.generateAuthorPool(batchCount, genres);

    if (save_to_db) {
      const authorsToInsert = authors.map(a => ({
        name: a.name,
        bio: a.bio,
        writing_style_description: a.writing_style_description,
        ai_prompt_persona: a.ai_prompt_persona,
        specialized_genres: a.specialized_genres,
        status: 'active' as const,
      }));

      const { data: savedAuthors, error: saveError } = await supabase
        .from('ai_authors')
        .insert(authorsToInsert)
        .select();

      if (saveError) {
        console.error('Error saving authors:', saveError);
        return NextResponse.json({
          generated: authors,
          saved: false,
          error: 'Không thể lưu tác giả vào database',
        });
      }

      return NextResponse.json({
        generated: authors,
        saved: true,
        authors: savedAuthors,
      });
    }

    return NextResponse.json({
      generated: authors,
      saved: false,
    });
  } catch (error) {
    console.error('Batch author generation error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo batch tác giả AI' },
      { status: 500 }
    );
  }
}

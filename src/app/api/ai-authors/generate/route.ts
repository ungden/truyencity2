import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/integrations/supabase/server';
import { AuthorGenerator, generateQuickAuthor } from '@/services/story-writing-factory/author-generator';

/**
 * POST /api/ai-authors/generate
 * Generate a new AI author profile
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      genre = 'tien-hiep',
      style = 'mixed',
      gender = 'neutral',
      age_group = 'middle',
      use_ai = true, // Use AI for detailed generation, false for quick generation
      save_to_db = false, // Whether to save directly to database
    } = body;

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

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      count = 5,
      genres = ['tien-hiep', 'huyen-huyen', 'do-thi'],
      save_to_db = false,
    } = body;

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

/**
 * Factory Authors API
 * GET: List AI author profiles
 * POST: Create/Update authors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorManagerService, FactoryGenre } from '@/services/factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre') as FactoryGenre | null;
    const view = searchParams.get('view') || 'list';
    const id = searchParams.get('id');

    const authorManager = getAuthorManagerService();

    if (id) {
      const result = await authorManager.getAuthor(id);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    if (view === 'leaderboard') {
      const metric = (searchParams.get('metric') || 'chapters') as 'stories' | 'chapters' | 'quality';
      const limit = parseInt(searchParams.get('limit') || '10');
      
      const result = await authorManager.getLeaderboard(metric, limit);
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (view === 'stats') {
      const result = await authorManager.getAuthorStats();
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (genre) {
      const result = await authorManager.getAuthorsByGenre(genre);
      return NextResponse.json({
        success: result.success,
        data: result.data,
        count: result.data?.length || 0,
        error: result.error,
      });
    }

    const result = await authorManager.getActiveAuthors();
    return NextResponse.json({
      success: result.success,
      data: result.data,
      count: result.data?.length || 0,
      error: result.error,
    });
  } catch (error) {
    console.error('[API] Authors GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    const authorManager = getAuthorManagerService();

    if (action === 'create') {
      const {
        pen_name,
        bio,
        writing_style,
        tone,
        vocabulary_level,
        primary_genres,
        secondary_genres,
        avoid_genres,
        persona_prompt,
        style_examples,
      } = body;

      if (!pen_name || !persona_prompt) {
        return NextResponse.json(
          { success: false, error: 'pen_name and persona_prompt are required' },
          { status: 400 }
        );
      }

      const result = await authorManager.createAuthor({
        pen_name,
        avatar_url: null,
        bio: bio || null,
        writing_style: writing_style || 'standard',
        tone: tone || 'balanced',
        vocabulary_level: vocabulary_level || 'standard',
        primary_genres: primary_genres || [],
        secondary_genres: secondary_genres || [],
        avoid_genres: avoid_genres || [],
        persona_prompt,
        style_examples: style_examples || null,
        status: 'active',
      });

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (action === 'update') {
      const authorId = body.author_id;
      const updates = body.updates;

      if (!authorId || !updates) {
        return NextResponse.json(
          { success: false, error: 'author_id and updates are required' },
          { status: 400 }
        );
      }

      // Only allow certain fields to be updated
      const allowedFields = [
        'pen_name',
        'avatar_url',
        'bio',
        'writing_style',
        'tone',
        'vocabulary_level',
        'primary_genres',
        'secondary_genres',
        'avoid_genres',
        'persona_prompt',
        'style_examples',
      ];

      const filteredUpdates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const result = await authorManager.updateAuthor(authorId, filteredUpdates);

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (action === 'set_status') {
      const authorId = body.author_id;
      const status = body.status;

      if (!authorId || !status) {
        return NextResponse.json(
          { success: false, error: 'author_id and status are required' },
          { status: 400 }
        );
      }

      if (!['active', 'inactive', 'retired'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'status must be active, inactive, or retired' },
          { status: 400 }
        );
      }

      const result = await authorManager.setAuthorStatus(authorId, status);

      return NextResponse.json({
        success: result.success,
        error: result.error,
      });
    }

    if (action === 'find_for_genre') {
      const genre = body.genre as FactoryGenre;

      if (!genre) {
        return NextResponse.json(
          { success: false, error: 'genre is required' },
          { status: 400 }
        );
      }

      const result = await authorManager.findAuthorForGenre(genre);

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Authors POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

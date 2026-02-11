/**
 * Factory Blueprints API
 * GET: List blueprints
 * POST: Create blueprints or actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getBlueprintFactoryService, 
  getIdeaBankService,
  getAuthorManagerService 
} from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/blueprints');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const id = searchParams.get('id');

    const blueprintFactory = getBlueprintFactoryService();

    if (id) {
      const result = await blueprintFactory.getBlueprint(id);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.errorCode === 'DB_SELECT_ERROR' ? 500 : 404 }
        );
      }
      return finalizeResponse(NextResponse.json({
        success: true,
        data: result.data,
      }), auth, '/api/factory/blueprints', 'GET');
    }

    const result = await blueprintFactory.getReadyBlueprints(limit);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return finalizeResponse(NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
    }), auth, '/api/factory/blueprints', 'GET');
  } catch (error) {
    console.error('[API] Blueprints GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/blueprints');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const action = body.action || 'create';

    const blueprintFactory = getBlueprintFactoryService();
    const ideaBank = getIdeaBankService();
    const authorManager = getAuthorManagerService();

    if (action === 'create') {
      // Create blueprint from idea
      const ideaId = body.idea_id;
      const authorId = body.author_id;
      const targetChapters = body.target_chapters || 1500;

      if (!ideaId) {
        return NextResponse.json(
          { success: false, error: 'idea_id is required' },
          { status: 400 }
        );
      }

      // Get idea
      const ideasResult = await ideaBank.getApprovedIdeas(1000);
      const idea = ideasResult.data?.find((i) => i.id === ideaId);
      
      if (!idea) {
        return NextResponse.json(
          { success: false, error: 'Idea not found or not approved' },
          { status: 404 }
        );
      }

      // Get author
      let author;
      if (authorId) {
        const authorResult = await authorManager.getAuthor(authorId);
        author = authorResult.data;
      } else {
        const authorResult = await authorManager.findAuthorForGenre(idea.genre);
        author = authorResult.data;
      }

      if (!author) {
        return NextResponse.json(
          { success: false, error: 'No suitable author found' },
          { status: 400 }
        );
      }

      const result = await blueprintFactory.generateAndSaveBlueprint({
        idea,
        author,
        target_chapters: targetChapters,
      });

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/blueprints', 'POST');
    }

    if (action === 'create_batch') {
      // Create blueprints from multiple approved ideas
      const limit = body.limit || 10;
      const targetChapters = body.target_chapters || 1500;

      const ideasResult = await ideaBank.getApprovedIdeas(limit);
      const authorsResult = await authorManager.getActiveAuthors();

      if (!ideasResult.data?.length) {
        return NextResponse.json({
          success: true,
          data: { total: 0, succeeded: 0, failed: 0 },
          message: 'No approved ideas to process',
        });
      }

      if (!authorsResult.data?.length) {
        return NextResponse.json(
          { success: false, error: 'No active authors available' },
          { status: 400 }
        );
      }

      const result = await blueprintFactory.batchGenerateBlueprints(
        ideasResult.data,
        authorsResult.data,
        targetChapters
      );

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: {
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      }), auth, '/api/factory/blueprints', 'POST');
    }

    if (action === 'generate_cover') {
      const blueprintId = body.blueprint_id;
      
      if (!blueprintId) {
        return NextResponse.json(
          { success: false, error: 'blueprint_id is required' },
          { status: 400 }
        );
      }

      const result = await blueprintFactory.generateCover(blueprintId);

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data ? { cover_url: result.data } : undefined,
        error: result.error,
      }), auth, '/api/factory/blueprints', 'POST');
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Blueprints POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

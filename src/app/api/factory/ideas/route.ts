/**
 * Factory Ideas API
 * GET: List story ideas
 * POST: Generate new ideas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIdeaBankService } from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/ideas');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'generated';
    const limit = parseInt(searchParams.get('limit') || '50');

    const ideaBank = getIdeaBankService();
    let result;

    switch (status) {
      case 'generated':
        result = await ideaBank.getPendingIdeas(limit);
        break;
      case 'approved':
        result = await ideaBank.getApprovedIdeas(limit);
        break;
      default:
        result = await ideaBank.getPendingIdeas(limit);
    }

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
    }), auth, '/api/factory/ideas', 'GET');
  } catch (error) {
    console.error('[API] Ideas GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/ideas');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const action = body.action || 'generate';

    const ideaBank = getIdeaBankService();

    if (action === 'generate') {
      const count = body.count || 10;
      const genreDistribution = body.genre_distribution;

      const result = await ideaBank.generateAndSaveIdeas(count, genreDistribution);

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: {
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      }), auth, '/api/factory/ideas', 'POST');
    }

    if (action === 'approve') {
      const ideaId = body.idea_id;
      if (!ideaId) {
        return NextResponse.json(
          { success: false, error: 'idea_id is required' },
          { status: 400 }
        );
      }

      const result = await ideaBank.approveIdea(ideaId);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/ideas', 'POST');
    }

    if (action === 'approve_all') {
      const limit = body.limit || 100;
      const result = await ideaBank.autoApproveIdeas(limit);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { approved: result.data },
        error: result.error,
      }), auth, '/api/factory/ideas', 'POST');
    }

    if (action === 'reject') {
      const ideaId = body.idea_id;
      const reason = body.reason || 'Rejected by admin';
      
      if (!ideaId) {
        return NextResponse.json(
          { success: false, error: 'idea_id is required' },
          { status: 400 }
        );
      }

      const result = await ideaBank.rejectIdea(ideaId, reason);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        error: result.error,
      }), auth, '/api/factory/ideas', 'POST');
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Ideas POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

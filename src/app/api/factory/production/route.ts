/**
 * Factory Production API
 * GET: List productions
 * POST: Production actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getProductionManagerService,
  getBlueprintFactoryService,
  getAuthorManagerService,
} from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/production');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const id = searchParams.get('id');

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (id) {
      const { data, error } = await supabase
        .from('production_queue')
        .select(`
          *,
          story_blueprints (title, genre, short_synopsis),
          ai_author_profiles (pen_name, writing_style),
          novels (title, slug, total_chapters)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }

      return finalizeResponse(NextResponse.json({
        success: true,
        data,
      }), auth, '/api/factory/production', 'GET');
    }

    let query = supabase
      .from('production_queue')
      .select(`
        *,
        story_blueprints (title, genre),
        ai_author_profiles (pen_name),
        novels (title, slug)
      `)
      .order('priority', { ascending: false })
      .order('queued_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return finalizeResponse(NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    }), auth, '/api/factory/production', 'GET');
  } catch (error) {
    console.error('[API] Production GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/production');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const action = body.action || 'start';

    const productionManager = getProductionManagerService();
    const blueprintFactory = getBlueprintFactoryService();
    const authorManager = getAuthorManagerService();

    if (action === 'start') {
      // Start production for a blueprint
      const blueprintId = body.blueprint_id;
      const authorId = body.author_id;
      const chaptersPerDay = body.chapters_per_day || 20;

      if (!blueprintId) {
        return NextResponse.json(
          { success: false, error: 'blueprint_id is required' },
          { status: 400 }
        );
      }

      const blueprintResult = await blueprintFactory.getBlueprint(blueprintId);
      if (!blueprintResult.success || !blueprintResult.data) {
        return NextResponse.json(
          { success: false, error: 'Blueprint not found' },
          { status: 404 }
        );
      }

      let author;
      if (authorId) {
        const authorResult = await authorManager.getAuthor(authorId);
        author = authorResult.data;
      } else {
        const authorResult = await authorManager.findAuthorForGenre(blueprintResult.data.genre);
        author = authorResult.data;
      }

      if (!author) {
        return NextResponse.json(
          { success: false, error: 'No suitable author found' },
          { status: 400 }
        );
      }

      const result = await productionManager.startProduction(
        blueprintResult.data,
        author,
        chaptersPerDay
      );

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/production', 'POST');
    }

    if (action === 'activate') {
      // Activate queued productions
      const count = body.count || 10;
      const maxActive = body.max_active || 500;

      const result = await productionManager.activateProductions(count, maxActive);

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { activated: result.data },
        error: result.error,
      }), auth, '/api/factory/production', 'POST');
    }

    if (action === 'pause') {
      const productionId = body.production_id;
      const reason = body.reason || 'Paused by admin';

      if (!productionId) {
        return NextResponse.json(
          { success: false, error: 'production_id is required' },
          { status: 400 }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase
        .from('production_queue')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: reason,
        })
        .eq('id', productionId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return finalizeResponse(NextResponse.json({ success: true }), auth, '/api/factory/production', 'POST');
    }

    if (action === 'resume') {
      const productionId = body.production_id;

      if (!productionId) {
        return NextResponse.json(
          { success: false, error: 'production_id is required' },
          { status: 400 }
        );
      }

      const result = await productionManager.resumeProduction(productionId);

      return finalizeResponse(NextResponse.json({
        success: result.success,
        error: result.error,
      }), auth, '/api/factory/production', 'POST');
    }

    if (action === 'set_priority') {
      const productionId = body.production_id;
      const priority = body.priority;

      if (!productionId || priority === undefined) {
        return NextResponse.json(
          { success: false, error: 'production_id and priority are required' },
          { status: 400 }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase
        .from('production_queue')
        .update({ priority })
        .eq('id', productionId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return finalizeResponse(NextResponse.json({ success: true }), auth, '/api/factory/production', 'POST');
    }

    if (action === 'stats') {
      const result = await productionManager.getProductionStats();

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/production', 'POST');
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Production POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

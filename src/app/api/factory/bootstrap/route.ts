/**
 * Factory Bootstrap API
 * POST: Bootstrap factory with initial stories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryOrchestrator, BootstrapConfig, BootstrapProgress } from '@/services/factory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const totalStories = body.total_stories || 100;
    if (totalStories < 1 || totalStories > 1000) {
      return NextResponse.json(
        { success: false, error: 'total_stories must be between 1 and 1000' },
        { status: 400 }
      );
    }

    const config: BootstrapConfig = {
      total_stories: totalStories,
      genre_distribution: body.genre_distribution,
      start_immediately: body.start_immediately ?? true,
    };

    const orchestrator = getFactoryOrchestrator();

    // Progress tracking (for long-running operation)
    const progressUpdates: BootstrapProgress[] = [];
    const onProgress = (progress: BootstrapProgress) => {
      progressUpdates.push({ ...progress });
    };

    const result = await orchestrator.bootstrap(config, onProgress);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      progress: progressUpdates,
      error: result.error,
    });
  } catch (error) {
    console.error('[API] Bootstrap error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

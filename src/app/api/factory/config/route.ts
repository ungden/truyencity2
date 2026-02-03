/**
 * Factory Config API
 * GET: Get factory configuration
 * PUT: Update factory configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryOrchestrator } from '@/services/factory';

export async function GET(request: NextRequest) {
  try {
    const orchestrator = getFactoryOrchestrator();
    const result = await orchestrator.getConfig();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[API] Config GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const orchestrator = getFactoryOrchestrator();

    // Validate allowed fields
    const allowedFields = [
      'ideas_per_day',
      'genre_distribution',
      'max_active_stories',
      'chapters_per_story_per_day',
      'new_stories_per_day',
      'min_chapters',
      'max_chapters',
      'target_chapter_length',
      'publish_slots',
      'min_chapter_quality',
      'max_rewrite_attempts',
      'ai_provider',
      'ai_model',
      'ai_image_model',
      'ai_temperature',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const result = await orchestrator.updateConfig(updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[API] Config PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

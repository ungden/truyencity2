/**
 * Factory Publishing API
 * GET: Get publishing schedule and stats
 * POST: Publishing actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublishingSchedulerService } from '@/services/factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'today';
    const hours = parseInt(searchParams.get('hours') || '24');

    const publishingScheduler = getPublishingSchedulerService();

    if (view === 'today') {
      const result = await publishingScheduler.getTodaySchedule();
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (view === 'upcoming') {
      const result = await publishingScheduler.getUpcomingPublishes(hours);
      return NextResponse.json({
        success: result.success,
        data: result.data,
        count: result.data?.length || 0,
        error: result.error,
      });
    }

    if (view === 'stats') {
      const result = await publishingScheduler.getPublishingStats();
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (view === 'due') {
      const limit = parseInt(searchParams.get('limit') || '100');
      const result = await publishingScheduler.getChaptersDueForPublishing(limit);
      return NextResponse.json({
        success: result.success,
        data: result.data,
        count: result.data?.length || 0,
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown view: ${view}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Publishing GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'publish_due';

    const publishingScheduler = getPublishingSchedulerService();

    if (action === 'publish_due') {
      const result = await publishingScheduler.publishDueChapters();
      return NextResponse.json({
        success: result.success,
        data: {
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      });
    }

    if (action === 'publish') {
      const queueItemId = body.queue_item_id;
      
      if (!queueItemId) {
        return NextResponse.json(
          { success: false, error: 'queue_item_id is required' },
          { status: 400 }
        );
      }

      const result = await publishingScheduler.publishChapter(queueItemId);
      return NextResponse.json({
        success: result.success,
        error: result.error,
      });
    }

    if (action === 'schedule') {
      const { production_id, chapter_id, slot, scheduled_time } = body;

      if (!production_id || !chapter_id || !slot) {
        return NextResponse.json(
          { success: false, error: 'production_id, chapter_id, and slot are required' },
          { status: 400 }
        );
      }

      const result = await publishingScheduler.schedulePublish(
        production_id,
        chapter_id,
        slot,
        scheduled_time ? new Date(scheduled_time) : undefined
      );

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (action === 'reschedule') {
      const queueItemId = body.queue_item_id;
      const newTime = body.new_time;

      if (!queueItemId || !newTime) {
        return NextResponse.json(
          { success: false, error: 'queue_item_id and new_time are required' },
          { status: 400 }
        );
      }

      const result = await publishingScheduler.reschedulePublish(
        queueItemId,
        new Date(newTime)
      );

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    if (action === 'cancel') {
      const queueItemId = body.queue_item_id;

      if (!queueItemId) {
        return NextResponse.json(
          { success: false, error: 'queue_item_id is required' },
          { status: 400 }
        );
      }

      const result = await publishingScheduler.cancelPublish(queueItemId);
      return NextResponse.json({
        success: result.success,
        error: result.error,
      });
    }

    if (action === 'retry_failed') {
      const maxRetries = body.max_retries || 3;
      const result = await publishingScheduler.retryFailedPublishes(maxRetries);
      return NextResponse.json({
        success: result.success,
        data: { retried: result.data },
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Publishing POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Factory Control API
 * POST: Control factory operations (start, stop, run tasks)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryOrchestrator } from '@/services/factory';

type ActionType = 'start' | 'stop' | 'run_daily' | 'run_main_loop';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as ActionType;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const orchestrator = getFactoryOrchestrator();
    let result;

    switch (action) {
      case 'start':
        result = await orchestrator.start();
        break;

      case 'stop':
        result = await orchestrator.stop();
        break;

      case 'run_daily':
        result = await orchestrator.runDailyTasks();
        break;

      case 'run_main_loop':
        result = await orchestrator.runMainLoop();
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      data: result.data,
    });
  } catch (error) {
    console.error('[API] Control error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

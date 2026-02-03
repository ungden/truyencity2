/**
 * Factory Dashboard API
 * GET: Get dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryOrchestrator } from '@/services/factory';

export async function GET(request: NextRequest) {
  try {
    const orchestrator = getFactoryOrchestrator();
    const result = await orchestrator.getDashboardStats();

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
    console.error('[API] Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

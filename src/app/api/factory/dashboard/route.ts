/**
 * Factory Dashboard API
 * GET: Get dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryOrchestrator } from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/dashboard');
    if (!auth.success) return auth.response;

    const orchestrator = getFactoryOrchestrator();
    const result = await orchestrator.getDashboardStats();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return finalizeResponse(NextResponse.json({
      success: true,
      data: result.data,
    }), auth, '/api/factory/dashboard', 'GET');
  } catch (error) {
    console.error('[API] Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Factory Errors API
 * GET: List errors
 * POST: Error actions (acknowledge, resolve, ignore)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorHandlerService, ErrorSeverity } from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/errors');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'new';
    const severity = searchParams.get('severity') as ErrorSeverity | null;
    const productionId = searchParams.get('production_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const days = parseInt(searchParams.get('days') || '7');

    const errorHandler = getErrorHandlerService();

    if (view === 'summary' || view === 'dashboard') {
      const result = await errorHandler.getDashboardSummary();
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/errors', 'GET');
    }

    if (view === 'stats') {
      const result = await errorHandler.getErrorStats(days);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/errors', 'GET');
    }

    if (productionId) {
      const result = await errorHandler.getProductionErrors(productionId);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        count: result.data?.length || 0,
        error: result.error,
      }), auth, '/api/factory/errors', 'GET');
    }

    if (severity) {
      const result = await errorHandler.getErrorsBySeverity(severity, limit);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        count: result.data?.length || 0,
        error: result.error,
      }), auth, '/api/factory/errors', 'GET');
    }

    // Default: get new errors
    const result = await errorHandler.getNewErrors(limit);
    return finalizeResponse(NextResponse.json({
      success: result.success,
      data: result.data,
      count: result.data?.length || 0,
      error: result.error,
    }), auth, '/api/factory/errors', 'GET');
  } catch (error) {
    console.error('[API] Errors GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/errors');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const action = body.action || 'acknowledge';

    const errorHandler = getErrorHandlerService();

    if (action === 'acknowledge') {
      const errorId = body.error_id;

      if (!errorId) {
        return NextResponse.json(
          { success: false, error: 'error_id is required' },
          { status: 400 }
        );
      }

      const result = await errorHandler.acknowledgeError(errorId);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'acknowledge_bulk') {
      const errorIds = body.error_ids as string[];

      if (!errorIds || !Array.isArray(errorIds)) {
        return NextResponse.json(
          { success: false, error: 'error_ids array is required' },
          { status: 400 }
        );
      }

      const result = await errorHandler.bulkAcknowledge(errorIds);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { acknowledged: result.data },
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'resolve') {
      const errorId = body.error_id;
      const resolvedBy = body.resolved_by || 'admin';
      const notes = body.notes;

      if (!errorId) {
        return NextResponse.json(
          { success: false, error: 'error_id is required' },
          { status: 400 }
        );
      }

      const result = await errorHandler.resolveError(errorId, resolvedBy, notes, false);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'ignore') {
      const errorId = body.error_id;

      if (!errorId) {
        return NextResponse.json(
          { success: false, error: 'error_id is required' },
          { status: 400 }
        );
      }

      const result = await errorHandler.ignoreError(errorId);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'auto_resolve_old') {
      const daysOld = body.days_old || 7;
      const result = await errorHandler.autoResolveOldErrors(daysOld);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { resolved: result.data },
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'cleanup') {
      const daysOld = body.days_old || 30;
      const result = await errorHandler.cleanupOldErrors(daysOld);
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { deleted: result.data },
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'log') {
      // Manually log an error
      const {
        error_type,
        error_message,
        production_id,
        novel_id,
        chapter_number,
        severity,
        error_code,
        error_details,
      } = body;

      if (!error_type || !error_message) {
        return NextResponse.json(
          { success: false, error: 'error_type and error_message are required' },
          { status: 400 }
        );
      }

      const result = await errorHandler.logError({
        error_type,
        error_message,
        production_id,
        novel_id,
        chapter_number,
        severity: severity || 'warning',
        error_code,
        error_details,
      });

      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    if (action === 'check_alerts') {
      const result = await errorHandler.shouldAlertAdmin();
      return finalizeResponse(NextResponse.json({
        success: result.success,
        data: { should_alert: result.data },
        error: result.error,
      }), auth, '/api/factory/errors', 'POST');
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Errors POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

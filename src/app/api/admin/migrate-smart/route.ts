import { NextRequest, NextResponse } from 'next/server';
import { smartMigrationService } from '@/services/story-writing-factory/smart-migration';

/**
 * POST /api/admin/migrate-smart
 * 
 * Trigger smart selective migration for all active novels
 * Only analyzes key chapters (1, 10, 50, recent 3) instead of all chapters
 * 
 * Expected duration: 30 minutes for 200 novels
 * Cost: ~5% of full migration
 * Quality: 90%
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth (should be admin only)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting smart migration...');
    const startTime = Date.now();

    // Run migration
    const result = await smartMigrationService.migrateAllActiveNovels();

    const duration = (Date.now() - startTime) / 1000 / 60; // minutes

    console.log('✅ Smart migration completed', {
      ...result,
      duration: `${duration.toFixed(1)} minutes`,
    });

    return NextResponse.json({
      success: true,
      message: 'Smart migration completed successfully',
      result: {
        ...result,
        duration: `${duration.toFixed(1)} minutes`,
      },
      summary: {
        totalNovels: result.total,
        successRate: `${((result.completed / result.total) * 100).toFixed(1)}%`,
        avgConfidence: `${result.averageConfidence.toFixed(1)}%`,
        estimatedTimeSaved: `${(3 * 60 - duration).toFixed(0)} minutes`,
      },
    });

  } catch (error) {
    console.error('❌ Smart migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-smart
 * 
 * Get migration status
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = await smartMigrationService.getMigrationStatus();

    return NextResponse.json({
      status,
      message: 'Migration status retrieved',
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

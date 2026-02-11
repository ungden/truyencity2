import { NextRequest, NextResponse } from 'next/server';
import { smartMigrationService } from '@/services/story-writing-factory/smart-migration';
import { createServerClient } from '@/integrations/supabase/server';

export const maxDuration = 300;

async function isAuthorizedAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

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
    const isAuthorized = await isAuthorizedAdmin(request);
    if (!isAuthorized) {
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
        totalBatches: Math.ceil(result.total / 5),
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
    const isAuthorized = await isAuthorizedAdmin(request);
    if (!isAuthorized) {
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

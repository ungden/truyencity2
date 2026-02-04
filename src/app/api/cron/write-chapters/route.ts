/**
 * Vercel Cron: Write Chapters
 * 
 * Runs on schedule to continue writing chapters for active projects.
 * - Finds active ai_story_projects with current_chapter < total_planned_chapters
 * - Writes 2-5 chapters per project per run
 * - Protected by CRON_SECRET header
 * 
 * Schedule: Every 6 hours (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig, GenreType } from '@/services/story-writing-factory/types';

const CHAPTERS_PER_RUN = 3; // Write 3 chapters per project per cron run
const MAX_PROJECTS_PER_RUN = 2; // Process max 2 projects per cron invocation

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify this is a legitimate cron request from Vercel
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Auth check
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { success: false, error: 'GEMINI_API_KEY not configured' },
      { status: 500 }
    );
  }

  const supabase = getSupabaseAdmin();
  const results: Array<{
    projectId: string;
    title: string;
    chaptersWritten: number;
    error?: string;
  }> = [];

  try {
    // Find active projects that need more chapters
    const { data: activeProjects, error: fetchError } = await supabase
      .from('ai_story_projects')
      .select(`
        id, main_character, genre, status,
        current_chapter, total_planned_chapters,
        world_description, writing_style, temperature,
        target_chapter_length,
        novels!ai_story_projects_novel_id_fkey (id, title)
      `)
      .eq('status', 'active')
      .order('updated_at', { ascending: true }) // Oldest first (fairness)
      .limit(MAX_PROJECTS_PER_RUN);

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: `DB query failed: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!activeProjects || activeProjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active projects need chapters',
        results: [],
      });
    }

    // Process each active project
    for (const project of activeProjects) {
      const currentCh = project.current_chapter || 0;
      const totalPlanned = project.total_planned_chapters || 200;

      // Skip if already completed
      if (currentCh >= totalPlanned) {
        await supabase
          .from('ai_story_projects')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', project.id);
        continue;
      }

      // Get novel info
      const novel = Array.isArray(project.novels)
        ? project.novels[0]
        : project.novels;
      const novelId = novel?.id;
      const novelTitle = novel?.title || 'Unknown';

      if (!novelId) {
        results.push({
          projectId: project.id,
          title: novelTitle,
          chaptersWritten: 0,
          error: 'No linked novel found',
        });
        continue;
      }

      // Calculate how many chapters to write
      const remaining = totalPlanned - currentCh;
      const chaptersToWrite = Math.min(CHAPTERS_PER_RUN, remaining);

      try {
        // Create AI service + runner
        const aiService = new AIProviderService({ gemini: geminiKey });

        const factoryConfig: Partial<FactoryConfig> = {
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
          temperature: project.temperature || 1.0,
          maxTokens: 8192,
          targetWordCount: project.target_chapter_length || 2500,
          genre: (project.genre || 'tien-hiep') as GenreType,
          minQualityScore: 5,
          maxRetries: 2,
          use3AgentWorkflow: true,
        };

        const runnerConfig: Partial<RunnerConfig> = {
          delayBetweenChapters: 3000,
          delayBetweenArcs: 5000,
          maxChapterRetries: 2,
          autoSaveEnabled: true,
          autoSaveInterval: 1,
          minQualityToProgress: 5,
          pauseOnError: false,
          pauseAfterArc: false,
        };

        const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);
        let chaptersCompleted = 0;

        // Set callbacks to save chapters
        runner.setCallbacks({
          onChapterCompleted: async (chNum, result) => {
            if (result.data) {
              const { error: saveError } = await supabase.from('chapters').upsert({
                novel_id: novelId,
                chapter_number: chNum,
                title: result.data.title,
                content: result.data.content,
              }, { onConflict: 'novel_id,chapter_number' });

              if (!saveError) {
                chaptersCompleted++;
                // Update project progress
                await supabase
                  .from('ai_story_projects')
                  .update({
                    current_chapter: chNum,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', project.id);
              }
            }
          },
          onChapterFailed: (chNum, error) => {
            console.error(`[Cron] Project ${project.id} Ch.${chNum} failed:`, error);
          },
          onError: (error) => {
            console.error(`[Cron] Project ${project.id} error:`, error);
          },
        });

        // Run synchronously (cron can wait up to 60s on Vercel Hobby, 300s on Pro)
        const runResult = await runner.run({
          title: novelTitle,
          protagonistName: project.main_character || 'Nhân vật chính',
          genre: (project.genre || 'tien-hiep') as GenreType,
          premise: project.world_description || novelTitle,
          targetChapters: chaptersToWrite,
          chaptersPerArc: chaptersToWrite,
          projectId: project.id,
        });

        results.push({
          projectId: project.id,
          title: novelTitle,
          chaptersWritten: chaptersCompleted,
          error: runResult.success ? undefined : runResult.error,
        });

        // Mark completed if all chapters done
        if ((currentCh + chaptersCompleted) >= totalPlanned) {
          await supabase
            .from('ai_story_projects')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', project.id);
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] Project ${project.id} error:`, errorMsg);
        results.push({
          projectId: project.id,
          title: novelTitle,
          chaptersWritten: 0,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} projects`,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] write-chapters error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Vercel Cron config
export const maxDuration = 300; // 5 minutes (Pro plan), 60s on Hobby
export const dynamic = 'force-dynamic';

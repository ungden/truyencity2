/**
 * Supabase pg_cron Target: Write Chapters
 * 
 * Called by Supabase pg_cron + pg_net every 5 minutes.
 * - Finds 15 active projects (Round-Robin via updated_at)
 * - Writes 1 chapter for each project in PARALLEL
 * - Designed for high throughput (approx 4,320 chapters/day)
 * 
 * Flow:
 * 1. Auth check (CRON_SECRET)
 * 2. Select 15 projects
 * 3. Promise.all([Runner1, Runner2, ...])
 * 4. Return results
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig, GenreType } from '@/services/story-writing-factory/types';
import { randomUUID } from 'crypto';

// CONFIGURATION
const PROJECTS_PER_BATCH = 15; // 15 projects in parallel
const CHAPTERS_PER_PROJECT = 1; // 1 chapter per run
const TIMEOUT_MS = 250000; // 250s (leave buffer for Vercel 300s limit)

// Do not use Edge Runtime, need Node.js for heavier parallel processing
export const maxDuration = 300; // 5 minutes (Pro plan)
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // 1. Auth Check
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 2. Select Batch of Projects (Round Robin)
    // We order by updated_at ASC to pick the ones that haven't been touched in a while
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
      .lt('current_chapter', 2000) // Safety limit, though status should handle this
      .order('updated_at', { ascending: true }) // Oldest first
      .limit(PROJECTS_PER_BATCH);

    if (fetchError) throw fetchError;

    if (!activeProjects || activeProjects.length === 0) {
      return NextResponse.json({ success: true, message: 'No active projects found' });
    }

    // Filter valid projects
    const validProjects = activeProjects.filter(p => {
      const total = p.total_planned_chapters || 200;
      const current = p.current_chapter || 0;
      return current < total && p.novels; // Must have linked novel
    });

    if (validProjects.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid projects to process' });
    }

    // 3. Mark them as "processing" by updating updated_at immediately
    // This prevents them from being picked up again if another cron fires overlappingly
    const projectIds = validProjects.map(p => p.id);
    await supabase
      .from('ai_story_projects')
      .update({ updated_at: new Date().toISOString() })
      .in('id', projectIds);

    console.log(`[Cron] Processing batch of ${validProjects.length} projects...`);

    // 4. Run Writers in PARALLEL
    const results = await Promise.allSettled(validProjects.map(async (project) => {
      try {
        const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
        if (!novel?.id) throw new Error("No novel linked");

        const aiService = new AIProviderService({ gemini: geminiKey });

        // Config tailored for speed/throughput
        const factoryConfig: Partial<FactoryConfig> = {
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
          temperature: project.temperature || 1.0,
          maxTokens: 8192,
          targetWordCount: project.target_chapter_length || 2500,
          genre: (project.genre || 'tien-hiep') as GenreType,
          minQualityScore: 5,
          maxRetries: 1, // Minimize retries to save time
          use3AgentWorkflow: true,
        };

        const runnerConfig: Partial<RunnerConfig> = {
          delayBetweenChapters: 100, // Minimal delay
          delayBetweenArcs: 100,
          maxChapterRetries: 1,
          autoSaveEnabled: false, // We handle saving manually
          minQualityToProgress: 4, // Slightly looser quality for mass production
          pauseOnError: false,
        };

        const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);
        
        // Setup Save Callback
        runner.setCallbacks({
          onChapterCompleted: async (chNum, result) => {
            if (result.data) {
              await supabase.from('chapters').upsert({
                novel_id: novel.id,
                chapter_number: chNum,
                title: result.data.title,
                content: result.data.content,
              }, { onConflict: 'novel_id,chapter_number' });
              
              // Update progress
              await supabase.from('ai_story_projects').update({
                current_chapter: chNum,
                updated_at: new Date().toISOString()
              }).eq('id', project.id);
            }
          },
          onError: (e) => console.error(`[Project ${project.id}] Error: ${e}`)
        });

        // Execute Run (1 Chapter)
        const result = await runner.run({
          title: novel.title,
          protagonistName: project.main_character || 'MC',
          genre: (project.genre || 'tien-hiep') as GenreType,
          premise: project.world_description || novel.title,
          targetChapters: project.total_planned_chapters || 200,
          chaptersPerArc: 20,
          projectId: project.id,
          chaptersToWrite: 1, // Explicitly just 1
          currentChapter: project.current_chapter || 0 // Resume from DB state
        });

        // Check completion status
        const nextCh = (project.current_chapter || 0) + 1;
        if (nextCh >= (project.total_planned_chapters || 200)) {
           await supabase.from('ai_story_projects')
             .update({ status: 'completed' })
             .eq('id', project.id);
        }

        return { 
          id: project.id, 
          title: novel.title, 
          success: result.success, 
          error: result.error 
        };

      } catch (err) {
        throw new Error(`Project ${project.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }));

    const summary = results.map(r => 
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason.message }
    );

    const successCount = summary.filter(r => r.success).length;
    const duration = (Date.now() - startTime) / 1000;

    console.log(`[Cron] Batch completed in ${duration}s. Success: ${successCount}/${validProjects.length}`);

    return NextResponse.json({
      success: true,
      processed: validProjects.length,
      successCount,
      durationSeconds: duration,
      results: summary
    });

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Story Runner API
 * 
 * POST: Start a new story run (creates novel + project + starts writing)
 * GET: List all runner projects with status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig, GenreType } from '@/services/story-writing-factory/types';

// In-memory runner registry (per-process)
const activeRunners = new Map<string, {
  runner: StoryRunner;
  status: 'running' | 'completed' | 'error';
  startedAt: number;
  logs: string[];
}>();

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: List all runner projects
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: projects, error } = await supabase
      .from('ai_story_projects')
      .select(`
        id, main_character, genre, status, ai_model,
        current_chapter, total_planned_chapters,
        created_at, updated_at,
        novels!ai_story_projects_novel_id_fkey (id, title, author)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Enrich with in-memory runner status
    const enriched = (projects || []).map(p => ({
      ...p,
      runnerActive: activeRunners.has(p.id),
      runnerStatus: activeRunners.get(p.id)?.status || null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[API] Story runner GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Start a new story run
 * 
 * Body: {
 *   title: string,
 *   protagonistName: string,
 *   genre?: GenreType,
 *   premise?: string,
 *   targetChapters?: number,
 *   chaptersPerArc?: number,
 *   chaptersToWrite?: number,  // How many chapters to write in this run (default: all)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const existingProjectId: string | undefined = body.projectId;

    let title: string | undefined = body.title;
    let protagonistName: string | undefined = body.protagonistName;
    let genre: GenreType = (body.genre || 'tien-hiep') as GenreType;
    let premise: string | undefined = body.premise;
    let targetChapters: number = body.targetChapters || 200;
    const chaptersPerArc: number = body.chaptersPerArc || 20;
    const chaptersToWrite: number | undefined = body.chaptersToWrite;

    // Check Gemini API key
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const projectId = existingProjectId || randomUUID();

    // Create novel record if new project
    let novelId: string | null = null;
    if (!existingProjectId) {
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert({
          title,
          author: 'AI Writer',
          description: premise || `${title} - AI Generated Story`,
          status: 'ongoing',
          genres: [genre],
        })
        .select('id')
        .single();

      if (novelError) {
        return NextResponse.json(
          { success: false, error: `Failed to create novel: ${novelError.message}` },
          { status: 500 }
        );
      }
      novelId = novel.id;

      // Link novel to project
      await supabase.from('ai_story_projects').upsert({
        id: projectId,
        novel_id: novelId,
        main_character: protagonistName,
        genre,
        total_planned_chapters: targetChapters,
        status: 'active',
        ai_model: 'gemini-3-flash-preview',
        writing_style: 'webnovel_chinese',
        target_chapter_length: 2500,
        temperature: 1.0,
        current_chapter: 0,
        world_description: premise || title,
      });
    } else {
      // Get existing project metadata
      const { data: existing, error: existingError } = await supabase
        .from('ai_story_projects')
        .select('novel_id,current_chapter,total_planned_chapters,main_character,genre,world_description')
        .eq('id', existingProjectId)
        .single();

      if (existingError || !existing) {
        return NextResponse.json(
          { success: false, error: `Failed to load project: ${existingError?.message || 'not found'}` },
          { status: 404 },
        );
      }

      novelId = existing.novel_id || null;

      // Fill missing request fields from project record for canonical resume behavior
      if (!protagonistName && existing.main_character) {
        protagonistName = existing.main_character;
      }
      if (!body.genre && existing.genre) {
        genre = existing.genre as GenreType;
      }
      if (!premise && existing.world_description) {
        premise = existing.world_description;
      }
      if (!body.targetChapters && existing.total_planned_chapters) {
        targetChapters = existing.total_planned_chapters;
      }
      if (body.currentChapter == null && existing.current_chapter != null) {
        body.currentChapter = existing.current_chapter;
      }
    }

    if (!title || !protagonistName) {
      return NextResponse.json(
        { success: false, error: 'title and protagonistName are required (or available on existing project)' },
        { status: 400 }
      );
    }

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: 'Project has no novel_id. Canonical pipeline requires novel linkage.' },
        { status: 400 },
      );
    }

    // Create AI service
    const aiService = new AIProviderService({ gemini: geminiKey });

    // Configure runner
    const factoryConfig: Partial<FactoryConfig> = {
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
      temperature: 1.0,
      maxTokens: 8192,
      targetWordCount: 2500,
      genre,
      minQualityScore: 5,
      maxRetries: 2,
      use3AgentWorkflow: true,
    };

    const runnerConfig: Partial<RunnerConfig> = {
      delayBetweenChapters: 2000,
      delayBetweenArcs: 3000,
      maxChapterRetries: 2,
      autoSaveEnabled: true,
      autoSaveInterval: 1,
      minQualityToProgress: 5,
      pauseOnError: false,
      pauseAfterArc: false,
    };

    const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);
    const logs: string[] = [];

    // Register runner
    activeRunners.set(projectId, {
      runner,
      status: 'running',
      startedAt: Date.now(),
      logs,
    });

    // Set callbacks
    runner.setCallbacks({
      onChapterCompleted: async (chNum, result) => {
        if (result.data && novelId) {
          // Save chapter to chapters table
          const { error } = await supabase.from('chapters').upsert({
            novel_id: novelId,
            chapter_number: chNum,
            title: result.data.title,
            content: result.data.content,
          }, { onConflict: 'novel_id,chapter_number' });

          if (error) {
            logs.push(`[Ch.${chNum}] DB save failed: ${error.message}`);
          } else {
            logs.push(`[Ch.${chNum}] "${result.data.title}" saved (${result.data.wordCount} words)`);
          }

          // Update project current_chapter
          await supabase
            .from('ai_story_projects')
            .update({ current_chapter: chNum, updated_at: new Date().toISOString() })
            .eq('id', projectId);
        }
      },
      onChapterFailed: (chNum, error) => {
        logs.push(`[Ch.${chNum}] FAILED: ${error}`);
      },
      onCompleted: () => {
        const entry = activeRunners.get(projectId);
        if (entry) entry.status = 'completed';
        logs.push(`[DONE] Story completed`);
      },
      onError: (error) => {
        logs.push(`[ERROR] ${error}`);
      },
    });

    // Start the run in background (don't await — return immediately)
    const actualChapters = chaptersToWrite || 1;
    const canonicalTarget = Math.max(targetChapters || 1, (body.currentChapter || 0) + actualChapters);
    runner.run({
      title,
      protagonistName,
      genre,
      premise,
      targetChapters: canonicalTarget,
      chaptersPerArc,
      projectId,
      novelId,
      chaptersToWrite: actualChapters,
      currentChapter: body.currentChapter,
    }).then((result) => {
      const entry = activeRunners.get(projectId);
      if (entry) {
        entry.status = result.success ? 'completed' : 'error';
        if (!result.success) {
          logs.push(`[ERROR] Run failed: ${result.error}`);
        }
      }
    }).catch((err) => {
      const entry = activeRunners.get(projectId);
      if (entry) {
        entry.status = 'error';
        logs.push(`[FATAL] ${err.message}`);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        novelId,
        status: 'started',
        message: `Started writing "${title}" with ${actualChapters} chapters`,
      },
    });
  } catch (error) {
    console.error('[API] Story runner POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

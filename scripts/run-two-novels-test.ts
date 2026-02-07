import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig, GenreType } from '@/services/story-writing-factory/types';

type ProjectRow = {
  id: string;
  novel_id: string;
  main_character: string | null;
  genre: string | null;
  current_chapter: number | null;
  target_chapter_length: number | null;
  temperature: number | null;
  world_description: string | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
};

dotenv.config({ path: '.env.local' });

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function normalizeNovel(project: ProjectRow): { id: string; title: string } {
  const raw = project.novels;
  const novel = Array.isArray(raw) ? raw[0] : raw;
  if (!novel?.id || !novel?.title) {
    throw new Error(`Project ${project.id} has no linked novel`);
  }
  return novel;
}

async function runForProject(
  project: ProjectRow,
  supabase: any,
  geminiKey: string
): Promise<{ projectId: string; title: string; success: boolean; error?: string; wrote: number; durationSec: number }> {
  const novel = normalizeNovel(project);
  const current = project.current_chapter || 0;
  const toWrite = Math.max(0, 30 - current);

  if (toWrite === 0) {
    return {
      projectId: project.id,
      title: novel.title,
      success: true,
      wrote: 0,
      durationSec: 0,
    };
  }

  const ai = new AIProviderService({ gemini: geminiKey });

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
    delayBetweenChapters: 100,
    delayBetweenArcs: 100,
    maxChapterRetries: 2,
    autoSaveEnabled: false,
    minQualityToProgress: 4,
    pauseOnError: false,
  };

  const runner = new StoryRunner(factoryConfig, runnerConfig, ai);
  const startedAt = Date.now();

  runner.setCallbacks({
    onChapterCompleted: async (chapterNumber, result) => {
      if (!result.data) return;

      const { error: upsertErr } = await (supabase as any).from('chapters').upsert(
        {
          novel_id: novel.id,
          chapter_number: chapterNumber,
          title: result.data.title,
          content: result.data.content,
        },
        { onConflict: 'novel_id,chapter_number' }
      );

      if (upsertErr) {
        process.stdout.write(`\n[${novel.title}] SAVE FAILED ch${chapterNumber}: ${upsertErr.message}`);
        return;
      }

      // Verify the chapter was actually saved
      const { data: saved } = await (supabase as any)
        .from('chapters')
        .select('chapter_number')
        .eq('novel_id', novel.id)
        .eq('chapter_number', chapterNumber)
        .single();

      if (!saved) {
        process.stdout.write(`\n[${novel.title}] VERIFY FAILED ch${chapterNumber}: not found after upsert`);
        return;
      }

      await (supabase as any)
        .from('ai_story_projects')
        .update({
          current_chapter: chapterNumber,
          total_planned_chapters: 30,
          status: chapterNumber >= 30 ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      const titlePreview = (result.data.title || '').substring(0, 40);
      const wordCount = result.data.wordCount || 0;
      process.stdout.write(`\n[${novel.title}] ch${chapterNumber}/30 OK | ${wordCount}w | "${titlePreview}"`);
    },
    onError: (err) => {
      process.stdout.write(`\n[${novel.title}] error: ${err}`);
    },
  });

  process.stdout.write(`\n--- Running: ${novel.title} (project ${project.id.slice(0, 8)}) from chapter ${current + 1} to 30 ---\n`);

  const runResult = await runner.run({
    title: novel.title,
    protagonistName: project.main_character || 'Nhân vật chính',
    genre: (project.genre || 'tien-hiep') as GenreType,
    premise: project.world_description || novel.title,
    targetChapters: 30,
    chaptersPerArc: 10,
    projectId: project.id,
    chaptersToWrite: toWrite,
    currentChapter: current,
  });

  const durationSec = Math.round((Date.now() - startedAt) / 1000);
  const wrote = runResult.state.currentChapter - current;

  return {
    projectId: project.id,
    title: novel.title,
    success: runResult.success,
    error: runResult.error,
    wrote,
    durationSec,
  };
}

async function main() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = getEnv('GEMINI_API_KEY');

  const supabase: any = createClient(supabaseUrl, supabaseKey);

  const projectIds = process.env.PROJECT_IDS
    ? process.env.PROJECT_IDS.split(',').map(s => s.trim()).filter(Boolean)
    : null;

  let query = supabase
    .from('ai_story_projects')
    .select(`
      id,
      novel_id,
      main_character,
      genre,
      current_chapter,
      target_chapter_length,
      temperature,
      world_description,
      novels!ai_story_projects_novel_id_fkey (id, title)
    `);

  if (projectIds && projectIds.length > 0) {
    query = query.in('id', projectIds);
  } else {
    query = query.eq('status', 'active').order('updated_at', { ascending: true }).limit(2);
  }

  const { data: candidates, error } = await query;

  if (error) throw error;
  if (!candidates || candidates.length === 0) {
    throw new Error('No projects found for test run');
  }

  const projects = candidates as ProjectRow[];

  process.stdout.write(`Found ${projects.length} project(s). Starting run to chapter 30.\n`);

  const results: Array<{
    projectId: string;
    title: string;
    success: boolean;
    error?: string;
    wrote: number;
    durationSec: number;
  }> = [];

  for (const project of projects) {
    const result = await runForProject(project, supabase, geminiKey);
    results.push(result);
  }

  // ========== POST-RUN VERIFICATION ==========
  process.stdout.write('\n\n=== VERIFYING SAVED CHAPTERS ===\n');
  for (const project of projects) {
    const novel = normalizeNovel(project);
    const { data: chapters, error: chErr } = await supabase
      .from('chapters')
      .select('chapter_number, title')
      .eq('novel_id', novel.id)
      .lte('chapter_number', 30)
      .order('chapter_number', { ascending: true });

    if (chErr) {
      process.stdout.write(`[${novel.title}] DB error: ${chErr.message}\n`);
      continue;
    }

    const saved = (chapters || []).map((c: any) => c.chapter_number);
    const missing: number[] = [];
    for (let i = 1; i <= 30; i++) {
      if (!saved.includes(i)) missing.push(i);
    }
    const genericCount = (chapters || []).filter((c: any) => /^Chương\s+\d+$/i.test((c.title || '').trim())).length;

    process.stdout.write(
      `[${novel.title}] ${saved.length}/30 chapters saved | ` +
      `missing=[${missing.join(',')}] | ` +
      `generic_titles=${genericCount}/${saved.length}\n`
    );
  }

  process.stdout.write('\n=== TEST RESULT ===\n');
  for (const item of results) {
    process.stdout.write(
      `${item.success ? 'OK' : 'FAIL'} | ${item.title} | wrote=${item.wrote} | duration=${item.durationSec}s${item.error ? ` | error=${item.error}` : ''}\n`
    );
  }

  const failed = results.filter(r => !r.success).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nFatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

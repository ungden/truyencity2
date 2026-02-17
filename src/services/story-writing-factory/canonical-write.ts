import type { SupabaseClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from './runner';
import type { FactoryConfig, GenreType, RunnerConfig } from './types';
import { summarizeChapter, generateSynopsis, generateArcPlan, generateStoryBible } from './context-generators';
import { ContextLoader, saveChapterSummary } from './context-loader';

type ProjectRow = {
  id: string;
  user_id?: string | null;
  novel_id: string;
  main_character: string | null;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  world_description: string | null;
  temperature: number | null;
  target_chapter_length: number | null;
  ai_model: string | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
};

export type CanonicalWriteOptions = {
  supabase: SupabaseClient;
  aiService: AIProviderService;
  projectId: string;
  userId?: string;
  provider?: 'gemini' | 'openai' | 'claude' | 'openrouter' | 'deepseek';
  model?: string;
  temperature?: number;
  targetWordCount?: number;
  customPrompt?: string;
};

export type CanonicalWriteResult = {
  chapterNumber: number;
  title: string;
  wordCount: number;
  projectId: string;
  novelId: string;
};

function normalizeNovel(novels: ProjectRow['novels']): { id: string; title: string } | null {
  const novel = Array.isArray(novels) ? novels[0] : novels;
  if (!novel?.id || !novel?.title) return null;
  return novel;
}

function asGenre(value: string | null | undefined): GenreType {
  return (value || 'tien-hiep') as GenreType;
}

export async function writeSingleChapterCanonical(options: CanonicalWriteOptions): Promise<CanonicalWriteResult> {
  const {
    supabase,
    aiService,
    projectId,
    userId,
    provider = 'gemini',
    model,
    temperature,
    targetWordCount,
    customPrompt,
  } = options;

  let query = supabase
    .from('ai_story_projects')
    .select('id,user_id,novel_id,main_character,genre,current_chapter,total_planned_chapters,world_description,temperature,target_chapter_length,ai_model,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', projectId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: projectData, error: projectError } = await query.single();
  if (projectError || !projectData) {
    throw new Error(projectError?.message || 'Project not found');
  }

  const project = projectData as unknown as ProjectRow;
  const novel = normalizeNovel(project.novels);
  if (!novel) {
    throw new Error('Project has no linked novel');
  }

  const currentChapter = project.current_chapter || 0;
  const nextChapter = currentChapter + 1;
  const genre = asGenre(project.genre);
  const protagonistName = project.main_character || 'Nhân vật chính';
  const storyTitle = novel.title || project.world_description || `Project ${project.id}`;

  const factoryConfig: Partial<FactoryConfig> = {
    provider,
    model: model || project.ai_model || 'gemini-3-flash-preview',
    temperature: temperature ?? project.temperature ?? 0.9,
    maxTokens: 32768,
    targetWordCount: targetWordCount ?? project.target_chapter_length ?? 2500,
    genre,
    minQualityScore: 5,
    maxRetries: 2,
    use3AgentWorkflow: true,
  };

  const runnerConfig: Partial<RunnerConfig> = {
    delayBetweenChapters: 0,
    delayBetweenArcs: 0,
    maxChapterRetries: 2,
    autoSaveEnabled: false,
    minQualityToProgress: 5,
    pauseOnError: false,
    pauseAfterArc: false,
  };

  const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);
  runner.setCallbacks({
    onChapterCompleted: async (chapterNumber, result) => {
      if (!result.data) return;
      const { error: upsertErr } = await supabase.from('chapters').upsert(
        {
          novel_id: novel.id,
          chapter_number: chapterNumber,
          title: result.data.title,
          content: result.data.content,
        },
        { onConflict: 'novel_id,chapter_number' },
      );
      if (upsertErr) {
        throw new Error(`Chapter upsert failed: ${upsertErr.message}`);
      }
    },
  });

  const runResult = await runner.run({
    title: storyTitle,
    protagonistName,
    genre,
    premise: customPrompt ? `${project.world_description || storyTitle}\n\nYêu cầu đặc biệt cho chương ${nextChapter}: ${customPrompt}` : (project.world_description || storyTitle),
    targetChapters: Math.max(project.total_planned_chapters || nextChapter, nextChapter),
    chaptersPerArc: 20,
    projectId: project.id,
    novelId: novel.id,
    chaptersToWrite: 1,
    currentChapter,
  });

  if (!runResult.success) {
    throw new Error(runResult.error || 'Runner failed to write chapter');
  }

  const { data: writtenChapter, error: chapterQueryError } = await supabase
    .from('chapters')
    .select('title,content')
    .eq('novel_id', novel.id)
    .eq('chapter_number', nextChapter)
    .single();

  if (chapterQueryError || !writtenChapter) {
    throw new Error(chapterQueryError?.message || 'Written chapter not found after run');
  }

  const title = writtenChapter.title || `Chương ${nextChapter}`;
  const content = writtenChapter.content || '';
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const summary = await summarizeChapter(
    aiService,
    project.id,
    nextChapter,
    title,
    content,
    protagonistName,
  );

  await saveChapterSummary(
    project.id,
    nextChapter,
    title,
    summary.summary,
    summary.openingSentence,
    summary.mcState,
    summary.cliffhanger,
    { throwOnError: true },
  );

  if (nextChapter % 20 === 0) {
    const payload = await new ContextLoader(project.id, novel.id).load(nextChapter + 1);
    await generateSynopsis(
      aiService,
      project.id,
      payload.synopsis,
      payload.arcChapterSummaries,
      genre,
      protagonistName,
      nextChapter,
    );
    const refreshedPayload = await new ContextLoader(project.id, novel.id).load(nextChapter + 1);
    await generateArcPlan(
      aiService,
      project.id,
      Math.floor(nextChapter / 20) + 1,
      genre,
      protagonistName,
      refreshedPayload.synopsis,
      refreshedPayload.storyBible,
      project.total_planned_chapters || nextChapter,
    );
  }

  if (nextChapter === 3) {
    const biblePayload = await new ContextLoader(project.id, novel.id).load(nextChapter + 1);
    if (!biblePayload.hasStoryBible) {
      await generateStoryBible(
        aiService,
        project.id,
        genre,
        protagonistName,
        project.world_description || storyTitle,
        biblePayload.recentChapters,
      );
    }
  }

  const { error: updateErr } = await supabase
    .from('ai_story_projects')
    .update({ current_chapter: nextChapter, updated_at: new Date().toISOString() })
    .eq('id', project.id);

  if (updateErr) {
    throw new Error(`Project update failed: ${updateErr.message}`);
  }

  return {
    chapterNumber: nextChapter,
    title,
    wordCount,
    projectId: project.id,
    novelId: novel.id,
  };
}

import { writeFlagshipChapter } from './flagship/runtime';
import { writeFlagshipV3Chapter } from './flagship-v3/runtime';
import type { OrchestratorOptions, OrchestratorResult } from './pipeline/orchestrator';
import { getSupabase } from './utils/supabase';

/** Dispatch before legacy loads context, validates setup, or mutates anything. */
export async function writeChapterForProject(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const db = getSupabase();
  const { data, error } = await db
    .from('ai_story_projects')
    .select('style_directives')
    .eq('id', options.projectId)
    .single();
  if (error || !data) throw new Error(error?.message || 'Project not found');
  const style = data.style_directives as { pipeline_version?: string } | null;
  if (style?.pipeline_version === 'flagship_v3') {
    return writeFlagshipV3Chapter(options);
  }
  if (style?.pipeline_version === 'flagship_v2') {
    return writeFlagshipChapter(options);
  }
  return writeLegacyChapter(options);
}

/** Load the frozen legacy writer only after a project has explicitly selected it. */
export async function writeLegacyChapter(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const { writeOneChapter } = await import('./pipeline/orchestrator');
  return writeOneChapter(options);
}

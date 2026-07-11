import { writeFlagshipChapter } from './flagship/runtime';
import { writeOneChapter as writeLegacyChapter, type OrchestratorOptions, type OrchestratorResult } from './pipeline/orchestrator';
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
  if (style?.pipeline_version === 'flagship_v2') {
    return writeFlagshipChapter(options);
  }
  return writeLegacyChapter(options);
}

export { writeLegacyChapter };

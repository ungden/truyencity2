import { getSupabase } from '../src/services/story-engine/utils/supabase';

/** Enrol explicit flagship projects in the autonomous job queue. */
async function main(): Promise<void> {
  const projectArg = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
  const maxArg = process.argv.find(value => value.startsWith('--max-chapters='))?.slice('--max-chapters='.length);
  const maxChapters = maxArg ? Number.parseInt(maxArg, 10) : 1000;
  if (!Number.isInteger(maxChapters) || maxChapters < 1 || maxChapters > 5000) {
    throw new Error('--max-chapters must be an integer from 1 to 5000');
  }
  if (!projectArg) {
    throw new Error('Usage: npm run flagship:factory:enroll -- --project=<uuid> [--max-chapters=1000]');
  }

  const db = getSupabase();
  const ids = projectArg.split(',').map(value => value.trim()).filter(Boolean);
  const results: unknown[] = [];
  for (const projectId of ids) {
    const { data: project, error: readError } = await db.from('ai_story_projects')
      .select('id,status,current_chapter,style_directives,flagship_setup_status')
      .eq('id', projectId).single();
    if (readError || !project) throw readError || new Error(`Project ${projectId} not found`);
    const style = (project.style_directives || {}) as Record<string, unknown>;
    if (style.pipeline_version !== 'flagship_v2') throw new Error(`${projectId}: pipeline_version must be flagship_v2`);
    if (project.status !== 'paused') throw new Error(`${projectId}: factory enrollment requires paused project`);
    if (project.flagship_setup_status === 'rejected') throw new Error(`${projectId}: rejected setup cannot be enrolled`);

    const { error: optInError } = await db.from('ai_story_projects').update({
      style_directives: {
        ...style,
        pipeline_version: 'flagship_v2',
        publication_mode: 'automatic',
        factory_enabled: true,
        factory_max_chapters: maxChapters,
        flagship_setup_mode: 'autonomous_factory',
      },
      updated_at: new Date().toISOString(),
    }).eq('id', projectId).eq('status', 'paused');
    if (optInError) throw optInError;

    const { data, error } = await db.rpc('enroll_flagship_factory_job', {
      p_project_id: projectId,
      p_max_chapters: maxChapters,
      p_completion_mode: 'narrative_ending',
    });
    if (error) throw error;
    results.push(data);
  }
  console.log(JSON.stringify({ enrolled: results.length, results }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });

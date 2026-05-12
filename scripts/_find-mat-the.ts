import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: novel } = await s.from('novels').select('id, title, slug, cover_url').eq('slug', 'mat-the-ta-co-ham-tru-an-van-nang').maybeSingle();
  console.log('NOVEL:', JSON.stringify(novel, null, 2));
  if (!novel) return;
  const { data: project } = await s.from('ai_story_projects')
    .select('id, status, setup_stage, setup_stage_attempts, setup_stage_error, pause_reason, main_character, world_description, total_planned_chapters, ai_model')
    .eq('novel_id', novel.id).single();
  console.log('PROJECT:', JSON.stringify({
    ...project,
    world_description_len: project?.world_description?.length ?? 0,
    world_description: undefined,
  }, null, 2));
  const { count: bpCount } = await s.from('chapter_blueprints').select('*', { count: 'exact', head: true }).eq('project_id', project?.id);
  console.log('chapter_blueprints:', bpCount ?? 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const apply = process.argv.includes('--apply');
const now = new Date().toISOString();
const pauseReason = process.env.PAUSE_REASON || `manual_pause_all_writing_${now.slice(0, 10)}`;

async function count(table: string, filter: (query: any) => any) {
  const query = db.from(table).select('id', { count: 'exact', head: true });
  const { count: total, error } = await filter(query);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return total || 0;
}

async function sampleActiveProjects() {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,setup_stage,current_chapter,pause_reason,novels(title,slug)')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(80);
  if (error) throw new Error(`active project sample failed: ${error.message}`);
  return data || [];
}

async function main() {
  const [activeProjects, pausedProjects, activeSchedules] = await Promise.all([
    count('ai_story_projects', (q) => q.eq('status', 'active')),
    count('ai_story_projects', (q) => q.eq('status', 'paused')),
    count('ai_writing_schedules', (q) => q.eq('status', 'active')).catch(() => null),
  ]);

  console.log('Before pause:');
  console.log(`  ai_story_projects active=${activeProjects} paused=${pausedProjects}`);
  console.log(`  ai_writing_schedules active=${activeSchedules ?? 'unavailable'}`);

  const sample = await sampleActiveProjects();
  if (sample.length) {
    console.log('\nActive project sample:');
    for (const project of sample.slice(0, 20) as any[]) {
      const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
      console.log(
        `  ${project.id} stage=${project.setup_stage || '-'} ch=${project.current_chapter ?? 0} title=${novel?.title || novel?.slug || project.novel_id}`,
      );
    }
    if (sample.length > 20) console.log(`  ... ${sample.length - 20} more`);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to pause all active writing projects.');
    return;
  }

  const projectUpdate = {
    status: 'paused',
    pause_reason: pauseReason,
    paused_at: now,
    updated_at: now,
  };
  const { error: projectError } = await db
    .from('ai_story_projects')
    .update(projectUpdate)
    .eq('status', 'active');
  if (projectError) throw new Error(`ai_story_projects pause failed: ${projectError.message}`);

  const { error: scheduleError } = await db
    .from('ai_writing_schedules')
    .update({ status: 'paused', updated_at: now })
    .eq('status', 'active');
  if (scheduleError) {
    console.warn(`ai_writing_schedules pause skipped/failed: ${scheduleError.message}`);
  }

  const [afterActive, afterPaused, afterSchedules] = await Promise.all([
    count('ai_story_projects', (q) => q.eq('status', 'active')),
    count('ai_story_projects', (q) => q.eq('status', 'paused')),
    count('ai_writing_schedules', (q) => q.eq('status', 'active')).catch(() => null),
  ]);

  console.log('\nAfter pause:');
  console.log(`  ai_story_projects active=${afterActive} paused=${afterPaused}`);
  console.log(`  ai_writing_schedules active=${afterSchedules ?? 'unavailable'}`);
  console.log(`  pause_reason=${pauseReason}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

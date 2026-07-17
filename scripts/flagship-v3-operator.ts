import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  digestFlagshipV3,
  getFlagshipReleaseManifestV3,
  validateLaunchPackV3,
} from '../src/services/story-engine/flagship-v3';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const args = process.argv.slice(2);
const command = args[0];
const apply = args.includes('--apply');
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const projectId = value('--project-id');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('Supabase server environment is missing.');
if (!projectId && command !== 'reconcile') throw new Error('--project-id is required.');
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function status(id: string) {
  const { data, error } = await db.from('factory_story_status_v3').select('*').eq('project_id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function stage(id: string): Promise<void> {
  const launchPackPath = value('--launch-pack');
  const routesPath = value('--routes');
  if (!launchPackPath || !routesPath) throw new Error('stage requires --launch-pack and --routes JSON files.');
  const launchPack = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(path.resolve(launchPackPath), 'utf8')));
  const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
  const release = getFlagshipReleaseManifestV3();
  const launchPackDigest = digestFlagshipV3(launchPack);
  validateLaunchPackV3(launchPack);
  console.log(JSON.stringify({
    dryRun: !apply,
    command: 'stage',
    projectId: id,
    title: launchPack.kernel.title,
    selectedConceptId: launchPack.selectedConceptId,
    routeVersion: routes.routeVersion,
    initialPlans: launchPack.initialWindow.plans.map(plan => plan.chapterNumber),
    engineReleaseId: release.releaseId,
    launchPackDigest,
  }, null, 2));
  if (!apply) return;
  const { data, error } = await db.rpc('stage_flagship_launch_pack_release_v3', {
    p_project_id: id,
    p_launch_pack: launchPack,
    p_routes: routes,
    p_release_manifest: release,
    p_launch_pack_digest: launchPackDigest,
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function reset(id: string): Promise<void> {
  const [{ data: project, error: projectError }, { count: chapters, error: chapterError }, { count: plans, error: planError }] = await Promise.all([
    db.from('ai_story_projects').select('id,status,current_chapter,flagship_v3_status,story_kernel_v3,arc_plan_v3,story_state_v3').eq('id', id).single(),
    db.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id',
      (await db.from('ai_story_projects').select('novel_id').eq('id', id).single()).data?.novel_id || ''),
    db.from('chapter_blueprints').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('version', 3).gte('chapter_number', 1).lte('chapter_number', 5),
  ]);
  if (projectError) throw projectError;
  if (chapterError) throw chapterError;
  if (planError) throw planError;
  console.log(JSON.stringify({
    dryRun: !apply,
    command: 'archive-reset',
    project,
    chaptersToArchive: chapters,
    v3InitialPlans: plans,
  }, null, 2));
  if (!apply) return;
  const release = getFlagshipReleaseManifestV3();
  const { data, error } = await db.rpc('archive_reset_flagship_canary_release_v3', {
    p_project_id: id,
    p_engine_release_id: release.releaseId,
    p_confirmation: 'ARCHIVE_AND_RESET_V3_CANARY',
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function promote(id: string): Promise<void> {
  const dailyQuota = Number(value('--daily-quota') || '5');
  const release = getFlagshipReleaseManifestV3();
  console.log(JSON.stringify({ dryRun: !apply, command: 'promote', projectId: id, dailyQuota, engineReleaseId: release.releaseId, current: await status(id) }, null, 2));
  if (!apply) return;
  const { data, error } = await db.rpc('promote_flagship_v3_factory_release', {
    p_project_id: id,
    p_engine_release_id: release.releaseId,
    p_daily_quota: dailyQuota,
    p_confirmation: 'PROMOTE_APPROVED_V3_FACTORY',
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function reconcile(): Promise<void> {
  const staleMinutes = Number(value('--stale-minutes') || '20');
  console.log(JSON.stringify({ dryRun: !apply, command: 'reconcile', staleMinutes }, null, 2));
  if (!apply) return;
  const { data, error } = await db.rpc('reconcile_stale_story_runs_v3', { p_stale_minutes: staleMinutes });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function main(): Promise<void> {
  if (command === 'stage') await stage(projectId!);
  else if (command === 'reset') await reset(projectId!);
  else if (command === 'promote') await promote(projectId!);
  else if (command === 'status') console.log(JSON.stringify(await status(projectId!), null, 2));
  else if (command === 'reconcile') await reconcile();
  else throw new Error('Usage: flagship-v3-operator.ts stage|reset|promote|status|reconcile [options] [--apply]');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

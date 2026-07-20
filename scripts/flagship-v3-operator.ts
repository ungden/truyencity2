import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  ConceptCandidateV3Schema,
  MarketResearchSnapshotV3Schema,
  FLAGSHIP_V3_SETUP_VERSION,
  buildPortfolioSignatureV3,
  digestFlagshipV3,
  getFlagshipReleaseManifestV3,
  validateLaunchPackV3,
  validateLaunchPackResearchProvenanceV3,
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
  const snapshotPath = value('--snapshot');
  const tournamentPath = value('--tournament');
  if (!launchPackPath || !routesPath) throw new Error('stage requires --launch-pack and --routes JSON files.');
  if (apply && (!snapshotPath || !tournamentPath)) {
    throw new Error('stage --apply requires --snapshot and --tournament so setup provenance and portfolio diversity are persisted.');
  }
  const launchPack = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(path.resolve(launchPackPath), 'utf8')));
  const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
  const release = getFlagshipReleaseManifestV3();
  const launchPackDigest = digestFlagshipV3(launchPack);
  validateLaunchPackV3(launchPack);
  const snapshot = snapshotPath
    ? MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')))
    : null;
  if (snapshot) validateLaunchPackResearchProvenanceV3(launchPack, snapshot);
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
  if (!snapshot) throw new Error('stage --apply requires a valid research snapshot.');
  const tournament = JSON.parse(readFileSync(path.resolve(tournamentPath!), 'utf8')) as { selected?: unknown };
  const selected = ConceptCandidateV3Schema.parse(tournament.selected);
  if (selected.id !== launchPack.selectedConceptId) throw new Error('Tournament selected concept does not match the launch pack.');
  const researchDigest = digestFlagshipV3(snapshot);
  const signature = buildPortfolioSignatureV3(selected);
  const commissionArtifactKey = `${snapshot.commission.slotId}:${FLAGSHIP_V3_SETUP_VERSION}`;
  const { data: existingCommission, error: commissionLookupError } = await db.from('story_factory_commissions_v3')
    .select('id,project_id,research_digest,setup_release_id').eq('slot_key', commissionArtifactKey).maybeSingle();
  if (commissionLookupError) throw commissionLookupError;
  let commissionId = existingCommission?.id as string | undefined;
  if (existingCommission) {
    if (existingCommission.project_id !== id || existingCommission.research_digest !== researchDigest
      || existingCommission.setup_release_id !== FLAGSHIP_V3_SETUP_VERSION) {
      throw new Error('Stored setup commission does not match this immutable project/research/release.');
    }
  } else {
    const { data: inserted, error: commissionError } = await db.from('story_factory_commissions_v3').insert({
      slot_key: commissionArtifactKey,
      project_id: id,
      commission: snapshot.commission,
      research_snapshot: snapshot,
      research_digest: researchDigest,
      setup_release_id: FLAGSHIP_V3_SETUP_VERSION,
      status: 'launch_pack_ready',
    }).select('id').single();
    if (commissionError) throw commissionError;
    commissionId = inserted.id;
  }
  const { data: existingSignature, error: signatureLookupError } = await db.from('story_portfolio_signatures_v3')
    .select('*').eq('project_id', id).maybeSingle();
  if (signatureLookupError) throw signatureLookupError;
  if (existingSignature) {
    if (existingSignature.selected_concept_id !== signature.selectedConceptId
      || existingSignature.mechanism_fingerprint !== signature.mechanismFingerprint
      || existingSignature.reward_loop_fingerprint !== signature.rewardLoopFingerprint
      || existingSignature.conflict_economy_fingerprint !== signature.conflictEconomyFingerprint) {
      throw new Error('Stored immutable portfolio signature does not match this selected concept.');
    }
  } else {
    const { error: signatureError } = await db.from('story_portfolio_signatures_v3').insert({
      project_id: id,
      selected_concept_id: signature.selectedConceptId,
      mechanism_fingerprint: signature.mechanismFingerprint,
      reward_loop_fingerprint: signature.rewardLoopFingerprint,
      conflict_economy_fingerprint: signature.conflictEconomyFingerprint,
      signature_version: FLAGSHIP_V3_SETUP_VERSION,
    });
    if (signatureError) throw signatureError;
  }
  const { error: packError } = await db.from('story_launch_packs_v3').insert({
    commission_id: commissionId,
    project_id: id,
    engine_release_id: release.releaseId,
    route_version: routes.routeVersion,
    launch_pack_digest: launchPackDigest,
    launch_pack: launchPack,
    selected_concept_id: launchPack.selectedConceptId,
    status: 'valid',
  });
  if (packError && packError.code !== '23505') throw packError;
  const { data, error } = await db.rpc('stage_flagship_launch_pack_release_v3', {
    p_project_id: id,
    p_launch_pack: launchPack,
    p_routes: routes,
    p_release_manifest: release,
    p_launch_pack_digest: launchPackDigest,
  });
  if (error) throw error;
  const { error: packStatusError } = await db.from('story_launch_packs_v3').update({ status: 'staged' })
    .eq('project_id', id).eq('engine_release_id', release.releaseId).eq('launch_pack_digest', launchPackDigest);
  if (packStatusError) throw packStatusError;
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

async function canary(id: string): Promise<void> {
  const maxChapters = Number(value('--max-chapters') || '1200');
  console.log(JSON.stringify({
    dryRun: !apply,
    command: 'hidden-canary',
    projectId: id,
    executionMode: 'hidden_canary',
    maxChapters,
    current: await status(id),
  }, null, 2));
  if (!apply) return;
  const { data, error } = await db.rpc('enroll_flagship_factory_job_v3_mode', {
    p_project_id: id,
    p_execution_mode: 'hidden_canary',
    p_max_chapters: maxChapters,
    p_completion_mode: 'narrative_ending',
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function upgrade(id: string): Promise<void> {
  const release = getFlagshipReleaseManifestV3();
  console.log(JSON.stringify({
    dryRun: !apply,
    command: 'upgrade-hidden-canary-release',
    projectId: id,
    engineReleaseId: release.releaseId,
    promptVersion: release.promptVersion,
    current: await status(id),
  }, null, 2));
  if (!apply) return;
  const { data, error } = await db.rpc('upgrade_hidden_canary_release_v3', {
    p_project_id: id,
    p_release_manifest: release,
    p_confirmation: 'UPGRADE_BLOCKED_HIDDEN_CANARY_RELEASE_V3',
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
  else if (command === 'canary') await canary(projectId!);
  else if (command === 'upgrade') await upgrade(projectId!);
  else if (command === 'promote') await promote(projectId!);
  else if (command === 'status') console.log(JSON.stringify(await status(projectId!), null, 2));
  else if (command === 'reconcile') await reconcile();
  else throw new Error('Usage: flagship-v3-operator.ts stage|reset|canary|upgrade|promote|status|reconcile [options] [--apply]');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

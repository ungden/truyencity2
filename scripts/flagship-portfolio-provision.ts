import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { getSupabase } from '../src/services/story-engine/utils/supabase';
import {
  buildFlagshipFirst30ProvisionPlan,
  computeFoundationScoreV2,
  ConceptTournamentArtifactV2Schema,
  FlagshipLaunchPackV2Schema,
  FlagshipModelRoutesV2Schema,
  HumanConceptSelectionV2Schema,
  type FlagshipPortfolioProvisionItemV1,
} from '../src/services/story-engine/flagship';

const CONFIRMATION = 'PROVISION_FLAGSHIP_FIRST_30';
const FoundationScoreSchema = z.object({
  total: z.number(),
  passed: z.boolean(),
  dimensions: z.record(z.number()),
  issues: z.array(z.string()),
  source: z.literal('computed_v2'),
}).strict();

type LocalArtifacts = {
  tournament?: z.infer<typeof ConceptTournamentArtifactV2Schema>;
  selection?: z.infer<typeof HumanConceptSelectionV2Schema>;
  launchPack?: z.infer<typeof FlagshipLaunchPackV2Schema>;
  foundationScore?: z.infer<typeof FoundationScoreSchema>;
};

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function artifactPaths(slotId: string) {
  const slug = slotId.toLowerCase();
  const root = path.join(process.cwd(), 'blueprints/flagship-portfolio-v1');
  return {
    tournament: path.join(root, 'tournaments', slug, 'tournament.json'),
    selection: path.join(root, 'materialized', slug, 'human-selection.json'),
    launchPack: path.join(root, 'materialized', slug, 'launch-pack.json'),
    foundationScore: path.join(root, 'materialized', slug, 'foundation-score.json'),
  };
}

function loadArtifacts(item: FlagshipPortfolioProvisionItemV1): LocalArtifacts {
  const files = artifactPaths(item.slotId);
  const result: LocalArtifacts = {};
  if (item.hasTournamentArtifact) {
    if (!existsSync(files.tournament)) throw new Error(`${item.slotId}: tournament artifact is missing.`);
    result.tournament = ConceptTournamentArtifactV2Schema.parse(readJson(files.tournament));
  }
  if (item.hasApprovedKernel) {
    for (const filePath of [files.selection, files.launchPack, files.foundationScore]) {
      if (!existsSync(filePath)) throw new Error(`${item.slotId}: approved kernel artifact is missing: ${filePath}`);
    }
    result.selection = HumanConceptSelectionV2Schema.parse(readJson(files.selection));
    result.launchPack = FlagshipLaunchPackV2Schema.parse(readJson(files.launchPack));
    result.foundationScore = FoundationScoreSchema.parse(readJson(files.foundationScore));
    if (result.launchPack.selectedConceptId !== result.selection.candidateId) {
      throw new Error(`${item.slotId}: launch pack and selection candidate differ.`);
    }
    const computed = computeFoundationScoreV2(result.launchPack.storySpec);
    if (JSON.stringify(computed) !== JSON.stringify(result.foundationScore)) {
      throw new Error(`${item.slotId}: committed foundation score is not reproducible.`);
    }
  }
  return result;
}

async function projectStatus(projectId: string) {
  const { data, error } = await getSupabase().from('ai_story_projects')
    .select('id,novel_id,status,current_chapter,flagship_setup_status,style_directives')
    .eq('id', projectId).single();
  if (error || !data) throw error || new Error(`Project ${projectId} disappeared during provisioning.`);
  return data;
}

async function restoreFactoryOptIn(projectId: string, item: FlagshipPortfolioProvisionItemV1): Promise<void> {
  const db = getSupabase();
  const current = await projectStatus(projectId);
  const style = (current.style_directives || {}) as Record<string, unknown>;
  const { error } = await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: 'flagship_factory_waiting_for_provider',
    paused_at: new Date().toISOString(),
    style_directives: {
      ...style,
      pipeline_version: 'flagship_v2',
      portfolio_id: 'flagship-first-30',
      portfolio_slot_id: item.slotId,
      catalogue_title: item.title,
      cover_url: item.coverUrl,
      publication_mode: 'automatic',
      factory_enabled: true,
      factory_max_chapters: item.maxChapters,
      flagship_setup_mode: 'autonomous_factory',
      production_enabled: false,
      provision_version: 'flagship-first-30-v1',
    },
    updated_at: new Date().toISOString(),
  }).eq('id', projectId).eq('status', 'paused');
  if (error) throw error;
  const { error: jobError } = await db.from('story_factory_jobs').update({
    max_chapters: item.maxChapters,
    metadata: {
      portfolioId: 'flagship-first-30',
      portfolioSlotId: item.slotId,
      provisionVersion: 'flagship-first-30-v1',
    },
    updated_at: new Date().toISOString(),
  }).eq('project_id', projectId);
  if (jobError) throw jobError;
}

async function provisionOne(
  item: FlagshipPortfolioProvisionItemV1,
  routes: z.infer<typeof FlagshipModelRoutesV2Schema>,
  artifacts: LocalArtifacts,
) {
  const db = getSupabase();
  const { data, error } = await db.rpc('provision_flagship_portfolio_story_v1', {
    p_slot_id: item.slotId,
    p_title: item.title,
    p_slug: item.slug,
    p_description: item.description,
    p_cover_url: item.coverUrl,
    p_genre: item.genre,
    p_main_character: item.protagonistSeed,
    p_brief: item.setupBrief,
    p_model_routes: routes,
    p_max_chapters: item.maxChapters,
  });
  if (error) throw new Error(`${item.slotId}: provision RPC failed: ${error.message}`);
  const projectId = (data as { project_id?: string } | null)?.project_id;
  if (!projectId) throw new Error(`${item.slotId}: provision RPC returned no project id.`);

  let current = await projectStatus(projectId);
  if (artifacts.tournament && current.flagship_setup_status === 'brief_ready') {
    const saved = await db.rpc('save_flagship_concept_tournament_v2', {
      p_project_id: projectId,
      p_tournament: artifacts.tournament,
    });
    if (saved.error) throw new Error(`${item.slotId}: tournament import failed: ${saved.error.message}`);
    current = await projectStatus(projectId);
  }

  if (artifacts.launchPack && artifacts.selection && artifacts.foundationScore && current.flagship_setup_status === 'concept_review') {
    const committed = await db.rpc('commit_flagship_launch_pack_v2', {
      p_project_id: projectId,
      p_selection: artifacts.selection,
      p_launch_pack: artifacts.launchPack,
      p_foundation_score: artifacts.foundationScore,
    });
    if (committed.error) throw new Error(`${item.slotId}: launch pack import failed: ${committed.error.message}`);
    current = await projectStatus(projectId);
  }

  if (artifacts.launchPack && current.flagship_setup_status === 'story_spec_review') {
    const approved = await db.rpc('approve_flagship_story_spec_v2', {
      p_project_id: projectId,
      p_reviewer_ref: 'human-portfolio-gate',
      p_evidence: [{
        kind: 'approved_offline_opening_and_kernel',
        portfolioSlotId: item.slotId,
        artifactRoot: `blueprints/flagship-portfolio-v1/materialized/${item.slotId.toLowerCase()}`,
      }],
    });
    if (approved.error) throw new Error(`${item.slotId}: StorySpec approval import failed: ${approved.error.message}`);
    current = await projectStatus(projectId);
  }

  const allowed = item.provisionStage === 'brief_ready'
    ? ['brief_ready']
    : item.provisionStage === 'concept_review'
      ? ['concept_review']
      : ['ready_to_write'];
  if (!allowed.includes(String(current.flagship_setup_status))) {
    throw new Error(`${item.slotId}: expected ${item.provisionStage}, got ${current.flagship_setup_status}.`);
  }
  if (Number(current.current_chapter || 0) !== 0 || current.status !== 'paused') {
    throw new Error(`${item.slotId}: provisioning must leave the project paused at chapter 0.`);
  }

  await restoreFactoryOptIn(projectId, item);
  return { slotId: item.slotId, projectId, setupStatus: current.flagship_setup_status, reused: (data as { created?: boolean }).created === false };
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const confirm = arg('confirm');
  const maxChapters = Number.parseInt(arg('max-chapters') || '1000', 10);
  const routesPath = arg('routes') || path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/model-routes-v2.json');
  const routes = FlagshipModelRoutesV2Schema.parse(readJson(routesPath));
  const plan = buildFlagshipFirst30ProvisionPlan(maxChapters);
  const artifactMap = new Map(plan.items.map(item => [item.slotId, loadArtifacts(item)]));
  const summary = {
    portfolioId: plan.portfolioId,
    total: plan.items.length,
    stages: plan.items.reduce<Record<string, number>>((counts, item) => {
      counts[item.provisionStage] = (counts[item.provisionStage] || 0) + 1;
      return counts;
    }, {}),
    jobsToQueue: plan.items.length,
    chaptersToWriteNow: 0,
    modelRoutes: routes,
    providerCredentialPresent: Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim()),
  };

  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry_run', ...summary, next: `rerun with --apply --confirm=${CONFIRMATION}` }, null, 2));
    return;
  }
  if (confirm !== CONFIRMATION) throw new Error(`Refusing production provisioning. Pass --confirm=${CONFIRMATION}.`);

  const results = [];
  for (const item of plan.items) {
    results.push(await provisionOne(item, routes, artifactMap.get(item.slotId) || {}));
  }
  console.log(JSON.stringify({ mode: 'applied', ...summary, results }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

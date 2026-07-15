import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { callGemini } from '../src/services/story-engine/utils/gemini';
import { APPROVED_PORTFOLIO_FINALISTS_V2 } from '../src/services/story-engine/flagship/portfolio-finalists';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import { materializeFlagshipLaunchPackV2, type FlagshipSetupCall } from '../src/services/story-engine/flagship/setup';
import { ConceptTournamentArtifactV2Schema, FlagshipSetupBriefV2Schema } from '../src/services/story-engine/flagship/setup-contracts';

const root = process.cwd();
const tournamentRoot = path.join(root, 'blueprints/flagship-portfolio-v1/tournaments');
const outputRoot = path.join(root, 'blueprints/flagship-portfolio-v1/materialized');
const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/model-routes-v2.json'), 'utf8')));
const requested = process.argv.find(value => value.startsWith('--slot='))?.slice('--slot='.length) || 'all';
const requestedSlots = requested === 'all' ? null : new Set(requested.split(',').map(value => value.trim()).filter(Boolean));
const finalists = APPROVED_PORTFOLIO_FINALISTS_V2.filter(item => !requestedSlots || requestedSlots.has(item.slotId));
if (requestedSlots && finalists.length !== requestedSlots.size) throw new Error(`Unknown or unapproved slot in --slot=${requested}.`);

function jsonFile(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function modelConfig(call: FlagshipSetupCall): { temperature: number; maxTokens: number; thinkingLevel: 'medium' | 'high' } {
  if (call.role === 'launch_architect') return { temperature: 0.25, maxTokens: 32768, thinkingLevel: 'high' };
  if (call.role === 'causal_world') return { temperature: 0.3, maxTokens: 24576, thinkingLevel: 'medium' };
  return { temperature: 0.4, maxTokens: 24576, thinkingLevel: 'medium' };
}

async function invokeWithCheckpoint(slotId: string, call: FlagshipSetupCall): Promise<string> {
  const model = routes.setupCreative;
  const config = modelConfig(call);
  const promptHash = createHash('sha256').update(JSON.stringify({ slotId, role: call.role, model, config, responseJsonSchema: call.responseJsonSchema, systemPrompt: call.systemPrompt, userPrompt: call.userPrompt })).digest('hex');
  const checkpointPath = path.join(outputRoot, slotId.toLowerCase(), 'checkpoints', `${call.role}.json`);
  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8')) as { promptHash?: string; model?: string; content?: string };
    if (checkpoint.promptHash === promptHash && checkpoint.model === model && checkpoint.content) {
      console.log(`[${slotId}] checkpoint ${call.role}`);
      return checkpoint.content;
    }
  }
  console.log(`[${slotId}] call ${call.role} via ${model}`);
  const response = await callGemini(call.userPrompt, {
    model,
    ...config,
    responseJsonSchema: call.responseJsonSchema,
    systemPrompt: call.systemPrompt,
  }, { jsonMode: true, disableRouting: true });
  if (response.finishReason === 'MAX_TOKENS') throw new Error(`${slotId} ${call.role} infra_blocked: MAX_TOKENS and no content fallback is allowed.`);
  if (!response.content.trim()) throw new Error(`${slotId} ${call.role} infra_blocked: empty response and no content fallback is allowed.`);
  jsonFile(checkpointPath, {
    schemaVersion: 1,
    slotId,
    role: call.role,
    model,
    promptHash,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    finishReason: response.finishReason,
    content: response.content,
  });
  return response.content;
}

async function main(): Promise<void> {
  const materialized: Array<{ slotId: string; title: string; candidateId: string; foundationScore: number; callRoles: string[] }> = [];
  for (const finalist of finalists) {
    const slot = finalist.slotId.toLowerCase();
    const slotRoot = path.join(outputRoot, slot);
    const sourceRoot = path.join(tournamentRoot, slot);
    const brief = FlagshipSetupBriefV2Schema.parse(JSON.parse(readFileSync(path.join(sourceRoot, 'setup-brief-v2.json'), 'utf8')));
    const tournament = ConceptTournamentArtifactV2Schema.parse(JSON.parse(readFileSync(path.join(sourceRoot, 'tournament.json'), 'utf8')));
    jsonFile(path.join(slotRoot, 'human-selection.json'), finalist.selection);
    const result = await materializeFlagshipLaunchPackV2({ brief, tournament, selection: finalist.selection }, { invoke: call => invokeWithCheckpoint(finalist.slotId, call) });
    jsonFile(path.join(slotRoot, 'launch-pack.json'), result.launchPack);
    jsonFile(path.join(slotRoot, 'story-spec.json'), result.launchPack.storySpec);
    jsonFile(path.join(slotRoot, 'arc-plan.json'), result.launchPack.arcPlan);
    jsonFile(path.join(slotRoot, 'story-state-ch0.json'), result.launchPack.storyState);
    jsonFile(path.join(slotRoot, 'chapter-plans-1-5.json'), result.launchPack.rollingChapterPlans);
    jsonFile(path.join(slotRoot, 'foundation-score.json'), result.foundationScore);
    jsonFile(path.join(slotRoot, 'setup-run-manifest.json'), {
      schemaVersion: 1,
      slotId: finalist.slotId,
      blindCode: finalist.blindCode,
      candidateId: finalist.selection.candidateId,
      title: finalist.selection.approvedTitle,
      status: result.launchPack.status,
      callRoles: result.callRoles,
      modelRoute: routes.setupCreative,
      productionWrites: 0,
      productionProjectsChanged: false,
      contentFallbacks: 0,
    });
    materialized.push({
      slotId: finalist.slotId,
      title: result.launchPack.storySpec.title,
      candidateId: finalist.selection.candidateId,
      foundationScore: result.foundationScore.total,
      callRoles: result.callRoles,
    });
    console.log(`[${finalist.slotId}] materialized ${result.launchPack.storySpec.title}`);
  }
  const completeMaterialized = APPROVED_PORTFOLIO_FINALISTS_V2.flatMap(finalist => {
    const manifestPath = path.join(outputRoot, finalist.slotId.toLowerCase(), 'setup-run-manifest.json');
    const scorePath = path.join(outputRoot, finalist.slotId.toLowerCase(), 'foundation-score.json');
    if (!existsSync(manifestPath) || !existsSync(scorePath)) return [];
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { title: string; candidateId: string; callRoles: string[] };
    const score = JSON.parse(readFileSync(scorePath, 'utf8')) as { total: number };
    return [{ slotId: finalist.slotId, title: manifest.title, candidateId: manifest.candidateId, foundationScore: score.total, callRoles: manifest.callRoles }];
  });
  jsonFile(path.join(outputRoot, 'manifest.json'), {
    schemaVersion: 1,
    status: completeMaterialized.length === 3 ? 'three_story_kernels_ready' : 'partial_materialization',
    materialized: completeMaterialized,
    productionWrites: 0,
    productionProjectsChanged: false,
  });
  console.log(JSON.stringify({ materialized, outputRoot, productionWrites: 0 }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

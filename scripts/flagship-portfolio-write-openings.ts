import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { callGemini } from '../src/services/story-engine/utils/gemini';
import { APPROVED_PORTFOLIO_FINALISTS_V2 } from '../src/services/story-engine/flagship/portfolio-finalists';
import { ChapterPlanV2Schema, StoryStateV2Schema } from '../src/services/story-engine/flagship/contracts';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import {
  EditorOutputSchema,
  WriterOutputSchema,
  executeFlagshipPipeline,
  type FlagshipModelCall,
  type FlagshipModelRole,
} from '../src/services/story-engine/flagship/pipeline';
import { applyChapterStateDelta } from '../src/services/story-engine/flagship/state-transition';
import { FlagshipLaunchPackV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const root = process.cwd();
const outputRoot = path.join(root, 'blueprints/flagship-portfolio-v1/materialized');
const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/model-routes-v2.json'), 'utf8')));
const requested = process.argv.find(value => value.startsWith('--slot='))?.slice('--slot='.length) || 'all';
const requestedSlots = requested === 'all' ? null : new Set(requested.split(',').map(value => value.trim()).filter(Boolean));
const finalists = APPROVED_PORTFOLIO_FINALISTS_V2.filter(item => !requestedSlots || requestedSlots.has(item.slotId));
if (requestedSlots && finalists.length !== requestedSlots.size) throw new Error(`Unknown or unapproved slot in --slot=${requested}.`);

const responseSchemas: Record<FlagshipModelRole, Record<string, unknown>> = {
  director: toGeminiResponseJsonSchema(ChapterPlanV2Schema),
  writer: toGeminiResponseJsonSchema(WriterOutputSchema),
  editor: toGeminiResponseJsonSchema(EditorOutputSchema),
  writer_revision: toGeminiResponseJsonSchema(WriterOutputSchema),
};

function jsonFile(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function modelFor(role: FlagshipModelRole): string {
  if (role === 'director') return routes.director;
  if (role === 'editor') return routes.editor;
  return routes.writer;
}

function configFor(role: FlagshipModelRole): { temperature: number; maxTokens: number; thinkingLevel: 'medium' | 'high' } {
  if (role === 'editor') return { temperature: 0.2, maxTokens: 32768, thinkingLevel: 'medium' };
  if (role === 'writer') return { temperature: 0.8, maxTokens: 32768, thinkingLevel: 'medium' };
  if (role === 'writer_revision') return { temperature: 0.5, maxTokens: 32768, thinkingLevel: 'medium' };
  return { temperature: 0.2, maxTokens: 24576, thinkingLevel: 'medium' };
}

async function invokeWithCheckpoint(slotId: string, chapterNumber: number, call: FlagshipModelCall): Promise<string> {
  const model = modelFor(call.role);
  const config = configFor(call.role);
  const responseJsonSchema = responseSchemas[call.role];
  const promptHash = createHash('sha256').update(JSON.stringify({ slotId, chapterNumber, role: call.role, model, config, responseJsonSchema, systemPrompt: call.systemPrompt, userPrompt: call.userPrompt })).digest('hex');
  const checkpointPath = path.join(outputRoot, slotId.toLowerCase(), 'opening-checkpoints', `chapter-${String(chapterNumber).padStart(2, '0')}-${call.role}.json`);
  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8')) as { promptHash?: string; model?: string; content?: string };
    if (checkpoint.promptHash === promptHash && checkpoint.model === model && checkpoint.content) {
      console.log(`[${slotId} ch${chapterNumber}] checkpoint ${call.role}`);
      return checkpoint.content;
    }
  }
  console.log(`[${slotId} ch${chapterNumber}] call ${call.role} via ${model}`);
  const response = await callGemini(call.userPrompt, {
    model,
    ...config,
    responseJsonSchema,
    systemPrompt: call.systemPrompt,
  }, { jsonMode: true, disableRouting: true });
  if (response.finishReason === 'MAX_TOKENS') throw new Error(`${slotId} chapter ${chapterNumber} ${call.role} infra_blocked: MAX_TOKENS and no content fallback is allowed.`);
  if (!response.content.trim()) throw new Error(`${slotId} chapter ${chapterNumber} ${call.role} infra_blocked: empty response and no content fallback is allowed.`);
  jsonFile(checkpointPath, {
    schemaVersion: 1,
    slotId,
    chapterNumber,
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
  const runs: Array<{ slotId: string; title: string; chaptersPublished: number; callRoles: string[]; revisions: number }> = [];
  for (const finalist of finalists) {
    const slotRoot = path.join(outputRoot, finalist.slotId.toLowerCase());
    const launchPack = FlagshipLaunchPackV2Schema.parse(JSON.parse(readFileSync(path.join(slotRoot, 'launch-pack.json'), 'utf8')));
    let state = StoryStateV2Schema.parse(launchPack.storyState);
    const allRoles: string[] = [];
    let revisions = 0;
    for (let chapterNumber = 1; chapterNumber <= 3; chapterNumber += 1) {
      const preparedPlan = launchPack.rollingChapterPlans.find(plan => plan.chapterNumber === chapterNumber);
      if (!preparedPlan) throw new Error(`${finalist.slotId} has no prepared ChapterPlan ${chapterNumber}; no planning fallback is allowed.`);
      const result = await executeFlagshipPipeline({
        storySpec: launchPack.storySpec,
        arcPlan: launchPack.arcPlan,
        storyState: state,
        preparedPlan,
        targetWordCount: 2200,
      }, { invoke: call => invokeWithCheckpoint(finalist.slotId, chapterNumber, call) });
      allRoles.push(...result.callRoles);
      revisions += result.revisionLineage.length;
      if (result.revisionLineage.length === 0) {
        const staleRevision = path.join(slotRoot, 'opening-checkpoints', `chapter-${String(chapterNumber).padStart(2, '0')}-writer_revision.json`);
        if (existsSync(staleRevision)) unlinkSync(staleRevision);
      }
      jsonFile(path.join(slotRoot, 'chapters', `chapter-${String(chapterNumber).padStart(2, '0')}.json`), result);
      writeFileSync(path.join(slotRoot, 'chapters', `chapter-${String(chapterNumber).padStart(2, '0')}.md`), `# ${result.title}\n\n${result.content.trim()}\n`, 'utf8');
      state = StoryStateV2Schema.parse(applyChapterStateDelta({ state, plan: result.chapterPlan, title: result.title, content: result.content }));
      jsonFile(path.join(slotRoot, 'states', `state-after-chapter-${String(chapterNumber).padStart(2, '0')}.json`), state);
      console.log(`[${finalist.slotId}] chapter ${chapterNumber} publish; calls=${result.callRoles.join('>')}`);
    }
    const run = { slotId: finalist.slotId, title: launchPack.storySpec.title, chaptersPublished: state.chapterNumber, callRoles: allRoles, revisions };
    runs.push(run);
    jsonFile(path.join(slotRoot, 'opening-run-manifest.json'), {
      schemaVersion: 1,
      status: state.chapterNumber === 3 ? 'opening_1_3_publishable_offline' : 'opening_incomplete',
      ...run,
      finalStateChapter: state.chapterNumber,
      productionWrites: 0,
      productionProjectsChanged: false,
      contentFallbacks: 0,
    });
  }
  const completeRuns = APPROVED_PORTFOLIO_FINALISTS_V2.flatMap(finalist => {
    const manifestPath = path.join(outputRoot, finalist.slotId.toLowerCase(), 'opening-run-manifest.json');
    if (!existsSync(manifestPath)) return [];
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { title: string; chaptersPublished: number; callRoles: string[]; revisions: number };
    return [{ slotId: finalist.slotId, title: manifest.title, chaptersPublished: manifest.chaptersPublished, callRoles: manifest.callRoles, revisions: manifest.revisions }];
  });
  jsonFile(path.join(outputRoot, 'opening-manifest.json'), {
    schemaVersion: 1,
    status: completeRuns.length === 3 && completeRuns.every(run => run.chaptersPublished === 3) ? 'three_openings_ready_for_human_gate' : 'opening_run_partial',
    runs: completeRuns,
    productionWrites: 0,
    productionProjectsChanged: false,
  });
  console.log(JSON.stringify({ runs, outputRoot, productionWrites: 0 }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env tsx

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import dotenv from 'dotenv';
import {
  EditorAssessmentV3Schema,
  FLAGSHIP_V3_PROMPT_VERSION,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  FlagshipV3Error,
  FrozenBriefCorpusV3Schema,
  MachineCalibrationPairCorpusV3Schema,
  RollingPlanWindowDraftV3Schema,
  RevisionOutputV3Schema,
  V3_EDITOR_SYSTEM,
  WriterOutputV3Schema,
  buildV3RoleContexts,
  digestFlagshipV3,
  executeFlagshipV3Pipeline,
  getFlagshipReleaseManifestV3,
  materializeRollingWindowV3,
  type ChapterPlanV3,
  type FlagshipV3ModelCall,
  type OfflineOpeningRunV3,
  type StoryStateV3,
  type V3RoleContext,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const EntrySchema = z.object({
  slot: z.string().trim().min(2),
  projectId: z.string().uuid(),
  launchPack: z.string().trim().min(1),
  candidateRunDir: z.string().trim().min(1),
}).strict();
const ManifestSchema = z.object({
  campaignId: z.string().uuid().optional(),
  corpusVersion: z.string().trim().min(3),
  entries: z.array(EntrySchema).length(5),
}).strict();

const arg = (name: string): string | null => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || null : null;
};
const manifestPath = arg('manifest');
const controlRoutesPath = arg('control-routes');
const outputPath = arg('output');
if (!manifestPath || !controlRoutesPath || !outputPath) {
  throw new Error('--manifest, --control-routes and --output are required.');
}
const manifestFile = manifestPath;
const controlRoutesFile = controlRoutesPath;
const outputFile = outputPath;
const frozenOutputFile = arg('frozen-output') || `${outputFile}.frozen-briefs.json`;

type StoredResponse = { content: string; estimatedCostUsd?: number; model?: string };
type CandidateRun = OfflineOpeningRunV3 & { enginePromptVersion?: string; engineReleaseId?: string };

const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.resolve(file), 'utf8')) as T;
const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

function responseSchema(call: FlagshipV3ModelCall) {
  if (call.role === 'writer') return WriterOutputV3Schema;
  if (call.role === 'writer_revision') return RevisionOutputV3Schema;
  return EditorAssessmentV3Schema;
}

function rejectedDraft(error: unknown): { title: string; content: string } | null {
  if (!(error instanceof FlagshipV3Error) || !error.detail || typeof error.detail !== 'object') return null;
  const draft = (error.detail as Record<string, unknown>).draft;
  if (!draft || typeof draft !== 'object') return null;
  const value = draft as Record<string, unknown>;
  return typeof value.title === 'string' && typeof value.content === 'string'
    ? { title: value.title, content: value.content }
    : null;
}

/**
 * Calibration-only reconstruction of the previous over-directed Writer input.
 * It is intentionally unavailable to runtime production code: the branch sees
 * the whole kernel/arc/state/plan plus the Editor rubric so the causal A/B can
 * isolate context size and responsibility overlap on the same model and state.
 */
function buildOverDirectedWriterContext(input: {
  pack: z.infer<typeof FlagshipLaunchPackV3Schema>;
  state: StoryStateV3;
  plan: ChapterPlanV3;
  previousChapterTail?: string;
}): V3RoleContext {
  const value = {
    storyKernel: input.pack.kernel,
    arcPlan: input.pack.arc,
    storyState: input.state,
    chapterPlan: input.plan,
    previousChapterTail: input.previousChapterTail || null,
    editorRubric: V3_EDITOR_SYSTEM,
  };
  const text = `[OVER_DIRECTED_CONTROL_CONTEXT]\n${JSON.stringify(value)}`;
  return {
    role: 'writer',
    text,
    chars: text.length,
    budget: text.length,
    manifest: [{
      role: 'writer',
      id: 'OVER_DIRECTED_CONTROL_CONTEXT',
      sourceRef: 'calibration_only:legacy_full_context',
      chars: text.length,
      required: true,
    }],
  };
}

function plansForRun(pack: z.infer<typeof FlagshipLaunchPackV3Schema>, runDir: string, run: CandidateRun): ChapterPlanV3[] {
  const plans = [...pack.initialWindow.plans];
  if (run.requestedChapters <= 5) return plans;
  const chapterFive = run.chapters.find(chapter => chapter.chapterNumber === 5)?.stateAfter;
  if (!chapterFive) throw new Error(`${runDir} has no committed chapter-five state.`);
  const files = [
    path.join(runDir, 'checkpoints', 'planner-6-10-attempt-2.response.json'),
    path.join(runDir, 'checkpoints', 'planner-6-10-attempt-1.response.json'),
    path.join(runDir, 'checkpoints', 'planner-6-10.response.json'),
  ].filter(existsSync);
  for (const file of files) {
    try {
      const checkpoint = readJson<StoredResponse>(file);
      const draft = RollingPlanWindowDraftV3Schema.parse(cleanJson(checkpoint.content));
      const second = materializeRollingWindowV3({ kernel: pack.kernel, arc: pack.arc, state: chapterFive, draft });
      return [...plans, ...second.plans];
    } catch {
      // Continue to the other immutable attempt; never alter the artifact.
    }
  }
  throw new Error(`${runDir} has no valid immutable planner attempt for chapters 6-10.`);
}

async function main(): Promise<void> {
  const manifest = ManifestSchema.parse(readJson(path.resolve(manifestFile)));
  const controlRoutes = FlagshipModelRoutesV3Schema.parse(readJson(path.resolve(controlRoutesFile)));
  const release = getFlagshipReleaseManifestV3();
  const pairs = [];
  const launchPackDigests: string[] = [];
  let candidateRouteVersion: string | null = null;

  for (const entry of manifest.entries) {
    const pack = FlagshipLaunchPackV3Schema.parse(readJson(path.resolve(entry.launchPack)));
    const runDir = path.resolve(entry.candidateRunDir);
    const run = readJson<CandidateRun>(path.join(runDir, 'opening-run-v3.json'));
    if (run.engineReleaseId !== release.releaseId || run.enginePromptVersion !== FLAGSHIP_V3_PROMPT_VERSION) {
      throw new Error(`${entry.slot} candidate run is stale for ${release.releaseId}/${FLAGSHIP_V3_PROMPT_VERSION}.`);
    }
    if (run.requestedChapters !== 10 || run.completedChapters !== 10 || run.chapters.some(chapter => chapter.status !== 'publish')) {
      throw new Error(`${entry.slot} needs ten candidate prose options for the preference corpus. Operational success is measured from the separate sequential-survival corpus and is never inferred here.`);
    }
    candidateRouteVersion ||= run.routeVersion;
    if (candidateRouteVersion !== run.routeVersion) throw new Error('All candidate runs must use one exact route version.');
    if (controlRoutes.routeVersion !== run.routeVersion) {
      throw new Error(`${entry.slot} A/B requires the exact same model route for minimal and over-directed branches.`);
    }
    launchPackDigests.push(digestFlagshipV3(pack));
    const plans = plansForRun(pack, runDir, run);

    for (let index = 0; index < 10; index += 1) {
      const chapterNumber = index + 1;
      const candidateChapter = run.chapters[index];
      const stateBefore: StoryStateV3 = index === 0 ? pack.initialState : run.chapters[index - 1].stateAfter!;
      const plan = plans[index];
      if (!candidateChapter?.content || !candidateChapter.title || !stateBefore || !plan) {
        throw new Error(`${entry.slot} chapter ${chapterNumber} is incomplete.`);
      }
      const writerCheckpoint = readJson<StoredResponse>(path.join(runDir, 'checkpoints', `chapter-${chapterNumber}`, 'writer.response.json'));
      if (writerCheckpoint.model !== controlRoutes.writer) {
        throw new Error(`${entry.slot} chapter ${chapterNumber} Writer model differs between A/B branches.`);
      }
      const initialDraft = WriterOutputV3Schema.parse(cleanJson(writerCheckpoint.content));
      const previousChapterTail = chapterNumber > 1 ? run.chapters[index - 1]?.content || undefined : undefined;
      const contexts = buildV3RoleContexts({
        kernel: pack.kernel,
        arc: pack.arc,
        state: stateBefore,
        plan,
        previousChapterTail,
      });
      const overDirected = buildOverDirectedWriterContext({ pack, state: stateBefore, plan, previousChapterTail });
      const controlContexts = {
        ...contexts,
        writer: overDirected,
        revision: () => ({ ...overDirected, role: 'revision' as const }),
      };
      let controlCost = 0;
      let controlOutput: { title: string; content: string };
      try {
        const generated = await executeFlagshipV3Pipeline({
          kernel: pack.kernel,
          arc: pack.arc,
          state: stateBefore,
          plan,
          targetWordCount: 1500,
          contexts: controlContexts,
          previousChapterTail,
        }, {
          invoke: async call => {
            const model = call.role === 'writer_revision' ? controlRoutes.writer : controlRoutes.editor;
            const selectedModel = call.role === 'writer' ? controlRoutes.writer : model;
            const response = await callFlagshipModel(call.userPrompt, {
              model: selectedModel,
              temperature: call.role === 'writer' || call.role === 'writer_revision' ? 0.75 : 0.15,
              maxTokens: call.role === 'writer' || call.role === 'writer_revision' ? 32_768 : 16_384,
              thinkingLevel: call.role === 'writer' || call.role === 'writer_revision' ? 'low' : 'medium',
              systemPrompt: call.systemPrompt,
              responseJsonSchema: call.responseJsonSchema || toGeminiResponseJsonSchema(responseSchema(call)),
            }, { jsonMode: true, schemaName: `flagship_v3_machine_control_${entry.slot}_${chapterNumber}_${call.role}` });
            controlCost += Number(response.estimatedCostUsd || 0);
            return response.content;
          },
        });
        controlOutput = { title: generated.title, content: generated.content };
      } catch (error) {
        const draft = rejectedDraft(error);
        if (!draft) throw error;
        controlOutput = draft;
      }
      pairs.push({
        sampleId: `${entry.slot}-ch${chapterNumber}`,
        projectId: entry.projectId,
        chapterNumber,
        planDigest: digestFlagshipV3(plan),
        initialDraftDigest: digestFlagshipV3(initialDraft),
        brief: {
          story: { title: pack.kernel.title, concept: pack.kernel.concept, characters: pack.kernel.characters, worldClaims: pack.kernel.worldClaims, resources: pack.kernel.resources },
          plan,
          stateBefore,
        },
        candidate: { title: candidateChapter.title, content: candidateChapter.content },
        control: controlOutput,
        controlCostUsd: controlCost,
      });
    }
  }

  const corpus = MachineCalibrationPairCorpusV3Schema.parse({
    schemaVersion: 3,
    campaignId: manifest.campaignId || randomUUID(),
    corpusVersion: manifest.corpusVersion,
    promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    routeVersion: candidateRouteVersion,
    engineReleaseId: release.releaseId,
    launchPackDigests,
    pairs: pairs.map(({ controlCostUsd: _controlCostUsd, ...pair }) => pair),
  });
  const frozen = FrozenBriefCorpusV3Schema.parse({
    schemaVersion: 3,
    corpusVersion: corpus.corpusVersion,
    engineReleaseId: corpus.engineReleaseId,
    launchPackDigests: corpus.launchPackDigests,
    briefs: corpus.pairs.map(pair => ({
      id: pair.sampleId,
      projectId: pair.projectId,
      chapterNumber: pair.chapterNumber,
      briefDigest: digestFlagshipV3(pair.brief),
      planDigest: pair.planDigest,
      initialDraftDigest: pair.initialDraftDigest,
      brief: pair.brief,
    })),
  });
  writeFileSync(path.resolve(outputFile), `${JSON.stringify(corpus, null, 2)}\n`);
  writeFileSync(path.resolve(frozenOutputFile), `${JSON.stringify(frozen, null, 2)}\n`);
  console.log(JSON.stringify({ output: path.resolve(outputFile), frozenOutput: path.resolve(frozenOutputFile), samples: corpus.pairs.length, routeVersion: corpus.routeVersion, engineReleaseId: corpus.engineReleaseId }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

/**
 * Writing smoke: the mechanical gate that authorizes the production line.
 *
 * It answers one question — does Concept Lab → Planner → Plan Judge → Writer → Editor
 * → state transition survive N sequential chapters on this release with these routes?
 * It deliberately does NOT judge whether the prose is good. Editorial quality is decided
 * by window review on the hidden canary, using real accumulating chapters.
 *
 * This replaces a four-run benchmark chain that could only ever pass if no fix was
 * needed during a multi-hour run: every fix bumped the release hash and invalidated
 * the runs already completed in the chain.
 *
 * Runs entirely in memory. The only durable effect is one story_factory_runs row of
 * kind 'smoke', which claim_story_factory_job reads via story_factory_release_is_approved.
 *
 *   npm run factory:writing-smoke -- --apply
 *   npm run factory:writing-smoke -- --apply --chapters=5 --commission=factory/canary/commission.json
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  ArcPlanSchema,
  LaunchPackSchema,
  DEFAULT_MODEL_ROUTES,
  ModelRoutesSchema,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_REVISION,
  StoryFactoryError,
  assessSequentialContinuity,
  buildContinuityPacketFromEvents,
  memoryEntityIdsForArc,
  memoryEntityIdsForPlan,
  planRollingWindow,
  runConceptLab,
  selectPreviousTail,
  writeStoryChapter,
  type ProviderUsage,
  type StateEvent,
  type StoryState,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const flag = (name: string, fallback: string) =>
  args.find(entry => entry.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;

const commissionPath = flag('commission', 'factory/canary/commission.json');
const researchPath = flag('research', 'factory/canary/research.json');
const routesPath = flag('routes', '');
const targetChapters = Number(flag('chapters', '5'));
// Concept Lab is ~80% of a smoke's cost and rolls a fresh concept every run, which
// makes prompt iteration both expensive and noisy. --pack reuses a saved launch pack
// so an iteration only re-runs plan → write → edit (~$0.3, same story every time).
// Every full run saves its pack here automatically.
const packPath = flag('pack', '');
const savePackPath = flag('save-pack', 'factory/smoke-pack.local.json');

/** The smoke's independent referee. Fixed on the strongest editor-class model. */
const SEQUENTIAL_JUDGE_MODEL = 'gemini-3.1-pro-preview';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function readJson(target: string): unknown {
  return JSON.parse(readFileSync(path.resolve(target), 'utf8'));
}

function cost(usages: ProviderUsage[]): number {
  return usages.reduce((total, usage) => total + usage.costUsd, 0);
}

async function recordRun(input: {
  status: 'passed' | 'blocked' | 'infra_blocked';
  routes: unknown;
  artifact: Record<string, unknown>;
  usages: ProviderUsage[];
  errorCode?: string;
  errorMessage?: string;
}) {
  if (!apply) return null;
  const inserted = await db.from('story_factory_runs').insert({
    kind: 'smoke',
    status: input.status,
    engine_release: STORY_FACTORY_RELEASE,
    engine_revision: STORY_FACTORY_REVISION,
    model_routes: { route: input.routes },
    input_artifact: { commissionPath, researchPath, targetChapters },
    output_artifact: input.artifact,
    usage: input.usages,
    estimated_cost_usd: cost(input.usages),
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    finished_at: new Date().toISOString(),
  }).select('id').single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id as string;
}

async function main() {
  if (!Number.isInteger(targetChapters) || targetChapters < 5 || targetChapters > 20) {
    throw new Error('--chapters must be an integer between 5 and 20.');
  }
  const routes = routesPath ? ModelRoutesSchema.parse(readJson(routesPath)) : DEFAULT_MODEL_ROUTES;
  const usages: ProviderUsage[] = [];
  console.log(JSON.stringify({
    dryRun: !apply,
    release: STORY_FACTORY_RELEASE,
    revision: STORY_FACTORY_REVISION,
    routes,
    targetChapters,
  }, null, 2));
  if (!apply) return;

  const events: StateEvent[] = [];
  const chapters: { chapterNumber: number; title: string; content: string }[] = [];
  let criticalContinuityViolations = 0;
  let firstPassPublishes = 0;

  // Outside the try: a mistyped --commission path is operator error, and recording it
  // as an infra_blocked run row would pollute provider-reliability telemetry.
  const commission = readJson(commissionPath);
  const research = readJson(researchPath);

  try {
    let launchPack: { kernel: unknown; arc: unknown; initialState: unknown };
    if (packPath) {
      launchPack = LaunchPackSchema.parse(readJson(packPath));
      console.log(`[smoke] reusing launch pack from ${packPath}`);
    } else {
      const setup = await runConceptLab({
        commission,
        research,
        routes,
      });
      usages.push(...setup.usages);
      launchPack = setup.launchPack;
      writeFileSync(path.resolve(savePackPath), `${JSON.stringify(setup.launchPack, null, 2)}\n`);
      console.log(`[smoke] launch pack saved to ${savePackPath}`);
    }
    const parsedPack = LaunchPackSchema.parse(launchPack);
    const kernel = parsedPack.kernel;
    const arc = ArcPlanSchema.parse(parsedPack.arc);
    let state: StoryState = parsedPack.initialState;
    console.log(`[smoke] launch pack ready: ${kernel.title}`);

    let rolling: Awaited<ReturnType<typeof planRollingWindow>>['rollingPlan'] | null = null;
    while (state.chapterNumber < targetChapters) {
      const nextChapter = state.chapterNumber + 1;
      if (!rolling?.plans.some(plan => plan.chapterNumber === nextChapter)) {
        const planned = await planRollingWindow({
          kernel,
          arc,
          state,
          routes,
          continuityPacket: buildContinuityPacketFromEvents({
            state,
            entityIds: memoryEntityIdsForArc(kernel, arc, state),
            events,
          }),
        });
        usages.push(...planned.usages);
        rolling = planned.rollingPlan;
      }
      const plan = rolling.plans.find(item => item.chapterNumber === nextChapter);
      if (!plan) throw new StoryFactoryError('plan_blocked', `Rolling plan never covered chapter ${nextChapter}.`);
      const previousContent = chapters[chapters.length - 1]?.content;
      const stateBefore = state;

      const result = await writeStoryChapter({
        kernel,
        state,
        plan,
        nextPlan: rolling.plans.find(item => item.chapterNumber === nextChapter + 1),
        previousChapter: previousContent,
        continuityPacket: buildContinuityPacketFromEvents({
          state,
          entityIds: memoryEntityIdsForPlan(kernel, plan),
          events,
        }),
        routes,
      });
      usages.push(...result.usages);
      if (result.revisionCount === 0) firstPassPublishes += 1;

      // Independent continuity read: the Editor judges one chapter against its plan,
      // this judges the chapter against the chapter before it. The judge model is
      // PINNED, not taken from routes.editor: when the editor route itself is under
      // experiment, the smoke's referee must not be the model being examined —
      // otherwise a lenient editor candidate would mark its own exam.
      const continuity = await assessSequentialContinuity({
        kernel,
        plan,
        stateBefore,
        stateAfter: result.stateAfter,
        previousTail: previousContent ? selectPreviousTail(previousContent) : null,
        continuityPacket: buildContinuityPacketFromEvents({
          state: stateBefore,
          entityIds: memoryEntityIdsForPlan(kernel, plan),
          events,
        }),
        content: result.draft.content,
        model: SEQUENTIAL_JUDGE_MODEL,
      });
      usages.push(continuity.usage);
      if (continuity.assessment.status !== 'pass') {
        criticalContinuityViolations += continuity.assessment.issues.length;
        console.error(`[smoke] chapter ${nextChapter} continuity issues: ${JSON.stringify(continuity.assessment.issues)}`);
      }

      state = result.stateAfter;
      events.push(...result.stateEvents);
      chapters.push({ chapterNumber: nextChapter, title: result.draft.title, content: result.draft.content });
      console.log(`[smoke] chapter ${nextChapter} published (${result.wordCount} words, revisions ${result.revisionCount}, $${cost(usages).toFixed(4)} cumulative)`);

      // Only a boundary reached BEFORE the target is a failure. The check runs after
      // the append, so without the length guard a target that lands exactly on the
      // arc boundary would record a false 'blocked' after every chapter succeeded.
      if (state.chapterNumber >= arc.plannedEndChapter && chapters.length < targetChapters) {
        throw new StoryFactoryError('plan_blocked', 'Smoke reached the arc boundary before completing the chapter target.');
      }
    }

    const passed = chapters.length >= targetChapters && criticalContinuityViolations === 0;
    const runId = await recordRun({
      status: passed ? 'passed' : 'blocked',
      routes,
      usages,
      artifact: {
        chaptersCompleted: chapters.length,
        criticalContinuityViolations,
        firstPassPublishRate: chapters.length ? firstPassPublishes / chapters.length : 0,
        totalCostUsd: cost(usages),
        title: kernel.title,
        chapterTitles: chapters.map(chapter => chapter.title),
      },
      errorCode: passed ? undefined : 'quality_blocked',
      errorMessage: passed ? undefined : `Sequential continuity reported ${criticalContinuityViolations} issue(s).`,
    });
    console.log(JSON.stringify({
      smoke: passed ? 'passed' : 'blocked',
      runId,
      chaptersCompleted: chapters.length,
      criticalContinuityViolations,
      totalCostUsd: Number(cost(usages).toFixed(4)),
    }, null, 2));
    if (!passed) process.exitCode = 1;
  } catch (error) {
    const factoryError = error instanceof StoryFactoryError
      ? error
      : new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
    await recordRun({
      status: factoryError.code === 'infra_blocked' ? 'infra_blocked' : 'blocked',
      routes,
      usages,
      artifact: {
        chaptersCompleted: chapters.length,
        criticalContinuityViolations,
        totalCostUsd: cost(usages),
        evidence: factoryError.evidence ?? null,
      },
      errorCode: factoryError.code,
      errorMessage: factoryError.message,
    });
    console.error(`[smoke] ${factoryError.code}: ${factoryError.message}`);
    process.exitCode = 1;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

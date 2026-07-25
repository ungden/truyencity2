import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  ChapterPlanSchema,
  DEFAULT_MODEL_ROUTES,
  ReaderJudgmentSchema,
  RollingPlanSchema,
  StoryKernelSchema,
  StoryStateSchema,
  geminiProvider,
  writeStoryChapter,
  type ProviderUsage,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const corpusPath = path.resolve(value('--corpus') ?? '/tmp/truyencity-writer-bakeoff-10.json');
const outputPath = path.resolve(value('--output') ?? `${corpusPath}.results.json`);
const freeze = args.includes('--freeze');
const freezeOnly = args.includes('--freeze-only');
const writerModels = (value('--writers') ?? 'gemini-3.6-flash,gemini-3.1-pro-preview,gemini-2.5-pro')
  .split(',')
  .map(item => item.trim());
if (writerModels.length !== 3 || new Set(writerModels).size !== 3) {
  throw new Error('--writers must contain exactly three distinct routes.');
}
const judgeModels = (process.env.FACTORY_JUDGE_MODELS
  ?? 'gemini-2.5-pro,gemini-3.5-flash,gemini-3.1-pro-preview')
  .split(',')
  .map(item => item.trim());
if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) {
  throw new Error('FACTORY_JUDGE_MODELS must contain three distinct routes.');
}

const frozenBriefSchema = z.object({
  id: z.string().min(3),
  premise: z.string().min(20).max(2_000),
  kernel: StoryKernelSchema,
  state: StoryStateSchema,
  plan: ChapterPlanSchema,
  previousTail: z.string().max(20_000).nullable(),
}).strict();
const frozenCorpusSchema = z.object({
  corpusVersion: z.literal(1),
  normalizationVersion: z.literal('neutral-voice-only-v1'),
  frozenAt: z.string().datetime(),
  sourceDigest: z.string().length(64),
  samples: z.array(frozenBriefSchema).length(10),
}).strict();
type FrozenCorpus = z.infer<typeof frozenCorpusSchema>;

function normalizeHistoricalKernel(value: unknown) {
  if (!value || typeof value !== 'object') return value;
  const kernel = structuredClone(value) as { characters?: Array<{ voice?: Record<string, unknown> }> };
  for (const character of kernel.characters ?? []) {
    if (!character.voice || typeof character.voice !== 'object') continue;
    character.voice.reasoningStyle ??= 'quan sát dữ kiện, cân nhắc lợi ích và hệ quả trước khi quyết định';
    character.voice.emotionDisplay ??= 'restrained';
    character.voice.humorStyle ??= 'situational';
    delete character.voice.stressResponse;
    delete character.voice.avoidances;
    delete character.voice.summary;
  }
  return kernel;
}

function cost(usages: ProviderUsage[]): number {
  return usages.reduce((sum, usage) => sum + usage.costUsd, 0);
}

function tail(content: string, maximumWords = 600): string {
  const paragraphs = content.trim().split(/\n\s*\n/u);
  const selected: string[] = [];
  let words = 0;
  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const count = paragraphs[index].trim().split(/\s+/u).filter(Boolean).length;
    if (selected.length > 0 && words + count > maximumWords) break;
    selected.unshift(paragraphs[index].trim());
    words += count;
  }
  return selected.join('\n\n');
}

async function freezeCorpus(): Promise<FrozenCorpus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is missing.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const explicitJobs = (value('--job-ids') ?? '').split(',').map(item => item.trim()).filter(Boolean);
  let jobsQuery = db.from('story_factory_jobs')
    .select('id,project_id,novel_id,status')
    .in('status', ['cancelled', 'plan_blocked', 'quality_blocked', 'setup_blocked'])
    .order('updated_at', { ascending: false })
    .limit(20);
  if (explicitJobs.length) jobsQuery = jobsQuery.in('id', explicitJobs);
  const jobsResult = await jobsQuery;
  if (jobsResult.error) throw jobsResult.error;
  const samples: FrozenCorpus['samples'] = [];
  const diagnostics: Array<Record<string, unknown>> = [];

  for (const job of jobsResult.data ?? []) {
    if (samples.length >= 10) break;
    const projectResult = await db.from('ai_story_projects')
      .select('story_kernel')
      .eq('id', job.project_id)
      .single();
    if (projectResult.error) {
      diagnostics.push({ jobId: job.id, stage: 'project', error: projectResult.error.message });
      continue;
    }
    const kernelResult = StoryKernelSchema.safeParse(normalizeHistoricalKernel(projectResult.data.story_kernel));
    if (!kernelResult.success) {
      diagnostics.push({ jobId: job.id, stage: 'kernel', issue: kernelResult.error.issues[0] });
      continue;
    }
    const [plansResult, chapterRunsResult, chaptersResult, setupResult] = await Promise.all([
      db.from('story_factory_runs').select('output_artifact').eq('job_id', job.id).eq('kind', 'plan').eq('status', 'passed').order('started_at'),
      db.from('story_factory_runs').select('chapter_number,output_artifact').eq('job_id', job.id).eq('kind', 'chapter').eq('status', 'published').order('chapter_number'),
      db.from('chapters').select('chapter_number,content').eq('novel_id', job.novel_id).order('chapter_number'),
      db.from('story_factory_runs').select('output_artifact').eq('job_id', job.id).eq('kind', 'setup').eq('status', 'passed')
        .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (plansResult.error || chapterRunsResult.error || chaptersResult.error || setupResult.error) {
      diagnostics.push({
        jobId: job.id,
        stage: 'queries',
        error: plansResult.error?.message ?? chapterRunsResult.error?.message ?? chaptersResult.error?.message ?? setupResult.error?.message,
      });
      continue;
    }
    const plans = (plansResult.data ?? []).flatMap(row => {
      const parsed = RollingPlanSchema.safeParse(row.output_artifact);
      return parsed.success ? parsed.data.plans : [];
    });
    const initialState = StoryStateSchema.safeParse(
      (setupResult.data?.output_artifact as { launchPack?: { initialState?: unknown } } | null)?.launchPack?.initialState,
    );
    const stateAfter = new Map((chapterRunsResult.data ?? []).flatMap(row => {
      const parsed = StoryStateSchema.safeParse(
        (row.output_artifact as { stateAfter?: unknown } | null)?.stateAfter,
      );
      return parsed.success && typeof row.chapter_number === 'number'
        ? [[row.chapter_number, parsed.data] as const]
        : [];
    }));
    const chapterContent = new Map((chaptersResult.data ?? []).map(row => [row.chapter_number, row.content ?? '']));
    const beforeCount = samples.length;
    for (const plan of plans) {
      if (samples.length >= 10) break;
      const state = plan.chapterNumber === 1
        ? (initialState.success ? initialState.data : null)
        : stateAfter.get(plan.chapterNumber - 1) ?? null;
      if (!state || state.chapterNumber !== plan.chapterNumber - 1) continue;
      const previous = plan.chapterNumber > 1 ? chapterContent.get(plan.chapterNumber - 1) : '';
      if (plan.chapterNumber > 1 && !previous) continue;
      samples.push({
        id: `${job.id}-ch${plan.chapterNumber}`,
        premise: kernelResult.data.description,
        kernel: kernelResult.data,
        state,
        plan,
        previousTail: previous ? tail(previous) : null,
      });
    }
    if (samples.length === beforeCount) {
      diagnostics.push({
        jobId: job.id,
        stage: 'briefs',
        parsedPlans: plans.length,
        planRows: plansResult.data?.length ?? 0,
        initialStateValid: initialState.success,
        initialStateIssue: initialState.success ? null : initialState.error.issues[0],
        stateAfterCount: stateAfter.size,
        chapterCount: chapterContent.size,
      });
    }
  }
  if (samples.length !== 10) {
    throw new Error(`Could only freeze ${samples.length}/10 valid historical briefs: ${JSON.stringify(diagnostics.slice(0, 12))}`);
  }
  const sourceDigest = createHash('sha256').update(JSON.stringify(samples)).digest('hex');
  return frozenCorpusSchema.parse({
    corpusVersion: 1,
    normalizationVersion: 'neutral-voice-only-v1',
    frozenAt: new Date().toISOString(),
    sourceDigest,
    samples,
  });
}

async function main() {
  const corpus = freeze
    ? await freezeCorpus()
    : frozenCorpusSchema.parse(JSON.parse(readFileSync(corpusPath, 'utf8')));
  if (freeze) writeFileSync(corpusPath, `${JSON.stringify(corpus, null, 2)}\n`);
  if (freezeOnly) {
    console.log(JSON.stringify({ corpusPath, samples: corpus.samples.length, sourceDigest: corpus.sourceDigest }, null, 2));
    return;
  }

  type Generation = {
    sampleId: string;
    writer: string;
    ok: boolean;
    content?: string;
    title?: string;
    revisionCount?: number;
    costUsd?: number;
    error?: string;
    issues?: unknown;
  };
  type Vote = {
    sampleId: string;
    left: string;
    right: string;
    model: string;
    preference: 'left' | 'right' | 'tie';
    wantsLeft: boolean;
    wantsRight: boolean;
    costUsd: number;
  };
  const previous = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, 'utf8')) as {
      corpusDigest?: string;
      generations?: Generation[];
      votes?: Vote[];
    }
    : {};
  if (previous.corpusDigest && previous.corpusDigest !== corpus.sourceDigest) {
    throw new Error('Bake-off checkpoint belongs to a different frozen corpus.');
  }
  const generations: Generation[] = [...(previous.generations ?? [])];
  for (let batchStart = 0; batchStart < corpus.samples.length; batchStart += 3) {
    const pending = corpus.samples.slice(batchStart, batchStart + 3).flatMap(sample => (
      writerModels.filter(writer => !generations.some(result => (
        result.sampleId === sample.id && result.writer === writer
      ))).map(writer => ({ sample, writer }))
    ));
    const created = await Promise.all(pending.map(async ({ sample, writer }) => {
        try {
          const result = await writeStoryChapter({
            kernel: sample.kernel,
            state: sample.state,
            plan: sample.plan,
            previousChapter: sample.previousTail ?? undefined,
            routes: {
              ...DEFAULT_MODEL_ROUTES,
              writer,
              routeVersion: `${DEFAULT_MODEL_ROUTES.routeVersion}:bakeoff:${writer}`,
            },
          });
          return {
            sampleId: sample.id,
            writer,
            ok: true,
            content: result.draft.content,
            title: result.draft.title,
            revisionCount: result.revisionCount,
            costUsd: cost(result.usages),
          } satisfies Generation;
        } catch (error) {
          const evidence = error && typeof error === 'object' && 'evidence' in error
            ? (error as { evidence?: { pipelineTelemetry?: {
              usages?: ProviderUsage[];
              revisionCount?: number;
              finalAssessment?: unknown;
              initialAssessment?: unknown;
            } } }).evidence?.pipelineTelemetry
            : undefined;
          return {
            sampleId: sample.id,
            writer,
            ok: false,
            revisionCount: evidence?.revisionCount,
            costUsd: evidence?.usages ? cost(evidence.usages) : undefined,
            error: error instanceof Error ? error.message : String(error),
            issues: evidence?.finalAssessment ?? evidence?.initialAssessment ?? null,
          } satisfies Generation;
        }
      }));
    generations.push(...created);
    writeFileSync(outputPath, `${JSON.stringify({
      corpusDigest: corpus.sourceDigest,
      generations,
      votes: previous.votes ?? [],
    }, null, 2)}\n`);
  }

  const eligible = writerModels.filter(writer => {
    const route = generations.filter(result => result.writer === writer);
    return route.length === 10
      && route.every(result => result.ok && typeof result.costUsd === 'number' && result.costUsd <= 0.5);
  });
  const votes: Vote[] = [...(previous.votes ?? [])];
  for (let leftIndex = 0; leftIndex < eligible.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < eligible.length; rightIndex += 1) {
      const left = eligible[leftIndex];
      const right = eligible[rightIndex];
      for (const sample of corpus.samples) {
        const leftDraft = generations.find(result => result.sampleId === sample.id && result.writer === left)!;
        const rightDraft = generations.find(result => result.sampleId === sample.id && result.writer === right)!;
        const missingJudges = judgeModels.filter(model => !votes.some(vote => (
          vote.sampleId === sample.id && vote.left === left && vote.right === right && vote.model === model
        )));
        const judgments = await Promise.all(missingJudges.map(async model => {
          const swap = parseInt(createHash('sha256').update(`${sample.id}:${left}:${right}:${model}`).digest('hex').slice(0, 2), 16) % 2 === 0;
          const result = await geminiProvider.json({
            model,
            system: `Bạn là độc giả blind của truyện dài tiếng Việt.
Chỉ đánh giá prose, giọng nhân vật, cảnh, cảm xúc, nhân quả và sức kéo đọc tiếp. Không suy đoán model và không thưởng cho checklist ẩn.`,
            prompt: JSON.stringify({
              brief: {
                premise: sample.premise,
                chapterNumber: sample.plan.chapterNumber,
                previousTail: sample.previousTail,
              },
              versionA: swap ? rightDraft.content : leftDraft.content,
              versionB: swap ? leftDraft.content : rightDraft.content,
            }),
            schema: ReaderJudgmentSchema,
            temperature: 0.4,
          });
          const leftIsA = !swap;
          return {
            sampleId: sample.id,
            left,
            right,
            model,
            preference: result.value.preference === 'tie'
              ? 'tie' as const
              : result.value.preference === (leftIsA ? 'A' : 'B') ? 'left' as const : 'right' as const,
            wantsLeft: leftIsA ? result.value.wantsNextA : result.value.wantsNextB,
            wantsRight: leftIsA ? result.value.wantsNextB : result.value.wantsNextA,
            costUsd: result.usage.costUsd,
          };
        }));
        votes.push(...judgments);
        writeFileSync(outputPath, `${JSON.stringify({ corpusDigest: corpus.sourceDigest, generations, votes }, null, 2)}\n`);
      }
    }
  }

  const summaries = writerModels.map(writer => {
    const results = generations.filter(result => result.writer === writer);
    const routeCosts = results.flatMap(result => typeof result.costUsd === 'number' ? [result.costUsd] : []).sort((a, b) => a - b);
    let pairwiseMajorityWins = 0;
    let wantsNextMajorities = 0;
    for (const sample of corpus.samples) {
      const relevant = votes.filter(vote => vote.sampleId === sample.id && (vote.left === writer || vote.right === writer));
      const preferred = relevant.filter(vote => (
        vote.left === writer ? vote.preference === 'left' : vote.preference === 'right'
      )).length;
      const wants = relevant.filter(vote => vote.left === writer ? vote.wantsLeft : vote.wantsRight).length;
      if (relevant.length && preferred > relevant.length / 2) pairwiseMajorityWins += 1;
      if (relevant.length && wants > relevant.length / 2) wantsNextMajorities += 1;
    }
    return {
      writer,
      publishRate: results.filter(result => result.ok).length / 10,
      firstPassRate: results.filter(result => result.ok && result.revisionCount === 0).length / 10,
      pairwiseMajorityWins,
      wantsNextMajorities,
      medianCostUsd: routeCosts.length === 10 ? (routeCosts[4] + routeCosts[5]) / 2 : null,
      maxCostUsd: routeCosts.length === 10 ? Math.max(...routeCosts) : null,
      eligible: eligible.includes(writer),
    };
  });
  const recommended = summaries.filter(summary => summary.eligible).sort((a, b) => (
    b.pairwiseMajorityWins - a.pairwiseMajorityWins
    || b.wantsNextMajorities - a.wantsNextMajorities
    || (a.medianCostUsd ?? Infinity) - (b.medianCostUsd ?? Infinity)
  ))[0]?.writer ?? null;
  const final = {
    corpusDigest: corpus.sourceDigest,
    testedAt: new Date().toISOString(),
    editor: DEFAULT_MODEL_ROUTES.editor,
    judges: judgeModels,
    writers: writerModels,
    summaries,
    recommended,
    rejected: recommended === null,
    generations,
    votes,
  };
  writeFileSync(outputPath, `${JSON.stringify(final, null, 2)}\n`);
  let audit: { storageKey: string; sha256: string; runId: string } | null = null;
  if (apply) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase server environment is missing.');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const archive = gzipSync(Buffer.from(JSON.stringify({ corpus, result: final })));
    const sha256 = createHash('sha256').update(archive).digest('hex');
    const storageKey = `benchmarks/writer-bakeoff-v1/${corpus.sourceDigest}-${sha256}.json.gz`;
    const upload = await db.storage.from('factory-audit').upload(storageKey, archive, {
      contentType: 'application/gzip',
      upsert: false,
    });
    if (upload.error && !/already exists|duplicate/iu.test(upload.error.message)) throw upload.error;
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: recommended ? 'passed' : 'failed',
      engine_release: (await import('../src/services/story-factory')).STORY_FACTORY_RELEASE,
      benchmark_protocol_version: 'story-factory-writer-bakeoff-v1',
      artifact_digest: sha256,
      model_routes: { writers: writerModels, editor: DEFAULT_MODEL_ROUTES.editor, judges: judgeModels },
      input_artifact: {
        corpusDigest: corpus.sourceDigest,
        normalizationVersion: corpus.normalizationVersion,
        samplesExpected: 10,
        samplesCompleted: generations.length / writerModels.length,
      },
      output_artifact: { storageKey, sha256, summaries, recommended, rejected: recommended === null },
      estimated_cost_usd: generations.reduce((sum, item) => sum + (item.costUsd ?? 0), 0)
        + votes.reduce((sum, item) => sum + item.costUsd, 0),
      first_pass: recommended
        ? summaries.find(summary => summary.writer === recommended)?.firstPassRate === 1
        : false,
      error_code: recommended ? null : 'writer_route_bakeoff_rejected',
      error_message: recommended ? null : 'No Writer route satisfied the immutable ten-brief recovery gate.',
      finished_at: new Date().toISOString(),
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    audit = { storageKey, sha256, runId: inserted.data.id };
  }
  console.log(JSON.stringify({
    corpusPath,
    outputPath,
    summaries,
    recommended,
    rejected: recommended === null,
    audit,
  }, null, 2));
  if (!recommended) process.exitCode = 2;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

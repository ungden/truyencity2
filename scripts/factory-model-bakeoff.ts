import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  DEFAULT_MODEL_ROUTES,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  WriterBakeoffCorpusSchema,
  digestArtifact,
  geminiProvider,
  writeStoryChapter,
  type EditorAssessment,
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
const corpusPath = path.resolve(value('--corpus') ?? '/tmp/truyencity-writer-bakeoff-v4-corpus.json');
const outputPath = path.resolve(value('--output') ?? `${corpusPath}.results.json`);
const writerModels = (value('--writers') ?? 'gemini-3.6-flash,gemini-3.1-pro-preview,gemini-2.5-pro')
  .split(',')
  .map(item => item.trim());
if (writerModels.length !== 3 || new Set(writerModels).size !== 3) {
  throw new Error('--writers must contain exactly three distinct routes.');
}
const editorModel = value('--editor') ?? DEFAULT_MODEL_ROUTES.editor;
if (writerModels.every(writer => writer === editorModel)) {
  throw new Error('--editor must leave at least one independent Writer route.');
}
const judgeModels = (process.env.FACTORY_JUDGE_MODELS
  ?? 'gemini-2.5-pro,gemini-3.5-flash,gemini-3.1-pro-preview')
  .split(',')
  .map(item => item.trim());
if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) {
  throw new Error('FACTORY_JUDGE_MODELS must contain three distinct routes.');
}

type Generation = {
  sampleId: string;
  writer: string;
  status: 'publish' | 'writer_failed' | 'corpus_invalid' | 'infra_failed';
  content: string;
  title: string;
  revisionCount: number;
  costUsd: number;
  criticalViolation: boolean;
  issues: EditorAssessment | null;
  initialAssessment: EditorAssessment | null;
  finalAssessment: EditorAssessment | null;
  error: string | null;
  errorEvidence: unknown;
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

const PairwiseReaderJudgmentSchema = z.object({
  preference: z.enum(['A', 'B', 'tie']),
  wantsNextA: z.boolean(),
  wantsNextB: z.boolean(),
  reason: z.string().trim().min(5).max(2_000),
}).strict();

function cost(usages: ProviderUsage[]): number {
  return usages.reduce((sum, usage) => sum + usage.costUsd, 0);
}

function assessmentHasInvalidArtifact(assessment: EditorAssessment | null): boolean {
  return assessment?.status === 'revise' && assessment.continuityIssues.some(issue => issue.scope !== 'prose');
}

function assessmentHasCriticalViolation(assessment: EditorAssessment | null): boolean {
  return assessment?.status === 'revise' && assessment.continuityIssues.some(issue => issue.severity === 'critical');
}

function pipelineTelemetry(error: unknown) {
  if (!error || typeof error !== 'object' || !('evidence' in error)) return null;
  return (error as {
    evidence?: {
      pipelineTelemetry?: {
        initialDraft?: { title: string; content: string } | null;
        revisionDraft?: { title: string; content: string } | null;
        initialAssessment?: EditorAssessment | null;
        finalAssessment?: EditorAssessment | null;
        usages?: ProviderUsage[];
        revisionCount?: number;
      };
    };
  }).evidence?.pipelineTelemetry ?? null;
}

async function main() {
  const campaignBudgetUsd = 50;
  const corpus = WriterBakeoffCorpusSchema.parse(JSON.parse(readFileSync(corpusPath, 'utf8')));
  if (corpus.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Writer corpus release ${corpus.engineRelease} does not match ${STORY_FACTORY_RELEASE}.`);
  }
  const corpusDigest = digestArtifact(corpus);
  const previous = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, 'utf8')) as {
      corpusDigest?: string;
      editor?: string;
      generations?: Generation[];
      votes?: Vote[];
    }
    : {};
  if (previous.corpusDigest && previous.corpusDigest !== corpusDigest) {
    throw new Error('Writer bake-off checkpoint belongs to a different plan-qualified corpus.');
  }
  if (previous.editor && previous.editor !== editorModel) {
    throw new Error('Writer bake-off checkpoint belongs to a different Editor route.');
  }
  const generations: Generation[] = (previous.generations ?? []).filter(result => (
    typeof result.costUsd === 'number'
    && typeof result.content === 'string'
    && ['publish', 'writer_failed', 'corpus_invalid', 'infra_failed'].includes(result.status)
  ));

  for (let batchStart = 0; batchStart < corpus.samples.length; batchStart += 3) {
    const pending = corpus.samples.slice(batchStart, batchStart + 3).flatMap(sample => (
      writerModels.filter(writer => !generations.some(result => (
        result.sampleId === sample.id && result.writer === writer
      ))).map(writer => ({ sample, writer }))
    ));
    const created = await Promise.all(pending.map(async ({ sample, writer }): Promise<Generation> => {
      try {
        const result = await writeStoryChapter({
          kernel: sample.kernel,
          state: sample.state,
          plan: sample.plan,
          previousChapter: sample.previousTail ?? undefined,
          routes: {
            ...DEFAULT_MODEL_ROUTES,
            planner: corpus.planner,
            planJudge: corpus.planJudge,
            editor: editorModel,
            writer,
            routeVersion: `${DEFAULT_MODEL_ROUTES.routeVersion}:writer-bakeoff:${writer}`,
          },
        });
        return {
          sampleId: sample.id,
          writer,
          status: 'publish',
          content: result.draft.content,
          title: result.draft.title,
          revisionCount: result.revisionCount,
          costUsd: cost(result.usages),
          criticalViolation: false,
          issues: result.assessment,
          initialAssessment: result.attemptTelemetry.initialAssessment,
          finalAssessment: result.attemptTelemetry.finalAssessment,
          error: null,
          errorEvidence: null,
        };
      } catch (error) {
        const typed = error && typeof error === 'object' && 'code' in error
          ? error as { code?: unknown }
          : null;
        const telemetry = pipelineTelemetry(error);
        if (typed?.code === 'infra_blocked') {
          const draft = telemetry?.revisionDraft ?? telemetry?.initialDraft;
          return {
            sampleId: sample.id,
            writer,
            status: 'infra_failed',
            content: draft?.content ?? '',
            title: draft?.title ?? '',
            revisionCount: telemetry?.revisionCount ?? (telemetry?.revisionDraft ? 1 : 0),
            costUsd: cost(telemetry?.usages ?? []),
            criticalViolation: false,
            issues: telemetry?.finalAssessment ?? telemetry?.initialAssessment ?? null,
            initialAssessment: telemetry?.initialAssessment ?? null,
            finalAssessment: telemetry?.finalAssessment ?? null,
            error: error instanceof Error ? error.message : String(error),
            errorEvidence: typed && 'evidence' in typed ? (typed as { evidence?: unknown }).evidence ?? null : null,
          };
        }
        if (!telemetry?.usages?.length) throw error;
        const assessment = telemetry.finalAssessment ?? telemetry.initialAssessment ?? null;
        const draft = telemetry.revisionDraft ?? telemetry.initialDraft;
        if (!draft) throw error;
        return {
          sampleId: sample.id,
          writer,
          status: assessmentHasInvalidArtifact(assessment) ? 'corpus_invalid' : 'writer_failed',
          content: draft.content,
          title: draft.title,
          revisionCount: telemetry.revisionCount ?? (telemetry.revisionDraft ? 1 : 0),
          costUsd: cost(telemetry.usages),
          criticalViolation: assessmentHasCriticalViolation(assessment),
          issues: assessment,
          initialAssessment: telemetry.initialAssessment ?? null,
          finalAssessment: telemetry.finalAssessment ?? null,
          error: error instanceof Error ? error.message : String(error),
          errorEvidence: typed && 'evidence' in typed ? (typed as { evidence?: unknown }).evidence ?? null : null,
        };
      }
    }));
    generations.push(...created);
    writeFileSync(outputPath, `${JSON.stringify({
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      corpusDigest,
      editor: editorModel,
      generations,
      votes: previous.votes ?? [],
    }, null, 2)}\n`);
  }

  const invalidBriefIds = [...new Set(generations
    .filter(result => result.status === 'corpus_invalid')
    .map(result => result.sampleId))];
  let votes: Vote[] = [...(previous.votes ?? [])];
  const preliminary = writerModels.map(writer => {
    const results = generations.filter(result => result.writer === writer);
    return {
      writer,
      publishRate: results.filter(result => result.status === 'publish').length / corpus.samples.length,
      criticalViolations: results.filter(result => result.criticalViolation).length,
      infraFailures: results.filter(result => result.status === 'infra_failed').length,
      maxCostUsd: Math.max(...results.map(result => result.costUsd)),
    };
  });
  const comparisonWriters = preliminary
    .filter(summary => (
      summary.writer !== editorModel
      && summary.criticalViolations === 0
      && summary.maxCostUsd <= 0.5
    ))
    .map(summary => summary.writer);
  votes = votes.filter(vote => (
    comparisonWriters.includes(vote.left) && comparisonWriters.includes(vote.right)
  ));

  if (invalidBriefIds.length) {
    votes = [];
  } else {
    for (let leftIndex = 0; leftIndex < comparisonWriters.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < comparisonWriters.length; rightIndex += 1) {
        const left = comparisonWriters[leftIndex];
        const right = comparisonWriters[rightIndex];
        for (const sample of corpus.samples) {
          const leftDraft = generations.find(result => result.sampleId === sample.id && result.writer === left)!;
          const rightDraft = generations.find(result => result.sampleId === sample.id && result.writer === right)!;
          if (!leftDraft.content || !rightDraft.content) continue;
          const missingJudges = judgeModels.filter(model => !votes.some(vote => (
            vote.sampleId === sample.id && vote.left === left && vote.right === right && vote.model === model
          )));
          const judgments = await Promise.all(missingJudges.map(async model => {
            const swap = parseInt(createHash('sha256').update(`${sample.id}:${left}:${right}:${model}`).digest('hex').slice(0, 2), 16) % 2 === 0;
            const result = await geminiProvider.json({
              model,
              system: `Bạn là độc giả blind của truyện dài tiếng Việt.
Chỉ đánh giá prose, giọng nhân vật, cảnh, cảm xúc, nhân quả và sức kéo đọc tiếp.
Không được xem plan/state, không suy đoán model và không thưởng checklist kỹ thuật.`,
              prompt: JSON.stringify({
                premise: sample.kernel.description,
                chapterNumber: sample.plan.chapterNumber,
                previousTail: sample.previousTail,
                versionA: swap ? rightDraft.content : leftDraft.content,
                versionB: swap ? leftDraft.content : rightDraft.content,
              }),
              schema: PairwiseReaderJudgmentSchema,
              temperature: 0.4,
              // Pairwise reader preference is a bounded reading task. Gemini
              // 3.1 Pro defaults to high dynamic thinking and can exhaust the
              // entire output allowance before emitting this four-field JSON.
              // Use the provider-supported low setting; Gemini 2.5 uses the
              // legacy bounded thinking budget instead.
              ...(model.startsWith('gemini-2.5-')
                ? { thinkingBudget: 2_048 }
                : { thinkingLevel: 'low' as const }),
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
          writeFileSync(outputPath, `${JSON.stringify({
            protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
            corpusDigest,
            editor: editorModel,
            generations,
            votes,
          }, null, 2)}\n`);
        }
      }
    }
  }

  const summaries = writerModels.map(writer => {
    const results = generations.filter(result => result.writer === writer);
    const routeVotes = votes.filter(vote => (
      comparisonWriters.includes(vote.left)
      && comparisonWriters.includes(vote.right)
      && (vote.left === writer || vote.right === writer)
    ));
    const routeCosts = results.map(result => result.costUsd).sort((a, b) => a - b);
    let pairwiseMajorityWins = 0;
    let wantsNextMajorities = 0;
    for (const sample of corpus.samples) {
      const relevant = routeVotes.filter(vote => vote.sampleId === sample.id);
      const preferred = relevant.filter(vote => (
        vote.left === writer ? vote.preference === 'left' : vote.preference === 'right'
      )).length;
      const wants = relevant.filter(vote => vote.left === writer ? vote.wantsLeft : vote.wantsRight).length;
      if (relevant.length && preferred > relevant.length / 2) pairwiseMajorityWins += 1;
      if (relevant.length && wants > relevant.length / 2) wantsNextMajorities += 1;
    }
    return {
      writer,
      publishRate: results.filter(result => result.status === 'publish').length / corpus.samples.length,
      firstPassRate: results.filter(result => result.status === 'publish' && result.revisionCount === 0).length / corpus.samples.length,
      criticalViolations: results.filter(result => result.criticalViolation).length,
      writerFailures: results.filter(result => result.status === 'writer_failed').length,
      infraFailures: results.filter(result => result.status === 'infra_failed').length,
      corpusInvalidations: results.filter(result => result.status === 'corpus_invalid').length,
      pairwiseMajorityWins,
      wantsNextMajorities,
      medianCostUsd: routeCosts.length % 2
        ? routeCosts[Math.floor(routeCosts.length / 2)]
        : (routeCosts[routeCosts.length / 2 - 1] + routeCosts[routeCosts.length / 2]) / 2,
      maxCostUsd: Math.max(...routeCosts),
    };
  });
  const topTwoWriters = invalidBriefIds.length
    ? []
    : summaries
      .filter(summary => (
        summary.writer !== editorModel
        &&
        summary.criticalViolations === 0
        && summary.infraFailures === 0
        && summary.maxCostUsd <= 0.5
      ))
      .sort((a, b) => (
        b.publishRate - a.publishRate
        || b.pairwiseMajorityWins - a.pairwiseMajorityWins
        || b.wantsNextMajorities - a.wantsNextMajorities
        || a.medianCostUsd - b.medianCostUsd
      )).slice(0, 2).map(summary => summary.writer);
  const discoveryQualified = topTwoWriters.flatMap(writer => {
    const summary = summaries.find(candidate => candidate.writer === writer);
    return summary
      && summary.publishRate === 1
      && summary.firstPassRate >= 0.8
      && summary.criticalViolations === 0
      && summary.wantsNextMajorities >= Math.ceil(corpus.samples.length * 0.75)
      && summary.medianCostUsd <= 0.25
      && summary.maxCostUsd <= 0.5
      ? [summary]
      : [];
  });
  const campaignCostUsd = corpus.discoveryCostUsd
    + generations.reduce((sum, item) => sum + item.costUsd, 0)
    + votes.reduce((sum, item) => sum + item.costUsd, 0);
  const recommended = invalidBriefIds.length || campaignCostUsd > campaignBudgetUsd || discoveryQualified.length === 0
    ? null
    : discoveryQualified[0].writer;
  const final = {
    protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
    corpusDigest,
    testedAt: new Date().toISOString(),
    planner: corpus.planner,
    planJudge: corpus.planJudge,
    editor: editorModel,
    judges: judgeModels,
    writers: writerModels,
    invalidBriefIds,
    summaries,
    topTwoWriters,
    discoveryQualified: discoveryQualified.map(summary => summary.writer),
    campaignBudgetUsd,
    discoveryCostUsd: corpus.discoveryCostUsd,
    campaignCostUsd,
    recommended,
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
    const storageKey = `benchmarks/writer-bakeoff-v4/${corpusDigest}-${sha256}.json.gz`;
    const upload = await db.storage.from('factory-audit').upload(storageKey, archive, {
      contentType: 'application/gzip',
      upsert: false,
    });
    if (upload.error && !/already exists|duplicate/iu.test(upload.error.message)) throw upload.error;
    const passed = topTwoWriters.length === 2
      && discoveryQualified.length === 2
      && invalidBriefIds.length === 0
      && campaignCostUsd <= campaignBudgetUsd;
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: passed ? 'passed' : 'failed',
      engine_release: STORY_FACTORY_RELEASE,
      benchmark_protocol_version: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      artifact_digest: sha256,
      model_routes: {
        writers: writerModels,
        planner: corpus.planner,
        planJudge: corpus.planJudge,
        editor: editorModel,
        judges: judgeModels,
      },
      input_artifact: {
        corpusDigest,
        sourceDiscoveryDigest: corpus.sourceDiscoveryDigest,
        samplesExpected: corpus.samples.length,
        samplesCompleted: generations.length / writerModels.length,
        allPlansPassed: corpus.samples.every(sample => sample.planAssessment.status === 'pass'),
        allCausalPlansPassed: corpus.samples.every(sample =>
          sample.causalValidation.validatorVersion.length > 0
          && sample.causalValidation.digest.length === 64),
      },
      output_artifact: {
        storageKey, sha256, corpusDigest, invalidBriefIds, summaries, topTwoWriters,
        discoveryQualified: discoveryQualified.map(summary => summary.writer), recommended,
      },
      estimated_cost_usd: campaignCostUsd,
      first_pass: topTwoWriters.every(writer =>
        (summaries.find(summary => summary.writer === writer)?.firstPassRate ?? 0) >= 0.8),
      error_code: passed ? null : invalidBriefIds.length ? 'writer_bakeoff_corpus_invalid' : 'writer_route_bakeoff_rejected',
      error_message: passed
        ? null
        : invalidBriefIds.length
          ? 'Editor found plan/kernel defects in a supposedly plan-qualified Writer corpus.'
          : 'No Writer route survived the plan-qualified selection contract.',
      finished_at: new Date().toISOString(),
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    audit = { storageKey, sha256, runId: inserted.data.id };
  }
  console.log(JSON.stringify({
    corpusPath,
    outputPath,
    invalidBriefIds,
    summaries,
    topTwoWriters,
    discoveryQualified: discoveryQualified.map(summary => summary.writer),
    campaignBudgetUsd,
    campaignCostUsd,
    recommended,
    audit,
  }, null, 2));
  if (topTwoWriters.length !== 2 || invalidBriefIds.length || campaignCostUsd > campaignBudgetUsd) process.exitCode = 2;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

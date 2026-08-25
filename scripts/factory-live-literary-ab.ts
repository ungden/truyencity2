/**
 * Blind literary A/B over two sequential windows from the same production novel.
 *
 * This is deliberately reader-only: judges receive prose, each version's own
 * preceding tail and the public premise. They never receive engine revisions,
 * plans, state, Editor findings or cost telemetry. Labels are deterministically
 * swapped per comparison/model and decoded only after the response is stored.
 */
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  STORY_FACTORY_RELEASE,
  geminiProvider,
  type ProviderUsage,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const PROTOCOL = 'story-factory-live-literary-ab-v1';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const jobId = value('--job-id');
const baselineRange = value('--baseline');
const candidateRange = value('--candidate');
const resumeRunId = value('--resume-run');
const judgeModels = (value('--models') ?? 'gemini-2.5-pro,gemini-3.5-flash,gpt-5.6-luna')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);

if (!jobId || !baselineRange || !candidateRange) {
  throw new Error('Usage: tsx scripts/factory-live-literary-ab.ts --job-id <uuid> --baseline 29-32 --candidate 34-37 [--apply]');
}
if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) {
  throw new Error('--models must contain exactly three distinct model ids.');
}

function parseRange(raw: string): number[] {
  const match = /^(\d+)-(\d+)$/.exec(raw);
  if (!match) throw new Error(`Invalid range ${raw}; expected start-end.`);
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start || end - start + 1 < 2 || end - start + 1 > 10) {
    throw new Error('Each range must contain 2-10 ascending chapters.');
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const baselineNumbers = parseRange(baselineRange);
const candidateNumbers = parseRange(candidateRange);
if (baselineNumbers.length !== candidateNumbers.length) {
  throw new Error('Baseline and candidate windows must have equal chapter counts.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ScoreSchema = z.object({
  pull: z.number().int().min(1).max(10),
  characterVoice: z.number().int().min(1).max(10),
  specificity: z.number().int().min(1).max(10),
  rhythm: z.number().int().min(1).max(10),
  lowRepetition: z.number().int().min(1).max(10),
  overall: z.number().int().min(1).max(10),
}).strict();

const JudgmentSchema = z.object({
  preference: z.enum(['A', 'B', 'tie']),
  wantsNextA: z.boolean(),
  wantsNextB: z.boolean(),
  scoresA: ScoreSchema,
  scoresB: ScoreSchema,
  reason: z.string().trim().min(20).max(2_000),
}).strict();

type Scores = z.infer<typeof ScoreSchema>;
type StoredJudgment = {
  comparisonId: string;
  comparisonType: 'chapter' | 'window';
  model: string;
  blinded: true;
  candidateWas: 'A' | 'B';
  preference: 'candidate' | 'baseline' | 'tie';
  wantsCandidate: boolean;
  wantsBaseline: boolean;
  candidateScores: Scores;
  baselineScores: Scores;
  reason: string;
  usage: ProviderUsage;
};

type Chapter = { chapter_number: number; title: string; content: string };
type Comparison = {
  id: string;
  type: 'chapter' | 'window';
  candidate: unknown;
  baseline: unknown;
};

const cleanTitle = (title: string) => title.replace(/^\s*Chương\s+\d+\s*:\s*/iu, '').trim();
const tail = (content: string) => content.slice(-1_600);
const cost = (usages: ProviderUsage[]) => usages.reduce((sum, usage) => sum + usage.costUsd, 0);
const average = (values: number[]) => values.length
  ? Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(3))
  : 0;

async function main() {
  const jobResult = await db.from('story_factory_jobs')
    .select('id,novel_id')
    .eq('id', jobId!)
    .single();
  if (jobResult.error) throw jobResult.error;
  const novelResult = await db.from('novels')
    .select('title,description')
    .eq('id', jobResult.data.novel_id)
    .single();
  if (novelResult.error) throw novelResult.error;

  const requested = [...new Set([
    baselineNumbers[0] - 1,
    ...baselineNumbers,
    candidateNumbers[0] - 1,
    ...candidateNumbers,
  ])];
  const chapterResult = await db.from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', jobResult.data.novel_id)
    .in('chapter_number', requested)
    .order('chapter_number');
  if (chapterResult.error) throw chapterResult.error;
  const chapterMap = new Map((chapterResult.data as Chapter[]).map(chapter => [chapter.chapter_number, chapter]));
  for (const chapterNumber of requested) {
    if (!chapterMap.get(chapterNumber)?.content) throw new Error(`Missing chapter ${chapterNumber}.`);
  }

  const runResult = await db.from('story_factory_runs')
    .select('chapter_number,engine_revision,status')
    .eq('novel_id', jobResult.data.novel_id)
    .eq('kind', 'chapter')
    .eq('status', 'published')
    .in('chapter_number', [...baselineNumbers, ...candidateNumbers]);
  if (runResult.error) throw runResult.error;
  const revisions = new Map(runResult.data.map(run => [run.chapter_number as number, run.engine_revision as string]));
  const candidateRevisions = [...new Set(candidateNumbers.map(number => revisions.get(number)))];
  if (candidateRevisions.length !== 1 || !candidateRevisions[0]) {
    throw new Error('Candidate chapters must all belong to one exact engine revision.');
  }
  const baselineRevisions = [...new Set(baselineNumbers.map(number => revisions.get(number)).filter(Boolean))];

  const version = (numbers: number[]) => ({
    entryTail: tail(chapterMap.get(numbers[0] - 1)!.content),
    chapters: numbers.map((number, index) => {
      const chapter = chapterMap.get(number)!;
      return { position: index + 1, title: cleanTitle(chapter.title), prose: chapter.content };
    }),
  });
  const comparisons: Comparison[] = candidateNumbers.map((candidateNumber, index) => {
    const baselineNumber = baselineNumbers[index];
    const candidate = chapterMap.get(candidateNumber)!;
    const baseline = chapterMap.get(baselineNumber)!;
    return {
      id: `chapter-${index + 1}`,
      type: 'chapter',
      candidate: {
        previousTail: tail(chapterMap.get(candidateNumber - 1)!.content),
        title: cleanTitle(candidate.title),
        prose: candidate.content,
      },
      baseline: {
        previousTail: tail(chapterMap.get(baselineNumber - 1)!.content),
        title: cleanTitle(baseline.title),
        prose: baseline.content,
      },
    };
  });
  comparisons.push({
    id: 'sequential-window',
    type: 'window',
    candidate: version(candidateNumbers),
    baseline: version(baselineNumbers),
  });

  const inputArtifact = {
    protocol: PROTOCOL,
    jobId,
    novelId: jobResult.data.novel_id,
    baselineChapters: baselineNumbers,
    candidateChapters: candidateNumbers,
    baselineRevisions,
    candidateRevision: candidateRevisions[0],
    blindAssignment: 'sha256(comparison:model:protocol)',
  };
  console.log(JSON.stringify({
    dryRun: !apply,
    release: STORY_FACTORY_RELEASE,
    ...inputArtifact,
    judgeModels,
    comparisons: comparisons.length,
    judgmentsExpected: comparisons.length * judgeModels.length,
  }, null, 2));
  if (!apply) return;

  let benchmarkRunId = resumeRunId;
  let judgments: StoredJudgment[] = [];
  if (benchmarkRunId) {
    const existing = await db.from('story_factory_runs')
      .select('benchmark_protocol_version,input_artifact,output_artifact')
      .eq('id', benchmarkRunId)
      .single();
    if (existing.error) throw existing.error;
    if (existing.data.benchmark_protocol_version !== PROTOCOL
      || JSON.stringify(existing.data.input_artifact) !== JSON.stringify(inputArtifact)) {
      throw new Error('Resume run does not match this exact blinded comparison.');
    }
    judgments = Array.isArray(existing.data.output_artifact?.judgments)
      ? existing.data.output_artifact.judgments as StoredJudgment[]
      : [];
    const reopened = await db.from('story_factory_runs').update({
      status: 'running', error_code: null, error_message: null, finished_at: null,
    }).eq('id', benchmarkRunId);
    if (reopened.error) throw reopened.error;
  } else {
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: 'running',
      engine_release: STORY_FACTORY_RELEASE,
      engine_revision: candidateRevisions[0],
      benchmark_protocol_version: PROTOCOL,
      model_routes: { judgeModels },
      input_artifact: inputArtifact,
      output_artifact: { judgments: [] },
      usage: [],
      estimated_cost_usd: 0,
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    benchmarkRunId = inserted.data.id as string;
  }

  const persist = async () => {
    const usages = judgments.map(judgment => judgment.usage);
    const updated = await db.from('story_factory_runs').update({
      output_artifact: { judgments },
      usage: usages,
      estimated_cost_usd: cost(usages),
    }).eq('id', benchmarkRunId!);
    if (updated.error) throw updated.error;
  };

  try {
    for (const comparison of comparisons) {
      const missingModels = judgeModels.filter(model => !judgments.some(judgment => (
        judgment.comparisonId === comparison.id && judgment.model === model
      )));
      const settled = await Promise.allSettled(missingModels.map(async model => {
        const candidateIsA = parseInt(
          createHash('sha256').update(`${comparison.id}:${model}:${PROTOCOL}`).digest('hex').slice(0, 2),
          16,
        ) % 2 === 0;
        const response = await geminiProvider.json({
          model,
          system: `Bạn là độc giả biên tập blind của truyện dài tiếng Việt.
Chỉ đánh giá trải nghiệm đọc công khai: sức kéo đọc tiếp, giọng nhân vật, chi tiết cụ thể,
nhịp cảnh và mức độ không lặp. Không suy đoán model, không thưởng checklist kỹ thuật,
không đòi tuân thủ plan ẩn. Mỗi phiên bản có context trước của chính nó; phiên bản xảy ra
muộn hơn trong cốt truyện không mặc nhiên tốt hơn. lowRepetition càng cao nghĩa là càng ít lặp.
Cho điểm độc lập trước khi chọn preference; tie chỉ khi chất lượng thực sự ngang nhau.`,
          prompt: JSON.stringify({
            publicPremise: novelResult.data.description,
            comparisonType: comparison.type,
            versionA: candidateIsA ? comparison.candidate : comparison.baseline,
            versionB: candidateIsA ? comparison.baseline : comparison.candidate,
          }),
          schema: JudgmentSchema,
          temperature: 0.3,
          timeoutMs: 240_000,
          transportRetryLimit: 0,
          deferApplicationSchemaValidation: true,
          ...(model.startsWith('gemini-2.5-')
            ? { thinkingBudget: 2_048 }
            : model.startsWith('gemini-')
              ? { thinkingLevel: 'low' as const }
              : { reasoningEffort: 'low' as const, verbosity: 'low' as const }),
        });
        const parsed = JudgmentSchema.parse(response.value);
        const candidateLabel = candidateIsA ? 'A' : 'B';
        return {
          comparisonId: comparison.id,
          comparisonType: comparison.type,
          model,
          blinded: true as const,
          candidateWas: candidateLabel,
          preference: parsed.preference === 'tie'
            ? 'tie' as const
            : parsed.preference === candidateLabel ? 'candidate' as const : 'baseline' as const,
          wantsCandidate: candidateIsA ? parsed.wantsNextA : parsed.wantsNextB,
          wantsBaseline: candidateIsA ? parsed.wantsNextB : parsed.wantsNextA,
          candidateScores: candidateIsA ? parsed.scoresA : parsed.scoresB,
          baselineScores: candidateIsA ? parsed.scoresB : parsed.scoresA,
          reason: parsed.reason,
          usage: response.usage,
        } satisfies StoredJudgment;
      }));
      const failures: string[] = [];
      for (const result of settled) {
        if (result.status === 'fulfilled') judgments.push(result.value);
        else failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
      await persist();
      console.log(JSON.stringify({
        runId: benchmarkRunId,
        comparison: comparison.id,
        completed: judgments.length,
        expected: comparisons.length * judgeModels.length,
        failures,
      }));
      if (failures.length) throw new Error(`Judge failure: ${failures.join(' | ')}`);
    }

    const dimensions = Object.keys(ScoreSchema.shape) as Array<keyof Scores>;
    const candidateVotes = judgments.filter(judgment => judgment.preference === 'candidate').length;
    const baselineVotes = judgments.filter(judgment => judgment.preference === 'baseline').length;
    const ties = judgments.filter(judgment => judgment.preference === 'tie').length;
    const metrics = {
      judgments: judgments.length,
      candidateVotes,
      baselineVotes,
      ties,
      candidatePreferenceRate: Number((candidateVotes / judgments.length).toFixed(3)),
      candidateDecisiveWinRate: candidateVotes + baselineVotes
        ? Number((candidateVotes / (candidateVotes + baselineVotes)).toFixed(3))
        : 0,
      wantsNextCandidate: Number((judgments.filter(judgment => judgment.wantsCandidate).length / judgments.length).toFixed(3)),
      wantsNextBaseline: Number((judgments.filter(judgment => judgment.wantsBaseline).length / judgments.length).toFixed(3)),
      scores: Object.fromEntries(dimensions.map(dimension => {
        const candidateScore = average(judgments.map(judgment => judgment.candidateScores[dimension]));
        const baselineScore = average(judgments.map(judgment => judgment.baselineScores[dimension]));
        return [dimension, {
          candidate: candidateScore,
          baseline: baselineScore,
          delta: Number((candidateScore - baselineScore).toFixed(3)),
        }];
      })),
      byModel: Object.fromEntries(judgeModels.map(model => {
        const rows = judgments.filter(judgment => judgment.model === model);
        return [model, {
          candidateVotes: rows.filter(row => row.preference === 'candidate').length,
          baselineVotes: rows.filter(row => row.preference === 'baseline').length,
          ties: rows.filter(row => row.preference === 'tie').length,
        }];
      })),
      windowVotes: judgments
        .filter(judgment => judgment.comparisonType === 'window')
        .map(judgment => ({ model: judgment.model, preference: judgment.preference })),
      estimatedCostUsd: Number(cost(judgments.map(judgment => judgment.usage)).toFixed(6)),
    };
    const finishedAt = new Date().toISOString();
    const completed = await db.from('story_factory_runs').update({
      status: 'passed',
      output_artifact: { protocol: PROTOCOL, metrics, judgments },
      usage: judgments.map(judgment => judgment.usage),
      estimated_cost_usd: metrics.estimatedCostUsd,
      finished_at: finishedAt,
    }).eq('id', benchmarkRunId).eq('status', 'running');
    if (completed.error) throw completed.error;
    console.log(JSON.stringify({ runId: benchmarkRunId, metrics }, null, 2));
  } catch (error) {
    const failed = await db.from('story_factory_runs').update({
      status: 'failed',
      error_code: 'literary_ab_failed',
      error_message: error instanceof Error ? error.message : String(error),
      output_artifact: { judgments },
      usage: judgments.map(judgment => judgment.usage),
      estimated_cost_usd: cost(judgments.map(judgment => judgment.usage)),
      finished_at: new Date().toISOString(),
    }).eq('id', benchmarkRunId);
    if (failed.error) console.warn('[literary-ab] failed to close run:', failed.error.message);
    throw error;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exit(1);
});

/** Offline evidence from saved bundles; never loads credentials or calls a model. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Bundle {
  book: string;
  generatedAt: string;
  rewrites: Array<{
    chapterNumber: number; newContent: string; attempts: number; accepted: boolean;
    costUsd: number; usage?: unknown[]; decision?: string;
    review?: { issues?: Array<{ severity: string }> };
  }>;
  sequenceReviewUsage?: { costUsd: number };
}

const directory = process.argv.find(arg => arg.startsWith('--dir='))?.slice(6) ?? '/tmp';
const files = readdirSync(directory).filter(file => /^truyencity-.*-rewrite(?:-v\d+)?\.json$/.test(file));
const bundles = files.map(file => ({ file, data: JSON.parse(readFileSync(join(directory, file), 'utf8')) as Bundle }))
  .sort((a, b) => a.data.generatedAt.localeCompare(b.data.generatedAt));
const seen = new Set<string>();
let attempts = 0, calls = 0, costUsd = 0, accepted = 0, automaticSecondAttempts = 0;
const perChapter: Record<string, number> = {};
for (const { data } of bundles) for (const chapter of data.rewrites) {
  const hash = createHash('sha256').update(`${data.book}:${chapter.chapterNumber}:${chapter.newContent}`).digest('hex');
  if (seen.has(hash)) continue;
  seen.add(hash);
  attempts += chapter.attempts;
  calls += chapter.usage?.length ?? 0;
  costUsd += chapter.costUsd;
  accepted += Number(chapter.accepted);
  automaticSecondAttempts += Number(chapter.attempts > 1);
  const key = `${data.book}:${chapter.chapterNumber}`;
  perChapter[key] = (perChapter[key] ?? 0) + 1;
}
console.log(JSON.stringify({
  sourceFiles: bundles.map(bundle => bundle.file),
  uniqueCandidateTexts: seen.size, recordedWriterAttempts: attempts, recordedChapterModelCalls: calls,
  acceptedCandidates: accepted, candidatesWithSecondAttempt: automaticSecondAttempts,
  recordedChapterCostUsd: Number(costUsd.toFixed(6)),
  sequenceAudits: bundles.filter(bundle => bundle.data.sequenceReviewUsage).length,
  recordedSequenceCostUsd: Number(bundles.reduce((sum, bundle) => sum + (bundle.data.sequenceReviewUsage?.costUsd ?? 0), 0).toFixed(6)),
  perChapter,
  measurement: 'Deduplicated by book/chapter/content; carryovers excluded. Saved artifacts only, not a provider billing total. Missing attempts and identical-output retries cannot be recovered.',
}, null, 2));

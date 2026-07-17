#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { OfflineOpeningRunV3 } from '../src/services/story-engine/flagship-v3';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};

const root = path.resolve(value('--canaries') || 'blueprints/flagship-v3/canaries');
const baselineName = value('--baseline') || 'offline-opening';
const candidateName = value('--candidate') || 'offline-opening-writer31-v33';
const output = path.resolve(value('--output') || 'blueprints/flagship-v3/calibration/opening-bakeoff-v3');
const slots = (value('--slots') || 'dt-01,hx-01,hx-04,th-01,dt-11').split(',').map(item => item.trim()).filter(Boolean);

type Loaded = { slot: string; run: OfflineOpeningRunV3 };

function load(slot: string, directory: string): Loaded {
  const file = path.join(root, slot, directory, 'opening-run-v3.json');
  const run = JSON.parse(readFileSync(file, 'utf8')) as OfflineOpeningRunV3;
  if (run.schemaVersion !== 3 || !Array.isArray(run.chapters)) throw new Error(`${file} is not an OfflineOpeningRunV3 artifact.`);
  return { slot, run };
}

function summarize(loaded: Loaded[]) {
  const chapters = loaded.flatMap(item => item.run.chapters);
  const published = chapters.filter(chapter => chapter.status === 'publish');
  const costs = chapters.map(chapter => chapter.estimatedCostUsd).sort((left, right) => left - right);
  const middle = Math.floor(costs.length / 2);
  const medianCostUsd = costs.length === 0
    ? 0
    : costs.length % 2
      ? costs[middle]
      : (costs[middle - 1] + costs[middle]) / 2;
  const totalCostUsd = Number(loaded.reduce((sum, item) => sum + item.run.estimatedCostUsd, 0).toFixed(6));
  return {
    routeVersions: [...new Set(loaded.map(item => item.run.routeVersion))],
    stories: loaded.length,
    attemptedChapters: chapters.length,
    publishedChapters: published.length,
    publishRate: Number((chapters.length ? published.length / chapters.length : 0).toFixed(4)),
    fullThreeChapterOpenings: loaded.filter(item => item.run.completedChapters === 3 && item.run.stoppedAtChapter === null).length,
    totalCostUsd,
    medianAttemptCostUsd: Number(medianCostUsd.toFixed(6)),
    maximumAttemptCostUsd: Number((costs.at(-1) || 0).toFixed(6)),
    costPerAttemptedChapterUsd: Number((chapters.length ? totalCostUsd / chapters.length : 0).toFixed(6)),
    costPerPublishedChapterUsd: Number((published.length ? totalCostUsd / published.length : 0).toFixed(6)),
  };
}

const baseline = slots.map(slot => load(slot, baselineName));
const candidate = slots.map(slot => load(slot, candidateName));
const pairs = [] as Array<{
  id: string;
  slot: string;
  chapterNumber: number;
  title: string;
  optionA: string;
  optionB: string;
  aRoute: 'baseline' | 'candidate';
  bRoute: 'baseline' | 'candidate';
  machineMetrics: { firstPassPublished: boolean; publishedWithinRevision: boolean; publishedCostUsd: number };
}>;

for (const baselineStory of baseline) {
  const candidateStory = candidate.find(item => item.slot === baselineStory.slot)!;
  for (const baselineChapter of baselineStory.run.chapters) {
    const candidateChapter = candidateStory.run.chapters.find(item => item.chapterNumber === baselineChapter.chapterNumber);
    if (!baselineChapter.content || !candidateChapter?.content) continue;
    const id = `${baselineStory.slot}-ch${baselineChapter.chapterNumber}`;
    const candidateFirst = Number.parseInt(createHash('sha256').update(id).digest('hex').slice(0, 2), 16) % 2 === 0;
    pairs.push({
      id,
      slot: baselineStory.slot,
      chapterNumber: baselineChapter.chapterNumber,
      title: baselineStory.run.title,
      optionA: candidateFirst ? candidateChapter.content : baselineChapter.content,
      optionB: candidateFirst ? baselineChapter.content : candidateChapter.content,
      aRoute: candidateFirst ? 'candidate' : 'baseline',
      bRoute: candidateFirst ? 'baseline' : 'candidate',
      machineMetrics: {
        firstPassPublished: candidateChapter.status === 'publish' && candidateChapter.callRoles.length === 2,
        publishedWithinRevision: candidateChapter.status === 'publish',
        publishedCostUsd: candidateChapter.estimatedCostUsd,
      },
    });
  }
}

mkdirSync(output, { recursive: true });
const report = {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  warning: 'Machine gate evidence only. Route selection requires human blind ballots; this report cannot approve production.',
  baseline: summarize(baseline),
  candidate: summarize(candidate),
  blindPairCount: pairs.length,
};
writeFileSync(path.join(output, 'machine-report.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(output, 'answer-key.json'), `${JSON.stringify({
  schemaVersion: 3,
  baselineDirectory: baselineName,
  candidateDirectory: candidateName,
  pairs: pairs.map(pair => ({ id: pair.id, optionA: pair.aRoute, optionB: pair.bRoute })),
}, null, 2)}\n`);
writeFileSync(path.join(output, 'blind-samples.json'), `${JSON.stringify({
  schemaVersion: 3,
  samples: pairs.map(pair => ({
    sampleKey: pair.id,
    title: pair.title,
    chapterNumber: pair.chapterNumber,
    optionA: pair.optionA,
    optionB: pair.optionB,
    machineMetrics: pair.machineMetrics,
  })),
}, null, 2)}\n`);
const packet = pairs.map((pair, index) => `## Mẫu ${index + 1}: ${pair.title} — chương ${pair.chapterNumber}

Chọn A, B hoặc hòa. Ghi riêng: có muốn đọc tiếp không; có lỗi logic/continuity nghiêm trọng không.

### Bản A

${pair.optionA}

### Bản B

${pair.optionB}`).join('\n\n---\n\n');
writeFileSync(path.join(output, 'blind-review.md'), `# Flagship v3 opening route bake-off

Không mở answer-key.json trước khi chấm xong. Không có tên model, route hay điểm Editor trong tài liệu này.

${packet}
`);
console.log(JSON.stringify({ output, ...report }, null, 2));

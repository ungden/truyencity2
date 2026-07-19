#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  FlagshipLaunchPackV3Schema,
  SequentialSurvivalCorpusV3Schema,
  digestFlagshipV3,
  getFlagshipReleaseManifestV3,
  type OfflineOpeningRunV3,
} from '../src/services/story-engine/flagship-v3';

const EntrySchema = z.object({
  slot: z.string().trim().min(2),
  projectId: z.string().uuid(),
  launchPack: z.string().trim().min(1),
  candidateRunDir: z.string().trim().min(1),
}).strict();
const ManifestSchema = z.object({
  corpusVersion: z.string().trim().min(3),
  entries: z.array(EntrySchema).length(5),
}).strict();

const arg = (name: string): string | null => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || null : null;
};
const manifestPath = arg('manifest');
const outputPath = arg('output');
if (!manifestPath || !outputPath) throw new Error('--manifest and --output are required.');

type RecordedRun = OfflineOpeningRunV3 & { engineReleaseId?: string };
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.resolve(file), 'utf8')) as T;

function schemaSucceeded(status: string, error: string | null): boolean {
  if (status !== 'infra_blocked') return true;
  return !/(?:schema|structured output|invalid json|parse json|zod)/iu.test(error || '');
}

const manifest = ManifestSchema.parse(readJson(path.resolve(manifestPath)));
const release = getFlagshipReleaseManifestV3();
const samples = [];
const launchPackDigests: string[] = [];
let routeVersion: string | null = null;

for (const entry of manifest.entries) {
  const pack = FlagshipLaunchPackV3Schema.parse(readJson(path.resolve(entry.launchPack)));
  const run = readJson<RecordedRun>(path.join(path.resolve(entry.candidateRunDir), 'opening-run-v3.json'));
  const sourceRunDigest = digestFlagshipV3(run);
  if (run.engineReleaseId !== release.releaseId) throw new Error(`${entry.slot} sequential run is stale for ${release.releaseId}.`);
  routeVersion ||= run.routeVersion;
  if (routeVersion !== run.routeVersion) throw new Error('Sequential survival requires one exact route version.');
  launchPackDigests.push(digestFlagshipV3(pack));
  for (let chapterNumber = 1; chapterNumber <= 10; chapterNumber += 1) {
    const chapter = run.chapters.find(item => item.chapterNumber === chapterNumber);
    const attempted = Boolean(chapter);
    const terminalStatus = chapter?.status || 'not_attempted';
    samples.push({
      sampleId: `${entry.slot}-ch${chapterNumber}`,
      projectId: entry.projectId,
      chapterNumber,
      attempted,
      terminalStatus,
      schemaSuccess: attempted ? schemaSucceeded(terminalStatus, chapter?.error || null) : false,
      planSuccess: attempted ? terminalStatus !== 'plan_blocked' : false,
      infraSuccess: attempted ? terminalStatus !== 'infra_blocked' : false,
      firstPassPublished: terminalStatus === 'publish' && chapter?.callRoles.length === 2,
      publishedWithinRepair: terminalStatus === 'publish',
      publishedCostUsd: terminalStatus === 'publish' ? Number(chapter?.estimatedCostUsd || 0) : 0,
      sourceRunDigest,
    });
  }
}

const corpus = SequentialSurvivalCorpusV3Schema.parse({
  schemaVersion: 3,
  corpusVersion: manifest.corpusVersion,
  routeVersion,
  engineReleaseId: release.releaseId,
  launchPackDigests,
  samples,
});
writeFileSync(path.resolve(outputPath), `${JSON.stringify(corpus, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.resolve(outputPath),
  samples: corpus.samples.length,
  attempted: corpus.samples.filter(sample => sample.attempted).length,
  published: corpus.samples.filter(sample => sample.terminalStatus === 'publish').length,
  engineReleaseId: corpus.engineReleaseId,
}, null, 2));

#!/usr/bin/env tsx

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  BlindCalibrationCorpusV3Schema,
  computeCalibrationMetricsV3,
} from '../src/services/story-engine/flagship-v3/calibration';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const corpusPath = value('--corpus');
const apply = args.includes('--apply');
if (!corpusPath) throw new Error('--corpus is required.');
const corpus = BlindCalibrationCorpusV3Schema.parse(JSON.parse(readFileSync(path.resolve(corpusPath), 'utf8')));
const metrics = computeCalibrationMetricsV3(corpus);
console.log(JSON.stringify({ dryRun: !apply, ...metrics }, null, 2));
async function main(): Promise<void> {
  if (!apply) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is missing.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from('story_factory_calibrations').upsert({
    pipeline_version: 'flagship_v3',
    prompt_version: corpus.promptVersion,
    route_version: corpus.routeVersion,
    sample_size: metrics.sampleSize,
    blind_preference_rate: metrics.blindPreferenceRate,
    first_pass_publish_rate: metrics.firstPassPublishRate,
    within_revision_publish_rate: metrics.withinRevisionPublishRate,
    critical_continuity_violations: metrics.criticalContinuityViolations,
    read_chapter_4_rate: metrics.readChapter4Rate,
    median_cost_usd: metrics.medianCostUsd,
    status: metrics.approved ? 'approved' : 'rejected',
    approved_by: corpus.approvedBy,
    evidence: corpus.evidence,
  }, { onConflict: 'prompt_version,route_version' }).select('*').single();
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

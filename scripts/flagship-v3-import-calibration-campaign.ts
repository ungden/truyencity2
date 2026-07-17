#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { digestFlagshipV3, getFlagshipReleaseManifestV3 } from '../src/services/story-engine/flagship-v3';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const args = process.argv.slice(2);
const value = (name: string): string | null => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] || null : null; };
const samplesPath = value('--samples');
const answerKeyPath = value('--answer-key');
const launchPackPaths = (value('--launch-packs') || value('--launch-pack') || '').split(',').map(item => item.trim()).filter(Boolean);
const routeVersion = value('--route-version');
const name = value('--name') || `Flagship v3 ${new Date().toISOString().slice(0, 10)}`;
const apply = args.includes('--apply');
if (!samplesPath || !answerKeyPath || !launchPackPaths.length || !routeVersion) throw new Error('--samples, --answer-key, --launch-packs and --route-version are required.');

const samplesSchema = z.object({ schemaVersion: z.literal(3), samples: z.array(z.object({
  sampleKey: z.string().min(3), title: z.string().min(3), chapterNumber: z.number().int().positive(),
  optionA: z.string().min(1000), optionB: z.string().min(1000),
  machineMetrics: z.object({ firstPassPublished: z.boolean(), publishedWithinRevision: z.boolean(), publishedCostUsd: z.number().min(0) }).strict(),
}).strict()).min(50) }).strict();
const answerSchema = z.object({ schemaVersion: z.literal(3), pairs: z.array(z.object({
  id: z.string(), optionA: z.enum(['baseline','candidate']), optionB: z.enum(['baseline','candidate']),
}).strict()).min(50) }).passthrough();

async function main(): Promise<void> {
  const samples = samplesSchema.parse(JSON.parse(readFileSync(path.resolve(samplesPath!), 'utf8')));
  const answers = answerSchema.parse(JSON.parse(readFileSync(path.resolve(answerKeyPath!), 'utf8')));
  const launchPacks = launchPackPaths.map(file => JSON.parse(readFileSync(path.resolve(file), 'utf8')) as unknown);
  const release = getFlagshipReleaseManifestV3();
  const answerKey = Object.fromEntries(answers.pairs.map(pair => [pair.id, {
    a: pair.optionA === 'candidate' ? 'v3' : 'baseline',
    b: pair.optionB === 'candidate' ? 'v3' : 'baseline',
  }]));
  const missing = samples.samples.filter(sample => !answerKey[sample.sampleKey]);
  if (missing.length) throw new Error(`Answer key is missing ${missing.length} samples.`);
  const launchPackDigests = launchPacks.map(digestFlagshipV3).sort();
  const launchPackDigest = digestFlagshipV3(launchPackDigests);
  console.log(JSON.stringify({ dryRun: !apply, name, sampleCount: samples.samples.length, engineReleaseId: release.releaseId, routeVersion, launchPackDigest, launchPackDigests }, null, 2));
  if (!apply) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is missing.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: campaign, error: campaignError } = await db.from('story_calibration_campaigns_v3').insert({
    name, engine_release_id: release.releaseId, route_version: routeVersion,
    launch_pack_digest: launchPackDigest, launch_pack_digests: launchPackDigests, status: 'open', answer_key: answerKey,
  }).select('id').single();
  if (campaignError || !campaign) throw campaignError || new Error('Campaign creation failed.');
  const { error: sampleError } = await db.from('story_calibration_samples_v3').insert(samples.samples.map(sample => ({
    campaign_id: campaign.id, sample_key: sample.sampleKey, title: sample.title,
    chapter_number: sample.chapterNumber, option_a: sample.optionA, option_b: sample.optionB,
    machine_metrics: sample.machineMetrics,
  })));
  if (sampleError) throw sampleError;
  console.log(JSON.stringify({ created: true, campaignId: campaign.id }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

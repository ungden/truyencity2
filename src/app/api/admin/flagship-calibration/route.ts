import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@/integrations/supabase/server';

export const dynamic = 'force-dynamic';

const ballotSchema = z.object({
  action: z.literal('ballot'),
  sampleId: z.string().uuid(),
  preferred: z.enum(['a', 'b', 'tie']),
  wantsNext: z.boolean(),
  criticalContinuityViolation: z.boolean(),
  note: z.string().trim().max(2000).default(''),
}).strict();

const finalizeSchema = z.object({ action: z.literal('finalize'), campaignId: z.string().uuid() }).strict();

async function browserAdminId(): Promise<string | null> {
  const client = await createServerClient();
  const { data } = await client.auth.getUser();
  return data.user?.id || null;
}

export async function GET(request: NextRequest) {
  if (!await isAuthorizedAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reviewerId = await browserAdminId();
  if (!reviewerId) return NextResponse.json({ error: 'Browser admin session required for blind ballots.' }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await db.from('story_calibration_campaigns_v3')
    .select('id,name,engine_release_id,route_version,launch_pack_digest,status,created_at')
    .eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ campaign: null, sample: null, progress: { completed: 0, total: 0 } });
  const [{ data: ballots, error: ballotError }, { count: total, error: countError }] = await Promise.all([
    db.from('story_calibration_ballots_v3').select('sample_id').eq('campaign_id', campaign.id).eq('reviewer_id', reviewerId),
    db.from('story_calibration_samples_v3').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
  ]);
  if (ballotError || countError) return NextResponse.json({ error: (ballotError || countError)?.message }, { status: 500 });
  const completedIds = (ballots || []).map(item => item.sample_id);
  let query = db.from('story_calibration_samples_v3')
    .select('id,title,chapter_number,option_a,option_b')
    .eq('campaign_id', campaign.id).order('created_at', { ascending: true }).limit(1);
  if (completedIds.length) query = query.not('id', 'in', `(${completedIds.join(',')})`);
  const { data: samples, error: sampleError } = await query;
  if (sampleError) return NextResponse.json({ error: sampleError.message }, { status: 500 });
  // Deliberately omit sample_key, machine metrics and the campaign answer key.
  return NextResponse.json({
    campaign,
    sample: samples?.[0] ? {
      id: samples[0].id,
      title: samples[0].title,
      chapterNumber: samples[0].chapter_number,
      optionA: samples[0].option_a,
      optionB: samples[0].option_b,
    } : null,
    progress: { completed: completedIds.length, total: total || 0 },
  });
}

export async function POST(request: NextRequest) {
  if (!await isAuthorizedAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reviewerId = await browserAdminId();
  if (!reviewerId) return NextResponse.json({ error: 'Browser admin session required.' }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const ballot = ballotSchema.safeParse(body);
  const finalize = finalizeSchema.safeParse(body);
  if (!ballot.success && !finalize.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (ballot.success) {
    const { data: sample, error: sampleError } = await db.from('story_calibration_samples_v3')
      .select('id,campaign_id,story_calibration_campaigns_v3!inner(status)')
      .eq('id', ballot.data.sampleId).single();
    const relation = sample?.story_calibration_campaigns_v3 as unknown as { status?: string } | Array<{ status?: string }> | null;
    const status = Array.isArray(relation) ? relation[0]?.status : relation?.status;
    if (sampleError || !sample || status !== 'open') return NextResponse.json({ error: 'Sample is not open.' }, { status: 409 });
    const { error } = await db.from('story_calibration_ballots_v3').upsert({
      campaign_id: sample.campaign_id,
      sample_id: sample.id,
      reviewer_id: reviewerId,
      preferred: ballot.data.preferred,
      wants_next: ballot.data.wantsNext,
      critical_continuity_violation: ballot.data.criticalContinuityViolation,
      note: ballot.data.note,
    }, { onConflict: 'sample_id,reviewer_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ saved: true });
  }

  if (!finalize.success) return NextResponse.json({ error: 'Invalid finalize request.' }, { status: 400 });
  const campaignId = finalize.data.campaignId;
  const [{ data: campaign, error: campaignError }, { data: samples, error: sampleError }, { data: ballots, error: ballotsError }] = await Promise.all([
    db.from('story_calibration_campaigns_v3').select('*').eq('id', campaignId).single(),
    db.from('story_calibration_samples_v3').select('id,sample_key,machine_metrics').eq('campaign_id', campaignId),
    db.from('story_calibration_ballots_v3').select('sample_id,reviewer_id,preferred,wants_next,critical_continuity_violation').eq('campaign_id', campaignId),
  ]);
  if (campaignError || sampleError || ballotsError || !campaign) return NextResponse.json({ error: (campaignError || sampleError || ballotsError)?.message || 'Campaign missing.' }, { status: 500 });
  const answerKey = (campaign.answer_key || {}) as Record<string, { a: 'v3' | 'baseline'; b: 'v3' | 'baseline' }>;
  const sampleById = new Map((samples || []).map(sample => [sample.id, sample]));
  const distinctSamples = new Set((ballots || []).map(item => item.sample_id)).size;
  const distinctReviewers = new Set((ballots || []).map(item => item.reviewer_id)).size;
  if ((samples || []).length < 50 || distinctSamples < 50 || distinctReviewers < 5) {
    return NextResponse.json({ error: 'Calibration requires at least 50 distinct samples and 5 reviewers.' }, { status: 409 });
  }
  let preferred = 0; let decided = 0; let wants = 0; let critical = 0;
  for (const item of ballots || []) {
    const sample = sampleById.get(item.sample_id);
    const key = sample ? answerKey[sample.sample_key] : null;
    if (item.preferred !== 'tie') {
      decided += 1;
      if (key?.[item.preferred as 'a' | 'b'] === 'v3') preferred += 1;
    }
    if (item.wants_next) wants += 1;
    if (item.critical_continuity_violation) critical += 1;
  }
  const machine = (samples || []).map(item => item.machine_metrics as {
    firstPassPublished?: boolean; publishedWithinRevision?: boolean; publishedCostUsd?: number;
  });
  const costs = machine.map(item => Number(item.publishedCostUsd || 0)).sort((a, b) => a - b);
  const middle = Math.floor(costs.length / 2);
  const median = costs.length % 2 ? costs[middle] : (costs[middle - 1] + costs[middle]) / 2;
  const rate = (count: number, total: number) => total ? count / total : 0;
  const metrics = {
    sample_size: distinctSamples,
    blind_preference_rate: rate(preferred, decided),
    first_pass_publish_rate: rate(machine.filter(item => item.firstPassPublished).length, machine.length),
    within_revision_publish_rate: rate(machine.filter(item => item.publishedWithinRevision).length, machine.length),
    critical_continuity_violations: critical,
    read_chapter_4_rate: rate(wants, (ballots || []).length),
    median_cost_usd: median,
    distinct_reviewers: distinctReviewers,
  };
  const approved = metrics.blind_preference_rate >= 0.65 && metrics.first_pass_publish_rate >= 0.65
    && metrics.within_revision_publish_rate >= 0.8 && metrics.critical_continuity_violations === 0
    && metrics.read_chapter_4_rate >= 0.7 && metrics.median_cost_usd <= 0.25;
  const { error: calibrationError } = await db.from('story_factory_calibrations').upsert({
    pipeline_version: 'flagship_v3', prompt_version: campaign.engine_release_id,
    route_version: campaign.route_version, engine_release_id: campaign.engine_release_id,
    launch_pack_digest: campaign.launch_pack_digest, ...metrics,
    launch_pack_digests: campaign.launch_pack_digests,
    status: approved ? 'approved' : 'rejected', approved_by: reviewerId,
    evidence: [{ campaignId, ballotCount: (ballots || []).length }],
  }, { onConflict: 'engine_release_id,route_version,launch_pack_digest' });
  if (calibrationError) return NextResponse.json({ error: calibrationError.message }, { status: 500 });
  await db.from('story_calibration_campaigns_v3').update({ status: approved ? 'approved' : 'rejected', closed_at: new Date().toISOString() }).eq('id', campaignId);
  return NextResponse.json({ finalized: true, approved, metrics });
}

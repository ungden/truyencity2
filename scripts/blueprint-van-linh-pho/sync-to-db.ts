// Sync Vạn Linh Phổ blueprint into arc_plans table.
// Reads ARC_SKELETON + per-arc detail files, upserts arc_plans rows
// with sceneDirection (BAN list + TONE) embedded.

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { VAN_LINH_PHO_ARC_SKELETON, UNIVERSAL_BANNED_PATTERNS, type ChapterBrief, type ArcSkeleton } from './arc-skeleton';
import { ARC1_BRIEFS_CH6_50 } from './arc-1-detail';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const PROJECT_ID = '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c';

function buildSceneDirection(brief: ChapterBrief): string {
  const lines: string[] = [];
  if (brief.risks?.length) lines.push(...brief.risks);
  lines.push('UNIVERSAL BANS:', ...UNIVERSAL_BANNED_PATTERNS.map((b) => `- ${b}`));
  return lines.join('\n');
}

function transformBrief(brief: ChapterBrief): Record<string, unknown> {
  return {
    chapterNumber: brief.n,
    sub_arc_number: undefined, // computed from skeleton sub-arc range
    brief: brief.brief,
    sceneDirection: buildSceneDirection(brief),
    scenes: brief.scenes,
    mcBenefit: brief.mcBenefit,
    beat: brief.beat,
  };
}

function findSubArcNumber(arc: ArcSkeleton, chapterN: number): number {
  const sub = arc.subArcs.find((s) => chapterN >= s.range[0] && chapterN <= s.range[1]);
  return sub?.number ?? 0;
}

async function syncArc(arc: ArcSkeleton, briefs: ChapterBrief[]): Promise<void> {
  const transformed = briefs.map((b) => ({
    ...transformBrief(b),
    sub_arc_number: findSubArcNumber(arc, b.n),
  }));
  const subArcs = arc.subArcs.map((s) => ({
    sub_arc_number: s.number,
    chapter_range: `${s.range[0]}-${s.range[1]}`,
    theme: s.theme,
    payoff: s.payoff,
    start_chapter: s.range[0],
    end_chapter: s.range[1],
  }));

  // Plan text: arc theme + sub-arc breakdown + universal bans
  const planText = [
    `ARC ${arc.arcNumber} (ch.${arc.range[0]}-${arc.range[1]}): ${arc.theme}`,
    `Core payoff: ${arc.corePayoff}`,
    '',
    'Sub-arcs:',
    ...arc.subArcs.map((s) => `  Sub-arc ${s.number} (ch.${s.range[0]}-${s.range[1]}): ${s.theme} — payoff: ${s.payoff}`),
    '',
    '*** UNIVERSAL BANS (apply EVERY chapter) ***',
    ...UNIVERSAL_BANNED_PATTERNS.map((b) => `- ${b}`),
    '',
    '*** TONE: MC Cố Diệp lạnh đạm + tự tin + tính toán. Public face thiếu niên 16 tuổi may mắn. KHÔNG paranoid. KHÔNG tự khoe. ***',
  ].join('\n');

  const row = {
    project_id: PROJECT_ID,
    arc_number: arc.arcNumber,
    start_chapter: arc.range[0],
    end_chapter: arc.range[1],
    arc_theme: arc.theme,
    plan_text: planText,
    sub_arcs: subArcs,
    chapter_briefs: transformed,
    threads_to_advance: [],
    threads_to_resolve: [],
    new_threads: [],
  };

  const { error } = await db.from('arc_plans').upsert(row, { onConflict: 'project_id,arc_number' });
  if (error) {
    console.error(`Arc ${arc.arcNumber} upsert failed:`, error.message);
    process.exit(1);
  }
  console.log(`Arc ${arc.arcNumber} synced: ${transformed.length} chapter briefs (ch.${arc.range[0]}-${arc.range[1]})`);
}

async function main() {
  // ── Arc 1: existing ch.1-5 + new ch.6-50 ──
  // Load existing briefs ch.1-5 from DB to preserve
  const { data: existing } = await db.from('arc_plans').select('chapter_briefs').eq('project_id', PROJECT_ID).eq('arc_number', 1).maybeSingle();
  const existingCh1to5 = (existing?.chapter_briefs as ChapterBrief[] || [])
    .filter((b) => b.n <= 5);
  console.log(`Preserving ${existingCh1to5.length} existing briefs ch.1-5`);

  const arc1Briefs: ChapterBrief[] = [
    ...existingCh1to5,
    ...ARC1_BRIEFS_CH6_50,
  ].sort((a, b) => a.n - b.n);

  await syncArc(VAN_LINH_PHO_ARC_SKELETON[0], arc1Briefs);

  console.log('\n✓ Arc 1 synced. Arc 2-7 skeleton placeholder pending.');
  console.log('To trigger ch.6 manual:');
  console.log('  PROJECT_ID=2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c npx tsx scripts/write-chapter-flash.ts');
}

main().catch((e) => { console.error(e); process.exit(1); });

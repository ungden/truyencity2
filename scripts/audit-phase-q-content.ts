/**
 * Phase R audit (2026-05-14) — scan all production novels for the 6 repetition
 * failure modes identified in /Users/alexle/.claude/plans/audit-k-n-i-dung-gentle-rabin.md:
 *
 *   1. Word-count runaway (>1.6× target)
 *   2. MC-name absolute rate (>12/1K words = moderate, >16 = critical)
 *   3. Eye-template overuse (đôi mắt + ánh mắt combined ≥12 mod / ≥18 crit)
 *   4. Inspirational cluster (≥10 total or ≥4 in tail = moderate)
 *   5. Tail-monologue density (last 20% ≥2× body density)
 *   6. AI-tell hot list (rực rỡ, kinh hoàng, sững sờ, ...)
 *
 * Usage:
 *   npx tsx scripts/audit-phase-q-content.ts             # all production novels
 *   npx tsx scripts/audit-phase-q-content.ts <novel_id>  # single novel
 *   npx tsx scripts/audit-phase-q-content.ts --top 20    # top 20 worst chapters
 *
 * Output: prints per-chapter outlier rows + summary aggregates.
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  detectMcNameRate,
  detectEyeTemplateOveruse,
  detectInspirationalCluster,
  detectMonologueTail,
  detectSevereRepetition,
  countWords,
} from '../src/services/story-engine/pipeline/chapter-writer-helpers';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface ChapterAudit {
  novelId: string;
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  words: number;
  targetWords: number;
  wordRatio: number;
  mcRate: number;
  mcCount: number;
  eyeCount: number;
  inspirationalTotal: number;
  inspirationalTail: number;
  tailRatio: number; // tailDensity / bodyDensity
  severityFlags: string[];
}

async function main() {
  const args = process.argv.slice(2);
  let topN = 0;
  let singleNovelId: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--top') topN = parseInt(args[++i], 10) || 20;
    else if (args[i].match(/^[0-9a-f]{8}-/)) singleNovelId = args[i];
  }

  // 1. Find target novels.
  let novelsQuery = s
    .from('novels')
    .select('id,title,slug')
    .order('created_at', { ascending: false });
  if (singleNovelId) {
    novelsQuery = novelsQuery.eq('id', singleNovelId);
  } else {
    // Cross-reference with ai_story_projects where production_enabled=true
    const { data: projects } = await s
      .from('ai_story_projects')
      .select('novel_id,target_chapter_length,style_directives')
      .filter('style_directives->>production_enabled', 'eq', 'true');
    if (!projects || projects.length === 0) {
      console.error('No production-enabled projects found.');
      return;
    }
    const ids = projects.map((p) => p.novel_id).filter(Boolean);
    novelsQuery = novelsQuery.in('id', ids);
  }
  const { data: novels } = await novelsQuery;
  if (!novels || novels.length === 0) {
    console.error('No novels found.');
    return;
  }

  console.log(`Auditing ${novels.length} novel(s)...\n`);

  // 2. For each novel, pull project meta + main_character + chapters.
  const allOutliers: ChapterAudit[] = [];
  for (const n of novels) {
    const { data: project } = await s
      .from('ai_story_projects')
      .select('main_character,target_chapter_length,style_directives')
      .eq('novel_id', n.id)
      .maybeSingle();
    const mc = (project?.main_character as string | null) || '';
    const targetWords = (project?.target_chapter_length as number | null) || 2800;

    const { data: chapters } = await s
      .from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', n.id)
      .order('chapter_number');
    if (!chapters || chapters.length === 0) continue;

    let novelOutliers = 0;
    for (const ch of chapters) {
      const content = (ch.content as string) || '';
      if (content.length < 500) continue;
      const wc = countWords(content);
      const wordRatio = wc / targetWords;
      const mc1 = mc ? detectMcNameRate(content, mc) : { severity: 'none' as const, rate: 0, count: 0, message: '' };
      const eye = detectEyeTemplateOveruse(content);
      const insp = detectInspirationalCluster(content);
      const tail = mc ? detectMonologueTail(content, mc) : { severity: 'none' as const, tailDensity: 0, bodyDensity: 0, message: '' };
      const repetition = detectSevereRepetition(content);

      const flags: string[] = [];
      if (wordRatio > 1.6) flags.push(`WORD-OVERSHOOT(${Math.round(wordRatio * 100)}%)`);
      if (mc1.severity === 'critical') flags.push(`MC-RATE-CRIT(${mc1.rate.toFixed(1)}/1K)`);
      else if (mc1.severity === 'moderate') flags.push(`MC-RATE-MOD(${mc1.rate.toFixed(1)}/1K)`);
      if (eye.severity === 'critical') flags.push(`EYE-CRIT(${eye.count})`);
      else if (eye.severity === 'moderate') flags.push(`EYE-MOD(${eye.count})`);
      if (insp.severity === 'critical') flags.push(`INSP-CRIT(total ${insp.total}/tail ${insp.tailCount})`);
      else if (insp.severity === 'moderate') flags.push(`INSP-MOD(${insp.total})`);
      if (tail.severity === 'major') flags.push(`TAIL-MAJ(${(tail.tailDensity / Math.max(0.1, tail.bodyDensity)).toFixed(1)}x)`);
      else if (tail.severity === 'moderate') flags.push(`TAIL-MOD`);
      for (const r of repetition) {
        if (r.severity === 'critical') flags.push(`REP-CRIT`);
        else if (r.severity === 'moderate') flags.push(`REP-MOD`);
      }

      if (flags.length === 0) continue;
      novelOutliers++;
      const tailRatio = tail.bodyDensity > 0 ? tail.tailDensity / tail.bodyDensity : 0;
      allOutliers.push({
        novelId: n.id,
        novelTitle: (n.title as string).slice(0, 60),
        chapterNumber: ch.chapter_number,
        chapterTitle: ((ch.title as string | null) || '').slice(0, 40),
        words: wc,
        targetWords,
        wordRatio,
        mcRate: mc1.rate,
        mcCount: mc1.count,
        eyeCount: eye.count,
        inspirationalTotal: insp.total,
        inspirationalTail: insp.tailCount,
        tailRatio,
        severityFlags: flags,
      });
    }

    console.log(`  ${n.title}: ${chapters.length} chương, ${novelOutliers} outlier`);
  }

  // 3. Sort + report.
  // Severity rank: count criticals first, then majors/moderates.
  const sev = (a: ChapterAudit) => {
    let s = 0;
    for (const f of a.severityFlags) {
      if (f.includes('CRIT')) s += 100;
      else if (f.includes('MAJ')) s += 30;
      else s += 10;
    }
    return s;
  };
  allOutliers.sort((a, b) => sev(b) - sev(a));

  console.log(`\n━━━━ OUTLIERS (${allOutliers.length} total) ━━━━`);
  const limit = topN > 0 ? topN : allOutliers.length;
  for (const a of allOutliers.slice(0, limit)) {
    console.log(
      `\n[${a.novelTitle}] ch.${a.chapterNumber} — ${a.words}w (${Math.round(a.wordRatio * 100)}% of ${a.targetWords})`,
    );
    console.log(`    MC mentions: ${a.mcCount} (${a.mcRate.toFixed(1)}/1K)`);
    console.log(`    Eye descriptors: ${a.eyeCount}`);
    console.log(`    Inspirational: total ${a.inspirationalTotal}, tail ${a.inspirationalTail}`);
    console.log(`    Tail/body density ratio: ${a.tailRatio.toFixed(2)}x`);
    console.log(`    Flags: ${a.severityFlags.join(' | ')}`);
  }

  // 4. Aggregate summary.
  console.log(`\n━━━━ SUMMARY ━━━━`);
  const counts: Record<string, number> = {};
  for (const a of allOutliers) {
    for (const f of a.severityFlags) {
      const key = f.split('(')[0];
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

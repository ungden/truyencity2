/**
 * Paid, production-snapshot continuation trial.
 *
 * Reads a cycle checkpoint and published predecessor from Supabase, but writes every
 * generated artifact to a local directory. It never changes a novel, job or chapter.
 *
 * npm run serial:trial -- --serial-id=<uuid> --from=10 --chapters=5 --out=/tmp/trial --apply
 */
import dotenv from 'dotenv';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { geminiProvider, type ProviderUsage } from '@/services/story-factory/provider';
import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema, JudgeVerdictSchema, PremiseSchema, SerialRoutesSchema,
  type Bible, type CyclePlan, type JudgeVerdict,
} from '@/services/serial/contracts';
import { planNextCycle, readingHealth, writeOneChapter } from '@/services/serial/engine';
import { mergeRollingCyclePlan } from '@/services/serial/runtime';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { rebuildBibleFromDigests } from '@/services/serial/state';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const arg = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const apply = process.argv.includes('--apply');
const serialId = arg('serial-id');
const fromChapter = Number(arg('from') ?? 10);
const chapterCount = Number(arg('chapters') ?? 5);
const outDir = arg('out') ?? join('/tmp', `truyencity-serial-trial-${Date.now()}`);
if (!serialId || !z.string().uuid().safeParse(serialId).success) throw new Error('--serial-id=<uuid> is required.');
if (!Number.isInteger(fromChapter) || fromChapter < 1) throw new Error('--from must be a positive integer.');
if (!Number.isInteger(chapterCount) || chapterCount < 1 || chapterCount > 5) throw new Error('--chapters must be 1–5.');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase runtime credentials are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const TrialAuditSchema = z.object({
  verdict: z.enum(['production_ready', 'needs_prompt_fix', 'needs_canon_fix']),
  scores: z.object({
    readerPull: z.number().int().min(0).max(5),
    protagonistAgency: z.number().int().min(0).max(5),
    customerProgression: z.number().int().min(0).max(5),
    progressionClarity: z.number().int().min(0).max(5),
    continuity: z.number().int().min(0).max(5),
    structuralVariety: z.number().int().min(0).max(5),
  }).strict(),
  customerLoopEvidence: z.array(z.object({
    chapterNumber: z.number().int(),
    step: z.enum(['need', 'purchase', 'use_to_earn', 'public_proof', 'return_upgrade']),
    quote: z.string().min(4).max(400),
  }).strict()).max(10),
  findings: z.array(z.object({
    chapterNumber: z.number().int(),
    severity: z.enum(['blocking', 'important', 'minor']),
    category: z.enum(['canon', 'causality', 'progression', 'customer_loop', 'repetition', 'prose']),
    quote: z.string().min(4).max(400),
    explain: z.string().min(4).max(700),
    positiveDirection: z.string().min(4).max(700),
  }).strict()).max(12),
  strongestPayoff: z.object({ chapterNumber: z.number().int(), quote: z.string().min(4).max(400), why: z.string().min(4).max(700) }),
  weakestLink: z.string().min(4).max(800),
  conclusion: z.string().min(4).max(1_200),
}).strict();

const totalCost = (usages: ProviderUsage[]): number =>
  Number(usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));

async function main(): Promise<void> {
  const targetStart = fromChapter + 1;
  const targetEnd = fromChapter + chapterCount;
  const serial = await db.from('serial_novels')
    .select('id,novel_id,premise,routes,prompt_version').eq('id', serialId).single();
  if (serial.error) throw serial.error;
  const [predecessor, checkpointCycle, previousCycle, recentRuns, stateRuns] = await Promise.all([
    db.from('chapters').select('chapter_number,title,content,publication_state')
      .eq('novel_id', serial.data.novel_id)
      .eq('chapter_number', fromChapter).single(),
    db.from('serial_cycles').select('id,cycle_number,volume_number,start_chapter,end_chapter,checkpoint_bible')
      .eq('serial_novel_id', serialId).eq('start_chapter', targetStart).maybeSingle(),
    db.from('serial_cycles').select('plan,cycle_number,end_chapter')
      .eq('serial_novel_id', serialId).lte('end_chapter', fromChapter)
      .order('end_chapter', { ascending: false }).limit(1).maybeSingle(),
    db.from('serial_runs').select('chapter_number,verdict,status,finished_at')
      .eq('serial_novel_id', serialId).eq('kind', 'chapter')
      .lte('chapter_number', fromChapter).not('verdict', 'is', null)
      .order('finished_at', { ascending: false }).limit(8),
    db.from('serial_runs').select('chapter_number,digest,finished_at,status')
      .eq('serial_novel_id', serialId).eq('kind', 'chapter')
      .in('status', ['committed', 'published']).not('digest', 'is', null)
      .gte('chapter_number', 1).lte('chapter_number', fromChapter)
      .order('finished_at', { ascending: false }),
  ]);
  for (const result of [predecessor, checkpointCycle, previousCycle, recentRuns, stateRuns]) {
    if (result.error) throw result.error;
  }
  if (!predecessor.data) throw new Error(`Chapter ${fromChapter} does not exist.`);
  if (!checkpointCycle.data) throw new Error(`No cycle checkpoint starts at chapter ${targetStart}.`);
  if (checkpointCycle.data.end_chapter < targetEnd) throw new Error('Requested trial exceeds the checkpoint cycle boundary.');
  const premise = PremiseSchema.parse(serial.data.premise);
  const routes = SerialRoutesSchema.parse(serial.data.routes);
  const latestDigestByChapter = new Map<number, unknown>();
  for (const run of stateRuns.data ?? []) {
    if (run.chapter_number && !latestDigestByChapter.has(run.chapter_number)) {
      latestDigestByChapter.set(run.chapter_number, run.digest);
    }
  }
  let bible: Bible = rebuildBibleFromDigests({
    premise,
    digests: [...latestDigestByChapter.values()].map(digest => ChapterDigestSchema.parse(digest)),
    throughChapter: fromChapter,
  });
  if (bible.symbolicCore.chapterNumber !== fromChapter) {
    throw new Error(`Checkpoint is chapter ${bible.symbolicCore.chapterNumber}, expected ${fromChapter}.`);
  }
  const cycleCheckpoint = BibleSchema.parse(checkpointCycle.data.checkpoint_bible);
  if (JSON.stringify(cycleCheckpoint.symbolicCore) !== JSON.stringify(bible.symbolicCore)) {
    throw new Error('Cycle checkpoint differs from replayed chapter state. Reconcile state before a paid continuation trial.');
  }
  const priorPlan = previousCycle.data ? CyclePlanSchema.safeParse(previousCycle.data.plan) : null;
  const recentVerdicts = [...(recentRuns.data ?? [])].reverse().flatMap(row => {
    const parsed = JudgeVerdictSchema.safeParse(row.verdict);
    return parsed.success ? [parsed.data] : [];
  });
  const snapshot = {
    serialId, title: premise.title, fromChapter, targetStart, targetEnd,
    sourcePromptVersion: serial.data.prompt_version, trialPromptVersion: SERIAL_PROMPT_VERSION,
    checkpointCycle: { id: checkpointCycle.data.id, number: checkpointCycle.data.cycle_number,
      start: checkpointCycle.data.start_chapter, end: checkpointCycle.data.end_chapter },
    predecessor: { chapterNumber: predecessor.data.chapter_number, title: predecessor.data.title,
      publicationState: predecessor.data.publication_state },
    routes,
  };
  console.log(JSON.stringify({ apply, outDir, ...snapshot }, null, 2));
  if (!apply) {
    console.log('Dry run: no provider calls were made. Add --apply for the five-chapter trial.');
    return;
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
  const usages: ProviderUsage[] = [];
  const verdicts: JudgeVerdict[] = [];
  const generated: Array<Record<string, unknown>> = [];
  let previousChapter = predecessor.data.content;
  let replans = 0;
  const initial = await planNextCycle({
    provider: geminiProvider, routes, premise, bible,
    previousCycle: priorPlan?.success ? priorPlan.data : null,
    cycleNumber: checkpointCycle.data.cycle_number,
    volumeNumber: checkpointCycle.data.volume_number,
    startChapter: targetStart,
    fixedEndChapter: checkpointCycle.data.end_chapter,
  });
  usages.push(...initial.usages);
  let cycle: CyclePlan = initial.cycle;
  writeFileSync(join(outDir, `plan-from-${targetStart}.json`), `${JSON.stringify(cycle, null, 2)}\n`);

  for (let chapterNumber = targetStart; chapterNumber <= targetEnd; chapterNumber += 1) {
    if (!cycle.beatSheets.some(sheet => sheet.chapterNumber === chapterNumber)) {
      const rolling = await planNextCycle({
        provider: geminiProvider, routes, premise, bible, previousCycle: null,
        activeCycle: cycle,
        cycleNumber: cycle.cycleNumber, volumeNumber: cycle.volumeNumber,
        startChapter: chapterNumber, fixedEndChapter: checkpointCycle.data.end_chapter,
      });
      usages.push(...rolling.usages);
      cycle = mergeRollingCyclePlan({
        active: cycle, rolling: rolling.cycle,
        cycleNumber: checkpointCycle.data.cycle_number,
        volumeNumber: checkpointCycle.data.volume_number,
        startChapter: targetStart,
        endChapter: checkpointCycle.data.end_chapter,
      });
      writeFileSync(join(outDir, `plan-from-${chapterNumber}.json`), `${JSON.stringify(cycle, null, 2)}\n`);
    }

    let outcome = await writeOneChapter({
      provider: geminiProvider, routes, premise, bible, cycle, chapterNumber, previousChapter,
    });
    usages.push(...outcome.usages);
    if (outcome.status === 'needs_replan') {
      replans++;
      writeFileSync(join(outDir, `chapter-${chapterNumber}-failed.json`), `${JSON.stringify(outcome, null, 2)}\n`);
      const replanned = await planNextCycle({
        provider: geminiProvider, routes, premise, bible, previousCycle: null,
        activeCycle: cycle,
        cycleNumber: cycle.cycleNumber, volumeNumber: cycle.volumeNumber,
        startChapter: chapterNumber, fixedEndChapter: checkpointCycle.data.end_chapter,
        editorialNotes: [outcome.reason],
      });
      usages.push(...replanned.usages);
      cycle = mergeRollingCyclePlan({
        active: cycle, rolling: replanned.cycle,
        cycleNumber: checkpointCycle.data.cycle_number,
        volumeNumber: checkpointCycle.data.volume_number,
        startChapter: targetStart,
        endChapter: checkpointCycle.data.end_chapter,
      });
      outcome = await writeOneChapter({
        provider: geminiProvider, routes, premise, bible, cycle, chapterNumber, previousChapter,
      });
      usages.push(...outcome.usages);
    }
    if (outcome.status !== 'committed') {
      writeFileSync(join(outDir, `chapter-${chapterNumber}-stopped.json`), `${JSON.stringify(outcome, null, 2)}\n`);
      throw new Error(`Trial stopped at chapter ${chapterNumber}: ${outcome.reason}`);
    }
    bible = outcome.bible;
    previousChapter = outcome.chapter.content;
    verdicts.push(outcome.verdict);
    const record = {
      chapterNumber, title: outcome.chapter.title, content: outcome.chapter.content,
      attempts: outcome.attempts, costUsd: outcome.costUsd,
      verdict: outcome.verdict, digest: outcome.digest,
    };
    generated.push(record);
    writeFileSync(join(outDir, `chapter-${chapterNumber}.json`), `${JSON.stringify(record, null, 2)}\n`);
    writeFileSync(join(outDir, `chapter-${chapterNumber}.md`), `# ${outcome.chapter.title}\n\n${outcome.chapter.content}\n`);
    writeFileSync(join(outDir, 'checkpoint.json'), `${JSON.stringify({ bible, generated, usages, replans }, null, 2)}\n`);
    console.log(`ch${chapterNumber} "${outcome.chapter.title}" attempts=${outcome.attempts} cost=$${outcome.costUsd.toFixed(4)}`);
  }

  const audited = await geminiProvider.json({
    model: routes.judge,
    system: `Bạn là tổng biên tập kiểm định năm chương nối tiếp của truyện Song Xuyên trước khi production dùng tiếp engine. Chỉ chấm những gì có trên trang. Đọc như độc giả trả tiền: main phải chủ động kiếm lợi và điều phối giao dịch; khách hàng phải tiến qua các bước mua, dùng hàng kiếm tài nguyên hoặc địa vị, thể hiện công khai, rồi trở lại mua cấp cao hơn; cấp nghề và sức mạnh gọi đúng tên; phần thưởng có phản ứng và hành động thương mại; năm chương không lặp một khuôn demo. return_upgrade hoàn tất khi khách trở lại và ký, đặt cọc hoặc mua món cấp cao hơn; không đòi món nâng cấp phải được giao và dùng ngay trong cùng batch, vì đó là mở đầu vòng kế tiếp. Mỗi finding phải trích nguyên văn trong đúng chương. Blocking chỉ dành cho canon hoặc nhân quả làm hỏng chương sau. verdict=production_ready chỉ khi không có blocking/important và sáu điểm đều từ 4.`,
    prompt: JSON.stringify({
      title: premise.title,
      readerFantasy: premise.readerFantasy,
      goldenFinger: premise.goldenFinger,
      cyclePromise: { pressure: cycle.pressure, customerLoop: cycle.customerLoop, escalation: cycle.escalation },
      startingState: cycleCheckpoint,
      chapters: generated,
    }, null, 1),
    schema: TrialAuditSchema,
    temperature: 0.2,
    timeoutMs: 240_000,
  });
  usages.push(audited.usage);
  const report = {
    ...snapshot,
    generatedChapters: generated.length,
    chapterAttempts: generated.map(item => ({ chapterNumber: item.chapterNumber, attempts: item.attempts, costUsd: item.costUsd })),
    replans,
    totalModelCalls: usages.length,
    totalUsd: totalCost(usages),
    readingHealth: readingHealth(verdicts),
    audit: audited.value,
    usage: usages,
  };
  writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Trial artifacts: ${outDir}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

/**
 * Offline runner for the serial engine.
 *
 * Reads an approved premise, writes chapters to disk, and prints what each one cost.
 * It never touches Supabase and never publishes: this is the phase-1 rig for reading
 * fifteen chapters and deciding whether the redesign is worth building a runtime for.
 *
 *   npm run serial:run -- --premise=factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json --chapters=4
 *   npm run serial:run -- --premise=... --chapters=15 --apply
 *
 * Without --apply it makes no provider calls at all: it validates the premise, seeds the
 * Bible, prints the plan and the estimated spend, and stops.
 */
import dotenv from 'dotenv';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geminiProvider } from '@/services/story-factory/provider';
import type { ProviderUsage } from '@/services/story-factory/provider';
import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema, JudgeVerdictSchema, PremiseSchema,
  type Bible, type ChapterDigest, type CyclePlan, type JudgeVerdict, assertSerialLaunchable,
} from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import { applyDigest, seedBible } from '@/services/serial/state';
import {
  planNextCycle, readingHealth, SerialCheckpointError, writeOneChapter,
  serialChapterInputFingerprint,
  type ChapterOutcome, type SerialDraftCheckpoint,
} from '@/services/serial/engine';
import { reviewNarrativeSequence } from '@/services/serial/foundation';
import { mergeRollingCyclePlan } from '@/services/serial/runtime';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { NarrativeFoundationSchema, NarrativeReviewSchema, narrativeReviewGate } from '@/services/narrative/foundation';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const arg = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const apply = process.argv.includes('--apply');

/** Rough per-chapter spend from the phase-1 model mix, used only for the dry-run estimate. */
const ESTIMATED_CHAPTER_USD = 0.13;

function atomicWrite(path: string, content: string): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function usageFromError(error: unknown): ProviderUsage[] {
  if (!error || typeof error !== 'object') return [];
  const evidence = (error as { evidence?: unknown }).evidence;
  if (!evidence || typeof evidence !== 'object') return [];
  const typed = evidence as { usage?: ProviderUsage; usages?: ProviderUsage[] };
  return Array.isArray(typed.usages) ? typed.usages : typed.usage ? [typed.usage] : [];
}

function comparableTitle(value: string): string {
  return value.trim().replace(/^[\"“”]+|[\"“”]+$/g, '').trim();
}

async function main(): Promise<void> {
  const premisePath = arg('premise') ?? fail('--premise=<file.json> is required.');
  const foundationReviewPath = arg('foundation-review');
  const chapters = Number(arg('chapters') ?? 4);
  const outDir = arg('out') ?? join('factory', 'serial', 'runs', new Date().toISOString().replace(/[:.]/g, '-'));
  const resume = process.argv.includes('--resume');
  const resumeFrom = Number(arg('resume-from') ?? 0);
  const replanFrom = Number(arg('replan-from') ?? 0);
  const reviseCyclePromise = process.argv.includes('--revise-cycle-promise');
  const literaryFeedbackPath = arg('literary-feedback');
  const operatorNote = arg('editorial-note');
  const literaryFeedback = [...(literaryFeedbackPath
    ? NarrativeReviewSchema.parse((JSON.parse(readFileSync(literaryFeedbackPath, 'utf8')) as { review?: unknown }).review)
      .findings.map(finding => [
        `Chương ${finding.chapterNumber ?? 'chuỗi'} [${finding.target}/${finding.kind}]: ${finding.explanation}`,
        `Hướng sửa: ${finding.direction}`,
      ].join(' '))
    : []), ...(operatorNote ? [operatorNote] : [])].slice(0, 8);

  const sourcePremise = JSON.parse(readFileSync(premisePath, 'utf8')) as Record<string, unknown>;
  let premiseInput: Record<string, unknown> = sourcePremise;
  if (foundationReviewPath) {
    const review = JSON.parse(readFileSync(foundationReviewPath, 'utf8')) as {
      foundation?: unknown;
      premisePatch?: Record<string, unknown>;
    };
    const foundation = NarrativeFoundationSchema.parse(review.foundation);
    const patch = review.premisePatch ?? {};
    const sourceGoldenFinger = sourcePremise.goldenFinger as Record<string, unknown>;
    const patchGoldenFinger = (patch.goldenFinger ?? {}) as Record<string, unknown>;
    const sourceWorldKernel = sourcePremise.worldKernel as Record<string, unknown>;
    const patchWorldKernel = (patch.worldKernel ?? {}) as Record<string, unknown>;
    premiseInput = {
      ...sourcePremise,
      ...patch,
      schemaVersion: 3,
      narrativeFoundation: foundation,
      goldenFinger: { ...sourceGoldenFinger, ...patchGoldenFinger },
      worldKernel: { ...sourceWorldKernel, ...patchWorldKernel },
    };
  }
  const premise = PremiseSchema.parse(premiseInput);
  // --foundation-review upgrades to the retired v3 policy; refuse before any spend.
  assertSerialLaunchable(premise);
  let bible: Bible = seedBible({ premise });

  console.log(JSON.stringify({
    apply,
    resume,
    resumeFrom: resumeFrom || null,
    replanFrom: replanFrom || null,
    reviseCyclePromise,
    literaryFeedbackPath: literaryFeedbackPath ?? null,
    operatorNote: operatorNote ?? null,
    premise: premise.title,
    lane: premise.lane,
    goldenFinger: premise.goldenFinger.name,
    cast: premise.castSeed.length,
    progressionSystems: premise.worldKernel.progressionSystems.map(system => system.name),
    gradeSystems: premise.worldKernel.gradeSystems.map(system => system.name),
    chapters,
    routes: DEFAULT_SERIAL_ROUTES,
    promptVersion: SERIAL_PROMPT_VERSION,
    craftProfile: premise.narrativeFoundation?.craftProfile ?? null,
    foundationReviewPath: foundationReviewPath ?? null,
    estimatedUsd: Number((chapters * ESTIMATED_CHAPTER_USD).toFixed(2)),
    outDir,
  }, null, 2));

  if (!apply) {
    console.log('\nDry run: no provider calls were made. Re-run with --apply to spend.');
    return;
  }

  mkdirSync(outDir, { recursive: true });
  writeJson(join(outDir, 'premise.json'), premise);
  const provider = geminiProvider;
  const usages: ProviderUsage[] = [];
  const verdicts: JudgeVerdict[] = [];
  const writtenChapters: Array<{ chapterNumber: number; title: string; content: string }> = [];
  const planHistory: CyclePlan[] = [];
  let previousChapter: string | null = null;
  const startBible = BibleSchema.parse(JSON.parse(JSON.stringify(bible)));
  let priorSpend = 0;

  if (resume) {
    // Rebuild from committed chapter artifacts. bible.json is only a cache and may
    // be one file ahead or behind if a previous process stopped between writes.
    bible = BibleSchema.parse(JSON.parse(JSON.stringify(startBible)));
    const reportPath = join(outDir, 'report.json');
    if (existsSync(reportPath)) {
      const priorReport = JSON.parse(readFileSync(reportPath, 'utf8')) as { totalUsd?: number };
      priorSpend = Number(priorReport.totalUsd ?? 0);
    }
    const chapterFiles = readdirSync(outDir)
      .filter(file => /^chapter-\d{3}\.md$/.test(file))
      .filter(file => resumeFrom <= 0 || Number(file.match(/\d{3}/)?.[0]) < resumeFrom)
      .sort();
    for (const [index, file] of chapterFiles.entries()) {
      const chapterNumber = Number(file.match(/\d{3}/)?.[0]);
      if (chapterNumber !== index + 1) fail(`Resume found a chapter gap before chapter ${chapterNumber}.`);
      const markdown = readFileSync(join(outDir, file), 'utf8');
      const [heading = '', ...body] = markdown.split(/\r?\n/);
      const chapter = { chapterNumber, title: heading.replace(/^#\s*/, '').trim(), content: body.join('\n').trim() };
      writtenChapters.push(chapter);
      previousChapter = chapter.content;
      const verdictPath = join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.verdict.json`);
      if (!existsSync(verdictPath)) fail(`Resume found ${file} without its verdict artifact.`);
      const rawArtifact = JSON.parse(readFileSync(verdictPath, 'utf8')) as { verdict?: unknown; digest?: unknown };
      const verdict = JudgeVerdictSchema.parse(rawArtifact.verdict);
      const digest = ChapterDigestSchema.parse(rawArtifact.digest);
      if (digest.chapterNumber !== chapterNumber || comparableTitle(digest.title) !== comparableTitle(chapter.title)) {
        fail(`Resume found a title or chapter mismatch in ${verdictPath}.`);
      }
      if (digest.narrativeEvidence.some(evidence => !chapter.content.includes(evidence.quote))) {
        fail(`Resume found stale narrative evidence in ${verdictPath}.`);
      }
      if (premise.schemaVersion === 3 && (!verdict.reviewBinding
        || verdict.reviewBinding.chapterNumber !== chapterNumber
        || !chapter.content.includes(verdict.reviewBinding.excerpt))) {
        fail(`Resume found an unbound Judge verdict at chapter ${chapterNumber}; restart from that chapter.`);
      }
      verdicts.push(verdict);
      bible = applyDigest({ premise, bible, digest });
    }
  }

  const storedPlans = resume
    ? readdirSync(outDir).flatMap(file => {
        if (!/^cycle-\d+(?:-from-\d+)?\.json$/.test(file)) return [];
        const parsed = CyclePlanSchema.safeParse(JSON.parse(readFileSync(join(outDir, file), 'utf8')));
        return parsed.success ? [{ file, plan: parsed.data }] : [];
      }).sort((left, right) => {
        const leftStart = Number(left.file.match(/-from-(\d+)/)?.[1] ?? left.plan.startChapter);
        const rightStart = Number(right.file.match(/-from-(\d+)/)?.[1] ?? right.plan.startChapter);
        return leftStart - rightStart;
      })
    : [];
  planHistory.push(...storedPlans.map(item => item.plan));

  let cycle: CyclePlan;
  if (storedPlans.length > 0) {
    cycle = storedPlans[storedPlans.length - 1]!.plan;
  } else {
    const planned = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible,
      previousCycle: null, cycleNumber: 1, volumeNumber: 1, startChapter: 1,
      fixedEndChapter: chapters >= 5 && chapters <= 15 ? chapters : undefined,
      recentVerdicts: [],
    });
    usages.push(...planned.usages);
    cycle = planned.cycle;
    planHistory.push(cycle);
    writeJson(join(outDir, 'cycle-1.json'), cycle);
  }

  if (replanFrom > 0) {
    if (!resume || resumeFrom !== replanFrom) fail('--replan-from requires --resume and the same --resume-from chapter.');
    if (replanFrom <= cycle.startChapter || replanFrom > cycle.plannedEndChapter) {
      fail('--replan-from must be after the cycle start and within the current cycle.');
    }
    if (reviseCyclePromise && literaryFeedback.length === 0) {
      fail('--revise-cycle-promise requires literary or operator feedback.');
    }
    const replanned = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible,
      previousCycle: null, activeCycle: cycle,
      cycleNumber: cycle.cycleNumber, volumeNumber: cycle.volumeNumber,
      startChapter: replanFrom, fixedEndChapter: cycle.plannedEndChapter,
      recentVerdicts: verdicts,
      editorialNotes: literaryFeedback,
    });
    usages.push(...replanned.usages);
    planHistory.push(replanned.cycle);
    const activeForMerge = reviseCyclePromise ? {
      ...cycle,
      pressure: replanned.cycle.pressure,
      escalation: replanned.cycle.escalation,
      climax: replanned.cycle.climax,
      aftermath: replanned.cycle.aftermath,
      nextHook: replanned.cycle.nextHook,
    } : cycle;
    cycle = mergeRollingCyclePlan({
      active: activeForMerge,
      rolling: replanned.cycle,
      cycleNumber: cycle.cycleNumber,
      volumeNumber: cycle.volumeNumber,
      startChapter: cycle.startChapter,
      endChapter: cycle.plannedEndChapter,
    });
    writeJson(join(outDir, `cycle-${cycle.cycleNumber}-from-${replanFrom}.json`), cycle);
    if (reviseCyclePromise) {
      for (const file of readdirSync(outDir)) {
        if (!new RegExp(`^cycle-${cycle.cycleNumber}(?:-from-\\d+)?\\.json$`).test(file)) continue;
        const stored = CyclePlanSchema.parse(JSON.parse(readFileSync(join(outDir, file), 'utf8')));
        writeJson(join(outDir, file), {
          ...stored,
          pressure: cycle.pressure,
          escalation: cycle.escalation,
          climax: cycle.climax,
          aftermath: cycle.aftermath,
          nextHook: cycle.nextHook,
          editorialNotes: cycle.editorialNotes,
        });
      }
    }
  }

  for (let chapterNumber = writtenChapters.length + 1; chapterNumber <= chapters; chapterNumber += 1) {
    if (!cycle.beatSheets.some(sheet => sheet.chapterNumber === chapterNumber)) {
      // Beat sheets are rolling three chapters deep; extend them from the same cycle.
      const extended = await planNextCycle({
        provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible,
        previousCycle: null, activeCycle: cycle,
        cycleNumber: cycle.cycleNumber, volumeNumber: cycle.volumeNumber,
        startChapter: chapterNumber, fixedEndChapter: cycle.plannedEndChapter,
        recentVerdicts: verdicts,
      });
      usages.push(...extended.usages);
      planHistory.push(extended.cycle);
      cycle = mergeRollingCyclePlan({
        active: cycle,
        rolling: extended.cycle,
        cycleNumber: cycle.cycleNumber,
        volumeNumber: cycle.volumeNumber,
        startChapter: cycle.startChapter,
        endChapter: cycle.plannedEndChapter,
      });
      writeJson(join(outDir, `cycle-${cycle.cycleNumber}-from-${chapterNumber}.json`), cycle);
    }

    const failedPath = join(outDir, `chapter-${chapterNumber}-failed.json`);
    const inputFingerprint = serialChapterInputFingerprint({
      premise, bible, cycle, chapterNumber, previousChapter,
    });
    let resumeArtifact: SerialDraftCheckpoint | null = null;
    if (resume && existsSync(failedPath)) {
      const failed = JSON.parse(readFileSync(failedPath, 'utf8')) as {
        status?: string;
        reviewKind?: string;
        checkpoint?: SerialDraftCheckpoint;
        chapter?: SerialDraftCheckpoint['chapter'];
        verdict?: JudgeVerdict;
        attempts?: number;
        inputFingerprint?: string;
      };
      if (failed.status === 'checkpoint' && failed.checkpoint) {
        resumeArtifact = failed.checkpoint;
      } else if (failed.status === 'needs_review' && failed.reviewKind === 'upstream') {
        fail(`Chapter ${chapterNumber} requires premise/plan/prose repair before resume.`);
      } else if (failed.status === 'needs_review' && failed.chapter && failed.verdict) {
        resumeArtifact = {
          schemaVersion: 2,
          resumeFrom: failed.reviewKind === 'prose' ? 'revision' : 'extractor',
          chapter: failed.chapter,
          verdict: failed.verdict,
          attempts: failed.attempts ?? 1,
          inputFingerprint: failed.inputFingerprint,
        };
      }
    }
    if (resume && !resumeArtifact && resumeFrom === chapterNumber) {
      const chapterPath = join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.md`);
      const verdictPath = join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.verdict.json`);
      if (existsSync(chapterPath) && existsSync(verdictPath)) {
        const markdown = readFileSync(chapterPath, 'utf8');
        const [heading = '', ...body] = markdown.split(/\r?\n/);
        const artifact = JSON.parse(readFileSync(verdictPath, 'utf8')) as { verdict?: JudgeVerdict; attempts?: number };
        if (artifact.verdict) resumeArtifact = {
          schemaVersion: 2,
          resumeFrom: 'judge',
          chapter: {
            chapterNumber,
            title: heading.replace(/^#\s*/, '').trim(),
            content: body.join('\n').trim(),
          },
          attempts: artifact.attempts ?? 1,
          inputFingerprint,
        };
      }
    }
    let outcome: ChapterOutcome;
    try {
      outcome = await writeOneChapter({
        provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible, cycle, chapterNumber, previousChapter, resumeArtifact,
      });
    } catch (error) {
      if (!(error instanceof SerialCheckpointError)) throw error;
      const failedUsages = [...error.usages, ...usageFromError(error.underlying)];
      usages.push(...failedUsages);
      writeJson(failedPath, {
        status: 'checkpoint',
        checkpoint: error.checkpoint,
        error: error.message,
        usages: failedUsages,
        costUsd: failedUsages.reduce((sum, item) => sum + item.costUsd, 0),
      });
      console.error(`Chapter ${chapterNumber} saved ${error.checkpoint.resumeFrom} checkpoint: ${error.message}`);
      break;
    }
    usages.push(...outcome.usages);

    if (outcome.status !== 'committed') {
      console.error(`Chapter ${chapterNumber} cannot commit (${outcome.status}): ${outcome.reason}`);
      writeJson(failedPath, outcome);
      break;
    }

    bible = outcome.bible;
    verdicts.push(outcome.verdict);
    previousChapter = outcome.chapter.content;
    writtenChapters.push(outcome.chapter);
    if (existsSync(failedPath)) unlinkSync(failedPath);
    atomicWrite(
      join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.md`),
      `# ${outcome.chapter.title}\n\n${outcome.chapter.content}\n`,
    );
    writeJson(join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.verdict.json`), {
      verdict: outcome.verdict, digest: outcome.digest, attempts: outcome.attempts,
      costUsd: outcome.costUsd, inputFingerprint: outcome.inputFingerprint,
    });
    writeJson(join(outDir, 'bible.json'), bible);
    console.log(`ch${chapterNumber}  "${outcome.chapter.title}"  attempts=${outcome.attempts}  $${outcome.costUsd.toFixed(3)}`);
  }

  writeJson(join(outDir, 'bible.json'), bible);
  let narrativeReview: Awaited<ReturnType<typeof reviewNarrativeSequence>> = null;
  if (premise.schemaVersion === 3 && writtenChapters.length === chapters) {
    narrativeReview = await reviewNarrativeSequence({
      provider,
      routes: DEFAULT_SERIAL_ROUTES,
      premise,
      chapters: writtenChapters,
      bible,
      startBible,
      approvedPlan: planHistory,
    });
    if (narrativeReview) {
      usages.push(narrativeReview.usage);
      const gate = narrativeReviewGate(narrativeReview.review);
      writeJson(join(outDir, 'literary-review.json'), {
        review: narrativeReview.review,
        gate,
        usage: narrativeReview.usage,
      });
    }
  }
  const spend = priorSpend + usages.reduce((sum, usage) => sum + usage.costUsd, 0);
  const reviewGate = narrativeReview ? narrativeReviewGate(narrativeReview.review) : null;
  const report = {
    chapters: verdicts.length,
    totalUsd: Number(spend.toFixed(3)),
    perChapterUsd: verdicts.length ? Number((spend / verdicts.length).toFixed(3)) : 0,
    reading: readingHealth(verdicts),
    narrativeReview: reviewGate ? {
      mayPublish: reviewGate.mayPublish,
      upstreamFindings: reviewGate.upstreamFindings.length,
      blockingProseFindings: reviewGate.blockingProseFindings.length,
      totalFindings: narrativeReview?.review.findings.length ?? 0,
    } : null,
  };
  writeJson(join(outDir, 'report.json'), report);
  console.log(`\n${JSON.stringify(report, null, 2)}\n\nWrote ${outDir}`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main().catch(error => {
  console.error(error);
  if (error && typeof error === 'object' && 'evidence' in error) {
    console.error(JSON.stringify((error as { evidence?: unknown }).evidence, null, 2));
  }
  process.exit(1);
});

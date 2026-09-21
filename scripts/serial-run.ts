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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geminiProvider } from '@/services/story-factory/provider';
import type { ProviderUsage } from '@/services/story-factory/provider';
import { PremiseSchema, type Bible, type CyclePlan, type JudgeVerdict } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import { seedBible } from '@/services/serial/state';
import { planNextCycle, readingHealth, writeOneChapter } from '@/services/serial/engine';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const arg = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const apply = process.argv.includes('--apply');

/** Rough per-chapter spend from the phase-1 model mix, used only for the dry-run estimate. */
const ESTIMATED_CHAPTER_USD = 0.13;

async function main(): Promise<void> {
  const premisePath = arg('premise') ?? fail('--premise=<file.json> is required.');
  const chapters = Number(arg('chapters') ?? 4);
  const outDir = arg('out') ?? join('factory', 'serial', 'runs', new Date().toISOString().replace(/[:.]/g, '-'));

  const premise = PremiseSchema.parse(JSON.parse(readFileSync(premisePath, 'utf8')));
  let bible: Bible = seedBible({ premise });

  console.log(JSON.stringify({
    apply,
    premise: premise.title,
    lane: premise.lane,
    goldenFinger: premise.goldenFinger.name,
    cast: premise.castSeed.length,
    progressionSystems: premise.worldKernel.progressionSystems.map(system => system.name),
    gradeSystems: premise.worldKernel.gradeSystems.map(system => system.name),
    chapters,
    routes: DEFAULT_SERIAL_ROUTES,
    promptVersion: SERIAL_PROMPT_VERSION,
    estimatedUsd: Number((chapters * ESTIMATED_CHAPTER_USD).toFixed(2)),
    outDir,
  }, null, 2));

  if (!apply) {
    console.log('\nDry run: no provider calls were made. Re-run with --apply to spend.');
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const provider = geminiProvider;
  const usages: ProviderUsage[] = [];
  const verdicts: JudgeVerdict[] = [];
  let previousChapter: string | null = null;

  const planned = await planNextCycle({
    provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible,
    previousCycle: null, cycleNumber: 1, volumeNumber: 1, startChapter: 1, recentVerdicts: [],
  });
  usages.push(...planned.usages);
  let cycle: CyclePlan = planned.cycle;
  writeFileSync(join(outDir, 'cycle-1.json'), JSON.stringify(cycle, null, 2));

  for (let chapterNumber = 1; chapterNumber <= chapters; chapterNumber += 1) {
    if (!cycle.beatSheets.some(sheet => sheet.chapterNumber === chapterNumber)) {
      // Beat sheets are rolling three chapters deep; extend them from the same cycle.
      const extended = await planNextCycle({
        provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible,
        previousCycle: null, cycleNumber: cycle.cycleNumber, volumeNumber: cycle.volumeNumber,
        startChapter: chapterNumber, recentVerdicts: verdicts,
      });
      usages.push(...extended.usages);
      cycle = extended.cycle;
      writeFileSync(join(outDir, `cycle-${cycle.cycleNumber}-from-${chapterNumber}.json`), JSON.stringify(cycle, null, 2));
    }

    const outcome = await writeOneChapter({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible, cycle, chapterNumber, previousChapter,
    });
    usages.push(...outcome.usages);

    if (outcome.status !== 'committed') {
      console.error(`Chapter ${chapterNumber} cannot commit (${outcome.status}): ${outcome.reason}`);
      writeFileSync(join(outDir, `chapter-${chapterNumber}-failed.json`), JSON.stringify(outcome, null, 2));
      break;
    }

    bible = outcome.bible;
    verdicts.push(outcome.verdict);
    previousChapter = outcome.chapter.content;
    writeFileSync(
      join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.md`),
      `# ${outcome.chapter.title}\n\n${outcome.chapter.content}\n`,
    );
    writeFileSync(join(outDir, `chapter-${String(chapterNumber).padStart(3, '0')}.verdict.json`),
      JSON.stringify({ verdict: outcome.verdict, digest: outcome.digest, attempts: outcome.attempts, costUsd: outcome.costUsd }, null, 2));
    console.log(`ch${chapterNumber}  "${outcome.chapter.title}"  attempts=${outcome.attempts}  $${outcome.costUsd.toFixed(3)}`);
  }

  writeFileSync(join(outDir, 'bible.json'), JSON.stringify(bible, null, 2));
  const spend = usages.reduce((sum, usage) => sum + usage.costUsd, 0);
  const report = {
    chapters: verdicts.length,
    totalUsd: Number(spend.toFixed(3)),
    perChapterUsd: verdicts.length ? Number((spend / verdicts.length).toFixed(3)) : 0,
    reading: readingHealth(verdicts),
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${JSON.stringify(report, null, 2)}\n\nWrote ${outDir}`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

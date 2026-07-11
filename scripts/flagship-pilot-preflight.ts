import { readFileSync } from 'fs';
import { parseArcPlanV2, parseChapterPlanV2, parseStorySpecV2, parseStoryStateV2, validateChapterPlanSemantics } from '../src/services/story-engine/flagship/contracts';
import { computeFoundationScoreV2 } from '../src/services/story-engine/flagship/foundation-score';

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const specPath = arg('spec');
const arcPath = arg('arc');
const statePath = arg('state');
const plansPath = arg('plans');
if (!specPath || !arcPath || !statePath || !plansPath) {
  throw new Error('Usage: npm run flagship:preflight -- --spec=/abs/story-spec.json --arc=/abs/arc-plan.json --state=/abs/story-state.json --plans=/abs/chapter-plans.json');
}

const specResult = parseStorySpecV2(JSON.parse(readFileSync(specPath, 'utf8')));
if (!specResult.success) {
  console.error(JSON.stringify({ ready: false, artifact: 'story_spec_v2', issues: specResult.issues }, null, 2));
  process.exit(1);
}

const arcResult = parseArcPlanV2(JSON.parse(readFileSync(arcPath, 'utf8')));
if (!arcResult.success) {
  console.error(JSON.stringify({ ready: false, artifact: 'arc_plan_v2', issues: arcResult.issues }, null, 2));
  process.exit(1);
}

const stateResult = parseStoryStateV2(JSON.parse(readFileSync(statePath, 'utf8')));
if (!stateResult.success) {
  console.error(JSON.stringify({ ready: false, artifact: 'story_state_v2', issues: stateResult.issues }, null, 2));
  process.exit(1);
}

const rawPlans = JSON.parse(readFileSync(plansPath, 'utf8'));
if (!Array.isArray(rawPlans)) throw new Error('Chapter plans file must be a JSON array.');
const planIssues: Array<{ chapter: number | null; issues: unknown[] }> = [];
const chapters = new Set<number>();
for (const raw of rawPlans) {
  const result = parseChapterPlanV2(raw);
  if (!result.success) {
    planIssues.push({ chapter: typeof raw?.chapterNumber === 'number' ? raw.chapterNumber : null, issues: result.issues });
    continue;
  }
  chapters.add(result.data.chapterNumber);
  const semantic = validateChapterPlanSemantics(result.data);
  if (semantic.length) planIssues.push({ chapter: result.data.chapterNumber, issues: semantic });
}

const missing = Array.from({ length: 30 }, (_, index) => index + 1).filter(chapter => !chapters.has(chapter));
const foundation = computeFoundationScoreV2(specResult.data);
const arcCoversOpening = arcResult.data.startChapter === 1 && arcResult.data.endChapter >= 20;
const stateStartsClean = stateResult.data.chapterNumber === 0;
const ready = foundation.passed && arcCoversOpening && stateStartsClean && planIssues.length === 0 && missing.length === 0;
console.log(JSON.stringify({
  ready,
  mode: 'offline_only',
  foundation,
  arc: { id: arcResult.data.arcId, start: arcResult.data.startChapter, end: arcResult.data.endChapter, coversOpening: arcCoversOpening },
  state: { chapterNumber: stateResult.data.chapterNumber, startsClean: stateStartsClean },
  plans: { supplied: chapters.size, missing, issues: planIssues },
  nextGate: ready ? 'human_review_story_spec' : 'repair_artifacts',
}, null, 2));
if (!ready) process.exit(1);

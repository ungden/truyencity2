import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ArcPlanSchema,
  ChapterDraftSchema,
  DEFAULT_MODEL_ROUTES,
  StoryKernelSchema,
  STORY_FACTORY_RELEASE,
  StoryStateSchema,
  geminiProvider,
  planRollingWindow,
  reviewFiveChapterWindow,
  writeStoryChapter,
  type StoryState,
  type StoryKernel,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const SOURCE_REF = 'b0896d8';
// dt-01 is intentionally retained as a golden Plan-Judge failure: its owner
// gives away an entire catch against his own agenda even after one replan.
const SLOTS = ['dt-11', 'hx-01', 'hx-04', 'th-01'] as const;
const outputFlag = process.argv.indexOf('--output');
const outputPath = path.resolve(outputFlag >= 0 ? process.argv[outputFlag + 1] : '/tmp/truyencity-factory-benchmark-20.json');

const legacySystem = `Bạn là tiểu thuyết gia của đúng một bộ truyện. Bắt buộc đi theo từng scene và required delta theo đúng thứ tự.
Viết từ 1.200 đến 1.800 từ, không dưới 1.000 và không trên 2.200 từ. Mỗi scene phải thành một đơn vị kịch tính hoàn chỉnh.
Mọi con số phải khớp plan. Không thêm cảnh ngoài plan. Kết thúc bằng đúng áp lực chương sau được cung cấp. Chỉ trả JSON title và content.`;

function fromGit<T>(file: string): T {
  return JSON.parse(execFileSync('git', ['show', `${SOURCE_REF}:${file}`], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })) as T;
}

const words = (items: unknown): string => Array.isArray(items) ? items.join('; ') : String(items ?? '');
const stable = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'unknown';
const promiseStatus = (value: unknown): 'open' | 'progressed' | 'resolved' | 'abandoned' => {
  const raw = String(value ?? 'open');
  if (raw === 'resolved') return 'resolved';
  if (raw === 'abandoned') return 'abandoned';
  if (raw === 'advanced' || raw === 'progressed') return 'progressed';
  return 'open';
};

function convertPack(old: any) {
  const locationIds = new Set<string>();
  old.initialState.characters.forEach((item: any) => locationIds.add(item.locationId));
  old.initialWindow.plans.forEach((plan: any) => plan.scenes.forEach((scene: any) => locationIds.add(scene.locationId)));
  if (locationIds.size < 2) locationIds.add('location_other');
  const locations = [...locationIds].map(id => ({ id: stable(id), name: String(id).replace(/_/g, ' ') }));
  const travelRules = locations.flatMap(from => locations.filter(to => to.id !== from.id)
    .map(to => ({ fromLocationId: from.id, toLocationId: to.id, minimumMinutes: 0 })));
  const characters = old.kernel.characters.map((item: any) => ({
    id: stable(item.id), name: item.name, aliases: item.aliases ?? [],
    role: item.id === old.kernel.protagonistId ? 'protagonist'
      : /opposition|opponent|antagonist|enemy/i.test(item.role) ? 'opposition' : 'supporting',
    agenda: item.agenda, competence: item.competence, constraint: item.constraint,
    moralBoundary: item.moralBoundary,
    voice: {
      register: item.voice.register || item.voice.summary,
      sentenceRhythm: item.voice.sentenceRhythm,
      directness: ['reserved', 'balanced', 'direct'].includes(item.voice.directness) ? item.voice.directness : 'balanced',
      addressRules: item.voice.addressRules, vocabulary: item.voice.vocabulary,
      reasoningStyle: item.voice.reasoningStyle ?? 'quan sát dữ kiện và cân nhắc hệ quả trước khi hành động',
      emotionDisplay: item.voice.emotionDisplay ?? 'restrained',
      humorStyle: item.voice.humorStyle ?? 'situational',
    },
  }));
  const sourcePromises: Array<{ id: string; description: string }> = old.kernel.promises.map((item: any) => ({
    id: stable(item.id), description: item.description,
  }));
  while (sourcePromises.length < 4) {
    const index = sourcePromises.length + 1;
    sourcePromises.push({
      id: `benchmark_promise_${index}`,
      description: `Cam kết dài hạn benchmark số ${index} chỉ được giải quyết ở giai đoạn sau.`,
    });
  }
  const seriesStages = Array.from({ length: 8 }, (_, index) => ({
    id: `stage_${index + 1}`,
    order: index + 1,
    targetSpanChapters: 100,
    arena: `Arena benchmark cấp ${index + 1} mở rộng quy mô và phạm vi tác động.`,
    protagonistGoal: `Hoàn thành bước tiến dài hạn cấp ${index + 1}.`,
    conflictSource: `Nguồn lực, đối tác và giới hạn hệ thống cấp ${index + 1}.`,
    rewardLoopVariant: `Biến thể vòng thưởng benchmark cấp ${index + 1}.`,
    irreversibleChange: `Năng lực và trách nhiệm không thể quay lại cấp trước sau stage ${index + 1}.`,
    entryConditions: [`Đủ điều kiện vào stage ${index + 1}.`],
    exitConditions: [`Đủ điều kiện kết thúc stage ${index + 1}.`],
    longPromiseIds: [sourcePromises[Math.min(index, sourcePromises.length - 1)].id],
    expansionSeeds: [],
  }));
  const kernel = StoryKernelSchema.parse({
    schemaVersion: 1,
    title: old.kernel.title,
    description: `${old.kernel.concept.readerFantasy} ${old.kernel.concept.uniqueMechanism}`,
    genreLane: old.kernel.genre,
    readerFantasy: old.kernel.concept.readerFantasy,
    uniqueMechanism: old.kernel.concept.uniqueMechanism,
    mechanismFingerprint: String(old.kernel.concept.signature).slice(0, 160),
    rewardLoopFingerprint: words(old.kernel.pleasure.primaryRewardLoop).slice(0, 160),
    conflictEconomyFingerprint: words(old.arc.activeConflicts.map((item: any) => item.objective)).slice(0, 160),
    protagonistId: stable(old.kernel.protagonistId), characters,
    worldModel: {
      era: old.kernel.world?.era ?? old.kernel.genre,
      baseline: words(old.kernel.worldClaims.map((item: any) => item.claim)),
      geography: locations.map(location => ({
        id: `geo_${location.id}`, name: location.name,
        role: `Địa bàn benchmark ${location.name}.`, constraints: ['Di chuyển và tài nguyên tuân theo canon hiện có.'],
      })),
      institutions: [
        {
          id: 'benchmark_institution', name: 'Hệ thống lợi ích benchmark',
          agenda: 'Phản ứng theo chi phí và quyền lợi đã khóa.',
          authority: 'Chỉ có quyền hạn được kernel khai báo.',
          resources: 'Nguồn lực hữu hạn trong state.',
        },
        {
          id: 'benchmark_counterparty', name: 'Đối tác và lực cản benchmark',
          agenda: 'Theo đuổi lợi ích riêng thay vì hỗ trợ nhân vật chính vô điều kiện.',
          authority: 'Quyền quyết định giao dịch và hợp tác trong phạm vi của mình.',
          resources: 'Vốn, quan hệ, thông tin hoặc ảnh hưởng hữu hạn.',
        },
      ],
      systems: [{
        id: 'benchmark_system', name: 'Cơ chế trung tâm benchmark',
        rules: old.kernel.worldClaims.slice(0, 6).map((item: any) => item.claim),
        limits: ['Không có tài nguyên vô nguồn hoặc tri thức toàn tri.'],
        costs: ['Mọi bước tiến phải trả thời gian, nguồn lực hoặc quan hệ.'],
      }],
    },
    progressionTracks: [{
      id: 'benchmark_progression', name: 'Tiến triển dài hạn',
      initialState: 'Điểm xuất phát của corpus benchmark.',
      terminalState: 'Đạt ending contract sau nhiều arena khác nhau.',
      milestones: seriesStages.map(stage => ({
        id: `milestone_${stage.id}`, stageId: stage.id, state: `Hoàn thành progression ${stage.id}.`,
      })),
    }, {
      id: 'benchmark_relationships', name: 'Quan hệ và quyền lực',
      initialState: 'Quan hệ chỉ ở quy mô mở đầu.',
      terminalState: 'Quan hệ phản ánh toàn bộ hậu quả dài hạn.',
      milestones: [
        { id: 'milestone_relationship_1', stageId: 'stage_1', state: 'Khóa quan hệ mở đầu.' },
        { id: 'milestone_relationship_8', stageId: 'stage_8', state: 'Khép quan hệ dài hạn.' },
      ],
    }],
    seriesSpine: {
      targetEndingRange: { minimumChapter: 800, maximumChapter: 1000 },
      stages: seriesStages,
    },
    longPromises: sourcePromises.slice(0, 4).map((item, index) => ({
      promiseId: item.id,
      openedStageId: 'stage_1',
      dueStageId: `stage_${Math.min(8, index + 2)}`,
      payoff: `Hoàn trả promise ${item.id} bằng thay đổi dài hạn có nhân quả.`,
    })),
    worldRules: old.kernel.worldClaims.map((item: any) => ({
      id: stable(item.id), claim: item.claim,
      exceptions: item.exceptions ? [String(item.exceptions)] : [],
    })),
    locations, travelRules,
    resources: old.kernel.resources.map((item: any) => item.mode === 'numeric' ? {
      id: stable(item.id), name: item.name, kind: 'numeric',
      ...(Number.isFinite(item.minimumValue) ? { minimum: item.minimumValue } : {}),
      ...(Number.isFinite(item.maximumValue) ? { maximum: item.maximumValue } : {}),
    } : { id: stable(item.id), name: item.name, kind: 'state' }),
    promises: sourcePromises,
    pleasureLoop: {
      primary: words(old.kernel.pleasure.primaryRewardLoop),
      comfort: words(old.kernel.pleasure.comfortLoop),
      setbackRecoveryChapters: old.kernel.pleasure.setbackRecoveryWindow,
    },
    endingDirection: {
      protagonistTerminalState: `${old.kernel.endingContract.materialState}; ${old.kernel.endingContract.emotionalState}`,
      worldTerminalState: old.kernel.endingContract.worldState,
      promisesToResolve: sourcePromises.map(item => item.id),
    },
  });
  const facts = old.initialState.facts.map((item: any) => ({ id: stable(item.id), value: item.value }));
  for (const plan of old.initialWindow.plans) for (const delta of plan.requiredDeltas) {
    if (delta.kind === 'character_knowledge' && !facts.some((fact: any) => fact.id === stable(delta.factId))) {
      facts.push({ id: stable(delta.factId), value: `Thông tin được học từ: ${delta.learnedFrom}` });
    }
  }
  const state = StoryStateSchema.parse({
    schemaVersion: 2, chapterNumber: 0,
    storyTimeMinutes: Math.max(0, ...old.initialState.timeline.map((item: any) => item.startMinute + item.durationMinutes), 0),
    facts,
    characters: old.initialState.characters.map((item: any) => ({
      characterId: stable(item.characterId), locationId: stable(item.locationId),
      knownFactIds: (item.knowledge ?? []).map((entry: any) => stable(entry.factId)).filter((id: string) => facts.some((fact: any) => fact.id === id)),
      relationshipState: {},
    })),
    resources: old.initialState.resources.map((item: any) => item.value.mode === 'numeric'
      ? { resourceId: stable(item.resourceId), kind: 'numeric', value: Number(item.value.amount ?? 0) }
      : { resourceId: stable(item.resourceId), kind: 'state', value: String(item.value.state ?? item.value.value ?? item.source ?? 'initial') }),
    promises: old.initialState.promises.map((item: any) => ({ promiseId: stable(item.promiseId), status: promiseStatus(item.status) })),
    recentOutcomes: [],
  });
  for (const promise of sourcePromises) {
    if (!state.promises.some(item => item.promiseId === promise.id)) {
      state.promises.push({ promiseId: promise.id, status: 'open' });
    }
  }
  const arc = ArcPlanSchema.parse({
    schemaVersion: 1, arcNumber: 1, startChapter: old.arc.startChapter, plannedEndChapter: old.arc.endChapter,
    stageId: 'stage_1',
    objective: old.arc.direction, terminalChanges: [old.arc.terminalChange],
    activeConflicts: old.arc.activeConflicts.map((item: any) => `${item.objective}; ${item.leverage}; ${item.nextMove}`),
    duePromiseIds: old.arc.duePromiseIds.map(stable),
    progression: old.arc.progressionBudget.map((item: any) => `${item.signal}: ${item.requiredChange}`),
    activeCharacterIds: characters.map((item: any) => item.id),
    activeLocationIds: locations.map(item => item.id),
    activeResourceIds: old.kernel.resources.map((item: any) => stable(item.id)),
    activeWorldRuleIds: old.kernel.worldClaims.map((item: any) => stable(item.id)),
  });
  return { kernel, state, arc };
}

async function main() {
  const checkpoint = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, 'utf8')) as {
      sourceRef?: string;
      engineRelease?: string;
      buildCostUsd?: number;
      samples?: Array<{
        id: string;
        brief: unknown;
        control: string;
        candidate: string;
        candidateTitle?: string;
        candidateCostUsd?: number;
        candidateRevisionCount?: number;
        stateAfter?: unknown;
      }>;
    }
    : {};
  if (checkpoint.sourceRef && checkpoint.sourceRef !== SOURCE_REF) {
    throw new Error(`Checkpoint source ${checkpoint.sourceRef} does not match ${SOURCE_REF}.`);
  }
  if (checkpoint.engineRelease && checkpoint.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Checkpoint release ${checkpoint.engineRelease} does not match ${STORY_FACTORY_RELEASE}.`);
  }
  const samples = checkpoint.samples ?? [];
  let totalCost = checkpoint.buildCostUsd ?? 0;
  const persist = () => writeFileSync(outputPath, `${JSON.stringify({
    sourceRef: SOURCE_REF,
    engineRelease: STORY_FACTORY_RELEASE,
    builtAt: new Date().toISOString(),
    buildCostUsd: totalCost,
    samples,
  }, null, 2)}\n`);
  await Promise.all(SLOTS.map(async slot => {
    const base = `blueprints/flagship-v3/canaries/${slot}`;
    const oldPack = fromGit<any>(`${base}/launch-pack-v3.json`);
    const converted = convertPack(oldPack);
    let state = converted.state;
    let candidatePrevious = '';
    let controlPrevious = '';
    const slotSamples: typeof samples = [];
    const candidateChapters: Array<{ chapterNumber: number; title: string; content: string }> = [];
    for (let chapterNumber = 1; chapterNumber <= 5; chapterNumber += 1) {
      const checkpointSample = samples.find(sample => sample.id === `${slot}-ch${chapterNumber}`);
      if (!checkpointSample) break;
      if (!checkpointSample.stateAfter || !checkpointSample.candidateTitle) {
        throw new Error(`Checkpoint sample ${checkpointSample.id} lacks state/title required for sequential resume.`);
      }
      state = StoryStateSchema.parse(checkpointSample.stateAfter);
      candidatePrevious = checkpointSample.candidate;
      controlPrevious = checkpointSample.control;
      slotSamples.push(checkpointSample);
      candidateChapters.push({
        chapterNumber,
        title: checkpointSample.candidateTitle,
        content: checkpointSample.candidate,
      });
      console.log(JSON.stringify({ slot, chapter: chapterNumber, samples: samples.length, resumed: true }));
    }
    while (candidateChapters.length < 5) {
      const remaining = 5 - candidateChapters.length;
      const planned = await planRollingWindow({
        kernel: converted.kernel,
        arc: converted.arc,
        state,
        routes: DEFAULT_MODEL_ROUTES,
      });
      if (planned.rollingPlan.plans.length < 1) {
        throw new Error(`Planner returned an invalid benchmark window for ${slot}.`);
      }
      const planCost = planned.usages.reduce((sum, usage) => sum + usage.costUsd, 0);
      const benchmarkPlans = planned.rollingPlan.plans.slice(0, remaining);
      // Allocate the whole call to the used samples. If Planner produced plans
      // beyond chapter five, the benchmark conservatively charges that cost.
      const allocatedPlanCost = planCost / benchmarkPlans.length;
      totalCost += planCost;
      for (const plan of benchmarkPlans) {
        const sampleId = `${slot}-ch${plan.chapterNumber}`;
        const generated = await writeStoryChapter({
          kernel: converted.kernel, state, plan, previousChapter: candidatePrevious || undefined,
          routes: DEFAULT_MODEL_ROUTES,
        });
        const candidateGenerationCost = generated.usages.reduce((sum, usage) => sum + usage.costUsd, 0);
        const candidateCostUsd = candidateGenerationCost + allocatedPlanCost;
        totalCost += candidateGenerationCost;
        const response = await geminiProvider.json({
          model: DEFAULT_MODEL_ROUTES.writer, system: legacySystem,
          prompt: JSON.stringify({
            kernel: converted.kernel,
            arc: converted.arc,
            state,
            plan,
            previousChapter: controlPrevious || null,
          }),
          schema: ChapterDraftSchema, temperature: 1,
        });
        totalCost += response.usage.costUsd;
        const control = response.value.content;
        const sample = {
          id: sampleId,
          brief: { story: converted.kernel.title, chapterNumber: plan.chapterNumber, stateBefore: state, plan },
          control,
          candidate: generated.draft.content,
          candidateTitle: generated.draft.title,
          candidateCostUsd,
          candidateRevisionCount: generated.revisionCount,
          stateAfter: generated.stateAfter,
        };
        samples.push(sample);
        slotSamples.push(sample);
        candidateChapters.push({
          chapterNumber: plan.chapterNumber,
          title: generated.draft.title,
          content: generated.draft.content,
        });
        state = generated.stateAfter;
        candidatePrevious = generated.draft.content;
        controlPrevious = control;
        persist();
        console.log(JSON.stringify({ slot, chapter: plan.chapterNumber, samples: samples.length, revision: generated.revisionCount }));
      }
    }
    const reviewed = await reviewFiveChapterWindow({
      kernel: converted.kernel,
      arc: converted.arc,
      state,
      chapters: candidateChapters,
      routes: DEFAULT_MODEL_ROUTES,
    });
    totalCost += reviewed.usage.costUsd;
    if (reviewed.review.status === 'block') {
      throw new Error(`Candidate window failed quality review for ${slot}: ${JSON.stringify(reviewed.review.issues)}`);
    }
    for (const sample of slotSamples) {
      sample.candidateCostUsd = (sample.candidateCostUsd ?? 0) + reviewed.usage.costUsd / 5;
    }
    persist();
  }));
  if (samples.length !== 20 || new Set(samples.map(sample => sample.id)).size !== 20) throw new Error('Benchmark builder did not produce 20 unique samples.');
  persist();
  console.log(JSON.stringify({ outputPath, samples: samples.length, buildCostUsd: totalCost }));
}

main().catch(error => {
  if (error && typeof error === 'object' && 'message' in error) {
    console.error(JSON.stringify({
      name: error.constructor?.name,
      message: String(error.message),
      code: 'code' in error ? error.code : null,
      evidence: 'evidence' in error ? error.evidence : null,
    }, null, 2));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

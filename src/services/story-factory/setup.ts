import { z } from 'zod';
import {
  LaunchPackSchema,
  StoryFactoryError,
  type LaunchPack,
  type ModelRoutes,
} from './contracts';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';
import { validateKernelState, validateRollingPlan } from './validation';

export const ResearchSnapshotSchema = z.object({
  snapshotId: z.string().trim().min(3),
  lane: z.string().trim().min(2).max(80),
  capturedAt: z.string().datetime(),
  signals: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    sourceUrl: z.string().url(),
    observation: z.string().trim().min(20).max(2_000),
  }).strict()).min(3).max(40),
}).strict();

export const StoryCommissionSchema = z.object({
  slotKey: z.string().trim().min(2).max(80),
  genreLane: z.string().trim().min(2).max(80),
  audience: z.string().trim().min(8).max(800),
  tone: z.string().trim().min(8).max(800),
  settingBoundary: z.string().trim().min(8).max(800),
}).strict();

export const ConceptCandidateSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  workingTitle: z.string().trim().min(4).max(180),
  premise: z.string().trim().min(30).max(2_000),
  protagonistContradiction: z.string().trim().min(20).max(1_000),
  uniqueMechanism: z.string().trim().min(20).max(1_000),
  rewardLoop: z.string().trim().min(20).max(1_000),
  conflictEconomy: z.string().trim().min(20).max(1_000),
  mechanismFingerprint: z.string().trim().min(4).max(160),
  rewardLoopFingerprint: z.string().trim().min(4).max(160),
  conflictEconomyFingerprint: z.string().trim().min(4).max(160),
  seriality30: z.array(z.string().trim().min(8).max(500)).min(6).max(12),
}).strict();

const ConceptBatchSchema = z.object({ candidates: z.array(ConceptCandidateSchema).length(6) }).strict();
const TopTwoSchema = z.object({
  selectedIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).length(2),
  reasons: z.array(z.string().trim().min(10).max(800)).length(2),
}).strict();
const OpeningSimulationSchema = z.object({
  simulations: z.array(z.object({
    conceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    chapter1: z.string().trim().min(30).max(2_000),
    chapter2: z.string().trim().min(30).max(2_000),
    chapter3: z.string().trim().min(30).max(2_000),
    serialStrength: z.string().trim().min(20).max(1_000),
    causalRisk: z.string().trim().min(10).max(1_000),
  }).strict()).length(2),
}).strict();

export interface PortfolioSignature {
  mechanismFingerprint: string;
  rewardLoopFingerprint: string;
  conflictEconomyFingerprint: string;
}

export interface SetupResult {
  launchPack: LaunchPack;
  selectedConcept: z.infer<typeof ConceptCandidateSchema>;
  candidates: z.infer<typeof ConceptCandidateSchema>[];
  usages: ProviderUsage[];
}

interface SetupStageArtifact {
  value: unknown;
  usage: ProviderUsage;
}

export interface SetupCheckpoint {
  generatorA?: SetupStageArtifact;
  generatorB?: SetupStageArtifact;
  ranking?: SetupStageArtifact;
  simulation?: SetupStageArtifact;
}

async function setupStage<T>(label: string, call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof StoryFactoryError) {
      const invalidArtifact = /structured-output JSON contract|application schema validation/u.test(error.message);
      throw new StoryFactoryError(invalidArtifact ? 'setup_blocked' : error.code, `${label}: ${error.message}`, error.evidence);
    }
    throw error;
  }
}

function tokens(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/u).filter(token => token.length > 2));
}

function jaccard(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  const intersection = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function assertPortfolioDiversity(candidate: z.infer<typeof ConceptCandidateSchema>, existing: PortfolioSignature[]): void {
  for (const signature of existing) {
    const scores = [
      jaccard(candidate.mechanismFingerprint, signature.mechanismFingerprint),
      jaccard(candidate.rewardLoopFingerprint, signature.rewardLoopFingerprint),
      jaccard(candidate.conflictEconomyFingerprint, signature.conflictEconomyFingerprint),
    ];
    if (scores.every(score => score >= 0.7)) {
      throw new StoryFactoryError('setup_blocked', 'Selected concept duplicates an existing portfolio mechanism.', { scores, signature });
    }
  }
}

function generatorPrompt(input: {
  commission: z.infer<typeof StoryCommissionSchema>;
  research: z.infer<typeof ResearchSnapshotSchema>;
  generator: 'A' | 'B';
}): string {
  return JSON.stringify({
    task: `Generator ${input.generator}: tạo đúng sáu concept khác nhau về cơ chế, reward loop và conflict economy.`,
    requirements: [
      'Cơ chế phải hoạt động trong ba chương đầu.',
      'Có vật liệu nhân quả để biến hóa ít nhất ba mươi chương.',
      'Không dựa vào đối thủ ngu, may mắn liên tục hoặc tài nguyên vô nguồn.',
      'Tên dài, trực diện, dễ hiểu với độc giả Việt.',
    ],
    commission: input.commission,
    researchSignals: input.research.signals,
  });
}

export async function runConceptLab(input: {
  commission: unknown;
  research: unknown;
  routes: ModelRoutes;
  existingSignatures?: PortfolioSignature[];
  provider?: StoryModelProvider;
  resume?: SetupCheckpoint;
  onCheckpoint?: (checkpoint: SetupCheckpoint) => Promise<void>;
}): Promise<SetupResult> {
  const commission = StoryCommissionSchema.parse(input.commission);
  const research = ResearchSnapshotSchema.parse(input.research);
  if (commission.genreLane !== research.lane) throw new StoryFactoryError('setup_blocked', 'Research lane does not match the commission.');
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
  const checkpoint: SetupCheckpoint = structuredClone(input.resume ?? {});

  const [a, b] = await Promise.all([
    checkpoint.generatorA
      ? Promise.resolve({ value: ConceptBatchSchema.parse(checkpoint.generatorA.value), usage: checkpoint.generatorA.usage })
      : setupStage('Concept Generator A', provider.json({
      model: input.routes.setupGeneratorA,
      system: 'Bạn là Concept Generator độc lập. Chỉ dùng research làm tín hiệu thị trường, không sao chép tác phẩm hoặc tên riêng.',
      prompt: generatorPrompt({ commission, research, generator: 'A' }),
      schema: ConceptBatchSchema,
      temperature: 1,
    })),
    checkpoint.generatorB
      ? Promise.resolve({ value: ConceptBatchSchema.parse(checkpoint.generatorB.value), usage: checkpoint.generatorB.usage })
      : setupStage('Concept Generator B', provider.json({
      model: input.routes.setupGeneratorB,
      system: 'Bạn là Concept Generator độc lập. Chủ động tìm hướng khác Generator A có thể nghĩ tới; không sao chép tác phẩm hoặc tên riêng.',
      prompt: generatorPrompt({ commission, research, generator: 'B' }),
      schema: ConceptBatchSchema,
      temperature: 1,
    })),
  ]);
  checkpoint.generatorA = a;
  checkpoint.generatorB = b;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(a.usage, b.usage);
  const candidates = [...a.value.candidates, ...b.value.candidates];
  if (new Set(candidates.map(candidate => candidate.id)).size !== 12) {
    throw new StoryFactoryError('setup_blocked', 'Concept generators returned duplicate candidate IDs.');
  }

  const ranking = checkpoint.ranking
    ? { value: TopTwoSchema.parse(checkpoint.ranking.value), usage: checkpoint.ranking.usage }
    : await setupStage('Blind Concept Judge', provider.json({
    model: input.routes.setupJudge,
    system: 'Bạn là Blind Concept Judge. Chọn theo sức hút, nhân quả thế giới và khả năng serial; không biết model nào tạo concept.',
    prompt: JSON.stringify({ task: 'Chọn đúng hai concept mạnh nhất.', commission, candidates }),
    schema: TopTwoSchema,
    temperature: 0.5,
  }));
  checkpoint.ranking = ranking;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(ranking.usage);
  const top = ranking.value.selectedIds.map(id => candidates.find(candidate => candidate.id === id));
  if (top.some(candidate => !candidate) || new Set(ranking.value.selectedIds).size !== 2) {
    throw new StoryFactoryError('setup_blocked', 'Concept Judge selected invalid candidates.');
  }

  const simulation = checkpoint.simulation
    ? { value: OpeningSimulationSchema.parse(checkpoint.simulation.value), usage: checkpoint.simulation.usage }
    : await setupStage('Opening Simulator', provider.json({
    model: input.routes.openingSimulator,
    system: 'Bạn mô phỏng logic mở đầu, không viết prose hoàn chỉnh và không thay đổi concept.',
    prompt: JSON.stringify({ task: 'Mô phỏng diễn biến chương 1-3 cho cả hai concept.', commission, concepts: top }),
    schema: OpeningSimulationSchema,
    temperature: 0.8,
  }));
  checkpoint.simulation = simulation;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(simulation.usage);
  const simulatedIds = simulation.value.simulations.map(item => item.conceptId);
  if (new Set(simulatedIds).size !== 2 || simulatedIds.some(id => !ranking.value.selectedIds.includes(id))) {
    throw new StoryFactoryError('setup_blocked', 'Opening Simulator returned the wrong concept set.');
  }

  const launch = await setupStage('Launch Architect', provider.json({
    model: input.routes.launchArchitect,
    system: `Bạn là Launch Architect cuối cùng. Phản hồi bằng đúng một object JSON LaunchPack duy nhất, tuyệt đối không bọc trong array.
Chọn một concept rồi dựng duy nhất StoryKernel, Arc 20-30 chương, State chương 0 và rolling plan chương 1-5.
Mỗi stable ID phải nhất quán. initialState.recentEvents phải là mảng rỗng vì chưa có chương nào được commit.
initialState phải có đúng một entry cho mọi character, resource và promise đã khai báo trong kernel; không được thiếu hoặc thêm ID lạ.
Plan chỉ chứa cơ học, không chứa thoại hay câu văn mẫu. Mỗi scene phải gắn ít nhất một requiredDeltaId và mọi required delta phải thuộc một scene.
Với từng participant, travelMinutesFromPrevious phải bằng hoặc lớn hơn travel rule từ vị trí hiện tại/scene trước tới scene mới; không dịch chuyển khi thiếu travel rule.
Nếu participant kết thúc chương ở location khác StoryState đầu chương, plan phải có đúng một location delta before/after khớp vị trí đầu và scene cuối.
Mọi resource transaction phải có nguồn/sink và số học before+delta=after.`,
    prompt: JSON.stringify({
      task: 'Chọn một concept bằng bằng chứng mô phỏng và xuất LaunchPack hoàn chỉnh.',
      commission,
      researchSignals: research.signals,
      concepts: top,
      openingSimulations: simulation.value.simulations,
    }),
    schema: LaunchPackSchema,
    temperature: 0.7,
    constrainSchema: false,
  }));
  usages.push(launch.usage);
  if (!ranking.value.selectedIds.includes(launch.value.selectedConceptId)) {
    throw new StoryFactoryError('setup_blocked', 'Launch Architect selected a concept outside the top two.');
  }
  const selectedConcept = candidates.find(candidate => candidate.id === launch.value.selectedConceptId)!;
  if (launch.value.kernel.mechanismFingerprint !== selectedConcept.mechanismFingerprint
    || launch.value.kernel.rewardLoopFingerprint !== selectedConcept.rewardLoopFingerprint
    || launch.value.kernel.conflictEconomyFingerprint !== selectedConcept.conflictEconomyFingerprint) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack fingerprints drifted from the selected concept.');
  }
  assertPortfolioDiversity(selectedConcept, input.existingSignatures ?? []);
  if (launch.value.initialState.chapterNumber !== 0 || launch.value.arc.startChapter !== 1
    || launch.value.initialRollingPlan.startChapter !== 1 || launch.value.initialRollingPlan.plans.length !== 5) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack must start from chapter zero and plan chapters one through five.');
  }
  validateKernelState(launch.value.kernel, launch.value.initialState);
  validateRollingPlan({
    kernel: launch.value.kernel,
    arc: launch.value.arc,
    state: launch.value.initialState,
    rollingPlan: launch.value.initialRollingPlan,
  });
  return { launchPack: launch.value, selectedConcept, candidates, usages };
}

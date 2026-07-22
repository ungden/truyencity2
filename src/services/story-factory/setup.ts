import { z } from 'zod';
import {
  LaunchPackSchema,
  StoryFactoryError,
  type LaunchPack,
  type ModelRoutes,
} from './contracts';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider, toGeminiResponseSchema } from './provider';
import { validateKernelState } from './validation';

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
  premise: z.string().trim().min(30).max(600),
  protagonistContradiction: z.string().trim().min(20).max(300),
  uniqueMechanism: z.string().trim().min(20).max(400),
  rewardLoop: z.string().trim().min(20).max(400),
  conflictEconomy: z.string().trim().min(20).max(400),
  mechanismFingerprint: z.string().trim().min(4).max(160),
  rewardLoopFingerprint: z.string().trim().min(4).max(160),
  conflictEconomyFingerprint: z.string().trim().min(4).max(160),
  seriality30: z.array(z.string().trim().min(8).max(220)).min(6).max(10),
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
    domainFeasibility: z.enum(['pass', 'reject']),
    requiredInfrastructure: z.array(z.string().trim().min(5).max(500)).min(1).max(12),
    minimumPlausibleTimeline: z.string().trim().min(3).max(500),
    criticalAssumptions: z.array(z.string().trim().min(5).max(500)).min(1).max(12),
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
  domainResearch?: SetupStageArtifact;
  simulation?: SetupStageArtifact;
}

// This is only a provider transport envelope, not a fifth story artifact.
// Keeping the constrained response flat avoids asking Gemini's decoder to
// materialize every nested state-delta union at once. Each canonical artifact
// is still parsed independently and fail-closed below.
const LaunchPackWireSchema = z.object({
  v: z.literal(1),
  selectedConceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  kernelJson: z.string().trim().min(2),
  arcJson: z.string().trim().min(2),
  initialStateJson: z.string().trim().min(2),
  coverPrompt: z.string().trim().min(20).max(2_000),
}).strict();

function materializeLaunchPack(wire: z.infer<typeof LaunchPackWireSchema>): LaunchPack {
  try {
    return LaunchPackSchema.parse({
      schemaVersion: 1,
      selectedConceptId: wire.selectedConceptId,
      kernel: JSON.parse(wire.kernelJson),
      arc: JSON.parse(wire.arcJson),
      initialState: JSON.parse(wire.initialStateJson),
      coverPrompt: wire.coverPrompt,
    });
  } catch (error) {
    const evidence = error instanceof z.ZodError
      ? error.issues
      : [{ message: error instanceof Error ? error.message : String(error) }];
    throw new StoryFactoryError('setup_blocked', 'Launch Architect produced an invalid canonical launch pack.', evidence);
  }
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
      'Mỗi concept.id phải là stable ID ASCII chữ thường: bắt đầu bằng a-z, sau đó chỉ dùng a-z, 0-9, dấu gạch dưới hoặc gạch ngang; dài 2-64 ký tự.',
      'Cơ chế phải hoạt động trong ba chương đầu.',
      'Có vật liệu nhân quả để biến hóa ít nhất ba mươi chương.',
      'Không dựa vào đối thủ ngu, may mắn liên tục hoặc tài nguyên vô nguồn.',
      'Tên dài, trực diện, dễ hiểu với độc giả Việt.',
      'Viết metadata cô đọng: mỗi ý một hoặc hai câu, seriality30 đúng sáu ý; không diễn giải lại research.',
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

  const domainResearch = checkpoint.domainResearch
    ? { value: z.string().min(20).parse(checkpoint.domainResearch.value), usage: checkpoint.domainResearch.usage }
    : await setupStage('Grounded Domain Research', provider.text({
      model: input.routes.openingSimulator,
      system: `Bạn là technical researcher cho story setup. Dùng Google Search kiểm tra các claim kỹ thuật cốt lõi của mười hai concept trước khi Judge chọn.
Ưu tiên cơ quan nhà nước, tiêu chuẩn, tài liệu học thuật hoặc tổ chức chuyên ngành. Nhóm các concept cùng cơ chế để báo cáo cô đọng; nêu rõ claim sai, hạ tầng, thời gian, năng lượng, vệ sinh/an toàn, nguồn lực và điều kiện tối thiểu. Không viết truyện, không chọn concept.`,
      prompt: JSON.stringify({ commission, researchSignals: research.signals, concepts: candidates }),
      temperature: 0.2,
      grounding: 'google_search',
    }));
  checkpoint.domainResearch = domainResearch;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(domainResearch.usage);

  const ranking = checkpoint.ranking && input.resume?.domainResearch
    ? { value: TopTwoSchema.parse(checkpoint.ranking.value), usage: checkpoint.ranking.usage }
    : await setupStage('Blind Concept Judge', provider.json({
    model: input.routes.setupJudge,
    system: `Bạn là Blind Concept Judge. Chọn theo sức hút, nhân quả thế giới và khả năng serial; không biết model nào tạo concept.
Grounded Domain Research là ràng buộc: không chọn concept dựa trên claim bị research bác hoặc đòi hạ tầng, vốn, thời gian, năng lượng hay mức an toàn trái commission.`,
    prompt: JSON.stringify({
      task: 'Chọn đúng hai concept mạnh nhất và khả thi về domain.',
      commission,
      groundedDomainResearch: domainResearch.value,
      candidates,
    }),
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

  const simulation = checkpoint.simulation && input.resume?.domainResearch
    ? { value: OpeningSimulationSchema.parse(checkpoint.simulation.value), usage: checkpoint.simulation.usage }
    : await setupStage('Opening Simulator', provider.json({
    model: input.routes.openingSimulator,
    system: `Bạn mô phỏng logic mở đầu, không viết prose hoàn chỉnh và không thay đổi concept.
Đánh domainFeasibility=reject nếu ba chương đầu đòi hạ tầng, vốn, thời gian, năng lượng, kỹ năng hoặc mức an toàn không thực tế. Không được coi kiến thức tương lai là vật tư hay thời gian miễn phí.`,
    prompt: JSON.stringify({
      task: 'Mô phỏng diễn biến chương 1-3 và audit tính khả thi domain cho cả hai concept.',
      commission,
      researchSignals: research.signals,
      groundedDomainResearch: domainResearch.value,
      concepts: top,
    }),
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
  if (!simulation.value.simulations.some(item => item.domainFeasibility === 'pass')) {
    throw new StoryFactoryError('setup_blocked', 'Opening Simulator rejected both concepts on domain causality.', simulation.value.simulations);
  }

  const launchWire = await setupStage('Launch Architect', provider.json({
    model: input.routes.launchArchitect,
    system: `Bạn là Launch Architect cuối cùng. Phản hồi bằng đúng envelope JSON được yêu cầu, tuyệt đối không bọc trong array.
kernelJson, arcJson và initialStateJson là chuỗi chứa JSON hợp lệ của từng artifact; không markdown và không chú thích ngoài JSON.
Chọn một concept rồi dựng duy nhất StoryKernel, Arc 20-30 chương và State chương 0. Không lập rolling plan; Planner riêng sẽ làm việc đó sau setup.
Mỗi stable ID phải nhất quán. initialState.schemaVersion phải bằng 2 và initialState.recentOutcomes phải là mảng rỗng vì chưa có chương nào được commit.
initialState phải có đúng một entry cho mọi character, resource và promise đã khai báo trong kernel; không được thiếu hoặc thêm ID lạ.
travelRules là đồ thị có hướng: từ vị trí ban đầu của protagonist phải đi được tới mọi location đã khai và từ mỗi location phải có đường quay về, trực tiếp hoặc qua location trung gian. Không được chỉ khai một chiều.
Chỉ được chọn concept có domainFeasibility=pass. requiredInfrastructure, minimumPlausibleTimeline và criticalAssumptions của mô phỏng là ràng buộc bắt buộc: phản ánh chúng trong world rules và State ban đầu; không ghi trước kết quả của chương tương lai vào State.`,
    prompt: JSON.stringify({
      task: 'Chọn một concept bằng bằng chứng mô phỏng và xuất LaunchPack hoàn chỉnh.',
      wireMapping: 'Đặt từng object canonical tương ứng vào kernelJson, arcJson và initialStateJson bằng JSON.stringify; không đổi tên field.',
      canonicalLaunchPackSchema: toGeminiResponseSchema(LaunchPackSchema),
      commission,
      researchSignals: research.signals,
      concepts: top,
      openingSimulations: simulation.value.simulations,
    }),
    schema: LaunchPackWireSchema,
    temperature: 0.3,
  }));
  usages.push(launchWire.usage);
  const launch = materializeLaunchPack(launchWire.value);
  if (!ranking.value.selectedIds.includes(launch.selectedConceptId)) {
    throw new StoryFactoryError('setup_blocked', 'Launch Architect selected a concept outside the top two.');
  }
  const selectedSimulation = simulation.value.simulations.find(item => item.conceptId === launch.selectedConceptId);
  if (!selectedSimulation || selectedSimulation.domainFeasibility !== 'pass') {
    throw new StoryFactoryError('setup_blocked', 'Launch Architect selected a concept rejected by the domain-causality audit.', selectedSimulation);
  }
  const selectedConcept = candidates.find(candidate => candidate.id === launch.selectedConceptId)!;
  if (launch.kernel.mechanismFingerprint !== selectedConcept.mechanismFingerprint
    || launch.kernel.rewardLoopFingerprint !== selectedConcept.rewardLoopFingerprint
    || launch.kernel.conflictEconomyFingerprint !== selectedConcept.conflictEconomyFingerprint) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack fingerprints drifted from the selected concept.');
  }
  assertPortfolioDiversity(selectedConcept, input.existingSignatures ?? []);
  if (launch.initialState.chapterNumber !== 0 || launch.arc.startChapter !== 1) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack must start from chapter zero and arc one.');
  }
  try {
    validateKernelState(launch.kernel, launch.initialState);
  } catch (error) {
    if (error instanceof StoryFactoryError) {
      throw new StoryFactoryError('setup_blocked', `Launch pack failed canonical validation: ${error.message}`, error.evidence);
    }
    throw error;
  }
  return { launchPack: launch, selectedConcept, candidates, usages };
}

import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ArcPlanSchema,
  InitialArcPlanSchema,
  InitialStoryStateSchema,
  LaunchPackSchema,
  StoryCharacterSchema,
  StoryFactoryError,
  StoryKernelSchema,
  WorldMechanicSchema,
  type LaunchPack,
  type ModelRoutes,
} from './contracts';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';
import {
  validateArcAgainstKernel,
  validateArcResourceReachability,
  validateKernelState,
} from './validation';

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
  realityMode: z.enum(['grounded', 'speculative']),
  audience: z.string().trim().min(8).max(800),
  tone: z.string().trim().min(8).max(800),
  settingBoundary: z.string().trim().min(8).max(800),
}).strict();

export const ConceptCandidateSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  workingTitle: z.string().trim().min(4).max(180),
  premise: z.string().trim().min(30).max(1_200),
  protagonistContradiction: z.string().trim().min(20).max(1_200),
  uniqueMechanism: z.string().trim().min(20).max(1_200),
  rewardLoop: z.string().trim().min(20).max(1_200),
  conflictEconomy: z.string().trim().min(20).max(1_200),
  mechanismFingerprint: z.string().trim().min(4).max(240),
  rewardLoopFingerprint: z.string().trim().min(4).max(240),
  conflictEconomyFingerprint: z.string().trim().min(4).max(240),
  seriality30: z.array(z.string().trim().min(8).max(500)).min(6).max(10),
  seriality1000: z.array(z.string().trim().min(12).max(700)).min(8).max(15),
  earlyEndingRisk: z.string().trim().min(20).max(1_200),
}).strict();

const ConceptBatchSchema = z.object({ candidates: z.array(ConceptCandidateSchema).length(6) }).strict();
const ConceptCandidateWireSchema = ConceptCandidateSchema.omit({ id: true });
const ConceptBatchWireSchema = z.object({
  candidates: z.array(ConceptCandidateWireSchema).length(6),
}).strict();
const TopTwoSchema = z.object({
  selectedIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).length(2),
  reasons: z.array(z.string().trim().min(10).max(4_000)).length(2),
}).strict();
const OpeningSimulationSchema = z.object({
  simulations: z.array(z.object({
    conceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    openingSample: z.string().trim().min(20).max(12_000),
    chapter2Direction: z.string().trim().min(30).max(4_000),
    chapter3Direction: z.string().trim().min(30).max(4_000),
    characterChemistry: z.string().trim().min(20).max(4_000),
    conflictAgency: z.string().trim().min(20).max(4_000),
    serialStrength: z.string().trim().min(20).max(4_000),
    causalRisk: z.string().trim().min(10).max(4_000),
    domainFeasibility: z.enum(['pass', 'reject']),
    longRunFeasibility: z.enum(['pass', 'reject']),
    macroStageStress: z.array(z.string().trim().min(10).max(2_000)).min(4).max(8),
    requiredInfrastructure: z.array(z.string().trim().min(5).max(2_000)).min(1).max(12),
    minimumPlausibleTimeline: z.string().trim().min(3).max(2_000),
    criticalAssumptions: z.array(z.string().trim().min(5).max(2_000)).min(1).max(12),
  }).strict()).length(2),
}).strict();

function exactIdSchema(ids: string[]) {
  if (!ids.length) throw new StoryFactoryError('setup_blocked', 'A setup stage has no valid IDs to constrain.');
  return z.enum(ids as [string, ...string[]]);
}

function topTwoSchemaFor(candidateIds: string[]) {
  return TopTwoSchema.extend({
    selectedIds: z.array(exactIdSchema(candidateIds)).length(2),
  }).strict();
}

function openingSimulationSchemaFor(conceptIds: string[]) {
  return OpeningSimulationSchema.extend({
    simulations: z.array(OpeningSimulationSchema.shape.simulations.element.extend({
      conceptId: exactIdSchema(conceptIds),
    }).strict()).length(2),
  }).strict();
}

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

export const SETUP_CHECKPOINT_VERSION = 'story-factory-setup-checkpoint-2-no-simulated-canon';

export interface SetupCheckpointProvenance {
  version: typeof SETUP_CHECKPOINT_VERSION;
  commissionDigest: string;
  researchDigest: string;
  setupRouteDigest: string;
}

export interface SetupCheckpoint {
  provenance: SetupCheckpointProvenance;
  generatorA?: SetupStageArtifact;
  generatorB?: SetupStageArtifact;
  ranking?: SetupStageArtifact;
  domainResearch?: SetupStageArtifact;
  simulation?: SetupStageArtifact;
  launchIdentity?: SetupStageArtifact;
  launchWorld?: SetupStageArtifact;
  launchSeries?: SetupStageArtifact;
  launchState?: SetupStageArtifact;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildSetupCheckpointProvenance(input: {
  commission: z.infer<typeof StoryCommissionSchema>;
  research: z.infer<typeof ResearchSnapshotSchema>;
  routes: ModelRoutes;
}): SetupCheckpointProvenance {
  return {
    version: SETUP_CHECKPOINT_VERSION,
    commissionDigest: sha256(input.commission),
    researchDigest: sha256(input.research),
    setupRouteDigest: sha256({
      setupGeneratorA: input.routes.setupGeneratorA,
      setupGeneratorB: input.routes.setupGeneratorB,
      setupJudge: input.routes.setupJudge,
      openingSimulator: input.routes.openingSimulator,
      launchArchitect: input.routes.launchArchitect,
    }),
  };
}

const StoryKernelObjectSchema = StoryKernelSchema.innerType();
const LaunchIdentityKernelSchema = StoryKernelObjectSchema.pick({
  schemaVersion: true,
  title: true,
  description: true,
  genreLane: true,
  readerFantasy: true,
  uniqueMechanism: true,
  mechanismFingerprint: true,
  rewardLoopFingerprint: true,
  conflictEconomyFingerprint: true,
  pleasureLoop: true,
});
const LaunchIdentitySchema = z.object({
  selectedConceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  coverPrompt: z.string().trim().min(20).max(2_000),
  kernel: LaunchIdentityKernelSchema.extend({
    realityMode: StoryKernelObjectSchema.shape.realityMode,
    protagonistId: StoryKernelObjectSchema.shape.protagonistId,
    characters: StoryKernelObjectSchema.shape.characters,
  }),
}).strict();
const LaunchCharacterWireSchema = StoryCharacterSchema.omit({ id: true });
const LaunchIdentityWireSchema = z.object({
  selectedConceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  coverPrompt: z.string().trim().min(20).max(2_000),
  kernel: LaunchIdentityKernelSchema,
  protagonist: LaunchCharacterWireSchema.extend({ role: z.literal('protagonist') }).strict(),
  oppositionCharacters: z.array(
    LaunchCharacterWireSchema.extend({ role: z.literal('opposition') }).strict(),
  ).min(1).max(20),
  supportingCharacters: z.array(
    LaunchCharacterWireSchema.extend({ role: z.literal('supporting') }).strict(),
  ).min(1).max(40),
}).strict();

function materializeLaunchCharacters(value: z.infer<typeof LaunchIdentityWireSchema>) {
  const protagonist = { ...value.protagonist, id: 'character_protagonist_01' };
  const oppositionCharacters = value.oppositionCharacters.map((character, index) => ({
    ...character,
    id: `character_opposition_${String(index + 1).padStart(2, '0')}`,
  }));
  const supportingCharacters = value.supportingCharacters.map((character, index) => ({
    ...character,
    id: `character_supporting_${String(index + 1).padStart(2, '0')}`,
  }));
  return { protagonist, oppositionCharacters, supportingCharacters };
}
const LaunchWorldSchema = z.object({
  kernel: StoryKernelObjectSchema.pick({
    worldModel: true,
    worldMechanics: true,
    worldRules: true,
    locations: true,
    travelRules: true,
    resources: true,
  }),
}).strict();
const LaunchWorldWireBaseSchema = z.object({
  kernel: StoryKernelObjectSchema.pick({
    worldModel: true,
    worldRules: true,
    locations: true,
    travelRules: true,
    resources: true,
  }),
  conversions: z.array(WorldMechanicSchema.options[0]).min(1).max(34),
  capabilities: z.array(WorldMechanicSchema.options[1]).min(1).max(34),
  constraints: z.array(WorldMechanicSchema.options[2]).min(1).max(34),
}).strict();
export function createLaunchWorldWireSchema(characterIds: string[]) {
  const ids = [...new Set(characterIds)];
  if (!ids.length) throw new StoryFactoryError('setup_blocked', 'Launch Identity has no character IDs for capability ownership.');
  const actorId = z.enum(ids as [string, ...string[]]);
  const capability = WorldMechanicSchema.options[1].extend({
    allowedActorIds: z.array(actorId).max(40).default([]),
  }).strict();
  return LaunchWorldWireBaseSchema.extend({
    capabilities: z.array(capability).min(1).max(34),
  }).strict();
}
const LaunchSeriesSchema = z.object({
  kernel: StoryKernelObjectSchema.pick({
    progressionTracks: true,
    seriesSpine: true,
    longPromises: true,
    promises: true,
    endingDirection: true,
  }),
}).strict();
export const LaunchStateSchema = z.object({
  arc: InitialArcPlanSchema,
  initialState: InitialStoryStateSchema,
}).strict();

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

function parseSetupArtifact<S extends z.ZodTypeAny>(label: string, schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new StoryFactoryError('setup_blocked', `${label} failed canonical validation.`, parsed.error.issues);
  }
  return parsed.data;
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

const GROUNDED_EXTERNAL_METRIC = /(?:lượt\s*(?:xem|hiển\s*thị|tiếp\s*cận)|traffic|impressions?|reach|xếp\s*hạng|thứ\s*hạng|ranking)/iu;

export function assertGroundedMechanicSemantics(
  kernel: Pick<LaunchPack['kernel'], 'realityMode' | 'resources' | 'worldMechanics'>,
): void {
  if (kernel.realityMode !== 'grounded') return;
  const resources = new Map(kernel.resources.map(resource => [resource.id, resource]));
  for (const mechanic of kernel.worldMechanics) {
    if (mechanic.kind !== 'capability') continue;
    for (const effect of mechanic.effectResources) {
      const resource = resources.get(effect.resourceId);
      if (!resource || resource.kind !== 'numeric' || effect.direction !== 'increase') continue;
      const metricLabel = `${resource.name} ${resource.unit}`;
      if (resource.ownerEntityId !== null
        && !mechanic.allowedActorIds.includes(resource.ownerEntityId)
        && GROUNDED_EXTERNAL_METRIC.test(metricLabel)) {
        throw new StoryFactoryError(
          'setup_blocked',
          'Grounded capability cannot directly manufacture an externally owned demand or ranking metric.',
          {
            mechanicId: mechanic.id,
            resourceId: resource.id,
            ownerEntityId: resource.ownerEntityId,
            allowedActorIds: mechanic.allowedActorIds,
            instruction: 'Track the actor-controlled action as a fact/resource. Model any later platform or audience response with its own causal actor, delay and prerequisites, or leave the external metric out of the numeric ledger.',
          },
        );
      }
    }
  }
}

function assertLaunchSemantics(
  launch: LaunchPack,
  commission: z.infer<typeof StoryCommissionSchema>,
): void {
  const kernel = launch.kernel;
  if (jaccard(kernel.readerFantasy, `${commission.audience} ${commission.tone} ${commission.settingBoundary}`) >= 0.72) {
    throw new StoryFactoryError('setup_blocked', 'Kernel readerFantasy merely repeats the commission instead of defining a story-specific desire.');
  }

  assertVoiceSemantics(kernel.characters);
  assertIdentityOpposition(kernel);
  assertGroundedMechanicSemantics(kernel);

  const stages = kernel.seriesSpine.stages;
  for (let index = 1; index < stages.length; index += 1) {
    const previous = stages[index - 1];
    const current = stages[index];
    const conflictSimilarity = jaccard(previous.conflictSource, current.conflictSource);
    const rewardSimilarity = jaccard(previous.rewardLoopVariant, current.rewardLoopVariant);
    if (conflictSimilarity >= 0.62 && rewardSimilarity >= 0.62) {
      throw new StoryFactoryError('setup_blocked', 'Adjacent series stages only rename the arena without changing conflict economy or reward loop.', {
        previousStageId: previous.id,
        currentStageId: current.id,
        conflictSimilarity,
        rewardSimilarity,
      });
    }
  }
  if (!kernel.worldMechanics.some(mechanic => mechanic.kind === 'conversion')
    || !kernel.worldMechanics.some(mechanic => mechanic.kind === 'capability')
    || !kernel.worldMechanics.some(mechanic => mechanic.kind === 'constraint')) {
    throw new StoryFactoryError('setup_blocked', 'Kernel must define at least one conversion, capability, and constraint mechanic.');
  }
}

function assertIdentityOpposition(kernel: Pick<LaunchPack['kernel'], 'protagonistId' | 'characters'>): void {
  const protagonist = kernel.characters.find(character =>
    character.id === kernel.protagonistId && character.role === 'protagonist');
  const opposition = kernel.characters.filter(character => character.role === 'opposition');
  if (!protagonist || opposition.length === 0) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Kernel requires a protagonist and at least one opposition character with an independent agenda.',
      {
        protagonistId: kernel.protagonistId,
        cast: kernel.characters.map(character => ({ id: character.id, role: character.role })),
      },
    );
  }
  if (opposition.every(character => jaccard(character.agenda, protagonist.agenda) >= 0.7)) {
    throw new StoryFactoryError('setup_blocked', 'Opposition agendas are not materially independent from the protagonist.', {
      protagonistId: protagonist.id,
      oppositionIds: opposition.map(character => character.id),
    });
  }
}

export function assertVoiceSemantics(characters: LaunchPack['kernel']['characters']): void {
  const cannedGesture = /\n|^[—-]\s|(?<!\p{L})(?:cười|nhếch|quát\s+(?:lên|rằng|mắng|thẳng)|gằn\s+(?:giọng|từng)|lẩm bẩm|nói rằng|ánh mắt)(?!\p{L})/iu;
  const containsQuotedSentence = (value: string): boolean => {
    const quotedSegments = [
      ...value.matchAll(/"([^"\n]*)"/gu),
      ...value.matchAll(/'([^'\n]*)'/gu),
      ...value.matchAll(/“([^”\n]*)”/gu),
      ...value.matchAll(/‘([^’\n]*)’/gu),
    ];
    return quotedSegments.some(match => (match[1]?.trim().split(/\s+/u).length ?? 0) >= 5);
  };
  for (const character of characters) {
    const voiceValues = [
      character.voice.register,
      character.voice.sentenceRhythm,
      character.voice.addressRules,
      character.voice.vocabulary,
      character.voice.reasoningStyle,
    ];
    if (voiceValues.some(value => cannedGesture.test(value) || containsQuotedSentence(value))) {
      throw new StoryFactoryError('setup_blocked', 'Voice contract contains sample prose, dialogue, or canned gesture.', {
        characterId: character.id,
      });
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
      'Không tạo ID; code sẽ gán stable ID bất biến theo generator và vị trí.',
      'Cơ chế phải hoạt động trong ba chương đầu.',
      'Có vật liệu nhân quả để biến hóa ít nhất ba mươi chương.',
      'Có 8-15 arena/giai đoạn thực sự khác nhau để đi đến 800-1.200 chương; seriality1000 phải mô tả biến đổi macro, không đổi tên cùng một vòng lặp.',
      'Nêu earlyEndingRisk: vì sao truyện có thể cạn sớm và cơ chế nào ngăn điều đó mà không sinh filler.',
          'Không dựa vào đối thủ ngu, may mắn liên tục hoặc tài nguyên vô nguồn.',
          'Tên dài, trực diện, dễ hiểu với độc giả Việt.',
          'Mỗi mechanismFingerprint, rewardLoopFingerprint và conflictEconomyFingerprint chỉ là một cụm phân loại tối đa 12 từ; không giải thích, không viết thành câu dài.',
          'Viết metadata cô đọng: mỗi ý một hoặc hai câu, seriality30 đúng sáu ý và seriality1000 từ tám đến mười lăm ý; không diễn giải lại research.',
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
  const groundedRealityPolicy = commission.realityMode === 'grounded'
    ? 'Đây là bối cảnh grounded: claim vật lý, kỹ thuật, nghề nghiệp, tiền, thời gian, an toàn và hạ tầng phải khả thi ngoài đời; không được dùng phép màu để lấp lỗ nhân quả.'
    : 'Đây là bối cảnh speculative: chấp nhận tiên đề siêu nhiên riêng của truyện, không bác nó chỉ vì trái vật lý Trái Đất. Hãy kiểm tính nhất quán nội tại, nguồn năng lượng/vật tư, actor có quyền, chi phí, giới hạn, thời gian và hậu quả xã hội; kiến thức thực chỉ dùng để kiểm phần tương tự đời thật.';
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
  const provenance = buildSetupCheckpointProvenance({
    commission,
    research,
    routes: input.routes,
  });
  if (input.resume
    && JSON.stringify(input.resume.provenance) !== JSON.stringify(provenance)) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Setup checkpoint belongs to a different commission, research snapshot, or setup route.',
      {
        expected: provenance,
        actual: input.resume.provenance ?? null,
      },
    );
  }
  const checkpoint: SetupCheckpoint = structuredClone(input.resume ?? { provenance });

  const generateConceptBatch = async (generator: 'A' | 'B') => {
    const generated = await setupStage(`Concept Generator ${generator}`, provider.json({
      model: generator === 'A' ? input.routes.setupGeneratorA : input.routes.setupGeneratorB,
      system: generator === 'A'
        ? 'Bạn là Concept Generator độc lập. Chỉ dùng research làm tín hiệu thị trường, không sao chép tác phẩm hoặc tên riêng.'
        : 'Bạn là Concept Generator độc lập. Chủ động tìm hướng khác Generator A có thể nghĩ tới; không sao chép tác phẩm hoặc tên riêng.',
      prompt: generatorPrompt({ commission, research, generator }),
      schema: ConceptBatchWireSchema,
      temperature: 1,
    }));
    return {
      value: ConceptBatchSchema.parse({
        candidates: generated.value.candidates.map((candidate, index) => ({
          id: `concept_${generator.toLowerCase()}_${String(index + 1).padStart(2, '0')}`,
          ...candidate,
        })),
      }),
      usage: generated.usage,
    };
  };

  const [a, b] = await Promise.all([
    checkpoint.generatorA
      ? Promise.resolve({ value: ConceptBatchSchema.parse(checkpoint.generatorA.value), usage: checkpoint.generatorA.usage })
      : generateConceptBatch('A'),
    checkpoint.generatorB
      ? Promise.resolve({ value: ConceptBatchSchema.parse(checkpoint.generatorB.value), usage: checkpoint.generatorB.usage })
      : generateConceptBatch('B'),
  ]);
  checkpoint.generatorA = a;
  checkpoint.generatorB = b;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(a.usage, b.usage);
  const candidates = [...a.value.candidates, ...b.value.candidates];
  if (new Set(candidates.map(candidate => candidate.id)).size !== 12) {
    throw new StoryFactoryError('setup_blocked', 'Concept generators returned duplicate candidate IDs.');
  }
  const rankingSchema = topTwoSchemaFor(candidates.map(candidate => candidate.id));

  const domainResearch = checkpoint.domainResearch
    ? { value: z.string().min(20).parse(checkpoint.domainResearch.value), usage: checkpoint.domainResearch.usage }
    : await setupStage('Grounded Domain Research', provider.text({
      model: input.routes.openingSimulator,
      system: `Bạn là technical researcher cho story setup. Dùng Google Search kiểm tra các claim kỹ thuật cốt lõi của mười hai concept trước khi Judge chọn.
Ưu tiên cơ quan nhà nước, tiêu chuẩn, tài liệu học thuật hoặc tổ chức chuyên ngành. Nhóm các concept cùng cơ chế để báo cáo cô đọng; nêu rõ claim sai, hạ tầng, thời gian, năng lượng, vệ sinh/an toàn, nguồn lực và điều kiện tối thiểu. Không viết truyện, không chọn concept.`,
      prompt: JSON.stringify({
        realityPolicy: groundedRealityPolicy,
        commission,
        researchSignals: research.signals,
        concepts: candidates,
      }),
      temperature: 0.2,
      grounding: 'google_search',
    }));
  checkpoint.domainResearch = domainResearch;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(domainResearch.usage);

  const ranking = checkpoint.ranking && input.resume?.domainResearch
    ? { value: rankingSchema.parse(checkpoint.ranking.value), usage: checkpoint.ranking.usage }
    : await setupStage('Blind Concept Judge', provider.json({
    model: input.routes.setupJudge,
    system: `Bạn là Blind Concept Judge. Chọn theo sức hút, nhân quả thế giới và khả năng serial; không biết model nào tạo concept.
Grounded Domain Research là ràng buộc theo realityPolicy. Áp dụng realityPolicy trước khi đọc research. Với grounded, không chọn claim bị research bác hoặc đòi hạ tầng, vốn, thời gian, năng lượng hay mức an toàn trái commission. Với speculative, tiền đề siêu nhiên được phép; chỉ loại khi concept không khóa được logic nội tại, nguồn lực, chi phí, giới hạn, actor hoặc hậu quả.`,
    prompt: JSON.stringify({
      task: 'Chọn đúng hai concept mạnh nhất và khả thi về domain.',
      realityPolicy: groundedRealityPolicy,
      commission,
      groundedDomainResearch: domainResearch.value,
      candidates,
    }),
    schema: rankingSchema,
    temperature: 0.5,
  }));
  checkpoint.ranking = ranking;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(ranking.usage);
  const top = ranking.value.selectedIds.map(id => candidates.find(candidate => candidate.id === id));
  if (top.some(candidate => !candidate) || new Set(ranking.value.selectedIds).size !== 2) {
    throw new StoryFactoryError('setup_blocked', 'Concept Judge selected invalid candidates.');
  }
  const simulationSchema = openingSimulationSchemaFor(ranking.value.selectedIds);

  const simulation = checkpoint.simulation && input.resume?.domainResearch
    ? { value: simulationSchema.parse(checkpoint.simulation.value), usage: checkpoint.simulation.usage }
    : await setupStage('Opening Simulator', provider.json({
    model: input.routes.openingSimulator,
    system: `Bạn là Opening Simulator độc lập và không thay đổi concept.
Với mỗi concept, viết actual opening sample tiếng Việt đủ dài để đánh giá như một cảnh mở đầu hoàn chỉnh: có nhân vật hành động, đối thoại tự nhiên, đối lực có agenda riêng và một thay đổi cụ thể. Không kéo dài để đạt số từ. Đây là mẫu để chọn concept, không phải canon và không được đưa vào Kernel.
Sau sample, mô tả ngắn hướng chương 2 và 3, chemistry nhân vật, agency của xung đột và audit seriality/nhân quả.
Đánh domainFeasibility=reject nếu ba chương đầu đòi hạ tầng, vốn, thời gian, năng lượng, kỹ năng hoặc mức an toàn không thực tế. Không được coi kiến thức tương lai là vật tư hay thời gian miễn phí.
Phải áp dụng realityPolicy: grounded dùng chuẩn thực tế ngoài đời; speculative chấp nhận tiên đề siêu nhiên nhưng vẫn reject nếu thiếu nguồn năng lượng/vật tư, actor có quyền, chi phí, giới hạn, thời gian hoặc hậu quả nhất quán trong chính thế giới đó.
Đánh longRunFeasibility=reject nếu concept có thể kết thúc ở arc đầu, chỉ lặp một vòng kiếm tiền/sức mạnh, hoặc không có đủ arena, xung đột và progression cho 800-1.200 chương.`,
    prompt: JSON.stringify({
      task: 'Viết opening sample thật cho cả hai concept, sau đó audit hướng chương 2-3 và tính khả thi dài hạn.',
      realityPolicy: groundedRealityPolicy,
      commission,
      researchSignals: research.signals,
      groundedDomainResearch: domainResearch.value,
      concepts: top,
    }),
    schema: simulationSchema,
    temperature: 0.8,
  }));
  checkpoint.simulation = simulation;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(simulation.usage);
  const simulatedIds = simulation.value.simulations.map(item => item.conceptId);
  if (new Set(simulatedIds).size !== 2 || simulatedIds.some(id => !ranking.value.selectedIds.includes(id))) {
    throw new StoryFactoryError('setup_blocked', 'Opening Simulator returned the wrong concept set.');
  }
  if (!simulation.value.simulations.some(item => item.domainFeasibility === 'pass' && item.longRunFeasibility === 'pass')) {
    throw new StoryFactoryError('setup_blocked', 'Opening Simulator rejected both concepts on domain causality or long-run seriality.', simulation.value.simulations);
  }
  const launchableConceptIds = simulation.value.simulations
    .filter(item => item.domainFeasibility === 'pass' && item.longRunFeasibility === 'pass')
    .map(item => item.conceptId);
  const launchIdentityWireSchema = LaunchIdentityWireSchema.extend({
    selectedConceptId: exactIdSchema(launchableConceptIds),
  }).strict();

  let launchIdentity: { value: z.infer<typeof LaunchIdentitySchema>; usage: ProviderUsage };
  if (checkpoint.launchIdentity) {
    launchIdentity = {
      value: LaunchIdentitySchema.parse(checkpoint.launchIdentity.value),
      usage: checkpoint.launchIdentity.usage,
    };
  } else {
    const launchIdentityWire = await setupStage('Launch Identity Architect', provider.json({
      model: input.routes.launchArchitect,
      system: `Bạn chịu trách nhiệm chọn concept và khóa bản sắc truyện. Trả đúng structured-output schema, không markdown.
Chọn dựa trên chất lượng actual opening sample, chemistry nhân vật, agency của đối lực và khả năng biến hóa; không chỉ dựa vào metadata cơ chế. Opening sample chỉ là bằng chứng lựa chọn: tuyệt đối không chép câu, cử chỉ hoặc thoại từ sample vào Kernel.
VoiceContract chỉ được dùng thuộc tính trung tính register, sentenceRhythm, directness, addressRules, vocabulary, reasoningStyle, emotionDisplay và humorStyle. Không chứa câu thoại, cử chỉ, phản ứng mẫu, stressResponse hoặc avoidances.
sentenceRhythm chỉ mô tả độ dài, nhịp và cấu trúc câu; không mô tả âm lượng, động tác phát ngôn hoặc thói quen như cười, nhếch, quát, gằn giọng, lẩm bẩm.
Xuất đúng một protagonist, ít nhất một opposition có agenda độc lập thật sự và ít nhất một supporting character. Không dùng supporting character làm đối thủ giả.
Không tạo ID cho nhân vật; code sẽ gán stable ID bất biến theo vai trò và thứ tự.
Chỉ được chọn concept có domainFeasibility=pass và longRunFeasibility=pass. Giữ nguyên ba fingerprint của concept được chọn.`,
      prompt: JSON.stringify({
        task: 'Chọn concept và xuất identity, cast phân vai bắt buộc, voice, pleasure loop cùng cover art prompt.',
        commission,
        researchSignals: research.signals,
        concepts: top,
        openingSimulations: simulation.value.simulations,
      }),
      schema: launchIdentityWireSchema,
      schemaComplexity: 'omit_large_array_max',
      temperature: 0.3,
    }));
    const characters = materializeLaunchCharacters(launchIdentityWire.value);
    launchIdentity = {
      value: LaunchIdentitySchema.parse({
        selectedConceptId: launchIdentityWire.value.selectedConceptId,
        coverPrompt: launchIdentityWire.value.coverPrompt,
        kernel: {
          ...launchIdentityWire.value.kernel,
          realityMode: commission.realityMode,
          protagonistId: characters.protagonist.id,
          characters: [
            characters.protagonist,
            ...characters.oppositionCharacters,
            ...characters.supportingCharacters,
          ],
        },
      }),
      usage: launchIdentityWire.usage,
    };
  }
  checkpoint.launchIdentity = launchIdentity;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(launchIdentity.usage);
  assertVoiceSemantics(launchIdentity.value.kernel.characters);
  assertIdentityOpposition(launchIdentity.value.kernel);
  if (!ranking.value.selectedIds.includes(launchIdentity.value.selectedConceptId)) {
    throw new StoryFactoryError('setup_blocked', 'Launch Architect selected a concept outside the top two.');
  }
  const selectedSimulation = simulation.value.simulations.find(item => item.conceptId === launchIdentity.value.selectedConceptId);
  if (!selectedSimulation || selectedSimulation.domainFeasibility !== 'pass' || selectedSimulation.longRunFeasibility !== 'pass') {
    throw new StoryFactoryError('setup_blocked', 'Launch Architect selected a concept rejected by the domain or long-run audit.', selectedSimulation);
  }
  const selectedConcept = candidates.find(candidate => candidate.id === launchIdentity.value.selectedConceptId)!;
  if (launchIdentity.value.kernel.mechanismFingerprint !== selectedConcept.mechanismFingerprint
    || launchIdentity.value.kernel.rewardLoopFingerprint !== selectedConcept.rewardLoopFingerprint
    || launchIdentity.value.kernel.conflictEconomyFingerprint !== selectedConcept.conflictEconomyFingerprint) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack fingerprints drifted from the selected concept.');
  }

  let launchWorld: { value: z.infer<typeof LaunchWorldSchema>; usage: ProviderUsage };
  if (checkpoint.launchWorld) {
    launchWorld = {
      value: LaunchWorldSchema.parse(checkpoint.launchWorld.value),
      usage: checkpoint.launchWorld.usage,
    };
  } else {
    const launchWorldWire = await setupStage('Launch World Architect', provider.json({
      model: input.routes.launchArchitect,
      system: `Bạn khóa world canon riêng của truyện đã chọn. Trả đúng structured-output schema, không markdown.
WorldModel phải khóa thời đại, địa lý, tổ chức, hệ thống vận hành, giới hạn và chi phí. Mọi geography.role là mô tả có nghĩa.
travelRules là đồ thị có hướng: từ vị trí mở đầu dự kiến phải đi được tới mọi location và có đường quay về. Không biến kiến thức thành vật tư, thời gian hoặc năng lượng miễn phí.
Mỗi resource bắt buộc khóa ownerEntityId: dùng character/institution ID thực sự sở hữu ledger đó; chỉ dùng null cho đại lượng môi trường hoặc tài nguyên chung thực sự không có chủ. Numeric resource phải có unit vật lý hoặc tiền tệ rõ ràng như VND, kg, lít, chiếc, điểm; không dùng một con số vô đơn vị. Mọi direction increase/decrease là theo số dư của ownerEntityId, không theo người đang thực hiện capability. Nếu owner trả tiền thì delta phải decrease; nếu owner nhận tiền thì delta phải increase.
Trả mechanics trong đúng ba mảng conversions, capabilities và constraints; mỗi mảng có ít nhất một phần tử đúng kind. Conversion chỉ ghi tổng input bị tiêu thụ và output tạo ra theo mỗi batch; tỷ lệ hao hụt nằm trong chênh lệch lượng input/output, còn phụ phẩm cần theo dõi là một output riêng. Capability ghi actor/fact/resource cấp quyền, công suất và chính xác effectResources/effectFactIds mà nó được phép làm thay đổi. Mỗi effectResources entry phải khóa direction=increase|decrease cho tài nguyên số hoặc state_change cho tài nguyên trạng thái; ví dụ tài trợ vào quỹ theo dõi là increase, chi quỹ là decrease, sửa trạng thái vật phẩm là state_change.
Constraint chỉ là guard cho một hành động: requiredFacts phải đang đúng và forbiddenFacts không được bằng expected thì hành động mới được phép. Constraint không bao giờ tự tạo fact/resource/state effect. Nếu một trigger tự động gây phản phệ, hư hỏng, thưởng/phạt hoặc thay đổi trạng thái cần theo dõi, phải mô hình hóa hậu quả đó bằng capability/conversion có actor và effect tương ứng; không được khai báo chính trigger fact là forbidden rồi dùng constraint để tạo hậu quả. Không giấu số học hoặc quyền hạn trong prose worldRules.
Capability.allowedActorIds chỉ được dùng character ID có trong identity/cast đã khóa; organization, institution, location và resource không phải actor vật lý của scene. Năng lực của tổ chức phải được thực hiện qua một nhân vật đại diện có trong cast và authority/fact phù hợp.
Mọi vật tư đầu vào của cơ chế arc đầu phải có đường đạt được: hoặc có sẵn hợp lý ở State ban đầu, hoặc là output của chuỗi conversion bắt đầu từ tài nguyên có sẵn. Mua/thu mua là conversion từ tiền hoặc vật trao đổi sang hàng; khai thác/sản xuất cũng phải có conversion riêng của truyện. Không cho tài nguyên xuất hiện chỉ nhờ source/sink prose.
Trong bối cảnh grounded, hành động do nhân vật kiểm soát như phân tích dữ liệu, sửa metadata/menu, đăng nội dung hay đề xuất chiến thuật không được trực tiếp tăng ledger bên ngoài như lượt xem, traffic, reach hoặc thứ hạng. Chỉ commit hành động/fact mà nhân vật thực sự kiểm soát; phản ứng của nền tảng/khán giả phải là cơ chế riêng có actor, độ trễ và prerequisite hợp lý, hoặc không đưa metric đó vào numeric resource.
World rules, resource và tổ chức phải phản ánh requiredInfrastructure, minimumPlausibleTimeline và criticalAssumptions đã được mô phỏng.`,
      prompt: JSON.stringify({
        task: 'Xuất phần world canon cho identity đã khóa.',
        commission,
        groundedDomainResearch: domainResearch.value,
        selectedConcept,
        selectedSimulation,
        identity: launchIdentity.value.kernel,
      }),
      schema: createLaunchWorldWireSchema(launchIdentity.value.kernel.characters.map(character => character.id)),
      schemaComplexity: 'omit_large_array_max',
      temperature: 0.3,
    }));
    launchWorld = {
      value: LaunchWorldSchema.parse({
        kernel: {
          ...launchWorldWire.value.kernel,
          worldMechanics: [
            ...launchWorldWire.value.conversions,
            ...launchWorldWire.value.capabilities,
            ...launchWorldWire.value.constraints,
          ],
        },
      }),
      usage: launchWorldWire.usage,
    };
  }
  checkpoint.launchWorld = launchWorld;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(launchWorld.usage);

  const launchSeries = checkpoint.launchSeries
    ? { value: LaunchSeriesSchema.parse(checkpoint.launchSeries.value), usage: checkpoint.launchSeries.usage }
    : await setupStage('Launch Series Architect', provider.json({
    model: input.routes.launchArchitect,
    system: `Bạn khóa đại cương dài hạn của đúng truyện và world canon đã chọn. Trả đúng structured-output schema, không markdown.
seriesSpine có 8-15 stage liên tục, tổng target 800-1.200 chương; mỗi stage phải đổi arena, conflict economy hoặc reward-loop variant và có entry/exit cụ thể.
progressionTracks có ít nhất hai trục, milestone dùng stable stage ID. longPromises có ít nhất bốn promise phân bổ nhiều stage.
Mọi longPromises.promiseId, stages[].longPromiseIds và endingDirection.promisesToResolve phải tham chiếu ID trong promises. longPromises chỉ lập lịch mở/đến hạn, không thay thế định nghĩa promise.`,
    prompt: JSON.stringify({
      task: 'Xuất progression, series spine, promise ledger và ending direction.',
      selectedConcept,
      selectedSimulation,
      identity: launchIdentity.value.kernel,
      world: launchWorld.value.kernel,
    }),
    schema: LaunchSeriesSchema,
    schemaComplexity: 'omit_array_max',
    temperature: 0.3,
    }));
  checkpoint.launchSeries = launchSeries;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(launchSeries.usage);

  const kernel = parseSetupArtifact('StoryKernel', StoryKernelSchema, {
    ...launchIdentity.value.kernel,
    ...launchWorld.value.kernel,
    ...launchSeries.value.kernel,
  });
  const launchState = checkpoint.launchState
    ? { value: LaunchStateSchema.parse(checkpoint.launchState.value), usage: checkpoint.launchState.usage }
    : await setupStage('Launch State Architect', provider.json({
    model: input.routes.launchArchitect,
    system: `Bạn chỉ tạo Arc đầu 20-30 chương và StoryState chương 0 từ canon đã khóa. Trả đúng structured-output schema, không markdown.
Arc gắn stage đầu; mọi active ID phải có trong Kernel. State không ghi trước kết quả tương lai.
Arc.activeMechanicIds chỉ chứa mechanic dùng trong arc đầu. Mọi requiredFacts của capability/constraint đang active phải có fact và expected value tương ứng trong initialState.
Mọi đầu vào và resource điều kiện của activeMechanicIds phải có đường nhân quả từ initialState: số dư dương có nguồn gốc hợp lý hoặc output của active conversion bắt đầu từ tài nguyên đang có. activeResourceIds có thể chứa tài nguyên chỉ để theo dõi về sau, nhưng Planner không được thay đổi nó trước khi có mechanic hợp lệ. Nếu cần mua vật tư để dùng ngay, phải kích hoạt conversion thu mua tương ứng; không đặt vật tư bằng 0 rồi trông chờ Planner tự bịa nguồn.
initialState.schemaVersion=2, chapterNumber=0, recentOutcomes=[] và usedExpansionSeedIds=[].
encounteredCharacterIds là nguồn sự thật exact-ID duy nhất về việc hai nhân vật đã từng gặp trực tiếp trước chương 1; phải đối xứng hai chiều. relationshipState chỉ mô tả thái độ hiện tại như tin tưởng, dè chừng, mang ơn hoặc thù địch, không dùng câu "chưa biết/chưa gặp/lần đầu" để mã hóa lịch sử gặp mặt.
State có đúng một entry cho mọi character, resource và promise trong Kernel; không thiếu, không thêm ID lạ.`,
    prompt: JSON.stringify({
      task: 'Xuất Arc đầu và State chương 0.',
      selectedConcept,
      kernel,
    }),
    schema: LaunchStateSchema,
    schemaComplexity: 'omit_large_array_max',
    temperature: 0.3,
    }));
  checkpoint.launchState = launchState;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(launchState.usage);

  const launch = parseSetupArtifact('LaunchPack', LaunchPackSchema, {
    schemaVersion: 2,
    selectedConceptId: launchIdentity.value.selectedConceptId,
    kernel,
    arc: launchState.value.arc,
    initialState: launchState.value.initialState,
    coverPrompt: launchIdentity.value.coverPrompt,
  });
  assertLaunchSemantics(launch, commission);
  assertPortfolioDiversity(selectedConcept, input.existingSignatures ?? []);
  if (launch.initialState.chapterNumber !== 0
    || launch.initialState.storyTimeMinutes !== 0
    || launch.initialState.recentOutcomes.length
    || launch.initialState.usedExpansionSeedIds.length
    || launch.arc.startChapter !== 1) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack must start before chapter one with no simulated canon or consumed expansion seeds.');
  }
  try {
    validateKernelState(launch.kernel, launch.initialState);
    validateArcAgainstKernel(launch.kernel, ArcPlanSchema.parse(launch.arc));
    validateArcResourceReachability({
      kernel: launch.kernel,
      arc: ArcPlanSchema.parse(launch.arc),
      state: launch.initialState,
    });
  } catch (error) {
    if (error instanceof StoryFactoryError) {
      throw new StoryFactoryError('setup_blocked', `Launch pack failed canonical validation: ${error.message}`, error.evidence);
    }
    throw error;
  }
  return { launchPack: launch, selectedConcept, candidates, usages };
}

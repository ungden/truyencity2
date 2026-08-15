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
  ARC_ACTIVE_MECHANIC_BUDGET,
  validateArcActivationBudget,
  validateArcAgainstKernel,
  assertRenewableConversionInputs,
  assertRenewableMechanicSet,
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

export const MarketBlueprintSchema = z.object({
  familiarArena: z.string().trim().min(20).max(800),
  noveltyCollision: z.string().trim().min(20).max(800),
  protagonistStartingPosition: z.string().trim().min(20).max(800),
  coreAdvantage: z.string().trim().min(20).max(800),
  comparisonEngine: z.string().trim().min(20).max(1_000),
  worldConflictEngine: z.string().trim().min(20).max(1_000),
  earlyPayoffs: z.array(z.object({
    byChapter: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7), z.literal(10)]),
    payoff: z.string().trim().min(20).max(800),
    visibleTo: z.string().trim().min(10).max(500),
    positionChange: z.string().trim().min(20).max(800),
    nextPressure: z.string().trim().min(20).max(800),
  }).strict()).length(5),
  scaleLadder: z.array(z.object({
    // A scope is a label (e.g. "Đội", "Tỉnh", "Liên minh"), while the
    // arena/opposition fields carry the substantive detail.
    scope: z.string().trim().min(3).max(120),
    arena: z.string().trim().min(20).max(800),
    statusPrize: z.string().trim().min(20).max(800),
    oppositionClass: z.string().trim().min(20).max(800),
    advantageEvolution: z.string().trim().min(20).max(800),
  }).strict()).min(6).max(8),
}).strict().superRefine((blueprint, ctx) => {
  const requiredChapters = [1, 3, 5, 7, 10];
  const actualChapters = blueprint.earlyPayoffs.map(item => item.byChapter).sort((a, b) => a - b);
  if (actualChapters.some((chapter, index) => chapter !== requiredChapters[index])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earlyPayoffs'],
      message: 'Market blueprint must lock one payoff at each chapter 1, 3, 5, 7, and 10.',
    });
  }
});
export type MarketBlueprint = z.infer<typeof MarketBlueprintSchema>;

/**
 * Every canonical story must carry its market/world contract after setup. Keeping
 * this as a named fail-closed parser prevents later stages and operational tools
 * from quietly treating a missing blueprint as an optional legacy field.
 */
export function requireMarketBlueprint(value: unknown): MarketBlueprint {
  const parsed = MarketBlueprintSchema.safeParse(value);
  if (!parsed.success) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Market blueprint is required and must be valid before a new story can leave setup.',
      { issues: parsed.error.issues },
    );
  }
  return parsed.data;
}

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
  marketBlueprint: MarketBlueprintSchema,
  seriality30: z.array(z.string().trim().min(8).max(500)).min(6).max(10),
  seriality1000: z.array(z.string().trim().min(12).max(700)).min(8).max(15),
  earlyEndingRisk: z.string().trim().min(20).max(1_200),
}).strict();

const ConceptBatchSchema = z.object({ candidates: z.array(ConceptCandidateSchema).length(6) }).strict();
const ConceptCandidateWireSchema = ConceptCandidateSchema.omit({ id: true });
const ConceptBatchWireSchema = z.object({
  // Unconstrained Gemini JSON mode can return a complete but short batch. The
  // generator tops it up on the same route before canonical length-6 parsing.
  candidates: z.array(ConceptCandidateWireSchema).min(1).max(6),
}).strict();
const ConceptTripleBatchWireSchema = z.object({
  candidates: z.array(ConceptCandidateWireSchema).length(3),
}).strict();
const ConceptPairBatchWireSchema = z.object({
  candidates: z.array(ConceptCandidateWireSchema).length(2),
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

export const SETUP_CHECKPOINT_VERSION = 'story-factory-setup-checkpoint-7-opening-execution-proof';

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
const LaunchSeriesKernelBaseSchema = StoryKernelObjectSchema.pick({
  progressionTracks: true,
  seriesSpine: true,
  longPromises: true,
  promises: true,
  endingDirection: true,
});
const LaunchSeriesSchema = z.object({
  kernel: LaunchSeriesKernelBaseSchema.extend({
    progressionTracks: LaunchSeriesKernelBaseSchema.shape.progressionTracks.min(3),
    longPromises: LaunchSeriesKernelBaseSchema.shape.longPromises.min(6),
    promises: LaunchSeriesKernelBaseSchema.shape.promises.min(6),
  }),
}).strict().superRefine((value, ctx) => {
  value.kernel.seriesSpine.stages.forEach((stage, index) => {
    if (index > 0 && stage.expansionSeeds.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 2,
        type: 'array',
        inclusive: true,
        path: ['kernel', 'seriesSpine', 'stages', index, 'expansionSeeds'],
        message: 'Later series stages need at least two concrete world expansions.',
      });
    }
  });
});
const OpeningPayoffProofSchema = z.object({
  byChapter: z.union([z.literal(1), z.literal(3)]),
  steps: z.array(z.object({
    mechanicId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    actorId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    quantity: z.number().int().min(1).max(1_000_000),
  }).strict()).min(1).max(24),
  resourceClaims: z.array(z.object({
    resourceId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    minimumProduced: z.number().finite().positive().max(1_000_000_000_000),
  }).strict()).min(1).max(8),
  witnessCharacterIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).min(1).max(8),
  pressureCharacterIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).min(1).max(8),
}).strict();

export const LaunchStateSchema = z.object({
  arc: InitialArcPlanSchema,
  initialState: InitialStoryStateSchema,
  openingPayoffProofs: z.array(OpeningPayoffProofSchema).length(2),
}).strict();

export function validateOpeningPayoffProofs(input: {
  kernel: z.infer<typeof StoryKernelSchema>;
  arc: z.infer<typeof InitialArcPlanSchema>;
  state: z.infer<typeof InitialStoryStateSchema>;
  proofs: z.infer<typeof OpeningPayoffProofSchema>[];
}): void {
  const { kernel, arc, state, proofs } = input;
  const ordered = [...proofs].sort((a, b) => a.byChapter - b.byChapter);
  if (ordered.length !== 2 || ordered[0]?.byChapter !== 1 || ordered[1]?.byChapter !== 3) {
    throw new StoryFactoryError('setup_blocked', 'Opening payoff execution proof must cover chapter 1 and chapter 3 exactly.');
  }
  const characters = new Map(kernel.characters.map(character => [character.id, character]));
  const mechanics = new Map(kernel.worldMechanics.map(mechanic => [mechanic.id, mechanic]));
  const resources = new Map(kernel.resources.map(resource => [resource.id, resource]));
  const activeCharacterIds = new Set(arc.activeCharacterIds);
  const activeMechanicIds = new Set(arc.activeMechanicIds);
  const balances = new Map(state.resources.flatMap(resource => (
    resource.kind === 'numeric' ? [[resource.resourceId, resource.value] as const] : []
  )));
  const openingBalances = new Map(balances);
  const facts = new Map(state.facts.map(fact => [fact.id, fact.value]));
  const produced = new Map<string, number>();

  for (const proof of ordered) {
    for (const witnessId of proof.witnessCharacterIds) {
      const witness = characters.get(witnessId);
      if (!witness || !activeCharacterIds.has(witnessId) || witness.role === 'protagonist') {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff witness must be an active non-protagonist character.', {
          byChapter: proof.byChapter,
          witnessId,
        });
      }
    }
    for (const pressureId of proof.pressureCharacterIds) {
      const pressure = characters.get(pressureId);
      if (!pressure || !activeCharacterIds.has(pressureId) || pressure.role !== 'opposition') {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff pressure must name an active opposition character.', {
          byChapter: proof.byChapter,
          pressureId,
        });
      }
    }
    for (const [stepIndex, step] of proof.steps.entries()) {
      const mechanic = mechanics.get(step.mechanicId);
      const actor = characters.get(step.actorId);
      if (!mechanic || !activeMechanicIds.has(step.mechanicId)) {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff proof uses a mechanic outside the initial arc.', {
          byChapter: proof.byChapter,
          stepIndex,
          mechanicId: step.mechanicId,
        });
      }
      if (!actor || !activeCharacterIds.has(step.actorId)) {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff proof uses an actor outside the initial arc.', {
          byChapter: proof.byChapter,
          stepIndex,
          actorId: step.actorId,
        });
      }
      if (mechanic.kind === 'constraint') {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff execution steps must create effects, not list a constraint as an action.', {
          byChapter: proof.byChapter,
          stepIndex,
          mechanicId: mechanic.id,
        });
      }
      if (mechanic.kind === 'conversion') {
        if (mechanic.maximumBatchesPerUse !== null && step.quantity > mechanic.maximumBatchesPerUse) {
          throw new StoryFactoryError('setup_blocked', 'Opening payoff proof exceeds a conversion batch limit.', {
            byChapter: proof.byChapter,
            stepIndex,
            mechanicId: mechanic.id,
            quantity: step.quantity,
            maximumBatchesPerUse: mechanic.maximumBatchesPerUse,
          });
        }
        for (const item of mechanic.inputsPerBatch) {
          const required = item.amount * step.quantity;
          const available = balances.get(item.resourceId) ?? 0;
          if (available + 1e-9 < required) {
            throw new StoryFactoryError('setup_blocked', 'Opening payoff proof consumes a resource before producing enough of it.', {
              byChapter: proof.byChapter,
              stepIndex,
              mechanicId: mechanic.id,
              resourceId: item.resourceId,
              required,
              available,
            });
          }
        }
        for (const item of mechanic.inputsPerBatch) {
          balances.set(item.resourceId, (balances.get(item.resourceId) ?? 0) - item.amount * step.quantity);
        }
        for (const item of mechanic.outputsPerBatch) {
          const amount = item.amount * step.quantity;
          balances.set(item.resourceId, (balances.get(item.resourceId) ?? 0) + amount);
          produced.set(item.resourceId, (produced.get(item.resourceId) ?? 0) + amount);
        }
      } else {
        if (mechanic.allowedActorIds.length && !mechanic.allowedActorIds.includes(step.actorId)) {
          throw new StoryFactoryError('setup_blocked', 'Opening payoff proof assigns a capability to an unauthorized actor.', {
            byChapter: proof.byChapter,
            stepIndex,
            mechanicId: mechanic.id,
            actorId: step.actorId,
          });
        }
        for (const condition of mechanic.requiredFacts) {
          const actual = facts.get(condition.factId);
          if (actual === undefined || String(actual) !== String(condition.expected)) {
            throw new StoryFactoryError('setup_blocked', 'Opening payoff proof uses a capability before its required fact is true.', {
              byChapter: proof.byChapter,
              stepIndex,
              mechanicId: mechanic.id,
              factId: condition.factId,
              expected: condition.expected,
              actual: actual ?? null,
            });
          }
        }
        for (const resourceId of mechanic.requiredResourceIds) {
          if ((balances.get(resourceId) ?? 0) <= 0) {
            throw new StoryFactoryError('setup_blocked', 'Opening payoff proof uses a capability before its required resource exists.', {
              byChapter: proof.byChapter,
              stepIndex,
              mechanicId: mechanic.id,
              resourceId,
            });
          }
        }
        mechanic.effectFactIds.forEach(factId => facts.set(factId, '1'));
      }
    }
    let protagonistMaterialClaim = false;
    for (const claim of proof.resourceClaims) {
      const definition = resources.get(claim.resourceId);
      if (!definition || definition.kind !== 'numeric' || !arc.activeResourceIds.includes(claim.resourceId)) {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff proof claims a non-numeric or inactive resource.', {
          byChapter: proof.byChapter,
          resourceId: claim.resourceId,
        });
      }
      const actual = produced.get(claim.resourceId) ?? 0;
      if (actual + 1e-9 < claim.minimumProduced) {
        throw new StoryFactoryError('setup_blocked', 'Opening payoff proof does not actually produce its claimed material result.', {
          byChapter: proof.byChapter,
          resourceId: claim.resourceId,
          minimumProduced: claim.minimumProduced,
          actualProduced: actual,
        });
      }
      if (
        definition.ownerEntityId === kernel.protagonistId
        && (balances.get(claim.resourceId) ?? 0) > (openingBalances.get(claim.resourceId) ?? 0) + 1e-9
      ) protagonistMaterialClaim = true;
    }
    if (!protagonistMaterialClaim) {
      throw new StoryFactoryError('setup_blocked', 'Opening payoff proof must leave a net increase in a protagonist-owned numeric resource.', {
        byChapter: proof.byChapter,
        resourceIds: proof.resourceClaims.map(claim => claim.resourceId),
      });
    }
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

function mergeStageUsage(first: ProviderUsage, second: ProviderUsage): ProviderUsage {
  return {
    ...second,
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    costUsd: first.costUsd + second.costUsd,
    grounding: first.grounding || second.grounding
      ? {
        searchQueries: [...(first.grounding?.searchQueries ?? []), ...(second.grounding?.searchQueries ?? [])],
        sourceUrls: [...(first.grounding?.sourceUrls ?? []), ...(second.grounding?.sourceUrls ?? [])],
      }
      : undefined,
  };
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

const MARKET_TITLE_SEPARATOR = /[:：,，]/u;
const MARKET_TITLE_HOOK = /(?:khởi\s*đầu|mở\s*đầu|trùng\s*sinh|xuyên\s*(?:không|việt|qua|về|đến)|toàn\s*dân|vạn\s*giới|mỗi\s*ngày|của\s*ta|ta\s+(?:có|là|dùng|mang|triệu\s*hoán|thức\s*tỉnh|bắt\s*đầu)|từ\s+.+\s+đến)/iu;

/**
 * Faloo-style packaging sells the genre, protagonist advantage and first fantasy
 * before the reader opens chapter one. Vietnamese needs more words than Chinese,
 * so the contract is deliberately based on words and a generous cover-safe cap.
 */
export function assertMarketableSerialTitle(title: string): void {
  const words = title.trim().split(/\s+/u).filter(Boolean);
  const hasPackagingStructure = MARKET_TITLE_SEPARATOR.test(title) || MARKET_TITLE_HOOK.test(title);
  if (words.length < 7 || words.length > 26 || !hasPackagingStructure) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Story title does not expose a marketable genre/identity hook and reader fantasy.',
      {
        title,
        wordCount: words.length,
        instruction: 'Use 7-26 Vietnamese words. Prefer “đề tài/thân phận: lợi thế hoặc payoff cụ thể”; a hook-led title without punctuation is allowed only when it still names the premise directly.',
      },
    );
  }
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
  selectedConcept: z.infer<typeof ConceptCandidateSchema>,
): void {
  const kernel = launch.kernel;
  if (jaccard(kernel.readerFantasy, `${commission.audience} ${commission.tone} ${commission.settingBoundary}`) >= 0.72) {
    throw new StoryFactoryError('setup_blocked', 'Kernel readerFantasy merely repeats the commission instead of defining a story-specific desire.');
  }

  assertVoiceSemantics(kernel.characters);
  assertIdentityOpposition(kernel);
  assertGroundedMechanicSemantics(kernel);

  const world = kernel.worldModel;
  if (world.geography.length < 4 || world.institutions.length < 4 || world.systems.length < 2) {
    throw new StoryFactoryError(
      'setup_blocked',
      'World setup is too small to sustain market escalation beyond an opening occupation or location.',
      {
        geography: world.geography.length,
        institutions: world.institutions.length,
        systems: world.systems.length,
        minimums: { geography: 4, institutions: 4, systems: 2 },
      },
    );
  }

  const blueprint = selectedConcept.marketBlueprint;
  for (let index = 1; index < blueprint.scaleLadder.length; index += 1) {
    const previous = blueprint.scaleLadder[index - 1];
    const current = blueprint.scaleLadder[index];
    if (jaccard(previous.arena, current.arena) >= 0.68
      && jaccard(previous.oppositionClass, current.oppositionClass) >= 0.68) {
      throw new StoryFactoryError('setup_blocked', 'Market scale ladder only renames the same arena and opposition class.', {
        previousScope: previous.scope,
        currentScope: current.scope,
      });
    }
  }

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
  const stagesWithoutExpansion = stages.filter((stage, index) => index > 0 && stage.expansionSeeds.length < 2);
  if (stagesWithoutExpansion.length) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Later series stages must seed at least two concrete world expansions instead of stretching the same setup.',
      { stageIds: stagesWithoutExpansion.map(stage => stage.id) },
    );
  }
  if (kernel.progressionTracks.length < 3 || kernel.longPromises.length < 6) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Long-form setup needs at least three independent progression tracks and six staged promises.',
      { progressionTracks: kernel.progressionTracks.length, longPromises: kernel.longPromises.length },
    );
  }
  if (launch.arc.progression.length < 5
    || launch.arc.terminalChanges.length < 3
    || launch.arc.activeConflicts.length < 2) {
    throw new StoryFactoryError(
      'setup_blocked',
      'Opening arc does not contain enough payoff steps, terminal movement, and independent pressure.',
      {
        progression: launch.arc.progression.length,
        terminalChanges: launch.arc.terminalChanges.length,
        activeConflicts: launch.arc.activeConflicts.length,
      },
    );
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

function assertLaunchWorldReferences(
  identity: z.infer<typeof LaunchIdentitySchema>['kernel'],
  world: z.infer<typeof LaunchWorldSchema>['kernel'],
): void {
  const resourceIds = new Set(world.resources.map(resource => resource.id));
  const missingResourceIds = new Set<string>();
  for (const mechanic of world.worldMechanics) {
    if (mechanic.kind === 'conversion') {
      [...mechanic.inputsPerBatch, ...mechanic.outputsPerBatch].forEach(item => {
        if (!resourceIds.has(item.resourceId)) missingResourceIds.add(item.resourceId);
      });
    } else if (mechanic.kind === 'capability') {
      mechanic.requiredResourceIds.forEach(resourceId => {
        if (!resourceIds.has(resourceId)) missingResourceIds.add(resourceId);
      });
      mechanic.effectResources.forEach(effect => {
        if (!resourceIds.has(effect.resourceId)) missingResourceIds.add(effect.resourceId);
      });
    }
  }
  const entityIds = new Set([
    ...identity.characters.map(character => character.id),
    ...world.worldModel.institutions.map(institution => institution.id),
  ]);
  const unknownOwnerEntityIds = [...new Set(world.resources.flatMap(resource => (
    resource.ownerEntityId && !entityIds.has(resource.ownerEntityId) ? [resource.ownerEntityId] : []
  )))];
  const locationIds = new Set(world.locations.map(location => location.id));
  const unknownTravelLocationIds = [...new Set(world.travelRules.flatMap(rule => [rule.fromLocationId, rule.toLocationId])
    .filter(locationId => !locationIds.has(locationId)))];
  if (missingResourceIds.size || unknownOwnerEntityIds.length || unknownTravelLocationIds.length) {
    throw new StoryFactoryError('setup_blocked', 'World canon contains dangling stable-ID references.', {
      missingResourceIds: [...missingResourceIds],
      unknownOwnerEntityIds,
      unknownTravelLocationIds,
      repairRule: 'Return every referenced resource and entity in the world canon, or remove the dangling mechanic/travel reference.',
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
  targetCount: number;
}): string {
  return JSON.stringify({
    task: `Generator ${input.generator}: tạo đúng ${input.targetCount} concept khác nhau về cơ chế, reward loop và conflict economy.`,
    requirements: [
      'Không tạo ID; code sẽ gán stable ID bất biến theo generator và vị trí.',
      'Đây là web-serial sảng văn thương mại theo tín hiệu Faloo, nhưng là IP nguyên bản: học cách đóng gói trực diện, não động lớn, nhịp nhanh và sảng điểm dày; tuyệt đối không sao chép nhân vật, thế giới, tên riêng, franchise hoặc tiêu đề đang có.',
      'Concept phải ghép ba lớp nhìn là hiểu: một đề tài/đấu trường có nhu cầu rộng + một thân phận hoặc thế yếu cụ thể + một lợi thế độc nhất tạo payoff hữu hình. Chất đời sống hoặc nghề nghiệp chỉ là nền; không được chọn một quy trình lao động yên ả làm fantasy chính.',
      'marketBlueprint là hợp đồng sản phẩm, không phải phần giới thiệu. familiarArena khóa đề tài quen thuộc; noveltyCollision nói rõ cú ghép mới; protagonistStartingPosition khóa đáy xuất phát; coreAdvantage khóa lợi thế có thể diễn thành cảnh.',
      'comparisonEngine phải chỉ ra hệ quy chiếu khiến độc giả nhìn thấy main vượt người khác: bảng xếp hạng, kỳ thi, đấu giá, chiến trường, thị trường, lãnh địa, hợp đồng, dư luận hoặc một thước đo xã hội tương đương. Không được chỉ ghi “mọi người khâm phục”.',
      'worldConflictEngine phải khiến thế giới tự sinh cạnh tranh ngay cả khi phản diện đầu tiên biến mất: tài nguyên khan hiếm, luật phân phối, tầng quyền lực, chu kỳ tai họa, thị trường, tông môn, quốc gia hoặc cơ chế tuyển chọn. Không xây cả truyện quanh một kẻ xấu duy nhất.',
      'earlyPayoffs phải có đúng năm mốc chapter 1,3,5,7,10. Mỗi mốc khóa payoff hữu hình, ai trực tiếp nhìn thấy, vị thế nào đổi và áp lực mới nào lập tức mở ra. Không dùng lời hứa, hoàn tất chuẩn bị hoặc hiểu thêm quy trình làm payoff.',
      'scaleLadder có 6-8 bậc thật sự đổi arena, phần thưởng vị thế, lớp đối thủ và cách lợi thế tiến hóa. Grounded có thể đi từ hộ gia đình → địa phương → liên tỉnh → quốc gia → quốc tế → di sản; speculative có thể đi từ cá nhân → tổ đội → thành/trường/phái → quốc gia → thế giới → đa giới. Không bê ví dụ vào concept.',
      'Trong từng bậc scaleLadder, arena, statusPrize, oppositionClass và advantageEvolution đều phải là mô tả cụ thể dài tối thiểu 20 ký tự sau khi trim; không dùng nhãn cụt kiểu “có uy tín”, “giữ xưởng” hoặc “lên cấp”. statusPrize phải nói rõ main giành quyền, tài sản, chức vị hoặc quyền lựa chọn nào.',
      'Cơ chế phải được kích hoạt và tạo lần lật thế/thu hoạch đầu tiên ngay trong chương 1; chương 2 mở rộng tác dụng hoặc người chứng kiến; hết chương 3 phải có đối thủ/đấu trường/mục tiêu lớn hơn xuất hiện. Không dùng ba chương chỉ để giới thiệu, chế thử rồi hẹn ngày mai.',
      'Có vật liệu nhân quả để biến hóa ít nhất ba mươi chương.',
      'Có 8-15 arena/giai đoạn thực sự khác nhau để đi đến 800-1.200 chương; seriality1000 phải mô tả biến đổi macro, không đổi tên cùng một vòng lặp.',
      'Nêu earlyEndingRisk: vì sao truyện có thể cạn sớm và cơ chế nào ngăn điều đó mà không sinh filler.',
      'Không dựa vào đối thủ ngu, may mắn liên tục hoặc tài nguyên vô nguồn.',
      'Premise phải mở một kỳ vọng lớn ngay từ tên + mô tả (một mục tiêu/món nợ/lời thề/cơ hội mà độc giả muốn thấy trả), và kỳ vọng đó phải trả dần qua hàng trăm chương — cấm premise kiểu ngửa bài xong là hết chuyện.',
      'Reward loop phải trả thưởng dày: mỗi chương một nhịp thắng/thu hoạch/xác nhận năng lực nhìn thấy được, ba chương tăng một nấc phạm vi hoặc vị thế, mỗi vòng năm chương có một keo vừa. Sảng cảm đến từ main chủ động dùng lợi thế khiến cục diện đổi trước mắt độc giả; không thay payoff bằng lời hứa, quy trình hoặc cảm giác êm đềm.',
      'Main chủ động và tư lợi hợp lý theo giá trị của thế giới: giúp ai cũng có lý do hoặc cái giá, không thánh mẫu làm việc miễn phí khi thế giới có giá cả.',
      'Tên truyện là quảng cáo một câu, dài 7-26 từ tiếng Việt. Ưu tiên khuôn “ĐỀ TÀI/THÂN PHẬN: TA + LỢI THẾ + PAYOFF”, nói thẳng điều độc giả sẽ được xem; ví dụ cấu trúc “Toàn Dân Chuyển Chức: Nghề Phế Của Ta Tiến Hóa Vô Hạn” hoặc “Trùng Sinh 1988: Từ Chiếc Thuyền Nát Đến Ông Trùm Hải Sản”. Không dùng lại ví dụ, không giấu premise sau tên văn học trừu tượng, chức danh tĩnh hoặc một dụng cụ kỹ thuật.',
      'Văn án phải đưa ngay hoàn cảnh main, lợi thế độc nhất, lần payoff đầu và đường leo thang; không mở bằng triết lý, phong cảnh hay lịch sử thế giới.',
      'Chọn não động dễ hình dung và có cảnh biểu diễn mạnh. Tránh cụm đề tài chỉ hấp dẫn như tài liệu nghề nghiệp (sửa một chi tiết máy, tối ưu một khâu lạnh, nghiên cứu một quy trình) nếu không gắn nó với quyền lực, cạnh tranh, danh tiếng hoặc biến đổi quy mô lớn ngay từ đầu.',
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
  // Field-by-field, never JSON.stringify: the stored checkpoint round-trips through
  // Postgres JSONB, which re-orders object keys, so stringified equality fails on
  // identical values. Latent since the checkpoint system was written — surfaced by
  // the first setup that actually resumed across invocations instead of finishing
  // inside one process.
  const provenanceMatches = (stored: SetupCheckpointProvenance | undefined): boolean => !!stored
    && stored.version === provenance.version
    && stored.commissionDigest === provenance.commissionDigest
    && stored.researchDigest === provenance.researchDigest
    && stored.setupRouteDigest === provenance.setupRouteDigest;
  if (input.resume && !provenanceMatches(input.resume.provenance)) {
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
    const model = generator === 'A' ? input.routes.setupGeneratorA : input.routes.setupGeneratorB;
    const system = generator === 'A'
      ? 'Bạn là Concept Generator độc lập. Chỉ dùng research làm tín hiệu thị trường, không sao chép tác phẩm hoặc tên riêng.'
      : 'Bạn là Concept Generator độc lập. Chủ động tìm hướng khác Generator A có thể nghĩ tới; không sao chép tác phẩm hoặc tên riêng.';
    const candidates: z.infer<typeof ConceptCandidateWireSchema>[] = [];
    const batchUsages: ProviderUsage[] = [];
    const splitForGemini = model.startsWith('gemini-');
    // 3.5 Flash can finish a syntactically valid three-candidate object while
    // silently omitting the third candidate's large blueprint tail (~23k output
    // tokens). Pairs stay comfortably below that practical completeness limit;
    // Pro-class Gemini routes have proven stable at triples.
    const geminiBatchSize = model === 'gemini-3.5-flash' ? 2 : 3;
    const maximumBatches = splitForGemini ? Math.ceil(6 / geminiBatchSize) : 2;
    for (let batch = 1; candidates.length < 6 && batch <= maximumBatches; batch += 1) {
      const missing = 6 - candidates.length;
      const targetCount = splitForGemini ? Math.min(geminiBatchSize, missing) : missing;
      const generated = await setupStage(`Concept Generator ${generator}${batch === 1 ? '' : ' top-up'}`, provider.json({
        model,
        system,
        prompt: batch === 1 && !splitForGemini
          ? generatorPrompt({ commission, research, generator, targetCount: 6 })
          : `${generatorPrompt({ commission, research, generator, targetCount })}\n\nBatch trước đã có ${candidates.length} concept. Đây là batch BỔ SUNG, phải khác các fingerprint sau: ${JSON.stringify(candidates.map(candidate => ({
            mechanismFingerprint: candidate.mechanismFingerprint,
            rewardLoopFingerprint: candidate.rewardLoopFingerprint,
            conflictEconomyFingerprint: candidate.conflictEconomyFingerprint,
          })))}.`,
        schema: splitForGemini
          ? geminiBatchSize === 2 ? ConceptPairBatchWireSchema : ConceptTripleBatchWireSchema
          : ConceptBatchWireSchema,
        // Six concepts each contain five payoff rows and a 6–8-step scale
        // ladder. Fixed nested array maxima make Gemini 2.5 Pro reject the
        // schema before generation as "too many states" even after maxima are
        // omitted. Use Gemini JSON mode plus the schema in the prompt; provider
        // code still parses the full Zod contract and permits one same-model
        // corrective regeneration if needed.
        constrainSchema: false,
        schemaComplexity: 'omit_array_max',
        temperature: 1,
      }));
      candidates.push(...generated.value.candidates.slice(0, targetCount));
      batchUsages.push(generated.usage);
      if (!splitForGemini && candidates.length === 6) break;
    }
    if (candidates.length !== 6) {
      throw new StoryFactoryError('setup_blocked', `Concept Generator ${generator} produced ${candidates.length}/6 concepts after one top-up.`);
    }
    const generatedUsage = batchUsages.reduce<ProviderUsage>((total, usage, index) => ({
      model: index === 0 ? usage.model : total.model,
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      costUsd: total.costUsd + usage.costUsd,
      finishReason: usage.finishReason,
      grounding: total.grounding || usage.grounding
        ? {
          searchQueries: [...(total.grounding?.searchQueries ?? []), ...(usage.grounding?.searchQueries ?? [])],
          sourceUrls: [...(total.grounding?.sourceUrls ?? []), ...(usage.grounding?.sourceUrls ?? [])],
        }
        : undefined,
    }), {
      model,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      finishReason: 'unknown',
    });
    return {
      value: ConceptBatchSchema.parse({
        candidates: candidates.map((candidate, index) => ({
          id: `concept_${generator.toLowerCase()}_${String(index + 1).padStart(2, '0')}`,
          ...candidate,
        })),
      }),
      usage: generatedUsage,
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
    system: `Bạn là Blind Concept Judge. Chọn theo sức hút thương mại, nhân quả thế giới và khả năng serial; không biết model nào tạo concept.
Grounded Domain Research là ràng buộc theo realityPolicy. Áp dụng realityPolicy trước khi đọc research. Với grounded, không chọn claim bị research bác hoặc đòi hạ tầng, vốn, thời gian, năng lượng hay mức an toàn trái commission. Với speculative, tiền đề siêu nhiên được phép; chỉ loại khi concept không khóa được logic nội tại, nguồn lực, chi phí, giới hạn, actor hoặc hậu quả.`,
    prompt: JSON.stringify({
      task: 'Chọn đúng hai concept mạnh nhất. Ưu tiên theo thứ tự: đề tài rộng + cú ghép mới; thế giới tự sinh cạnh tranh; lợi thế có thể biểu diễn và tiến hóa; năm payoff đầu đổi vị thế; scale ladder thay lớp đối thủ thật; cuối cùng mới đến độ dài 800-1.200 chương. Loại concept chỉ “hay nghề”, cozy, chỉ thắng một phản diện, hoặc hợp lý nhưng thiếu cỗ máy thế giới.',
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
Với mỗi concept, viết actual opening sample tiếng Việt đủ dài để đánh giá như chương 1 của một sảng văn thương mại: vào áp lực/cơ hội ngay, main hành động, lợi thế độc nhất kích hoạt và tạo một payoff hữu hình trước khi sample kết thúc. Có đối thoại tự nhiên, đối lực có agenda riêng và một thay đổi vị thế cụ thể; không dùng phong cảnh, hồi tưởng hoặc hướng dẫn thao tác để trì hoãn premise. Không kéo dài để đạt số từ. Đây là mẫu để chọn concept, không phải canon và không được đưa vào Kernel.
Sample và hướng chương 2-3 phải thực sự kiểm chứng marketBlueprint, không cứu concept bằng ý mới. Chương 1 trả đúng earlyPayoff mốc 1; chương 2 mở rộng tác dụng/người có lợi ích trực tiếp; chương 3 trả mốc 3 và mở đối thủ/đấu trường/mục tiêu lớn hơn. Audit xem comparisonEngine có truyền thông tin nhân quả và worldConflictEngine có tự sinh phản ứng hay chỉ dựa vào một phản diện ngu.
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
Giữ packaging sảng văn trực diện: kernel.title dài 7-26 từ, nêu đề tài/thân phận cùng lợi thế hoặc payoff cụ thể; ưu tiên dấu hai chấm. kernel.description là văn án bán truyện, phải nói ngay hoàn cảnh main, lợi thế, payoff đầu và nấc leo thang — không viết như tóm tắt văn học. readerFantasy và pleasureLoop phải nhấn vào quyền chủ động, thắng lợi nhìn thấy được và vị thế mở rộng; comfort chỉ là lớp phụ.
Identity phải giữ nguyên hạt nhân marketBlueprint của concept: main bắt đầu đúng đáy đã khóa, coreAdvantage là năng lực trung tâm chứ không bị thay bằng nghề nghiệp phụ, cast phải đại diện ít nhất opposition địa phương và một quan hệ/gatekeeper khiến comparisonEngine hoạt động. Không biến noveltyCollision thành background rồi kể một truyện nghề nghiệp quen thuộc.
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
  assertMarketableSerialTitle(selectedConcept.workingTitle);
  assertMarketableSerialTitle(launchIdentity.value.kernel.title);
  if (launchIdentity.value.kernel.mechanismFingerprint !== selectedConcept.mechanismFingerprint
    || launchIdentity.value.kernel.rewardLoopFingerprint !== selectedConcept.rewardLoopFingerprint
    || launchIdentity.value.kernel.conflictEconomyFingerprint !== selectedConcept.conflictEconomyFingerprint) {
    throw new StoryFactoryError('setup_blocked', 'Launch pack fingerprints drifted from the selected concept.');
  }

  const launchWorldWireSchema = createLaunchWorldWireSchema(
    launchIdentity.value.kernel.characters.map(character => character.id),
  );
  const materializeLaunchWorld = (wire: z.infer<typeof launchWorldWireSchema>) => LaunchWorldSchema.parse({
    kernel: {
      ...wire.kernel,
      worldMechanics: [
        ...wire.conversions,
        ...wire.capabilities,
        ...wire.constraints,
      ],
    },
  });
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
Thế giới phải vận hành như một cỗ máy tạo cạnh tranh, không phải bách khoa trang trí. Dựa sát marketBlueprint: có ít nhất bốn geography đại diện các nấc arena sớm, bốn institution gồm phe main/đối thủ địa phương/gatekeeper trung lập/lớp quyền lực kế tiếp, và hai system trở lên gồm hệ tạo giá trị cùng hệ phân phối-so sánh-tranh đoạt. Mỗi entity phải tạo một quyền, nguồn lực, cánh cửa hoặc xung đột mà Planner có thể diễn thành cảnh.
comparisonEngine phải có vật mang thông tin và người có quyền phản ứng: bảng xếp hạng, phiên đấu giá, kỳ thi, chiến báo, giá công khai, hợp đồng, quyền lãnh thổ hoặc cơ chế tương đương. Không cho đám đông tự biết thành tựu từ xa và không tạo nhân chứng chỉ để kinh ngạc.
worldConflictEngine phải tiếp tục sinh đối thủ sau khi opposition đầu tiên thất bại. Khóa tầng quyền lực, tài nguyên khan hiếm, luật tiếp cận và cái giá để main bước sang arena kế tiếp; không dùng một phản diện địa phương kéo dài hàng trăm chương.
coreAdvantage phải có ba tầng: thao tác mở đầu, biến thể khi đổi arena và giới hạn/counterplay khiến đối thủ có thể đổi chiến thuật. Không để cơ chế chỉ làm đúng một quy trình với số lượng lớn dần.
travelRules là đồ thị có hướng: từ vị trí mở đầu dự kiến phải đi được tới mọi location và có đường quay về. Không biến kiến thức thành vật tư, thời gian hoặc năng lượng miễn phí.
Mỗi resource bắt buộc khóa ownerEntityId: dùng character/institution ID thực sự sở hữu ledger đó; chỉ dùng null cho đại lượng môi trường hoặc tài nguyên chung thực sự không có chủ. Numeric resource phải có unit vật lý hoặc tiền tệ rõ ràng như VND, kg, lít, chiếc, điểm; không dùng một con số vô đơn vị. Mọi direction increase/decrease là theo số dư của ownerEntityId, không theo người đang thực hiện capability. Nếu owner trả tiền thì delta phải decrease; nếu owner nhận tiền thì delta phải increase.
Trả mechanics trong đúng ba mảng conversions, capabilities và constraints; mỗi mảng có ít nhất một phần tử đúng kind. Conversion chỉ ghi tổng input bị tiêu thụ và output tạo ra theo mỗi batch; tỷ lệ hao hụt nằm trong chênh lệch lượng input/output, còn phụ phẩm cần theo dõi là một output riêng.
Mọi tài nguyên bị conversion tiêu thụ PHẢI có ít nhất một mechanic active khác sản xuất ra nó (mua, thu hoạch, đánh bắt, sản xuất) — kho khởi điểm hữu hạn không phải nguồn thu nhận; nếu cá tươi bị ướp và bán thì phải có cơ chế mua/đánh bắt cá tươi, nếu không nền kinh tế truyện sẽ cụt đường sau vài chương. Bẫy hay gặp nhất là tài nguyên sức người/thời gian: nếu giờ lao động, thể lực, mana hay điểm hành động bị conversion tiêu, phải có conversion tái tạo theo chu kỳ (nghỉ ngơi, ngày mới, tuyển thêm dân) — không có thì không được cho conversion nào tiêu chúng. Capability ghi actor/fact/resource cấp quyền, công suất và chính xác effectResources/effectFactIds mà nó được phép làm thay đổi. Mỗi effectResources entry phải khóa direction=increase|decrease cho tài nguyên số hoặc state_change cho tài nguyên trạng thái; ví dụ tài trợ vào quỹ theo dõi là increase, chi quỹ là decrease, sửa trạng thái vật phẩm là state_change.
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
      schema: launchWorldWireSchema,
      schemaComplexity: 'omit_large_array_max',
      temperature: 0.3,
    }));
    launchWorld = {
      value: materializeLaunchWorld(launchWorldWire.value),
      usage: launchWorldWire.usage,
    };
  }
  const worldMechanicErrors: Array<{ message: string; evidence: unknown }> = [];
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      assertLaunchWorldReferences(launchIdentity.value.kernel, launchWorld.value.kernel);
      assertRenewableMechanicSet(launchWorld.value.kernel.worldMechanics);
      break;
    } catch (error) {
      if (!(error instanceof StoryFactoryError)) throw error;
      worldMechanicErrors.push({ message: error.message, evidence: error.evidence ?? null });
      if (attempt === 2) {
        throw new StoryFactoryError(
          'setup_blocked',
          `World mechanics failed renewable-graph validation after two corrections: ${error.message}`,
          { ...(error.evidence ?? {}), worldMechanicErrors },
        );
      }
      const correction = await setupStage(`Launch World Architect correction ${attempt + 1}/2`, provider.json({
        model: input.routes.launchArchitect,
        system: `Bạn sửa toàn bộ world canon theo lỗi canonical đã chỉ ra. Trả lại đầy đủ structured-output schema, không markdown và không thay identity/cast.
Mọi resource bị conversion input hoặc capability direction=decrease tiêu hao phải có ít nhất một conversion output hoặc capability direction=increase sản xuất lại trong chính worldMechanics. Kho mở đầu hữu hạn không phải nguồn tái tạo. resources phải khai báo ĐẦY ĐỦ mọi resourceId được mechanics tham chiếu, đúng owner; locations phải khai báo đầy đủ hai đầu của mọi travelRule. Không được giải lỗi bằng cách xóa resource ledger, toàn bộ economy hay coreAdvantage: vẫn phải có conversion, capability và constraint đủ để diễn cơ chế trung tâm, tích lũy, giao dịch/xung đột và giới hạn trong arc đầu. Không coi effect direction=decrease là nguồn sản xuất.`,
        prompt: JSON.stringify({
          task: 'Sửa world canon theo toàn bộ chuỗi lỗi renewable graph; giữ nguyên identity và trả lại toàn bộ world.',
          commission,
          groundedDomainResearch: domainResearch.value,
          selectedConcept,
          selectedSimulation,
          identity: launchIdentity.value.kernel,
          worldMechanicErrors,
          previous: launchWorld.value,
        }),
        schema: launchWorldWireSchema,
        schemaComplexity: 'omit_large_array_max',
        temperature: 0.2,
      }));
      launchWorld = {
        value: materializeLaunchWorld(correction.value),
        usage: mergeStageUsage(launchWorld.usage, correction.usage),
      };
      delete checkpoint.launchSeries;
      delete checkpoint.launchState;
    }
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
seriesSpine phải triển khai marketBlueprint.scaleLadder: mỗi lần lên bậc phải đổi phần thưởng vị thế, lớp opposition và cách dùng coreAdvantage, không chỉ tăng con số sản lượng. Stage sau stage đầu phải có ít nhất hai expansionSeeds cụ thể để mở character/location/promise/world rule/world mechanic mới.
Không kéo một phản diện hoặc một nghề qua toàn bộ stage. Sau mỗi thắng lợi lớn, lợi ích bị đụng chạm phải gọi ra gatekeeper hay opposition class cấp cao hơn từ chính worldConflictEngine; đối thủ cũ có thể tiến hóa hoặc rời sân nhưng không được đổi tên rồi làm lại cùng thủ đoạn.
progressionTracks có ít nhất ba trục độc lập: năng lực/cơ chế, quyền lực-vị thế-tài sản, và quan hệ-tổ chức-bản sắc thế giới. Milestone dùng stable stage ID. longPromises có ít nhất sáu promise phân bổ nhiều stage, gồm cả payoff gần, trung và cuối truyện.
Stage đầu không được dùng hàng chục chương chỉ để chứng minh cơ chế. Nó phải chứa đủ năm earlyPayoffs ở chương 1/3/5/7/10, rồi tiếp tục đổi loại thử thách; rewardLoopVariant mô tả một vòng sảng có kết quả nhìn thấy, không phải danh sách công đoạn.
Mọi longPromises.promiseId, stages[].longPromiseIds và endingDirection.promisesToResolve phải tham chiếu ID trong promises. longPromises chỉ lập lịch mở/đến hạn, không thay thế định nghĩa promise.`,
    prompt: JSON.stringify({
      task: 'Xuất progression, series spine, promise ledger và ending direction.',
      selectedConcept,
      selectedSimulation,
      identity: launchIdentity.value.kernel,
      world: launchWorld.value.kernel,
    }),
    schema: LaunchSeriesSchema,
    // The explicit 3/6/6 series minima are application invariants. Gemini 3.1
    // rejects that nested constrained schema before generation, so keep the
    // complete schema in-prompt and enforce it with Zod after JSON decoding.
    constrainSchema: false,
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
  const launchStateSystem = `Bạn chỉ tạo Arc đầu 20-30 chương và StoryState chương 0 từ canon đã khóa. Trả đúng structured-output schema, không markdown.
Arc gắn stage đầu; mọi active ID phải có trong Kernel. State không ghi trước kết quả tương lai.
Arc đầu phải trả đúng title promise và marketBlueprint.earlyPayoffs: progression có ít nhất năm mốc, khóa rõ kết quả ở/chậm nhất chương 1,3,5,7,10; terminalChanges có ít nhất ba thay đổi vị thế/tài sản/quyền lựa chọn thật; activeConflicts có ít nhất hai nguồn áp lực độc lập từ worldConflictEngine.
openingPayoffProofs phải có đúng hai proof cho chapter 1 và 3. Mỗi proof là chương trình thực thi tích lũy từ State chương 0: steps dùng đúng active conversion/capability, đúng actor và số batch; resourceClaims ghi tổng lượng tài nguyên numeric do chuỗi đã thực sự sản xuất đến deadline. Code sẽ replay theo thứ tự, trừ input trước rồi cộng output, kiểm tra giới hạn batch, fact, quyền actor và số dư; tuyệt đối không tiêu trước khi sản xuất hoặc khai số lượng lớn hơn phép tính. Chapter 3 tiếp tục từ số dư sau proof chapter 1, không reset kho. Ở mỗi deadline phải còn ít nhất một tài nguyên numeric do protagonist sở hữu có số dư tăng ròng so với State chương 0; output trung gian đã tiêu hết hoặc phép đổi làm số dư giảm không được tính là payoff. Mỗi proof cũng phải có một nhân vật ngoài main trực tiếp thấy kết quả và một opposition active tạo áp lực kế tiếp.
Chia 20-30 chương thành nhiều mini-cycle, mỗi cycle có cơ hội hoặc áp lực → main dùng coreAdvantage → người có lợi ích trực tiếp chứng kiến/đáp trả → payoff → áp lực cấp cao hơn. Không dành trọn arc để sửa máy, thử nghiệm, gom nguyên liệu, làm quen thế giới hoặc đánh một phản diện bằng cùng một thủ đoạn.
Mốc chương 10 phải làm main bước sang một vị thế hoặc arena mới đủ rõ, không chỉ giàu/mạnh hơn theo số. Những chương sau mở biến thể lợi thế, institution hoặc opposition class kế tiếp đã có trong Kernel.
Arc.activeMechanicIds là working set của Planner trong arc đầu: chỉ chứa mechanic mà các beat của arc đầu thật sự dùng, tối đa ${ARC_ACTIVE_MECHANIC_BUDGET}. Mechanic không chọn vẫn nằm nguyên trong Kernel và arc sau kích hoạt được. Mọi requiredFacts của capability/constraint đang active phải có fact và expected value tương ứng trong initialState.
Mọi đầu vào và resource điều kiện của activeMechanicIds phải có đường nhân quả từ initialState: số dư dương có nguồn gốc hợp lý hoặc output của active conversion bắt đầu từ tài nguyên đang có. activeResourceIds có thể chứa tài nguyên chỉ để theo dõi về sau, nhưng Planner không được thay đổi nó trước khi có mechanic hợp lệ. Nếu cần mua vật tư để dùng ngay, phải kích hoạt conversion thu mua tương ứng; không đặt vật tư bằng 0 rồi trông chờ Planner tự bịa nguồn.
Nếu capability active có effectResources direction=decrease thì số dư dương ban đầu vẫn chỉ là kho hữu hạn, không phải nguồn tái tạo: arc phải kích hoạt thêm conversion/capability direction=increase sản xuất đúng resource đó, hoặc không kích hoạt capability tiêu hao trong arc này.
initialState.schemaVersion=2, chapterNumber=0, recentOutcomes=[] và usedExpansionSeedIds=[].
encounteredCharacterIds là nguồn sự thật exact-ID duy nhất về việc hai nhân vật đã từng gặp trực tiếp trước chương 1; phải đối xứng hai chiều. relationshipState chỉ mô tả thái độ hiện tại như tin tưởng, dè chừng, mang ơn hoặc thù địch, không dùng câu "chưa biết/chưa gặp/lần đầu" để mã hóa lịch sử gặp mặt.
State có đúng một entry cho mọi character, resource và promise trong Kernel; không thiếu, không thêm ID lạ.`;
  const launchStatePrompt = {
    task: 'Xuất Arc đầu và State chương 0.',
    selectedConcept,
    kernel,
  };
  let launchState = checkpoint.launchState
    ? { value: LaunchStateSchema.parse(checkpoint.launchState.value), usage: checkpoint.launchState.usage }
    : await setupStage('Launch State Architect', provider.json({
    model: input.routes.launchArchitect,
    system: launchStateSystem,
    prompt: JSON.stringify(launchStatePrompt),
    schema: LaunchStateSchema,
    schemaComplexity: 'omit_large_array_max',
    temperature: 0.3,
    }));
  const buildLaunch = () => parseSetupArtifact('LaunchPack', LaunchPackSchema, {
    schemaVersion: 2,
    selectedConceptId: launchIdentity.value.selectedConceptId,
    kernel,
    arc: launchState.value.arc,
    initialState: launchState.value.initialState,
    coverPrompt: launchIdentity.value.coverPrompt,
  });
  const validateStateAndArc = (candidate: LaunchPack) => {
    assertLaunchSemantics(candidate, commission, selectedConcept);
    if (candidate.initialState.chapterNumber !== 0
      || candidate.initialState.storyTimeMinutes !== 0
      || candidate.initialState.recentOutcomes.length
      || candidate.initialState.usedExpansionSeedIds.length
      || candidate.arc.startChapter !== 1) {
      throw new StoryFactoryError('setup_blocked', 'Launch pack must start before chapter one with no simulated canon or consumed expansion seeds.');
    }
    validateKernelState(candidate.kernel, candidate.initialState);
    validateArcActivationBudget(candidate.arc);
    validateArcAgainstKernel(candidate.kernel, ArcPlanSchema.parse(candidate.arc));
    validateArcResourceReachability({
      kernel: candidate.kernel,
      arc: ArcPlanSchema.parse(candidate.arc),
      state: candidate.initialState,
    });
    assertRenewableConversionInputs(candidate.kernel, ArcPlanSchema.parse(candidate.arc));
    validateOpeningPayoffProofs({
      kernel: candidate.kernel,
      arc: candidate.arc,
      state: candidate.initialState,
      proofs: launchState.value.openingPayoffProofs,
    });
  };
  let launch = buildLaunch();
  const canonicalErrors: Array<{ message: string; evidence: unknown }> = [];
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      validateStateAndArc(launch);
      break;
    } catch (error) {
      if (!(error instanceof StoryFactoryError)) throw error;
      canonicalErrors.push({ message: error.message, evidence: error.evidence ?? null });
      if (attempt === 2) {
        throw new StoryFactoryError(
          'setup_blocked',
          `Launch pack failed canonical validation after two corrections: ${error.message}`,
          { ...(error.evidence ?? {}), canonicalErrors },
        );
      }
      const correction = await setupStage(`Launch State Architect correction ${attempt + 1}/2`, provider.json({
        model: input.routes.launchArchitect,
        system: launchStateSystem,
        prompt: JSON.stringify({
          ...launchStatePrompt,
          task: 'Sửa Arc đầu và State chương 0 theo lỗi canonical; không thay đổi Kernel.',
          canonicalErrors,
          previous: launchState.value,
        }),
        schema: LaunchStateSchema,
        schemaComplexity: 'omit_large_array_max',
        temperature: 0.2,
      }));
      launchState = {
        value: correction.value,
        usage: mergeStageUsage(launchState.usage, correction.usage),
      };
      launch = buildLaunch();
    }
  }
  checkpoint.launchState = launchState;
  await input.onCheckpoint?.(structuredClone(checkpoint));
  usages.push(launchState.usage);
  assertPortfolioDiversity(selectedConcept, input.existingSignatures ?? []);
  return { launchPack: launch, selectedConcept, candidates, usages };
}

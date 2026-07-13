import { z } from 'zod';
import {
  AdvantageFamilyV1Schema,
  GenreLaneV2Schema,
  PortfolioAudienceV1Schema,
  PortfolioGroupV1Schema,
  PortfolioWorldModeV1Schema,
  PromotionCohortV1Schema,
} from './portfolio-taxonomy';

const concrete = z.string().trim().min(20);
const named = z.string().trim().min(2);
const sourceId = z.string().regex(/^source_[a-z0-9_-]+$/);
const cardId = z.string().regex(/^market_[a-z0-9_-]+$/);

export const PortfolioSlotIdV1Schema = z.string().regex(/^(HX|TH|DT)-\d{2}$/);

export const PortfolioSlotV1Schema = z.object({
  slotId: PortfolioSlotIdV1Schema,
  workingLabel: named,
  audience: PortfolioAudienceV1Schema,
  portfolioGroup: PortfolioGroupV1Schema,
  genre: z.enum([
    'tien-hiep', 'huyen-huyen', 'do-thi', 'kiem-hiep', 'lich-su', 'khoa-huyen',
    'vong-du', 'dong-nhan', 'mat-the', 'linh-di', 'quan-truong', 'di-gioi',
    'ngon-tinh', 'quy-tac-quai-dam', 'ngu-thu-tien-hoa', 'khoai-xuyen',
  ]),
  genreLane: GenreLaneV2Schema,
  experienceMode: concrete,
  advantageFamily: AdvantageFamilyV1Schema,
  advantageBoundary: concrete,
  rewardLoop: concrete,
  progressionCurrencies: z.array(named).min(2).max(8),
  conflictSource: concrete,
  worldMode: PortfolioWorldModeV1Schema,
  laneCardIds: z.array(cardId).min(1).max(4),
  researchQuestions: z.array(concrete).min(3).max(8),
  antiPatterns: z.array(concrete).min(3).max(8),
  distinctnessFingerprint: z.string().min(12),
  promotionCohort: PromotionCohortV1Schema,
  status: z.enum(['prepared', 'research_blocked', 'lab_reference']),
}).strict();

export type PortfolioSlotV1 = z.infer<typeof PortfolioSlotV1Schema>;

export function buildDistinctnessFingerprint(slot: Pick<PortfolioSlotV1, 'advantageFamily' | 'rewardLoop' | 'progressionCurrencies' | 'conflictSource' | 'worldMode'>): string {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
  return [
    slot.advantageFamily,
    normalize(slot.rewardLoop),
    [...slot.progressionCurrencies].map(normalize).sort().join('+'),
    normalize(slot.conflictSource),
    slot.worldMode,
  ].join('|');
}

const exactCounts: Record<string, number> = {
  native: 11,
  rebirth: 6,
  transmigration: 4,
  script_awareness: 2,
  bounded_system: 3,
  dual_world: 2,
  simulation_loop: 2,
};

export const PortfolioManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  portfolioId: z.literal('flagship-first-30'),
  generatedAt: z.string().datetime(),
  strategy: z.object({
    funnel: z.literal('30_to_9_to_3'),
    writerIsolation: z.literal(true),
    productionDefault: z.literal('paused_hidden_manual_only'),
    existingPilots: z.literal('lab_reference_not_counted'),
  }).strict(),
  slots: z.array(PortfolioSlotV1Schema).length(30),
}).strict().superRefine((manifest, ctx) => {
  const slots = manifest.slots;
  const count = (predicate: (slot: PortfolioSlotV1) => boolean) => slots.filter(predicate).length;
  const check = (actual: number, expected: number, path: (string | number)[], message: string) => {
    if (actual !== expected) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `${message}: expected ${expected}, got ${actual}.` });
  };

  check(count(slot => slot.audience === 'male'), 30, ['slots'], 'Male-primary audience quota mismatch');
  check(count(slot => slot.portfolioGroup === 'fantasy'), 12, ['slots'], 'Fantasy quota mismatch');
  check(count(slot => slot.portfolioGroup === 'urban_era_dual_world'), 18, ['slots'], 'Urban/era/dual-world quota mismatch');
  check(count(slot => slot.genre === 'huyen-huyen'), 7, ['slots'], 'Xuanhuan quota mismatch');
  check(count(slot => slot.genre === 'tien-hiep'), 5, ['slots'], 'Xianxia quota mismatch');
  check(count(slot => slot.promotionCohort === 'opening_tournament'), 9, ['slots'], 'Opening-tournament cohort mismatch');

  for (const [family, expected] of Object.entries(exactCounts)) {
    check(count(slot => slot.advantageFamily === family), expected, ['slots'], `Advantage family ${family} mismatch`);
  }

  const ids = new Set<string>();
  const lanes = new Set<string>();
  const fingerprints = new Set<string>();
  slots.forEach((slot, index) => {
    if (ids.has(slot.slotId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', index, 'slotId'], message: 'Duplicate portfolio slot id.' });
    if (lanes.has(slot.genreLane)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', index, 'genreLane'], message: 'Every first-30 slot must own a distinct mechanism lane.' });
    if (fingerprints.has(slot.distinctnessFingerprint)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', index, 'distinctnessFingerprint'], message: 'Duplicate distinctness fingerprint.' });
    const computed = buildDistinctnessFingerprint(slot);
    if (computed !== slot.distinctnessFingerprint) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', index, 'distinctnessFingerprint'], message: 'Fingerprint does not match the slot mechanics.' });
    ids.add(slot.slotId);
    lanes.add(slot.genreLane);
    fingerprints.add(slot.distinctnessFingerprint);
  });
});

export const MarketSourceV1Schema = z.object({
  id: sourceId,
  title: named,
  publisher: named,
  publishedAt: z.string().date(),
  url: z.string().url(),
  finding: concrete,
  limitation: concrete,
}).strict();

export const MarketCardV1Schema = z.object({
  id: cardId,
  label: named,
  usage: z.literal('upstream_concept_lab_only'),
  mustNeverReachWriter: z.literal(true),
  readerPromise: concrete,
  activeMechanisms: z.array(concrete).min(3).max(8),
  saturationRisks: z.array(concrete).min(3).max(8),
  sourceIds: z.array(sourceId).min(3).max(8),
}).strict();

export const MarketResearchRegistryV1Schema = z.object({
  schemaVersion: z.literal(1),
  researchedAt: z.string().datetime(),
  sources: z.array(MarketSourceV1Schema).min(3),
  cards: z.array(MarketCardV1Schema).min(3),
}).strict().superRefine((registry, ctx) => {
  const sourceIds = new Set(registry.sources.map(source => source.id));
  const cardIds = new Set<string>();
  registry.cards.forEach((card, cardIndex) => {
    if (cardIds.has(card.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cards', cardIndex, 'id'], message: 'Duplicate market card id.' });
    card.sourceIds.forEach((id, sourceIndex) => {
      if (!sourceIds.has(id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cards', cardIndex, 'sourceIds', sourceIndex], message: `Unknown source id ${id}.` });
    });
    cardIds.add(card.id);
  });
});

export type PortfolioManifestV1 = z.infer<typeof PortfolioManifestV1Schema>;
export type MarketCardV1 = z.infer<typeof MarketCardV1Schema>;
export type MarketResearchRegistryV1 = z.infer<typeof MarketResearchRegistryV1Schema>;

export function validatePortfolioResearch(manifestInput: unknown, registryInput: unknown): { manifest: PortfolioManifestV1; registry: MarketResearchRegistryV1 } {
  const manifest = PortfolioManifestV1Schema.parse(manifestInput);
  const registry = MarketResearchRegistryV1Schema.parse(registryInput);
  const cards = new Map(registry.cards.map(card => [card.id, card]));
  for (const slot of manifest.slots) {
    for (const cardIdValue of slot.laneCardIds) {
      const card = cards.get(cardIdValue);
      if (!card) throw new Error(`Portfolio slot ${slot.slotId} references unknown market card ${cardIdValue}.`);
      if (card.sourceIds.length < 3) throw new Error(`Market card ${card.id} does not have three dated sources.`);
    }
  }
  return { manifest, registry };
}

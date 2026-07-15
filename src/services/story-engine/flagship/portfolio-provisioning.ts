import { z } from 'zod';
import { FlagshipSetupBriefV2Schema, type FlagshipSetupBriefV2 } from './setup-contracts';
import { FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1 } from './portfolio-data';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from './catalogue-data';
import { FLAGSHIP_OPENING_COHORT_BRIEFS_V2 } from './portfolio-setup-briefs-data';
import type { PortfolioSlotV1 } from './portfolio';
import type { FlagshipStoryPackageV1 } from './catalogue';

export const FlagshipPortfolioProvisionStageV1Schema = z.enum([
  'brief_ready',
  'concept_review',
  'ready_to_write',
]);

export const FlagshipPortfolioProvisionItemV1Schema = z.object({
  schemaVersion: z.literal(1),
  portfolioId: z.literal('flagship-first-30'),
  slotId: z.string().regex(/^(HX|TH|DT)-\d{2}$/),
  title: z.string().trim().min(20),
  slug: z.string().regex(/^flagship-(hx|th|dt)-\d{2}$/),
  genre: z.string().trim().min(2),
  coverUrl: z.string().regex(/^\/covers\/flagship-first-30\/[a-z0-9-]+\.webp$/),
  description: z.string().trim().min(20),
  protagonistSeed: z.string().trim().min(20),
  setupBrief: FlagshipSetupBriefV2Schema,
  provisionStage: FlagshipPortfolioProvisionStageV1Schema,
  hasTournamentArtifact: z.boolean(),
  hasApprovedKernel: z.boolean(),
  maxChapters: z.number().int().min(1).max(5000),
}).strict().superRefine((item, ctx) => {
  if (item.setupBrief.portfolioSlotId !== item.slotId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['setupBrief', 'portfolioSlotId'], message: 'Brief must belong to the provisioned slot.' });
  }
  if (item.provisionStage === 'concept_review' && !item.hasTournamentArtifact) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hasTournamentArtifact'], message: 'concept_review requires a tournament artifact.' });
  }
  if (item.provisionStage === 'ready_to_write' && (!item.hasTournamentArtifact || !item.hasApprovedKernel)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hasApprovedKernel'], message: 'ready_to_write requires tournament and approved kernel artifacts.' });
  }
});

export const FlagshipPortfolioProvisionPlanV1Schema = z.object({
  schemaVersion: z.literal(1),
  portfolioId: z.literal('flagship-first-30'),
  items: z.array(FlagshipPortfolioProvisionItemV1Schema).length(30),
}).strict().superRefine((plan, ctx) => {
  const ids = plan.items.map(item => item.slotId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Provisioning slot ids must be unique.' });
});

export type FlagshipPortfolioProvisionItemV1 = z.infer<typeof FlagshipPortfolioProvisionItemV1Schema>;
export type FlagshipPortfolioProvisionPlanV1 = z.infer<typeof FlagshipPortfolioProvisionPlanV1Schema>;

const APPROVED_KERNEL_SLOTS = new Set(['HX-04', 'TH-01', 'DT-11']);
const TOURNAMENT_SLOTS = new Set(FLAGSHIP_FIRST_30_MANIFEST.slots
  .filter(slot => slot.promotionCohort === 'opening_tournament')
  .map(slot => slot.slotId));

function rewardSteps(slot: PortfolioSlotV1, story: FlagshipStoryPackageV1): string[] {
  const fragments = slot.rewardLoop
    .replace(/[.]$/, '')
    .split(/,\s*|\s+rồi\s+/iu)
    .map(value => value.trim())
    .filter(Boolean);
  const steps = fragments.map((fragment, index) => `Bước ${index + 1}: ${fragment}; kết quả phải được thể hiện bằng hành động, nguồn lực và bằng chứng riêng của ${story.slotId}.`);
  while (steps.length < 4) {
    steps.push(`Bước ${steps.length + 1}: biến thay đổi vừa đạt được thành nghĩa vụ mới trong lời hứa dài kỳ: ${story.serialPromise}`);
  }
  return steps.slice(0, 7);
}

function researchNotes(slot: PortfolioSlotV1) {
  const cards = new Map(FLAGSHIP_MARKET_RESEARCH_V1.cards.map(card => [card.id, card]));
  const sources = new Map(FLAGSHIP_MARKET_RESEARCH_V1.sources.map(source => [source.id, source]));
  const sourceIds = [...new Set(slot.laneCardIds.flatMap(cardId => cards.get(cardId)?.sourceIds || []))];
  return sourceIds.slice(0, 8).map(sourceId => {
    const source = sources.get(sourceId);
    if (!source) throw new Error(`Missing research source ${sourceId} for ${slot.slotId}.`);
    return {
      source: `${source.publisher} — ${source.title} (${source.publishedAt}): ${source.url}`,
      finding: `${source.finding} Giới hạn áp dụng cho ${slot.slotId}: ${source.limitation}`,
    };
  });
}

function buildReserveBrief(slot: PortfolioSlotV1, story: FlagshipStoryPackageV1): FlagshipSetupBriefV2 {
  const progressionSignals = [...new Set([...slot.progressionCurrencies, 'chất lượng đời sống'])];
  return FlagshipSetupBriefV2Schema.parse({
    schemaVersion: 2,
    language: 'vi',
    portfolioSlotId: slot.slotId,
    genreLane: slot.genreLane,
    laneCardIds: slot.laneCardIds,
    distinctnessFingerprint: slot.distinctnessFingerprint,
    researchQuestions: slot.researchQuestions,
    promotionCohort: slot.promotionCohort,
    genre: slot.genre,
    audience: `Độc giả nam Việt là chính, đồng thời giữ nhân vật, cảm xúc và quan hệ đủ tự nhiên để độc giả nữ vẫn có thể theo dõi dài kỳ.`,
    desiredExperience: `${slot.experienceMode} Trải nghiệm riêng của truyện được khóa bởi: ${story.catalogueDescription}`,
    domain: `${story.settingSeed} Cơ chế xung đột dài kỳ phải phát sinh từ: ${slot.conflictSource}`,
    pleasureProfile: {
      realityMode: slot.worldMode,
      advantage: `Lợi thế ${slot.advantageFamily} của nhân vật chỉ được vận hành trong giới hạn sau: ${slot.advantageBoundary}`,
      knowledgeLimit: `Không được suy diễn lợi thế thành đáp án toàn năng; giới hạn tri thức, kỹ năng và tài nguyên bắt buộc là: ${slot.advantageBoundary}`,
      primaryRewardLoop: rewardSteps(slot, story),
      comfortLoop: [
        `Thành quả phải đi vào ${progressionSignals.join(', ')} và tạo một thay đổi đời sống hoặc quan hệ nhìn thấy được, không chỉ tăng chỉ số.`,
        `Sau áp lực từ ${slot.conflictSource}, phải có cảnh nhân vật chủ động bảo vệ một người, mái nhà, cộng đồng hoặc nhịp sống đã kiếm được.`,
      ],
      setbackRecoveryWindow: 2,
      faceSlapPolicy: `Chỉ phản đòn người đã chủ động gây hại vì lợi ích gắn với ${slot.conflictSource}; chiến thắng phải dựa trên chuẩn bị, bằng chứng và thay đổi trạng thái, không dựa vào đối thủ ngu.`,
      progressionSignals,
    },
    boundaries: [
      ...slot.antiPatterns,
      `Không được đổi tên rồi mượn nhân vật, thế giới, nguồn lực hoặc promise ledger của slot khác; kernel của ${slot.slotId} phải độc lập hoàn toàn.`,
      `Không sao chép biểu đạt, tên riêng, cảnh nhận diện hoặc chuỗi sự kiện từ tác phẩm nghiên cứu; chỉ dùng kết luận cơ chế thượng nguồn.`,
      `Không dùng title catalogue như một outline cứng; mọi quan hệ nhân quả phải được chứng minh bằng thế giới và dàn nhân vật được tạo riêng cho ${slot.slotId}.`,
    ].slice(0, 12),
    researchNotes: researchNotes(slot),
    seedConstraints: [
      `Tên xuất bản đã khóa cho slot này là “${story.title}”; concept thắng phải thực hiện đúng lời hứa trực diện của tên mà không đổi sang trope chung.`,
      `Hạt giống nhân vật chính riêng của truyện: ${story.protagonistSeed}`,
      `Bối cảnh riêng không được thay bằng thế giới thể loại chung: ${story.settingSeed}`,
      `Cảnh mở bắt buộc phải được concept biến thành hành động chủ động có hậu quả: ${story.openingHook}`,
      `Lời hứa dài kỳ phải biến hóa ít nhất ba mươi chương: ${story.serialPromise}`,
      `Dấu vân tay hình ảnh và tình huống riêng cần được phản chiếu trong world proof: ${story.visualFingerprint}`,
    ],
  });
}

export function getFlagshipFirst30SetupBrief(slotId: string): FlagshipSetupBriefV2 {
  const existing = FLAGSHIP_OPENING_COHORT_BRIEFS_V2[slotId];
  if (existing) return existing;
  const slot = FLAGSHIP_FIRST_30_MANIFEST.slots.find(item => item.slotId === slotId);
  const story = FLAGSHIP_FIRST_30_CATALOGUE_V1.packages.find(item => item.slotId === slotId);
  if (!slot || !story) throw new Error(`Unknown flagship portfolio slot ${slotId}.`);
  return buildReserveBrief(slot, story);
}

export function buildFlagshipFirst30ProvisionPlan(maxChapters = 1000): FlagshipPortfolioProvisionPlanV1 {
  const stories = new Map(FLAGSHIP_FIRST_30_CATALOGUE_V1.packages.map(story => [story.slotId, story]));
  return FlagshipPortfolioProvisionPlanV1Schema.parse({
    schemaVersion: 1,
    portfolioId: 'flagship-first-30',
    items: FLAGSHIP_FIRST_30_MANIFEST.slots.map(slot => {
      const story = stories.get(slot.slotId);
      if (!story) throw new Error(`Catalogue package missing for ${slot.slotId}.`);
      const hasApprovedKernel = APPROVED_KERNEL_SLOTS.has(slot.slotId);
      const hasTournamentArtifact = TOURNAMENT_SLOTS.has(slot.slotId);
      return {
        schemaVersion: 1,
        portfolioId: 'flagship-first-30',
        slotId: slot.slotId,
        title: story.title,
        slug: `flagship-${slot.slotId.toLowerCase()}`,
        genre: slot.genre,
        coverUrl: story.coverArt.assetPath,
        description: story.catalogueDescription,
        protagonistSeed: story.protagonistSeed,
        setupBrief: getFlagshipFirst30SetupBrief(slot.slotId),
        provisionStage: hasApprovedKernel ? 'ready_to_write' : hasTournamentArtifact ? 'concept_review' : 'brief_ready',
        hasTournamentArtifact,
        hasApprovedKernel,
        maxChapters,
      };
    }),
  });
}

import { createHash } from 'node:crypto';
import { z } from 'zod';

export const NARRATIVE_FOUNDATION_VERSION = 'lived-causality-2026-09-21.1' as const;

// Shared with Serial's persisted IDs. A foundation accepted here must remain
// writable to Bible snapshots and plans without a second, narrower contract.
const id = z.string().trim().regex(/^[a-z0-9_]{2,64}$/);
const prose = z.string().trim().min(8).max(2_000);

export const NarrativeCraftProfileSchema = z.object({
  version: z.literal(NARRATIVE_FOUNDATION_VERSION),
  genre: z.enum(['two_world_commerce', 'cultivation_growth', 'civilization_technology']),
}).strict();
export type NarrativeCraftProfile = z.infer<typeof NarrativeCraftProfileSchema>;

export const NarrativeFoundationSchema = z.object({
  craftProfile: NarrativeCraftProfileSchema,
  characters: z.array(z.object({
    characterId: id,
    background: prose,
    presentLife: prose,
    existingCompetence: prose,
    limitsOfKnowledge: prose,
    relationships: prose,
    habits: prose,
    desireBeforeAdvantage: prose,
  }).strict()).min(1).max(24),
  livedWorlds: z.array(z.object({
    worldId: id,
    everydayLife: prose,
    livelihoods: prose,
    infrastructure: prose,
    inequality: prose,
    institutionsWithoutProtagonist: prose,
  }).strict()).min(1).max(8),
  advantageDiscovery: z.object({
    acquisitionEvent: prose,
    initialReaction: prose,
    firstExperiments: z.array(prose).min(1).max(8),
    initiallyKnownFactIds: z.array(id).max(24),
    unresolvedOrigin: prose.nullable(),
  }).strict(),
  facts: z.array(z.object({
    id,
    truth: prose,
    initiallyKnownByCharacterIds: z.array(id).max(24),
    revealThrough: prose,
  }).strict()).min(1).max(120),
  milestones: z.array(z.object({
    id,
    intention: prose,
    prerequisiteIds: z.array(id).max(24),
    evidenceNeeded: prose,
  }).strict()).min(1).max(80),
}).strict().superRefine((foundation, ctx) => {
  const unique = (values: string[], path: string) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: `${path} ids must be unique.` });
    }
  };
  unique(foundation.characters.map(item => item.characterId), 'characters');
  unique(foundation.livedWorlds.map(item => item.worldId), 'livedWorlds');
  unique(foundation.facts.map(item => item.id), 'facts');
  unique(foundation.milestones.map(item => item.id), 'milestones');
  const characterIds = new Set(foundation.characters.map(item => item.characterId));
  const factIds = new Set(foundation.facts.map(item => item.id));
  const milestoneIds = new Set(foundation.milestones.map(item => item.id));
  const collidingNarrativeId = foundation.facts.find(fact => milestoneIds.has(fact.id))?.id;
  if (collidingNarrativeId) ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['milestones'],
    message: `Fact and milestone IDs must use separate names; ${collidingNarrativeId} is duplicated.`,
  });
  foundation.facts.forEach((fact, index) => fact.initiallyKnownByCharacterIds.forEach(characterId => {
    if (!characterIds.has(characterId)) ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['facts', index, 'initiallyKnownByCharacterIds'],
      message: `Unknown character ${characterId}.`,
    });
  }));
  foundation.advantageDiscovery.initiallyKnownFactIds.forEach(factId => {
    if (!factIds.has(factId)) ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['advantageDiscovery', 'initiallyKnownFactIds'],
      message: `Unknown fact ${factId}.`,
    });
  });
  const seenMilestones = new Set<string>();
  foundation.milestones.forEach((milestone, index) => {
    milestone.prerequisiteIds.forEach(prerequisiteId => {
      if (!factIds.has(prerequisiteId) && !seenMilestones.has(prerequisiteId)) ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['milestones', index, 'prerequisiteIds'],
        message: milestoneIds.has(prerequisiteId)
          ? `Milestone ${prerequisiteId} must precede ${milestone.id}.`
          : `Unknown prerequisite ${prerequisiteId}.`,
      });
    });
    seenMilestones.add(milestone.id);
  });
});
export type NarrativeFoundation = z.infer<typeof NarrativeFoundationSchema>;

export const NarrativeEvidenceSchema = z.object({
  id,
  chapterNumber: z.number().int().min(1),
  quote: z.string().trim().min(4).max(600),
  learnedByCharacterIds: z.array(id).max(24),
}).strict();
export type NarrativeEvidence = z.infer<typeof NarrativeEvidenceSchema>;

export const NarrativeReviewSchema = z.object({
  findings: z.array(z.object({
    target: z.enum(['foundation', 'plan', 'prose']),
    kind: z.enum([
      'missing_grounding', 'unearned_knowledge', 'skipped_prerequisite',
      'unlived_scene', 'world_incoherence', 'repetitive_padding',
    ]),
    severity: z.enum(['blocking', 'important', 'minor']),
    chapterNumber: z.number().int().min(1).nullable(),
    quote: z.string().trim().max(600).nullable(),
    explanation: prose,
    direction: prose,
  }).strict()).max(24),
  readerAssessment: z.object({
    protagonist: prose,
    world: prose,
    causality: prose,
    sceneLife: prose,
    desireToContinue: prose,
  }).strict(),
}).strict();
export type NarrativeReview = z.infer<typeof NarrativeReviewSchema>;

export function narrativeReviewGate(review: NarrativeReview | null): {
  upstreamFindings: NarrativeReview['findings'];
  blockingProseFindings: NarrativeReview['findings'];
  mayPublish: boolean;
} {
  const findings = review?.findings ?? [];
  const upstreamFindings = findings.filter(finding => (
    finding.severity !== 'minor' && finding.target !== 'prose'
  ));
  const blockingProseFindings = findings.filter(finding => (
    finding.severity === 'blocking' && finding.target === 'prose'
  ));
  return {
    upstreamFindings,
    blockingProseFindings,
    mayPublish: upstreamFindings.length === 0 && blockingProseFindings.length === 0,
  };
}

const COMMON_CRAFT = `NỀN SÁNG TÁC ${NARRATIVE_FOUNDATION_VERSION}
- Cho nhân vật một đời sống có xuất thân, công việc, năng lực đã học, giới hạn hiểu biết, quan hệ, thói quen và mong muốn trước khi lợi thế xuất hiện. Không đổ hồ sơ thành thuyết minh và không ép quá khứ vào một số dòng cố định.
- Thế giới phải có sinh hoạt, sinh kế, hạ tầng, chênh lệch tiếp cận và tổ chức có lợi ích riêng khi main không có mặt.
- Phân biệt sự thật tác giả biết, điều từng nhân vật biết hoặc tin, và điều độc giả thật sự đã đọc. Hồ sơ và plan không tự biến thành kinh nghiệm của nhân vật.
- Lợi thế cần sự kiện nhận được, phản ứng, phép thử có mục đích và ranh giới điều đã kiểm chứng. Nguồn gốc sâu có thể giữ bí mật nếu có chủ ý và manh mối.
- Lập tiến trình bằng điều kiện: phát hiện, tìm hiểu, lựa chọn, thực hiện, kết quả và hệ quả. Đây là quan hệ nhân quả, không phải công thức bắt mọi cảnh đi đủ sáu bước.
- Viết kỹ lần đầu và lựa chọn quan trọng; tóm lược việc đã quen. Không kéo dài bằng thao tác lặp, thất bại giả hoặc độc thoại giải thích lại.
- Cảnh sinh hoạt, quan hệ, khám phá và suy nghĩ được phép có trọng lượng dù chưa kiếm tiền, lên cấp hoặc có đám đông chứng kiến.
- Kết quả lớn phải đủ hiểu biết, nguồn lực, thời gian và quan hệ. Khám phá cơ hội chưa phải sản phẩm; mẫu dùng được chưa phải năng lực sản xuất; có mẫu chưa phải thị trường.
- Không dùng số biến cố, số tên mới, độ ngắn đoạn văn hoặc lịch thưởng cố định làm thước đo chất lượng.`;

const GENRE_CRAFT: Record<NarrativeCraftProfile['genre'], string> = {
  two_world_commerce: `SONG XUYÊN–KINH DOANH
Hai thế giới đều có cư dân, việc làm, hạ tầng và lợi ích. Giai đoạn thăm dò có thể chưa có khách hàng. Khi kinh doanh, phân biệt mẫu vật, hiểu công dụng, quyền sử dụng, khả năng cung ứng hoặc sản xuất, kiểm tra chất lượng, nhu cầu và người trả tiền. Giao dịch riêng tư vẫn hợp lệ; không bắt buộc đám đông hay công ty xuất hiện sớm.`,
  cultivation_growth: `TU LUYỆN–TRƯỞNG THÀNH
Cho độc giả điểm xuất phát để so sánh. Tiến bộ gắn với cơ thể, thời gian, đời sống và quan hệ. Đốn ngộ, truyền thừa hoặc hệ thống chỉ hợp lệ theo luật riêng đã dựng; không dùng chúng để vá việc nhân vật bỗng có kiến thức ngoài kinh nghiệm.`,
  civilization_technology: `XÂY DỰNG–CÔNG NGHỆ
Bản thiết kế khác với năng lực làm ra: cần con người, vật liệu, công cụ, năng lượng, thời gian và tổ chức vận hành. Có thể nén thời gian sau khi đường phát triển đã rõ; người trong thế giới vẫn phải sống với hệ quả và có lựa chọn riêng.`,
};

export function narrativeCraft(profile: NarrativeCraftProfile): string {
  const parsed = NarrativeCraftProfileSchema.parse(profile);
  return `${COMMON_CRAFT}\n\n${GENRE_CRAFT[parsed.genre]}`;
}

export function narrativeCraftDigest(profile: NarrativeCraftProfile): string {
  return createHash('sha256').update(narrativeCraft(profile)).digest('hex');
}

export function assertFoundationReferences(input: {
  foundation: NarrativeFoundation;
  characterIds: string[];
  worldIds: string[];
  protagonistId: string;
}): void {
  const foundation = NarrativeFoundationSchema.parse(input.foundation);
  const characterIds = new Set(input.characterIds);
  const worldIds = new Set(input.worldIds);
  if (!foundation.characters.some(item => item.characterId === input.protagonistId)) {
    throw new Error('Narrative foundation must include the protagonist.');
  }
  for (const item of foundation.characters) {
    if (!characterIds.has(item.characterId)) throw new Error(`Narrative foundation references unknown character ${item.characterId}.`);
  }
  for (const item of foundation.livedWorlds) {
    if (!worldIds.has(item.worldId)) throw new Error(`Narrative foundation references unknown world ${item.worldId}.`);
  }
  const protagonistKnown = new Set(foundation.facts
    .filter(fact => fact.initiallyKnownByCharacterIds.includes(input.protagonistId))
    .map(fact => fact.id));
  for (const factId of foundation.advantageDiscovery.initiallyKnownFactIds) {
    if (!protagonistKnown.has(factId)) {
      throw new Error(`Advantage fact ${factId} is not initially known by the protagonist.`);
    }
  }
}

export const NARRATIVE_REVIEW_SYSTEM_PROMPT = `Bạn là biên tập viên văn học độc lập. Đọc một chuỗi chương cùng nền và kế hoạch.
Chỉ nêu finding có bằng chứng. Quote phải chép đúng từ prose; nếu thiếu một cảnh thì để quote=null và chỉ rõ kết quả nào đang thiếu chuẩn bị.
Phân tầng chính xác: foundation khi năng lực/động cơ/thế giới gốc thiếu; plan khi kết quả đi trước điều kiện; prose khi plan đủ nhưng cảnh thể hiện hụt.
Không phạt cảnh đời sống, quan hệ, khám phá hoặc suy nghĩ chỉ vì chưa có giao dịch, tăng cấp, tên mới, nhân chứng hay hook đe dọa.
Không dùng điểm tổng hợp thay cho nhận xét cụ thể. Đánh giá main là ai, thế giới vận hành ra sao, nhân quả, sức sống của cảnh và mong muốn đọc tiếp.`;

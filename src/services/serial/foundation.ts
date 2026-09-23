import { mergeProviderUsage, type ProviderUsage, type StoryModelProvider } from '@/services/story-factory/provider';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import { groundEvidenceSpan } from '@/services/story-factory/validation';
import { z } from 'zod';
import {
  NARRATIVE_REVIEW_SYSTEM_PROMPT,
  NarrativeEvidenceSchema,
  NarrativeReviewSchema,
  narrativeCraft,
  type NarrativeFoundation,
  type NarrativeReview,
} from '@/services/narrative/foundation';
import type { Bible, ChapterDigest, CyclePlan, Premise } from './contracts';
import {
  CYCLE_PLANNER_SYSTEM_PROMPT,
  EXTRACTOR_SYSTEM_PROMPT,
  JUDGE_SYSTEM_PROMPT,
  OPENING_AUDITOR_SYSTEM_PROMPT,
  PREMISE_SYSTEM_PROMPT,
  WRITER_SYSTEM_PROMPT,
} from './prompts';
import type { SerialRoutes } from './contracts';
import { SerialStateError } from './state';

export function narrativeFoundation(premise: Premise): NarrativeFoundation | null {
  return premise.schemaVersion === 3 ? premise.narrativeFoundation ?? null : null;
}

/**
 * Structured-output models occasionally return a unique trailing character id
 * (`khai`) even when the supplied stable id is `tran_khai`. Canonicalize only
 * that unambiguous case at the provider boundary; ambiguous or unrelated ids
 * remain untouched so the state validator still rejects them.
 */
export function canonicalizeNarrativeLearnerIds(bible: Bible, digest: ChapterDigest): ChapterDigest {
  const characterIds = [
    ...bible.symbolicCore.cast.map(item => item.id),
    ...digest.coreChanges.newCast.map(item => item.id),
  ];
  const exact = new Set(characterIds);
  const canonical = (learnerId: string): string => {
    if (exact.has(learnerId)) return learnerId;
    const matches = characterIds.filter(characterId => characterId.endsWith(`_${learnerId}`));
    return matches.length === 1 ? matches[0] : learnerId;
  };
  return {
    ...digest,
    narrativeEvidence: digest.narrativeEvidence.map(evidence => ({
      ...evidence,
      learnedByCharacterIds: [...new Set(evidence.learnedByCharacterIds.map(canonical))],
    })),
  };
}

export function serialSystemPrompt(
  role: 'writer' | 'judge' | 'extractor' | 'opening' | 'planner' | 'premise',
  premise: Premise,
): string {
  const foundation = narrativeFoundation(premise);
  if (!foundation) return {
    writer: WRITER_SYSTEM_PROMPT,
    judge: JUDGE_SYSTEM_PROMPT,
    extractor: EXTRACTOR_SYSTEM_PROMPT,
    opening: OPENING_AUDITOR_SYSTEM_PROMPT,
    planner: CYCLE_PLANNER_SYSTEM_PROMPT,
    premise: PREMISE_SYSTEM_PROMPT,
  }[role];
  const craft = narrativeCraft(foundation.craftProfile);
  const common = `${craft}

Hợp đồng nền narrativeFoundation là canon tác giả. narrativeEvidence mới là điều độc giả đã đọc. Không cho nhân vật sử dụng fact nếu chưa có trong tri thức ban đầu của họ hoặc chưa có cảnh tạo evidence. Không coi milestone là đã đạt chỉ vì nó có trong hồ sơ. Nếu có commerceFantasy, protectedStore là luật tuyệt đối bất kể chênh lệch công nghệ, cảnh giới hay số lượng; valueContrasts là nguồn payoff sản phẩm đã duyệt và simplicityRules cấm tự sinh hệ thống phụ ngoài premise.`;
  if (role === 'writer') return `Bạn là tác giả truyện mạng tiếng Việt, viết một chương trong chuỗi dài.

${common}

Viết hinhDangChuong và nhipChuong thành trải nghiệm sống từ góc nhìn đã cấp. Lần đầu và lựa chọn quan trọng cần đủ quan sát, phản ứng và suy luận; việc đã quen có thể tóm lược.
Nếu hinhDangChuong có valueContrastId, phải diễn valueExperience bằng hành động và cảm giác cụ thể của người dùng rồi mới tới giá, đơn hàng hoặc thay đổi thái độ. Không thay bằng lời giải thích. Trong protectedStore, main luôn giữ quyền tuyệt đối; không viết cảnh hack, quét, theo dõi, ép cửa, cướp hàng hay đánh nhau giữ quầy.
Nếu dieuKienNhip có prerequisiteIds, chỉ dùng các điều kiện đã có trong narrativeEvidence hoặc được reveal trước trong chính chuỗi beat. Nếu advancesMilestoneIds có giá trị, kết quả phải có đúng evidenceNeeded; chưa đủ thì để milestone tiếp tục mở.
Giữ tuyệt đối canon, tài sản, vị trí, thời gian và giới hạn năng lực. Không nhắc prompt hay dữ liệu nội bộ. Trả về chương hoàn chỉnh.`;
  if (role === 'planner') return `Bạn lập kế hoạch chu kỳ hoặc cửa sổ rolling cho truyện dài.

${common}

Trả CyclePlan schemaVersion 2. Nếu brief có phamViRolling, startChapter và plannedEndChapter phải bằng đúng hai mốc trong đó và chỉ trả beat thật nằm trong phạm vi; không kéo dài giả để đủ năm chương. Mỗi beat khai prerequisiteIds, revealsFactIds và advancesMilestoneIds bằng stable ID trong nền. Một fact được reveal phải có cảnh tiếp cận thông tin. Chỉ advance milestone sau khi các prerequisite đã có và evidenceNeeded được diễn thành kết quả. Không bắt ba beat đổi sceneMode nếu câu chuyện đang phát triển cùng một việc có biến đổi thực.
Khi beat giới thiệu hoặc chứng minh giá trị một món song xuyên, chép valueContrastId từ commerceFantasy và viết valueExperience là trải nghiệm cụ thể dẫn tới định giá hoặc hành động mua. Không tạo viện, giấy phép, khóa quyền, rà soát, phiên dịch hay tuyến bảo vệ cửa hàng nếu canon không có; không tự thêm AI, hệ thống phụ, quyền năng, tổ chức hoặc sản phẩm ngoài premise; không dùng thủ tục để kéo chậm tiến triển.
Giữ kiểm tra tài sản, thời gian và canon.`;
  if (role === 'judge') return `Bạn soát canon, tri thức và chất lượng thể hiện của một chương.

${common}

Chỉ continuity có quote chính xác mới chặn: biết trước, nguồn lực/tài sản sai, vị trí/thời gian sai, năng lực vượt nền hoặc mâu thuẫn canon. Điểm đọc chỉ là steering; nêu rõ cảnh có cho thấy main là ai, thế giới vận hành ra sao và quyết định có căn cứ không.
Với commerceFantasy, continuity phải chặn mọi vi phạm protectedStore. Steering phải chỉ ra khi cảnh món hàng thiếu trải nghiệm valueContrast hoặc khi giấy phép, kiểm tra, phiên dịch và cảnh báo rủi ro đang lặp mà không tạo lựa chọn mới.
reviewBinding là bằng chứng bạn đã đọc đúng bản thảo: chép đúng chapterNumber, title và một excerpt liên tiếp 24-400 ký tự có nguyên văn trong trường chương. Không được nói thiếu văn bản khi trường chương có nội dung.`;
  if (role === 'extractor') return `${EXTRACTOR_SYSTEM_PROMPT}

${common}

narrativeEvidence chỉ ghi fact hoặc milestone thực sự được độc giả đọc trong chương. id phải là stable ID có trong narrativeFoundation; quote chép đúng 4-600 ký tự từ prose; learnedByCharacterIds chỉ gồm nhân vật trực tiếp hiện diện, quan sát hoặc được nói cho biết trong chính đoạn quote liên tục, và phải chép nguyên xi stable ID từ nhanVatDaBiet hoặc newCast, tuyệt đối không dùng tên, tên gọi tắt hay tự rút gọn ID. Không gắn một người xuất hiện ở đoạn sau vào quote diễn ra trước khi họ có mặt. bangChungNarrativeTheoBeat là danh sách fact và milestone chương đã được duyệt để chứng minh; nếu prose đã diễn kết quả, phải trả evidence cho từng id trong danh sách, theo thứ tự fact trước milestone. Nếu fact đã có trong narrativeStateBenVung và chương không cho một nhân vật mới học fact đó, không lặp evidence chỉ vì chương nhắc lại hoặc hành động theo kiến thức cũ. Không ghi plan, suy đoán của Extractor hay kết quả còn đang hẹn.`;
  if (role === 'opening') return `Bạn kiểm toán bốn chương mở đầu như một chuỗi đọc.

${common}

Kiểm tra lần xuất hiện của main, đời sống hai thế giới, cách lợi thế xuất hiện/được thử, giới hạn tri thức, bước chuẩn bị và hệ quả. Giữ kiểm toán tài sản/thời gian. Mỗi lỗi cần chương, quote chính xác, giải thích và hướng sửa đúng tầng.`;
  return `Bạn dựng premise schemaVersion 3 với narrativeFoundation đầy đủ.

${common}

World Kernel vẫn phải có stable IDs và đủ canon để giữ nhất quán; các mảng thương mại/cấp bậc có thể rỗng nếu chưa thuộc giai đoạn mở đầu. Mỗi character foundation phải phân biệt năng lực đã có với điều chưa biết. advantageDiscovery chỉ đánh dấu fact main thật sự biết từ đầu; bí mật sâu có thể để unresolvedOrigin. Mỗi fact chỉ chứa một kết luận có thể được một cảnh và một quote trực tiếp chứng minh; tách các mệnh đề về nguồn gốc, công dụng, giới hạn và nguyên nhân thành fact riêng khi chúng không cùng được quan sát.
Với two_world_commerce phiên bản hiện tại, commerceFantasy là bắt buộc: protectedStore thuộc main và đủ sáu bảo hộ, không công nghệ hay cảnh giới nào vô hiệu được; valueContrasts nêu ít nhất hai món đi qua hai thế giới cùng trải nghiệm chứng minh; simplicityRules đều true, gồm cấm tự sinh hệ thống phụ ngoài premise.`;
}

export function assertNarrativePlan(premise: Premise, bible: Bible, cycle: CyclePlan): void {
  const foundation = narrativeFoundation(premise);
  if (!foundation) {
    if (cycle.schemaVersion !== 1) throw new SerialStateError('craft_profile_mismatch', 'Legacy premise requires CyclePlan v1.');
    return;
  }
  if (cycle.schemaVersion !== 2) throw new SerialStateError('craft_profile_mismatch', 'Lived-causality premise requires CyclePlan v2.');
  const factIds = new Set(foundation.facts.map(item => item.id));
  const milestoneIds = new Set(foundation.milestones.map(item => item.id));
  const valueContrastIds = new Set(foundation.commerceFantasy?.valueContrasts.map(item => item.id) ?? []);
  const available = new Set([
    ...foundation.advantageDiscovery.initiallyKnownFactIds,
    ...bible.symbolicCore.revealedNarrativeIds,
    ...bible.symbolicCore.achievedNarrativeMilestoneIds,
    ...bible.symbolicCore.narrativeEvidence.map(item => item.id),
  ]);
  for (const beat of cycle.beatSheets) {
    if (beat.valueContrastId && !valueContrastIds.has(beat.valueContrastId)) throw new SerialStateError(
      'unknown_value_contrast',
      `Chapter ${beat.chapterNumber} references unknown value contrast ${beat.valueContrastId}.`,
    );
    for (const prerequisiteId of beat.prerequisiteIds) {
      if (!available.has(prerequisiteId)) throw new SerialStateError(
        'narrative_prerequisite_missing',
        `Chapter ${beat.chapterNumber} depends on ${prerequisiteId} before the reader has seen it.`,
      );
    }
    for (const factId of beat.revealsFactIds) {
      if (!factIds.has(factId)) throw new SerialStateError('unknown_narrative_fact', `Unknown narrative fact ${factId}.`);
      available.add(factId);
    }
    for (const milestoneId of beat.advancesMilestoneIds) {
      if (!milestoneIds.has(milestoneId)) throw new SerialStateError('unknown_narrative_milestone', `Unknown narrative milestone ${milestoneId}.`);
      const milestone = foundation.milestones.find(item => item.id === milestoneId)!;
      const missing = milestone.prerequisiteIds.filter(id => !available.has(id));
      if (missing.length) throw new SerialStateError(
        'narrative_milestone_unearned',
        `Chapter ${beat.chapterNumber} advances ${milestoneId} before ${missing.join(', ')}.`,
      );
      available.add(milestoneId);
    }
  }
}

export function assertNarrativeDigest(input: {
  premise: Premise;
  bible: Bible;
  digest: ChapterDigest;
  prose: string;
  cycle: CyclePlan;
}): void {
  const { premise, bible, digest, prose, cycle } = input;
  const foundation = narrativeFoundation(premise);
  if (!foundation) {
    if (digest.narrativeEvidence.length) throw new SerialStateError('legacy_narrative_evidence', 'Legacy stories cannot write lived-causality evidence.');
    return;
  }
  const validIds = new Set([
    ...foundation.facts.map(item => item.id),
    ...foundation.milestones.map(item => item.id),
  ]);
  const factIds = new Set(foundation.facts.map(item => item.id));
  const milestones = new Map(foundation.milestones.map(item => [item.id, item]));
  const characters = new Set([
    ...bible.symbolicCore.cast.map(item => item.id),
    ...digest.coreChanges.newCast.map(item => item.id),
  ]);
  const beat = cycle.beatSheets.find(item => item.chapterNumber === digest.chapterNumber);
  if (!beat || beat.chapterNumber !== digest.chapterNumber) {
    throw new SerialStateError('narrative_evidence_unplanned', `No approved beat exists for chapter ${digest.chapterNumber}.`);
  }
  const plannedFacts = new Set(cycle.schemaVersion === 2 ? beat.revealsFactIds : []);
  const plannedMilestones = new Set(cycle.schemaVersion === 2 ? beat.advancesMilestoneIds : []);
  const available = new Set([
    ...foundation.advantageDiscovery.initiallyKnownFactIds,
    ...bible.symbolicCore.revealedNarrativeIds,
    ...bible.symbolicCore.achievedNarrativeMilestoneIds,
    ...bible.symbolicCore.narrativeEvidence.map(item => item.id),
  ]);
  const evidenceIds = new Set(digest.narrativeEvidence.map(item => item.id));
  for (const evidence of digest.narrativeEvidence) {
    if (!validIds.has(evidence.id)) throw new SerialStateError('unknown_narrative_evidence', `Unknown evidence id ${evidence.id}.`);
    if (evidence.chapterNumber !== digest.chapterNumber) throw new SerialStateError('narrative_evidence_chapter', `Evidence ${evidence.id} has the wrong chapter.`);
    if (evidence.learnedByCharacterIds.some(id => !characters.has(id))) throw new SerialStateError('narrative_evidence_character', `Evidence ${evidence.id} names an unknown learner.`);
    if (!prose.includes(evidence.quote)) throw new SerialStateError(
      'narrative_evidence_quote',
      `Evidence ${evidence.id} quotes text that is not present in chapter ${digest.chapterNumber}.`,
    );
    if (factIds.has(evidence.id)) {
      // A previously revealed fact may appear again when a new character learns
      // it. A first reader reveal must be owned by the approved beat.
      if (!available.has(evidence.id) && !plannedFacts.has(evidence.id)) {
        throw new SerialStateError(
          'narrative_evidence_unplanned',
          `Chapter ${digest.chapterNumber} reveals ${evidence.id} outside its approved beat.`,
        );
      }
      available.add(evidence.id);
    }
  }
  for (const evidence of digest.narrativeEvidence) {
    if (factIds.has(evidence.id)) continue;
    const milestone = milestones.get(evidence.id)!;
    if (!plannedMilestones.has(evidence.id)) throw new SerialStateError(
      'narrative_milestone_unplanned',
      `Chapter ${digest.chapterNumber} claims milestone ${evidence.id} outside its approved beat.`,
    );
    const missing = milestone.prerequisiteIds.filter(id => !available.has(id));
    if (missing.length) throw new SerialStateError(
      'narrative_milestone_unearned',
      `Chapter ${digest.chapterNumber} claims ${evidence.id} before ${missing.join(', ')}.`,
    );
    available.add(evidence.id);
  }
  const missingPlannedEvidence = [
    ...[...plannedFacts].filter(id => !available.has(id) && !evidenceIds.has(id)),
    ...[...plannedMilestones].filter(id => !available.has(id) && !evidenceIds.has(id)),
  ];
  if (missingPlannedEvidence.length) throw new SerialStateError(
    'narrative_evidence_missing',
    `Chapter ${digest.chapterNumber} omitted planned evidence: ${missingPlannedEvidence.join(', ')}.`,
  );
}

const NarrativeEvidenceRecoverySchema = z.object({
  evidence: z.array(NarrativeEvidenceSchema).max(24),
}).strict();

export async function recoverNarrativeEvidence(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  bible: Bible;
  chapterNumber: number;
  prose: string;
  requiredIds: string[];
}): Promise<{ evidence: z.infer<typeof NarrativeEvidenceSchema>[]; usage: ProviderUsage }> {
  const foundation = narrativeFoundation(input.premise);
  if (!foundation || input.requiredIds.length === 0) return {
    evidence: [],
    usage: { model: input.routes.judge, inputTokens: 0, outputTokens: 0, costUsd: 0, finishReason: 'SKIPPED' },
  };
  const claims = input.requiredIds.map(requiredId => {
    const fact = foundation.facts.find(item => item.id === requiredId);
    const milestone = foundation.milestones.find(item => item.id === requiredId);
    return {
      id: requiredId,
      claim: fact?.truth ?? milestone?.intention ?? '',
      evidenceNeeded: milestone?.evidenceNeeded ?? null,
    };
  });
  const validCharacterIds = [
    ...input.bible.symbolicCore.cast.map(item => item.id),
  ];
  const result = await input.provider.json({
    model: input.routes.judge,
    system: `Bạn chỉ khôi phục narrative evidence còn thiếu từ một chương đã được duyệt. Trả đúng một evidence cho mỗi required id, theo thứ tự fact trước milestone. quote phải là một đoạn liên tiếp 4-600 ký tự chép đúng từng ký tự từ prose và đủ chứng minh claim; không thêm lời dẫn không liền với đoạn trích. learnedByCharacterIds chỉ được chép nguyên xi từ validCharacterIds và chỉ gồm nhân vật trực tiếp biết trong đoạn. Nếu prose không chứng minh claim, trả evidence rỗng để hệ thống chuyển lỗi về premise/plan/prose; tuyệt đối không dùng đoạn gần nhất cho đủ số và không bịa prose.`,
    prompt: JSON.stringify({ chapterNumber: input.chapterNumber, required: claims, validCharacterIds, prose: input.prose }),
    schema: NarrativeEvidenceRecoverySchema,
    temperature: 0,
    timeoutMs: 120_000,
  });
  return { evidence: result.value.evidence, usage: result.usage };
}

const NarrativeEvidenceVerificationSchema = z.object({
  checks: z.array(z.object({
    id: z.string(),
    quote: z.string(),
    supported: z.boolean(),
    explanation: z.string(),
  }).strict()).max(24),
}).strict();

/** A literal quote must actually establish the claimed fact or milestone, not merely exist. */
export async function verifyNarrativeEvidence(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  bible: Bible;
  digest: ChapterDigest;
  prose: string;
}): Promise<{
  usage: Awaited<ReturnType<StoryModelProvider['json']>>['usage'];
  errors: Array<{ rule: string; message: string }>;
} | null> {
  const foundation = narrativeFoundation(input.premise);
  if (!foundation || input.digest.narrativeEvidence.length === 0) return null;
  const claims = input.digest.narrativeEvidence.map(evidence => {
    const fact = foundation.facts.find(item => item.id === evidence.id);
    const milestone = foundation.milestones.find(item => item.id === evidence.id);
    return {
      id: evidence.id,
      quote: evidence.quote,
      learnedByCharacterIds: evidence.learnedByCharacterIds,
      claim: fact?.truth ?? milestone?.intention ?? '',
      evidenceNeeded: milestone?.evidenceNeeded ?? [],
    };
  });
  const result = await input.provider.json({
    model: input.routes.judge,
    system: `Bạn kiểm chứng bằng chứng truyện theo nghĩa, không viết lại truyện. Với từng claim, supported=true chỉ khi quote và ngữ cảnh chương thực sự cho độc giả thấy claim đó. Việc một câu xuất hiện nguyên văn không đủ. Milestone chỉ đúng khi evidenceNeeded đã xảy ra trên trang; ý định, lời hứa, suy đoán hoặc thao tác không liên quan đều là false. Với learnedByCharacterIds, nhân vật phải trực tiếp quan sát hoặc được truyền đạt thông tin trong chương. Trả đúng một check cho mỗi claim, giữ nguyên id và quote.`,
    prompt: JSON.stringify({
      chapterNumber: input.digest.chapterNumber,
      priorDurableKnowledge: {
        revealedNarrativeIds: input.bible.symbolicCore.revealedNarrativeIds,
        achievedNarrativeMilestoneIds: input.bible.symbolicCore.achievedNarrativeMilestoneIds,
        characterKnowledge: input.bible.symbolicCore.characterKnowledge,
      },
      claims,
      prose: input.prose,
    }),
    schema: NarrativeEvidenceVerificationSchema,
    temperature: 0,
  });
  const checks = result.value.checks;
  if (checks.length !== claims.length || claims.some(claim => !checks.some(check => (
    check.id === claim.id && check.quote === claim.quote
  )))) {
    return {
      usage: result.usage,
      errors: [{
        rule: 'narrative_evidence_verification_shape',
        message: 'Evidence verifier did not return one matching check per claim.',
      }],
    };
  }
  const rejected = checks.filter(check => !check.supported);
  return {
    usage: result.usage,
    errors: rejected.length ? [{
      rule: 'narrative_evidence_semantics',
      message: rejected.map(check => `${check.id}: ${check.explanation}`).join(' | ').slice(0, 3_000),
    }] : [],
  };
}

export async function reviewNarrativeSequence(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  bible?: Bible;
  startBible?: Bible;
  approvedPlan?: CyclePlan | CyclePlan[];
}): Promise<{ review: NarrativeReview; usage: Awaited<ReturnType<StoryModelProvider['json']>>['usage'] } | null> {
  const foundation = narrativeFoundation(input.premise);
  if (!foundation) return null;
  const makeCall = (correction?: { priorReview: NarrativeReview; groundingErrors: string[] }) => input.provider.json({
    model: input.routes.judge,
    system: `${NARRATIVE_REVIEW_SYSTEM_PROMPT}${correction
      ? '\nBản trước trích quote không nguyên văn. Chỉ sửa review, chép quote đúng từng ký tự từ đúng chương.'
      : ''}`,
    prompt: JSON.stringify({
      foundation,
      evidence: input.bible?.symbolicCore.narrativeEvidence ?? [],
      durableNarrativeState: input.bible ? {
        revealedNarrativeIds: input.bible.symbolicCore.revealedNarrativeIds,
        achievedNarrativeMilestoneIds: input.bible.symbolicCore.achievedNarrativeMilestoneIds,
        characterKnowledge: input.bible.symbolicCore.characterKnowledge,
      } : null,
      stateAtSequenceStart: input.startBible ? {
        chapterNumber: input.startBible.symbolicCore.chapterNumber,
        revealedNarrativeIds: input.startBible.symbolicCore.revealedNarrativeIds,
        achievedNarrativeMilestoneIds: input.startBible.symbolicCore.achievedNarrativeMilestoneIds,
        characterKnowledge: input.startBible.symbolicCore.characterKnowledge,
      } : null,
      approvedPlan: input.approvedPlan ?? null,
      chapters: input.chapters,
      correction: correction ?? null,
    }),
    schema: NarrativeReviewSchema,
    temperature: 0.2,
    timeoutMs: 120_000,
  });
  const groundReview = (review: NarrativeReview): NarrativeReview => NarrativeReviewSchema.parse({
    ...review,
    findings: review.findings.map(finding => {
      if (!finding.quote) return finding;
      const declared = finding.chapterNumber
        ? input.chapters.find(item => item.chapterNumber === finding.chapterNumber)
        : null;
      if (declared?.content.includes(finding.quote)) return finding;
      const exact = input.chapters.filter(chapter => chapter.content.includes(finding.quote!));
      if (exact.length === 1) return { ...finding, chapterNumber: exact[0]!.chapterNumber };
      const grounded = input.chapters.flatMap(chapter => {
        const quote = groundEvidenceSpan(chapter.content, finding.quote!);
        return quote ? [{ chapterNumber: chapter.chapterNumber, quote }] : [];
      });
      return grounded.length === 1
        ? { ...finding, chapterNumber: grounded[0]!.chapterNumber, quote: grounded[0]!.quote }
        : finding;
    }),
  });
  const groundingErrors = (review: NarrativeReview): string[] => review.findings.flatMap(finding => {
    if (!finding.quote) return [];
    const chapter = finding.chapterNumber
      ? input.chapters.find(item => item.chapterNumber === finding.chapterNumber)
      : null;
    return chapter?.content.includes(finding.quote)
      ? []
      : [`Narrative review quote is not grounded in chapter ${String(finding.chapterNumber)}: ${finding.quote}`];
  });
  const errorUsages = (error: unknown): ProviderUsage[] => {
    if (!(error instanceof StoryFactoryError) || !error.evidence || typeof error.evidence !== 'object') return [];
    const evidence = error.evidence as { usage?: ProviderUsage; usages?: ProviderUsage[] };
    return Array.isArray(evidence.usages) ? evidence.usages : evidence.usage ? [evidence.usage] : [];
  };
  const fail = (error: unknown, completed: ProviderUsage[], fallback: 'quality_blocked' | 'infra_blocked'): never => {
    const usages = [...completed, ...errorUsages(error)];
    const aggregate = usages.length > 0
      ? usages.reduce((total, usage) => mergeProviderUsage(total, usage))
      : null;
    const priorEvidence = error instanceof StoryFactoryError
      && error.evidence && typeof error.evidence === 'object'
      ? error.evidence as Record<string, unknown>
      : {};
    throw new StoryFactoryError(
      error instanceof StoryFactoryError ? error.code : fallback,
      error instanceof Error ? error.message : String(error),
      { ...priorEvidence, ...(aggregate ? { usages: [aggregate] } : {}) },
    );
  };

  let first: Awaited<ReturnType<typeof makeCall>>;
  try {
    first = await makeCall();
  } catch (error) {
    return fail(error, [], 'infra_blocked');
  }
  let firstReview: NarrativeReview;
  try {
    firstReview = groundReview(NarrativeReviewSchema.parse(first.value));
  } catch (error) {
    return fail(error, [first.usage], 'quality_blocked');
  }
  const firstErrors = groundingErrors(firstReview);
  if (firstErrors.length === 0) return { review: firstReview, usage: first.usage };

  let second: Awaited<ReturnType<typeof makeCall>>;
  try {
    second = await makeCall({ priorReview: firstReview, groundingErrors: firstErrors });
  } catch (error) {
    return fail(error, [first.usage], 'infra_blocked');
  }
  const usage = mergeProviderUsage(first.usage, second.usage);
  let secondReview: NarrativeReview;
  try {
    secondReview = groundReview(NarrativeReviewSchema.parse(second.value));
  } catch (error) {
    return fail(error, [usage], 'quality_blocked');
  }
  const secondErrors = groundingErrors(secondReview);
  if (secondErrors.length > 0) return fail(new Error(secondErrors.join(' | ')), [usage], 'quality_blocked');
  return { review: secondReview, usage };
}

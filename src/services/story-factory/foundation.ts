import {
  NARRATIVE_REVIEW_SYSTEM_PROMPT,
  NarrativeReviewSchema,
  narrativeCraft,
  type NarrativeReview,
} from '@/services/narrative/foundation';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { mergeProviderUsage } from './provider';
import { StoryFactoryError, type StoryKernel } from './contracts';
import { WRITER_VOICE_POLICY } from './prompts';

type FoundationRole = 'planner' | 'plan_judge' | 'writer' | 'editor' | 'revision' | 'arc';

const ROLE_RULES: Record<FoundationRole, string> = {
  planner: 'Lập beat theo điều kiện đã có và hệ quả sẽ sinh ra. Cảnh đời sống, quan hệ, khám phá hoặc suy nghĩ được phép đứng riêng khi nó làm nhân vật hay thế giới sống hơn. Không ép giao dịch, nhân chứng, tăng cấp hoặc thưởng vào một chương chưa đủ điều kiện.',
  plan_judge: 'Đánh giá nhân quả và tri thức. Không bác plan chỉ vì một chương chưa kiếm tiền, chưa lên cấp, chưa có đám đông hoặc chủ yếu dành cho đời sống và khám phá.',
  writer: 'Dùng nền làm canon hậu trường, không chép hồ sơ thành đoạn giới thiệu. Nhân vật chỉ được hành động từ điều họ đã biết trong state hoặc vừa học trên trang. Viết kỹ lần đầu và lựa chọn quan trọng; nén việc đã thành thói quen.',
  editor: 'Phân biệt lỗi nền, lỗi plan và lỗi thể hiện. Không bắt prose vá một thành quả mà plan chưa chuẩn bị và không phạt cảnh có sức sống chỉ vì cảnh đó chưa tạo giao dịch hay tăng cấp.',
  revision: 'Chỉ sửa lỗi thể hiện thuộc prose. Giữ nguyên cảnh đời sống có chức năng và không thêm lời giải thích để che lỗ hổng ở nền hoặc plan.',
  arc: 'Chỉ mở rộng quy mô khi nguồn lực, hiểu biết, thời gian và quan hệ đã được tích lũy. Khám phá cơ hội, làm được mẫu và có thị trường là ba mốc khác nhau.',
};

const LIVED_CAUSALITY_WRITER_POLICY = `Mỗi cảnh đi qua mục tiêu, năng lực đã có, giới hạn hiểu biết và thói quen cụ thể của POV. Chọn chi tiết đời sống, nghề nghiệp, địa điểm hoặc quan hệ vì nó làm rõ con người hay quyết định trong cảnh; không dùng một giới hạn số từ hoặc số đoạn để ép nhân vật hành động trước khi độc giả hiểu họ đang sống thế nào.
Viết kỹ trải nghiệm đầu tiên, phép thử và lựa chọn quan trọng: nhân vật quan sát gì, suy luận từ đâu, kiểm tra điều gì và sống với kết quả ra sao. Việc đã quen có thể kể gọn. Chi tiết kỹ thuật được ở trung tâm khi nó là chính điều nhân vật cần hiểu hoặc thực hiện, kể cả lúc chưa có đối thủ, deadline, phần thưởng hay giao dịch.
Cảnh sinh hoạt, quan hệ, khám phá và suy nghĩ có thể mang trọn trọng lượng một chương khi nó tạo tính cách, cảm giác nơi chốn, tri thức hoặc một lựa chọn có căn cứ. Không tự thêm xung đột, thất bại, đám đông, khách hàng hay hook đe dọa để hợp thức hóa cảnh.
Nhịp đến từ lượng trải nghiệm mới và tầm quan trọng của lựa chọn: mở rộng ở lần đầu và hệ quả lớn, nén thao tác đã thành thói quen. Không lặp thao tác, độc thoại lại điều đã biết hoặc kéo dài chuyển cảnh chỉ để đủ độ dài.
Kết quả phải đúng mức chuẩn bị đã có. Phát hiện cơ hội, hiểu nguyên lý, tạo mẫu, sản xuất ổn định và có thị trường là các mốc riêng; prose không được nói tắt qua mốc chưa xảy ra.`;

function withoutRetiredCreativeRules(prompt: string, role: FoundationRole): string {
  const plannerRole = role === 'planner' || role === 'arc';
  const retiredStarts = plannerRole
    ? [
        'Nếu payload có marketBlueprint,',
        'Mỗi chương phải tạo một chuyển động độc giả cảm nhận được:',
        'Không lập chương chỉ gồm ngủ, nghỉ, hồi thể lực,',
        'Phân bổ chức năng chương linh hoạt theo nhịp của Arc:',
        'Không dành cả chương cho một chi tiết nghề nghiệp vi mô.',
        'endingSituation của từng chương nên dừng ở thời điểm',
        'Trong grounded, lần sử dụng đầu tiên của bất kỳ thiết bị,',
      ]
    : role === 'plan_judge'
      ? [
          'Nếu payload có marketBlueprint,',
          'Phải trả đúng một earlyPayoffChecks',
          'Pass chỉ khi reader fantasy của Kernel hiện diện trực tiếp trong cửa sổ:',
        ]
      : role === 'editor'
        ? ['Đừng nhầm “đúng quy trình” với sảng cảm.']
        : [];
  return prompt.split('\n')
    .filter(line => !retiredStarts.some(start => line.startsWith(start)))
    .join('\n');
}

export function foundationSystemPrompt(
  legacyPrompt: string,
  kernel: Pick<StoryKernel, 'narrativeFoundation'>,
  role: FoundationRole,
): string {
  const foundation = kernel.narrativeFoundation;
  if (!foundation) return legacyPrompt;
  const selectedPrompt = role === 'writer'
    ? (legacyPrompt.includes(WRITER_VOICE_POLICY)
      ? legacyPrompt.replace(WRITER_VOICE_POLICY, LIVED_CAUSALITY_WRITER_POLICY)
      : `${legacyPrompt}\n\n${LIVED_CAUSALITY_WRITER_POLICY}`)
    : withoutRetiredCreativeRules(legacyPrompt, role);
  return `${selectedPrompt}\n\n${narrativeCraft(foundation.craftProfile)}\n\nVAI TRÒ HIỆN TẠI\n${ROLE_RULES[role]}`;
}

export function foundationContext(kernel: StoryKernel) {
  const foundation = kernel.narrativeFoundation;
  if (!foundation) return null;
  return {
    craftProfile: foundation.craftProfile,
    characterGrounding: foundation.characters,
    livedWorlds: foundation.livedWorlds,
    advantageDiscovery: foundation.advantageDiscovery,
    authorFacts: foundation.facts,
    conditionMilestones: foundation.milestones,
    knowledgeRule: 'authorFacts là canon của tác giả, không tự động là tri thức nhân vật. Chỉ dùng knownFactIds trong state hoặc knowledge delta đã diễn ra để cho nhân vật biết.',
  };
}

function reviewFailureWithUsage(
  error: unknown,
  completedUsages: ProviderUsage[],
  fallbackCode: 'quality_blocked' | 'infra_blocked',
): StoryFactoryError {
  const priorEvidence = error instanceof StoryFactoryError
    && error.evidence && typeof error.evidence === 'object'
    ? error.evidence as Record<string, unknown>
    : {};
  const errorUsages = Array.isArray(priorEvidence.usages)
    ? priorEvidence.usages as ProviderUsage[]
    : priorEvidence.usage ? [priorEvidence.usage as ProviderUsage] : [];
  const usages = [...completedUsages, ...errorUsages];
  const aggregate = usages.length > 0
    ? usages.reduce((total, usage) => mergeProviderUsage(total, usage))
    : null;
  return new StoryFactoryError(
    error instanceof StoryFactoryError ? error.code : fallbackCode,
    error instanceof Error ? error.message : String(error),
    { ...priorEvidence, ...(aggregate ? { usages: [aggregate] } : {}) },
  );
}

export async function reviewNarrativeWindow(input: {
  provider: StoryModelProvider;
  model: string;
  kernel: StoryKernel;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  baseUsage: ProviderUsage;
  diagnosticContext?: {
    arc?: unknown;
    stateAtWindowStart?: unknown;
    stateAtWindowEnd?: unknown;
    approvedPlan?: unknown;
    priorEvidence?: unknown;
  };
}): Promise<{ narrativeReview: NarrativeReview | null; usage: ProviderUsage }> {
  if (!input.kernel.narrativeFoundation) {
    return { narrativeReview: null, usage: input.baseUsage };
  }
  const makeCall = (correction?: { priorReview: unknown; groundingErrors: string[] }) => input.provider.json({
    model: input.model,
    system: `${NARRATIVE_REVIEW_SYSTEM_PROMPT}${correction ? '\nBản trước có quote không nguyên văn. Chỉ sửa literary review này; sao chép quote đúng từng ký tự từ đúng chương.' : ''}`,
    prompt: JSON.stringify({
      task: 'Đánh giá chuỗi chương như trải nghiệm đọc; phân tầng mọi finding về foundation, plan hoặc prose.',
      foundation: input.kernel.narrativeFoundation,
      diagnosticContext: input.diagnosticContext ?? null,
      chapters: input.chapters,
      correction: correction ?? null,
    }),
    schema: NarrativeReviewSchema,
    temperature: 0.3,
  });
  const groundingErrors = (review: NarrativeReview): string[] => review.findings.flatMap(finding => {
    if (finding.quote === null) return [];
    const chapter = input.chapters.find(item => item.chapterNumber === finding.chapterNumber);
    return chapter?.content.includes(finding.quote)
      ? []
      : [`Chapter ${String(finding.chapterNumber)} does not contain quote: ${finding.quote}`];
  });
  let first: Awaited<ReturnType<typeof makeCall>>;
  try {
    first = await makeCall();
  } catch (error) {
    throw reviewFailureWithUsage(error, [input.baseUsage], 'infra_blocked');
  }
  let firstReview: NarrativeReview;
  try {
    firstReview = NarrativeReviewSchema.parse(first.value);
  } catch (error) {
    throw reviewFailureWithUsage(error, [input.baseUsage, first.usage], 'quality_blocked');
  }
  const firstErrors = groundingErrors(firstReview);
  if (firstErrors.length === 0) {
    return { narrativeReview: firstReview, usage: mergeProviderUsage(input.baseUsage, first.usage) };
  }
  let second: Awaited<ReturnType<typeof makeCall>>;
  try {
    second = await makeCall({ priorReview: firstReview, groundingErrors: firstErrors });
  } catch (error) {
    throw reviewFailureWithUsage(error, [input.baseUsage, first.usage], 'infra_blocked');
  }
  const usage = mergeProviderUsage(mergeProviderUsage(input.baseUsage, first.usage), second.usage);
  let secondReview: NarrativeReview;
  try {
    secondReview = NarrativeReviewSchema.parse(second.value);
  } catch (error) {
    throw reviewFailureWithUsage(error, [usage], 'quality_blocked');
  }
  const secondErrors = groundingErrors(secondReview);
  if (secondErrors.length) {
    throw new StoryFactoryError('quality_blocked', 'Literary review evidence remained ungrounded after one localized correction.', {
      narrativeReviewGroundingErrors: secondErrors,
      usages: [usage],
    });
  }
  return { narrativeReview: secondReview, usage };
}

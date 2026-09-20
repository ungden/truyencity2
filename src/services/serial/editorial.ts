import { z } from 'zod';
import type { StoryModelProvider, ProviderUsage } from '@/services/story-factory/provider';
import { ChapterDraftSchema, type ChapterDraft, type Premise } from './contracts';
import { normalizeChapterDraft } from './agents';
import { craftBlock } from './playbook';
import { applyEditorialPatch, containsQuote, EditorialPatchSchema, factsForChapter, type EditorialFact, type EditorialFeedback } from './editorial-policy';

const score = z.number().int().min(0).max(5);

export const EditorialReviewSchema = z.object({
  scores: z.object({
    protagonistAgency: score,
    sceneLife: score,
    worldLogic: score,
    dialogueNaturalness: score,
    structuralFreshness: score,
    customerMomentum: score,
    payoff: score,
    continuity: score,
  }).strict(),
  issues: z.array(z.object({
    target: z.enum(['prose', 'context']).default('prose'),
    severity: z.enum(['blocking', 'important', 'minor']),
    quote: z.string().trim().min(4).max(400),
    explain: z.string().trim().min(4).max(600),
    positiveDirection: z.string().trim().min(4).max(600),
  }).strict()).max(8),
  summary: z.string().trim().min(4).max(800),
}).strict();
export type EditorialReview = z.infer<typeof EditorialReviewSchema>;

export interface EditorialRewriteInput {
  premise: Premise;
  chapterNumber: number;
  chapter: ChapterDraft;
  previousTail: string;
  nextHead: string;
  /** Historical inputs are retained for callers but never treated as reviewed canon. */
  canonicalDigest?: unknown;
  plannedBeat?: unknown;
  direction: string[];
  priorCritique?: EditorialReview;
  canon?: EditorialFact[];
  reviewFocus?: EditorialFeedback[];
  /** Reuse the current candidate after a failed audit; repair it rather than regenerating it. */
  mode?: 'rewrite' | 'repair';
  resume?: EditorialRewriteResult;
  onCheckpoint?: (result: EditorialRewriteResult) => void;
  model: string;
}

export interface EditorialRewriteResult {
  chapter: ChapterDraft;
  review: EditorialReview;
  accepted: boolean;
  attempts: number;
  usages: ProviderUsage[];
  costUsd: number;
  decision: 'accepted' | 'needs_review' | 'context_review' | 'repair_rejected';
  history: Array<{ chapter: ChapterDraft; review: EditorialReview; action: string }>;
  diagnostics: string[];
}

export const EDITORIAL_REWRITE_SYSTEM_PROMPT = `Bạn là biên tập viên kiêm tác giả truyện mạng thương mại tiếng Việt. Bạn biên tập chương theo canon đã duyệt và mục tiêu cảnh cụ thể.

Mục tiêu là cùng một sự thật truyện trở thành một chương sống:
- Một người muốn một kết quả cụ thể; lựa chọn và hành động của họ đẩy cảnh đi.
- Nhân vật chính có một quyết định, công sức, phát hiện hoặc thành quả dùng được ở vòng sau. Nếu cú thắng thuộc đồng minh, giữ trọn khoảnh khắc của đồng minh rồi cho thấy lựa chọn của main đã mở đường thế nào.
- Giá trị được chứng minh bằng một biến chuyển nhìn thấy. Người hiểu nghề gọi đúng cấp hoặc công dụng rồi hành động theo lợi ích riêng; mỗi người có phản ứng khác nhau.
- Chi tiết nghề là một bằng chứng quyết định. Hợp đồng, số liệu, phiếu và bảng chỉ xuất hiện khi chúng làm thay đổi quyền lợi ngay trong cảnh.
- Lời thoại dùng để mua, bán, dụ, ép, khoe, che, xin, từ chối hoặc giữ thứ thuộc về mình. Ý nghĩa lớn nằm trong kết quả, không nằm trong khẩu hiệu.
- Mỗi chương có một hình dạng riêng. Nhịp thưởng của chương này xuất phát từ brief biên tập, không sao lại màn demo hoặc tiếng hô của chương trước.
- Lời hẹn đang nợ được thực hiện trước khi mở lời hẹn mới. Kết chương sau khi độc giả đã được hưởng kết quả của chương.
- Khi chương nằm trong một vòng khách hàng, dựng phần việc thật của vòng: khách mua đúng món, dùng nó để săn/kiếm tiền/thăng cấp, phô ra kết quả trước người từng coi thường hoặc người hiểu giá, rồi mang tài nguyên và địa vị mới trở lại mua món cao hơn. Không kể tóm tắt cả vòng và không để khách chỉ giàu lên mà không đổi năng lực hoặc vị thế.
- Cửa xuyên và người có quyền đi qua phải đúng nguyên văn luật kim thủ chỉ.

Canon đã duyệt là nguồn sự thật về giao dịch và tiến triển. Chỉ đạo chương xác định cảnh cần viết; đoạn nối hai bên cung cấp ngữ cảnh. Bản cũ là nguyên liệu biên tập. Giữ tên chương cùng các sự thật đã duyệt, dựng chúng thành lựa chọn, hành động và kết quả. Dùng tiếng Việt có dấu, đoạn ngắn, giàu thoại và hành động. Thân chương khoảng 1.400–2.100 từ.

${craftBlock('writer')}

Trả đúng title và content của toàn bộ chương sau khi viết lại.`;

export const EDITORIAL_REVIEW_SYSTEM_PROMPT = `Bạn là tổng biên tập đọc một chương truyện mạng vừa được viết lại.

Chấm 0–5 tám mặt: vai trò chủ động của main, sức sống cảnh, logic thế giới, thoại tự nhiên, cấu trúc mới, đà đi lên của khách hàng, payoff và continuity. Điểm 4 nghĩa là có thể đăng; 5 chỉ dành cho chương thật sự nổi bật.

Một chương đạt khi:
- sự thật trong canon đã duyệt và nối cảnh hai bên được giữ;
- luật cửa xuyên, cấp bậc, giao dịch và quyền sở hữu hợp logic;
- lời hẹn trọng tâm được trả bằng kết quả nhìn thấy;
- chương đọc như truyện, không như dashboard, biên bản, bài thuyết trình hay prompt được nhân vật đọc thành lời;
- phản ứng xuất phát từ lợi ích riêng, không phải đám đông đồng thanh để xác nhận checklist.
- nếu brief giao một mắt xích của vòng khách hàng thì mắt xích ấy phải xảy ra trên trang và tạo vốn, sức mạnh hoặc địa vị cho lần mua kế tiếp.

Mỗi issue có target: prose khi lỗi nằm trong chương đang chấm, context khi các nguồn được cấp mâu thuẫn nhau. Với prose, quote phải có nguyên văn trong chính bảnVietLai. Nêu hướng sửa dương tính và hệ quả đối với trải nghiệm đọc. Chỉ dùng blocking cho mâu thuẫn canon/logic làm hỏng chương sau; important cho lỗi văn làm mất hứng đọc; minor cho tiểu tiết. Chấm mắt xích khách hàng được giao cho chương này trong toàn vòng; một chương săn hàng có thể đạt 4 dù cảnh mua nâng cấp nằm ở chương sau. Điểm là đánh giá, mỗi vấn đề cần sửa có một issue cụ thể.`;

const totalCost = (usages: ProviderUsage[]): number => Number(
  usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6),
);

export function editorialReviewPasses(review: EditorialReview, chapter: ChapterDraft): boolean {
  const scores = Object.values(review.scores);
  const wordCount = chapter.content.trim().split(/\s+/).length;
  return review.issues.every(issue => issue.severity === 'minor')
    && scores.every(value => value >= 4)
    && wordCount >= 1_200
    && wordCount <= 2_300;
}

const brief = (input: EditorialRewriteInput) => ({
  truyen: {
    tieuDe: input.premise.title,
    readerFantasy: input.premise.readerFantasy,
    kimThuChi: input.premise.goldenFinger,
    giong: input.premise.voiceSheet,
  },
  chuongSo: input.chapterNumber,
  tieuDeGiuNguyen: input.chapter.title,
  banCu: input.chapter.content,
  canonDaDuyet: factsForChapter(input.canon ?? [], input.chapterNumber),
  chiDaoBienTap: input.direction,
  doanCuoiChuongTruoc: input.previousTail,
  doanDauChuongSau: input.nextHead,
});

async function reviewDraft(
  provider: StoryModelProvider,
  input: EditorialRewriteInput,
  chapter: ChapterDraft,
): Promise<{ review: EditorialReview; usage: ProviderUsage }> {
  const result = await provider.json({
    model: input.model,
    system: EDITORIAL_REVIEW_SYSTEM_PROMPT,
    prompt: JSON.stringify({
      chuongSo: input.chapterNumber,
      readerFantasy: input.premise.readerFantasy,
      kimThuChi: { ten: input.premise.goldenFinger.name, luat: input.premise.goldenFinger.rule, phamVi: input.premise.goldenFinger.scope },
      canonDaDuyet: factsForChapter(input.canon ?? [], input.chapterNumber),
      chiDaoBienTap: input.direction,
      doanCuoiChuongTruoc: input.previousTail,
      doanDauChuongSau: input.nextHead,
      banVietLai: chapter,
      diemCanKiemTuLanTruoc: input.reviewFocus ?? [],
    }, null, 1),
    schema: EditorialReviewSchema,
    temperature: 0.2,
    timeoutMs: 180_000,
  });
  return { review: result.value, usage: result.usage };
}

export async function rewriteChapterEditorially(
  provider: StoryModelProvider,
  input: EditorialRewriteInput,
): Promise<EditorialRewriteResult> {
  // Validate the source contract before any paid call. Digests/old beats are derived
  // from the superseded prose and deliberately do not enter the editorial prompt.
  factsForChapter(input.canon ?? [], input.chapterNumber);
  const usages: ProviderUsage[] = [...(input.resume?.usages ?? [])];
  const diagnostics: string[] = [...(input.resume?.diagnostics ?? [])];
  const history: EditorialRewriteResult['history'] = [...(input.resume?.history ?? [])];
  let attempts = input.resume?.attempts ?? 0;
  let chapter = input.resume?.chapter ?? input.chapter;
  if (!input.resume && input.mode !== 'repair') {
    const first = await provider.json({
      model: input.model,
      system: EDITORIAL_REWRITE_SYSTEM_PROMPT,
      prompt: JSON.stringify(brief(input), null, 1),
      schema: ChapterDraftSchema,
      temperature: 0.9,
      timeoutMs: 240_000,
    });
    usages.push(first.usage);
    chapter = normalizeChapterDraft({ ...first.value, title: input.chapter.title });
    attempts++;
  }
  let reviewed: { review: EditorialReview };
  if (input.resume) {
    reviewed = { review: EditorialReviewSchema.parse(input.resume.review) };
  } else {
    const firstReview = await reviewDraft(provider, input, chapter);
    reviewed = firstReview;
    usages.push(firstReview.usage);
    history.push({ chapter, review: reviewed.review, action: input.mode === 'repair' ? 'review_existing' : 'rewrite' });
  }
  const result = (decision: EditorialRewriteResult['decision']): EditorialRewriteResult => ({
    chapter, review: reviewed.review, accepted: decision === 'accepted', attempts,
    usages: [...usages], costUsd: totalCost(usages), decision, history: [...history], diagnostics: [...diagnostics],
  });
  input.onCheckpoint?.(result('needs_review'));
  if (editorialReviewPasses(reviewed.review, chapter)) return result('accepted');

  const issues = reviewed.review.issues.filter(issue => issue.severity !== 'minor');
  if (issues.some(issue => issue.target === 'context' || !containsQuote(chapter.content, issue.quote))) {
    diagnostics.push('Review requires context/evidence correction before prose repair.');
    return result('context_review');
  }
  // Low scores without an actionable diagnosis cannot justify another generation.
  if (issues.length === 0) return result('needs_review');
  const original = { chapter, reviewed };
  try {
    const second = await provider.json({
      model: input.model,
      system: 'Bạn sửa các đoạn được chỉ ra trong một chương đã viết. Trả edits gồm before nguyên văn liên tiếp và duy nhất trong chương, after là đoạn thay thế. Giữ nguyên những cảnh đã tốt và sửa hệ quả trực tiếp của lỗi trong cùng đoạn. Phạm vi sửa tối đa 35% chương. Canon đã duyệt là nguồn sự thật.',
      prompt: JSON.stringify({
        canonDaDuyet: factsForChapter(input.canon ?? [], input.chapterNumber),
        kimThuChi: { ten: input.premise.goldenFinger.name, luat: input.premise.goldenFinger.rule, phamVi: input.premise.goldenFinger.scope },
        chiDaoBienTap: input.direction,
        banVietLai: chapter,
        loiCanSua: issues,
      }, null, 1),
      schema: EditorialPatchSchema,
      temperature: 0.3,
      timeoutMs: 240_000,
    });
    usages.push(second.usage);
    attempts++;
    chapter = applyEditorialPatch(chapter, second.value);
    const repairedReview = await reviewDraft(provider, input, chapter);
    reviewed = repairedReview;
    usages.push(repairedReview.usage);
    history.push({ chapter, review: reviewed.review, action: 'targeted_patch' });
    const burden = (review: EditorialReview) => review.issues.reduce((sum, issue) =>
      sum + (issue.severity === 'blocking' ? 100 : issue.severity === 'important' ? 10 : 0), 0);
    const average = (review: EditorialReview) => Object.values(review.scores).reduce((a, b) => a + b, 0) / 8;
    if (burden(reviewed.review) > burden(original.reviewed.review)
      || (burden(reviewed.review) === burden(original.reviewed.review)
        && average(reviewed.review) <= average(original.reviewed.review))) {
      chapter = original.chapter;
      reviewed = original.reviewed;
      diagnostics.push('Repair did not improve the review; retained the previous candidate.');
      return result('repair_rejected');
    }
  } catch (error) {
    chapter = original.chapter;
    reviewed = original.reviewed;
    diagnostics.push(error instanceof Error ? error.message : String(error));
    return result('repair_rejected');
  }
  return result(editorialReviewPasses(reviewed.review, chapter) ? 'accepted' : 'needs_review');
}

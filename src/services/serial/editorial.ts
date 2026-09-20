import { z } from 'zod';
import type { StoryModelProvider, ProviderUsage } from '@/services/story-factory/provider';
import { ChapterDraftSchema, type ChapterDraft, type Premise } from './contracts';
import { normalizeChapterDraft } from './agents';
import { craftBlock } from './playbook';

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
  canonicalDigest: unknown;
  plannedBeat: unknown;
  direction: string[];
  priorCritique?: EditorialReview;
  model: string;
}

export interface EditorialRewriteResult {
  chapter: ChapterDraft;
  review: EditorialReview;
  accepted: boolean;
  attempts: number;
  usages: ProviderUsage[];
  costUsd: number;
}

export const EDITORIAL_REWRITE_SYSTEM_PROMPT = `Bạn là biên tập viên kiêm tác giả truyện mạng thương mại tiếng Việt. Bạn đang viết lại một chương đã đúng canon nhưng đọc còn máy móc.

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

Giữ nguyên các sự thật trong canonicalDigest, số hàng, bên giao nhận, cấp bậc, người biết bí mật, kết quả đã ảnh hưởng chương sau và tiêu đề được cấp. Có thể thay toàn bộ cách dựng cảnh, lời thoại, thứ tự chi tiết và góc nhìn để chương tự nhiên hơn. Dùng tiếng Việt có dấu, đoạn ngắn, giàu thoại và hành động. Thân chương khoảng 1.400–2.100 từ.

${craftBlock('writer')}

Trả đúng title và content của toàn bộ chương sau khi viết lại.`;

export const EDITORIAL_REVIEW_SYSTEM_PROMPT = `Bạn là tổng biên tập đọc một chương truyện mạng vừa được viết lại.

Chấm 0–5 tám mặt: vai trò chủ động của main, sức sống cảnh, logic thế giới, thoại tự nhiên, cấu trúc mới, đà đi lên của khách hàng, payoff và continuity. Điểm 4 nghĩa là có thể đăng; 5 chỉ dành cho chương thật sự nổi bật.

Một chương đạt khi:
- mọi sự thật trong canonicalDigest và nối cảnh hai bên được giữ;
- luật cửa xuyên, cấp bậc, giao dịch và quyền sở hữu hợp logic;
- lời hẹn trọng tâm được trả bằng kết quả nhìn thấy;
- chương đọc như truyện, không như dashboard, biên bản, bài thuyết trình hay prompt được nhân vật đọc thành lời;
- phản ứng xuất phát từ lợi ích riêng, không phải đám đông đồng thanh để xác nhận checklist.
- nếu brief giao một mắt xích của vòng khách hàng thì mắt xích ấy phải xảy ra trên trang và tạo vốn, sức mạnh hoặc địa vị cho lần mua kế tiếp.

Mỗi issue phải trích nguyên văn và đưa hướng sửa dương tính: cảnh nào, ai muốn gì, hành động nào nên gánh thông tin. Chỉ dùng blocking cho mâu thuẫn canon/logic làm hỏng chương sau; important cho lỗi văn làm mất hứng đọc; minor cho tiểu tiết.`;

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

const brief = (input: EditorialRewriteInput, critique?: EditorialReview) => ({
  truyen: {
    tieuDe: input.premise.title,
    readerFantasy: input.premise.readerFantasy,
    kimThuChi: input.premise.goldenFinger,
    giong: input.premise.voiceSheet,
  },
  chuongSo: input.chapterNumber,
  tieuDeGiuNguyen: input.chapter.title,
  banCu: input.chapter.content,
  suThatPhaiGiu: input.canonicalDigest,
  nhipKeHoach: input.plannedBeat,
  chiDaoBienTap: input.direction,
  doanCuoiChuongTruoc: input.previousTail,
  doanDauChuongSau: input.nextHead,
  phanBienBanTruoc: critique ?? input.priorCritique ?? null,
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
      canonicalDigest: input.canonicalDigest,
      chiDaoBienTap: input.direction,
      doanCuoiChuongTruoc: input.previousTail,
      doanDauChuongSau: input.nextHead,
      banVietLai: chapter,
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
  const usages: ProviderUsage[] = [];
  const first = await provider.json({
    model: input.model,
    system: EDITORIAL_REWRITE_SYSTEM_PROMPT,
    prompt: JSON.stringify(brief(input), null, 1),
    schema: ChapterDraftSchema,
    temperature: 0.9,
    timeoutMs: 240_000,
  });
  usages.push(first.usage);
  let chapter = normalizeChapterDraft({ ...first.value, title: input.chapter.title });
  let reviewed = await reviewDraft(provider, input, chapter);
  usages.push(reviewed.usage);

  if (!editorialReviewPasses(reviewed.review, chapter)) {
    const second = await provider.json({
      model: input.model,
      system: EDITORIAL_REWRITE_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        ...brief(input, reviewed.review),
        banVietLaiLanDau: chapter,
        yeuCau: 'Viết lại toàn chương theo phản biện. Giữ canon, nhưng dựng lại cảnh để các lỗi quan trọng biến mất.',
      }, null, 1),
      schema: ChapterDraftSchema,
      temperature: 0.8,
      timeoutMs: 240_000,
    });
    usages.push(second.usage);
    chapter = normalizeChapterDraft({ ...second.value, title: input.chapter.title });
    reviewed = await reviewDraft(provider, input, chapter);
    usages.push(reviewed.usage);
  }

  return {
    chapter,
    review: reviewed.review,
    accepted: editorialReviewPasses(reviewed.review, chapter),
    attempts: usages.length > 2 ? 2 : 1,
    usages,
    costUsd: totalCost(usages),
  };
}

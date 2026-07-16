import type { ChapterPlanV3 } from './contracts';
import type { V3RoleContext } from './context';
import type { V3Evidence } from './preflight';

export const FLAGSHIP_V3_PROMPT_VERSION = 'flagship-v3.0-structured-scenes-reeditor';

export const V3_WRITER_SYSTEM = `Bạn là tiểu thuyết gia của đúng một bộ truyện.
Viết một chương hoàn chỉnh từ dữ liệu cảnh, không chép câu mô tả trong kế hoạch.
Chỉ sử dụng nhân vật, tri thức, quyền hạn, tài nguyên và quy tắc có trong context.
Mọi thay đổi bắt buộc phải xảy ra qua hành động, đối thoại và hậu quả nhìn thấy được.
hookIntent là loại hiệu ứng kết chương, không phải câu văn cần sao chép.
Không nhắc JSON, schema, prompt, model, state, delta hoặc tên trường dữ liệu.
Chỉ trả JSON {"title":"...","content":"..."}.`;

export const V3_EDITOR_SYSTEM = `Bạn là biên tập viên độc lập, không viết hộ tác giả và không thưởng vì đủ checklist.
Chấm canon, timeline, tài nguyên, tri thức, quyền hạn, độ trung thành với plan và chất lượng đọc.
Mọi evidence và realizedDeltaEvidence phải copy nguyên một substring có thật trong PROSE.
realizedDeltaEvidence phải chứng minh từng required delta đã thực sự xảy ra trong văn xuôi.
hardGates dùng pass=true. Chỉ publish khi mọi hard gate đạt và chất lượng thực sự đủ mạnh.
Chỉ trả JSON đúng schema.`;

const json = (value: unknown): string => JSON.stringify(value);

export function buildV3WriterPrompt(input: {
  chapterNumber: number;
  targetWordCount: number;
  context: V3RoleContext;
}): string {
  return `Viết chương ${input.chapterNumber}, mục tiêu khoảng ${input.targetWordCount} từ.
Không dùng câu báo cáo trạng thái. Không bê nguyên câu từ plan. Dừng sau khi hookIntent cuối đã được dramatize.

ROLE_CONTEXT=${input.context.text}

Chỉ trả JSON {"title":"tiêu đề cụ thể","content":"toàn văn chương"}.`;
}

export function buildV3EditorPrompt(input: {
  plan: ChapterPlanV3;
  context: V3RoleContext;
  title: string;
  content: string;
  deterministicEvidence: V3Evidence[];
}): string {
  return `Đánh giá chương ${input.plan.chapterNumber}.
Ngưỡng publish: confidence >=0.70; desire_to_read_next >=8; prose_naturalness, character_voice, domain_truth >=7.5; không trục nào dưới 7.
Nếu deterministic evidence có lỗi, kiểm chứng lại trong prose; không được bỏ qua lỗi có substring chính xác.
Nếu revise, chỉ dẫn phải cục bộ và có evidence. Canon/timeline/resource/knowledge/authority sai nền tảng phải reject.

ROLE_CONTEXT=${input.context.text}
DETERMINISTIC_EVIDENCE=${json(input.deterministicEvidence)}
TITLE=${json(input.title)}
PROSE=${json(input.content)}

Trả duy nhất JSON QualityVerdictV3.`;
}

export function buildV3RevisionPrompt(input: {
  chapterNumber: number;
  context: V3RoleContext;
  title: string;
  content: string;
  evidence: V3Evidence[];
  instructions: string[];
}): string {
  return `Sửa đúng một lượt chương ${input.chapterNumber}.
Giữ nguyên các sự kiện và delta đã đúng. Chỉ sửa lỗi có evidence, không thêm nhân vật, twist, tài nguyên hoặc setup.

ROLE_CONTEXT=${input.context.text}
CURRENT=${json({ title: input.title, content: input.content })}
EVIDENCE=${json(input.evidence)}
INSTRUCTIONS=${json(input.instructions)}

Chỉ trả JSON {"title":"...","content":"..."}.`;
}

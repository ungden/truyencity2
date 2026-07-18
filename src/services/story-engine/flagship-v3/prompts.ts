import type { ChapterPlanV3 } from './contracts';
import type { V3RoleContext } from './context';
import type { V3Evidence } from './preflight';
import type { V3ProseSpan } from './evidence-spans';

export const FLAGSHIP_V3_PROMPT_VERSION = 'flagship-v3.7-binary-evidence-editor';

export const V3_WRITER_SYSTEM = `Bạn là tiểu thuyết gia của đúng một bộ truyện.
Viết một chương hoàn chỉnh từ dữ liệu cảnh, không chép câu mô tả trong kế hoạch.
Chỉ sử dụng nhân vật, tri thức, quyền hạn, tài nguyên và quy tắc có trong context.
Mọi thay đổi bắt buộc phải xảy ra qua hành động, đối thoại và hậu quả nhìn thấy được.
Giữ đúng POV của từng scene; povCharacterId phải là tâm điểm tri giác của scene đó, không chuyển sang nội tâm người khác.
Mỗi scene trong ChapterPlan là một đơn vị kịch riêng và phải xuất hiện theo đúng thứ tự. Không gộp hai scene, kể cả khi cùng địa điểm hoặc cùng nhân vật. Khi povCharacterId đổi, phải tạo ranh giới cảnh rõ bằng ngắt đoạn/chuyển cảnh rồi mới đi vào tri giác của POV mới.
durationMinutes và travelMinutesFromPrevious là số phút canon. Không tự đổi thành canh giờ, buổi hoặc quãng thời gian khác; nếu diễn đạt tự nhiên phải giữ đúng lượng phút.
hookIntent là loại hiệu ứng kết chương, không phải câu văn cần sao chép.
Không nhắc JSON, schema, prompt, model, state, delta hoặc tên trường dữ liệu.
Chỉ trả JSON {"title":"...","content":"..."}.`;

export const V3_EDITOR_SYSTEM = `Bạn là biên tập viên độc lập, không viết hộ tác giả và không thưởng vì đủ checklist.
Đánh giá nhị phân canon, timeline, tài nguyên, tri thức, quyền hạn, độ trung thành với plan và chất lượng đọc. Không cho điểm 0-10 và không tự quyết định publish/revise/reject; code sẽ quyết định từ gate và evidence.
Mọi evidence và realizedDeltaEvidence phải chọn đúng spanId có sẵn trong PROSE_SPANS; không tự chép excerpt hoặc tự tính offset.
DETERMINISTIC_EVIDENCE đã do code định vị chính xác; không lặp lại các lỗi đó trong evidence. Chỉ dùng evidence cho lỗi mới mà deterministic preflight chưa nêu.
realizedDeltaEvidence phải chứng minh từng required delta đã thực sự xảy ra trong văn xuôi.
Nhánh status=pass chỉ hợp lệ khi mọi hardGates và qualityGates đều literal true, issues=[] và revisionInstructions=[].
Nhánh status=issues phải có ít nhất một issue gắn gate, severity, spanId, locality và repairMode. repairMode=artifact_blocked chỉ khi chính artifact bất biến mâu thuẫn nội tại, không dùng để né sửa prose.
Plan, canon và state đã commit là bất biến trong lượt viết. Nếu prose lệch chúng, chỉ được yêu cầu sửa prose; tuyệt đối không đề nghị sửa plan, state, tracking hoặc canon.
revisionInstructions chỉ chứa tối đa ba thao tác sửa cụ thể, không khen, không nhận xét chung và không bảo Writer giữ nguyên lỗi.
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
  spans: V3ProseSpan[];
  deterministicEvidence: V3Evidence[];
}): string {
  return `Đánh giá chương ${input.plan.chapterNumber}.
Mỗi quality gate chỉ true khi chương thực sự đạt chuẩn xuất bản chuyên nghiệp, không phải chỉ có mặt một yếu tố. desire_to_read_next=true nghĩa là diễn biến nhân quả và câu hỏi còn mở đủ mạnh để muốn đọc ngay chương sau; prose_naturalness=true nghĩa là văn Việt tự nhiên, không sáo, không giọng AI báo cáo; character_voice và domain_truth phải đúng xuyên suốt.
Nếu bất kỳ gate nào false, phải trả status=issues và trích span chính xác giải thích nguyên nhân. Không được trả gate false mà thiếu issue tương ứng.
Nếu deterministic evidence có lỗi, kiểm chứng lại trong prose; không được bỏ qua lỗi có substring chính xác.
Không chép lại deterministic evidence vào issues. Nếu prose sửa được thì dùng local_edit hoặc full_rewrite và viết chỉ dẫn cụ thể; nếu artifact thật sự sai mới dùng artifact_blocked.

ROLE_CONTEXT=${input.context.text}
DETERMINISTIC_EVIDENCE=${json(input.deterministicEvidence)}
TITLE=${json(input.title)}
PROSE_SPANS=${json(input.spans.map(span => ({ id: span.id, text: span.text })))}

Trả duy nhất JSON EditorAssessmentV3.`;
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
Plan, canon và state trong ROLE_CONTEXT là bất biến. Nếu CURRENT mâu thuẫn với chúng, phải sửa CURRENT cho khớp; không được tự sửa hoặc đề nghị sửa dữ liệu nền.
Phải thực hiện thay đổi văn bản cụ thể cho từng evidence. Không được trả lại nguyên văn CURRENT, kể cả khi cho rằng bản hiện tại hợp lý hơn.

ROLE_CONTEXT=${input.context.text}
CURRENT=${json({ title: input.title, content: input.content })}
EVIDENCE=${json(input.evidence)}
INSTRUCTIONS=${json(input.instructions)}

Chỉ trả JSON {"title":"...","content":"..."}.`;
}

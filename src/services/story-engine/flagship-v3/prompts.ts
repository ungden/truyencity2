import type { ChapterPlanV3 } from './contracts';
import type { V3RoleContext } from './context';
import type { V3Evidence } from './preflight';
import type { V3ProseSpan } from './evidence-spans';

export const FLAGSHIP_V3_PROMPT_VERSION = 'flagship-v3.14-mechanics-locked-prose-free';

export const V3_CHAPTER_LENGTH_POLICY = {
  softMinWords: 1_200,
  softMaxWords: 1_800,
  hardMinWords: 1_000,
  hardMaxWords: 2_200,
} as const;

export const V3_WRITER_SYSTEM = `Bạn là tiểu thuyết gia của đúng một bộ truyện.
Tiếp nối tự nhiên phần cuối chương trước nếu được cung cấp, nhưng không kể lại hoặc sao chép nó.
WRITER_BRIEF khóa sự kiện, POV, tri thức, quy tắc và sổ cái; bạn tự quyết định lời văn, đối thoại, nhịp, hình ảnh và cách cảm xúc diễn ra.
Thực hiện mọi required delta bằng hành động hoặc hậu quả nhìn thấy được. Mọi con số phải khớp chính xác với brief.
ID, tên trường và đơn vị sổ cái là dữ liệu điều khiển, không phải giao diện trong thế giới truyện; chỉ thể hiện hệ quả của chúng bằng cách nói và hành động tự nhiên của nhân vật.
Viết từng scene theo đúng sceneId và thứ tự, chỉ đi vào nội tâm của povCharacterId. Dừng khi hiệu ứng hookIntent cuối đã hình thành; không kéo dài để đủ chữ.
Mỗi đoạn văn là một phần tử paragraphs riêng. Không nhắc dữ liệu điều khiển trong truyện.
Chỉ trả JSON {"title":"...","scenes":[{"sceneId":"...","paragraphs":["đoạn 1","đoạn 2","đoạn 3"]}]}.`;

export const V3_EDITOR_SYSTEM = `Bạn là biên tập viên độc lập, không viết hộ tác giả và không thưởng vì đủ checklist.
Đánh giá nhị phân canon, timeline, tài nguyên, tri thức, quyền hạn, độ trung thành với plan và chất lượng đọc. Không cho điểm 0-10 và không tự quyết định publish/revise/reject; code sẽ quyết định từ gate và evidence.
Mọi evidence và realizedDeltaEvidence phải chọn đúng spanId có sẵn trong PROSE_SPANS; không tự chép excerpt hoặc tự tính offset.
DETERMINISTIC_EVIDENCE đã do code định vị chính xác; không lặp lại các lỗi đó trong evidence. Chỉ dùng evidence cho lỗi mới mà deterministic preflight chưa nêu.
realizedDeltaEvidence phải chứng minh từng required delta đã thực sự xảy ra trong văn xuôi.
Nhánh status=pass chỉ hợp lệ khi mọi hardGates và qualityGates đều literal true, issues=[] và revisionInstructions=[].
Nhánh status=issues phải liệt kê hết các lỗi chặn xuất bản nhìn thấy được, tối đa ba lỗi quan trọng nhất; không được dừng sau lỗi đầu tiên. Mỗi issue phải gắn gate, severity, spanId, locality và repairMode. repairMode=artifact_blocked chỉ khi chính artifact bất biến mâu thuẫn nội tại, không dùng để né sửa prose.
Plan, canon và state đã commit là bất biến trong lượt viết. Nếu prose lệch chúng, chỉ được yêu cầu sửa prose; tuyệt đối không đề nghị sửa plan, state, tracking hoặc canon.
revisionInstructions chỉ chứa tối đa ba thao tác sửa cụ thể, không khen, không nhận xét chung và không bảo Writer giữ nguyên lỗi.
Trước khi trả pass, bắt buộc tự làm một lượt phản biện cuối: đối chiếu từng lời thoại chứa tiền/vật tư với ledger hiện tại; tìm cụm ẩn dụ sáo lặp, lời bình tác giả và câu thoại quá giáo điều; rà từ đầu đến cuối thay vì dừng sau một đoạn hay.
Chỉ trả JSON đúng schema.`;

const json = (value: unknown): string => JSON.stringify(value);

export function buildV3WriterPrompt(input: {
  chapterNumber: number;
  targetWordCount: number;
  context: V3RoleContext;
}): string {
  return `Viết chương ${input.chapterNumber}. Bản hoàn chỉnh phải nằm trong hard range ${V3_CHAPTER_LENGTH_POLICY.hardMinWords}-${V3_CHAPTER_LENGTH_POLICY.hardMaxWords} từ; khoảng tự nhiên nên hướng tới là ${V3_CHAPTER_LENGTH_POLICY.softMinWords}-${V3_CHAPTER_LENGTH_POLICY.softMaxWords} từ. Kết thúc cảnh tự nhiên, không thêm độc thoại, giải thích hoặc tổng kết để kéo chữ. title chỉ là tên riêng của chương, không thêm tiền tố "Chương ${input.chapterNumber}:".
PREVIOUS_CHAPTER_TAIL chỉ là điểm nối về hành động và giọng; bắt đầu từ trạng thái sau đoạn đó, không chép hoặc kể lại.

ROLE_CONTEXT=${input.context.text}

Chỉ trả JSON {"title":"tiêu đề cụ thể","scenes":[{"sceneId":"ID đúng từ plan","paragraphs":["mỗi đoạn văn là một phần tử riêng"]}]}.`;
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
Phải đọc toàn bộ chương và liệt kê tối đa ba lỗi chặn xuất bản quan trọng nhất trong cùng một lượt; đừng dừng ở lỗi đầu tiên.
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
  targetWordCount: number;
  context: V3RoleContext;
  title: string;
  content: string;
  evidence: V3Evidence[];
  instructions: string[];
  repairMode: 'local_edit' | 'full_rewrite';
  allowedSpans?: Array<{ id: string; text: string }>;
}): string {
  const outputContract = input.repairMode === 'local_edit'
    ? `Chỉ được thay đúng các span trong ALLOWED_SPANS. Trả JSON {"patches":[{"spanId":"...","replacement":"..."}]}; không trả toàn chương, không sửa title, không sửa span khác.`
    : `Viết lại toàn chương theo từng scene. Mỗi đoạn văn là một phần tử riêng; trả JSON {"title":"...","scenes":[{"sceneId":"ID đúng từ plan","paragraphs":["đoạn 1","đoạn 2"]}]}.`;
  return `Sửa đúng một lượt chương ${input.chapterNumber} bằng chế độ ${input.repairMode}.
Giữ chương trong hard range ${V3_CHAPTER_LENGTH_POLICY.hardMinWords}-${V3_CHAPTER_LENGTH_POLICY.hardMaxWords} từ. Không thêm đoạn đệm để đạt độ dài; chỉ làm cho cảnh và lỗi có evidence được giải quyết trọn vẹn.
Giữ nguyên các sự kiện và delta đã đúng. Chỉ sửa lỗi có evidence, không thêm nhân vật, twist, tài nguyên hoặc setup.
Plan, canon và state trong ROLE_CONTEXT là bất biến. Nếu CURRENT mâu thuẫn với chúng, phải sửa CURRENT cho khớp; không được tự sửa hoặc đề nghị sửa dữ liệu nền.
Phải thực hiện thay đổi văn bản cụ thể cho từng evidence. Không được trả lại nguyên văn CURRENT, kể cả khi cho rằng bản hiện tại hợp lý hơn.

ROLE_CONTEXT=${input.context.text}
CURRENT=${json({ title: input.title, content: input.content })}
EVIDENCE=${json(input.evidence)}
INSTRUCTIONS=${json(input.instructions)}
ALLOWED_SPANS=${json(input.allowedSpans || [])}

${outputContract}`;
}

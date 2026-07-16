import type { ArcPlanV2, ChapterPlanV2, StorySpecV2, StoryStateV2 } from './contracts';
import type { QualityEvidenceV2 } from './quality-verdict';

export const FLAGSHIP_PROMPT_VERSION = 'flagship-clean-v2.6-auditable-editor';

export const DIRECTOR_SYSTEM = `Bạn là Scene Director của đúng một bộ truyện.
Chỉ khóa kế hoạch chương đã được chuẩn bị; không viết văn xuôi, không tạo canon mới, không dùng trope hay luật thể loại mặc định.
Mọi scene phải có ham muốn, lực cản, chiến thuật, cái giá và thay đổi không thể đảo ngược.
Giữ nhịp hồi phục, vòng thưởng và tiến bộ đúng pleasureProfile của truyện; không kéo dài bất lực quá setbackRecoveryWindow.
Prepared ChapterPlan là identity lock: giữ nguyên số scene, mọi scene.id, toàn bộ key stateAfter/stateDelta.facts, danh sách name/resource/id trong stateDelta, promisesAdvanced và promisesPaid. Chỉ được làm rõ nội dung mô tả bên trong cấu trúc đã khóa.
Giữ nguyên schema ChapterPlanV2 và chỉ trả JSON.`;

export const WRITER_SYSTEM = `Bạn là tiểu thuyết gia viết đúng một chương theo kernel riêng được cung cấp.
ChapterPlan là hợp đồng nội dung. Chỉ dùng sự thật, nguồn lực, tri thức và giọng nói có trong input.
Chỉ dramatize các scene có trong ChapterPlan, theo đúng ranh giới của chúng. Kết thúc ngay tại exitHook của scene cuối; nextChapterPressure chỉ là ranh giới dừng, tuyệt đối không viết hành động hoặc kết quả thuộc áp lực đó trong chương hiện tại.
Không tự tạo cứu viện, tài sản, quyền lực, ký ức hay setup. Không nhắc prompt, schema, model hoặc rubric.
Viết tiếng Việt tự nhiên, cụ thể qua hành động, đối thoại và hậu quả. Chỉ trả JSON {"title":"...","content":"..."}.`;

export const EDITOR_SYSTEM = `Bạn là biên tập viên độc lập. Không viết lại chương và không thưởng cho việc đủ checklist.
Đánh giá bằng bằng chứng nằm trong văn bản: canon, timeline, tri thức nhân vật, quyền hạn, nhân quả tài nguyên, fidelity với plan, giọng nhân vật, căng thẳng cảnh, chuyển động cảm xúc, sự thật ngành nghề, độ tự nhiên, agency, phần thưởng kiếm được, nhịp hồi phục và nhu cầu đọc tiếp.
Hạ điểm nếu người xung quanh chỉ kinh ngạc, đối thủ tự ngu để bị phản đòn, hoặc nhân vật chính chịu dồn khổ mà không tạo thay đổi trạng thái.
Mỗi lỗi phải có start/end/excerpt; excerpt phải copy/paste một substring Unicode liên tục có thật trong PROSE, không rút gọn bằng dấu ba chấm, không sửa dấu và không paraphrase. Mọi boolean trong hardGates đều biểu thị gate đã vượt qua; riêng promptLeak=true nghĩa là không phát hiện prompt leak. Chỉ trả JSON đúng schema được yêu cầu.`;

function json(value: unknown): string {
  return JSON.stringify(value);
}

export function buildDirectorPrompt(input: {
  storySpec: StorySpecV2;
  arcPlan: ArcPlanV2;
  storyState: StoryStateV2;
  preparedPlan: ChapterPlanV2;
  roleContexts?: { director: string };
}): string {
  const bounded = input.roleContexts?.director;
  return `Khóa ChapterPlan đã chuẩn bị cho chương ${input.preparedPlan.chapterNumber}.
Không đổi premise, canon, đích arc hoặc tạo nguồn lực ngoài state. Loại scene không đổi trạng thái.
Sao chép byte-for-byte các trường identity đã khóa: scene.id; key của stateAfter và stateDelta.facts; name/resource/id của mọi delta; promisesAdvanced; promisesPaid. Không thêm, xóa, đổi tên hay thay thứ tự các identity này.

${bounded
    ? `ROLE_CONTEXT_BOUNDED=${bounded}`
    : `STORY_KERNEL=${json(input.storySpec)}
ARC_PLAN=${json(input.arcPlan)}
CURRENT_STATE=${json(input.storyState)}
PREPARED_CHAPTER_PLAN=${json(input.preparedPlan)}`}

Trả lại duy nhất một ChapterPlanV2 hoàn chỉnh bằng JSON.`;
}

export function buildWriterPrompt(input: {
  storySpec: StorySpecV2;
  chapterPlan: ChapterPlanV2;
  storyState: StoryStateV2;
  targetWordCount: number;
  roleContexts?: { writer: string };
}): string {
  const voiceContract = {
    storyIdentity: input.storySpec.storyIdentity,
    pleasureProfile: input.storySpec.pleasureProfile,
    readerFantasy: input.storySpec.readerFantasy,
    premise: input.storySpec.premise,
    protagonist: input.storySpec.protagonist,
    cast: input.storySpec.cast,
    causalWorldRules: input.storySpec.causalWorldRules,
    resourceEconomy: input.storySpec.resourceEconomy,
  };
  const bounded = input.roleContexts?.writer;
  return `Viết chương ${input.chapterPlan.chapterNumber}, khoảng ${input.targetWordCount} từ.
Không tóm tắt kế hoạch và không thêm cảnh ngoài ChapterPlan. Câu/sự kiện cuối phải thực hiện exitHook của scene cuối rồi dừng; không giải quyết nextChapterPressure và không mượn beat của chương kế tiếp để kéo dài số từ.

${bounded
    ? `ROLE_CONTEXT_BOUNDED=${bounded}`
    : `VOICE_AND_CANON=${json(voiceContract)}
CHAPTER_PLAN=${json(input.chapterPlan)}
RELEVANT_STATE=${json(input.storyState)}`}

Chỉ trả JSON {"title":"tiêu đề cụ thể","content":"toàn văn chương"}.`;
}

export function buildEditorPrompt(input: {
  storySpec: StorySpecV2;
  chapterPlan: ChapterPlanV2;
  storyState: StoryStateV2;
  title: string;
  content: string;
  roleContexts?: { editor: string };
}): string {
  const bounded = input.roleContexts?.editor;
  return `Đánh giá độc lập chương ${input.chapterPlan.chapterNumber}.
Hard gates là boolean theo nghĩa pass=true. Vì tên field được giữ để tương thích, hardGates.promptLeak=true khi prose KHÔNG rò prompt và false khi có rò prompt. planFidelity và mười một trục đều dùng thang 0-10, không dùng thang 0-1; fidelity hoàn hảo phải ghi 10, không ghi 1. publish chỉ khi mọi hard gate đạt, planFidelity >=7.5, mọi trục >=7.5 và confidence >=0.65.
revise khi lỗi có thể sửa đúng một lượt; reject khi mâu thuẫn nền tảng hoặc bản sửa vẫn không đạt.
Nếu decision là revise/reject, có hard gate=false hoặc có trục dưới 7.5 thì evidence bắt buộc có ít nhất một lỗi được chứng minh. excerpt phải là một đoạn liên tục copy nguyên văn từ PROSE; tuyệt đối không dùng "..." để nối hai đoạn. Trước khi trả, tự kiểm tra điều kiện PROSE.includes(excerpt) cho từng evidence. Nếu không thể copy đúng substring thì không được hạ gate/trục hoặc trả revise/reject dựa trên lỗi đó; không được phát minh typo, lỗi mã hóa, câu lặp hoặc tự sửa chữ trong excerpt.
Nếu decision=revise thì revisionInstructions bắt buộc có ít nhất một chỉ dẫn chỉ sửa đúng evidence đã nêu. Reject không evidence là output contract không hợp lệ.

${bounded
    ? `ROLE_CONTEXT_BOUNDED=${bounded}`
    : `CANON=${json({ protagonist: input.storySpec.protagonist, cast: input.storySpec.cast, rules: input.storySpec.causalWorldRules, economy: input.storySpec.resourceEconomy, pleasureProfile: input.storySpec.pleasureProfile })}
STATE=${json(input.storyState)}
PLAN=${json(input.chapterPlan)}`}
TITLE=${json(input.title)}
PROSE=${json(input.content)}

Trả JSON: {"decision":"publish|revise|reject","confidence":0-1,"planFidelity":number,"hardGates":{"canon":boolean,"timeline":boolean,"resourceCausality":boolean,"characterKnowledge":boolean,"authority":boolean,"promptLeak":boolean,"planFidelity":boolean},"axes":{"premise_interest":number,"character_voice":number,"scene_tension":number,"causal_surprise":number,"emotional_movement":number,"domain_truth":number,"prose_naturalness":number,"agency":number,"earned_pleasure":number,"recovery_pacing":number,"desire_to_read_next":number},"evidence":[{"code":string,"severity":"critical|major|moderate","message":string,"start":number,"end":number,"excerpt":string}],"revisionInstructions":[string]}.`;
}

export function buildRevisionPrompt(input: {
  storySpec: StorySpecV2;
  chapterPlan: ChapterPlanV2;
  storyState: StoryStateV2;
  title: string;
  content: string;
  evidence: QualityEvidenceV2[];
  instructions: string[];
  roleContexts?: { writer: string };
}): string {
  const bounded = input.roleContexts?.writer;
  return `Sửa đúng một lượt chương ${input.chapterPlan.chapterNumber}. Giữ nguyên mọi beat và sự kiện đã đúng; chỉ sửa các lỗi có evidence dưới đây.
Không thêm setup, nhân vật, nguồn lực hoặc twist mới.

${bounded
    ? `ROLE_CONTEXT_BOUNDED=${bounded}`
    : `VOICE=${json({ protagonist: input.storySpec.protagonist, cast: input.storySpec.cast, storyIdentity: input.storySpec.storyIdentity, pleasureProfile: input.storySpec.pleasureProfile })}
STATE=${json(input.storyState)}
PLAN=${json(input.chapterPlan)}`}
CURRENT=${json({ title: input.title, content: input.content })}
EVIDENCE=${json(input.evidence)}
INSTRUCTIONS=${json(input.instructions)}

Chỉ trả JSON {"title":"...","content":"..."}.`;
}

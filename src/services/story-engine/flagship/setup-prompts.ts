import type {
  CausalWorldV2,
  CharacterDesignV2,
  ConceptCandidateV2,
  FlagshipSetupBriefV2,
  HumanConceptSelectionV2,
  OpeningTrialV2,
} from './setup-contracts';

export const FLAGSHIP_SETUP_PROMPT_VERSION = 'flagship-setup-v2.0';

export const CONCEPT_LAB_SYSTEM = `Bạn phụ trách Concept Lab cho đúng một brief truyện.
Tạo 20 cơ chế truyện khác nhau về nguyên nhân vận hành, lựa chọn của nhân vật và nguồn xung đột; đổi tên, nghề hoặc trope không được tính là khác.
Không mặc định bàn tay vàng, hệ thống, trọng sinh, thang sức mạnh, phản diện hay kiểu mở đầu. Không lập thế giới hoặc outline.
Nguồn lực khởi đầu phải hợp thân phận; không dùng tội phạm, âm mưu bí mật, làm giả, tống tiền hoặc tập đoàn thâu tóm làm lối tắt tăng căng thẳng nếu brief không yêu cầu rõ.
Chỉ trả JSON đúng schema ConceptBatchV2.`;

export const CONCEPT_JUDGE_SYSTEM = `Bạn là giám khảo concept độc lập.
So sánh từng cặp bằng sức tò mò, khả năng sinh lựa chọn khó, tính nhân quả, sự thật ngành nghề và độ khác biệt có thể triển khai thành cảnh.
Hạ hạng concept cần vốn phi lý, bịa quy trình pháp lý, chỉ sống nhờ đối thủ phạm tội hoặc phải leo thang sang âm mưu lớn mới duy trì được.
Không chấm theo độ dài, số trope, tên thể loại hoặc lời tự quảng cáo. Chỉ trả JSON đúng schema ConceptRankingV2.`;

export const OPENING_SIMULATOR_SYSTEM = `Bạn mô phỏng opening ba chương cho đúng một concept.
Ba chương phải nối liên tục: hậu quả chương trước tạo áp lực chương sau. Mỗi chương có lựa chọn, cái giá và thay đổi trạng thái cụ thể.
Mỗi chương tạo một requiredPlanAnchor ngắn, cụ thể, xuất hiện nguyên văn trong ChapterPlan sau này.
Không tự thêm bàn tay vàng, cứu viện, tài sản, quyền lực hay luật thể loại. Không dùng cliffhanger giả bằng người bí ẩn đứng nhìn.
Ba chương đầu giữ quy mô địa phương và nghề nghiệp: không nhảy sang băng nhóm, làm giả, tống tiền, tập đoàn thâu tóm hoặc cơ quan điều tra nếu chính concept và brief không đặt chúng làm lõi. Con số tiền/vốn phải hợp thân phận và có nguồn. Không bịa hành vi tự động của ngân hàng, nền tảng hoặc cơ quan nhà nước.
Chỉ trả JSON đúng schema OpeningTrialV2.`;

export const CHARACTER_DESIGNER_SYSTEM = `Bạn xây những con người có ý chí riêng cho đúng concept và opening đã được con người chọn.
Thân phận xã hội phải chi phối lời nói, thói quen, đòn bẩy và cách quyết định. Mỗi người có agenda, ranh giới và quan hệ khác nhau; không ai tồn tại chỉ để khen, cản hoặc đưa thông tin cho nhân vật chính.
Không chọn archetype từ menu và không tạo world rule. Chỉ trả JSON đúng schema CharacterDesignV2.`;

export const CAUSAL_WORLD_SYSTEM = `Bạn xây phần thế giới cần thiết để ép dàn nhân vật đã chọn phải ra quyết định.
Mỗi quy tắc phải chỉ rõ ai hưởng lợi, ai chịu thiệt, ai cưỡng chế, cái giá, bằng chứng, ngoại lệ và loại cảnh nó có thể sinh ra.
Không viết bách khoa toàn thư, không thêm heading để lấy điểm, không tạo luật không tác động lên cast. Chỉ trả JSON đúng schema CausalWorldV2.`;

export const LAUNCH_ARCHITECT_SYSTEM = `Bạn đóng gói source of truth duy nhất cho một truyện đã qua human concept gate.
Bảo toàn concept, opening, nhân vật và luật nhân quả; không sáng tác lại premise. Chỉ lập ending direction, arc đầu 20-30 chương và rolling plan 5 chương.
Không lập chi tiết 1.000 chương, không tạo volume ladder cứng, không thêm generic genre playbook. Chỉ trả JSON đúng schema FlagshipLaunchPackV2.`;

const json = (value: unknown) => JSON.stringify(value);

export function buildConceptLabPrompt(brief: FlagshipSetupBriefV2): string {
  return `BRIEF=${json(brief)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"candidates":[{"id":"concept_ascii_slug","workingTitle":"...","readerCuriosity":"...","readerFantasy":"...","premise":"...","irreversibleProblem":"...","protagonistContradiction":"...","domainMechanism":"...","conflictEngine":"...","emotionalCore":"...","differenceClaim":"...","nearestComparisonRisk":"..."}]}

Trả đúng 20 object và đúng các key trên, không thêm title/description/score. id chỉ dùng chữ thường ASCII, số, gạch dưới hoặc gạch ngang và phải bắt đầu bằng concept_. Mỗi trường văn bản tối thiểu 20 ký tự.`;
}

export function buildConceptJudgePrompt(brief: FlagshipSetupBriefV2, candidates: ConceptCandidateV2[]): string {
  return `BRIEF=${json(brief)}\nCANDIDATES=${json(candidates)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"matches":[{"leftId":"concept_id","rightId":"concept_id","winnerId":"concept_id","reason":"..."}],"ranking":[{"id":"concept_id","wins":0,"reason":"..."}],"finalistIds":["concept_id","concept_id","concept_id"]}

ranking phải chứa mỗi candidate đúng một lần. matches phải cho mỗi candidate xuất hiện ít nhất một lần. Mỗi finalist phải trực tiếp thắng ít nhất một match. Chỉ dùng id có trong CANDIDATES, reason tối thiểu 20 ký tự.`;
}

export function buildOpeningSimulationPrompt(brief: FlagshipSetupBriefV2, candidate: ConceptCandidateV2): string {
  return `BRIEF_BOUNDARIES=${json({ audience: brief.audience, desiredExperience: brief.desiredExperience, boundaries: brief.boundaries, researchNotes: brief.researchNotes })}\nCONCEPT=${json(candidate)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"candidateId":"${candidate.id}","chapters":[{"chapterNumber":1,"title":"...","prose":"...","causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","costPaid":"...","exitPressure":"..."},{"chapterNumber":2,"title":"...","prose":"...","causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","costPaid":"...","exitPressure":"..."},{"chapterNumber":3,"title":"...","prose":"...","causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","costPaid":"...","exitPressure":"..."}],"continuityDigest":"...","unresolvedPressure":"..."}

Viết thử chương 1, 2, 3 bằng văn Việt tự nhiên; mỗi prose tối thiểu 1200 ký tự. Giữ candidateId chính xác. Không thêm key và không xây canon ngoài concept/research.`;
}

export function buildCharacterDesignPrompt(
  brief: FlagshipSetupBriefV2,
  candidate: ConceptCandidateV2,
  opening: OpeningTrialV2,
): string {
  return `BRIEF=${json(brief)}\nSELECTED_CONCEPT=${json(candidate)}\nAPPROVED_OPENING=${json(opening)}\n\nMọi chi tiết phải giải thích được hành động đã xảy ra trong opening và tạo thêm xung đột quan hệ.`;
}

export function buildCausalWorldPrompt(
  brief: FlagshipSetupBriefV2,
  candidate: ConceptCandidateV2,
  opening: OpeningTrialV2,
  characters: CharacterDesignV2,
): string {
  return `RESEARCH_AND_BOUNDARIES=${json({ domain: brief.domain, boundaries: brief.boundaries, researchNotes: brief.researchNotes })}\nCONCEPT=${json(candidate)}\nOPENING_STATE_CHANGES=${json(opening.chapters.map(chapter => ({ chapterNumber: chapter.chapterNumber, causalStateChange: chapter.causalStateChange, costPaid: chapter.costPaid })))}\nCHARACTERS=${json(characters)}\n\nChỉ tạo luật và tài nguyên cần cho các áp lực này.`;
}

export function buildLaunchPackPrompt(input: {
  brief: FlagshipSetupBriefV2;
  selection: HumanConceptSelectionV2;
  candidate: ConceptCandidateV2;
  opening: OpeningTrialV2;
  characters: CharacterDesignV2;
  world: CausalWorldV2;
}): string {
  return `HUMAN_SELECTION=${json(input.selection)}\nBRIEF=${json(input.brief)}\nCONCEPT=${json(input.candidate)}\nOPENING=${json(input.opening)}\nCHARACTERS=${json(input.characters)}\nCAUSAL_WORLD=${json(input.world)}\n\nStorySpec phải sao chép chính xác title, readerFantasy, premise, protagonist, cast, causalWorldRules và resourceEconomy từ artifact đã duyệt. StoryState chương 0 phải chứa toàn bộ cast, resources và promises. Arc đầu phủ chương 1-20 đến tối đa 30. rollingChapterPlans chỉ gồm chương 1-5; plan chương 1-3 phải chứa nguyên văn requiredPlanAnchor tương ứng.`;
}

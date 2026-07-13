import type {
  CausalWorldV2,
  CharacterDesignV2,
  ConceptCandidateV2,
  FlagshipSetupBriefV2,
  HumanConceptSelectionV2,
  OpeningTrialV2,
} from './setup-contracts';

export const FLAGSHIP_SETUP_PROMPT_VERSION = 'flagship-setup-v2.2-portfolio';

export const CONCEPT_LAB_SYSTEM = `Bạn phụ trách Concept Lab cho đúng một brief truyện.
Tạo 20 cơ chế truyện khác nhau về nguyên nhân vận hành, lựa chọn của nhân vật và nguồn xung đột; đổi tên, nghề hoặc trope không được tính là khác.
Không mặc định bàn tay vàng, hệ thống, trọng sinh, thang sức mạnh, phản diện hay kiểu mở đầu. Không lập thế giới hoặc outline.
Nếu brief chủ động chọn trọng sinh hoặc lợi thế biết trước, phải làm nó hoạt động sớm nhưng giữ đúng giới hạn ký ức và vòng thưởng riêng trong pleasureProfile.
Nguồn lực khởi đầu phải hợp thân phận; không dùng tội phạm, âm mưu bí mật, làm giả, tống tiền hoặc tập đoàn thâu tóm làm lối tắt tăng căng thẳng nếu brief không yêu cầu rõ.
Chỉ trả JSON đúng schema ConceptBatchV2.`;

export const CONCEPT_JUDGE_SYSTEM = `Bạn là giám khảo concept độc lập.
So sánh từng cặp bằng sức tò mò, khả năng sinh lựa chọn khó, tính nhân quả, sự thật ngành nghề và độ khác biệt có thể triển khai thành cảnh.
Hạ hạng concept cần vốn phi lý, bịa quy trình pháp lý, chỉ sống nhờ đối thủ phạm tội hoặc phải leo thang sang âm mưu lớn mới duy trì được.
Hạ hạng concept để nhân vật chính chịu nhục kéo dài, thắng nhờ may mắn/đối thủ ngu, không kích hoạt lợi thế trong ba chương đầu, hoặc chỉ lặp một giao dịch mà không tạo tiến bộ vật chất và tình cảm trong 30 chương.
Không chấm theo độ dài, số trope, tên thể loại hoặc lời tự quảng cáo. Chỉ trả JSON đúng schema ConceptRankingV2.`;

export const OPENING_SIMULATOR_SYSTEM = `Bạn mô phỏng opening ba chương cho đúng một concept.
Ba chương phải nối liên tục: hậu quả chương trước tạo áp lực chương sau. Mỗi chương có lựa chọn, cái giá và thay đổi trạng thái cụ thể.
Mỗi chương tạo một requiredPlanAnchor ngắn, cụ thể, xuất hiện nguyên văn trong ChapterPlan sau này.
Chương 1 phải có hành động chủ động dùng lợi thế; chậm nhất chương 3 phải có thành quả vật chất kiếm được bằng hành động và một payoff đời sống phù hợp pleasureProfile.
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

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"candidates":[{"id":"concept_ascii_slug","workingTitle":"...","readerCuriosity":"...","readerFantasy":"...","premise":"...","irreversibleProblem":"...","protagonistContradiction":"...","domainMechanism":"...","conflictEngine":"...","emotionalCore":"...","differenceClaim":"...","nearestComparisonRisk":"...","serialityProof":"...","openingAdvantage":"...","progressionProof":"...","antiCloneFingerprint":"advantage|reward|currencies|conflict|world"}]}

Trả đúng 20 object và đúng các key trên, không thêm title/description/score. id chỉ dùng chữ thường ASCII, số, gạch dưới hoặc gạch ngang và phải bắt đầu bằng concept_. antiCloneFingerprint của 20 concept phải khác nhau thật sự theo cơ chế, không chỉ khác cách diễn đạt. Mỗi trường văn bản ngoài fingerprint tối thiểu 20 ký tự.`;
}

export function buildConceptJudgePrompt(brief: FlagshipSetupBriefV2, candidates: ConceptCandidateV2[]): string {
  return `BRIEF=${json(brief)}\nCANDIDATES=${json(candidates)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"matches":[{"leftId":"concept_id","rightId":"concept_id","winnerId":"concept_id","reason":"..."}],"ranking":[{"id":"concept_id","wins":0,"reason":"..."}],"finalistIds":["concept_id","concept_id","concept_id"]}

ranking phải chứa mỗi candidate đúng một lần. matches phải cho mỗi candidate xuất hiện ít nhất một lần. Mỗi finalist phải trực tiếp thắng ít nhất một match. Chỉ dùng id có trong CANDIDATES, reason tối thiểu 20 ký tự.`;
}

export function buildOpeningSimulationPrompt(brief: FlagshipSetupBriefV2, candidate: ConceptCandidateV2): string {
  return `BRIEF_BOUNDARIES=${json({ audience: brief.audience, desiredExperience: brief.desiredExperience, boundaries: brief.boundaries, researchNotes: brief.researchNotes })}\nCONCEPT=${json(candidate)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"candidateId":"${candidate.id}","chapters":[{"chapterNumber":1,"title":"...","proseParagraphs":["đoạn 1...","đoạn 2..."],"causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","agencyMove":"...","earnedReward":"...","materialProgression":"...","comfortPayoff":"...","costPaid":"...","exitPressure":"..."},{"chapterNumber":2,"title":"...","proseParagraphs":["đoạn 1...","đoạn 2..."],"causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","agencyMove":"...","earnedReward":"...","materialProgression":"...","comfortPayoff":"...","costPaid":"...","exitPressure":"..."},{"chapterNumber":3,"title":"...","proseParagraphs":["đoạn 1...","đoạn 2..."],"causalStateChange":"...","requiredPlanAnchor":"...","protagonistChoice":"...","agencyMove":"...","earnedReward":"...","materialProgression":"...","comfortPayoff":"...","costPaid":"...","exitPressure":"..."}],"continuityDigest":"...","unresolvedPressure":"..."}

Viết thử chương 1, 2, 3 bằng văn Việt tự nhiên. Mỗi chương trả 8-20 proseParagraphs; mỗi đoạn 40-600 ký tự và tổng tối thiểu 1200 ký tự. Mỗi phần tử phải là một JSON string một dòng, không chứa newline nội bộ. Thoại dùng gạch đầu dòng em dash; tuyệt đối không dùng dấu ngoặc kép ASCII. Engine sẽ ghép proseParagraphs bằng hai newline theo cách deterministic. Giữ candidateId chính xác. Không thêm key và không xây canon ngoài concept/research.`;
}

export function buildCharacterDesignPrompt(
  brief: FlagshipSetupBriefV2,
  candidate: ConceptCandidateV2,
  opening: OpeningTrialV2,
): string {
  return `BRIEF=${json(brief)}\nSELECTED_CONCEPT=${json(candidate)}\nAPPROVED_OPENING=${json(opening)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"protagonist":{"name":"...","publicIdentity":"...","desire":"...","fear":"...","contradiction":"...","misbelief":"...","competence":"...","blindSpot":"...","privateAgenda":"...","leverage":"...","moralBoundary":"...","decisionSignature":"...","changeTrigger":"...","voiceContract":"..."},"cast":[{"name":"...","socialIdentity":"...","agenda":"...","leverage":"...","conflictWithProtagonist":"...","moralBoundary":"...","decisionSignature":"...","relationshipBehavior":"...","voiceContract":"...","firstAppearanceChapter":1}],"relationshipConflicts":[{"left":"...","right":"...","incompatibleNeeds":"...","mutualDependence":"...","likelyBreakingPoint":"..."}]}

Cast có 3-8 người; relationshipConflicts có 3-12 mục. Mọi trường văn bản ngoài name tối thiểu 20 ký tự. Mọi chi tiết phải giải thích được hành động đã xảy ra trong opening và tạo thêm xung đột quan hệ.`;
}

export function buildCausalWorldPrompt(
  brief: FlagshipSetupBriefV2,
  candidate: ConceptCandidateV2,
  opening: OpeningTrialV2,
  characters: CharacterDesignV2,
): string {
  return `RESEARCH_AND_BOUNDARIES=${json({ domain: brief.domain, boundaries: brief.boundaries, researchNotes: brief.researchNotes })}\nCONCEPT=${json(candidate)}\nOPENING_STATE_CHANGES=${json(opening.chapters.map(chapter => ({ chapterNumber: chapter.chapterNumber, causalStateChange: chapter.causalStateChange, costPaid: chapter.costPaid, materialProgression: chapter.materialProgression })))}\nCHARACTERS=${json(characters)}

OUTPUT_CONTRACT_EXACT={"schemaVersion":2,"rules":[{"rule":"...","beneficiary":"...","harmedParty":"...","enforcement":"...","cost":"...","consequence":"...","evidenceSource":"...","exceptions":"...","sceneAffordances":["...","..."]}],"resources":[{"resource":"...","source":"...","spendRule":"...","scarcity":"..."}],"institutions":[{"name":"...","power":"...","incentive":"...","enforcementEvidence":"...","pressureOnCast":"..."}],"knowledgeDistribution":[{"holder":"...","knows":"...","doesNotKnow":"..."}]}

Rules có 4-12 mục, resources 3-10, institutions 2-8, knowledgeDistribution 3-12. Chỉ tạo luật và tài nguyên cần cho các áp lực này; không thêm key.`;
}

function launchContract(input: Parameters<typeof buildLaunchPackPrompt>[0]) {
  const plan = (chapterNumber: number) => ({
    schemaVersion: 2,
    chapterNumber,
    chapterPromise: chapterNumber <= 3 ? input.opening.chapters[chapterNumber - 1].requiredPlanAnchor : '...',
    stateBefore: { state_key: '...' },
    scenes: [{ id: `scene_${chapterNumber}_a`, pov: input.characters.protagonist.name, desire: '...', opposition: '...', tactic: '...', irreversibleChange: '...', informationDelta: '...', cost: '...', payoff: '...', exitHook: '...' }],
    stateAfter: { state_key: '...' },
    promisesAdvanced: [],
    promisesPaid: [],
    nextChapterPressure: '...',
    stateDelta: { facts: { fact_key: '...' }, cast: [], resources: [], promises: [] },
  });
  return {
    schemaVersion: 2,
    selectedConceptId: input.candidate.id,
    storySpec: {
      schemaVersion: 2,
      pipelineVersion: 'flagship_v2',
      title: input.candidate.workingTitle,
      genre: input.brief.genre,
      genreLane: input.brief.genreLane,
      serialityEngine: { recurringSituation: input.candidate.serialityProof, variationAxes: ['...', '...', '...'], escalationVectors: ['...', '...', '...'], depletionRisks: ['...', '...', '...'] },
      progressionCurrencies: [{ name: 'power_currency', kind: 'power', source: '...', spend: '...', visibility: '...' }, { name: 'material_currency', kind: 'material', source: '...', spend: '...', visibility: '...' }, { name: 'social_currency', kind: 'social', source: '...', spend: '...', visibility: '...' }],
      storyIdentity: { uniqueMechanism: '...', emotionalCore: input.candidate.emotionalCore, domainTruthSources: ['...', '...', '...'], forbiddenGenericMoves: ['...', '...', '...', '...', '...'], similarityRisks: ['...', '...', '...'] },
      pleasureProfile: input.brief.pleasureProfile,
      readerFantasy: input.candidate.readerFantasy,
      premise: input.candidate.premise,
      endingDirection: '...',
      protagonist: input.characters.protagonist,
      cast: input.characters.cast,
      causalWorldRules: input.world.rules,
      resourceEconomy: input.world.resources,
      conflictLadder: [{ chapterRange: '1-10', actor: '...', stake: '...', escalationCause: '...', resolutionChanges: '...' }, { chapterRange: '11-20', actor: '...', stake: '...', escalationCause: '...', resolutionChanges: '...' }, { chapterRange: '21-30', actor: '...', stake: '...', escalationCause: '...', resolutionChanges: '...' }],
      promisePayoffLedger: Array.from({ length: 5 }, (_, index) => ({ id: `promise_${index + 1}`, promise: '...', plantedByChapter: index + 1, payoffWindow: `${index + 4}-${index + 8}`, payoff: '...' })),
      runway30: Array.from({ length: 5 }, (_, index) => ({ chapterRange: `${index * 6 + 1}-${index * 6 + 6}`, irreversibleChange: '...', protagonistChoice: '...', payoff: '...' })),
      volumeSpine: Array.from({ length: 3 }, (_, index) => ({ name: `Volume ${index + 1}`, direction: '...', terminalChange: '...' })),
    },
    arcPlan: { schemaVersion: 2, arcId: 'arc_1', startChapter: 1, endChapter: 30, direction: '...', terminalChange: '...', activeConflicts: [{ actor: '...', objective: '...', leverage: '...', nextMove: '...' }], duePromises: ['promise_1'], rollingBeats: [{ chapterRange: '1-5', pressure: '...', causalChange: '...' }, { chapterRange: '6-10', pressure: '...', causalChange: '...' }] },
    storyState: { schemaVersion: 2, chapterNumber: 0, facts: {}, timeline: [], cast: [], resources: [], promises: [], recentSummary: '', previousEnding: '', retrievalNotes: [] },
    rollingChapterPlans: [1, 2, 3, 4, 5].map(plan),
    status: 'awaiting_story_spec_approval',
  };
}

export function buildLaunchPackPrompt(input: {
  brief: FlagshipSetupBriefV2;
  selection: HumanConceptSelectionV2;
  candidate: ConceptCandidateV2;
  opening: OpeningTrialV2;
  characters: CharacterDesignV2;
  world: CausalWorldV2;
}): string {
  return `HUMAN_SELECTION=${json(input.selection)}\nBRIEF=${json(input.brief)}\nCONCEPT=${json(input.candidate)}\nOPENING=${json(input.opening)}\nCHARACTERS=${json(input.characters)}\nCAUSAL_WORLD=${json(input.world)}

OUTPUT_CONTRACT_EXACT=${json(launchContract(input))}

Chỉ dùng đúng các key trong contract. Các mảng phải đạt cardinality của ví dụ/schema; mỗi ChapterPlan có 2-5 scenes dù contract chỉ minh họa một scene. StorySpec phải sao chép chính xác title, genreLane, pleasureProfile, readerFantasy, premise, protagonist, cast, causalWorldRules và resourceEconomy từ artifact đã duyệt. serialityEngine phải chứng minh tình huống lặp có thể biến hóa chứ không phải một thang tăng cấp; progressionCurrencies phải có nguồn, cách tiêu và dấu hiệu độc giả nhìn thấy. StoryState chương 0 phải chứa toàn bộ cast, resources và promises. Arc đầu phủ chương 1-20 đến tối đa 30. rollingChapterPlans chỉ gồm chương 1-5; plan chương 1-3 phải chứa nguyên văn requiredPlanAnchor tương ứng.`;
}

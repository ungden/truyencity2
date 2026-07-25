import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import {
  CanonExtensionSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  EditorAssessmentSchema,
  LaunchPackSchema,
  type ArcPlan,
  type ChapterPlan,
  type LaunchPack,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
  StoryFactoryError,
  StoryKernelSchema,
  FIRST_30_PORTFOLIO,
  materializePlannerRollingPlan,
  materializeEditorAssessment,
  nextRunAfterNonChapterStage,
  PlannerRollingPlanResponseSchema,
  WindowReviewSchema,
  appendAcceptedOutcome,
  applyCanonExtension,
  applyChapterPlan,
  benchmarkPasses,
  buildBlindReaderInput,
  buildChapterContexts,
  buildWriterBrief,
  isStoryFactoryEnabled,
  calculateBenchmarkMetrics,
  loadRelevantStoryMemory,
  loadRelevantStoryTransitions,
  memoryEntityIdsForArc,
  memoryEntityIdsForPlan,
  runConceptLab,
  planArcLifecycle,
  planRollingWindow,
  rollingPlanContainsChapter,
  toGeminiResponseSchema,
  validateKernelState,
  writeStoryChapter,
} from '@/services/story-factory';
import type { ProviderResult, StoryModelProvider } from '@/services/story-factory/provider';

const stageConflicts = [
  'Vốn mồi và thời tiết buộc gia đình chọn mẻ thử có thể thất bại.',
  'Người thu mua bảo vệ biên lợi nhuận bằng hợp đồng và lịch nhận hàng.',
  'Đội thuyền tranh mùa cá trong giới hạn an toàn và nguồn lợi.',
  'Cơ sở chế biến đối mặt vệ sinh, hao hụt và lao động có tay nghề.',
  'Mạng phân phối liên huyện chịu cạnh tranh về tín dụng và tốc độ giao.',
  'Biến động nguồn lợi ép cộng đồng thương lượng hạn ngạch khai thác.',
  'Thương hiệu vùng bị thử thách bởi tiêu chuẩn chất lượng liên tỉnh.',
  'Thế hệ kế nghiệp phải cân bằng tăng trưởng với phục hồi sinh thái.',
];
const stageRewards = [
  'Mẻ thử nhỏ đổi thành bữa ăn và khoản vốn quay vòng đầu tiên.',
  'Đầu ra ổn định đổi công lao động thành dụng cụ và niềm tin.',
  'Hợp tác đội thuyền tạo sản lượng đều nhưng phải chia lợi ích.',
  'Chế biến sâu biến hao hụt thành sản phẩm có biên lợi nhuận mới.',
  'Phân phối xa tạo hợp đồng dài hạn và quyền mặc cả.',
  'Quản trị nguồn lợi thưởng cho kỷ luật bằng mùa vụ bền hơn.',
  'Tiêu chuẩn hóa chất lượng tạo uy tín vượt khỏi địa phương.',
  'Chuyển giao sinh kế thưởng bằng sự tự chủ của thế hệ sau.',
];

const seriesStages = Array.from({ length: 8 }, (_, index) => ({
  id: `stage_${index + 1}`,
  order: index + 1,
  targetSpanChapters: 100,
  arena: `Địa bàn phát triển nghề biển cấp ${index + 1}.`,
  protagonistGoal: `Đạt mốc sinh kế bền vững cấp ${index + 1}.`,
  conflictSource: stageConflicts[index],
  rewardLoopVariant: stageRewards[index],
  irreversibleChange: `Gia đình sở hữu năng lực sản xuất không thể quay lại mức cũ ở cấp ${index + 1}.`,
  entryConditions: [`Hoàn thành điều kiện vào giai đoạn ${index + 1}.`],
  exitConditions: [`Đạt điều kiện rời giai đoạn ${index + 1}.`],
  longPromiseIds: [index === 0 ? 'promise_house' : `promise_${Math.min(index + 1, 4)}`],
  expansionSeeds: index === 1 ? [
    { id: 'seed_new_buyer', kind: 'character' as const, description: 'Một người mua cấp huyện có lợi ích độc lập.' },
    { id: 'seed_new_market', kind: 'location' as const, description: 'Một chợ mới mở rộng địa bàn bán hàng.' },
  ] : [],
}));

const kernel: StoryKernel = {
  schemaVersion: 1,
  title: 'Trọng Sinh Về Làng Biển, Tôi Đưa Cả Nhà Ăn No',
  description: 'Một người đàn ông trở lại làng biển và dùng kinh nghiệm nghề nghiệp để gây dựng sinh kế bền vững cho gia đình.',
  genreLane: 'do-thi-nien-dai',
  readerFantasy: 'Chủ động thay đổi cuộc sống bằng năng lực thật và nhìn thấy gia đình khá lên từng bước.',
  uniqueMechanism: 'Dùng hiểu biết về mùa cá, bảo quản và chênh lệch đầu ra nhưng luôn chịu giới hạn vốn và thời tiết.',
  mechanismFingerprint: 'tri-thuc-mua-ca-va-bao-quan',
  rewardLoopFingerprint: 'phat-hien-khai-thac-che-bien-ban',
  conflictEconomyFingerprint: 'thoi-tiet-von-dau-ra-nguon-loi',
  protagonistId: 'main',
  characters: [
    { id: 'main', name: 'Hải', aliases: ['anh Hải'], role: 'protagonist', agenda: 'Đưa gia đình thoát cảnh thiếu ăn bằng lao động có tính toán.', competence: 'Biết nghề biển, chế biến và thương lượng đầu ra.', constraint: 'Ký ức chỉ nắm xu hướng, không nhớ chính xác mọi ngày và mọi mức giá.', moralBoundary: 'Không tận diệt nguồn lợi hoặc lừa người cùng làng.', voice: { register: 'đời thường miền biển', sentenceRhythm: 'gọn khi làm việc, chậm khi nói với nhà', directness: 'direct', addressRules: 'xưng hô theo tuổi và quan hệ làng xóm', vocabulary: 'từ nghề biển Việt Nam dễ hiểu', reasoningStyle: 'quan sát dữ kiện rồi chia việc cụ thể', emotionDisplay: 'restrained', humorStyle: 'dry' } },
    { id: 'mother', name: 'Bà Lành', aliases: ['mẹ'], role: 'supporting', agenda: 'Giữ gia đình an toàn và không vay nợ liều lĩnh.', competence: 'Giỏi phơi sấy và quản lý bữa ăn.', constraint: 'Sợ rủi ro sau nhiều mùa biển thất bát.', moralBoundary: 'Không chiếm phần của người nghèo hơn.', voice: { register: 'mộc mạc', sentenceRhythm: 'ngắn và giàu hàm ý', directness: 'balanced', addressRules: 'gọi con theo tên', vocabulary: 'ngôn ngữ gia đình', reasoningStyle: 'kiểm tra số tiền, rủi ro và đường lui', emotionDisplay: 'open', humorStyle: 'situational' } },
    { id: 'buyer', name: 'Tấn', aliases: ['chú Tấn'], role: 'opposition', agenda: 'Giữ nguồn hàng và biên lợi nhuận của mối thu mua.', competence: 'Nắm khách hàng chợ huyện và giá từng bến.', constraint: 'Không thể công khai ép giá khi có người mua cạnh tranh.', moralBoundary: 'Không dùng bạo lực.', voice: { register: 'thương hồ', sentenceRhythm: 'mềm nhưng luôn dò giá', directness: 'balanced', addressRules: 'xưng chú với người trẻ', vocabulary: 'giá, mẻ, mối và chuyến hàng', reasoningStyle: 'thử điều kiện mới và quan sát phản ứng đối tác', emotionDisplay: 'deflecting', humorStyle: 'teasing' } },
  ],
  worldModel: {
    era: 'Một làng biển Việt Nam hư cấu cuối thập niên 1980.',
    baseline: 'Kinh tế hộ gia đình thiếu vốn, bảo quản lạnh và đầu ra ổn định.',
    geography: [
      { id: 'geo_village', name: 'Làng biển', role: 'Nơi khai thác và sinh hoạt gia đình.', constraints: ['Phụ thuộc thời tiết và con nước.'] },
      { id: 'geo_district', name: 'Huyện lỵ', role: 'Thị trường tiêu thụ và cung ứng vật tư.', constraints: ['Đường xa làm hàng tươi nhanh xuống cấp.'] },
    ],
    institutions: [
      { id: 'inst_family', name: 'Hộ gia đình Hải', agenda: 'Xây sinh kế bền vững.', authority: 'Quyết định lao động và chi tiêu trong nhà.', resources: 'Sức lao động, kỹ năng và khoản vốn nhỏ.' },
      { id: 'inst_market', name: 'Mạng lưới chợ huyện', agenda: 'Mua hàng tươi đều và có lợi nhuận.', authority: 'Quyết định đầu ra và giá theo chất lượng.', resources: 'Tiền mặt, sạp hàng và quan hệ khách mua.' },
    ],
    systems: [{
      id: 'system_seafood',
      name: 'Chuỗi hải sản tươi',
      rules: ['Hàng tươi có giá trị khi được bảo quản và giao đúng thời gian.'],
      limits: ['Nguồn lợi, thời tiết, vốn và tải trọng đều hữu hạn.'],
      costs: ['Mỗi bước mở rộng phải trả chi phí vật tư, lao động và hao hụt.'],
    }],
  },
  progressionTracks: [
    {
      id: 'track_livelihood', name: 'Sinh kế gia đình', initialState: 'Thiếu ăn và không có vốn quay vòng.',
      terminalState: 'Có chuỗi nghề biển bền vững không lệ thuộc ký ức tương lai.',
      milestones: [
        { id: 'milestone_livelihood_1', stageId: 'stage_1', state: 'Có mẻ hàng và khách đầu tiên.' },
        { id: 'milestone_livelihood_8', stageId: 'stage_8', state: 'Chuỗi sinh kế vận hành bền vững.' },
      ],
    },
    {
      id: 'track_market', name: 'Địa bàn thị trường', initialState: 'Chỉ biết bãi ngang địa phương.',
      terminalState: 'Có mạng lưới phân phối sâu vào đất liền.',
      milestones: [
        { id: 'milestone_market_1', stageId: 'stage_1', state: 'Tiếp cận chợ huyện.' },
        { id: 'milestone_market_8', stageId: 'stage_8', state: 'Vận hành mạng lưới liên vùng.' },
      ],
    },
  ],
  seriesSpine: {
    targetEndingRange: { minimumChapter: 800, maximumChapter: 1_000 },
    stages: seriesStages,
  },
  longPromises: [
    { promiseId: 'promise_house', openedStageId: 'stage_1', dueStageId: 'stage_2', payoff: 'Gia đình có mái nhà an toàn trước mùa mưa.' },
    { promiseId: 'promise_2', openedStageId: 'stage_1', dueStageId: 'stage_4', payoff: 'Ngư dân có đầu ra không bị ép giá.' },
    { promiseId: 'promise_3', openedStageId: 'stage_2', dueStageId: 'stage_6', payoff: 'Hải xây được cơ sở chế biến có việc làm ổn định.' },
    { promiseId: 'promise_4', openedStageId: 'stage_4', dueStageId: 'stage_8', payoff: 'Chuỗi sinh kế giữ được nguồn lợi cho thế hệ sau.' },
  ],
  worldRules: [
    { id: 'rule_market', claim: 'Giá cá thay đổi theo độ tươi, mùa và khả năng đưa hàng tới chợ huyện.', exceptions: [] },
    { id: 'rule_weather', claim: 'Thuyền nhỏ phải chịu giới hạn gió, con nước và thời gian bảo quản.', exceptions: [] },
    { id: 'rule_memory', claim: 'Ký ức tương lai chỉ cho Hải xu hướng và kỹ thuật, không cho con số chính xác tuyệt đối.', exceptions: [] },
  ],
  locations: [{ id: 'home', name: 'Nhà Hải' }, { id: 'beach', name: 'Bãi ngang' }],
  travelRules: [
    { fromLocationId: 'home', toLocationId: 'beach', minimumMinutes: 20 },
    { fromLocationId: 'beach', toLocationId: 'home', minimumMinutes: 20 },
  ],
  resources: [{ id: 'money', name: 'Tiền mặt', kind: 'numeric', minimum: 0 }],
  promises: [
    { id: 'promise_house', description: 'Sửa lại mái nhà trước mùa mưa.' },
    { id: 'promise_2', description: 'Tạo đầu ra công bằng hơn cho ngư dân.' },
    { id: 'promise_3', description: 'Xây cơ sở chế biến tạo việc làm ổn định.' },
    { id: 'promise_4', description: 'Giữ nguồn lợi cho thế hệ sau.' },
  ],
  pleasureLoop: { primary: 'Nhìn đúng cơ hội, lao động, bán được hàng rồi tái đầu tư.', comfort: 'Bữa cơm, căn nhà và sự yên lòng của người thân tốt lên.', setbackRecoveryChapters: 3 },
  endingDirection: { protagonistTerminalState: 'Có sinh kế bền vững và không còn phụ thuộc ký ức tương lai.', worldTerminalState: 'Làng biển có chuỗi khai thác và chế biến giữ được nguồn lợi.', promisesToResolve: ['promise_house', 'promise_2', 'promise_3', 'promise_4'] },
};

const initialState: StoryState = {
  schemaVersion: 2,
  chapterNumber: 0,
  storyTimeMinutes: 0,
  facts: [{ id: 'fact_day', value: 'ngay_0' }],
  characters: [
    { characterId: 'main', locationId: 'home', knownFactIds: ['fact_day'], relationshipState: {} },
    { characterId: 'mother', locationId: 'home', knownFactIds: [], relationshipState: {} },
    { characterId: 'buyer', locationId: 'beach', knownFactIds: [], relationshipState: {} },
  ],
  resources: [{ resourceId: 'money', kind: 'numeric', value: 100 }],
  promises: [
    { promiseId: 'promise_house', status: 'open' },
    { promiseId: 'promise_2', status: 'open' },
    { promiseId: 'promise_3', status: 'open' },
    { promiseId: 'promise_4', status: 'open' },
  ],
  usedExpansionSeedIds: [],
  recentOutcomes: [],
};

function acceptedOutcome(evidence: string) {
  return {
    event: 'Hải biến quyết định thành một hành động cụ thể.',
    result: 'Gia đình bắt đầu thực hiện công việc đã thống nhất.',
    method: 'chia việc và kiểm tra nguồn lực',
    endingSituation: 'Công việc đã khởi động và tạo trạng thái mới.',
    evidenceSpans: [evidence],
  };
}

function editorWirePass(deltaId: string, evidence: string) {
  return {
    v: 1 as const,
    status: 'pass' as const,
    issues: [],
    deltaChecks: [{ deltaId, realized: true, evidence }],
    experienceChecks: {
      sceneDramatized: true,
      characterAgenda: true,
      earnedOutcome: true,
      naturalLanguage: true,
    },
    experienceEvidence: {
      sceneDramatized: evidence,
      characterAgenda: evidence,
      earnedOutcome: evidence,
      naturalLanguage: evidence,
    },
    outcome: acceptedOutcome(evidence),
  };
}

const arc: ArcPlan = {
  schemaVersion: 1, arcNumber: 1, stageId: 'stage_1', startChapter: 1, plannedEndChapter: 20,
  objective: 'Tạo được đầu ra đầu tiên và làm cho gia đình tin vào cách làm mới.',
  terminalChanges: ['Có khách hàng đầu tiên và một phần vốn quay vòng.'],
  activeConflicts: ['Thiếu vốn và hàng dễ hỏng.'],
  activeCharacterIds: ['main', 'mother', 'buyer'],
  activeLocationIds: ['home', 'beach'],
  activeResourceIds: ['money'],
  activeWorldRuleIds: ['rule_market', 'rule_weather'],
  duePromiseIds: ['promise_house'],
  progression: ['Tiền mặt tăng rõ ràng', 'Dụng cụ được nâng cấp', 'Uy tín với đầu ra tăng'],
};

const routes: ModelRoutes = {
  setupGeneratorA: 'gen-a', setupGeneratorB: 'gen-b', setupJudge: 'judge',
  openingSimulator: 'sim', launchArchitect: 'launch', planner: 'planner', planJudge: 'plan-judge', writer: 'writer', editor: 'editor', routeVersion: 'test-1',
};

function plan(chapterNumber: number, before = `ngay_${chapterNumber - 1}`): ChapterPlan {
  return {
    schemaVersion: 1,
    chapterNumber,
    arcNumber: 1,
    storyTimeAfterMinutes: chapterNumber * 60,
    preconditions: [{ kind: 'fact', entityId: 'fact_day', expected: before }],
    requiredWorldRuleIds: ['rule_market'],
    scenes: [{
      id: `scene_${chapterNumber}`,
      povCharacterId: 'main', participantIds: ['main', 'mother'], locationId: 'home',
      durationMinutes: 60, travelMinutesFromPrevious: 0,
      objective: 'Biến một quyết định nghề nghiệp thành hành động cụ thể trong gia đình.',
      obstacle: 'Nguồn lực ít và người nhà chưa hoàn toàn tin vào kế hoạch.',
      action: 'Hải giải thích bằng việc làm, chia công việc và chấp nhận một chi phí thực tế.',
      requiredDeltaIds: [`delta_${chapterNumber}`],
    }],
    requiredDeltas: [{ id: `delta_${chapterNumber}`, kind: 'fact', factId: 'fact_day', before, after: `ngay_${chapterNumber}` }],
  };
}

function plannerWire(chapterNumber = 1) {
  return {
    v: 1 as const,
    start: chapterNumber,
    chaptersJson: [JSON.stringify({
      v: 1, n: chapterNumber, arc: 1, time: chapterNumber * 60,
      pre: [{ k: 'fact', id: 'fact_day', value: `ngay_${chapterNumber - 1}` }],
      rules: ['rule_market'],
      scenes: [{
        id: `scene_${chapterNumber}`, pov: 'main', people: ['main', 'mother'], loc: 'home', dur: 60, travel: 0,
        goal: 'Biến quyết định thành hành động cụ thể.', block: 'Nguồn lực gia đình còn ít.',
        act: 'Hải chia việc và bắt tay thực hiện.', deltaIds: [`delta_${chapterNumber}`],
      }],
      deltas: [{
        id: `delta_${chapterNumber}`, k: 'fact', target: 'fact_day', counterpart: null,
        before: `ngay_${chapterNumber - 1}`, change: null, after: `ngay_${chapterNumber}`, source: null, sink: null,
      }],
    })],
  };
}

const usage = { model: 'test', inputTokens: 1, outputTokens: 1, costUsd: 0, finishReason: 'STOP' };

class QueueProvider implements StoryModelProvider {
  calls: string[] = [];
  constructor(private readonly values: unknown[]) {}
  async text(input: { model: string }): Promise<ProviderResult<string>> {
    this.calls.push(input.model);
    return { value: z.string().parse(this.values.shift()), usage };
  }
  async json<T>(input: { model: string; schema: z.ZodType<T, z.ZodTypeDef, unknown> }): Promise<ProviderResult<T>> {
    this.calls.push(input.model);
    const value = this.values.shift();
    return { value: input.schema.parse(value), usage };
  }
}

describe('canonical Story Factory', () => {
  it('retains only the unique genre allocation for the first 30 slots', () => {
    expect(FIRST_30_PORTFOLIO).toHaveLength(30);
    expect(FIRST_30_PORTFOLIO.filter(slot => slot.group === 'fantasy')).toHaveLength(12);
    expect(FIRST_30_PORTFOLIO.filter(slot => slot.group === 'urban_era_dual_world')).toHaveLength(18);
    expect(new Set(FIRST_30_PORTFOLIO.map(slot => slot.genreLane)).size).toBe(30);
    expect(JSON.stringify(FIRST_30_PORTFOLIO)).not.toMatch(/title|premise|character|worldRule|rewardLoop/);
  });

  test('applies repeated resource deltas sequentially in one chapter', () => {
    const chapter = plan(1);
    chapter.requiredDeltas = [
      { id: 'gain', kind: 'resource_numeric', resourceId: 'money', before: 100, delta: 50, after: 150, source: 'bán hàng', sink: null },
      { id: 'spend', kind: 'resource_numeric', resourceId: 'money', before: 150, delta: -120, after: 30, source: null, sink: 'mua dụng cụ' },
    ];
    chapter.scenes[0].requiredDeltaIds = ['gain', 'spend'];
    const result = applyChapterPlan({ kernel, state: initialState, plan: chapter });
    expect(result.state.resources[0]).toEqual({ resourceId: 'money', kind: 'numeric', value: 30 });
  });

  test('rejects real overspend', () => {
    const chapter = plan(1);
    chapter.requiredDeltas = [{ id: 'spend', kind: 'resource_numeric', resourceId: 'money', before: 100, delta: -120, after: -20, source: null, sink: 'mua dụng cụ' }];
    chapter.scenes[0].requiredDeltaIds = ['spend'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).toThrow(StoryFactoryError);
  });

  test('accepts numeric preconditions serialized as numeric strings', () => {
    const chapter = plan(1);
    chapter.preconditions = [{ kind: 'resource', entityId: 'money', expected: '100' }];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('rejects numeric preconditions serialized as the wrong string value', () => {
    const chapter = plan(1);
    chapter.preconditions = [{ kind: 'resource', entityId: 'money', expected: '101' }];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).toThrow('Precondition resource:money is false');
  });

  test('rejects a planned transaction that has no resource delta', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải trả tiền mặt để thu mua toàn bộ mẻ cá.';
    chapter.requiredDeltas = [{ id: 'move', kind: 'location', characterId: 'main', beforeLocationId: 'home', afterLocationId: 'beach' }];
    chapter.scenes[0].locationId = 'beach';
    chapter.scenes[0].travelMinutesFromPrevious = 20;
    chapter.storyTimeAfterMinutes = 80;
    chapter.scenes[0].requiredDeltaIds = ['move'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).toThrow('transaction without a numeric resource delta');
  });

  test('does not book a transaction when a scene only analyzes a future purchase', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải phân tích việc gánh bộ quá sức và cần mua xe kéo chở hàng.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not treat a promised future purchase as a completed transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải đưa tiền lãi cho mẹ và hứa sẽ sớm mua máy khâu.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not book a transaction when a scene only agrees future wholesale terms', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Dì Ba kiểm tra tận mắt, ngạc nhiên vì cá quá tươi, đồng ý mua sỉ với giá 5.500đ/kg.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not book a transaction when a scene only decides the next purchase sequence', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Lực quyết định tranh thủ đi mua đá cây trước khi quay lại mua cá.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not treat a long future-intent clause as a completed transaction', () => {
    const futurePlan = plan(1);
    futurePlan.scenes[0].action = 'An nhận ra không thể nhượng bộ, quyết định tìm cơ hội lớn hơn để kiếm tiền trả nợ.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: futurePlan })).not.toThrow();
  });

  test('still rejects an actual purchase hidden beside future intent', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải hứa sẽ sớm mua máy khâu, rồi trả tiền mặt mua ngay một cuộn lưới.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('transaction without a numeric resource delta');
  });

  test('allows a connective scene without inventing a fake state delta', () => {
    const chapter = plan(1);
    chapter.scenes.unshift({
      ...chapter.scenes[0],
      id: 'scene_connective',
      objective: 'Quan sát tình hình trước khi quyết định.',
      obstacle: 'Thông tin tại chỗ còn thiếu.',
      action: 'Hải kiểm tra bãi ngang rồi trở về bàn việc.',
      requiredDeltaIds: [],
    });
    chapter.storyTimeAfterMinutes = 120;
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('rejects a chapter whose scenes require more time than the timeline advances', () => {
    const chapter = plan(1);
    chapter.storyTimeAfterMinutes = 0;
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).toThrow('ends before its planned scenes can occur');
  });

  test('rejects a kernel whose protagonist can leave a location but cannot return', () => {
    const oneWayKernel = structuredClone(kernel);
    oneWayKernel.travelRules = oneWayKernel.travelRules.filter(rule => rule.fromLocationId === 'home');
    expect(() => validateKernelState(oneWayKernel, initialState))
      .toThrow('must let the protagonist reach every declared location and return');
  });

  test('rejects a long-series spine whose stages do not cover the declared minimum', () => {
    const invalid = structuredClone(kernel);
    invalid.seriesSpine.stages = invalid.seriesSpine.stages.map(stage => ({ ...stage, targetSpanChapters: 80 }));
    expect(() => StoryKernelSchema.parse(invalid)).toThrow();
  });

  test('relationship deltas commit trust and debt without growing persistent history', () => {
    const basePlan = plan(1);
    const relationshipPlan: ChapterPlan = {
      ...basePlan,
      requiredDeltas: [{
        id: 'delta_relationship',
        kind: 'relationship',
        characterId: 'main',
        counterpartId: 'buyer',
        before: null,
        after: 'tin_tuong_1_no_200',
        source: 'buyer advanced transport money',
      }],
      scenes: [{ ...basePlan.scenes[0], requiredDeltaIds: ['delta_relationship'] }],
    };
    const result = applyChapterPlan({ kernel, state: initialState, plan: relationshipPlan });
    expect(result.state.characters.find(character => character.characterId === 'main')?.relationshipState.buyer)
      .toBe('tin_tuong_1_no_200');
    expect(result.events[0].relatedEntityIds).toEqual(expect.arrayContaining(['main', 'buyer']));
  });

  test('canon extension only adds stage-authorized IDs and cannot overwrite canon', () => {
    const extension = CanonExtensionSchema.parse({
      stageId: 'stage_2',
      characters: [{
        seedId: 'seed_new_buyer',
        definition: {
          id: 'buyer_district', name: 'Dũng', aliases: ['anh Dũng'], role: 'supporting',
          agenda: 'Tìm nguồn hàng ổn định.', competence: 'Phân phối cấp huyện.',
          constraint: 'Không có kho lạnh riêng.', moralBoundary: 'Không gian lận cân.',
          voice: kernel.characters[0].voice,
        },
        initialState: { locationId: 'home', knownFactIds: [], relationshipState: {} },
      }],
      locations: [], travelRules: [], promises: [], worldRules: [],
    });
    const added = applyCanonExtension({ kernel, state: initialState, extension });
    expect(added.kernel.characters.some(character => character.id === 'buyer_district')).toBe(true);
    expect(added.state.characters.find(character => character.characterId === 'buyer_district')?.locationId).toBe('home');
    expect(added.state.usedExpansionSeedIds).toContain('seed_new_buyer');
    expect(() => applyCanonExtension({ kernel: added.kernel, state: added.state, extension })).toThrow('already consumed');
    const locationExtension = CanonExtensionSchema.parse({
      stageId: 'stage_2',
      characters: [],
      locations: [{
        seedId: 'seed_new_market',
        definition: {
          id: 'district_market',
          name: 'Chợ huyện mới',
          role: 'Địa bàn mở rộng đầu ra và gặp nhóm lợi ích mới.',
          constraints: ['Đường xa, sức mua và thời gian giao hàng đều hữu hạn.'],
        },
      }],
      travelRules: [
        { fromLocationId: 'home', toLocationId: 'district_market', minimumMinutes: 120 },
        { fromLocationId: 'district_market', toLocationId: 'home', minimumMinutes: 120 },
      ],
      promises: [], worldRules: [],
    });
    const withLocation = applyCanonExtension({
      kernel: added.kernel,
      state: added.state,
      extension: locationExtension,
    });
    expect(withLocation.kernel.locations.some(location => location.id === 'district_market')).toBe(true);
    expect(withLocation.kernel.worldModel.geography.some(location => location.id === 'district_market')).toBe(true);
  });

  test('exact-ID memory lookup keys cover stage, cast, locations, rules and relationships', () => {
    expect(memoryEntityIdsForArc(kernel, arc, initialState)).toEqual(expect.arrayContaining([
      'main', 'stage_1', 'mother', 'home', 'money', 'rule_market',
    ]));
    const basePlan = plan(1);
    const relationshipPlan: ChapterPlan = {
      ...basePlan,
      requiredDeltas: [{
        id: 'delta_relationship',
        kind: 'relationship',
        characterId: 'main',
        counterpartId: 'buyer',
        before: null,
        after: 'hostility_1',
        source: 'price dispute',
      }],
    };
    expect(memoryEntityIdsForPlan(kernel, relationshipPlan)).toEqual(expect.arrayContaining([
      'main', 'buyer', 'home', 'rule_market',
    ]));
  });

  test.each([50, 200, 800])('chapter-one callback is retrievable by exact ID at chapter %i', async chapterNumber => {
    const chapterOneOutcome = {
      chapterNumber: 1,
      title: 'Lần Gặp Đầu Tiên',
      event: 'Hải gặp Tấn lần đầu tại bãi biển.',
      result: 'Hai người ghi nhớ điều kiện mua bán của nhau.',
      method: 'Một cuộc mặc cả trực tiếp.',
      endingSituation: 'Quan hệ làm ăn đã mở nhưng chưa có lòng tin.',
      evidenceSpans: ['gặp Tấn lần đầu'],
    };
    let cutoff = 0;
    const query: Record<string, unknown> & {
      then?: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    } = {};
    for (const method of ['select', 'eq', 'overlaps', 'order', 'limit']) {
      query[method] = () => query;
    }
    query.lte = (_column: string, value: number) => {
      cutoff = value;
      return query;
    };
    query.then = resolve => Promise.resolve(resolve({
      data: [{ after_value: chapterOneOutcome, related_entity_ids: ['main', 'buyer'], chapter_number: 1 }],
      error: null,
    }));
    const fakeDb = { from: () => query };
    const state = { ...initialState, chapterNumber };
    const memory = await loadRelevantStoryMemory({
      db: fakeDb as never,
      projectId: '00000000-0000-0000-0000-000000000001',
      state,
      entityIds: ['buyer'],
    });
    expect(cutoff).toBe(chapterNumber - 12);
    expect(memory[0].outcome.chapterNumber).toBe(1);
    expect(memory[0].relatedEntityIds).toContain('buyer');
  });

  test('arc lifecycle cannot skip a series-spine stage', async () => {
    const boundaryArc = { ...arc, plannedEndChapter: 20 };
    const boundaryState = { ...initialState, chapterNumber: 20 };
    const skippedArc = {
      ...arc,
      arcNumber: 2,
      stageId: 'stage_3',
      startChapter: 21,
      plannedEndChapter: 40,
    };
    const provider = new QueueProvider([{
      status: 'continue',
      nextArc: skippedArc,
      canonExtension: {
        stageId: 'stage_3',
        characters: [], locations: [], travelRules: [], promises: [], worldRules: [],
      },
    }]);
    await expect(planArcLifecycle({
      kernel, arc: boundaryArc, state: boundaryState, routes, provider,
      minimumCompletionChapter: 800, maximumChapter: 1000,
    })).rejects.toThrow('skipped or rewound');
  });

  test('an exhausted stage blocks filler instead of extending beyond its spine budget', async () => {
    const boundaryArc = { ...arc, plannedEndChapter: 100 };
    const boundaryState = { ...initialState, chapterNumber: 100 };
    const fillerArc = {
      ...arc,
      arcNumber: 2,
      startChapter: 101,
      plannedEndChapter: 120,
    };
    const provider = new QueueProvider([{
      status: 'continue',
      nextArc: fillerArc,
      canonExtension: {
        stageId: 'stage_1',
        characters: [], locations: [], travelRules: [], promises: [], worldRules: [],
      },
    }]);
    await expect(planArcLifecycle({
      kernel, arc: boundaryArc, state: boundaryState, routes, provider,
      minimumCompletionChapter: 800, maximumChapter: 1000,
    })).rejects.toThrow('stage is exhausted');
  });

  test('Writer context excludes research, ending contract and editor rubric', () => {
    const state = structuredClone(initialState);
    state.facts.push({ id: 'prior_decision', value: 'Người mua đã đồng ý giao dịch ở chương trước.' });
    state.recentOutcomes.push({
      chapterNumber: 1,
      title: 'Cách giữ lạnh đã dùng',
      event: 'Hải đã giải quyết việc giữ lạnh cho mẻ hàng.',
      result: 'Thùng hàng đã giữ được độ tươi.',
      method: 'lót trấu và xơ dừa quanh thùng',
      endingSituation: 'Mẻ hàng sẵn sàng chuyển sang tìm đầu ra.',
      evidenceSpans: ['lót trấu và xơ dừa'],
    });
    const brief = JSON.stringify(buildWriterBrief({
      kernel,
      state,
      plan: plan(1),
      relevantTransitions: [{
        chapterNumber: 1,
        deltaId: 'delta_prior_decision',
        kind: 'fact',
        entityId: 'prior_decision',
        before: null,
        after: 'buyer_agreed',
        relatedEntityIds: ['main', 'buyer', 'prior_decision'],
      }],
    }));
    expect(brief).not.toContain('endingDirection');
    expect(brief).not.toContain('research');
    expect(brief).not.toContain('rubric');
    expect(brief).not.toContain('promisesToResolve');
    expect(brief).not.toContain('lót trấu và xơ dừa');
    expect(brief).toContain('prior_decision');
    expect(brief).not.toContain('Hải giải thích bằng việc làm');
    expect(brief).not.toContain('"source"');
    expect(brief).not.toContain('"sink"');
    expect(brief).not.toContain('uniqueMechanism');
    expect(brief).not.toContain('stressResponse');
    expect(brief).not.toContain('avoidances');
    const contexts = buildChapterContexts({ kernel, state, plan: plan(1) });
    expect(JSON.stringify(contexts.editorState)).toContain('lót trấu và xơ dừa');
  });

  test.each([13, 50, 200, 800])('Writer gets bounded mechanical history without outcome prose at chapter %i', async chapterNumber => {
    const query: Record<string, unknown> & {
      then?: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    } = {};
    for (const method of ['select', 'eq', 'neq', 'lte', 'overlaps', 'order', 'limit']) {
      query[method] = () => query;
    }
    query.then = resolve => Promise.resolve(resolve({
      data: [{
        chapter_number: 1,
        delta_id: 'delta_first_meeting',
        kind: 'relationship',
        entity_id: 'main',
        before_value: null,
        after_value: 'debt_open',
        related_entity_ids: ['main', 'buyer'],
      }],
      error: null,
    }));
    const transitions = await loadRelevantStoryTransitions({
      db: { from: () => query } as never,
      projectId: '00000000-0000-0000-0000-000000000001',
      state: { ...initialState, chapterNumber },
      entityIds: ['buyer'],
    });
    const brief = JSON.stringify(buildWriterBrief({ kernel, state: initialState, plan: plan(1), relevantTransitions: transitions }));
    expect(brief).toContain('delta_first_meeting');
    expect(brief).toContain('debt_open');
    expect(brief).not.toContain('Hải gặp Tấn lần đầu');
  });

  test('deterministic cover typography renders visible Vietnamese title and watermark pixels', async () => {
    const output = execFileSync(process.execPath, [
      '--import', 'tsx',
      '--input-type=module',
      '-e',
      `const mod=await import('./src/services/story-factory/cover.ts');
       const overlay=await mod.default.renderCoverTypography('Hợp Tác Xã Khô Mực Nắng Vàng');
       const sharp=(await import('sharp')).default;
       const metadata=await sharp(overlay).metadata();
       console.log(JSON.stringify({width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha}));`,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({ width: 1200, height: 1800, hasAlpha: true });
  });

  test('normal chapter uses two calls and has no word-count publication gate', async () => {
    const draft = { title: 'Mẻ hàng đầu tiên', content: 'Hải đặt rổ xuống giữa nhà. Anh không hứa suông mà chia việc, kiểm lại số tiền rồi cùng mẹ bắt tay làm ngay trong buổi sáng.' };
    const pass = editorWirePass('delta_1', 'chia việc');
    const provider = new QueueProvider([draft, pass]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(provider.calls).toEqual(['writer', 'editor']);
    expect(result.decision).toBe('publish');
    expect(result.stateAfter.recentOutcomes[0]).toMatchObject({ chapterNumber: 1, method: 'chia việc và kiểm tra nguồn lực' });
    expect(result.wordCount).toBeLessThan(100);
  });

  test('outcome evidence remains grounded across harmless typography normalization', () => {
    const transitioned = applyChapterPlan({ kernel, state: initialState, plan: plan(1) }).state;
    const state = appendAcceptedOutcome({
      state: transitioned,
      title: 'Lời đồng ý',
      content: 'Bà Lành nói: “Con cứ làm đi.”\n\nHải gật đầu rồi chia việc.',
      outcome: acceptedOutcome('"Bà Lành nói: Con cứ làm đi! Hải gật đầu"'),
    });
    expect(state.recentOutcomes).toHaveLength(1);
  });

  test('outcome evidence still rejects words that are absent from prose', () => {
    const transitioned = applyChapterPlan({ kernel, state: initialState, plan: plan(1) }).state;
    expect(() => appendAcceptedOutcome({
      state: transitioned,
      title: 'Lời đồng ý',
      content: 'Bà Lành lắc đầu. Hải chưa thể bắt tay làm.',
      outcome: acceptedOutcome('Bà Lành đồng ý đưa hết tiền cho Hải.'),
    })).toThrow('sufficiently grounded prose anchor');
  });

  test('outcome evidence accepts ordered verbatim excerpts separated by an ellipsis', () => {
    const transitioned = applyChapterPlan({ kernel, state: initialState, plan: plan(1) }).state;
    const content = 'Hai thúng cá đã được phân loại tinh tươm. Hải gọi mẹ ra xem rồi kê chúng lên phản gỗ. Cơ nghiệp của anh chính thức bắt đầu từ mẻ hàng này.';
    const state = appendAcceptedOutcome({
      state: transitioned,
      title: 'Mẻ hàng',
      content,
      outcome: acceptedOutcome('Hai thúng cá đã được phân loại tinh tươm... Cơ nghiệp của anh chính thức bắt đầu từ mẻ hàng này.'),
    });
    expect(content).toContain(state.recentOutcomes[0].evidenceSpans[0]);
  });

  test('code stores a prose slice instead of a model-altered evidence quote', () => {
    const transitioned = applyChapterPlan({ kernel, state: initialState, plan: plan(1) }).state;
    const content = 'Ta không xin nước của hồ. Ta dùng nước của chính mình để cứu ruộng.';
    const state = appendAcceptedOutcome({
      state: transitioned,
      title: 'Nguồn nước',
      content,
      outcome: acceptedOutcome('Tôi không xin nước của hồ, Tôi dùng nước của tôi'),
    });
    const stored = state.recentOutcomes[0].evidenceSpans[0];
    expect(content).toContain(stored);
    expect(stored).toBe('không xin nước của hồ');
  });

  test('revision is a full draft and requires a fourth re-editor call', async () => {
    const first = { title: 'Bản đầu', content: 'Hải nhìn required delta trên chapter brief rồi bắt đầu làm việc trong căn nhà nhỏ.' };
    const firstPass = editorWirePass('delta_1', 'bắt đầu làm việc');
    const revised = { title: 'Bắt tay vào việc', content: 'Hải trải tấm lưới lên hiên, chỉ cho mẹ phần rách cần vá rồi lấy đúng số tiền dành mua muối. Căn nhà lập tức có việc để làm.' };
    const finalPass = editorWirePass('delta_1', 'có việc để làm');
    const provider = new QueueProvider([first, firstPass, revised, finalPass]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(provider.calls).toEqual(['writer', 'editor', 'writer', 'editor']);
    expect(result.revisionCount).toBe(1);
    expect(result.draft).toEqual(revised);
    expect(result.attemptTelemetry).toMatchObject({
      initialDraft: first,
      initialAssessment: { status: 'revise' },
      revisionDraft: revised,
      finalAssessment: { status: 'pass' },
      revisionCount: 1,
      draftAttempts: 2,
      firstPass: false,
    });
  });

  test('failed rewrite preserves both drafts, both assessments and usage lineage', async () => {
    const first = { title: 'Bản đầu', content: 'Hải nhìn required delta trên chapter brief rồi bắt đầu làm việc trong căn nhà nhỏ.' };
    const firstIssue = editorWirePass('delta_1', 'bắt đầu làm việc');
    const revised = { title: 'Bản sửa', content: 'Hải lại nhìn required delta nhưng vẫn không làm rõ việc đã thay đổi.' };
    const secondIssue = {
      ...editorWirePass('delta_1', 'không làm rõ'),
      status: 'revise' as const,
      issues: [{
        category: 'required_delta' as const,
        severity: 'major' as const,
        scope: 'prose' as const,
        evidence: 'không làm rõ',
        instruction: 'Thực hiện required delta trong cảnh.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: 'không làm rõ' }],
      experienceChecks: {
        sceneDramatized: false,
        characterAgenda: true,
        earnedOutcome: false,
        naturalLanguage: true,
      },
      outcome: { event: '', result: '', method: '', endingSituation: '', evidenceSpans: [] },
    };
    await expect(writeStoryChapter({
      kernel,
      state: initialState,
      plan: plan(1),
      routes,
      provider: new QueueProvider([first, firstIssue, revised, secondIssue]),
    })).rejects.toMatchObject({
      code: 'quality_blocked',
      evidence: {
        pipelineTelemetry: {
          initialDraft: first,
          revisionDraft: revised,
          revisionCount: 1,
          draftAttempts: 2,
          firstPass: false,
        },
      },
    });
  });

  test('reader-blind benchmark excludes plan/state and enforces the first-pass gate', () => {
    const route = {
      planner: 'planner-model',
      planJudge: 'plan-judge-model',
      writer: 'writer-model',
      editor: 'editor-model',
      routeVersion: 'route-v1',
    };
    const digests = Array.from({ length: 4 }, (_, index) => String(index + 1).repeat(64));
    const samples = Array.from({ length: 20 }, (_, index) => ({
      id: `sample-${index + 1}`,
      lane: `lane-${Math.floor(index / 5) + 1}`,
      launchPackDigest: digests[Math.floor(index / 5)],
      readerBrief: {
        premise: 'Một premise đủ dài để giám khảo hiểu lời hứa của truyện.',
        chapterNumber: index % 5 + 1,
        previousTail: index % 5 ? 'Đoạn cuối chương trước đủ để đánh giá điểm nối.' : null,
      },
      control: 'Bản đối chứng có nội dung đủ dài để schema chấp nhận.',
      candidate: 'Bản ứng viên có nội dung đủ dài để schema chấp nhận.',
      candidateTitle: `Chương ${index + 1}`,
      candidateCostUsd: 0.2,
      candidateRevisionCount: index < 4 ? 1 as const : 0 as const,
      continuityPassed: true as const,
    }));
    const corpus = SequentialBenchmarkCorpusSchema.parse({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      engineRelease: 'sf_current',
      builtAt: new Date().toISOString(),
      candidateRoute: route,
      controlRoute: { ...route, writer: 'control-writer' },
      launchPackDigests: digests,
      setupSuccesses: 4,
      planSuccesses: 4,
      providerFailures: 0,
      generationFailures: 0,
      buildCostUsd: 2,
      samples,
    });
    const blind = buildBlindReaderInput({ sample: corpus.samples[0], swap: false });
    expect(blind).toEqual({
      brief: corpus.samples[0].readerBrief,
      versionA: corpus.samples[0].control,
      versionB: corpus.samples[0].candidate,
    });
    expect(JSON.stringify(blind)).not.toMatch(/chapterPlan|stateBefore|requiredDelta|model|cost/iu);
    const judgments = corpus.samples.flatMap(sample => ['judge-a', 'judge-b', 'judge-c'].map(model => ({
      sampleId: sample.id,
      model,
      blinded: true as const,
      swap: false,
      preference: 'B' as const,
      wantsNextA: false,
      wantsNextB: true,
      reason: 'Bản ứng viên tự nhiên và có sức kéo đọc tiếp hơn.',
      usage: { costUsd: 0.01 },
    })));
    const metrics = calculateBenchmarkMetrics({
      corpus,
      judgments,
      judgeModels: ['judge-a', 'judge-b', 'judge-c'],
      judgmentCostUsd: 0.6,
    });
    expect(metrics.firstPassPublishRate).toBe(0.8);
    expect(benchmarkPasses(metrics)).toBe(false);
    expect(() => SequentialBenchmarkCorpusSchema.parse({
      ...corpus,
      samples: corpus.samples.slice(0, 19),
    })).toThrow();
  });

  test('Editor pass cannot contain an issue or false delta', () => {
    expect(EditorAssessmentSchema.safeParse({ status: 'pass', issues: [{ category: 'causality' }], deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: '' }], outcome: acceptedOutcome('evidence') }).success).toBe(false);
    expect(EditorAssessmentSchema.safeParse({ status: 'pass', issues: [], deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }], outcome: acceptedOutcome('evidence') }).success).toBe(false);
  });

  test('flat Editor wire materializes into the canonical evidence contract', () => {
    const assessment = materializeEditorAssessment(editorWirePass('delta_1', 'chia việc'));
    expect(assessment).toMatchObject({ status: 'pass', outcome: { method: 'chia việc và kiểm tra nguồn lực' } });
    expect(() => materializeEditorAssessment({
      ...editorWirePass('delta_1', 'chia việc'),
      status: 'revise',
      outcome: { event: '', result: '', method: '', endingSituation: '', evidenceSpans: [] },
    })).toThrow();
  });

  test('code derives revise when model says pass but also returns an issue', () => {
    const assessment = materializeEditorAssessment({
      ...editorWirePass('delta_1', 'chia việc'),
      issues: [{
        category: 'resource', severity: 'major', scope: 'prose',
        evidence: 'tự bán thêm hàng',
        instruction: 'Bỏ giao dịch không có trong required delta.',
      }],
    });
    expect(assessment).toMatchObject({ status: 'revise', issues: [{ category: 'resource' }] });
  });

  test('Editor prose issue must ground to bytes in the draft', async () => {
    const draft = { title: 'Mẻ lưới đầu', content: 'Hải trải tấm lưới lên hiên rồi cùng mẹ kiểm tra từng mắt rách.' };
    const invalidIssue = {
      v: 1 as const,
      status: 'revise' as const,
      issues: [{
        category: 'stock_reaction' as const,
        severity: 'major' as const,
        scope: 'prose' as const,
        evidence: 'cả làng bàng hoàng reo hò',
        instruction: 'Thay phản ứng tập thể bằng hành động có agenda riêng.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'trải tấm lưới' }],
      experienceChecks: {
        sceneDramatized: true,
        characterAgenda: true,
        earnedOutcome: true,
        naturalLanguage: false,
      },
      experienceEvidence: {
        sceneDramatized: 'trải tấm lưới',
        characterAgenda: 'cùng mẹ kiểm tra',
        earnedOutcome: 'kiểm tra từng mắt rách',
        naturalLanguage: 'trải tấm lưới',
      },
      outcome: { event: '', result: '', method: '', endingSituation: '', evidenceSpans: [] },
    };
    await expect(writeStoryChapter({
      kernel, state: initialState, plan: plan(1), routes,
      provider: new QueueProvider([draft, invalidIssue]),
    })).rejects.toMatchObject({ code: 'infra_blocked' });
  });

  test('accepted outcome evidence must exist verbatim in prose', () => {
    const transitioned = applyChapterPlan({ kernel, state: initialState, plan: plan(1) }).state;
    expect(() => appendAcceptedOutcome({
      state: transitioned,
      title: 'Chương thử',
      content: 'Đây là nội dung thực tế của chương.',
      outcome: acceptedOutcome('một đoạn không tồn tại'),
    })).toThrow(StoryFactoryError);
  });

  test('Gemini structured-output schema keeps only provider-supported bounds', () => {
    const schema = toGeminiResponseSchema(z.object({ arcNumber: z.number().int().positive() }).strict());
    expect((schema.properties as Record<string, Record<string, unknown>>).arcNumber.exclusiveMinimum).toBeUndefined();
  });

  test('Launch Architect schema exposes the initial arc boundary to the provider', () => {
    const schema = toGeminiResponseSchema(LaunchPackSchema);
    const arc = (schema.properties as Record<string, { properties?: Record<string, Record<string, unknown>> }>).arc;
    expect(arc.properties?.startChapter.enum).toEqual([1]);
    expect(arc.properties?.plannedEndChapter.minimum).toBe(20);
    expect(arc.properties?.plannedEndChapter.maximum).toBe(30);
  });

  test('Planner provider schema avoids the rejected nested delta union', () => {
    const schema = JSON.stringify(toGeminiResponseSchema(PlannerRollingPlanResponseSchema));
    expect(schema).not.toContain('"anyOf"');
    expect(schema).toContain('"chaptersJson"');
  });

  test('Planner wire envelope materializes into the exact canonical plan', () => {
    const rolling = materializePlannerRollingPlan(plannerWire());
    expect(rolling.startChapter).toBe(1);
    expect(rolling.plans[0].chapterNumber).toBe(1);
    expect(rolling.plans[0].requiredDeltas[0]).toEqual({
      id: 'delta_1', kind: 'fact', factId: 'fact_day', before: 'ngay_0', after: 'ngay_1',
    });
  });

  test('Plan Judge passes a valid window with one independent review call', async () => {
    const provider = new QueueProvider([plannerWire(), {
      status: 'pass',
      checks: {
        causalMechanism: true, earnedProgression: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, stateTransition: true,
      },
      checkEvidence: {
        causalMechanism: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        stateTransition: 'chapter 1 scene_1 delta_1',
      },
      issues: [],
    }]);
    const result = await planRollingWindow({ kernel, arc, state: initialState, routes, provider });
    expect(result.assessment.status).toBe('pass');
    expect(provider.calls).toEqual(['planner', 'plan-judge']);
  });

  test('Plan Judge permits exactly one full-window replan then passes', async () => {
    const revise = {
      status: 'revise' as const,
      checks: {
        causalMechanism: true, earnedProgression: false, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, stateTransition: true,
      },
      checkEvidence: {
        causalMechanism: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        stateTransition: 'chapter 1 scene_1 delta_1',
      },
      issues: [{
        category: 'earned_progression' as const,
        chapterNumber: 1,
        sceneId: 'scene_1',
        deltaId: 'delta_1',
        evidence: 'delta_1 tăng kết quả quá nhanh',
        instruction: 'Tạo tích lũy và chi phí đủ sức đỡ delta_1.',
      }],
    };
    const provider = new QueueProvider([plannerWire(), revise, plannerWire(), {
      status: 'pass',
      checks: {
        causalMechanism: true, earnedProgression: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, stateTransition: true,
      },
      checkEvidence: {
        causalMechanism: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        stateTransition: 'chapter 1 scene_1 delta_1',
      },
      issues: [],
    }]);
    const result = await planRollingWindow({ kernel, arc, state: initialState, routes, provider });
    expect(result.assessment.status).toBe('pass');
    expect(provider.calls).toEqual(['planner', 'plan-judge', 'planner', 'plan-judge']);
  });

  test('Plan Judge blocks after the second rejected window without fallback', async () => {
    const revise = {
      status: 'revise' as const,
      checks: {
        causalMechanism: true, earnedProgression: true, oppositionAgenda: false,
        sceneVariety: true, stageAlignment: true, stateTransition: true,
      },
      checkEvidence: {
        causalMechanism: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        stateTransition: 'chapter 1 scene_1 delta_1',
      },
      issues: [{
        category: 'opposition_agenda' as const,
        chapterNumber: 1,
        sceneId: 'scene_1',
        deltaId: null,
        evidence: 'scene_1 không có đối sách độc lập',
        instruction: 'Cho đối lực hành động theo lợi ích riêng trong scene_1.',
      }],
    };
    const provider = new QueueProvider([plannerWire(), revise, plannerWire(), revise]);
    await expect(planRollingWindow({ kernel, arc, state: initialState, routes, provider }))
      .rejects.toMatchObject({ code: 'plan_blocked' });
    expect(provider.calls).toEqual(['planner', 'plan-judge', 'planner', 'plan-judge']);
  });

  test('window review can block resource and artifact drift across a chapter window', () => {
    expect(WindowReviewSchema.parse({
      status: 'block',
      checks: {
        structureVariety: false,
        reactionVariety: true,
        voiceSeparation: true,
        earnedProgression: false,
      },
      issues: [
        {
          category: 'resource_drift',
          evidence: 'nhẩm giá mua hai ngàn một ký',
          instruction: 'Đối chiếu lời nhẩm tiền với ledger giá mua đã commit.',
        },
        {
          category: 'artifact_drift',
          evidence: 'chèn mùn cưa lại quanh bao tải',
          instruction: 'Giữ cơ chế thùng bảo ôn nhất quán với thiết kế đã commit.',
        },
      ],
    }).status).toBe('block');
  });

  test('state remains bounded across 1,200 transitions', () => {
    let state = structuredClone(initialState);
    for (let chapterNumber = 1; chapterNumber <= 1_200; chapterNumber += 1) {
      const prose = `Chương ${chapterNumber} đã thực hiện một bước tiến có nguyên nhân.`;
      const transitioned = applyChapterPlan({ kernel, state, plan: plan(chapterNumber) }).state;
      state = appendAcceptedOutcome({
        state: transitioned,
        title: `Chương ${chapterNumber}`,
        content: prose,
        outcome: {
          event: `Nhân vật thực hiện bước tiến ở chương ${chapterNumber}.`,
          result: `Trạng thái truyện đổi sang mốc ${chapterNumber}.`,
          method: 'hành động có nguyên nhân',
          endingSituation: `Truyện đứng ở cuối chương ${chapterNumber}.`,
          evidenceSpans: [prose],
        },
      });
    }
    expect(state.chapterNumber).toBe(1_200);
    expect(state.recentOutcomes).toHaveLength(12);
    expect(state.recentOutcomes[0].chapterNumber).toBe(1_189);
    expect(state.facts).toHaveLength(1);
  });

  test('an exhausted rolling plan routes the next chapter back to planning', () => {
    expect(rollingPlanContainsChapter({ schemaVersion: 1, startChapter: 6, plans: [] }, 6)).toBe(false);
    expect(rollingPlanContainsChapter({ schemaVersion: 1, startChapter: 1, plans: [plan(5)] }, 5)).toBe(true);
  });

  test('factory enablement tolerates harmless environment whitespace', () => {
    expect(isStoryFactoryEnabled('true\n')).toBe(true);
    expect(isStoryFactoryEnabled('false')).toBe(false);
    expect(isStoryFactoryEnabled(undefined)).toBe(false);
  });

  test('window review runs immediately but the following chapter respects the Vietnam daily quota', () => {
    const now = new Date('2026-07-22T06:30:00.000Z');
    expect(nextRunAfterNonChapterStage({ daily_target: 5, chapters_today: 4, quota_date: '2026-07-22' }, now))
      .toBe(now.toISOString());
    expect(nextRunAfterNonChapterStage({ daily_target: 5, chapters_today: 5, quota_date: '2026-07-22' }, now))
      .toBe('2026-07-22T17:00:00.000Z');
  });

  test('Concept Lab grounds all concepts before blind ranking and validates the launch pack', async () => {
    const candidate = (id: string) => ({
      id, workingTitle: `Tên truyện trực diện ${id}`, premise: 'Một premise đủ dài để kiểm tra khả năng triển khai truyện nối tiếp.',
      protagonistContradiction: 'Muốn cứu gia đình nhưng không thể dựa mãi vào ký ức tương lai.',
      uniqueMechanism: 'Cơ chế nghề nghiệp tạo lợi thế nhưng có giới hạn vật chất rõ ràng.',
      rewardLoop: 'Phát hiện cơ hội, lao động, bán hàng rồi tái đầu tư cho gia đình.',
      conflictEconomy: 'Thời tiết, vốn và đầu ra phản ứng theo lợi ích thay vì phản diện ngu.',
      mechanismFingerprint: `mechanism-${id}`, rewardLoopFingerprint: `reward-${id}`, conflictEconomyFingerprint: `conflict-${id}`,
      seriality30: Array.from({ length: 6 }, (_, index) => `Biến thể nhân quả đủ dài số ${index + 1}`),
      seriality1000: Array.from({ length: 8 }, (_, index) => `Arena dài hạn số ${index + 1} đổi quy mô và nguồn xung đột`),
      earlyEndingRisk: 'Cơ chế sẽ cạn sớm nếu chỉ lặp bán hàng; mỗi stage phải đổi arena, giới hạn và lợi ích.',
    });
    const a = Array.from({ length: 6 }, (_, index) => candidate(`a${index + 1}`));
    const b = Array.from({ length: 6 }, (_, index) => candidate(`b${index + 1}`));
    const selected = a[0];
    const pack: LaunchPack = {
      schemaVersion: 1, selectedConceptId: selected.id,
      kernel: { ...kernel, mechanismFingerprint: selected.mechanismFingerprint, rewardLoopFingerprint: selected.rewardLoopFingerprint, conflictEconomyFingerprint: selected.conflictEconomyFingerprint },
      arc: { ...arc, startChapter: 1 }, initialState,
      coverPrompt: 'Một làng biển Việt Nam cuối thập niên tám mươi lúc bình minh, thuyền gỗ và sân phơi cá, không chữ.',
    };
    const openingSample = Array.from({ length: 650 }, (_, index) => (
      ['Hải', 'quan', 'sát', 'con', 'nước', 'rồi', 'chọn', 'việc', 'cần', 'làm'][index % 10]
    )).join(' ');
    const simulations = [a[0], b[0]].map(item => ({
      conceptId: item.id,
      openingSample,
      chapter2Direction: 'Gia đình cùng lao động và gặp giới hạn đầu tiên của nghề.',
      chapter3Direction: 'Mẻ hàng đầu tiên tạo lợi ích cụ thể và mở xung đột đầu ra.',
      characterChemistry: 'Hải chủ động tính toán nhưng phải thuyết phục người mẹ thận trọng bằng hành động thật.',
      conflictAgency: 'Người mua bảo vệ biên lợi nhuận bằng lựa chọn đầu ra riêng, không đứng yên chờ Hải biểu diễn.',
      serialStrength: 'Cơ chế có thể đổi sản phẩm, kỹ thuật, khách hàng và quy mô.',
      causalRisk: 'Ký ức tương lai cần giữ sai số và không biến thành toàn tri.',
      domainFeasibility: 'pass' as const,
      longRunFeasibility: 'pass' as const,
      macroStageStress: Array.from({ length: 4 }, (_, index) => `Stress test stage ${index + 1} với arena và giới hạn khác nhau.`),
      requiredInfrastructure: ['Dụng cụ thủ công và nguồn nguyên liệu địa phương có thật.'],
      minimumPlausibleTimeline: 'Ba chương chỉ hoàn tất một mẻ thử nhỏ, chưa xây xưởng hoàn chỉnh.',
      criticalAssumptions: ['Nhân vật phải lao động và trả đủ chi phí đầu vào.'],
    }));
    const launchWire = {
      v: 1 as const,
      selectedConceptId: pack.selectedConceptId,
      kernelJson: JSON.stringify(pack.kernel),
      arcJson: JSON.stringify(pack.arc),
      initialStateJson: JSON.stringify(pack.initialState),
      coverPrompt: pack.coverPrompt,
    };
    const provider = new QueueProvider([
      { candidates: a }, { candidates: b },
      'Nguồn kỹ thuật xác nhận dụng cụ thủ công khả thi nhưng yêu cầu vệ sinh, thời gian và chi phí thật.',
      { selectedIds: [a[0].id, b[0].id], reasons: ['Cơ chế A rõ và dài hơi.', 'Cơ chế B có conflict economy tốt.'] },
      { simulations }, launchWire,
    ]);
    const result = await runConceptLab({
      commission: { slotKey: 'canary-01', genreLane: 'do-thi-nien-dai', audience: 'Độc giả nam nhưng nữ cũng đọc được.', tone: 'Khoái hoạt, chủ động và đời sống ấm.', settingBoundary: 'Việt Nam hư cấu, nghề nghiệp dựa trên thực tế.' },
      research: { snapshotId: 'research-01', lane: 'do-thi-nien-dai', capturedAt: new Date().toISOString(), signals: [1, 2, 3].map(index => ({ id: `signal_${index}`, sourceUrl: `https://example.com/${index}`, observation: 'Một quan sát thị trường đủ chi tiết và không chứa tác phẩm để sao chép.' })) },
      routes, provider,
    });
    expect(provider.calls).toHaveLength(6);
    expect(provider.calls).toEqual(['gen-a', 'gen-b', 'sim', 'judge', 'sim', 'launch']);
    expect(result.launchPack.selectedConceptId).toBe('a1');
  });
});

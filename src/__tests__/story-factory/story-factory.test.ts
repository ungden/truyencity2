import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  CanonExtensionSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  STORY_FACTORY_SEQUENTIAL_PROTOCOL,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  WriterBakeoffCorpusSchema,
  EditorAssessmentSchema,
  LaunchPackSchema,
  InitialArcPlanSchema,
  InitialStoryStateSchema,
  LaunchStateSchema,
  PlanAssessmentSchema,
  type ArcPlan,
  type ChapterPlan,
  type LaunchPack,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
  type WindowReview,
  StoryFactoryError,
  StoryKernelSchema,
  FIRST_30_PORTFOLIO,
  materializePlannerRollingPlan,
  materializeEditorAssessment,
  materializeWindowReview,
  nextRunAfterNonChapterStage,
  PlannerRollingPlanResponseSchema,
  WindowReviewSchema,
  WindowReviewWireSchema,
  appendAcceptedOutcome,
  applyCanonExtension,
  applyChapterPlan,
  assessStoryDraft,
  assertVoiceSemantics,
  assertComparableSequentialCorpora,
  buildBlindReaderComparison,
  buildBlindReaderInput,
  buildChapterContexts,
  buildPlannerMechanicGuide,
  buildWriterBrief,
  buildSetupCheckpointProvenance,
  bookSetupCheckpointCost,
  createLaunchWorldWireSchema,
  digestArtifact,
  prepareDiscoveryResume,
  isStoryFactoryEnabled,
  calculateValidationMetrics,
  calculateComparativeValidationMetrics,
  loadRelevantStoryMemory,
  loadRelevantStoryTransitions,
  memoryEntityIdsForArc,
  memoryEntityIdsForPlan,
  narrativelyObservableDeltaIds,
  runConceptLab,
  planArcLifecycle,
  planRollingWindow,
  reviewFiveChapterWindow,
  rollingPlanContainsChapter,
  toGeminiResponseSchema,
  validateArcResourceReachability,
  validateKernelState,
  validationPasses,
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
  schemaVersion: 2,
  title: 'Trọng Sinh Về Làng Biển, Tôi Đưa Cả Nhà Ăn No',
  description: 'Một người đàn ông trở lại làng biển và dùng kinh nghiệm nghề nghiệp để gây dựng sinh kế bền vững cho gia đình.',
  genreLane: 'do-thi-nien-dai',
  realityMode: 'grounded',
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
  worldMechanics: [
    {
      id: 'mechanic_exchange', name: 'Đổi vốn lấy hàng', kind: 'conversion',
      description: 'Một đơn vị vốn mua được lượng hàng có giá trị thấp hơn do chi phí giao dịch.',
      inputsPerBatch: [{ resourceId: 'money', amount: 1 }],
      outputsPerBatch: [{ resourceId: 'money', amount: 0.9 }],
      maximumBatchesPerUse: 100,
    },
    {
      id: 'mechanic_trade', name: 'Quyền giao dịch của Hải', kind: 'capability',
      description: 'Hải trực tiếp thương lượng các giao dịch nhỏ.',
      allowedActorIds: ['main'], requiredFacts: [{ factId: 'fact_day', expected: 'ngay_0' }], requiredResourceIds: ['money'],
      effectResources: [
        { resourceId: 'money', direction: 'increase' },
        { resourceId: 'money', direction: 'decrease' },
      ],
      effectFactIds: ['fact_day'],
      capacityUnit: 'giao_dich', maximumUnitsPerMinute: 1,
    },
    {
      id: 'mechanic_daylight', name: 'Hoạt động trong ngày', kind: 'constraint',
      description: 'Công việc hiện tại phải diễn ra trong ngày đã được ghi nhận.',
      requiredFacts: [{ factId: 'fact_day', expected: 'ngay_0' }], forbiddenFacts: [],
    },
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
  resources: [{ id: 'money', name: 'Tiền mặt', kind: 'numeric', unit: 'VND', ownerEntityId: 'main', minimum: 0 }],
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
    v: 3 as const,
    findings: [],
    deltaChecks: [{ deltaId, realized: true, evidence }],
    outcome: acceptedOutcome(evidence),
  };
}

const arc: ArcPlan = {
  schemaVersion: 2, arcNumber: 1, stageId: 'stage_1', startChapter: 1, plannedEndChapter: 20,
  objective: 'Tạo được đầu ra đầu tiên và làm cho gia đình tin vào cách làm mới.',
  terminalChanges: ['Có khách hàng đầu tiên và một phần vốn quay vòng.'],
  activeConflicts: ['Thiếu vốn và hàng dễ hỏng.'],
  activeCharacterIds: ['main', 'mother', 'buyer'],
  activeLocationIds: ['home', 'beach'],
  activeResourceIds: ['money'],
  activeWorldRuleIds: ['rule_market', 'rule_weather'],
  activeMechanicIds: ['mechanic_exchange', 'mechanic_trade', 'mechanic_daylight'],
  duePromiseIds: ['promise_house'],
  progression: ['Tiền mặt tăng rõ ràng', 'Dụng cụ được nâng cấp', 'Uy tín với đầu ra tăng'],
};

const routes: ModelRoutes = {
  setupGeneratorA: 'gen-a', setupGeneratorB: 'gen-b', setupJudge: 'judge',
  openingSimulator: 'sim', launchArchitect: 'launch', planner: 'planner', planJudge: 'plan-judge', writer: 'writer', editor: 'editor', routeVersion: 'test-1',
};

function plan(chapterNumber: number, before = `ngay_${chapterNumber - 1}`): ChapterPlan {
  return {
    schemaVersion: 2,
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
    mechanicUses: [],
  };
}

function plannerWire(chapterNumber = 1): z.infer<typeof PlannerRollingPlanResponseSchema> {
  return {
    v: 2 as const,
    start: chapterNumber,
    chapters: [{
      v: 2, n: chapterNumber, arc: 1, time: chapterNumber * 60,
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
      mechanics: [],
    }],
  };
}

const usage = { model: 'test', inputTokens: 1, outputTokens: 1, costUsd: 0, finishReason: 'STOP' };

function windowReviewPass(chapterOffset = 0): Extract<WindowReview, { status: 'pass' }> {
  const spans = [1, 2].map(chapterNumber => ({
    chapterNumber: chapterNumber + chapterOffset,
    quote: `Bằng chứng nguyên văn chương ${chapterNumber + chapterOffset}.`,
  }));
  return {
    status: 'pass' as const,
    checks: {
      structureVariety: true as const,
      reactionVariety: true as const,
      voiceSeparation: true as const,
      earnedProgression: true as const,
      causalLearning: true as const,
    },
    checkEvidence: {
      structureVariety: spans,
      reactionVariety: spans,
      voiceSeparation: spans,
      earnedProgression: spans,
      causalLearning: spans,
    },
    chapterPatterns: Array.from({ length: 5 }, (_, index) => ({
      chapterNumber: chapterOffset + index + 1,
      dominantStructure: 'mixed_other' as const,
      validationSource: 'material_consequence' as const,
      evidenceStage: 'repeated_observation' as const,
      claimStrength: 'repeatable' as const,
      evidence: [{
        chapterNumber: chapterOffset + index + 1,
        quote: `Bằng chứng nguyên văn chương ${chapterOffset + index + 1}.`,
      }],
    })),
    issues: [] as [],
  };
}

function windowReviewWirePass(chapterOffset = 0): z.input<typeof WindowReviewWireSchema> {
  const checkKeys = ['s', 'r', 'v', 'e', 'l'] as const;
  return {
    v: 1 as const,
    status: 'pass' as const,
    checks: { s: true, r: true, v: true, e: true, l: true },
    evidence: checkKeys.flatMap(k => [1, 2].map(chapter => ({
      k,
      c: chapterOffset + chapter,
      q: `Bằng chứng nguyên văn chương ${chapterOffset + chapter}.`,
    }))),
    patterns: Array.from({ length: 5 }, (_, index) => ({
      c: chapterOffset + index + 1,
      s: 'mo' as const,
      v: 'mc' as const,
      e: 'r' as const,
      k: 'r' as const,
      q: `Bằng chứng nguyên văn chương ${chapterOffset + index + 1}.`,
    })),
    issues: [],
  };
}

class QueueProvider implements StoryModelProvider {
  calls: string[] = [];
  temperatures: Array<number | undefined> = [];
  prompts: string[] = [];
  constructor(private readonly values: unknown[]) {}
  async text(input: { model: string }): Promise<ProviderResult<string>> {
    this.calls.push(input.model);
    return { value: z.string().parse(this.values.shift()), usage };
  }
  async json<T>(input: {
    model: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
  }): Promise<ProviderResult<T>> {
    this.calls.push(input.model);
    this.temperatures.push(input.temperature);
    this.prompts.push(input.prompt);
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
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['gain', 'spend'],
    }];
    const result = applyChapterPlan({ kernel, state: initialState, plan: chapter });
    expect(result.state.resources[0]).toEqual({ resourceId: 'money', kind: 'numeric', value: 30 });
  });

  test('blocks an arc whose active resources have no causal acquisition path before calling Planner', async () => {
    const blockedKernel = structuredClone(kernel);
    blockedKernel.resources.push(
      { id: 'broken_engine', name: 'Động cơ hỏng', kind: 'numeric', unit: 'chiếc', ownerEntityId: 'main', minimum: 0 },
      { id: 'working_engine', name: 'Động cơ hoạt động', kind: 'numeric', unit: 'chiếc', ownerEntityId: 'main', minimum: 0 },
    );
    blockedKernel.worldMechanics.push({
      id: 'repair_engine',
      name: 'Sửa động cơ',
      kind: 'conversion',
      description: 'Một động cơ hỏng được sửa thành một động cơ hoạt động.',
      inputsPerBatch: [{ resourceId: 'broken_engine', amount: 1 }],
      outputsPerBatch: [{ resourceId: 'working_engine', amount: 1 }],
      maximumBatchesPerUse: 1,
    });
    const blockedState = structuredClone(initialState);
    blockedState.resources.push(
      { resourceId: 'broken_engine', kind: 'numeric', value: 0 },
      { resourceId: 'working_engine', kind: 'numeric', value: 0 },
    );
    const blockedArc = {
      ...structuredClone(arc),
      activeResourceIds: ['money', 'broken_engine', 'working_engine'],
      activeMechanicIds: ['repair_engine'],
    };
    expect(() => validateArcResourceReachability({
      kernel: blockedKernel,
      arc: blockedArc,
      state: blockedState,
    })).toThrow('no causal acquisition path');
    const provider = new QueueProvider([]);
    await expect(planRollingWindow({
      kernel: blockedKernel,
      arc: blockedArc,
      state: blockedState,
      routes,
      provider,
    })).rejects.toThrow('no causal acquisition path');
    expect(provider.calls).toHaveLength(0);
  });

  test('accepts a story-specific acquisition conversion feeding a production conversion', () => {
    const reachableKernel = structuredClone(kernel);
    reachableKernel.resources.push(
      { id: 'broken_engine', name: 'Động cơ hỏng', kind: 'numeric', unit: 'chiếc', ownerEntityId: 'main', minimum: 0 },
      { id: 'working_engine', name: 'Động cơ hoạt động', kind: 'numeric', unit: 'chiếc', ownerEntityId: 'main', minimum: 0 },
    );
    reachableKernel.worldMechanics.push(
      {
        id: 'buy_engine',
        name: 'Mua động cơ hỏng',
        kind: 'conversion',
        description: 'Tiền mặt được đổi lấy một động cơ hỏng có nguồn gốc cụ thể.',
        inputsPerBatch: [{ resourceId: 'money', amount: 50 }],
        outputsPerBatch: [{ resourceId: 'broken_engine', amount: 1 }],
        maximumBatchesPerUse: 1,
      },
      {
        id: 'repair_engine',
        name: 'Sửa động cơ',
        kind: 'conversion',
        description: 'Một động cơ hỏng được sửa thành một động cơ hoạt động.',
        inputsPerBatch: [{ resourceId: 'broken_engine', amount: 1 }],
        outputsPerBatch: [{ resourceId: 'working_engine', amount: 1 }],
        maximumBatchesPerUse: 1,
      },
    );
    const reachableState = structuredClone(initialState);
    reachableState.resources.push(
      { resourceId: 'broken_engine', kind: 'numeric', value: 0 },
      { resourceId: 'working_engine', kind: 'numeric', value: 0 },
    );
    const reachableArc = {
      ...structuredClone(arc),
      activeResourceIds: ['money', 'broken_engine', 'working_engine'],
      activeMechanicIds: ['buy_engine', 'repair_engine'],
    };
    expect(() => validateArcResourceReachability({
      kernel: reachableKernel,
      arc: reachableArc,
      state: reachableState,
    })).not.toThrow();
  });

  test('capability effects can feed a later conversion without inventing resources', () => {
    const effectKernel = structuredClone(kernel);
    effectKernel.resources.push(
      { id: 'fresh_fish', name: 'Cá tươi', kind: 'numeric', unit: 'kg', ownerEntityId: 'main', minimum: 0 },
      { id: 'scrap_wood', name: 'Gỗ vụn', kind: 'numeric', unit: 'kg', ownerEntityId: 'main', minimum: 0 },
    );
    effectKernel.worldMechanics.push(
      {
        id: 'coastal_fishing',
        name: 'Đánh bắt ven bờ',
        kind: 'capability',
        description: 'Ngư dân dùng kỹ năng và thời gian để đưa cá lên bờ.',
        allowedActorIds: ['main'],
        requiredFacts: [],
        requiredResourceIds: [],
        effectResources: [{ resourceId: 'fresh_fish', direction: 'increase' }],
        effectFactIds: [],
        capacityUnit: 'kg',
        maximumUnitsPerMinute: 0.5,
      },
      {
        id: 'trade_fish_for_wood',
        name: 'Đổi cá lấy gỗ',
        kind: 'conversion',
        description: 'Cá tươi được đổi lấy gỗ vụn tại xưởng mộc.',
        inputsPerBatch: [{ resourceId: 'fresh_fish', amount: 5 }],
        outputsPerBatch: [{ resourceId: 'scrap_wood', amount: 10 }],
        maximumBatchesPerUse: 2,
      },
    );
    const effectState = structuredClone(initialState);
    effectState.resources.push(
      { resourceId: 'fresh_fish', kind: 'numeric', value: 0 },
      { resourceId: 'scrap_wood', kind: 'numeric', value: 0 },
    );
    const effectArc = {
      ...structuredClone(arc),
      activeResourceIds: ['money', 'fresh_fish', 'scrap_wood'],
      activeMechanicIds: ['coastal_fishing', 'trade_fish_for_wood'],
    };
    expect(() => validateArcResourceReachability({
      kernel: effectKernel,
      arc: effectArc,
      state: effectState,
    })).not.toThrow();
  });

  test('does not require provenance for an active resource until a mechanic uses it', () => {
    const trackedKernel = structuredClone(kernel);
    trackedKernel.resources.push({
      id: 'third_party_cargo',
      name: 'Hàng của khách gửi',
      kind: 'numeric',
      unit: 'kg',
      ownerEntityId: null,
      minimum: 0,
    });
    const trackedState = structuredClone(initialState);
    trackedState.resources.push({
      resourceId: 'third_party_cargo',
      kind: 'numeric',
      value: 0,
    });
    const trackedArc = {
      ...structuredClone(arc),
      activeResourceIds: ['money', 'third_party_cargo'],
    };
    expect(() => validateArcResourceReachability({
      kernel: trackedKernel,
      arc: trackedArc,
      state: trackedState,
    })).not.toThrow();
  });

  test('conversion loss is represented by the input-output ratio, not a second loss ledger', () => {
    const legacyKernel = structuredClone(kernel) as StoryKernel & {
      worldMechanics: Array<Record<string, unknown>>;
    };
    legacyKernel.worldMechanics[0].lossesPerBatch = [{ resourceId: 'money', amount: 0.1 }];
    expect(StoryKernelSchema.safeParse(legacyKernel).success).toBe(false);
    expect(kernel.worldMechanics[0]).toMatchObject({
      inputsPerBatch: [{ resourceId: 'money', amount: 1 }],
      outputsPerBatch: [{ resourceId: 'money', amount: 0.9 }],
    });
  });

  test('Launch World capability ownership is constrained to the selected cast', () => {
    const schema = createLaunchWorldWireSchema(['main', 'mother']);
    const base = {
      kernel: {
        worldModel: kernel.worldModel,
        worldRules: kernel.worldRules,
        locations: kernel.locations,
        travelRules: kernel.travelRules,
        resources: kernel.resources,
      },
      conversions: [kernel.worldMechanics[0]],
      capabilities: [kernel.worldMechanics[1]],
      constraints: [kernel.worldMechanics[2]],
    };
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({
      ...base,
      capabilities: [{
        ...kernel.worldMechanics[1],
        allowedActorIds: ['inst_market'],
      }],
    }).success).toBe(false);
  });

  test('voice validation allows quoted address terms but rejects canned gestures', () => {
    const cast = structuredClone(kernel.characters);
    cast[0].voice.addressRules = "refers to herself as 'nội'";
    expect(() => assertVoiceSemantics(cast)).not.toThrow();
    cast[0].voice.addressRules = "xưng 'bản quan', gọi người khác là 'tiện dân' hoặc 'kẻ vi phạm'";
    expect(() => assertVoiceSemantics(cast)).not.toThrow();
    cast[0].voice.addressRules = "luôn nói 'Các ngươi phải quỳ xuống nghe lệnh của ta ngay'";
    expect(() => assertVoiceSemantics(cast)).toThrow('canned gesture');
    cast[0].voice.addressRules = "xưng 'bản quan', gọi người khác là 'tiện dân' hoặc 'kẻ vi phạm'";
    cast[0].voice.reasoningStyle = 'phân tích chi phí - lợi ích và nguyên nhân - kết quả';
    expect(() => assertVoiceSemantics(cast)).not.toThrow();
    cast[0].voice.reasoningStyle = 'đi từ quy tắc tổng quát đến trường hợp cụ thể';
    expect(() => assertVoiceSemantics(cast)).not.toThrow();
    cast[0].voice.reasoningStyle = '— trả lời bằng một câu thoại dựng sẵn';
    expect(() => assertVoiceSemantics(cast)).toThrow('canned gesture');
    cast[0].voice.reasoningStyle = 'quan sát dữ kiện rồi chia việc cụ thể';
    cast[0].voice.sentenceRhythm = 'cười khẩy rồi gằn từng chữ';
    expect(() => assertVoiceSemantics(cast)).toThrow('canned gesture');
  });

  test('voice traits allow useful neutral detail without inheriting short-label limits', () => {
    const cast = structuredClone(kernel.characters);
    cast[0].voice.addressRules = 'Xưng tôi với người ngang vai, gọi người lớn tuổi bằng vai vế gia đình, chuyển sang anh hoặc chị trong giao dịch, tránh dùng danh xưng quyền lực khi chưa có quan hệ rõ ràng; cách xưng hô thay đổi theo mức độ thân thiết đã commit.';
    expect(cast[0].voice.addressRules.length).toBeGreaterThan(160);
    expect(() => assertVoiceSemantics(StoryKernelSchema.parse({
      ...kernel,
      characters: cast,
    }).characters)).not.toThrow();
  });

  test('rejects a resource transition that is not owned by a validated mechanic', () => {
    const chapter = plan(1);
    chapter.requiredDeltas = [{
      id: 'unowned_money',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: 10,
      after: 110,
      source: 'không rõ cơ chế',
      sink: null,
    }];
    chapter.scenes[0].requiredDeltaIds = ['unowned_money'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('changes resources without a validated world mechanic');
  });

  test('allows sequential owner-authorized external outflows without fake world mechanics', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải trả tiền nợ và chia phần công đã thống nhất.';
    chapter.requiredDeltas = [
      {
        id: 'pay_debt',
        kind: 'resource_numeric',
        resourceId: 'money',
        before: 100,
        delta: -30,
        after: 70,
        source: null,
        sink: 'chủ nợ',
      },
      {
        id: 'share_profit',
        kind: 'resource_numeric',
        resourceId: 'money',
        before: 70,
        delta: -20,
        after: 50,
        source: null,
        sink: 'người cùng làm',
      },
    ];
    chapter.scenes[0].requiredDeltaIds = ['pay_debt', 'share_profit'];
    chapter.mechanicUses = [];
    const result = applyChapterPlan({ kernel, state: initialState, plan: chapter });
    expect(result.state.resources[0]).toEqual({ resourceId: 'money', kind: 'numeric', value: 50 });
  });

  test('rejects an external outflow when the exact resource owner is absent', () => {
    const absentOwnerKernel = structuredClone(kernel);
    const money = absentOwnerKernel.resources.find(item => item.id === 'money');
    if (!money) throw new Error('Missing money fixture.');
    money.ownerEntityId = 'buyer';
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải thanh toán khoản nợ.';
    chapter.requiredDeltas = [{
      id: 'pay_debt',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: -30,
      after: 70,
      source: null,
      sink: 'chủ nợ',
    }];
    chapter.scenes[0].requiredDeltaIds = ['pay_debt'];
    expect(() => applyChapterPlan({ kernel: absentOwnerKernel, state: initialState, plan: chapter }))
      .toThrow('changes resources without a validated world mechanic');
  });

  test('does not let a conversion input masquerade as an external outflow', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải đưa vốn vào mẻ đổi hàng.';
    chapter.requiredDeltas = [{
      id: 'conversion_input',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: -10,
      after: 90,
      source: null,
      sink: 'mechanic_exchange',
    }];
    chapter.scenes[0].requiredDeltaIds = ['conversion_input'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('changes resources without a validated world mechanic');
  });

  test('returns all independent mechanic issues in one causal repair payload', () => {
    const chapter = plan(1);
    chapter.mechanicUses = [
      {
        id: 'use_missing_fact',
        sceneId: 'scene_1',
        mechanicId: 'mechanic_trade',
        role: 'effect',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: [],
        deltaIds: ['delta_1'],
      },
      {
        id: 'use_duplicate_claim',
        sceneId: 'scene_1',
        mechanicId: 'mechanic_daylight',
        role: 'support',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: [],
        deltaIds: ['delta_1'],
      },
    ];
    try {
      applyChapterPlan({ kernel, state: initialState, plan: chapter });
      throw new Error('Expected causal validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(StoryFactoryError);
      expect((error as StoryFactoryError).evidence).toMatchObject({
        issues: [
          { mechanicUseId: 'use_missing_fact' },
          { mechanicUseId: 'use_duplicate_claim' },
        ],
      });
    }
  });

  test('allows support mechanics to guard the same delta without becoming duplicate effect owners', () => {
    const chapter = plan(1);
    chapter.mechanicUses = [
      {
        id: 'use_daylight_support',
        sceneId: 'scene_1',
        mechanicId: 'mechanic_daylight',
        role: 'support',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: ['fact_day'],
        deltaIds: ['delta_1'],
      },
      {
        id: 'use_trade_effect',
        sceneId: 'scene_1',
        mechanicId: 'mechanic_trade',
        role: 'effect',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: ['fact_day'],
        deltaIds: ['delta_1'],
      },
    ];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('validates support prerequisites from scene opening state when an earlier effect consumes them', () => {
    const processingKernel = structuredClone(kernel);
    processingKernel.resources.push(
      { id: 'live_fish', name: 'Cá sống', kind: 'numeric', unit: 'con', ownerEntityId: 'main', minimum: 0 },
      { id: 'processed_fish', name: 'Cá đã sơ chế', kind: 'numeric', unit: 'con', ownerEntityId: 'main', minimum: 0 },
    );
    processingKernel.worldMechanics.push(
      {
        id: 'process_fish',
        name: 'Sơ chế cá',
        kind: 'conversion',
        description: 'Một con cá sống được chuyển thành một con cá đã sơ chế.',
        inputsPerBatch: [{ resourceId: 'live_fish', amount: 1 }],
        outputsPerBatch: [{ resourceId: 'processed_fish', amount: 1 }],
        maximumBatchesPerUse: 1,
      },
      {
        id: 'processing_skill',
        name: 'Kỹ năng sơ chế',
        kind: 'capability',
        description: 'Hải có kỹ năng thao tác trên cá còn sống.',
        allowedActorIds: ['main'],
        requiredFacts: [],
        requiredResourceIds: ['live_fish'],
        effectResources: [],
        effectFactIds: [],
        capacityUnit: null,
        maximumUnitsPerMinute: null,
      },
    );
    const processingState = structuredClone(initialState);
    processingState.resources.push(
      { resourceId: 'live_fish', kind: 'numeric', value: 1 },
      { resourceId: 'processed_fish', kind: 'numeric', value: 0 },
    );
    const chapter = plan(1);
    chapter.requiredDeltas = [
      {
        id: 'consume_live_fish',
        kind: 'resource_numeric',
        resourceId: 'live_fish',
        before: 1,
        delta: -1,
        after: 0,
        source: null,
        sink: 'sơ chế',
      },
      {
        id: 'produce_processed_fish',
        kind: 'resource_numeric',
        resourceId: 'processed_fish',
        before: 0,
        delta: 1,
        after: 1,
        source: 'sơ chế',
        sink: null,
      },
    ];
    chapter.scenes[0].requiredDeltaIds = ['consume_live_fish', 'produce_processed_fish'];
    chapter.mechanicUses = [
      {
        id: 'conversion_first',
        sceneId: 'scene_1',
        mechanicId: 'process_fish',
        role: 'effect',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: [],
        deltaIds: ['consume_live_fish', 'produce_processed_fish'],
      },
      {
        id: 'support_serialized_second',
        sceneId: 'scene_1',
        mechanicId: 'processing_skill',
        role: 'support',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: [],
        deltaIds: ['consume_live_fish', 'produce_processed_fish'],
      },
    ];

    const result = applyChapterPlan({
      kernel: processingKernel,
      state: processingState,
      plan: chapter,
    });
    expect(result.state.resources.find(item => item.resourceId === 'live_fish')).toMatchObject({ value: 0 });
    expect(result.state.resources.find(item => item.resourceId === 'processed_fish')).toMatchObject({ value: 1 });
  });

  test('support capability capacity includes its scene travel while effect capacity does not', () => {
    const travelKernel = structuredClone(kernel);
    const capability = travelKernel.worldMechanics.find(item => item.id === 'mechanic_trade');
    if (!capability || capability.kind !== 'capability') throw new Error('Missing capability fixture.');
    capability.maximumUnitsPerMinute = 0.02;
    const supportPlan = plan(1);
    supportPlan.scenes[0] = {
      ...supportPlan.scenes[0],
      participantIds: ['main', 'buyer'],
      locationId: 'beach',
      durationMinutes: 30,
      travelMinutesFromPrevious: 20,
      requiredDeltaIds: ['move_main'],
    };
    supportPlan.requiredDeltas = [{
      id: 'move_main',
      kind: 'location',
      characterId: 'main',
      beforeLocationId: 'home',
      afterLocationId: 'beach',
    }];
    supportPlan.mechanicUses = [{
      id: 'use_trade_while_travelling',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'support',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['move_main'],
    }];
    expect(() => applyChapterPlan({
      kernel: travelKernel,
      state: initialState,
      plan: supportPlan,
    })).not.toThrow();

    const effectPlan = structuredClone(supportPlan);
    effectPlan.mechanicUses[0].role = 'effect';
    expect(() => applyChapterPlan({
      kernel: travelKernel,
      state: initialState,
      plan: effectPlan,
    })).toThrow('exceeds scene capacity');
  });

  test('causal validation simulates external facts and effect resources in scene order', () => {
    const sequenceKernel = structuredClone(kernel);
    sequenceKernel.resources.push({
      id: 'rain_water',
      name: 'Nước mưa đã hứng',
      kind: 'numeric',
      unit: 'lít',
      ownerEntityId: 'main',
      minimum: 0,
    });
    sequenceKernel.worldMechanics.push(
      {
        id: 'collect_rain',
        name: 'Hứng nước mưa',
        kind: 'capability',
        description: 'Hứng lượng nước mưa thực tế sau khi trời bắt đầu mưa.',
        allowedActorIds: ['main'],
        requiredFacts: [{ factId: 'is_raining', expected: '1' }],
        requiredResourceIds: [],
        effectResources: [{ resourceId: 'rain_water', direction: 'increase' }],
        effectFactIds: [],
        capacityUnit: null,
        maximumUnitsPerMinute: null,
      },
      {
        id: 'wash_with_rain',
        name: 'Rửa bằng nước mưa',
        kind: 'capability',
        description: 'Dùng nước đã hứng để hoàn tất việc rửa nguyên liệu.',
        allowedActorIds: ['main'],
        requiredFacts: [],
        requiredResourceIds: ['rain_water'],
        effectResources: [],
        effectFactIds: ['washed_clean'],
        capacityUnit: null,
        maximumUnitsPerMinute: null,
      },
    );
    const sequenceState = structuredClone(initialState);
    sequenceState.facts.push({ id: 'is_raining', value: '0' });
    sequenceState.resources.push({ resourceId: 'rain_water', kind: 'numeric', value: 0 });
    const chapter = plan(1);
    chapter.storyTimeAfterMinutes = 90;
    chapter.scenes = [
      {
        ...chapter.scenes[0],
        durationMinutes: 30,
        requiredDeltaIds: ['rain_starts'],
      },
      {
        ...chapter.scenes[0],
        id: 'scene_washing',
        durationMinutes: 60,
        objective: 'Hứng nước vừa xuất hiện rồi dùng nó để rửa nguyên liệu.',
        requiredDeltaIds: ['collect_water', 'finish_washing'],
      },
    ];
    chapter.requiredDeltas = [
      { id: 'rain_starts', kind: 'fact', factId: 'is_raining', before: '0', after: '1' },
      {
        id: 'collect_water',
        kind: 'resource_numeric',
        resourceId: 'rain_water',
        before: 0,
        delta: 5,
        after: 5,
        source: 'mưa trong cảnh',
        sink: null,
      },
      { id: 'finish_washing', kind: 'fact', factId: 'washed_clean', before: null, after: '1' },
    ];
    chapter.mechanicUses = [
      {
        id: 'collect_first',
        sceneId: 'scene_washing',
        mechanicId: 'collect_rain',
        role: 'effect',
        actorId: 'main',
        quantity: 5,
        preconditionFactIds: ['is_raining'],
        deltaIds: ['collect_water'],
      },
      {
        id: 'wash_second',
        sceneId: 'scene_washing',
        mechanicId: 'wash_with_rain',
        role: 'effect',
        actorId: 'main',
        quantity: 1,
        preconditionFactIds: [],
        deltaIds: ['finish_washing'],
      },
    ];
    const result = applyChapterPlan({
      kernel: sequenceKernel,
      state: sequenceState,
      plan: chapter,
    });
    expect(result.state.resources.find(item => item.resourceId === 'rain_water')).toMatchObject({ value: 5 });
    expect(result.state.facts.find(item => item.id === 'washed_clean')).toMatchObject({ value: '1' });
  });

  test('capability cannot claim a resource outside its declared effects', () => {
    const restrictedKernel = structuredClone(kernel);
    const capability = restrictedKernel.worldMechanics.find(item => item.id === 'mechanic_trade');
    if (!capability || capability.kind !== 'capability') throw new Error('Missing capability fixture.');
    capability.effectResources = [];
    const chapter = plan(1);
    chapter.requiredDeltas = [{
      id: 'gain',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: 10,
      after: 110,
      source: 'giao dịch',
      sink: null,
    }];
    chapter.scenes[0].requiredDeltaIds = ['gain'];
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['gain'],
    }];
    expect(() => applyChapterPlan({
      kernel: restrictedKernel,
      state: initialState,
      plan: chapter,
    })).toThrow('cannot affect resource money');
  });

  test('capability resource direction is enforced before Writer', () => {
    const restrictedKernel = structuredClone(kernel);
    const capability = restrictedKernel.worldMechanics.find(item => item.id === 'mechanic_trade');
    if (!capability || capability.kind !== 'capability') throw new Error('Missing capability fixture.');
    capability.effectResources = [{ resourceId: 'money', direction: 'decrease' }];
    const chapter = plan(1);
    chapter.requiredDeltas = [{
      id: 'gain',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: 10,
      after: 110,
      source: 'tài trợ vào quỹ đang theo dõi',
      sink: null,
    }];
    chapter.scenes[0].requiredDeltaIds = ['gain'];
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['gain'],
    }];
    expect(() => applyChapterPlan({
      kernel: restrictedKernel,
      state: initialState,
      plan: chapter,
    })).toThrow('cannot increase resource money');
  });

  test('deterministic causal validation catches 100 cross-lane failures without a model call', () => {
    const lanes = ['do-thi', 'nien-dai', 'huyen-huyen', 'tien-hiep-moi'];
    const failures: Array<{ kernel: StoryKernel; plan: ChapterPlan }> = [];
    for (const lane of lanes) {
      for (let index = 0; index < 25; index += 1) {
        const sampleKernel = { ...structuredClone(kernel), genreLane: lane };
        const samplePlan = plan(1);
        const family = index % 8;
        if (family === 0) {
          samplePlan.scenes[0].requiredDeltaIds = ['delta_money'];
          samplePlan.requiredDeltas = [{
            id: 'delta_money', kind: 'resource_numeric', resourceId: 'money',
            before: 100, delta: -2 - index / 100, after: 98 - index / 100,
            source: null, sink: 'chi phí đổi hàng',
          }];
          samplePlan.mechanicUses = [{
            id: 'use_exchange', sceneId: 'scene_1', mechanicId: 'mechanic_exchange',
            role: 'effect', actorId: 'main', quantity: 10, preconditionFactIds: [], deltaIds: ['delta_money'],
          }];
        } else if (family === 1) {
          samplePlan.mechanicUses = [{
            id: `use_actor_${index}`, sceneId: 'scene_1', mechanicId: 'mechanic_trade',
            role: 'effect', actorId: 'mother', quantity: 1, preconditionFactIds: ['fact_day'], deltaIds: ['delta_1'],
          }];
        } else if (family === 2) {
          samplePlan.mechanicUses = [{
            id: `use_capacity_${index}`, sceneId: 'scene_1', mechanicId: 'mechanic_trade',
            role: 'effect', actorId: 'main', quantity: 61 + index, preconditionFactIds: ['fact_day'], deltaIds: ['delta_1'],
          }];
        } else if (family === 3) {
          sampleKernel.worldMechanics = sampleKernel.worldMechanics.map(mechanic => (
            mechanic.id === 'mechanic_daylight' && mechanic.kind === 'constraint'
              ? { ...mechanic, requiredFacts: [], forbiddenFacts: [{ factId: 'fact_day', expected: 'ngay_0' }] }
              : mechanic
          ));
          samplePlan.mechanicUses = [{
            id: `use_constraint_${index}`, sceneId: 'scene_1', mechanicId: 'mechanic_daylight',
            role: 'support', actorId: 'main', quantity: 1, preconditionFactIds: [], deltaIds: ['delta_1'],
          }];
        } else if (family === 4) {
          samplePlan.scenes[0].requiredDeltaIds = ['unowned_money'];
          samplePlan.requiredDeltas = [{
            id: 'unowned_money', kind: 'resource_numeric', resourceId: 'money',
            before: 100, delta: 10, after: 110, source: 'không rõ', sink: null,
          }];
        } else if (family === 5) {
          samplePlan.storyTimeAfterMinutes = 10;
        } else if (family === 6) {
          samplePlan.mechanicUses = [{
            id: `use_missing_knowledge_${index}`, sceneId: 'scene_1', mechanicId: 'mechanic_trade',
            role: 'effect', actorId: 'main', quantity: 1, preconditionFactIds: [], deltaIds: ['delta_1'],
          }];
        } else {
          samplePlan.scenes[0] = {
            ...samplePlan.scenes[0],
            locationId: 'beach',
            travelMinutesFromPrevious: 0,
          };
          samplePlan.requiredDeltas.push({
            id: `location_${index}`,
            kind: 'location',
            characterId: 'main',
            beforeLocationId: 'home',
            afterLocationId: 'beach',
          });
          samplePlan.scenes[0].requiredDeltaIds.push(`location_${index}`);
        }
        failures.push({ kernel: sampleKernel, plan: samplePlan });
      }
    }
    expect(failures).toHaveLength(100);
    for (const [sampleIndex, sample] of failures.entries()) {
      let error: unknown;
      try {
        applyChapterPlan({
          kernel: sample.kernel,
          state: initialState,
          plan: sample.plan,
        });
      } catch (caught) {
        error = caught;
      }
      if (!(error instanceof StoryFactoryError)) {
        throw new Error(`Golden causal sample did not fail: ${JSON.stringify({
          sampleIndex,
          lane: sample.kernel.genreLane,
          family: sampleIndex % 25 % 8,
        })}`);
      }
    }
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

  test('accepts a numeric mechanic fact serialized as a numeric string', () => {
    const sampleKernel = structuredClone(kernel);
    sampleKernel.worldMechanics = sampleKernel.worldMechanics.map(mechanic => (
      mechanic.id === 'mechanic_trade' && mechanic.kind === 'capability'
        ? { ...mechanic, requiredFacts: [{ factId: 'fact_day', expected: 0 }] }
        : mechanic
    ));
    const sampleState = structuredClone(initialState);
    sampleState.facts = [{ id: 'fact_day', value: '0' }];
    const chapter = plan(1, '0');
    chapter.requiredDeltas = [{
      id: 'delta_1', kind: 'fact', factId: 'fact_day', before: '0', after: '1',
    }];
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['delta_1'],
    }];
    expect(() => applyChapterPlan({ kernel: sampleKernel, state: sampleState, plan: chapter })).not.toThrow();
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
    try {
      applyChapterPlan({ kernel, state: initialState, plan: chapter });
      throw new Error('Expected missing-ledger transaction to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'plan_blocked',
        evidence: {
          chapterNumber: 1,
          sceneId: 'scene_1',
          action: chapter.scenes[0].action,
        },
      });
      expect((error as StoryFactoryError).evidence).toMatchObject({
        repairRule: expect.stringContaining('Do not keep a present-tense purchase'),
      });
    }
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

  test('does not treat an internal cash hand-off as a net resource transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải thuyết phục mẹ và nhận tiền để đi mua phế liệu.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('profit sharing requires a numeric ledger delta even when hidden in relationship provenance', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải gặp Tấn để củng cố thỏa thuận hợp tác.';
    chapter.requiredDeltas = [{
      id: 'relationship_profit_share',
      kind: 'relationship',
      characterId: 'buyer',
      counterpartId: 'main',
      before: null,
      after: 'cooperative',
      source: 'Hải chia một phần lợi nhuận cho Tấn',
    }];
    chapter.scenes[0].requiredDeltaIds = ['relationship_profit_share'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('transaction without a numeric resource delta');
  });

  test('a future profit-share promise does not create a fake current transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải hứa sẽ chia một phần lợi nhuận cho Tấn ở mẻ hàng sau.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('reporting a past sale and committing a future profit share is not a new transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải thông báo kết quả bán hàng thành công và cam kết sẽ chia lợi nhuận khi chốt sổ cuối tháng, chưa nhận tiền ngay.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('a detailed past-sale report and deferred profit share are not a current transfer', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải gặp Tấn để thông báo việc mẻ hàng đầu tiên đã được chợ huyện bán hết và tái khẳng định cam kết trích lợi nhuận khi có đợt thu hoạch lớn tiếp theo.';
    chapter.requiredDeltas = [{
      id: 'relationship_future_share',
      kind: 'relationship',
      characterId: 'buyer',
      counterpartId: 'main',
      before: null,
      after: 'Chờ đợt thu hoạch lớn để thực hiện chia lợi nhuận.',
      source: 'Nghe tin mẻ hàng đầu tiên bán thành công và chờ đợi chia lợi nhuận',
    }];
    chapter.scenes[0].requiredDeltaIds = ['relationship_future_share'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('a real profit share after reporting a past sale still requires a ledger delta', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải thông báo kết quả bán hàng thành công, rồi chia tiền lãi ngay cho Tấn.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('transaction without a numeric resource delta');
  });

  test('owned resource direction cannot increase when its owner pays out', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải trả 50 đồng tiền công cho người cung cấp manh mối.';
    chapter.requiredDeltas = [{
      id: 'pay_clue',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: 50,
      after: 150,
      source: 'hai_tra_cong',
      sink: null,
    }];
    chapter.scenes[0].requiredDeltaIds = ['pay_clue'];
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('increases even though its owner pays it out');
  });

  test('owned resource direction accepts a real owner payment', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải trả 50 đồng tiền công; người cung cấp manh mối nhận tiền rồi rời đi.';
    chapter.requiredDeltas = [{
      id: 'pay_clue',
      kind: 'resource_numeric',
      resourceId: 'money',
      before: 100,
      delta: -50,
      after: 50,
      source: null,
      sink: 'người cung cấp manh mối',
    }];
    chapter.scenes[0].requiredDeltaIds = ['pay_clue'];
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['pay_clue'],
    }];
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

  test('does not treat an investigation into taking goods to market as a completed sale', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Thím Tư dùng quyền lực bến bãi để ép một ngư dân khai ra việc Phong dùng thùng xốp giữ lạnh mang cá đi bán.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not treat counting previously committed sale proceeds as a new transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải đếm tiền bán hàng thu được rồi kiểm tra lại dụng cụ đã mua.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('does not treat construction knowledge as creation of a durable asset', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Thẩm Nhược Thủy chất vấn Trần Hữu, nhưng anh dùng kiến thức xây dựng giải thích rằng vách đá tự nhiên bị nứt do áp lực.';
    expect(() => applyChapterPlan({
      kernel,
      state: initialState,
      plan: chapter,
    })).not.toThrow();
  });

  test('does not treat gathering loose materials as creating a durable asset', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Phan và Mai thu gom cọc tre, dây leo và lưới đánh cá cũ để chuẩn bị dựng hàng rào.';
    expect(() => applyChapterPlan({
      kernel,
      state: initialState,
      plan: chapter,
    })).not.toThrow();
  });

  test('does not read thủ công plus a physical quantity as an owner receipt', () => {
    const physicalKernel: StoryKernel = {
      ...kernel,
      resources: [
        ...kernel.resources,
        {
          id: 'res_seaweed_harvested',
          name: 'Rong câu tươi đã vớt',
          kind: 'numeric',
          unit: 'kg',
          ownerEntityId: 'char_main',
          minimum: 0,
          maximum: 500,
        },
        {
          id: 'res_agar',
          name: 'Thạch sợi',
          kind: 'numeric',
          unit: 'kg',
          ownerEntityId: 'main',
          minimum: 0,
          maximum: 500,
        },
      ],
      worldMechanics: [
        ...kernel.worldMechanics,
        {
          id: 'conv_cook_agar',
          kind: 'conversion',
          name: 'Nấu thạch',
          description: 'Hai mươi cân rong tươi được nấu và ép thành hai cân thạch sợi.',
          inputsPerBatch: [{ resourceId: 'res_seaweed_harvested', amount: 20 }],
          outputsPerBatch: [{ resourceId: 'res_agar', amount: 2 }],
          maximumBatchesPerUse: 1,
        },
      ],
    };
    const physicalState: StoryState = {
      ...initialState,
      resources: [
        ...initialState.resources,
        {
          resourceId: 'res_seaweed_harvested',
          kind: 'numeric',
          value: 20,
        },
        {
          resourceId: 'res_agar',
          kind: 'numeric',
          value: 0,
        },
      ],
    };
    const chapter = plan(1);
    chapter.scenes[0].action = 'Hải dùng kích gỗ thủ công ép dịch qua màng lọc và phơi thành 2 kg thạch sợi.';
    chapter.requiredDeltas = [
      {
        id: 'consume_seaweed',
        kind: 'resource_numeric',
        resourceId: 'res_seaweed_harvested',
        before: 20,
        delta: -20,
        after: 0,
        source: 'res_seaweed_harvested',
        sink: 'conv_cook_agar',
      },
      {
        id: 'produce_agar',
        kind: 'resource_numeric',
        resourceId: 'res_agar',
        before: 0,
        delta: 2,
        after: 2,
        source: 'conv_cook_agar',
        sink: 'res_agar',
      },
    ];
    chapter.scenes[0].requiredDeltaIds = ['consume_seaweed', 'produce_agar'];
    chapter.mechanicUses = [{
      id: 'use_cook_agar',
      sceneId: chapter.scenes[0].id,
      mechanicId: 'conv_cook_agar',
      role: 'effect',
      actorId: 'main',
      preconditionFactIds: [],
      deltaIds: ['consume_seaweed', 'produce_agar'],
      quantity: 1,
    }];
    expect(() => applyChapterPlan({
      kernel: physicalKernel,
      state: physicalState,
      plan: chapter,
    })).not.toThrow();
  });

  test('does not treat a policy prohibiting sales as a completed transaction', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Thẩm Uyên ký lệnh nghiêm cấm việc bán quặng thô cho xưởng rèn không phép.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter })).not.toThrow();
  });

  test('still rejects a real sale after a policy prohibition is announced', () => {
    const chapter = plan(1);
    chapter.scenes[0].action = 'Thẩm Uyên ký lệnh cấm bán quặng thô, nhưng thuộc hạ vẫn bán một xe quặng lấy tiền.';
    expect(() => applyChapterPlan({ kernel, state: initialState, plan: chapter }))
      .toThrow('transaction without a numeric resource delta');
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

  test('accepts travel over the shortest directed multi-edge path', () => {
    const travelKernel = structuredClone(kernel);
    travelKernel.locations.push({ id: 'market', name: 'Chợ huyện' });
    travelKernel.travelRules.push({
      fromLocationId: 'beach',
      toLocationId: 'market',
      minimumMinutes: 30,
    }, {
      fromLocationId: 'market',
      toLocationId: 'beach',
      minimumMinutes: 30,
    });
    const chapter = plan(1);
    chapter.storyTimeAfterMinutes = 110;
    chapter.scenes[0] = {
      ...chapter.scenes[0],
      locationId: 'market',
      travelMinutesFromPrevious: 50,
      requiredDeltaIds: ['delta_1', 'move_main', 'move_mother'],
    };
    chapter.requiredDeltas.push(
      {
        id: 'move_main',
        kind: 'location',
        characterId: 'main',
        beforeLocationId: 'home',
        afterLocationId: 'market',
      },
      {
        id: 'move_mother',
        kind: 'location',
        characterId: 'mother',
        beforeLocationId: 'home',
        afterLocationId: 'market',
      },
    );
    expect(() => applyChapterPlan({
      kernel: travelKernel,
      state: initialState,
      plan: chapter,
    })).not.toThrow();

    chapter.scenes[0].travelMinutesFromPrevious = 49;
    expect(() => applyChapterPlan({
      kernel: travelKernel,
      state: initialState,
      plan: chapter,
    })).toThrow('faster than the world permits');
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
      locations: [], travelRules: [], promises: [], worldRules: [], worldMechanics: [],
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
      promises: [], worldRules: [], worldMechanics: [],
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
    for (const method of ['select', 'eq', 'in', 'overlaps', 'order', 'limit']) {
      query[method] = () => query;
    }
    query.lte = (_column: string, value: number) => {
      cutoff = value;
      return query;
    };
    query.then = resolve => Promise.resolve(resolve({
      data: [{
        chapter_number: 1,
        delta_id: 'outcome_1',
        kind: 'chapter_outcome',
        entity_id: 'story',
        before_value: null,
        after_value: chapterOneOutcome,
        related_entity_ids: ['main', 'buyer'],
      }],
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
    expect(cutoff).toBe(chapterNumber);
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
        characters: [], locations: [], travelRules: [], promises: [], worldRules: [], worldMechanics: [],
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
        characters: [], locations: [], travelRules: [], promises: [], worldRules: [], worldMechanics: [],
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
      plan: {
        ...plan(1),
        preconditions: [
          ...plan(1).preconditions,
          { kind: 'resource', entityId: 'money', expected: 100 },
        ],
      },
      continuityPacket: {
        recentOutcomes: [],
        firstAndLastRelationships: [],
        latestEntityTransitions: [{
          chapterNumber: 1,
          deltaId: 'delta_prior_decision',
          kind: 'fact',
          entityId: 'prior_decision',
          before: null,
          after: 'buyer_agreed',
          relatedEntityIds: ['main', 'buyer', 'prior_decision'],
        }],
        promiseOriginsAndProgress: [],
        recentMechanicUses: [],
      },
    }));
    expect(brief).not.toContain('endingDirection');
    expect(brief).not.toContain('research');
    expect(brief).not.toContain('rubric');
    expect(brief).not.toContain('promisesToResolve');
    expect(brief).toContain('"unit":"VND"');
    expect(StoryKernelSchema.safeParse({
      ...kernel,
      resources: [{ id: 'money', name: 'Tiền mặt', kind: 'numeric', minimum: 0 }],
    }).success).toBe(false);
    expect(brief).not.toContain('lót trấu và xơ dừa');
    expect(brief).toContain('prior decision');
    expect(brief).not.toContain('delta_prior_decision');
    expect(brief).not.toContain('Hải giải thích bằng việc làm');
    expect(brief).not.toContain('"source"');
    expect(brief).not.toContain('"sink"');
    expect(brief).not.toContain('uniqueMechanism');
    expect(brief).not.toContain('stressResponse');
    expect(brief).not.toContain('avoidances');
    const contexts = buildChapterContexts({ kernel, state, plan: plan(1) });
    expect(JSON.stringify(contexts.editorState)).toContain('lót trấu và xơ dừa');
  });

  test('hidden world stock and another character balance stay out of Writer prose obligations', async () => {
    const hiddenKernel: StoryKernel = {
      ...structuredClone(kernel),
      resources: [
        ...kernel.resources,
        {
          id: 'wild_stock',
          name: 'Trữ lượng ghẹ ẩn dưới rạn',
          kind: 'numeric',
          unit: 'kg',
          ownerEntityId: null,
          minimum: 0,
        },
        {
          id: 'buyer_cash',
          name: 'Số dư kín của người mua',
          kind: 'numeric',
          unit: 'VND',
          ownerEntityId: 'buyer',
          minimum: 0,
        },
      ],
    };
    const chapter = plan(1);
    chapter.requiredDeltas.push(
      {
        id: 'hidden_wild_stock',
        kind: 'resource_numeric',
        resourceId: 'wild_stock',
        before: 98765,
        delta: -10,
        after: 98755,
        source: null,
        sink: 'ghẹ được đánh bắt',
      },
      {
        id: 'hidden_buyer_balance',
        kind: 'resource_numeric',
        resourceId: 'buyer_cash',
        before: 765432,
        delta: -100,
        after: 765332,
        source: null,
        sink: 'người mua trả cho Hải',
      },
    );
    chapter.scenes[0].requiredDeltaIds.push('hidden_wild_stock', 'hidden_buyer_balance');
    const observable = narrativelyObservableDeltaIds(hiddenKernel, chapter);
    expect([...observable]).toEqual(['delta_1']);
    const brief = JSON.stringify(buildWriterBrief({
      kernel: hiddenKernel,
      state: {
        ...structuredClone(initialState),
        resources: [
          ...initialState.resources,
          { resourceId: 'wild_stock', kind: 'numeric', value: 98765 },
          { resourceId: 'buyer_cash', kind: 'numeric', value: 765432 },
        ],
      },
      plan: chapter,
    }));
    expect(brief).not.toContain('Trữ lượng ghẹ ẩn dưới rạn');
    expect(brief).not.toContain('Số dư kín của người mua');
    expect(brief).not.toContain('98765');
    expect(brief).not.toContain('765432');

    const provider = new QueueProvider([editorWirePass('delta_1', 'Hải chia việc và bắt tay thực hiện')]);
    const assessed = await assessStoryDraft({
      provider,
      model: routes.editor,
      kernel: hiddenKernel,
      state: initialState,
      plan: chapter,
      draft: {
        title: 'Chương 1: Bắt Tay Làm',
        content: 'Hải chia việc và bắt tay thực hiện công việc đã thống nhất với gia đình.',
      },
    });
    expect(assessed.assessment.deltaChecks).toEqual([
      expect.objectContaining({ deltaId: 'delta_1', realized: true }),
    ]);
    expect(provider.prompts[0]).toContain('hiddenMechanicalDeltaIds');
    expect(provider.prompts[0]).toContain('tổng giá trị với mệnh giá');

    const hiddenOnlyKernel: StoryKernel = {
      ...hiddenKernel,
      worldMechanics: [
        ...hiddenKernel.worldMechanics,
        {
          id: 'mechanic_hidden_harvest',
          name: 'Đánh bắt ghẹ từ trữ lượng tự nhiên',
          kind: 'capability',
          description: 'Duy dùng rập lấy ghẹ khỏi trữ lượng tự nhiên có giới hạn.',
          allowedActorIds: ['main'],
          requiredFacts: [],
          requiredResourceIds: ['wild_stock'],
          effectResources: [{ resourceId: 'wild_stock', direction: 'decrease' }],
          effectFactIds: [],
          capacityUnit: 'kg',
          maximumUnitsPerMinute: 1,
        },
      ],
    };
    const hiddenOnlyPlan = plan(1);
    hiddenOnlyPlan.requiredDeltas = [{
      id: 'hidden_wild_stock',
      kind: 'resource_numeric',
      resourceId: 'wild_stock',
      before: 98765,
      delta: -1,
      after: 98764,
      source: null,
      sink: 'Duy đánh bắt một kg ghẹ',
    }];
    hiddenOnlyPlan.scenes[0].requiredDeltaIds = ['hidden_wild_stock'];
    hiddenOnlyPlan.scenes[0].action = 'Duy dùng rập đánh bắt một kg ghẹ từ rạn.';
    hiddenOnlyPlan.mechanicUses = [{
      id: 'use_hidden_harvest',
      sceneId: hiddenOnlyPlan.scenes[0].id,
      mechanicId: 'mechanic_hidden_harvest',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: [],
      deltaIds: ['hidden_wild_stock'],
    }];
    expect(() => applyChapterPlan({
      kernel: hiddenOnlyKernel,
      state: {
        ...structuredClone(initialState),
        resources: [
          ...initialState.resources,
          { resourceId: 'wild_stock', kind: 'numeric', value: 98765 },
          { resourceId: 'buyer_cash', kind: 'numeric', value: 765432 },
        ],
      },
      plan: hiddenOnlyPlan,
    })).toThrow('no reader-visible story delta');
  });

  test('Writer sees causal operation groups without duplicated capacity telemetry', () => {
    const chapter = plan(1);
    chapter.mechanicUses = [{
      id: 'use_trade',
      sceneId: 'scene_1',
      mechanicId: 'mechanic_trade',
      role: 'effect',
      actorId: 'main',
      quantity: 1,
      preconditionFactIds: ['fact_day'],
      deltaIds: ['delta_1'],
    }];
    const brief = JSON.stringify(buildWriterBrief({ kernel, state: initialState, plan: chapter }));
    expect(brief).toContain('"operation":"Quyền giao dịch của Hải"');
    expect(brief).toContain('"actor":"Hải"');
    expect(brief).toContain('"timeBudgetMinutes":60');
    expect(brief).toContain('"travelFromPreviousMinutes":0');
    expect(brief).toContain('"transitions":[{"entity":"fact day"');
    expect(brief).toContain('Hải thực hiện Quyền giao dịch của Hải');
    expect(brief).toContain(kernel.worldMechanics.find(item => item.id === 'mechanic_trade')!.description);
    expect(brief).not.toContain('giao_dich/phút');
    expect(brief).not.toContain('"maximumUnitsPerMinute"');
  });

  test('Writer and Editor receive a mechanical next-chapter handoff without prose from the next plan', () => {
    const current = plan(1);
    const next = plan(2, 'ngay_1');
    next.scenes[0].locationId = 'beach';
    next.scenes[0].travelMinutesFromPrevious = 20;
    next.scenes[0].objective = 'Mở cuộc thương lượng mới ở bãi ngang.';
    next.scenes[0].action = 'Người mua nói một câu dẫn truyện mà Writer không được nhìn thấy.';
    const stateAfter = applyChapterPlan({ kernel, state: initialState, plan: current }).state;
    const contexts = buildChapterContexts({
      kernel,
      state: initialState,
      stateAfter,
      plan: current,
      nextPlan: next,
    });
    expect(contexts.brief.nextOpening).toEqual({
      chapterNumber: 2,
      location: 'Bãi ngang',
      participants: ['Hải', 'Bà Lành'],
      immediateObjective: 'Mở cuộc thương lượng mới ở bãi ngang.',
      plannedTravelMinutes: 20,
      mustRemainAvailableAt: [],
    });
    expect(JSON.stringify(contexts.brief)).not.toContain(next.scenes[0].action);
    expect(JSON.stringify(contexts.brief)).toContain(next.scenes[0].objective);
    expect(contexts.editorState).toMatchObject({
      plannedEndState: { chapterNumber: 1 },
      nextOpening: {
        chapterNumber: 2,
        location: 'Bãi ngang',
        plannedTravelMinutes: 20,
      },
    });
  });

  test.each([13, 50, 200, 800])('Writer gets bounded mechanical history without outcome prose at chapter %i', async chapterNumber => {
    const query: Record<string, unknown> & {
      then?: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    } = {};
    for (const method of ['select', 'eq', 'in', 'lte', 'overlaps', 'order', 'limit']) {
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
    const brief = JSON.stringify(buildWriterBrief({
      kernel,
      state: initialState,
      plan: plan(1),
      continuityPacket: {
        recentOutcomes: [],
        firstAndLastRelationships: transitions,
        latestEntityTransitions: [],
        promiseOriginsAndProgress: [],
        recentMechanicUses: [],
      },
    }));
    expect(brief).not.toContain('delta_first_meeting');
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

  test('chapter pipeline forwards next-opening handoff to both Writer and Editor', async () => {
    const draft = { title: 'Mẻ hàng đầu tiên', content: 'Hải và mẹ vẫn ở trong nhà. Anh chia việc rồi cất tiền cẩn thận, sẵn sàng đón người mua vào sáng hôm sau.' };
    const provider = new QueueProvider([draft, editorWirePass('delta_1', 'chia việc')]);
    await writeStoryChapter({
      kernel,
      state: initialState,
      plan: plan(1),
      nextPlan: plan(2, 'ngay_1'),
      routes,
      provider,
    });
    expect(provider.prompts[0]).toContain('"nextOpening":{"chapterNumber":2');
    expect(provider.prompts[1]).toContain('"plannedEndState":{"chapterNumber":1');
    expect(provider.prompts[1]).toContain('"nextOpening":{"chapterNumber":2');
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

  test('revision keeps the current chapter number and title evidence is grounded', async () => {
    const first = {
      title: 'Chương 4: Tám Ngàn Đồng Đầu Tiên',
      content: 'Hải đặt rổ hàng xuống, kiểm tiền rồi chia việc với mẹ để hoàn tất mẻ thử đầu tiên.',
    };
    const titleIssue = {
      v: 3 as const,
      findings: [{
        category: 'canon' as const,
        severity: 'moderate' as const,
        scope: 'prose' as const,
        evidence: first.title,
        referenceId: 'scene_1',
        instruction: 'Sửa số chương trong title cho đúng chương hiện tại.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'chia việc với mẹ' }],
      outcome: null,
    };
    const revised = {
      title: 'Chương 1: Mẻ Thử Đầu Tiên',
      content: 'Hải đặt rổ hàng xuống, kiểm tiền rồi chia việc với mẹ để hoàn tất mẻ thử đầu tiên.',
    };
    const provider = new QueueProvider([first, titleIssue, revised, editorWirePass('delta_1', 'chia việc với mẹ')]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(result.draft.title).toBe('Chương 1: Mẻ Thử Đầu Tiên');
    expect(result.revisionCount).toBe(1);
    expect(result.attemptTelemetry.initialAssessment).toMatchObject({
      status: 'revise',
      continuityIssues: expect.arrayContaining([
        expect.objectContaining({ category: 'canon', currentEvidence: first.title }),
      ]),
    });
    expect(provider.prompts[2]).toContain('"chapterNumber":1');
  });

  test('deterministic preflight catches a wrong chapter title even when Editor misses it', async () => {
    const first = {
      title: 'Chương 9: Sai Số Thứ Tự',
      content: 'Hải kiểm tiền rồi chia việc với mẹ để bắt đầu mẻ thử trong buổi sáng.',
    };
    const revised = {
      title: 'Chương 1: Bắt Đầu Mẻ Thử',
      content: 'Hải kiểm tiền rồi chia việc với mẹ để bắt đầu mẻ thử trong buổi sáng.',
    };
    const provider = new QueueProvider([
      first,
      editorWirePass('delta_1', 'chia việc với mẹ'),
      revised,
      editorWirePass('delta_1', 'chia việc với mẹ'),
    ]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(result.revisionCount).toBe(1);
    expect(result.attemptTelemetry.initialAssessment).toMatchObject({
      status: 'revise',
      continuityIssues: [expect.objectContaining({ category: 'canon' })],
    });
  });

  test('failed rewrite preserves both drafts, both assessments and usage lineage', async () => {
    const first = { title: 'Bản đầu', content: 'Hải nhìn required delta trên chapter brief rồi bắt đầu làm việc trong căn nhà nhỏ.' };
    const firstIssue = editorWirePass('delta_1', 'bắt đầu làm việc');
    const revised = { title: 'Bản sửa', content: 'Hải lại nhìn required delta nhưng vẫn không làm rõ việc đã thay đổi.' };
    const secondIssue = {
      v: 3 as const,
      findings: [{
        category: 'required_delta' as const,
        severity: 'major' as const,
        scope: 'prose' as const,
        evidence: 'không làm rõ',
        referenceId: 'delta_1',
        instruction: 'Thực hiện required delta trong cảnh.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: 'không làm rõ' }],
      outcome: null,
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

  test('reader-blind sequential validation excludes plan/state and enforces the first-pass gate', () => {
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
      planDigest: `${index + 20}`.padStart(64, '0'),
      readerBrief: {
        premise: 'Một premise đủ dài để giám khảo hiểu lời hứa của truyện.',
        chapterNumber: index % 5 + 1,
        previousTail: index % 5 ? 'Đoạn cuối chương trước đủ để đánh giá điểm nối.' : null,
      },
      content: 'Bản chương tuần tự có nội dung đủ dài để schema chấp nhận.',
      title: `Chương ${index + 1}`,
      allInCostUsd: 0.2,
      revisionCount: index < 4 ? 1 as const : 0 as const,
      planAssessment: { status: 'pass' as const, issues: [] },
      causalValidation: {
        validatorVersion: 'causal-validator-test',
        mechanicUseCount: 0,
        digest: `${index + 40}`.padStart(64, '0'),
      },
      continuityAssessment: {
        status: 'pass' as const,
        checks: {
          previousEndingRespected: true as const,
          stateLedgerRespected: true as const,
          characterMemoryRespected: true as const,
          agendaAndEmotionProgress: true as const,
        },
        issues: [],
      },
      stateBeforeDigest: `${Math.floor(index / 5) * 10 + index % 5}`.padStart(64, '0'),
      stateAfterDigest: `${Math.floor(index / 5) * 10 + index % 5 + 1}`.padStart(64, '0'),
    }));
    const corpus = SequentialBenchmarkCorpusSchema.parse({
      protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
      engineRelease: 'sf_current',
      builtAt: new Date().toISOString(),
      route,
      continuityJudgeModel: 'continuity-judge',
      launchPackDigests: digests,
      setupSuccesses: 4,
      planSuccesses: 4,
      providerFailures: 0,
      generationFailures: 0,
      continuityFailures: 0,
      windowReviewFailures: 0,
      buildCostUsd: 2,
      samples,
      windowReviews: Array.from({ length: 4 }, (_, index) => {
        const lane = `lane-${index + 1}`;
        const laneSamples = samples.filter(sample => sample.lane === lane);
        return {
          lane,
          chapterNumbers: laneSamples.map(sample => sample.readerBrief.chapterNumber),
          chapterDigest: digestArtifact(laneSamples.map(sample => ({
            chapterNumber: sample.readerBrief.chapterNumber,
            title: sample.title,
            content: sample.content,
          }))),
          review: windowReviewPass(),
          usage,
        };
      }),
    });
    const blind = buildBlindReaderInput({ sample: corpus.samples[0] });
    expect(blind).toEqual({
      premise: corpus.samples[0].readerBrief.premise,
      chapterNumber: corpus.samples[0].readerBrief.chapterNumber,
      previousTail: corpus.samples[0].readerBrief.previousTail,
      prose: corpus.samples[0].content,
    });
    expect(JSON.stringify(blind)).not.toMatch(/chapterPlan|stateBefore|requiredDelta|model|cost/iu);
    expect(SequentialBenchmarkCorpusSchema.safeParse({
      ...corpus,
      windowReviews: corpus.windowReviews.map((review, index) => index === 0
        ? { ...review, chapterDigest: '0'.repeat(64) }
        : review),
    }).success).toBe(false);
    const judgments = corpus.samples.flatMap(sample => ['judge-a', 'judge-b', 'judge-c'].map(model => ({
      sampleId: sample.id,
      model,
      blinded: true as const,
      wantsNext: true,
      reason: 'Bản ứng viên tự nhiên và có sức kéo đọc tiếp hơn.',
      usage: { costUsd: 0.01 },
    })));
    const metrics = calculateValidationMetrics({
      corpus,
      judgments,
      judgeModels: ['judge-a', 'judge-b', 'judge-c'],
      judgmentCostUsd: 0.6,
    });
    expect(metrics.firstPassPublishRate).toBe(0.8);
    expect(validationPasses(metrics)).toBe(false);
    const competitorSamples = corpus.samples.map(sample => ({
      ...sample,
      content: 'Bản đối chứng có nội dung đủ dài để schema chấp nhận.',
    }));
    const competitor = SequentialBenchmarkCorpusSchema.parse({
      ...corpus,
      route: { ...corpus.route, writer: 'competitor-writer' },
      samples: competitorSamples,
      windowReviews: corpus.windowReviews.map(review => {
        const laneSamples = competitorSamples.filter(sample => sample.lane === review.lane);
        return {
          ...review,
          chapterDigest: digestArtifact(laneSamples.map(sample => ({
            chapterNumber: sample.readerBrief.chapterNumber,
            title: sample.title,
            content: sample.content,
          }))),
        };
      }),
    });
    assertComparableSequentialCorpora({ candidate: corpus, competitor });
    expect(() => assertComparableSequentialCorpora({
      candidate: corpus,
      competitor: {
        ...competitor,
        samples: competitor.samples.map((sample, index) =>
          index === 0 ? { ...sample, planDigest: 'f'.repeat(64) } : sample),
      },
    })).toThrow('same frozen logical transition');
    const comparison = buildBlindReaderComparison({
      candidate: corpus.samples[0],
      competitor: competitor.samples[0],
      candidateIsA: false,
    });
    expect(JSON.stringify(comparison)).not.toMatch(/chapterPlan|stateBefore|requiredDelta|model|cost/iu);
    const comparativeJudgments = corpus.samples.flatMap(sample =>
      ['judge-a', 'judge-b', 'judge-c'].map(model => ({
        sampleId: sample.id,
        model,
        blinded: true as const,
        preference: 'candidate' as const,
        wantsCandidate: true,
        wantsCompetitor: false,
        usage: { costUsd: 0.01 },
      })));
    const comparativeMetrics = calculateComparativeValidationMetrics({
      candidate: corpus,
      competitor,
      judgments: comparativeJudgments,
      judgeModels: ['judge-a', 'judge-b', 'judge-c'],
      judgmentCostUsd: 0.6,
      campaignOverheadCostUsd: 1,
    });
    expect(comparativeMetrics.candidatePreference).toBe(1);
    expect(comparativeMetrics.totalCostUsd).toBeCloseTo(5.6);
    expect(() => SequentialBenchmarkCorpusSchema.parse({
      ...corpus,
      samples: corpus.samples.slice(0, 19),
    })).toThrow();
    expect(() => SequentialBenchmarkCorpusSchema.parse({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 1
        ? { ...sample, stateBeforeDigest: 'f'.repeat(64) }
        : sample),
    })).toThrow();
  });

  test('infra-only discovery resume preserves checkpoints, cost, and lineage without double booking', () => {
    const progress = {
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_current',
      route: {
        planner: 'planner',
        planJudge: 'judge',
        writer: 'writer',
        editor: 'editor',
        routeVersion: 'route-1',
      },
      continuityJudgeModel: 'continuity',
      startedAt: '2026-07-26T00:00:00.000Z',
      setupSuccesses: 1,
      planSuccesses: 1,
      providerFailures: 1,
      generationFailures: 0,
      continuityFailures: 0,
      windowReviewFailures: 0,
      buildCostUsd: 0.1,
      launchPackDigests: ['a'.repeat(64)],
      samples: [],
      writerBriefs: [{ id: 'era-brief' }],
      chapterAttempts: [],
      setupCheckpoints: {
        era_coastal: {
          generatorA: { usage: { costUsd: 0.2 } },
          generatorB: { usage: { costUsd: 0.2 } },
        },
      },
      plannedWindows: { era_coastal: { id: 'era-plan' } },
      windowReviews: [],
      failure: {
        lane: 'xuanhuan_rules',
        stage: 'setup',
        message: 'fetch failed',
        code: 'infra_blocked',
        evidence: null,
      },
    };
    const resumed = prepareDiscoveryResume({
      progress,
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_current',
      route: progress.route,
      continuityJudgeModel: 'continuity',
      resumedAt: '2026-07-26T01:00:00.000Z',
    });
    expect(resumed.failure).toBeNull();
    expect(resumed.providerFailures).toBe(1);
    expect(resumed.setupSuccesses).toBe(0);
    expect(resumed.planSuccesses).toBe(0);
    expect(resumed.launchPackDigests).toEqual([]);
    expect(resumed.writerBriefs).toEqual([]);
    expect(resumed.plannedWindows).toEqual(progress.plannedWindows);
    expect(resumed.setupCheckpoints.era_coastal).toBe(progress.setupCheckpoints.era_coastal);
    expect(resumed.buildCostUsd).toBeCloseTo(0.4);
    expect(resumed.resumeLineage).toMatchObject([{
      priorFailure: { code: 'infra_blocked' },
      priorCostUsd: 0.1,
      checkpointLanes: ['era_coastal'],
    }]);

    const unchanged = bookSetupCheckpointCost({
      buildCostUsd: resumed.buildCostUsd,
      bookedSetupCostUsdByLane: resumed.bookedSetupCostUsdByLane ?? {},
      lane: 'era_coastal',
      checkpointCostUsd: 0.4,
    });
    expect(unchanged.addedCostUsd).toBe(0);
    const extended = bookSetupCheckpointCost({
      buildCostUsd: unchanged.buildCostUsd,
      bookedSetupCostUsdByLane: unchanged.bookedSetupCostUsdByLane,
      lane: 'era_coastal',
      checkpointCostUsd: 0.55,
    });
    expect(extended.addedCostUsd).toBeCloseTo(0.15);
    expect(extended.buildCostUsd).toBeCloseTo(0.55);
  });

  test('discovery resume rejects content failures and release drift', () => {
    const progress = {
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_old',
      route: { planner: 'p', planJudge: 'j', writer: 'w', editor: 'e', routeVersion: 'r' },
      continuityJudgeModel: 'continuity',
      startedAt: '2026-07-26T00:00:00.000Z',
      setupSuccesses: 0,
      planSuccesses: 0,
      providerFailures: 0,
      generationFailures: 0,
      continuityFailures: 0,
      windowReviewFailures: 0,
      buildCostUsd: 0,
      launchPackDigests: [],
      samples: [],
      writerBriefs: [],
      chapterAttempts: [],
      setupCheckpoints: {},
      plannedWindows: {},
      windowReviews: [],
      failure: {
        lane: 'era_coastal',
        stage: 'plan',
        message: 'invalid plan',
        code: 'plan_blocked',
        evidence: null,
      },
    };
    expect(() => prepareDiscoveryResume({
      progress,
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_old',
      route: progress.route,
      continuityJudgeModel: 'continuity',
    })).toThrow('Only interrupted or infra_blocked');
    expect(() => prepareDiscoveryResume({
      progress: { ...progress, failure: null },
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_new',
      route: progress.route,
      continuityJudgeModel: 'continuity',
    })).toThrow('does not match');

    const compatible = prepareDiscoveryResume({
      progress: {
        ...progress,
        failure: {
          lane: 'xuanhuan_rules',
          stage: 'setup',
          message: 'Voice validator false positive.',
          code: 'setup_blocked',
          evidence: null,
        },
      },
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_new',
      route: { ...progress.route, planner: 'planner-bakeoff-candidate' },
      continuityJudgeModel: 'continuity',
      compatibleSetupOnly: true,
    });
    expect(compatible.engineRelease).toBe('release_new');
    expect(compatible.route).toMatchObject({ planner: 'planner-bakeoff-candidate' });
    expect(compatible.continuityJudgeModel).toBe('continuity');
    expect(compatible.resumeLineage.at(-1)).toMatchObject({
      priorEngineRelease: 'release_old',
      priorFailure: { stage: 'setup', code: 'setup_blocked' },
    });
    const setupOnlyFromCompletedRelease = prepareDiscoveryResume({
      progress: {
        ...progress,
        protocolVersion: 'older-setup-compatible-protocol',
        failure: null,
        setupSuccesses: 4,
        planSuccesses: 4,
        writerBriefs: [{ id: 'old-brief' }],
        plannedWindows: { era_coastal: { id: 'old-plan' } },
      },
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'release_new',
      route: progress.route,
      continuityJudgeModel: 'continuity',
      compatibleSetupOnly: true,
    });
    expect(setupOnlyFromCompletedRelease.engineRelease).toBe('release_new');
    expect(setupOnlyFromCompletedRelease.protocolVersion).toBe(STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL);
    expect(setupOnlyFromCompletedRelease.writerBriefs).toEqual([]);
    expect(setupOnlyFromCompletedRelease.plannedWindows).toEqual({});
    expect(setupOnlyFromCompletedRelease.buildCostUsd).toBe(0);
  });

  test('Writer bake-off corpus accepts only current Plan Judge passes', () => {
    const writerCorpus = {
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: 'sf_current',
      builtAt: new Date().toISOString(),
      planner: 'planner-model',
      planJudge: 'plan-judge-model',
      sourceDiscoveryDigest: 'a'.repeat(64),
      discoveryCostUsd: 1,
      samples: Array.from({ length: 4 }, (_, index) => ({
        id: `brief-${index + 1}`,
        lane: `lane-${index % 4 + 1}`,
        launchPackDigest: `${index % 4 + 1}`.repeat(64),
        planDigest: `${index + 1}`.padStart(64, '0'),
        kernel,
        state: initialState,
        plan: plan(1),
        nextPlan: plan(2, 'ngay_1'),
        previousTail: null,
        planAssessment: { status: 'pass' as const, issues: [] },
        causalValidation: {
          validatorVersion: 'causal-validator-test',
          mechanicUseCount: 0,
          digest: `${index + 40}`.padStart(64, '0'),
        },
      })),
    };
    expect(WriterBakeoffCorpusSchema.parse(writerCorpus).samples).toHaveLength(4);
    expect(() => WriterBakeoffCorpusSchema.parse({
      ...writerCorpus,
      samples: writerCorpus.samples.map((sample, index) => index === 0 ? {
        ...sample,
        planAssessment: {
          status: 'revise',
          issues: [{
            category: 'causal_mechanism',
            chapterNumber: 1,
            sceneId: 'scene_1',
            deltaId: 'delta_1',
            evidence: 'delta_1 chưa đủ nhân quả',
            instruction: 'Lập lại cơ chế nhân quả trước khi Writer được phép nhìn brief.',
          }],
        },
      } : sample),
    })).toThrow();
  });

  test('Editor pass cannot contain an issue or false delta', () => {
    expect(EditorAssessmentSchema.safeParse({
      status: 'pass', continuityIssues: [{ category: 'causality' }], readingIssues: [],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: '' }], outcome: acceptedOutcome('evidence'),
    }).success).toBe(false);
    expect(EditorAssessmentSchema.safeParse({
      status: 'pass', continuityIssues: [], readingIssues: [],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }], outcome: acceptedOutcome('evidence'),
    }).success).toBe(false);
  });

  test('constrained Editor wire materializes into the canonical evidence contract', () => {
    const assessment = materializeEditorAssessment(editorWirePass('delta_1', 'chia việc'));
    expect(assessment).toMatchObject({ status: 'pass', outcome: { method: 'chia việc và kiểm tra nguồn lực' } });
    expect(() => materializeEditorAssessment({
      ...editorWirePass('delta_1', 'chia việc'),
      outcome: null,
    })).toThrow();
  });

  test('Editor issue branch cannot omit evidence or stable continuity reference', () => {
    expect(() => materializeEditorAssessment({
      v: 3,
      findings: [],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }],
      outcome: null,
    })).toThrow();
    expect(() => materializeEditorAssessment({
      v: 3,
      findings: [{
        category: 'required_delta',
        severity: 'major',
        scope: 'prose',
        evidence: 'chưa làm được việc',
        referenceId: null,
        instruction: 'Thực hiện thay đổi bắt buộc trong cảnh.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }],
      outcome: null,
    })).toThrow();
  });

  test('runtime turns a false delta without findings into a deterministic rewrite request', async () => {
    const first = {
      title: 'Chưa xong việc',
      content: 'Hải cùng mẹ kiểm tra tấm lưới nhưng buổi chiều đã xuống mà công việc vẫn chưa hoàn tất.',
    };
    const missingDelta = {
      v: 3 as const,
      findings: [],
      deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }],
      outcome: null,
    };
    const revised = {
      title: 'Bắt tay vào việc',
      content: 'Hải chia phần lưới cho mẹ rồi tự vá đoạn rách lớn; đến cuối buổi, công việc đã khởi động.',
    };
    const provider = new QueueProvider([
      first,
      missingDelta,
      revised,
      editorWirePass('delta_1', 'công việc đã khởi động'),
    ]);
    const result = await writeStoryChapter({
      kernel,
      state: initialState,
      plan: plan(1),
      routes,
      provider,
    });
    expect(result.revisionCount).toBe(1);
    expect(result.attemptTelemetry.initialAssessment).toMatchObject({
      status: 'revise',
      continuityIssues: [{ category: 'required_delta', referenceId: 'delta_1' }],
    });
    expect(provider.prompts[2]).not.toContain('currentDraft');
    expect(provider.prompts[2]).not.toContain(first.content);
    expect(provider.prompts[2]).toContain('required_delta');
  });

  test('code derives revise from issues without accepting a model decision', () => {
    const assessment = materializeEditorAssessment({
      v: 3,
      findings: [{
        category: 'unearned_outcome', severity: 'major',
        scope: 'prose',
        evidence: 'tự bán thêm hàng',
        referenceId: 'prose',
        instruction: 'Bỏ giao dịch không có trong thay đổi bắt buộc.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'chia việc' }],
      outcome: null,
    });
    expect(assessment).toMatchObject({ status: 'revise', readingIssues: [{ category: 'unearned_outcome' }] });
  });

  test('Editor prose issue must ground to bytes in the draft', async () => {
    const draft = { title: 'Mẻ lưới đầu', content: 'Hải trải tấm lưới lên hiên rồi cùng mẹ kiểm tra từng mắt rách.' };
    const invalidIssue = {
      v: 3 as const,
      findings: [{
        category: 'stock_reaction' as const,
        severity: 'major' as const,
        scope: 'prose' as const,
        evidence: 'cả làng bàng hoàng reo hò',
        referenceId: 'prose',
        instruction: 'Thay phản ứng tập thể bằng hành động có agenda riêng.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'trải tấm lưới' }],
      outcome: null,
    };
    await expect(writeStoryChapter({
      kernel, state: initialState, plan: plan(1), routes,
      provider: new QueueProvider([draft, invalidIssue]),
    })).rejects.toMatchObject({ code: 'infra_blocked' });
  });

  test('Editor continuity conflict is canonicalized from a valid stable artifact reference', async () => {
    const draft = {
      title: 'Ngày khác',
      content: 'Hải quả quyết hôm nay là ngày khác rồi bắt đầu làm việc trong nhà.',
    };
    const issue = {
      v: 3 as const,
      findings: [{
        category: 'canon' as const,
        severity: 'major' as const,
        scope: 'prose' as const,
        evidence: 'hôm nay là ngày khác',
        referenceId: 'delta_1',
        instruction: 'Giữ đúng ngày đã khóa trong required transition.',
      }],
      deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'bắt đầu làm việc' }],
      outcome: null,
    };
    const revised = {
      title: 'Bắt tay vào việc',
      content: 'Hải kiểm tra lại lịch rồi bắt đầu làm việc; đến cuối buổi, công việc đã khởi động.',
    };
    const result = await writeStoryChapter({
      kernel,
      state: initialState,
      plan: plan(1),
      routes,
      provider: new QueueProvider([
        draft,
        issue,
        revised,
        editorWirePass('delta_1', 'công việc đã khởi động'),
      ]),
    });
    expect(result.decision).toBe('publish');
    expect(result.attemptTelemetry.initialAssessment).toMatchObject({
      status: 'revise',
      continuityIssues: [{
        referenceId: 'delta_1',
        conflictingEvidence: expect.stringContaining('"id":"delta_1"'),
      }],
    });
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
    const schema = toGeminiResponseSchema(z.object({
      arcNumber: z.number().int().min(1),
      amount: z.number().min(0.000001),
      era: z.string().min(8).max(120),
    }).strict());
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.arcNumber.exclusiveMinimum).toBeUndefined();
    expect(properties.arcNumber.minimum).toBe(1);
    expect(properties.amount.minimum).toBe(0.000001);
    expect(properties.era.minLength).toBeUndefined();
    expect(properties.era.maxLength).toBeUndefined();
    expect(properties.era.description).toContain('minimum 8 characters');
    expect(properties.era.description).toContain('maximum 120 characters');
    const complex = toGeminiResponseSchema(
      z.object({ stages: z.array(z.string()).min(8).max(15) }).strict(),
      { complexity: 'omit_array_max' },
    );
    const stages = (complex.properties as Record<string, Record<string, unknown>>).stages;
    expect(stages.minItems).toBe(8);
    expect(stages.maxItems).toBeUndefined();
  });

  test('Launch Architect schema exposes the initial arc boundary to the provider', () => {
    const schema = toGeminiResponseSchema(InitialArcPlanSchema);
    const arc = schema as { properties?: Record<string, Record<string, unknown>> };
    expect(arc.properties?.startChapter.enum).toEqual([1]);
    expect(arc.properties?.plannedEndChapter.minimum).toBe(20);
    expect(arc.properties?.plannedEndChapter.maximum).toBe(30);
  });

  test('Planner provider schema avoids the rejected nested delta union', () => {
    const schema = JSON.stringify(toGeminiResponseSchema(PlannerRollingPlanResponseSchema));
    expect(schema).not.toContain('"anyOf"');
    expect(schema).toContain('"chapters"');
    expect(schema).not.toContain('"chaptersJson"');
  });

  test('Planner wire envelope materializes into the exact canonical plan', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.deltas[0].before = null;
    chapter.mechanics = [{
      id: 'use_market',
      scene: 'scene_1',
      mechanic: 'mechanic_market',
      role: 'effect',
      actor: 'main',
      qty: 1,
      facts: ['fact_day'],
      primaryDeltaId: 'delta_1',
      additionalDeltaIds: [],
    }];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState);
    expect(rolling.startChapter).toBe(1);
    expect(rolling.plans[0].chapterNumber).toBe(1);
    expect(rolling.plans[0].requiredDeltas[0]).toEqual({
      id: 'delta_1', kind: 'fact', factId: 'fact_day', before: 'ngay_0', after: 'ngay_1',
    });
    expect(rolling.plans[0].mechanicUses[0].deltaIds).toEqual(['delta_1']);
  });

  test('compiler derives required mechanic facts while validator still checks their live value', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.mechanics = [{
      id: 'use_market',
      scene: 'scene_1',
      mechanic: 'mechanic_trade',
      role: 'effect',
      actor: 'main',
      qty: 1,
      facts: [],
      primaryDeltaId: 'delta_1',
      additionalDeltaIds: [],
    }];
    wire.chapters[0] = chapter;

    const rolling = materializePlannerRollingPlan(wire, initialState, kernel);
    expect(rolling.plans[0].mechanicUses[0].preconditionFactIds).toEqual(['fact_day']);
    expect(() => applyChapterPlan({
      kernel,
      state: initialState,
      plan: rolling.plans[0],
    })).not.toThrow();

    const falseState = structuredClone(initialState);
    falseState.facts = falseState.facts.map(fact => (
      fact.id === 'fact_day' ? { ...fact, value: 'sai_ngay' } : fact
    ));
    const falseRolling = materializePlannerRollingPlan(wire, falseState, kernel);
    expect(() => applyChapterPlan({
      kernel,
      state: falseState,
      plan: falseRolling.plans[0],
    })).toThrow('Precondition fact:fact_day is false');
  });

  test('compiler derives conversion ownership and cannot attach a state or fact delta', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.deltas.push({
      id: 'delta_money',
      k: 'resource_numeric',
      target: 'money',
      counterpart: null,
      before: null,
      change: -1,
      after: null,
      source: null,
      sink: 'chi phí đổi hàng',
    });
    chapter.scenes[0].deltaIds = ['delta_1', 'delta_money'];
    chapter.mechanics = [{
      id: 'use_exchange',
      scene: 'scene_1',
      mechanic: 'mechanic_exchange',
      role: 'effect',
      actor: 'main',
      qty: 10,
      facts: [],
      // Deliberately wrong duplicated linkage: the compiler must ignore this
      // fact delta and derive the numeric conversion delta from the contract.
      primaryDeltaId: 'delta_1',
      additionalDeltaIds: [],
    }];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState, kernel);
    expect(rolling.plans[0].mechanicUses[0].deltaIds).toEqual(['delta_money']);
    expect(() => applyChapterPlan({
      kernel,
      state: initialState,
      plan: rolling.plans[0],
    })).not.toThrow();
  });

  test('compiler preserves separate input and recovered-output legs for one resource', () => {
    const recoveryKernel: StoryKernel = structuredClone(kernel);
    recoveryKernel.worldMechanics = [{
      id: 'wash_salt',
      name: 'Rửa vật liệu bằng muối',
      kind: 'conversion',
      description: 'Dùng năm đơn vị muối rồi thu hồi bốn phẩy năm đơn vị.',
      inputsPerBatch: [{ resourceId: 'money', amount: 5 }],
      outputsPerBatch: [{ resourceId: 'money', amount: 4.5 }],
      maximumBatchesPerUse: 1,
    }];
    const wire = plannerWire();
    wire.chapters[0].scenes[0].deltaIds = ['salt_in', 'salt_recovered'];
    wire.chapters[0].deltas = [
      {
        id: 'salt_in', k: 'resource_numeric', target: 'money', counterpart: null,
        before: null, change: -5, after: null, source: null, sink: 'bể rửa',
      },
      {
        id: 'salt_recovered', k: 'resource_numeric', target: 'money', counterpart: null,
        before: null, change: 4.5, after: null, source: 'thu hồi sau rửa', sink: null,
      },
    ];
    wire.chapters[0].mechanics = [{
      id: 'use_wash',
      scene: 'scene_1',
      mechanic: 'wash_salt',
      role: 'effect',
      actor: 'main',
      qty: 1,
      facts: [],
      primaryDeltaId: 'salt_in',
      additionalDeltaIds: ['salt_recovered'],
    }];
    const rolling = materializePlannerRollingPlan(wire, initialState, recoveryKernel);
    expect(rolling.plans[0].mechanicUses[0].deltaIds).toEqual(['salt_in', 'salt_recovered']);
    expect(() => applyChapterPlan({
      kernel: recoveryKernel,
      state: initialState,
      plan: rolling.plans[0],
    })).not.toThrow();
  });

  test('compiler separates chained conversion output and input in the same scene', () => {
    const chainedKernel: StoryKernel = structuredClone(kernel);
    chainedKernel.resources.push(
      { id: 'brine', name: 'Nước chạt', kind: 'numeric', unit: 'lít', ownerEntityId: 'main', minimum: 0 },
      { id: 'salt', name: 'Muối', kind: 'numeric', unit: 'kg', ownerEntityId: 'main', minimum: 0 },
    );
    chainedKernel.worldMechanics = [
      {
        id: 'acquire_brine',
        name: 'Lấy nước chạt',
        kind: 'conversion',
        description: 'Dùng tiền công để lấy một mẻ nước chạt.',
        inputsPerBatch: [{ resourceId: 'money', amount: 10 }],
        outputsPerBatch: [{ resourceId: 'brine', amount: 1_000 }],
        maximumBatchesPerUse: 1,
      },
      {
        id: 'crystallize_salt',
        name: 'Kết tinh muối',
        kind: 'conversion',
        description: 'Một mẻ nước chạt kết tinh thành muối.',
        inputsPerBatch: [{ resourceId: 'brine', amount: 1_000 }],
        outputsPerBatch: [{ resourceId: 'salt', amount: 50 }],
        maximumBatchesPerUse: 1,
      },
    ];
    const chainedState: StoryState = structuredClone(initialState);
    chainedState.resources.push(
      { resourceId: 'brine', kind: 'numeric', value: 0 },
      { resourceId: 'salt', kind: 'numeric', value: 0 },
    );
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.scenes[0].deltaIds = ['pay', 'brine_in', 'brine_out', 'salt_out'];
    chapter.deltas = [
      {
        id: 'pay', k: 'resource_numeric', target: 'money', counterpart: null,
        before: null, change: -10, after: null, source: null, sink: 'tiền công',
      },
      {
        id: 'brine_in', k: 'resource_numeric', target: 'brine', counterpart: null,
        before: null, change: 1_000, after: null, source: 'lấy nước', sink: null,
      },
      {
        id: 'brine_out', k: 'resource_numeric', target: 'brine', counterpart: null,
        before: null, change: -1_000, after: null, source: null, sink: 'kết tinh',
      },
      {
        id: 'salt_out', k: 'resource_numeric', target: 'salt', counterpart: null,
        before: null, change: 50, after: null, source: 'kết tinh', sink: null,
      },
    ];
    chapter.mechanics = [
      {
        id: 'use_acquire',
        scene: 'scene_1',
        mechanic: 'acquire_brine',
        role: 'effect',
        actor: 'main',
        qty: 1,
        facts: [],
        primaryDeltaId: 'brine_out',
        additionalDeltaIds: ['salt_out'],
      },
      {
        id: 'use_crystallize',
        scene: 'scene_1',
        mechanic: 'crystallize_salt',
        role: 'effect',
        actor: 'main',
        qty: 1,
        facts: [],
        primaryDeltaId: 'brine_in',
        additionalDeltaIds: ['pay'],
      },
    ];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, chainedState, chainedKernel);
    expect(rolling.plans[0].mechanicUses).toMatchObject([
      { id: 'use_acquire', deltaIds: ['pay', 'brine_in'] },
      { id: 'use_crystallize', deltaIds: ['brine_out', 'salt_out'] },
    ]);
    expect(() => applyChapterPlan({
      kernel: chainedKernel,
      state: chainedState,
      plan: rolling.plans[0],
    })).not.toThrow();

    const omittedUses = structuredClone(wire);
    omittedUses.chapters[0].mechanics = [];
    const inferred = materializePlannerRollingPlan(omittedUses, chainedState, chainedKernel);
    expect(inferred.plans[0].mechanicUses).toMatchObject([
      {
        mechanicId: 'acquire_brine',
        quantity: 1,
        deltaIds: ['pay', 'brine_in'],
      },
      {
        mechanicId: 'crystallize_salt',
        quantity: 1,
        deltaIds: ['brine_out', 'salt_out'],
      },
    ]);
    expect(() => applyChapterPlan({
      kernel: chainedKernel,
      state: chainedState,
      plan: inferred.plans[0],
    })).not.toThrow();

    const ambiguousKernel: StoryKernel = structuredClone(chainedKernel);
    ambiguousKernel.worldMechanics.push({
      id: 'duplicate_acquire_brine',
      name: 'Một cách lấy nước chạt khác',
      kind: 'conversion',
      description: 'Cùng vector nhưng khác ý nghĩa nên compiler không được đoán.',
      inputsPerBatch: [{ resourceId: 'money', amount: 10 }],
      outputsPerBatch: [{ resourceId: 'brine', amount: 1_000 }],
      maximumBatchesPerUse: 1,
    });
    const ambiguous = materializePlannerRollingPlan(omittedUses, chainedState, ambiguousKernel);
    expect(() => applyChapterPlan({
      kernel: ambiguousKernel,
      state: chainedState,
      plan: ambiguous.plans[0],
    })).toThrow('causal validation issues');
  });

  test('compiler infers a unique capability effect but blocks ambiguous ownership', () => {
    const capabilityKernel: StoryKernel = structuredClone(kernel);
    capabilityKernel.resources.push({
      id: 'dryer_state',
      name: 'Trạng thái lò sấy',
      kind: 'state',
      ownerEntityId: 'main',
    });
    capabilityKernel.worldMechanics.push({
      id: 'assemble_dryer',
      name: 'Lắp lò sấy',
      kind: 'capability',
      description: 'Hải tự lắp lò sấy từ vật tư đã có.',
      allowedActorIds: ['main'],
      requiredFacts: [],
      requiredResourceIds: [],
      effectResources: [{ resourceId: 'dryer_state', direction: 'state_change' }],
      effectFactIds: [],
      capacityUnit: 'lò',
      maximumUnitsPerMinute: 1,
    });
    const capabilityState: StoryState = structuredClone(initialState);
    capabilityState.resources.push({
      resourceId: 'dryer_state',
      kind: 'state',
      value: 'chưa_lắp',
    });
    const wire = plannerWire();
    wire.chapters[0].scenes[0].deltaIds = ['dryer_assembled'];
    wire.chapters[0].deltas = [{
      id: 'dryer_assembled',
      k: 'resource_state',
      target: 'dryer_state',
      counterpart: null,
      before: null,
      change: null,
      after: 'đang_lắp',
      source: 'Hải lắp khung lò',
      sink: null,
    }];
    wire.chapters[0].mechanics = [];
    const inferred = materializePlannerRollingPlan(wire, capabilityState, capabilityKernel);
    expect(inferred.plans[0].mechanicUses).toMatchObject([{
      mechanicId: 'assemble_dryer',
      actorId: 'main',
      quantity: 1,
      deltaIds: ['dryer_assembled'],
    }]);
    expect(() => applyChapterPlan({
      kernel: capabilityKernel,
      state: capabilityState,
      plan: inferred.plans[0],
    })).not.toThrow();

    const ambiguousKernel: StoryKernel = structuredClone(capabilityKernel);
    ambiguousKernel.worldMechanics.push({
      ...structuredClone(capabilityKernel.worldMechanics.find(item => item.id === 'assemble_dryer')!),
      id: 'assemble_dryer_another_way',
      name: 'Một cách lắp lò khác',
    });
    const ambiguous = materializePlannerRollingPlan(wire, capabilityState, ambiguousKernel);
    expect(() => applyChapterPlan({
      kernel: ambiguousKernel,
      state: capabilityState,
      plan: ambiguous.plans[0],
    })).toThrow('without a validated world mechanic');
  });

  test('compiler orders a same-scene fact producer before its dependent capability', () => {
    const dependencyKernel: StoryKernel = structuredClone(kernel);
    dependencyKernel.worldMechanics = [
      {
        id: 'open_gate',
        name: 'Mở cửa gió',
        kind: 'capability',
        description: 'Mở cửa gió trước khi vận hành.',
        allowedActorIds: ['main'],
        requiredFacts: [],
        requiredResourceIds: [],
        effectResources: [],
        effectFactIds: ['fact_gate'],
        capacityUnit: null,
        maximumUnitsPerMinute: null,
      },
      {
        id: 'run_dryer',
        name: 'Vận hành máy sấy',
        kind: 'capability',
        description: 'Chỉ vận hành sau khi cửa gió mở.',
        allowedActorIds: ['main'],
        requiredFacts: [{ factId: 'fact_gate', expected: 1 }],
        requiredResourceIds: [],
        effectResources: [],
        effectFactIds: ['fact_dryer_running'],
        capacityUnit: null,
        maximumUnitsPerMinute: null,
      },
    ];
    const dependencyState: StoryState = structuredClone(initialState);
    dependencyState.facts.push(
      { id: 'fact_gate', value: '0' },
      { id: 'fact_dryer_running', value: '0' },
    );
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.scenes[0].deltaIds = ['gate_open', 'dryer_running'];
    chapter.deltas = [
      {
        id: 'gate_open', k: 'fact', target: 'fact_gate', counterpart: null,
        before: null, change: null, after: 1, source: null, sink: null,
      },
      {
        id: 'dryer_running', k: 'fact', target: 'fact_dryer_running', counterpart: null,
        before: null, change: null, after: 1, source: null, sink: null,
      },
    ];
    // Deliberately reverse the causal order. The compiler, not the model array
    // order, owns this deterministic dependency.
    chapter.mechanics = [
      {
        id: 'use_dryer',
        scene: 'scene_1',
        mechanic: 'run_dryer',
        role: 'effect',
        actor: 'main',
        qty: 1,
        facts: ['fact_gate'],
        primaryDeltaId: 'dryer_running',
        additionalDeltaIds: [],
      },
      {
        id: 'use_gate',
        scene: 'scene_1',
        mechanic: 'open_gate',
        role: 'effect',
        actor: 'main',
        qty: 1,
        facts: [],
        primaryDeltaId: 'gate_open',
        additionalDeltaIds: [],
      },
    ];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, dependencyState, dependencyKernel);
    expect(rolling.plans[0].mechanicUses.map(use => use.id)).toEqual(['use_gate', 'use_dryer']);
    expect(() => applyChapterPlan({
      kernel: dependencyKernel,
      state: dependencyState,
      plan: rolling.plans[0],
    })).not.toThrow();
  });

  test('Planner mechanic guide exposes the exact producer needed before a blocked capability', () => {
    const dependencyKernel: StoryKernel = structuredClone(kernel);
    dependencyKernel.resources.push({
      id: 'processed_dossiers',
      name: 'Hồ sơ đã thẩm định',
      kind: 'numeric',
      unit: 'hồ sơ',
      ownerEntityId: 'main',
      minimum: 0,
    });
    dependencyKernel.worldMechanics.push(
      {
        id: 'process_dossier',
        name: 'Thẩm định hồ sơ',
        kind: 'conversion',
        description: 'Dùng tiền để hoàn tất một hồ sơ.',
        inputsPerBatch: [{ resourceId: 'money', amount: 10 }],
        outputsPerBatch: [{ resourceId: 'processed_dossiers', amount: 1 }],
        maximumBatchesPerUse: 5,
      },
      {
        id: 'approve_loan',
        name: 'Phê duyệt khoản vay',
        kind: 'capability',
        description: 'Chỉ phê duyệt khi đã có hồ sơ thẩm định.',
        allowedActorIds: ['main'],
        requiredFacts: [],
        requiredResourceIds: ['processed_dossiers'],
        effectResources: [],
        effectFactIds: ['fact_day'],
        capacityUnit: 'hồ sơ',
        maximumUnitsPerMinute: 0.02,
      },
    );
    const dependencyState: StoryState = structuredClone(initialState);
    dependencyState.resources.push({
      resourceId: 'processed_dossiers',
      kind: 'numeric',
      value: 0,
    });
    const dependencyArc: ArcPlan = {
      ...structuredClone(arc),
      activeMechanicIds: [
        ...arc.activeMechanicIds,
        'process_dossier',
        'approve_loan',
      ],
    };

    const guide = buildPlannerMechanicGuide({
      kernel: dependencyKernel,
      arc: dependencyArc,
      state: dependencyState,
    });

    expect(guide.mechanics.find(item => item.mechanicId === 'approve_loan')).toEqual({
      mechanicId: 'approve_loan',
      kind: 'capability',
      availableAtWindowStart: false,
      blockedByFacts: [],
      blockedByResources: [{
        resourceId: 'processed_dossiers',
        current: 0,
        minimumForOneUse: null,
        producerMechanicIds: ['process_dossier'],
      }],
      capacity: {
        unit: 'hồ sơ',
        maximumUnitsPerMinute: 0.02,
        minimumAvailableMinutesForOneUnit: 50,
        rule: 'availableMinutes phải >= ceil(qty / maximumUnitsPerMinute); effect dùng scene.dur, support dùng scene.dur + scene.travel.',
      },
      unlocksFactIds: ['fact_day'],
      unlocksResourceIds: [],
    });
  });

  test('Planner prompt receives the state-aware mechanic dependency guide', async () => {
    const provider = new QueueProvider([plannerWire(), {
      status: 'pass',
      checks: {
        protagonistAgency: true, earnedProgression: true, domainPlausibility: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        outcomeWeight: 'chapter 1 scene_1 delta_1',
      },
      issues: [],
    }]);

    await planRollingWindow({ kernel, arc, state: initialState, routes, provider });
    const prompt = JSON.parse(provider.prompts[0]) as {
      mechanicDependencyGuide: {
        planningRule: string;
        mechanics: Array<{ mechanicId: string }>;
      };
    };
    expect(prompt.mechanicDependencyGuide.planningRule).toContain('producerMechanicId');
    expect(prompt.mechanicDependencyGuide.mechanics.map(item => item.mechanicId))
      .toEqual(expect.arrayContaining(arc.activeMechanicIds));
  });

  test('fact before values are derived sequentially from State across a rolling window', () => {
    const first = structuredClone(plannerWire(1).chapters[0]);
    const second = structuredClone(plannerWire(2).chapters[0]);
    first.deltas[0].before = null;
    second.deltas[0].before = null;
    const rolling = materializePlannerRollingPlan({
      v: 2,
      start: 1,
      chapters: [first, second],
    }, initialState);
    expect(rolling.plans[0].requiredDeltas[0]).toMatchObject({
      factId: 'fact_day',
      before: 'ngay_0',
      after: 'ngay_1',
    });
    expect(rolling.plans[1].requiredDeltas[0]).toMatchObject({
      factId: 'fact_day',
      before: 'ngay_1',
      after: 'ngay_2',
    });
  });

  test('a chapter without an invoked world rule remains a valid mechanical plan', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.rules = [];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState);
    expect(rolling.plans[0].requiredWorldRuleIds).toEqual([]);
  });

  test('compiler derives a missing final-location delta from scene participation', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.scenes[0] = {
      ...chapter.scenes[0],
      people: ['main', 'buyer'],
      loc: 'beach',
      travel: 20,
    };
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState);
    const locationDelta = rolling.plans[0].requiredDeltas.find(delta =>
      delta.kind === 'location' && delta.characterId === 'main');
    expect(locationDelta).toMatchObject({
      beforeLocationId: 'home',
      afterLocationId: 'beach',
    });
    expect(rolling.plans[0].scenes[0].requiredDeltaIds).toContain(locationDelta?.id);
  });

  test('Planner wire cannot duplicate compiler-owned location deltas', () => {
    const wire = plannerWire() as unknown as {
      chapters: Array<{ deltas: Array<Record<string, unknown>> }>;
    };
    wire.chapters[0].deltas.push({
      id: 'model_location',
      k: 'location',
      target: 'main',
      counterpart: null,
      before: 'home',
      change: null,
      after: 'beach',
      source: null,
      sink: null,
    });
    expect(PlannerRollingPlanResponseSchema.safeParse(wire).success).toBe(false);
  });

  test('numeric before and after are derived sequentially from the ledger', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.scenes[0].deltaIds = ['spend_money', 'earn_money'];
    chapter.deltas = [
      {
        id: 'spend_money', k: 'resource_numeric', target: 'money', counterpart: null,
        before: null, change: -30, after: null, source: null, sink: 'mua hàng',
      },
      {
        id: 'earn_money', k: 'resource_numeric', target: 'money', counterpart: null,
        before: null, change: 10, after: null, source: 'bán hàng', sink: null,
      },
    ];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState);
    expect(rolling.plans[0].requiredDeltas).toMatchObject([
      { id: 'spend_money', before: 100, delta: -30, after: 70 },
      { id: 'earn_money', before: 70, delta: 10, after: 80 },
    ]);
  });

  test('Planner wire cannot emit a decorative mechanic without a required delta', () => {
    const wire = plannerWire();
    const chapter = structuredClone(wire.chapters[0]);
    chapter.mechanics = [{
      id: 'use_market',
      scene: 'scene_1',
      mechanic: 'mechanic_daylight',
      role: 'support',
      actor: 'main',
      qty: 1,
      facts: ['fact_day'],
      primaryDeltaId: 'missing_delta',
      additionalDeltaIds: [],
    }];
    wire.chapters[0] = chapter;
    const rolling = materializePlannerRollingPlan(wire, initialState);
    expect(() => applyChapterPlan({
      kernel,
      state: initialState,
      plan: rolling.plans[0],
    })).toThrow('unknown delta');
  });

  test('Plan Judge passes a valid window with one independent review call', async () => {
    const provider = new QueueProvider([plannerWire(), {
      status: 'pass',
      checks: {
        protagonistAgency: true, earnedProgression: true, domainPlausibility: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        outcomeWeight: 'chapter 1 scene_1 delta_1',
      },
      issues: [],
    }]);
    const result = await planRollingWindow({ kernel, arc, state: initialState, routes, provider });
    expect(result.assessment.status).toBe('pass');
    expect(provider.calls).toEqual(['planner', 'plan-judge']);
    expect(provider.temperatures).toEqual([0.2, 0.3]);
    expect(result.attempts).toEqual([
      expect.objectContaining({
        attempt: 'initial',
        status: 'validated',
        responseDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
  });

  test('Plan Judge contract can reject an impossible cross-scene knowledge flow', () => {
    expect(PlanAssessmentSchema.parse({
      status: 'revise',
      issues: [{
        category: 'knowledge_flow',
        chapterNumber: 5,
        sceneId: 'scene_report_sale',
        deltaId: null,
        evidence: 'Phan reports a sale completed by Mai in another location before they meet.',
        instruction: 'Add a communication scene and knowledge delta, let Phan witness the sale, or remove the report.',
      }],
    })).toMatchObject({
      status: 'revise',
      issues: [{ category: 'knowledge_flow' }],
    });
  });

  test('Plan Judge permits exactly one full-window replan then passes', async () => {
    const revise = {
      status: 'revise' as const,
      checks: {
        protagonistAgency: true, earnedProgression: false, domainPlausibility: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        outcomeWeight: 'chapter 1 scene_1 delta_1',
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
        protagonistAgency: true, earnedProgression: true, domainPlausibility: true, oppositionAgenda: true,
        sceneVariety: true, stageAlignment: true, outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        outcomeWeight: 'chapter 1 scene_1 delta_1',
      },
      issues: [],
    }]);
    const result = await planRollingWindow({ kernel, arc, state: initialState, routes, provider });
    expect(result.assessment.status).toBe('pass');
    expect(provider.calls).toEqual(['planner', 'plan-judge', 'planner', 'plan-judge']);
  });

  test('mechanical repair does not consume the independent Plan Judge replan budget', async () => {
    const invalidWire = plannerWire();
    invalidWire.chapters[0].mechanics = [{
      id: 'invalid_support',
      scene: 'scene_1',
      mechanic: 'mechanic_daylight',
      role: 'support',
      actor: 'main',
      qty: 1,
      facts: ['fact_day'],
      primaryDeltaId: 'missing_delta',
      additionalDeltaIds: [],
    }];
    const revise = {
      status: 'revise' as const,
      checks: {
        protagonistAgency: true,
        earnedProgression: true,
        domainPlausibility: true,
        oppositionAgenda: false,
        sceneVariety: true,
        stageAlignment: true,
        outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 lacks an opposing choice',
        sceneVariety: 'chapter 1 scene_1 has a distinct action',
        stageAlignment: 'chapter 1 scene_1 serves stage_1',
        outcomeWeight: 'chapter 1 delta_1 is proportional',
      },
      issues: [{
        category: 'opposition_agenda' as const,
        chapterNumber: 1,
        sceneId: 'scene_1',
        deltaId: null,
        evidence: 'The opposition has no independent choice in scene_1.',
        instruction: 'Give the opposition a concrete counter-move in scene_1.',
      }],
    };
    const pass = {
      status: 'pass' as const,
      checks: {
        protagonistAgency: true,
        earnedProgression: true,
        domainPlausibility: true,
        oppositionAgenda: true,
        sceneVariety: true,
        stageAlignment: true,
        outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 now has a counter-move',
        sceneVariety: 'chapter 1 scene_1 has a distinct action',
        stageAlignment: 'chapter 1 scene_1 serves stage_1',
        outcomeWeight: 'chapter 1 delta_1 is proportional',
      },
      issues: [],
    };
    const provider = new QueueProvider([
      invalidWire,
      plannerWire(),
      revise,
      plannerWire(),
      pass,
    ]);
    const result = await planRollingWindow({
      kernel,
      arc,
      state: initialState,
      routes,
      provider,
    });
    expect(result.assessment.status).toBe('pass');
    expect(provider.calls).toEqual([
      'planner',
      'planner',
      'plan-judge',
      'planner',
      'plan-judge',
    ]);
    expect(provider.temperatures).toEqual([0.2, 0.1, 0.3, 0.1, 0.3]);
    expect(result.attempts.map(attempt => ({
      attempt: attempt.attempt,
      status: attempt.status,
    }))).toEqual([
      { attempt: 'initial', status: 'invalid' },
      { attempt: 'mechanical_repair', status: 'validated' },
      { attempt: 'judge_replan', status: 'validated' },
    ]);
  });

  test('a benchmark-required five-chapter window is repaired before Plan Judge', async () => {
    const provider = new QueueProvider([plannerWire(), plannerWire()]);
    await expect(planRollingWindow({
      kernel,
      arc,
      state: initialState,
      routes,
      provider,
      requiredWindowSize: 5,
    })).rejects.toMatchObject({
      code: 'plan_blocked',
      evidence: expect.objectContaining({
        validation: expect.objectContaining({ requiredWindowSize: 5, actualWindowSize: 1 }),
      }),
    });
    expect(provider.calls).toEqual(['planner', 'planner']);
  });

  test('an invalid compact plan is repaired once then classified as plan_blocked', async () => {
    const invalidWire = plannerWire();
    const chapter = structuredClone(invalidWire.chapters[0]);
    chapter.mechanics = [{
      id: 'use_without_delta',
      scene: 'scene_1',
      mechanic: 'mechanic_market',
      role: 'effect',
      actor: 'main',
      qty: 1,
      facts: [],
      primaryDeltaId: 'missing_delta',
      additionalDeltaIds: [],
    }];
    invalidWire.chapters[0] = chapter;
    const provider = new QueueProvider([invalidWire, invalidWire]);
    await expect(planRollingWindow({ kernel, arc, state: initialState, routes, provider }))
      .rejects.toMatchObject({ code: 'plan_blocked' });
    expect(provider.calls).toEqual(['planner', 'planner']);
  });

  test('preserves exact materialization evidence after Planner repair is exhausted', async () => {
    const malformed = plannerWire();
    malformed.chapters[0].deltas[0].after = null;
    const provider = new QueueProvider([malformed, malformed]);
    try {
      await planRollingWindow({
        kernel,
        arc,
        state: initialState,
        routes,
        provider,
      });
      throw new Error('Expected malformed compact plan to block planning.');
    } catch (error) {
      expect(error).toBeInstanceOf(StoryFactoryError);
      expect((error as StoryFactoryError).evidence).toMatchObject({
        validation: {
          kind: 'ZodError',
        },
      });
      expect(((error as StoryFactoryError).evidence as {
        validation: { issues: Array<{ path: Array<string | number> }> };
      }).validation.issues[0].path).toContain('after');
    }
  });

  test('Plan Judge blocks after the second rejected window without fallback', async () => {
    const revise = {
      status: 'revise' as const,
      checks: {
        protagonistAgency: true, earnedProgression: true, domainPlausibility: true, oppositionAgenda: false,
        sceneVariety: true, stageAlignment: true, outcomeWeight: true,
      },
      checkEvidence: {
        protagonistAgency: 'chapter 1 scene_1 delta_1',
        earnedProgression: 'chapter 1 scene_1 delta_1',
        domainPlausibility: 'chapter 1 scene_1 delta_1',
        oppositionAgenda: 'chapter 1 scene_1 delta_1',
        sceneVariety: 'chapter 1 scene_1 delta_1',
        stageAlignment: 'chapter 1 scene_1 delta_1',
        outcomeWeight: 'chapter 1 scene_1 delta_1',
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
      .rejects.toMatchObject({
        code: 'plan_blocked',
        evidence: expect.objectContaining({
          firstAssessment: { status: 'revise', issues: revise.issues },
          firstPlanDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
          firstIssueSnapshot: [
            expect.objectContaining({
              issue: revise.issues[0],
              scene: expect.objectContaining({ id: 'scene_1' }),
            }),
          ],
          validation: revise.issues,
          repairedPlanDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
          repairedIssueSnapshot: [
            expect.objectContaining({
              issue: revise.issues[0],
              scene: expect.objectContaining({ id: 'scene_1' }),
            }),
          ],
        }),
      });
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
        causalLearning: false,
      },
      checkEvidence: {
        structureVariety: [
          { chapterNumber: 1, quote: 'Hải lại giải thích cơ chế trước khi thử.' },
          { chapterNumber: 2, quote: 'Mọi người lại kinh ngạc sau màn biểu diễn.' },
        ],
        reactionVariety: [
          { chapterNumber: 1, quote: 'Bà Lành im lặng kiểm lại số tiền.' },
          { chapterNumber: 2, quote: 'Tấn trả giá bằng một điều kiện mới.' },
        ],
        voiceSeparation: [
          { chapterNumber: 1, quote: 'Hải chia việc bằng câu nói ngắn.' },
          { chapterNumber: 2, quote: 'Tấn vòng vo dò giá trước khi trả lời.' },
        ],
        earnedProgression: [
          { chapterNumber: 1, quote: 'Mẻ thử đầu tiên mới chỉ là giả thuyết.' },
          { chapterNumber: 2, quote: 'Một lần thử đã bị gọi là tuyệt đối.' },
        ],
        causalLearning: [
          { chapterNumber: 1, quote: 'Mẻ thử đầu tiên mới chỉ là giả thuyết.' },
          { chapterNumber: 2, quote: 'Một lần thử đã bị gọi là tuyệt đối.' },
        ],
      },
      chapterPatterns: Array.from({ length: 5 }, (_, index) => ({
        chapterNumber: index + 1,
        dominantStructure: index < 3 ? 'explain_then_demonstrate' as const : 'mixed_other' as const,
        validationSource: index < 3 ? 'expert_surprise' as const : 'material_consequence' as const,
        evidenceStage: index === 1 ? 'single_observation' as const : 'repeated_observation' as const,
        claimStrength: index === 1 ? 'absolute' as const : 'repeatable' as const,
        evidence: [{ chapterNumber: index + 1, quote: `Bằng chứng chương ${index + 1} đủ dài.` }],
      })),
      issues: [
        {
          category: 'resource_drift',
          evidence: [{ chapterNumber: 1, quote: 'nhẩm giá mua hai ngàn một ký' }],
          instruction: 'Đối chiếu lời nhẩm tiền với ledger giá mua đã commit.',
        },
        {
          category: 'artifact_drift',
          evidence: [{ chapterNumber: 2, quote: 'chèn mùn cưa lại quanh bao tải' }],
          instruction: 'Giữ cơ chế thùng bảo ôn nhất quán với thiết kế đã commit.',
        },
      ],
    }).status).toBe('block');
  });

  test('window review uses a compact provider wire and materializes durable evidence', () => {
    const wire = windowReviewWirePass();
    const providerSchema = JSON.stringify(toGeminiResponseSchema(WindowReviewWireSchema));
    expect(providerSchema.length).toBeLessThan(10_000);
    expect(providerSchema).not.toContain('anyOf');
    expect(materializeWindowReview(wire)).toEqual(windowReviewPass());
  });

  test('window review cannot rubber-stamp a repeated explanation-demonstration-surprise formula', async () => {
    const chapters = Array.from({ length: 5 }, (_, index) => ({
      chapterNumber: index + 1,
      title: `Chương ${index + 1}`,
      content: `Bằng chứng nguyên văn chương ${index + 1}. Nhân vật thực hiện diễn biến của chương.`,
    }));
    const review = windowReviewWirePass();
    review.patterns = review.patterns.map((pattern, index) => index < 3 ? {
      ...pattern,
      s: 'xd' as const,
      v: 'es' as const,
    } : pattern);
    const provider = new QueueProvider([review]);
    const result = await reviewFiveChapterWindow({ kernel, arc, state: initialState, chapters, routes, provider });
    expect(result.review).toMatchObject({
      status: 'block',
      checks: { structureVariety: false },
      issues: [expect.objectContaining({ category: 'prose_pattern' })],
    });
  });

  test('window review fails closed when quoted evidence is not in committed prose', async () => {
    const chapters = Array.from({ length: 5 }, (_, index) => ({
      chapterNumber: index + 1,
      title: `Chương ${index + 1}`,
      content: `Bằng chứng nguyên văn chương ${index + 1}.`,
    }));
    const review = windowReviewWirePass();
    review.evidence[0].q = 'Câu này không tồn tại trong chương.';
    const provider = new QueueProvider([review]);
    await expect(reviewFiveChapterWindow({ kernel, arc, state: initialState, chapters, routes, provider }))
      .rejects.toMatchObject({
        code: 'infra_blocked',
        evidence: { usages: [usage] },
      });
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
    expect(rollingPlanContainsChapter({ schemaVersion: 2, startChapter: 6, plans: [] }, 6)).toBe(false);
    expect(rollingPlanContainsChapter({ schemaVersion: 2, startChapter: 1, plans: [plan(5)] }, 5)).toBe(true);
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

  test('setup checkpoints are bound to one commission, research snapshot, and setup route', async () => {
    const commission = JSON.parse(readFileSync('factory/canary/commission.json', 'utf8'));
    const research = JSON.parse(readFileSync('factory/canary/research.json', 'utf8'));
    const provenance = buildSetupCheckpointProvenance({
      commission,
      research,
      routes,
    });
    await expect(runConceptLab({
      commission,
      research,
      routes,
      provider: new QueueProvider([]),
      resume: {
        provenance: {
          ...provenance,
          commissionDigest: '0'.repeat(64),
        },
      },
    })).rejects.toMatchObject({
      code: 'setup_blocked',
      message: expect.stringContaining('different commission'),
    });
  });

  test('launch state cannot promote an opening simulation into phantom canon', () => {
    const phantomOutcome = {
      chapterNumber: 1,
      title: 'Mẫu mở đầu chưa xuất bản',
      event: 'Một cuộc thương lượng chỉ tồn tại trong opening simulation.',
      result: 'Đối thủ đồng ý một giao kèo chưa từng được runtime viết.',
      method: 'Mẫu dùng để chọn concept.',
      endingSituation: 'State giả như chương một đã xảy ra.',
      evidenceSpans: ['cuộc thương lượng chỉ tồn tại'],
    };
    expect(InitialStoryStateSchema.safeParse({
      ...initialState,
      recentOutcomes: [phantomOutcome],
    }).success).toBe(false);
    expect(LaunchStateSchema.safeParse({
      arc,
      initialState: {
        ...initialState,
        recentOutcomes: [phantomOutcome],
      },
    }).success).toBe(false);
    expect(() => validateKernelState(kernel, {
      ...initialState,
      recentOutcomes: [phantomOutcome],
    })).toThrow('ahead of StoryState chapter 0');
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
      schemaVersion: 2, selectedConceptId: 'concept_a_01',
      kernel: { ...kernel, mechanismFingerprint: selected.mechanismFingerprint, rewardLoopFingerprint: selected.rewardLoopFingerprint, conflictEconomyFingerprint: selected.conflictEconomyFingerprint },
      arc: { ...arc, startChapter: 1 }, initialState: InitialStoryStateSchema.parse(initialState),
      coverPrompt: 'Một làng biển Việt Nam cuối thập niên tám mươi lúc bình minh, thuyền gỗ và sân phơi cá, không chữ.',
    };
    const openingSample = Array.from({ length: 650 }, (_, index) => (
      ['Hải', 'quan', 'sát', 'con', 'nước', 'rồi', 'chọn', 'việc', 'cần', 'làm'][index % 10]
    )).join(' ');
    const simulations = ['concept_a_01', 'concept_b_01'].map(conceptId => ({
      conceptId,
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
    const {
      worldModel, worldMechanics, worldRules, locations, travelRules, resources,
      progressionTracks, seriesSpine, longPromises, promises, endingDirection,
      realityMode: _realityMode,
      ...identityKernel
    } = pack.kernel;
    const characterIdMap: Record<string, string> = {
      main: 'character_protagonist_01',
      buyer: 'character_opposition_01',
      mother: 'character_supporting_01',
    };
    const launchWorldMechanics = worldMechanics.map(mechanic => (
      mechanic.kind === 'capability'
        ? {
            ...mechanic,
            allowedActorIds: mechanic.allowedActorIds.map(id => characterIdMap[id] ?? id),
          }
        : mechanic
    ));
    const launchResources = resources.map(resource => ({
      ...resource,
      ownerEntityId: resource.ownerEntityId
        ? (characterIdMap[resource.ownerEntityId] ?? resource.ownerEntityId)
        : null,
    }));
    const launchArc = {
      ...pack.arc,
      activeCharacterIds: pack.arc.activeCharacterIds.map(id => characterIdMap[id] ?? id),
    };
    const launchState = {
      ...pack.initialState,
      characters: pack.initialState.characters.map(character => ({
        ...character,
        characterId: characterIdMap[character.characterId] ?? character.characterId,
        relationshipState: Object.fromEntries(Object.entries(character.relationshipState).map(
          ([id, state]) => [characterIdMap[id] ?? id, state],
        )),
      })),
    };
    const provider = new QueueProvider([
      { candidates: a.map(({ id: _id, ...candidate }) => candidate) },
      { candidates: b.map(({ id: _id, ...candidate }) => candidate) },
      'Nguồn kỹ thuật xác nhận dụng cụ thủ công khả thi nhưng yêu cầu vệ sinh, thời gian và chi phí thật.',
      { selectedIds: ['concept_a_01', 'concept_b_01'], reasons: ['Cơ chế A rõ và dài hơi.', 'Cơ chế B có conflict economy tốt.'] },
      { simulations },
      {
        selectedConceptId: pack.selectedConceptId,
        coverPrompt: pack.coverPrompt,
        kernel: (({ protagonistId: _protagonistId, characters: _characters, ...rest }) => rest)(identityKernel),
        protagonist: (({ id: _id, ...character }) => character)(
          identityKernel.characters.find(character => character.id === identityKernel.protagonistId)!,
        ),
        oppositionCharacters: identityKernel.characters
          .filter(character => character.role === 'opposition')
          .map(({ id: _id, ...character }) => character),
        supportingCharacters: identityKernel.characters
          .filter(character => character.role === 'supporting')
          .map(({ id: _id, ...character }) => character),
      },
      {
        kernel: { worldModel, worldRules, locations, travelRules, resources: launchResources },
        conversions: launchWorldMechanics.filter(mechanic => mechanic.kind === 'conversion'),
        capabilities: launchWorldMechanics.filter(mechanic => mechanic.kind === 'capability'),
        constraints: launchWorldMechanics.filter(mechanic => mechanic.kind === 'constraint'),
      },
      { kernel: { progressionTracks, seriesSpine, longPromises, promises, endingDirection } },
      { arc: launchArc, initialState: launchState },
    ]);
    const result = await runConceptLab({
      commission: { slotKey: 'canary-01', genreLane: 'do-thi-nien-dai', realityMode: 'grounded', audience: 'Độc giả nam nhưng nữ cũng đọc được.', tone: 'Khoái hoạt, chủ động và đời sống ấm.', settingBoundary: 'Việt Nam hư cấu, nghề nghiệp dựa trên thực tế.' },
      research: { snapshotId: 'research-01', lane: 'do-thi-nien-dai', capturedAt: new Date().toISOString(), signals: [1, 2, 3].map(index => ({ id: `signal_${index}`, sourceUrl: `https://example.com/${index}`, observation: 'Một quan sát thị trường đủ chi tiết và không chứa tác phẩm để sao chép.' })) },
      routes, provider,
    });
    expect(provider.calls).toHaveLength(9);
    expect(provider.calls).toEqual(['gen-a', 'gen-b', 'sim', 'judge', 'sim', 'launch', 'launch', 'launch', 'launch']);
    expect(result.launchPack.selectedConceptId).toBe('concept_a_01');
    expect(result.launchPack.kernel.protagonistId).toBe('character_protagonist_01');
    expect(result.launchPack.kernel.characters.map(character => character.id)).toEqual([
      'character_protagonist_01',
      'character_opposition_01',
      'character_supporting_01',
    ]);
    const launchStatePrompt = provider.prompts.at(-1);
    expect(launchStatePrompt).toBeDefined();
    expect(launchStatePrompt).not.toContain('openingSample');
    expect(launchStatePrompt).not.toContain('selectedSimulation');
  });
});

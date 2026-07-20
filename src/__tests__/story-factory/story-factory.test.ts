import { z } from 'zod';
import {
  EditorAssessmentSchema,
  type ArcPlan,
  type ChapterPlan,
  type LaunchPack,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
  StoryFactoryError,
  FIRST_30_PORTFOLIO,
  applyChapterPlan,
  buildWriterBrief,
  runConceptLab,
  toGeminiResponseSchema,
  writeStoryChapter,
} from '@/services/story-factory';
import type { ProviderResult, StoryModelProvider } from '@/services/story-factory/provider';

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
    { id: 'main', name: 'Hải', aliases: ['anh Hải'], role: 'protagonist', agenda: 'Đưa gia đình thoát cảnh thiếu ăn bằng lao động có tính toán.', competence: 'Biết nghề biển, chế biến và thương lượng đầu ra.', constraint: 'Ký ức chỉ nắm xu hướng, không nhớ chính xác mọi ngày và mọi mức giá.', moralBoundary: 'Không tận diệt nguồn lợi hoặc lừa người cùng làng.', voice: { register: 'đời thường miền biển', sentenceRhythm: 'gọn khi làm việc, chậm khi nói với nhà', directness: 'direct', addressRules: 'xưng hô theo tuổi và quan hệ làng xóm', vocabulary: 'từ nghề biển Việt Nam dễ hiểu', stressResponse: 'quan sát rồi chia việc cụ thể', avoidances: 'không diễn thuyết hoặc nói như sách giáo khoa' } },
    { id: 'mother', name: 'Bà Lành', aliases: ['mẹ'], role: 'supporting', agenda: 'Giữ gia đình an toàn và không vay nợ liều lĩnh.', competence: 'Giỏi phơi sấy và quản lý bữa ăn.', constraint: 'Sợ rủi ro sau nhiều mùa biển thất bát.', moralBoundary: 'Không chiếm phần của người nghèo hơn.', voice: { register: 'mộc mạc', sentenceRhythm: 'ngắn và giàu hàm ý', directness: 'balanced', addressRules: 'gọi con theo tên', vocabulary: 'ngôn ngữ gia đình', stressResponse: 'hỏi kỹ số tiền và đường lui', avoidances: 'không khóc lóc kéo dài' } },
    { id: 'buyer', name: 'Tấn', aliases: ['chú Tấn'], role: 'opposition', agenda: 'Giữ nguồn hàng và biên lợi nhuận của mối thu mua.', competence: 'Nắm khách hàng chợ huyện và giá từng bến.', constraint: 'Không thể công khai ép giá khi có người mua cạnh tranh.', moralBoundary: 'Không dùng bạo lực.', voice: { register: 'thương hồ', sentenceRhythm: 'mềm nhưng luôn dò giá', directness: 'balanced', addressRules: 'xưng chú với người trẻ', vocabulary: 'giá, mẻ, mối và chuyến hàng', stressResponse: 'đưa điều kiện mới thay vì nổi nóng', avoidances: 'không tự thú âm mưu' } },
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
  promises: [{ id: 'promise_house', description: 'Sửa lại mái nhà trước mùa mưa.' }],
  pleasureLoop: { primary: 'Nhìn đúng cơ hội, lao động, bán được hàng rồi tái đầu tư.', comfort: 'Bữa cơm, căn nhà và sự yên lòng của người thân tốt lên.', setbackRecoveryChapters: 3 },
  endingDirection: { protagonistTerminalState: 'Có sinh kế bền vững và không còn phụ thuộc ký ức tương lai.', worldTerminalState: 'Làng biển có chuỗi khai thác và chế biến giữ được nguồn lợi.', promisesToResolve: ['promise_house'] },
};

const initialState: StoryState = {
  schemaVersion: 1,
  chapterNumber: 0,
  storyTimeMinutes: 0,
  facts: [{ id: 'fact_day', value: 'ngay_0' }],
  characters: [
    { characterId: 'main', locationId: 'home', knownFactIds: ['fact_day'], relationshipState: {} },
    { characterId: 'mother', locationId: 'home', knownFactIds: [], relationshipState: {} },
    { characterId: 'buyer', locationId: 'beach', knownFactIds: [], relationshipState: {} },
  ],
  resources: [{ resourceId: 'money', kind: 'numeric', value: 100 }],
  promises: [{ promiseId: 'promise_house', status: 'open' }],
  recentEvents: [],
};

const arc: ArcPlan = {
  schemaVersion: 1, arcNumber: 1, startChapter: 1, plannedEndChapter: 20,
  objective: 'Tạo được đầu ra đầu tiên và làm cho gia đình tin vào cách làm mới.',
  terminalChanges: ['Có khách hàng đầu tiên và một phần vốn quay vòng.'],
  activeConflicts: ['Thiếu vốn và hàng dễ hỏng.'],
  duePromiseIds: ['promise_house'],
  progression: ['Tiền mặt tăng rõ ràng', 'Dụng cụ được nâng cấp', 'Uy tín với đầu ra tăng'],
};

const routes: ModelRoutes = {
  setupGeneratorA: 'gen-a', setupGeneratorB: 'gen-b', setupJudge: 'judge',
  openingSimulator: 'sim', launchArchitect: 'launch', planner: 'planner', writer: 'writer', editor: 'editor', routeVersion: 'test-1',
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

const usage = { model: 'test', inputTokens: 1, outputTokens: 1, costUsd: 0, finishReason: 'STOP' };

class QueueProvider implements StoryModelProvider {
  calls: string[] = [];
  constructor(private readonly values: unknown[]) {}
  async text(): Promise<ProviderResult<string>> { throw new Error('unused'); }
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

  test('Writer context excludes research, ending contract and editor rubric', () => {
    const state = structuredClone(initialState);
    state.facts.push({ id: 'prior_decision', value: 'Người mua đã đồng ý giao dịch ở chương trước.' });
    const brief = JSON.stringify(buildWriterBrief({ kernel, state, plan: plan(1) }));
    expect(brief).not.toContain('endingDirection');
    expect(brief).not.toContain('research');
    expect(brief).not.toContain('rubric');
    expect(brief).not.toContain('promisesToResolve');
    expect(brief).toContain('prior_decision');
  });

  test('normal chapter uses two calls and has no word-count publication gate', async () => {
    const draft = { title: 'Mẻ hàng đầu tiên', content: 'Hải đặt rổ xuống giữa nhà. Anh không hứa suông mà chia việc, kiểm lại số tiền rồi cùng mẹ bắt tay làm ngay trong buổi sáng.' };
    const pass = { status: 'pass', issues: [], deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'chia việc' }] };
    const provider = new QueueProvider([draft, pass]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(provider.calls).toEqual(['writer', 'editor']);
    expect(result.decision).toBe('publish');
    expect(result.wordCount).toBeLessThan(100);
  });

  test('revision is a full draft and requires a fourth re-editor call', async () => {
    const first = { title: 'Bản đầu', content: 'Hải nhìn required delta trên chapter brief rồi bắt đầu làm việc trong căn nhà nhỏ.' };
    const firstPass = { status: 'pass', issues: [], deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'bắt đầu làm việc' }] };
    const revised = { title: 'Bắt tay vào việc', content: 'Hải trải tấm lưới lên hiên, chỉ cho mẹ phần rách cần vá rồi lấy đúng số tiền dành mua muối. Căn nhà lập tức có việc để làm.' };
    const finalPass = { status: 'pass', issues: [], deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: 'có việc để làm' }] };
    const provider = new QueueProvider([first, firstPass, revised, finalPass]);
    const result = await writeStoryChapter({ kernel, state: initialState, plan: plan(1), routes, provider });
    expect(provider.calls).toEqual(['writer', 'editor', 'writer', 'editor']);
    expect(result.revisionCount).toBe(1);
    expect(result.draft).toEqual(revised);
  });

  test('Editor pass cannot contain an issue or false delta', () => {
    expect(EditorAssessmentSchema.safeParse({ status: 'pass', issues: [{ category: 'causality' }], deltaChecks: [{ deltaId: 'delta_1', realized: true, evidence: '' }] }).success).toBe(false);
    expect(EditorAssessmentSchema.safeParse({ status: 'pass', issues: [], deltaChecks: [{ deltaId: 'delta_1', realized: false, evidence: '' }] }).success).toBe(false);
  });

  test('Gemini structured-output schema uses numeric exclusive bounds', () => {
    const schema = toGeminiResponseSchema(z.object({ arcNumber: z.number().int().positive() }).strict());
    expect((schema.properties as Record<string, Record<string, unknown>>).arcNumber.exclusiveMinimum).toBe(0);
  });

  test('state remains bounded across 1,200 transitions', () => {
    let state = structuredClone(initialState);
    for (let chapterNumber = 1; chapterNumber <= 1_200; chapterNumber += 1) {
      state = applyChapterPlan({ kernel, state, plan: plan(chapterNumber) }).state;
    }
    expect(state.chapterNumber).toBe(1_200);
    expect(state.recentEvents).toHaveLength(20);
    expect(state.facts).toHaveLength(1);
  });

  test('Concept Lab performs exactly five calls and validates the launch pack', async () => {
    const candidate = (id: string) => ({
      id, workingTitle: `Tên truyện trực diện ${id}`, premise: 'Một premise đủ dài để kiểm tra khả năng triển khai truyện nối tiếp.',
      protagonistContradiction: 'Muốn cứu gia đình nhưng không thể dựa mãi vào ký ức tương lai.',
      uniqueMechanism: 'Cơ chế nghề nghiệp tạo lợi thế nhưng có giới hạn vật chất rõ ràng.',
      rewardLoop: 'Phát hiện cơ hội, lao động, bán hàng rồi tái đầu tư cho gia đình.',
      conflictEconomy: 'Thời tiết, vốn và đầu ra phản ứng theo lợi ích thay vì phản diện ngu.',
      mechanismFingerprint: `mechanism-${id}`, rewardLoopFingerprint: `reward-${id}`, conflictEconomyFingerprint: `conflict-${id}`,
      seriality30: Array.from({ length: 6 }, (_, index) => `Biến thể nhân quả đủ dài số ${index + 1}`),
    });
    const a = Array.from({ length: 6 }, (_, index) => candidate(`a${index + 1}`));
    const b = Array.from({ length: 6 }, (_, index) => candidate(`b${index + 1}`));
    const selected = a[0];
    const pack: LaunchPack = {
      schemaVersion: 1, selectedConceptId: selected.id,
      kernel: { ...kernel, mechanismFingerprint: selected.mechanismFingerprint, rewardLoopFingerprint: selected.rewardLoopFingerprint, conflictEconomyFingerprint: selected.conflictEconomyFingerprint },
      arc, initialState,
      initialRollingPlan: { schemaVersion: 1, startChapter: 1, plans: [1, 2, 3, 4, 5].map(number => plan(number)) },
      coverPrompt: 'Một làng biển Việt Nam cuối thập niên tám mươi lúc bình minh, thuyền gỗ và sân phơi cá, không chữ.',
    };
    const simulations = [a[0], b[0]].map(item => ({ conceptId: item.id, chapter1: 'Mở đầu bằng một quyết định có hậu quả vật chất rõ ràng.', chapter2: 'Gia đình cùng lao động và gặp giới hạn đầu tiên của nghề.', chapter3: 'Mẻ hàng đầu tiên tạo lợi ích cụ thể và mở xung đột đầu ra.', serialStrength: 'Cơ chế có thể đổi sản phẩm, kỹ thuật, khách hàng và quy mô.', causalRisk: 'Ký ức tương lai cần giữ sai số và không biến thành toàn tri.' }));
    const provider = new QueueProvider([
      { candidates: a }, { candidates: b },
      { selectedIds: [a[0].id, b[0].id], reasons: ['Cơ chế A rõ và dài hơi.', 'Cơ chế B có conflict economy tốt.'] },
      { simulations }, pack,
    ]);
    const result = await runConceptLab({
      commission: { slotKey: 'canary-01', genreLane: 'do-thi-nien-dai', audience: 'Độc giả nam nhưng nữ cũng đọc được.', tone: 'Khoái hoạt, chủ động và đời sống ấm.', settingBoundary: 'Việt Nam hư cấu, nghề nghiệp dựa trên thực tế.' },
      research: { snapshotId: 'research-01', lane: 'do-thi-nien-dai', capturedAt: new Date().toISOString(), signals: [1, 2, 3].map(index => ({ id: `signal_${index}`, sourceUrl: `https://example.com/${index}`, observation: 'Một quan sát thị trường đủ chi tiết và không chứa tác phẩm để sao chép.' })) },
      routes, provider,
    });
    expect(provider.calls).toHaveLength(5);
    expect(result.launchPack.selectedConceptId).toBe('a1');
  });
});

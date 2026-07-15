import { readFileSync } from 'fs';
import path from 'path';
import {
  ArcPlanV2Schema,
  ChapterPlanV2Schema,
  StoryStateV2Schema,
  StorySpecV2Schema,
  assembleFlagshipContext,
  projectDirectorStoryKernel,
  buildDirectorPrompt,
  buildEditorPrompt,
  buildWriterPrompt,
  buildCharacterDesignPrompt,
  buildCausalWorldPrompt,
  buildConceptJudgePrompt,
  buildLaunchPackPrompt,
  buildOpeningSimulationPrompt,
  canPublishFlagshipChapter,
  classifyLegacyProject,
  computeFoundationScoreV2,
  evaluateFlagshipQuality,
  executeFlagshipPipeline,
  applyChapterStateDelta,
  getFlagshipPublicationPolicy,
  runConceptTournament,
  generateConceptTournamentV2,
  materializeFlagshipLaunchPackV2,
  FlagshipSetupBriefV2Schema,
  HumanConceptSelectionV2Schema,
  OpeningTrialTransportV2Schema,
  validateRollingPlanWindow,
  validatePleasureWindow,
  FlagshipModelRoutesV2Schema,
  scoreBlindBakeoff,
  validateChapterPlanSemantics,
  type ArcPlanV2,
  type ChapterPlanV2,
  type StoryStateV2,
  type StorySpecV2,
} from '@/services/story-engine/flagship';
import { classifyStoryFailure, isDailyQuotaDue } from '@/lib/story-production-quota';

const long = (value: string) => `${value} với tác nhân, nguồn lực, hậu quả và bằng chứng cụ thể trong thế giới truyện.`;

function spec(): StorySpecV2 {
  return StorySpecV2Schema.parse({
    schemaVersion: 2,
    pipelineVersion: 'flagship_v2',
    title: 'Tiếp Quản Kho Hàng Nhà Mình, Tôi Dùng Một Tuyến Xe Cứu Cả Phố Cũ',
    genre: 'do-thi',
    genreLane: 'urban_professional',
    serialityEngine: {
      recurringSituation: long('Bình nhận một nút thắt kho vận có chủ sở hữu, thời hạn và nghĩa vụ đã ký'),
      variationAxes: [long('Loại nguồn lực bị khóa thay đổi giữa tiền, xe và dữ liệu'), long('Người có quyền quyết định thay đổi theo hợp đồng và quan hệ'), long('Thành quả tạo một nghĩa vụ mới khác với giao dịch trước')],
      escalationVectors: [long('Quy mô đơn hàng tăng nhưng quyền kiểm soát phải được chia'), long('Dữ liệu tốt hơn làm đối tác phản ứng có chiến lược hơn'), long('Uy tín tích lũy khiến lựa chọn đạo đức có giá cao hơn')],
      depletionRisks: [long('Lặp cảnh kiểm sổ rồi tìm ra sai số đúng lúc'), long('Đối thủ tự phạm lỗi để Bình có cơ hội cứu kho'), long('Mọi tiến bộ bị quy đổi thành tiền mặt mà không đổi quan hệ')],
    },
    progressionCurrencies: [['tiền mặt', 'material'], ['quyền điều phối', 'institutional'], ['uy tín cộng tác', 'social']].map(([name, kind]) => ({
      name,
      kind,
      source: long(`${name} chỉ tăng từ giao dịch hoặc thỏa thuận được thực hiện`),
      spend: long(`${name} phải được đem cược hoặc chia sẻ để mở lựa chọn mới`),
      visibility: long(`${name} hiện ra qua tài sản, chữ ký hoặc cách người khác giao quyền`),
    })),
    storyIdentity: {
      uniqueMechanism: long('Mỗi quyết định truyện phải đối chiếu đồng thời sổ kho, dòng tiền và quyền giữ xe lạnh'),
      emotionalCore: long('Một người quen tự gánh học cách chia quyền mà không bỏ trách nhiệm với gia đình'),
      domainTruthSources: [
        long('Biên nhận nhập kho và tỷ lệ hao hụt theo ngày'),
        long('Hợp đồng vận tải lạnh và lịch xe có xác nhận'),
        long('Sao kê đặt cọc cùng điều khoản hoàn tiền'),
      ],
      forbiddenGenericMoves: [
        long('Không dựng đối thủ đứng nhìn hoặc ghi sổ để giả tạo căng thẳng'),
        long('Không cho khách sững sờ thay cho bằng chứng mua hàng'),
        long('Không xuất hiện hợp đồng hoặc nguồn lực không có nguồn'),
        long('Không giải quyết xung đột bằng người bí ẩn cứu miễn phí'),
        long('Không kết chương bằng tuyên ngôn ngày mai sẽ tốt hơn'),
      ],
      similarityRisks: [
        long('Dễ giống truyện hệ thống kinh doanh chỉ cộng điểm sau giao dịch'),
        long('Dễ giống mô-típ đối thủ chuỗi lớn theo dõi quán nhỏ'),
        long('Dễ biến nhân vật phụ thành khách hàng chỉ biết khen MC'),
      ],
    },
    pleasureProfile: {
      realityMode: 'fictionalized',
      advantage: long('Bình biết trước nhịp hao hụt và nhu cầu giao lạnh nhờ kinh nghiệm nghề nghiệp đã trả giá'),
      knowledgeLimit: long('Ký ức chỉ cho xu hướng và kỹ thuật, không cho con số chính xác hay cứu viện tự động'),
      primaryRewardLoop: [
        long('Phát hiện một lô hàng hoặc nhu cầu bị đánh giá sai'),
        long('Dùng tay nghề và số liệu để tạo phương án có thể kiểm chứng'),
        long('Thương lượng nghĩa vụ và tự trả chi phí thực hiện'),
        long('Thu lợi rồi biến lợi ích thành tài sản hoặc quan hệ bền hơn'),
      ],
      comfortLoop: [long('Bữa cơm gia đình đủ món sau một ngày lao động có kết quả'), long('Người nhà bớt một khoản lo và cùng sửa lại căn nhà cũ')],
      setbackRecoveryWindow: 2,
      faceSlapPolicy: long('Chỉ phản đòn người đã hành động vì lợi ích cụ thể; kết quả phải đến từ bằng chứng và năng lực'),
      progressionSignals: ['tiền mặt', 'dụng cụ', 'đầu ra', 'uy tín', 'bữa cơm gia đình'],
    },
    readerFantasy: long('Độc giả theo dõi một người chủ kho nhỏ thắng bằng số liệu và uy tín'),
    premise: long('Nguyễn An Bình cứu kho thực phẩm gia đình khỏi chuỗi phân phối lớn'),
    endingDirection: long('Anh xây được hợp tác xã do tiểu thương cùng sở hữu thay vì một đế chế cá nhân'),
    protagonist: {
      name: 'Nguyễn An Bình',
      publicIdentity: long('Chủ kho lạnh đời thứ hai đang gánh khoản vay của gia đình'),
      desire: long('Giữ kho và trả hết khoản vay mà không bán quyền kiểm soát'),
      fear: long('Sợ việc chia quyền sẽ khiến gia đình mất nốt tài sản cuối cùng'),
      contradiction: long('Muốn cộng tác nhưng luôn giữ số liệu và quyết định cho riêng mình'),
      misbelief: long('Tin rằng người chịu trách nhiệm cuối cùng phải là người biết và quyết mọi thứ'),
      competence: long('Đọc dòng tiền, thương lượng vận tải và hiểu hao hụt thực phẩm'),
      blindSpot: long('Đánh giá thấp lòng tự trọng và nhu cầu được tham gia của cộng sự'),
      privateAgenda: long('Âm thầm mua lại phần kho từng bị cha đem thế chấp mà không cho cộng sự biết'),
      leverage: long('Nắm sổ hao hụt ba năm và quan hệ trực tiếp với nhóm tiểu thương đầu mối'),
      moralBoundary: long('Không bán hàng không rõ nguồn và không đẩy thiệt hại sang người giao hàng yếu thế'),
      decisionSignature: long('Khi bị ép, Bình kiểm tra con số rồi nhận phần rủi ro lớn nhất về mình'),
      changeTrigger: long('Một cộng sự rời đi vì bị giấu thông tin buộc Bình phải học cách chia quyền'),
      voiceContract: long('Nói ngắn, dùng con số vừa đủ và chỉ đùa khi đã tìm ra phương án'),
    },
    cast: ['Lê Thu Hạnh', 'Trần Hải Nam', 'Phạm Gia Linh', 'Võ Hoàng Sơn'].map((name, index) => ({
      name,
      socialIdentity: long(`${name} có vị trí xã hội và nghĩa vụ nghề nghiệp riêng số ${index}`),
      agenda: long(`${name} muốn bảo vệ lợi ích nghề nghiệp riêng số ${index}`),
      leverage: long(`${name} nắm một nguồn hàng hoặc quan hệ mà Bình không thể tự thay thế`),
      conflictWithProtagonist: long(`${name} buộc Bình chia sẻ quyền quyết định và chi phí thật`),
      moralBoundary: long(`${name} không chấp nhận hy sinh người yếu thế để cứu giao dịch số ${index}`),
      decisionSignature: long(`${name} phản ứng bằng một kiểu lựa chọn nghề nghiệp đặc trưng số ${index}`),
      relationshipBehavior: long(`${name} nói và hành động khác với Bình khi có mặt đối tác hoặc gia đình`),
      voiceContract: long(`${name} có nhịp nói và vốn từ nghề nghiệp riêng, không nói thay tác giả`),
      firstAppearanceChapter: index + 1,
    })),
    causalWorldRules: Array.from({ length: 4 }, (_, index) => ({
      rule: long(`Quy tắc vận tải và thanh toán ${index}`),
      beneficiary: long(`Nhóm nắm giấy phép và lịch xe hưởng lợi từ quy tắc ${index}`),
      harmedParty: long(`Tiểu thương thiếu vốn chịu phí và thời gian chờ từ quy tắc ${index}`),
      enforcement: long(`Biên nhận, cổng kho và đơn vị vận tải cưỡng chế quy tắc ${index}`),
      cost: long(`Phá quy tắc ${index} làm mất tiền cọc, lịch xe hoặc uy tín có ghi nhận`),
      consequence: long(`Vi phạm quy tắc ${index} làm phát sinh chi phí hoặc mất quan hệ`),
      evidenceSource: long(`Hóa đơn, sổ kho hoặc hợp đồng xác nhận quy tắc ${index}`),
      exceptions: long(`Ngoại lệ quy tắc ${index} chỉ có khi một bên ký nhận thêm trách nhiệm`),
      sceneAffordances: [long(`Cảnh thương lượng quyền ưu tiên theo quy tắc ${index}`), long(`Cảnh kiểm chứng vi phạm bằng chứng từ số ${index}`)],
    })),
    resourceEconomy: ['tiền mặt', 'xe lạnh', 'uy tín'].map(resource => ({
      resource,
      source: long(`${resource} chỉ đến từ giao dịch hoặc cam kết được ghi nhận`),
      spendRule: long(`${resource} phải bị trừ khi nhân vật dùng để giải quyết vấn đề`),
      scarcity: long(`${resource} thiếu trong ba mươi chương đầu và tạo lựa chọn khó`),
    })),
    conflictLadder: ['1-10', '11-20', '21-30'].map((chapterRange, index) => ({
      chapterRange,
      actor: `Đối tác địa phương ${index}`,
      stake: long(`Quyền tiếp cận nguồn hàng và dòng tiền ở giai đoạn ${index}`),
      escalationCause: long(`Lựa chọn trước đó của Bình làm thay đổi lợi ích của actor ${index}`),
      resolutionChanges: long(`Kết quả giai đoạn ${index} thay đổi hợp đồng và quan hệ quyền lực`),
    })),
    promisePayoffLedger: Array.from({ length: 5 }, (_, index) => ({
      id: `promise_${index}`,
      promise: long(`Cam kết có nhân chứng và chi phí ${index}`),
      plantedByChapter: index + 1,
      payoffWindow: `${index + 5}-${index + 10}`,
      payoff: long(`Cam kết ${index} được trả bằng một thay đổi tài sản hoặc quan hệ riêng`),
    })),
    runway30: Array.from({ length: 5 }, (_, index) => ({
      chapterRange: `${index * 6 + 1}-${index * 6 + 6}`,
      irreversibleChange: long(`Kho lạnh mất hoặc giành quyền kiểm soát nguồn lực ${index}`),
      protagonistChoice: long(`Bình chọn đánh đổi lợi ích ${index} thay vì được cứu miễn phí`),
      payoff: long(`Lựa chọn ${index} tạo doanh thu, quan hệ hoặc thông tin mới khác nhau`),
    })),
    volumeSpine: ['Khóa sổ', 'Chia quyền', 'Hợp tác xã'].map((name, index) => ({
      name,
      direction: long(`Volume ${index} mở rộng quy mô bằng hậu quả từ volume trước`),
      terminalChange: long(`Volume ${index} kết thúc bằng thay đổi quyền sở hữu không thể đảo ngược`),
    })),
  });
}

function plan(): ChapterPlanV2 {
  return ChapterPlanV2Schema.parse({
    schemaVersion: 2,
    chapterNumber: 1,
    chapterPromise: long('Bình biến lô nguyên liệu sắp hỏng thành giao dịch có đặt cọc'),
    stateBefore: { cash: 'thiếu tiền mặt', transport: 'có một chuyến xe lạnh' },
    scenes: [0, 1].map(index => ({
      id: `scene_${index}`,
      pov: 'Nguyễn An Bình',
      desire: long(`Bình cần chốt đơn hàng có đặt cọc ở scene ${index}`),
      opposition: long(`Chi phí vận tải và thời hạn làm khách do dự ở scene ${index}`),
      tactic: long(`Bình dùng sổ kho và điều khoản hoàn tiền để thương lượng ở scene ${index}`),
      irreversibleChange: long(`Khách chuyển khoản và Bình nhận nghĩa vụ giao đúng giờ ${index}`),
      informationDelta: long(`Bình biết chuyến xe lạnh bị hủy và ai đang giữ xe ${index}`),
      cost: long(`Bình cam kết hoàn tiền gấp đôi nếu giao trễ ở scene ${index}`),
      payoff: long(`Hai khoản đặt cọc vào tài khoản và giải phóng lô hàng ${index}`),
      exitHook: long(`Bảy giờ Bình phải tới kho Hạnh tìm phương án giao hàng ${index}`),
    })),
    stateAfter: { cash: 'đã nhận hai khoản đặt cọc', transport: 'chuyến xe lạnh bị hủy' },
    promisesAdvanced: ['promise_0'],
    promisesPaid: [],
    nextChapterPressure: long('Bình phải tìm xe thay thế trước mười giờ hoặc hoàn tiền gấp đôi'),
    stateDelta: {
      facts: { transport: 'chuyến xe lạnh bị hủy sau khi khách đặt cọc' },
      cast: [],
      resources: [{ resource: 'tiền mặt', amountAfter: 'hai khoản đặt cọc', source: 'khách chuyển khoản theo biên nhận' }],
      promises: [{ id: 'promise_0', status: 'advanced', currentPressure: 'phải giao đúng giờ hoặc hoàn tiền gấp đôi' }],
    },
  });
}

function arc(): ArcPlanV2 {
  return ArcPlanV2Schema.parse({
    schemaVersion: 2,
    arcId: 'arc_1',
    startChapter: 1,
    endChapter: 20,
    direction: long('Bình cứu dòng tiền kho lạnh bằng các hợp đồng có nghĩa vụ thật'),
    terminalChange: long('Bình phải chia quyền đặt xe cho cộng sự sau một lần tự quyết thất bại'),
    activeConflicts: [{ actor: 'Lê Thu Hạnh', objective: long('giữ quyền điều phối xe lạnh'), leverage: long('nắm lịch xe và quan hệ tài xế'), nextMove: long('đòi quyền xem sổ đặt cọc trước khi cấp xe') }],
    duePromises: ['promise_0'],
    rollingBeats: [
      { chapterRange: '1-5', pressure: long('đơn hàng đầu tiên đặt kho vào nghĩa vụ giao đúng giờ'), causalChange: long('tiền đặt cọc làm tăng cả dòng tiền lẫn khoản phải trả') },
      { chapterRange: '6-10', pressure: long('lịch xe xung đột với lợi ích của cộng sự'), causalChange: long('Bình buộc phải chia dữ liệu để đổi lấy quyền vận chuyển') },
    ],
  });
}

function state(): StoryStateV2 {
  return StoryStateV2Schema.parse({
    schemaVersion: 2,
    chapterNumber: 0,
    facts: { cash: 'thiếu tiền mặt', transport: 'có một chuyến xe lạnh' },
    timeline: [],
    cast: [{ name: spec().protagonist.name }, ...spec().cast.map(item => ({ name: item.name }))].map(item => ({ name: item.name, status: 'alive', location: 'kho lạnh gia đình', knowledge: [], relationshipToProtagonist: item.name === spec().protagonist.name ? 'nhân vật chính tự chịu trách nhiệm cho lựa chọn' : 'đối tác chưa hoàn toàn tin Bình' })),
    resources: spec().resourceEconomy.map(item => ({ resource: item.resource, amount: 'mức khởi đầu khan hiếm', source: item.source, lastChangedChapter: 0 })),
    promises: spec().promisePayoffLedger.map(item => ({ id: item.id, status: 'open', currentPressure: item.promise })),
    recentSummary: '',
    previousEnding: '',
    retrievalNotes: [],
  });
}

describe('flagship v2 contracts and computed foundation', () => {
  it('accepts typed spec and semantic chapter plan', () => {
    const story = spec();
    const chapter = plan();
    expect(computeFoundationScoreV2(story).source).toBe('computed_v2');
    expect(computeFoundationScoreV2(story).passed).toBe(true);
    expect(validateChapterPlanSemantics(chapter)).toEqual([]);
  });

  it('requires fantasy progression outside raw power', () => {
    const fantasy = StorySpecV2Schema.parse({
      ...spec(),
      genre: 'huyen-huyen',
      genreLane: 'xuanhuan_rules',
      progressionCurrencies: spec().progressionCurrencies.map(currency => ({ ...currency, kind: 'power' })),
    });
    expect(computeFoundationScoreV2(fantasy).issues).toContain('fantasy kernel needs at least two non-power progression currencies');
    expect(computeFoundationScoreV2(fantasy).passed).toBe(false);
  });

  it('rejects a scene that changes nothing', () => {
    const chapter = plan();
    chapter.scenes[0].irreversibleChange = long('Không có gì thay đổi');
    expect(validateChapterPlanSemantics(chapter)[0].path).toBe('scenes.0');
  });

  it('allows concise causal actor labels without relaxing rule evidence', () => {
    const value = spec();
    value.causalWorldRules[0].beneficiary = 'thợ già';
    value.causalWorldRules[0].harmedParty = 'chủ lò';
    expect(StorySpecV2Schema.parse(value).causalWorldRules[0]).toMatchObject({ beneficiary: 'thợ già', harmedParty: 'chủ lò' });
    expect(computeFoundationScoreV2(value).dimensions.causal_world).toBeGreaterThanOrEqual(7);
  });
});

describe('flagship context and prompts', () => {
  it('keeps canon before plan and state under a hard budget', () => {
    const bundle = assembleFlagshipContext([
      { id: 'state', layer: 'state', priority: 10, content: 's'.repeat(12000) },
      { id: 'plan', layer: 'plan', priority: 10, content: 'p'.repeat(9000) },
      { id: 'canon', layer: 'canon', priority: 10, content: 'c'.repeat(9000) },
    ], { canon: 10_000, plan: 10_000, state: 10_000 });
    expect(bundle.text.indexOf('[CANON:canon]')).toBeLessThan(bundle.text.indexOf('[PLAN:plan]'));
    expect(bundle.totalChars).toBeLessThanOrEqual(30_000);
    expect(bundle.manifest.find(entry => entry.id === 'state')).toMatchObject({ truncated: true });
  });

  it('fails closed instead of borrowing a different artifact', () => {
    expect(() => assembleFlagshipContext([
      { id: 'story-specific-arc', layer: 'plan', priority: 10, content: '', required: true },
      { id: 'legacy-outline', layer: 'plan', priority: 1, content: 'legacy fallback content' },
    ])).toThrow('FLAGSHIP_CONTEXT_MISSING: story-specific-arc');
  });

  it('projects setup prose out of the Director kernel without truncating canon', () => {
    const story = spec();
    const kernel = projectDirectorStoryKernel(story);
    const serialized = JSON.stringify(kernel);
    expect(kernel).not.toHaveProperty('runway30');
    expect(kernel).not.toHaveProperty('conflictLadder');
    expect(kernel.storyIdentity).not.toHaveProperty('domainTruthSources');
    expect(kernel.protagonist).not.toHaveProperty('voiceContract');
    expect(kernel.cast[0]).not.toHaveProperty('voiceContract');
    expect(serialized.length).toBeLessThan(20_000);
    expect(() => assembleFlagshipContext([
      { id: 'story-kernel-v2', layer: 'canon', priority: 100, content: serialized, required: true },
    ])).not.toThrow();
  });

  it('keeps role prompts isolated', () => {
    const director = buildDirectorPrompt({ storySpec: spec(), arcPlan: arc(), storyState: state(), preparedPlan: plan() });
    const writer = buildWriterPrompt({ storySpec: spec(), chapterPlan: plan(), storyState: state(), targetWordCount: 2200 });
    const editor = buildEditorPrompt({ storySpec: spec(), chapterPlan: plan(), storyState: state(), title: 'Đặt cọc', content: 'Nguyễn An Bình '.repeat(100) });
    expect(director).not.toContain('PROSE=');
    expect(director).toContain('Sao chép byte-for-byte các trường identity đã khóa');
    expect(writer).not.toContain('hardGates');
    expect(writer).not.toContain('revisionInstructions');
    expect(writer).toContain('pleasureProfile');
    expect(writer).not.toContain('two-world-trade');
    expect(writer).not.toContain('heiress-counterplot');
    expect(editor).not.toContain('forbiddenGenericMoves');
    expect(editor).toContain('earned_pleasure');
  });
});

describe('golden corpus quality gate', () => {
  const corpus = JSON.parse(readFileSync(path.join(process.cwd(), 'docs/story-engine/golden-corpus/flagship-v2.json'), 'utf8')) as Array<{ id: string; expected: string; text: string }>;

  it('downgrades the legacy false positive with evidence', () => {
    const sample = corpus.find(item => item.id === 'quan-ca-phe-legacy-96')!;
    const content = sample.text.replace('Hồ Minh Quân', 'Nguyễn An Bình');
    const verdict = evaluateFlagshipQuality({
      content,
      storySpec: spec(),
      chapterPlan: plan(),
      planFidelityScore: 8,
      calibrated: { source: 'golden_corpus', confidence: 0.9, scores: { premise_interest: 5, character_voice: 4, scene_tension: 3, causal_surprise: 3, emotional_movement: 4, domain_truth: 2, prose_naturalness: 4, agency: 3, earned_pleasure: 2, recovery_pacing: 3, desire_to_read_next: 4 } },
      editorEvidence: [{ code: 'fake_watch', severity: 'major', message: 'Đối thủ chỉ đứng nhìn để giả tạo căng thẳng, không có hành động nhân quả.', start: content.indexOf('một người đàn ông'), end: content.indexOf('một người đàn ông') + 'một người đàn ông đứng đó'.length, excerpt: 'một người đàn ông đứng đó' }],
      hardGates: { canon: true, timeline: true, resourceCausality: true, characterKnowledge: true, authority: true, promptLeak: true, planFidelity: true },
    });
    expect(verdict.decision).toBe('revise');
    expect(verdict.axes.scene_tension).toBe(3);
    expect(verdict.evidence.map(item => item.code)).toContain('fake_watch');
  });

  it('rejects pipeline leakage', () => {
    const sample = corpus.find(item => item.id === 'pipeline-leak')!;
    const verdict = evaluateFlagshipQuality({ content: sample.text, storySpec: spec(), chapterPlan: plan() });
    expect(verdict.decision).toBe('reject');
    expect(verdict.hardGatePassed).toBe(false);
  });

  it('rejects missing story-specific calibration instead of assigning default scores', () => {
    const sample = corpus.find(item => item.id === 'causal-business-scene')!;
    const verdict = evaluateFlagshipQuality({ content: sample.text, storySpec: spec(), chapterPlan: plan() });
    expect(verdict.decision).toBe('reject');
    expect(verdict.axes.premise_interest).toBe(0);
    expect(verdict.evidence.map(item => item.code)).toContain('story_specific_calibration_missing');
  });

  it('covers the four pleasure-first failure modes in the golden corpus', () => {
    expect(corpus.map(item => item.id)).toEqual(expect.arrayContaining([
      'prolonged-suffering-chain',
      'stupid-opponent-face-slap',
      'unearned-infinite-resources',
      'cozy-diary-without-progression',
    ]));
  });
});

describe('flagship rollout policy', () => {
  const publishVerdict = { version: 2 as const, decision: 'publish' as const, confidence: 0.8, hardGatePassed: true, planFidelity: 9, axes: Object.fromEntries(['premise_interest','character_voice','scene_tension','causal_surprise','emotional_movement','domain_truth','prose_naturalness','agency','earned_pleasure','recovery_pacing','desire_to_read_next'].map(axis => [axis, 8])) as any, evidence: [], calibratedBy: 'human_blind_review' as const };

  it('never enables a soft gate', () => {
    expect(getFlagshipPublicationPolicy({ pipeline_version: 'flagship_v2' }).allowSoftGate).toBe(false);
  });

  it('requires the correct human checkpoint', () => {
    expect(canPublishFlagshipChapter({ verdict: publishVerdict, chapterNumber: 1, style: { pipeline_version: 'flagship_v2', publication_mode: 'human_gate', flagship_human_gate: 'story_spec' } }).allowed).toBe(true);
    expect(canPublishFlagshipChapter({ verdict: publishVerdict, chapterNumber: 4, style: { pipeline_version: 'flagship_v2', publication_mode: 'human_gate', flagship_human_gate: 'story_spec' } }).allowed).toBe(false);
  });

  it('allows explicitly opted-in autonomous factory projects without a chat checkpoint', () => {
    expect(canPublishFlagshipChapter({
      verdict: publishVerdict,
      chapterNumber: 1,
      style: { pipeline_version: 'flagship_v2', publication_mode: 'automatic', factory_enabled: true },
    }).allowed).toBe(true);
  });
});

describe('flagship migration contract', () => {
  it('creates missing telemetry tables with RLS and infra isolation', () => {
    const migration = readFileSync(path.join(process.cwd(), 'supabase/migrations/20260711014524_flagship_v2_quality_pipeline.sql'), 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_write_runs');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_write_checkpoints');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_cast_ledger');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_flagship_reviews');
    expect(migration).toContain("'infra_blocked'");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_resource_ledger');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_promise_ledger');
    expect(migration).toContain('commit_flagship_chapter_v2');
    expect(migration).toContain('SECURITY INVOKER');
    expect(migration).not.toContain('SECURITY DEFINER');
    expect(migration.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(6);
    expect(migration).toContain('REVOKE ALL ON public.story_write_runs');
  });
});

describe('clean flagship runtime boundary and call budget', () => {
  const axes = Object.fromEntries(['premise_interest','character_voice','scene_tension','causal_surprise','emotional_movement','domain_truth','prose_naturalness','agency','earned_pleasure','recovery_pacing','desire_to_read_next'].map(key => [key, 8.5]));
  const hardGates = { canon: true, timeline: true, resourceCausality: true, characterKnowledge: true, authority: true, promptLeak: true, planFidelity: true };
  const publishableContent = () => {
    const sceneText = plan().scenes.flatMap(scene => Object.values(scene)).join(' ');
    return `Nguyễn An Bình ${sceneText} `.repeat(8);
  };

  it('uses exactly Director, Writer, Editor when publishable', async () => {
    const calls: string[] = [];
    const output = await executeFlagshipPipeline({ storySpec: spec(), arcPlan: arc(), storyState: state(), preparedPlan: plan(), targetWordCount: 2200 }, {
      invoke: async call => {
        calls.push(call.role);
        if (call.role === 'director') return JSON.stringify(plan());
        if (call.role === 'writer') return JSON.stringify({ title: 'Hai khoản đặt cọc', content: publishableContent() });
        return JSON.stringify({ decision: 'publish', confidence: 0.8, planFidelity: 8.5, hardGates, axes, evidence: [], revisionInstructions: [] });
      },
    });
    expect(output.verdict.decision).toBe('publish');
    expect(calls).toEqual(['director', 'writer', 'editor']);
  });

  it('allows one evidence-scoped revision and never a fifth call', async () => {
    const calls: string[] = [];
    const bad = `${publishableContent()} CÂU LỖI CỤC BỘ`;
    const output = await executeFlagshipPipeline({ storySpec: spec(), arcPlan: arc(), storyState: state(), preparedPlan: plan(), targetWordCount: 2200 }, {
      invoke: async call => {
        calls.push(call.role);
        if (call.role === 'director') return JSON.stringify(plan());
        if (call.role === 'writer') return JSON.stringify({ title: 'Hai khoản đặt cọc', content: bad });
        if (call.role === 'editor') return JSON.stringify({ decision: 'revise', confidence: 0.8, planFidelity: 8.5, hardGates, axes, evidence: [{ code: 'local_phrase', severity: 'major', message: 'Câu cục bộ phá giọng.', start: bad.length - 17, end: bad.length, excerpt: 'CÂU LỖI CỤC BỘ' }], revisionInstructions: ['Bỏ câu cục bộ, giữ nguyên toàn bộ sự kiện.'] });
        return JSON.stringify({ title: 'Hai khoản đặt cọc', content: publishableContent() });
      },
    });
    expect(output.verdict.decision).toBe('publish');
    expect(calls).toEqual(['director', 'writer', 'editor', 'writer_revision']);
  });

  it('contains no imports from legacy writer, prompt, template, assembler or orchestrator', () => {
    const root = path.join(process.cwd(), 'src/services/story-engine/flagship');
    const files = require('fs').readdirSync(root).filter((name: string) => name.endsWith('.ts'));
    const source = files.map((name: string) => readFileSync(path.join(root, name), 'utf8')).join('\n');
    expect(source).not.toMatch(/chapter-writer|chapter-writer-prompts|templates|context\/assembler|pipeline\/orchestrator/);
  });

  it('dispatches flagship before the legacy writer branch', () => {
    const dispatch = readFileSync(path.join(process.cwd(), 'src/services/story-engine/dispatch.ts'), 'utf8');
    expect(dispatch.indexOf("style?.pipeline_version === 'flagship_v2'")).toBeLessThan(dispatch.indexOf('return writeLegacyChapter(options)'));
    expect(dispatch).toContain('return writeFlagshipChapter(options)');
  });

  it('commits prepared state deltas without a model-generated memory pass', () => {
    const next = applyChapterStateDelta({ state: state(), plan: plan(), title: 'Hai khoản đặt cọc', content: publishableContent() });
    expect(next.chapterNumber).toBe(1);
    expect(next.resources.find(item => item.resource === 'tiền mặt')?.amount).toBe('hai khoản đặt cọc');
    expect(next.promises.find(item => item.id === 'promise_0')?.status).toBe('advanced');
  });

  it('fails closed when any story-specific artifact is missing', () => {
    expect(ArcPlanV2Schema.safeParse(undefined).success).toBe(false);
    expect(StoryStateV2Schema.safeParse(undefined).success).toBe(false);
    expect(ChapterPlanV2Schema.safeParse(undefined).success).toBe(false);
    expect(StorySpecV2Schema.safeParse(undefined).success).toBe(false);
  });
});

describe('tournament, blind bakeoff, legacy and infra isolation', () => {
  it('removes near-duplicate concepts and keeps three ranked finalists', () => {
    const candidates = [
      { id: 'c0', premise: long('Kho lạnh thực phẩm cứu tiểu thương khỏi hàng hỏng'), protagonistEngine: long('Chủ kho đọc hao hụt và lịch xe'), conflictEngine: long('Tranh quyền đặt xe lạnh với chuỗi bán lẻ'), domain: 'cold-chain', judgeScores: [8, 8] },
      { id: 'c1', premise: long('Xưởng gốm gia đình bán thiết kế theo đơn quốc tế'), protagonistEngine: long('Thợ gốm hiểu men và hợp đồng xuất khẩu'), conflictEngine: long('Đối tác giữ khuôn mẫu và quyền phân phối'), domain: 'ceramics', judgeScores: [8.3, 8.1] },
      { id: 'c2', premise: long('Hợp tác xã sửa xe điện xây mạng pin đổi nhanh'), protagonistEngine: long('Kỹ thuật viên tối ưu vòng đời pin'), conflictEngine: long('Nhà cung cấp khóa firmware và linh kiện'), domain: 'electric-mobility', judgeScores: [8.5, 8.2] },
      { id: 'c3', premise: long('Phòng khám thú y cứu dòng tiền bằng dịch vụ tận nhà'), protagonistEngine: long('Bác sĩ thú y phân loại ca và tuyến đường'), conflictEngine: long('Chuỗi phòng khám độc quyền thuốc hiếm'), domain: 'veterinary', judgeScores: [8.1, 8] },
      { id: 'c4', premise: long('Kho lạnh thực phẩm cứu tiểu thương khỏi hàng hỏng'), protagonistEngine: long('Chủ kho đọc hao hụt và lịch xe'), conflictEngine: long('Tranh quyền đặt xe lạnh với chuỗi bán lẻ'), domain: 'cold-chain', judgeScores: [9, 9] },
    ];
    const result = runConceptTournament(candidates, 3, 5);
    expect(result.finalists).toHaveLength(3);
    expect(result.rejectedAsNearDuplicates).toContain('c4');
  });

  it('requires at least 65 percent across ten blind ballots', () => {
    const ballots = Array.from({ length: 10 }, (_, index) => ({ briefId: `b${index}`, reviewerId: `r${index}`, preferredAnonymousId: index < 7 ? 'A' : 'B' }));
    expect(scoreBlindBakeoff(ballots, ['A', 'B']).passed65PercentGate).toBe(true);
  });

  it('classifies billing as infrastructure without making quota due', () => {
    expect(classifyStoryFailure('DeepSeek 402: Insufficient Balance')).toBe('infrastructure');
    expect(isDailyQuotaDue({ status: 'infra_blocked', written_chapters: 0, target_chapters: 5 })).toBe(false);
  });

  it('keeps legacy classification read-only and conservative', () => {
    expect(classifyLegacyProject({ currentChapter: 17, recentPassRate: 0.4, averageQualityScore: 62, criticalContinuityCount: 0, setupV2Ready: false }).disposition).toBe('rewrite_from_ch1');
  });
});

describe('isolated flagship setup v2', () => {
  const brief = FlagshipSetupBriefV2Schema.parse({
    schemaVersion: 2,
    language: 'vi',
    portfolioSlotId: 'DT-08',
    genreLane: 'urban_professional',
    laneCardIds: ['market_urban_professional'],
    distinctnessFingerprint: 'native|operations|cash+access|contract|fictionalized',
    researchQuestions: [long('Ai thực sự nắm quyền điều xe và bằng chứng nào xác nhận quyền đó'), long('Dòng tiền và hao hụt thay đổi ra sao sau từng quyết định vận hành'), long('Nghĩa vụ mới nào phát sinh khi nhân vật thắng một giao dịch')],
    promotionCohort: 'lab_reference',
    genre: 'do-thi',
    audience: long('Độc giả Việt trưởng thành thích quyết định kinh doanh có hậu quả'),
    desiredExperience: long('Căng thẳng đến từ thương lượng, dòng tiền và lòng tin thay đổi'),
    domain: long('Chuỗi lạnh thực phẩm, kho vận và hợp tác xã tiểu thương tại Việt Nam'),
    pleasureProfile: spec().pleasureProfile,
    boundaries: [long('Không có hệ thống cộng điểm'), long('Không có cứu viện bí ẩn'), long('Không biến đối thủ thành bia mặt')],
    researchNotes: [0, 1, 2].map(index => ({ source: long(`Chứng từ và phỏng vấn nguồn độc lập số ${index}`), finding: long(`Quy trình ngành nghề tạo chi phí kiểm chứng số ${index}`) })),
    seedConstraints: [],
  });

  const concepts = Array.from({ length: 20 }, (_, index) => {
    const marker = Array.from({ length: 15 }, (_, tokenIndex) => `mechanism${String.fromCharCode(97 + index)}${String.fromCharCode(97 + tokenIndex)}`).join(' ');
    return {
      id: `concept_c${index}`,
      workingTitle: index === 0 ? 'Sổ Nợ Phố Cũ' : `Tựa truyện ${index}`,
      readerCuriosity: `${marker} khiến độc giả muốn biết giao dịch cụ thể sẽ đảo chiều ra sao`,
      readerFantasy: index === 0 ? spec().readerFantasy : `${marker} cho độc giả trải nghiệm năng lực nghề nghiệp có giới hạn và hậu quả`,
      premise: index === 0 ? spec().premise : `${marker} buộc một người lao động chọn giữa tài sản, quan hệ và nghĩa vụ đã ký`,
      irreversibleProblem: `${marker} tạo một nghĩa vụ không thể xóa bằng lời xin lỗi hoặc may mắn`,
      protagonistContradiction: `${marker} vừa cần người khác vừa sợ trao cho họ quyền quyết định`,
      domainMechanism: `${marker} vận hành bằng chứng từ, lịch giao nhận và quyền kiểm soát hữu hạn`,
      conflictEngine: `${marker} biến lựa chọn trước thành đòn bẩy thực tế của người khác`,
      emotionalCore: `${marker} thử thách khả năng tin người khi trách nhiệm không thể chia đều`,
      differenceClaim: `${marker} khác ở cơ chế nhân quả chứ không phải tên nghề hoặc trope`,
      nearestComparisonRisk: `${marker} có nguy cơ bị viết thành truyện kinh doanh cộng điểm nếu làm hời hợt`,
      serialityProof: index === 0 ? spec().serialityEngine.recurringSituation : `${marker} sinh ba mươi chương bằng cách đổi quyền kiểm soát, nghĩa vụ và phản ứng của đối tác`,
      openingAdvantage: `${marker} được kích hoạt ngay chương đầu bằng một lựa chọn nghề nghiệp có giới hạn`,
      progressionProof: `${marker} làm thay đổi tiền, quyền truy cập và quan hệ theo dấu hiệu nhìn thấy được`,
      worldProof: {
        signatureSituations: index === 0 ? spec().serialityEngine.variationAxes : [0, 1, 2].map(situation => `${marker} tạo tình huống độc quyền số ${situation} từ kho lạnh, quyền điều xe và hao hụt`),
        institutionalReaction: `${marker} khiến chủ kho, tài xế và hợp tác xã phản ứng theo quyền lợi có bằng chứng`,
        resourceCirculation: `${marker} theo tiền cọc, lịch xe và hàng lạnh từ nguồn tới người chịu hao hụt`,
        thirtyChapterMutation: `${marker} làm dữ liệu cũ mất giá khi đối tác học và quyền điều phối được chia lại`,
      },
      antiCloneFingerprint: `native|reward-${index}|cash-access-${index}|contract-${index}|fictionalized`,
    };
  });

  const openingFor = (candidateId: string) => ({
    schemaVersion: 2 as const,
    candidateId,
    chapters: [1, 2, 3].map(chapterNumber => ({
      chapterNumber,
      title: `Giao dịch ${chapterNumber}`,
      prose: `Nhân vật lựa chọn và trả giá bằng chứng từ trong cảnh ${chapterNumber}. `.repeat(30),
      causalStateChange: long(`Giao dịch chương ${chapterNumber} đổi quyền kiểm soát và nghĩa vụ giao hàng`),
      requiredPlanAnchor: long(`Mỏ neo opening chương ${chapterNumber} phải được giữ nguyên trong kế hoạch`),
      protagonistChoice: long(`Nhân vật chọn nhận nghĩa vụ thay vì chờ một cứu viện ở chương ${chapterNumber}`),
      agencyMove: long(`Nhân vật chủ động dùng lợi thế nghề nghiệp để đổi tình thế ở chương ${chapterNumber}`),
      earnedReward: long(`Thành quả chương ${chapterNumber} đến từ lao động và thương lượng có bằng chứng`),
      materialProgression: long(`Tiền mặt hoặc dụng cụ của gia đình tăng lên cụ thể ở chương ${chapterNumber}`),
      comfortPayoff: long(`Bữa cơm gia đình bớt thiếu thốn nhờ thành quả ở chương ${chapterNumber}`),
      costPaid: long(`Nhân vật mất tiền, thời gian hoặc lòng tin đã ghi nhận ở chương ${chapterNumber}`),
      exitPressure: long(`Hậu quả chương ${chapterNumber} đặt ra hạn chót cụ thể cho chương tiếp theo`),
    })),
    continuityDigest: long('Ba chương nối nhau bằng nghĩa vụ, dòng tiền và quyền đặt xe thay đổi'),
    unresolvedPressure: long('Kho phải giao đúng giờ trong khi quyền điều phối xe đang thuộc về cộng sự'),
  });

  const kernelFor = (candidateId: string) => {
    const candidate = concepts.find(item => item.id === candidateId)!;
    const story = spec();
    return {
      candidateId,
      signatureSituations: candidate.worldProof.signatureSituations,
      rules: story.causalWorldRules.slice(0, 3),
      resources: story.resourceEconomy.slice(0, 2),
      institutionalResponses: [0, 1].map(index => ({
        name: `Tổ chức ${index}`,
        power: long(`Tổ chức ${index} kiểm soát giấy phép hoặc lịch vận chuyển`),
        incentive: long(`Tổ chức ${index} kiếm lợi từ việc giữ kỷ luật giao nhận`),
        enforcementEvidence: long(`Hợp đồng và nhật ký cổng kho chứng minh quyền số ${index}`),
        pressureOnCast: long(`Quyền số ${index} buộc cast lựa chọn giữa tiền và quan hệ`),
      })),
      thirtyChapterMutation: candidate.worldProof.thirtyChapterMutation,
    };
  };

  const openingTransportFor = (candidateId: string) => {
    const opening = openingFor(candidateId);
    return {
      ...opening,
      chapters: opening.chapters.map(({ prose: _prose, ...chapter }) => ({
        ...chapter,
        proseParagraphs: Array.from({ length: 10 }, (_, index) => long(`Đoạn ${index} cho thấy nhân vật hành động, trả giá và nhận thành quả cụ thể trong cảnh`)),
      })),
    };
  };

  it('accepts short dialogue paragraphs while enforcing total chapter substance', () => {
    const transport = openingTransportFor('concept_c0');
    transport.chapters[0].proseParagraphs[0] = '— Ừ.';
    expect(OpeningTrialTransportV2Schema.parse(transport).chapters[0].proseParagraphs[0]).toBe('— Ừ.');
  });

  it('allows payoff to land within the opening window but requires it by chapter three', () => {
    const transport: any = openingTransportFor('concept_c0');
    transport.chapters[0].earnedReward = null;
    transport.chapters[0].materialProgression = null;
    transport.chapters[0].comfortPayoff = null;
    expect(OpeningTrialTransportV2Schema.parse(transport).chapters[0].earnedReward).toBeNull();
    transport.chapters[2].materialProgression = null;
    expect(OpeningTrialTransportV2Schema.safeParse(transport).success).toBe(false);
  });

  it('keeps required plan anchors short enough to copy verbatim', () => {
    const transport = openingTransportFor('concept_c0');
    transport.chapters[0].requiredPlanAnchor = 'mua lõi cảm âm mới';
    expect(OpeningTrialTransportV2Schema.parse(transport).chapters[0].requiredPlanAnchor).toBe('mua lõi cảm âm mới');
  });

  it('runs 20 concepts, independent pairwise ranking and three openings in five calls', async () => {
    const ranking = {
      schemaVersion: 2,
      matches: Array.from({ length: 17 }, (_, offset) => { const index = offset + 3; const winner = index % 3; return { leftId: `concept_c${winner}`, rightId: `concept_c${index}`, winnerId: `concept_c${winner}`, reason: long(`Concept ${winner} sinh lựa chọn và hậu quả cụ thể hơn đối thủ ${index}`) }; }),
      ranking: Array.from({ length: 20 }, (_, index) => ({ id: `concept_c${index}`, wins: index < 3 ? 6 : 0, reason: long(`Concept ${index} được xếp theo cơ chế cảnh và xung đột quan hệ cụ thể`) })),
      finalistIds: ['concept_c0', 'concept_c1', 'concept_c2'],
      finalistWorldKernels: ['concept_c0', 'concept_c1', 'concept_c2'].map(kernelFor),
    };
    const responseSchemas: Record<string, unknown>[] = [];
    const result = await generateConceptTournamentV2(brief, { invoke: async call => {
      responseSchemas.push(call.responseJsonSchema);
      if (call.role === 'concept_lab') return JSON.stringify({ schemaVersion: 2, candidates: concepts });
      if (call.role === 'concept_judge') return JSON.stringify(ranking);
      return JSON.stringify(openingTransportFor(call.candidateId!));
    } });
    expect(result.callRoles).toEqual(['concept_lab', 'concept_judge', 'opening_simulator', 'opening_simulator', 'opening_simulator']);
    expect(responseSchemas).toHaveLength(5);
    expect(responseSchemas.every(schema => schema.type === 'object')).toBe(true);
    expect(JSON.stringify(responseSchemas)).not.toContain('"const"');
    expect(JSON.stringify(responseSchemas)).not.toContain('"minLength"');
    expect(JSON.stringify(responseSchemas)).not.toContain('"pattern"');
    expect(JSON.stringify(responseSchemas)).not.toContain('"minItems"');
    expect(JSON.stringify(responseSchemas)).not.toContain('"maxItems"');
    expect(result.artifact.openings).toHaveLength(3);
    expect(result.artifact.status).toBe('awaiting_human_selection');
    const openingPrompt = buildOpeningSimulationPrompt(brief, concepts[0], kernelFor('concept_c0'));
    expect(openingPrompt).toContain('APPROVED_WORLD_KERNEL');
    expect(openingPrompt).toContain('không được bỏ dấu đóng root');
    const judgePrompt = buildConceptJudgePrompt(brief, concepts);
    expect(judgePrompt).toContain('REQUIRED_RANKING_COUNT=20');
    expect(judgePrompt).toContain('REQUIRED_CANDIDATE_IDS_EXACT');
    expect(judgePrompt).toContain('không được chỉ ghi tên địa điểm');
    expect(judgePrompt).toContain('không được ghi "không có ngoại lệ"');
    expect(judgePrompt).toContain('nêu cả nguồn gốc lẫn ai hoặc bằng cách nào');
    expect(judgePrompt).toContain('theo đúng thứ tự và byte-for-byte');
    expect(judgePrompt).toContain('không được chỉ ghi tên/tiêu đề luật');
    expect(judgePrompt).toContain('2-5 sceneAffordances khác nhau');
  });

  it('materializes only a human-selected finalist and preserves immutable artifacts', async () => {
    const selected = concepts[0];
    const opening = openingFor(selected.id);
    const tournament = {
      schemaVersion: 2 as const,
      promptVersion: 'test',
      benchmarkId: null,
      concepts,
      rejectedNearDuplicateIds: [],
      ranking: {
        schemaVersion: 2 as const,
        matches: Array.from({ length: 17 }, (_, offset) => { const index = offset + 3; const winner = index % 3; return { leftId: `concept_c${winner}`, rightId: `concept_c${index}`, winnerId: `concept_c${winner}`, reason: long(`Concept ${winner} thắng concept ${index} bằng nhân quả cụ thể`) }; }),
        ranking: Array.from({ length: 20 }, (_, index) => ({ id: `concept_c${index}`, wins: index < 3 ? 6 : 0, reason: long(`Concept ${index} được xếp theo khả năng tạo lựa chọn khó`) })),
        finalistIds: ['concept_c0', 'concept_c1', 'concept_c2'],
        finalistWorldKernels: ['concept_c0', 'concept_c1', 'concept_c2'].map(kernelFor),
      },
      openings: [opening, openingFor('concept_c1'), openingFor('concept_c2')],
      status: 'awaiting_human_selection' as const,
    };
    expect(() => HumanConceptSelectionV2Schema.parse({ schemaVersion: 2, candidateId: selected.id, approvedTitle: 'Sổ Nợ Phố Cũ', approvedBy: 'human-reviewer', rationale: long('Tên ngắn không nói premise'), approvedAt: new Date().toISOString() })).toThrow();
    const selection = HumanConceptSelectionV2Schema.parse({ schemaVersion: 2, candidateId: selected.id, approvedTitle: spec().title, approvedBy: 'human-reviewer', rationale: long('Opening tạo áp lực nhân quả rõ nhất trong blind review và tên nói thẳng cơ chế'), approvedAt: new Date().toISOString() });
    const story = spec();
    const characters = { schemaVersion: 2, protagonist: story.protagonist, cast: story.cast, relationshipConflicts: story.cast.slice(0, 3).map(member => ({ left: story.protagonist.name, right: member.name, incompatibleNeeds: long('Hai bên cần quyền quyết định khác nhau trong cùng một giao dịch'), mutualDependence: long('Hai bên giữ nguồn lực mà người kia không thể tự thay thế'), likelyBreakingPoint: long('Một bên giấu dữ liệu khi nghĩa vụ đến hạn thanh toán') })) };
    const world = { schemaVersion: 2, rules: story.causalWorldRules, resources: story.resourceEconomy, institutions: [0, 1].map(index => ({ name: `Tổ chức ${index}`, power: long(`Tổ chức ${index} kiểm soát giấy phép hoặc lịch vận chuyển`), incentive: long(`Tổ chức ${index} kiếm lợi từ việc giữ kỷ luật giao nhận`), enforcementEvidence: long(`Hợp đồng và nhật ký cổng kho chứng minh quyền số ${index}`), pressureOnCast: long(`Quyền số ${index} buộc cast lựa chọn giữa tiền và quan hệ`) })), knowledgeDistribution: [story.protagonist, ...story.cast.slice(0, 2)].map(member => ({ holder: member.name, knows: long(`${member.name} biết một phần giao dịch có bằng chứng riêng`), doesNotKnow: long(`${member.name} chưa biết agenda và giới hạn của người còn lại`) })) };
    let before = { marker: 'state-0' };
    const plans = [1, 2, 3, 4, 5].map(chapterNumber => {
      const next = { marker: `state-${chapterNumber}` };
      const value = { ...plan(), chapterNumber, chapterPromise: chapterNumber <= 3 ? opening.chapters[chapterNumber - 1].requiredPlanAnchor : long(`Kế hoạch chương ${chapterNumber} tiếp tục hậu quả từ cửa sổ trước`), stateBefore: before, stateAfter: next, scenes: plan().scenes.map((scene, index) => ({ ...scene, id: `scene_${chapterNumber}_${index}`, payoff: chapterNumber === 5 && index === 1 ? long('Bữa cơm gia đình đủ món và người nhà cùng sửa lại căn nhà cũ') : scene.payoff })) };
      before = next;
      return value;
    });
    const launchPack = { schemaVersion: 2, selectedConceptId: selected.id, storySpec: story, arcPlan: arc(), storyState: state(), rollingChapterPlans: plans, status: 'awaiting_story_spec_approval' };
    const result = await materializeFlagshipLaunchPackV2({ brief, tournament, selection }, { invoke: async call => {
      if (call.role === 'character_designer') return JSON.stringify(characters);
      if (call.role === 'causal_world') return JSON.stringify(world);
      return JSON.stringify(launchPack);
    } });
    expect(result.callRoles).toEqual(['character_designer', 'causal_world', 'launch_architect']);
    expect(result.foundationScore.passed).toBe(true);
    expect(result.launchPack.storySpec.title).toBe(selection.approvedTitle);
    expect(result.launchPack.storySpec.title).not.toBe(selected.workingTitle);
    expect(result.launchPack.storySpec.premise).toBe(selected.premise);
    expect(() => validateRollingPlanWindow({ schemaVersion: 2, startChapter: 1, endChapter: 5, plans }, story.pleasureProfile)).not.toThrow();
    expect(validatePleasureWindow(plans, story.pleasureProfile)).toEqual([]);

    const rewrittenWorld = {
      ...world,
      rules: world.rules.map((rule, index) => index === 0 ? { ...rule, rule: long('Luật đã bị Causal World tự ý viết lại sau blind review') } : rule),
    };
    await expect(materializeFlagshipLaunchPackV2({ brief, tournament, selection }, { invoke: async call => {
      if (call.role === 'character_designer') return JSON.stringify(characters);
      if (call.role === 'causal_world') return JSON.stringify(rewrittenWorld);
      return JSON.stringify(launchPack);
    } })).rejects.toMatchObject({ code: 'setup_blocked' });
  });

  it('gives every materialization role an exact JSON contract', () => {
    const selected = concepts[0];
    const opening = openingFor(selected.id);
    const story = spec();
    const characters = { schemaVersion: 2 as const, protagonist: story.protagonist, cast: story.cast, relationshipConflicts: story.cast.slice(0, 3).map(member => ({ left: story.protagonist.name, right: member.name, incompatibleNeeds: long('Hai bên cần quyền quyết định khác nhau trong cùng một giao dịch'), mutualDependence: long('Hai bên giữ nguồn lực mà người kia không thể tự thay thế'), likelyBreakingPoint: long('Một bên giấu dữ liệu khi nghĩa vụ đến hạn thanh toán') })) };
    const world = { schemaVersion: 2 as const, rules: story.causalWorldRules, resources: story.resourceEconomy, institutions: [0, 1].map(index => ({ name: `Tổ chức ${index}`, power: long(`Tổ chức ${index} kiểm soát giấy phép hoặc lịch vận chuyển`), incentive: long(`Tổ chức ${index} kiếm lợi từ việc giữ kỷ luật giao nhận`), enforcementEvidence: long(`Hợp đồng và nhật ký cổng kho chứng minh quyền số ${index}`), pressureOnCast: long(`Quyền số ${index} buộc cast lựa chọn giữa tiền và quan hệ`) })), knowledgeDistribution: [story.protagonist, ...story.cast.slice(0, 2)].map(member => ({ holder: member.name, knows: long(`${member.name} biết một phần giao dịch có bằng chứng riêng`), doesNotKnow: long(`${member.name} chưa biết agenda và giới hạn của người còn lại`) })) };
    const selection = { schemaVersion: 2 as const, candidateId: selected.id, approvedTitle: story.title, approvedBy: 'human-reviewer', rationale: long('Opening tạo nhịp thưởng và nhân quả rõ nhất'), approvedAt: new Date().toISOString() };
    expect(buildCharacterDesignPrompt(brief, selected, opening)).toContain('OUTPUT_CONTRACT_EXACT=');
    const causalPrompt = buildCausalWorldPrompt(brief, selected, opening, characters, kernelFor(selected.id));
    expect(causalPrompt).toContain('APPROVED_WORLD_KERNEL=');
    expect(causalPrompt).toContain('source, spendRule và scarcity');
    const launchPrompt = buildLaunchPackPrompt({ brief, selection, candidate: selected, opening, characters, world });
    expect(launchPrompt).toContain('OUTPUT_CONTRACT_EXACT=');
    expect(launchPrompt).toContain('HUMAN_SELECTION.approvedTitle');
    expect(launchPrompt).toContain('chapterPromise và nextChapterPressure');
    expect(launchPrompt).toContain('nếu anchor ngắn hơn 20 ký tự');
    expect(launchPrompt).toContain('copy byte-for-byte, kể cả hoa thường và dấu');
    expect(launchPrompt).toContain('pleasureProfile');
  });

  it('keeps setup storage and cron isolated from legacy fallback', () => {
    const migration = readFileSync(path.join(process.cwd(), 'supabase/migrations/20260711044323_flagship_setup_v2.sql'), 'utf8');
    const cron = readFileSync(path.join(process.cwd(), 'src/app/api/cron/write-chapters/route.ts'), 'utf8');
    const runtime = readFileSync(path.join(process.cwd(), 'src/services/story-engine/flagship/runtime.ts'), 'utf8');
    const factorySetup = readFileSync(path.join(process.cwd(), 'src/services/story-engine/flagship/factory-setup.ts'), 'utf8');
    expect(FlagshipSetupBriefV2Schema.safeParse({ schemaVersion: 2, language: 'vi', genre: 'do-thi' }).success).toBe(false);
    expect(FlagshipModelRoutesV2Schema.safeParse({ setupCreative: 'model-a', setupJudge: 'model-b', director: 'model-a', writer: 'model-a', editor: 'model-a', planner: 'model-a' }).success).toBe(false);
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_flagship_setup_runs');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('install_flagship_setup_brief_v2');
    expect(migration).toContain('save_flagship_concept_tournament_v2');
    expect(migration).toContain('commit_flagship_launch_pack_v2');
    expect(migration).toContain('commit_flagship_rolling_window_v2');
    expect(migration).toContain('SECURITY INVOKER');
    expect(migration).not.toContain('SECURITY DEFINER');
    expect(cron).toContain('flagship_v2 setup is manual-only and never enters legacy setup-pipeline');
    expect(runtime).toContain("project.status !== 'paused'");
    expect(runtime).toContain('callFlagshipModel');
    expect(runtime).not.toContain('callGemini(');
    expect(factorySetup).toContain("novels!ai_story_projects_novel_id_fkey(title)");
    expect(factorySetup).toContain('approvedTitle,');
    expect(factorySetup).not.toContain('approvedTitle: candidate.workingTitle');
    const pilotMigration = readFileSync(path.join(process.cwd(), 'supabase/migrations/20260711052533_flagship_pilot_factory_v2.sql'), 'utf8');
    expect(pilotMigration).toContain('create_flagship_pilot_v2');
    expect(pilotMigration).toContain("'paused'");
    expect(pilotMigration).toContain('SECURITY INVOKER');
    expect(pilotMigration).not.toContain('SECURITY DEFINER');
    const rejectionMigration = readFileSync(path.join(process.cwd(), 'supabase/migrations/20260712100925_add_flagship_rejected_status.sql'), 'utf8');
    expect(rejectionMigration).toContain("'rejected'");
    expect(rejectionMigration).toContain('reject_flagship_pilot_v2');
    expect(rejectionMigration).toContain('flagship-setup-v2.1-pleasure');
    expect(rejectionMigration).toContain('SECURITY INVOKER');
    expect(rejectionMigration).not.toContain('SECURITY DEFINER');
  });

  it('validates the coastal-era pilot brief and keeps market cards upstream-only', () => {
    const blueprintRoot = path.join(process.cwd(), 'blueprints/flagship-coastal-era-pilot');
    const coastalBrief = FlagshipSetupBriefV2Schema.parse(JSON.parse(readFileSync(path.join(blueprintRoot, 'setup-brief-v2.json'), 'utf8')));
    const marketCards = JSON.parse(readFileSync(path.join(blueprintRoot, 'market-cards-v2.json'), 'utf8'));
    expect(coastalBrief.pleasureProfile.realityMode).toBe('fictionalized');
    expect(coastalBrief.pleasureProfile.setbackRecoveryWindow).toBe(2);
    expect(coastalBrief.seedConstraints.join(' ')).toContain('đúng 20 concept');
    expect(marketCards).toMatchObject({ usage: 'upstream_concept_lab_only', mustNeverReachWriter: true });
    expect(buildWriterPrompt({ storySpec: spec(), chapterPlan: plan(), storyState: state(), targetWordCount: 2200 })).not.toContain('coastal-era-rebirth');
  });
});

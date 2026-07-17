import {
  ArcPlanV3Schema,
  ChapterPlanV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
  RollingPlanWindowDraftV3Schema,
  MarketResearchSnapshotV3Schema,
  buildV3RoleContexts,
  executeFlagshipV3Pipeline,
  runConceptTournamentV3,
  BlindCalibrationCorpusV3Schema,
  computeCalibrationMetricsV3,
  assessOpeningFinalistV3,
  applyChapterStateV3,
  runV3ProsePreflight,
  validateV3Artifacts,
  assessEndingReadinessV3,
  assertFlagshipReleaseV3,
  getFlagshipReleaseManifestV3,
  retainStoryFactsV3,
  type ChapterPlanV3,
  type StoryKernelV3,
  type StoryStateV3,
} from '@/services/story-engine/flagship-v3';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { toGeminiResponseJsonSchema } from '@/services/story-engine/flagship/setup-response-schemas';

const detailed = (value: string) => `${value} với nguyên nhân, giới hạn và hậu quả cụ thể trong thế giới truyện.`;
const prose = (marker: string, bad = '') => `${marker} ${bad} ${'Sơn làm việc bằng đôi tay chai sần, kiểm tra từng thay đổi rồi mới gọi người nhà đến chứng kiến kết quả. '.repeat(18)}`.trim();

function kernel(): StoryKernelV3 {
  return StoryKernelV3Schema.parse({
    schemaVersion: 3,
    pipelineVersion: 'flagship_v3',
    title: 'Trọng Sinh Về Làng Biển, Tôi Biến Cá Rẻ Thành Cơ Nghiệp Cả Nhà',
    genre: 'do-thi-nien-dai',
    concept: {
      signature: detailed('Người làm nghề biển dùng ký ức xu hướng và kỹ thuật bảo quản'),
      uniqueMechanism: detailed('Mỗi vòng thưởng biến hàng bị ép giá thành sản phẩm có đầu ra thật'),
      readerFantasy: detailed('Độc giả thấy gia đình khá lên nhờ năng lực và lao động có kiểm chứng'),
      recurringSituation: detailed('Sơn phát hiện một chênh lệch nghề biển rồi tự trả chi phí khai thác'),
      variationAxes: [detailed('Mùa vụ'), detailed('Bảo quản'), detailed('Đầu ra')],
      antiCloneFingerprint: ['không hệ thống phát tiền', 'không xã hội đen cứu viện', 'không cả làng cùng ngu'],
    },
    pleasure: {
      primaryRewardLoop: [detailed('Phát hiện hàng bị định giá sai'), detailed('Dùng kỹ thuật xử lý'), detailed('Bán qua đầu ra có thật')],
      comfortLoop: [detailed('Bữa cơm gia đình đủ món'), detailed('Sửa lại mái nhà bị dột')],
      setbackRecoveryWindow: 2,
      progressionSignals: ['tiền mặt', 'dụng cụ', 'đầu ra'],
    },
    protagonistId: 'nguyen_hai_son',
    characters: [
      ['nguyen_hai_son', 'Nguyễn Hải Sơn', 'protagonist'],
      ['ba_son', 'Ông Hải', 'cast'],
      ['me_son', 'Bà Lan', 'cast'],
      ['bay_thu_mua', 'Gã Bảy', 'cast'],
    ].map(([id, name, role]) => ({
      id,
      name,
      aliases: name === 'Nguyễn Hải Sơn' ? ['Sơn', 'Hải Sơn'] : [],
      role,
      publicIdentity: detailed(`${name} có vị trí riêng trong làng biển`),
      agenda: detailed(`${name} bảo vệ lợi ích và trách nhiệm riêng`),
      competence: detailed(`${name} có tay nghề và giới hạn riêng`),
      constraint: detailed(`${name} không thể tự giải quyết mọi vấn đề`),
      moralBoundary: detailed(`${name} không hại người yếu thế để kiếm lời`),
      decisionSignature: detailed(`${name} ra quyết định theo lợi ích cụ thể`),
      voice: {
        summary: detailed(`${name} nói tự nhiên theo tuổi và nghề`),
        positiveExamples: [`${name} hỏi thẳng giá và điều kiện.`, `${name} chỉ nói sau khi kiểm tra.`],
        forbiddenPatterns: ['không đọc diễn văn thay tác giả', 'không kinh ngạc vô cớ'],
      },
    })),
    worldClaims: Array.from({ length: 4 }, (_, index) => ({
      id: `claim_${index}`,
      claim: detailed(`Quy tắc nghề biển số ${index}`),
      sourceRef: `research_source_${index}`,
      enforcement: detailed(`Người mua và thời tiết cưỡng chế quy tắc ${index}`),
      exceptions: detailed(`Ngoại lệ ${index} cần người chịu thêm chi phí`),
    })),
    resources: [
      {
        id: 'cash',
        name: 'Tiền mặt',
        mode: 'numeric',
        unit: 'dong',
        sourceRules: ['Chỉ tăng từ giao dịch có người trả tiền'],
        spendRules: ['Mọi khoản mua dụng cụ phải bị trừ'],
        referenceScale: ['100 đồng mua được 2 ký muối sạch tại mốc đầu truyện'],
        minimumValue: 0,
        maximumValue: 1000000000,
        scarcity: detailed('Gia đình thiếu vốn trong giai đoạn đầu'),
      },
      {
        id: 'salt',
        name: 'Muối sạch',
        mode: 'numeric',
        unit: 'kg',
        sourceRules: ['Chỉ có từ số muối đã rửa và để ráo'],
        spendRules: ['Ướp cá phải trừ đúng khối lượng'],
        referenceScale: ['2 ký muối đủ ướp một mẻ cá thử quy mô gia đình'],
        minimumValue: 0,
        maximumValue: 10000,
        scarcity: detailed('Muối sạch chưa có nguồn ổn định'),
      },
      {
        id: 'buyer_access',
        name: 'Đầu ra',
        mode: 'state',
        unit: null,
        sourceRules: ['Chỉ đổi khi một người mua cam kết'],
        spendRules: ['Uy tín bị giảm nếu giao sai chất lượng'],
        referenceScale: null,
        minimumValue: null,
        maximumValue: null,
        scarcity: detailed('Gia đình chưa có khách hàng trực tiếp'),
      },
    ],
    promises: Array.from({ length: 4 }, (_, index) => ({
      id: `promise_${index}`,
      description: detailed(`Lời hứa nghề nghiệp số ${index}`),
      payoffCondition: detailed(`Lời hứa ${index} chỉ đóng khi có thay đổi vật chất`),
    })),
    endingContract: {
      emotionalState: detailed('Sơn biết chia quyền và trách nhiệm cho gia đình'),
      materialState: detailed('Gia đình có cơ nghiệp biển bền vững'),
      worldState: detailed('Làng có đầu ra không phá kiệt nguồn lợi'),
      promisesThatMustClose: ['promise_0'],
      targetChapterRange: { min: 800, forecast: 900, max: 1200 },
    },
  });
}

function state(): StoryStateV3 {
  return StoryStateV3Schema.parse({
    schemaVersion: 3,
    chapterNumber: 0,
    facts: [{ id: 'weather', value: 'mưa sẽ đến trước bình minh', sourceChapter: 0 }],
    timeline: [],
    characters: kernel().characters.map(character => ({
      characterId: character.id,
      status: 'alive',
      locationId: 'san_nha',
      knowledge: [],
      relationshipState: detailed(`${character.name} đang thăm dò lựa chọn của Sơn`),
    })),
    resources: [
      { resourceId: 'cash', value: { mode: 'numeric', amount: 100, unit: 'dong' }, source: 'tiền nhà còn lại', lastChangedChapter: 0 },
      { resourceId: 'salt', value: { mode: 'numeric', amount: 3, unit: 'kg' }, source: 'muối đã rửa', lastChangedChapter: 0 },
      { resourceId: 'buyer_access', value: { mode: 'state', value: 'chưa có khách trực tiếp' }, source: 'trạng thái khởi đầu', lastChangedChapter: 0 },
    ],
    promises: kernel().promises.map(item => ({ promiseId: item.id, status: 'open', pressure: item.description })),
    recentSummary: '',
    previousEnding: '',
    retrievalNotes: [],
  });
}

function plan(): ChapterPlanV3 {
  return ChapterPlanV3Schema.parse({
    schemaVersion: 3,
    chapterNumber: 1,
    elapsedMinutesSincePreviousChapter: 0,
    chapterPromise: detailed('Sơn dùng mẻ muối sạch để giữ được lô cá đầu tiên'),
    preconditions: [{ factId: 'weather', expectedValue: 'mưa sẽ đến trước bình minh' }],
    scenes: [
      {
        id: 'scene_1_a',
        povCharacterId: 'nguyen_hai_son',
        participantIds: ['nguyen_hai_son', 'ba_son'],
        locationId: 'san_nha',
        durationMinutes: 30,
        travelMinutesFromPrevious: 0,
        desire: detailed('Sơn cần thuyết phục cha cho dùng số muối sạch còn lại'),
        opposition: detailed('Cha sợ mất toàn bộ muối nếu dự báo mưa của Sơn sai'),
        tactic: detailed('Sơn chỉ ra dấu gió và tự nhận trách nhiệm trả lại số muối'),
        cost: detailed('Sơn đặt toàn bộ tiền riêng làm cam kết với cha'),
        payoff: detailed('Cha đồng ý giao ba ký muối cho Sơn'),
        irreversibleChange: detailed('Sơn nhận trách nhiệm vật chất đầu tiên với gia đình'),
        informationDelta: detailed('Cha biết Sơn đọc được dấu thời tiết ngoài khơi'),
        hookIntent: 'choice_forced',
        unresolvedQuestion: detailed('Sơn phải chọn lượng muối đủ giữ cá mà không làm hàng quá mặn'),
        requiredDeltaIds: ['cash_spent'],
      },
      {
        id: 'scene_1_b',
        povCharacterId: 'nguyen_hai_son',
        participantIds: ['nguyen_hai_son', 'me_son'],
        locationId: 'san_nha',
        durationMinutes: 45,
        travelMinutesFromPrevious: 5,
        desire: detailed('Sơn cần ướp xong lô cá trước khi mưa tràn vào sân'),
        opposition: detailed('Mái che dột và thời gian chỉ còn chưa đầy một giờ'),
        tactic: detailed('Sơn chia cá thành lớp mỏng và dùng đúng hai ký muối'),
        cost: detailed('Gia đình chỉ còn lại một ký muối sạch sau mẻ thử'),
        payoff: detailed('Lô cá giữ được độ dẻo qua trận mưa đầu tiên'),
        irreversibleChange: detailed('Gia đình có bằng chứng đầu tiên rằng cách của Sơn hiệu quả'),
        informationDelta: detailed('Mẹ Sơn học được tỷ lệ muối cho mẻ cá nhỏ'),
        hookIntent: 'threat_arrives',
        unresolvedQuestion: detailed('Gã thu mua sẽ trả giá thế nào khi thấy mẻ cá không bị nhũn'),
        requiredDeltaIds: ['salt_spent', 'mother_learns', 'promise_advanced'],
      },
    ],
    requiredDeltas: [
      { id: 'cash_spent', kind: 'resource_numeric', resourceId: 'cash', before: 100, delta: -20, after: 80, unit: 'dong', source: 'tiền riêng của Sơn', sink: 'cam kết với cha', evidenceRequired: true },
      { id: 'salt_spent', kind: 'resource_numeric', resourceId: 'salt', before: 3, delta: -2, after: 1, unit: 'kg', source: 'muối sạch đã rửa', sink: 'ướp lô cá', evidenceRequired: true },
      { id: 'mother_learns', kind: 'character_knowledge', characterId: 'me_son', factId: 'weather', learnedFrom: 'Sơn giải thích dấu gió trong lúc ướp cá', evidenceRequired: true },
      { id: 'promise_advanced', kind: 'promise', promiseId: 'promise_0', statusAfter: 'advanced', pressureAfter: detailed('Phải bán được mẻ cá giữ chất lượng'), evidenceRequired: true },
    ],
    nextChapterPressure: detailed('Gã Bảy đến ép giá trước khi Sơn tìm được người mua trực tiếp'),
  });
}

const arc = ArcPlanV3Schema.parse({
  schemaVersion: 3,
  arcId: 'arc_1',
  startChapter: 1,
  endChapter: 20,
  direction: detailed('Sơn chứng minh kỹ thuật bảo quản rồi tìm đầu ra trực tiếp'),
  terminalChange: detailed('Gia đình có khách hàng đầu tiên và tự quyết giá bán'),
  activeConflicts: [{
    id: 'conflict_1',
    actorIds: ['nguyen_hai_son', 'bay_thu_mua'],
    objective: detailed('Hai bên tranh quyền định giá mẻ cá'),
    leverage: detailed('Gã Bảy nắm đầu ra còn Sơn nắm chất lượng hàng'),
    nextMove: detailed('Gã Bảy đến sớm để ép bán trước khi có lựa chọn khác'),
  }],
  duePromiseIds: ['promise_0'],
  progressionBudget: [
    { signal: 'tiền mặt', requiredChange: detailed('Gia đình nhận tiền từ mẻ cá đầu') },
    { signal: 'đầu ra', requiredChange: detailed('Sơn tìm được một khách mua không qua Gã Bảy') },
  ],
});

const axes = Object.fromEntries([
  'premise_interest', 'character_voice', 'scene_tension', 'causal_surprise',
  'emotional_movement', 'domain_truth', 'prose_naturalness', 'agency',
  'earned_pleasure', 'recovery_pacing', 'desire_to_read_next',
].map(key => [key, key === 'desire_to_read_next' ? 8.4 : 8.1]));
const hardGates = {
  canon: true,
  timeline: true,
  resourceCausality: true,
  characterKnowledge: true,
  authority: true,
  promptLeak: true,
  planFidelity: true,
};
const deltaEvidence = (_content: string) => plan().requiredDeltas.map(delta => ({ deltaId: delta.id, spanId: 'span_001' }));

describe('flagship v3 core engine', () => {
  it('keeps arithmetic-derived absolute scene time out of the Planner model contract', () => {
    const schema = JSON.stringify(toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema));
    expect(schema).toContain('elapsedMinutesSincePreviousChapter');
    expect(schema).not.toContain('startMinute');
    expect(schema).not.toContain('valueBefore');
    expect(schema).not.toContain('"before"');
    expect(schema).not.toContain('"unit"');
  });

  it('requires an explicit scale anchor for every numeric story resource', () => {
    const invalid = {
      ...kernel(),
      resources: kernel().resources.map(resource => resource.id === 'cash' ? { ...resource, referenceScale: null } : resource),
    };
    expect(StoryKernelV3Schema.safeParse(invalid).success).toBe(false);
  });

  it('blocks stale or arithmetically invalid plans before any model call', () => {
    const invalid = {
      ...plan(),
      requiredDeltas: plan().requiredDeltas.map(delta =>
        delta.id === 'salt_spent' && delta.kind === 'resource_numeric' ? { ...delta, after: 3 } : delta),
    };
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'resource_arithmetic' })]),
    );
  });

  it('blocks a numeric resource spend below its story-specific lower bound', () => {
    const invalid = {
      ...plan(),
      requiredDeltas: plan().requiredDeltas.map(delta =>
        delta.id === 'salt_spent' && delta.kind === 'resource_numeric'
          ? { ...delta, delta: -4, after: -1 }
          : delta),
    };
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'resource_below_minimum' })]),
    );
  });

  it('detects CJK and verbatim plan prose without a model critic', () => {
    const content = `${plan().scenes[0].desire} kim loại拼凑 lại.`;
    expect(runV3ProsePreflight(content, plan()).map(item => item.code)).toEqual(
      expect.arrayContaining(['foreign_cjk_text', 'plan_verbatim_leak']),
    );
  });

  it('grounds accidental Thai-script contamination before the Editor call', () => {
    const content = 'Cô nói rất khẽ, môiแทบไม่ mấp máy rồi lập tức im lặng.';
    expect(runV3ProsePreflight(content, plan())).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'foreign_script_text', excerpt: 'แทบไม่' }),
    ]));
  });

  it('publishes with exactly Writer and Editor calls', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    expect(contexts.used().map(context => context.role)).toEqual(['writer', 'editor']);
    const content = prose('Sơn đặt hai mươi đồng xuống phản gỗ rồi dùng hai ký muối cho mẻ cá.');
    const calls: string[] = [];
    const result = await executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => {
        calls.push(call.role);
        if (call.role === 'writer') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content });
        return JSON.stringify({
          decision: 'publish', confidence: 0.85, planFidelity: 8.8, hardGates, axes,
          evidence: [], revisionInstructions: [], realizedDeltaEvidence: deltaEvidence(content),
        });
      },
    });
    expect(calls).toEqual(['writer', 'editor']);
    expect(contexts.used().map(context => context.role)).toEqual(['writer', 'editor']);
    expect(result.verdict.decision).toBe('publish');
  });

  it('requires Writer revision and an independent Re-editor before publish', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const bad = prose('Sơn đặt tiền rồi ướp cá.', 'CÂU CỤC BỘ SAI.');
    const fixed = prose('Sơn đặt tiền rồi ướp cá.');
    const calls: string[] = [];
    const result = await executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => {
        calls.push(call.role);
        if (call.role === 'writer') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content: bad });
        if (call.role === 'writer_revision') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content: fixed });
        if (call.role === 'editor') {
          return JSON.stringify({
            decision: 'revise', confidence: 0.84, planFidelity: 8.6, hardGates, axes,
            evidence: [{ code: 'local_prose', severity: 'moderate', message: 'Câu cục bộ phá giọng.', spanId: 'span_001', local: true }],
            revisionInstructions: ['Bỏ câu cục bộ, giữ nguyên sự kiện.'],
            realizedDeltaEvidence: deltaEvidence(bad),
          });
        }
        return JSON.stringify({
          decision: 'publish', confidence: 0.86, planFidelity: 8.8, hardGates, axes,
          evidence: [], revisionInstructions: [], realizedDeltaEvidence: deltaEvidence(fixed),
        });
      },
    });
    expect(calls).toEqual(['writer', 'editor', 'writer_revision', 'editor_recheck']);
    expect(contexts.used().map(context => context.role)).toEqual(['writer', 'editor', 'revision']);
    expect(result.revisionLineage).toHaveLength(1);
  });

  it('lets deterministic preflight own evidence without forcing the Editor to duplicate it', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const contaminated = prose('Sơn đặt hai mươi đồng xuống phản gỗ rồi dùng hai ký muối cho mẻ cá.', 'ký tự收lỗi');
    const fixed = prose('Sơn đặt hai mươi đồng xuống phản gỗ rồi dùng hai ký muối cho mẻ cá.');
    const result = await executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => {
        if (call.role === 'writer') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content: contaminated });
        if (call.role === 'writer_revision') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content: fixed });
        if (call.role === 'editor') {
          return JSON.stringify({
            decision: 'revise', confidence: 0.9, planFidelity: 9, hardGates,
            axes: { ...axes, prose_naturalness: 6 }, evidence: [],
            revisionInstructions: ['Xóa ký tự ngoại lai đã được deterministic preflight định vị.'],
            realizedDeltaEvidence: deltaEvidence(contaminated),
          });
        }
        return JSON.stringify({
          decision: 'publish', confidence: 0.9, planFidelity: 9, hardGates, axes,
          evidence: [], revisionInstructions: [], realizedDeltaEvidence: deltaEvidence(fixed),
        });
      },
    });
    expect(result.callRoles).toEqual(['writer', 'editor', 'writer_revision', 'editor_recheck']);
    expect(result.verdict.decision).toBe('publish');
  });

  it('rejects an editor instruction that tries to mutate immutable story state', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const bad = prose('Sơn đặt tiền rồi ướp cá.', 'CÂU CỤC BỘ SAI.');
    await expect(executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => {
        if (call.role === 'writer') return JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content: bad });
        return JSON.stringify({
          decision: 'revise', confidence: 0.84, planFidelity: 8.6, hardGates, axes,
          evidence: [{ code: 'local_prose', severity: 'moderate', message: 'Câu cục bộ phá giọng.', spanId: 'span_001', local: true }],
          revisionInstructions: ['Giữ nguyên câu này và cập nhật state tracking ở chương sau.'],
          realizedDeltaEvidence: deltaEvidence(bad),
        });
      },
    })).rejects.toThrow('mutating immutable story artifacts');
  });

  it('treats a below-threshold weighted mean without evidence as an Editor contract failure', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const content = prose('Sơn trả đủ chi phí rồi mới nhận kết quả của mẻ cá.');
    const weakAxes = Object.fromEntries(Object.keys(axes).map(key => [key, 7.4])) as typeof axes;
    weakAxes.character_voice = 7.5;
    weakAxes.domain_truth = 7.5;
    weakAxes.prose_naturalness = 7.5;
    weakAxes.desire_to_read_next = 8;
    await expect(executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, { invoke: async call => call.role === 'writer'
      ? JSON.stringify({ title: 'Mẻ Cá Qua Mưa', content })
      : JSON.stringify({ decision: 'publish', confidence: 0.9, planFidelity: 8.5, hardGates, axes: weakAxes, evidence: [], revisionInstructions: [], realizedDeltaEvidence: deltaEvidence(content) })
    })).rejects.toThrow('without grounded evidence');
  });

  it('pins invariant facts when the bounded state snapshot is compacted', () => {
    const facts = [
      { id: 'world_rule', value: detailed('Quy tắc nền không được quên'), sourceChapter: 0, scope: 'invariant' as const, status: 'active' as const },
      ...Array.from({ length: 120 }, (_, index) => ({ id: `local_${index}`, value: detailed(`Fact cục bộ ${index}`), sourceChapter: index + 1, scope: 'local' as const, status: 'active' as const })),
    ];
    const retained = retainStoryFactsV3(facts);
    expect(retained).toHaveLength(100);
    expect(retained.some(fact => fact.id === 'world_rule')).toBe(true);
    expect(retained.some(fact => fact.id === 'local_119')).toBe(true);
  });

  it('requires paid ending promises and minimum length before a finale can complete', () => {
    const base = state();
    expect(assessEndingReadinessV3(kernel(), base).deterministicReady).toBe(false);
    const ready = StoryStateV3Schema.parse({
      ...base,
      chapterNumber: 800,
      promises: base.promises.map(item => item.promiseId === 'promise_0' ? { ...item, status: 'paid' as const } : item),
    });
    expect(assessEndingReadinessV3(kernel(), ready)).toMatchObject({ deterministicReady: true, unpaidPromiseIds: [] });
    expect(ArcPlanV3Schema.safeParse({ ...arc, arcMode: 'finale', startChapter: 801, endChapter: 810, arcId: 'finale_1' }).success).toBe(true);
  });

  it('invalidates staged work when any engine release component drifts', () => {
    const release = getFlagshipReleaseManifestV3();
    expect(assertFlagshipReleaseV3(release)).toEqual(release);
    expect(() => assertFlagshipReleaseV3({ ...release, qualityVersion: `${release.qualityVersion}-drift` })).toThrow('RELEASE_MISMATCH');
  });

  it('does not require the protagonist full name to appear in prose', () => {
    const evidence = runV3ProsePreflight(prose('Sơn kéo tấm bạt qua mẻ cá.'), plan());
    expect(evidence.some(item => item.code === 'protagonist_absent')).toBe(false);
  });

  it('classifies unavailable provider models as infrastructure, never quality', () => {
    expect(classifyStoryFailure('Gemini 404: model gemini-3-pro-preview is no longer available.')).toBe('infrastructure');
    expect(classifyStoryFailure('OpenAI model route not found')).toBe('infrastructure');
  });

  it('creates a new bounded fact and lets a character learn it in the same chapter', () => {
    const base = plan();
    const factDelta = {
      id: 'new_market_fact',
      kind: 'fact' as const,
      factId: 'buyer_price_known',
      valueBefore: null,
      valueAfter: 'Người mua trực tiếp trả giá cao hơn khi cá được giữ lạnh đúng cách.',
      evidenceRequired: true as const,
    };
    const knowledgeDelta = {
      id: 'main_learns_price',
      kind: 'character_knowledge' as const,
      characterId: 'nguyen_hai_son',
      factId: 'buyer_price_known',
      learnedFrom: 'Sơn nghe người mua báo giá và tự đối chiếu tiền nhận được.',
      evidenceRequired: true as const,
    };
    const nextPlan = ChapterPlanV3Schema.parse({
      ...base,
      scenes: base.scenes.map((scene, index) => index === 0
        ? { ...scene, requiredDeltaIds: [...scene.requiredDeltaIds, factDelta.id, knowledgeDelta.id] }
        : scene),
      requiredDeltas: [...base.requiredDeltas, factDelta, knowledgeDelta],
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: nextPlan })).toHaveLength(0);
    const next = applyChapterStateV3({
      state: state(),
      plan: nextPlan,
      title: 'Giá Mua Trực Tiếp',
      content: 'Sơn nhận báo giá và ghi lại bằng chứng giao dịch.',
      realizedDeltaIds: nextPlan.requiredDeltas.map(delta => delta.id),
    });
    expect(next.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'buyer_price_known', sourceChapter: 1 }),
    ]));
    expect(next.characters.find(item => item.characterId === 'nguyen_hai_son')?.knowledge).toEqual(
      expect.arrayContaining([expect.objectContaining({ factId: 'buyer_price_known' })]),
    );
  });
});

describe('flagship v3 concept factory', () => {
  it('blocks a finalist when any blind opening judge reports a critical failure', () => {
    const candidateId = 'candidate_critical';
    const reviews = Array.from({ length: 3 }, (_, index) => ({
      schemaVersion: 3 as const,
      judgeId: `judge_${index}`,
      ranking: [candidateId, 'candidate_b', 'candidate_c'],
      scores: [candidateId, 'candidate_b', 'candidate_c'].map(id => ({
        candidateId: id,
        openingPull: 8,
        worldSpecificity: 8,
        protagonistAgency: 8,
        causalReward: 8,
        characterLife: 8,
        seriality30: 8,
        proseNaturalness: 8,
        readChapter4: 8,
        criticalFails: index === 1 && id === candidateId ? ['Tài nguyên xuất hiện không có nguồn.'] : [],
        evidence: [
          { chapterNumber: 1, excerpt: 'Main chủ động kiểm tra vật chứng.', reason: 'Agency có hành động.' },
          { chapterNumber: 3, excerpt: 'Giao dịch tạo thay đổi vật chất.', reason: 'Payoff có nguồn.' },
        ],
      })),
    }));
    expect(assessOpeningFinalistV3(reviews, candidateId).viable).toBe(false);
  });

  it('uses two generators, complete pairwise judging and three blind opening reviews', async () => {
    const snapshot = MarketResearchSnapshotV3Schema.parse({
      schemaVersion: 3,
      snapshotId: 'urban_2026_07',
      genreLane: 'urban_professional',
      refreshedAt: new Date().toISOString(),
      commission: {
        slotId: 'dt_11',
        audience: detailed('Độc giả nam Việt thích nghề nghiệp và thương lượng bằng kiến thức thật'),
        desiredExperience: detailed('Mỗi chiến thắng đổi vị thế bằng bằng chứng, tay nghề và chi phí có nguồn'),
        domainOpportunity: detailed('Một thị trường đồ cũ hư cấu với provenance, phục hồi và người mua có agenda'),
        requiredMechanisms: [
          detailed('Kiểm chứng vật liệu bằng nhiều nguồn độc lập'),
          detailed('Uy tín mở cơ hội nhưng đồng thời tạo nghĩa vụ nghề nghiệp'),
        ],
        openingRequirements: [
          detailed('Main chủ động từ chối lợi nhanh thiếu provenance trong chương một'),
          detailed('Chậm nhất chương ba có giao dịch nhỏ và quan hệ mới có nguồn'),
        ],
        serialityRequirements: [
          detailed('Ba mươi chương phải biến hóa giữa nguồn hàng, phục hồi và thương lượng'),
          detailed('Mỗi thắng lợi phải làm thị trường và đối thủ điều chỉnh hợp lý'),
        ],
        boundaries: ['không mắt thần báo giá', 'không món nào cũng là bảo vật', 'không đối thủ ngu để bị vả mặt'],
      },
      sources: Array.from({ length: 3 }, (_, index) => ({
        id: `source_${index}`,
        url: `https://example.com/source-${index}`,
        title: `Nguồn nghiên cứu thị trường số ${index}`,
        publisher: `Publisher ${index}`,
        observedAt: new Date().toISOString(),
      })),
      signals: Array.from({ length: 3 }, (_, index) => ({
        id: `signal_${index}`,
        claim: detailed(`Tín hiệu thị trường số ${index} chỉ dùng ở Concept Lab`),
        sourceIds: [`source_${index}`],
        confidence: 0.8,
      })),
      prohibitedDirectImitation: ['không sao chép tên truyện', 'không sao chép nhân vật', 'không sao chép thế giới'],
    });
    const candidates = Array.from({ length: 20 }, (_, index) => ({
      id: `candidate_${String(index).padStart(2, '0')}`,
      title: `Concept Trực Diện Số ${index}: Main Dùng Nghề Thật Để Đổi Đời`,
      premise: detailed(`Premise riêng số ${index}`),
      protagonistEngine: detailed(`Năng lực và giới hạn riêng số ${index}`),
      protagonistContradiction: detailed(`Mâu thuẫn nội tâm riêng số ${index}`),
      advantageLimits: detailed(`Lợi thế số ${index} có sai số và chi phí thật`),
      worldReaction: detailed(`Thế giới phản ứng theo lợi ích riêng số ${index}`),
      openingAdvantage: detailed(`Lợi thế hoạt động ngay trong opening số ${index}`),
      firstThreeChapterMechanism: detailed(`Cơ chế số ${index} đổi trạng thái trong ba chương đầu`),
      causalCost: detailed(`Mỗi lần dùng cơ chế số ${index} phải trả chi phí hữu hạn`),
      mechanismFingerprint: [`mechanism ${index} alpha`, `mechanism ${index} beta`, `mechanism ${index} gamma`],
      rewardLoopFingerprint: [`reward ${index} alpha`, `reward ${index} beta`, `reward ${index} gamma`],
      conflictEconomyFingerprint: [`conflict ${index} alpha`, `conflict ${index} beta`, `conflict ${index} gamma`],
      seriality30: Array.from({ length: 5 }, (_, beat) => detailed(`Biến thể ${beat} của concept ${index}`)),
      antiStupidOpponent: detailed(`Đối thủ concept ${index} có agenda và leverage thật`),
      domainResearchNeeds: [`nghiên cứu nghề ${index}`, `nghiên cứu thị trường ${index}`],
    }));
    const comparisons = candidates.flatMap((left, leftIndex) =>
      candidates.slice(leftIndex + 1).map(right => ({
        leftId: left.id,
        rightId: right.id,
        winnerId: left.id,
        reason: detailed(`Concept ${left.id} thắng nhờ cơ chế nhân quả rõ hơn ${right.id}`),
      })),
    );
    const calls: string[] = [];
    const result = await runConceptTournamentV3({
      snapshot,
      invoke: async call => {
        calls.push(`${call.role}:${call.index}`);
        if (call.role === 'concept_generator') {
          return JSON.stringify({
            schemaVersion: 3,
            generatorId: `generator_${call.index + 1}`,
            candidates: candidates.slice(call.index * 10, call.index * 10 + 10),
          });
        }
        if (call.role === 'concept_judge') {
          const required = new Set((call.pairs || []).map(pair => [pair.leftId, pair.rightId].sort().join(':')));
          return JSON.stringify({
            schemaVersion: 3,
            judgeId: `judge_${call.index + 1}`,
            batchIndex: call.batchIndex,
            comparisons: comparisons.filter(item => required.has([item.leftId, item.rightId].sort().join(':'))),
          });
        }
        if (call.role === 'opening_simulator') {
          const candidate = candidates[call.index];
          return JSON.stringify({
            schemaVersion: 3,
            candidateId: candidate.id,
            chapters: Array.from({ length: 3 }, (_, chapter) => ({
              chapterNumber: chapter + 1,
              title: `Chương thử ${chapter + 1}`,
              proseParagraphs: Array.from({ length: 8 }, (_, paragraph) =>
                `${detailed(`Đoạn ${paragraph} chương ${chapter + 1} concept ${candidate.id}`)} ${'Chi tiết hành động có nguyên nhân và hậu quả. '.repeat(3)}`,
              ),
              stateChange: detailed(`Trạng thái đổi ở chương ${chapter + 1}`),
              earnedReward: detailed(`Phần thưởng có nguồn ở chương ${chapter + 1}`),
              unresolvedPressure: detailed(`Áp lực còn mở sau chương ${chapter + 1}`),
            })),
          });
        }
        return JSON.stringify({
          schemaVersion: 3,
          judgeId: `opening_judge_${call.index + 1}`,
          ranking: candidates.slice(0, 3).map(candidate => candidate.id),
          scores: candidates.slice(0, 3).map(candidate => ({
            candidateId: candidate.id,
            openingPull: 8,
            worldSpecificity: 8,
            protagonistAgency: 8,
            causalReward: 8,
            characterLife: 8,
            seriality30: 8,
            proseNaturalness: 8,
            readChapter4: 8,
            criticalFails: [],
            evidence: [
              { chapterNumber: 1, excerpt: 'Đoạn opening có hành động chủ động.', reason: 'Main chủ động dùng lợi thế.' },
              { chapterNumber: 3, excerpt: 'Đoạn payoff có thay đổi vật chất.', reason: 'Payoff có nguồn và chi phí.' },
            ],
          })),
        });
      },
    });
    expect(comparisons).toHaveLength(190);
    expect(result.callCount).toBe(38);
    expect(result.candidates).toHaveLength(20);
    expect(result.finalists).toHaveLength(3);
    expect(result.openingTrials).toHaveLength(3);
    expect(result.openingReviews).toHaveLength(3);
    expect(calls).toHaveLength(38);
  });
});

describe('flagship v3 human calibration gate', () => {
  it('approves only a 50-sample corpus that meets every rollout metric', () => {
    const corpus = BlindCalibrationCorpusV3Schema.parse({
      schemaVersion: 3,
      promptVersion: 'flagship-v3.0-structured-scenes-reeditor',
      routeVersion: 'canary-gemini-v3.1',
      engineReleaseId: getFlagshipReleaseManifestV3().releaseId,
      launchPackDigest: 'a'.repeat(64),
      launchPackDigests: ['a'.repeat(64)],
      approvedBy: 'blind-reader-panel',
      distinctReviewers: 5,
      samples: Array.from({ length: 50 }, (_, index) => ({
        id: `sample_${index}`,
        preferred: index < 35 ? 'v3' : 'baseline',
        firstPassPublished: index < 34,
        publishedWithinRevision: index < 42,
        criticalContinuityViolation: false,
        wantsChapter4: index < 37,
        publishedCostUsd: 0.2,
      })),
      evidence: [],
    });
    const metrics = computeCalibrationMetricsV3(corpus);
    expect(metrics).toMatchObject({
      sampleSize: 50,
      blindPreferenceRate: 0.7,
      firstPassPublishRate: 0.68,
      withinRevisionPublishRate: 0.84,
      criticalContinuityViolations: 0,
      readChapter4Rate: 0.74,
      medianCostUsd: 0.2,
      approved: true,
    });
    expect(computeCalibrationMetricsV3({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 0 ? { ...sample, criticalContinuityViolation: true } : sample),
    }).approved).toBe(false);
  });
});

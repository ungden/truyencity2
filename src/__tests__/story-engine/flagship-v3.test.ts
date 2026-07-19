import {
  ArcPlanV3Schema,
  ChapterPlanV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
  RollingPlanWindowDraftV3Schema,
  MarketResearchSnapshotV3Schema,
  buildPlannerLedgerV3,
  buildRollingPlannerResponseJsonSchemaV3,
  materializeRollingWindowV3,
  generateRollingWindowWithOneRepairV3,
  buildV3RoleContexts,
  selectPreviousChapterTailV3,
  V3_WRITER_BRIEF_MAX_CHARS,
  executeFlagshipV3Pipeline,
  EditorAssessmentV3Schema,
  buildEditorResponseJsonSchemaV3,
  evaluateQualityV3,
  runConceptTournamentV3,
  BlindCalibrationCorpusV3Schema,
  computeCalibrationMetricsV3,
  FrozenBriefCorpusV3Schema,
  MachineCalibrationCorpusV3Schema,
  computeMachineCalibrationMetricsV3,
  MACHINE_JUDGE_LINEAGES_V3,
  assessOpeningFinalistV3,
  applyChapterStateV3,
  runV3ProsePreflight,
  runV3StructuredProsePreflight,
  validateV3Artifacts,
  assessEndingReadinessV3,
  validateLaunchPackResearchProvenanceV3,
  assertFlagshipReleaseV3,
  getFlagshipReleaseManifestV3,
  retainStoryFactsV3,
  V3_ROLLING_PLANNER_RULES,
  V3_WRITER_SYSTEM,
  buildV3WriterPrompt,
  buildV3RevisionPrompt,
  type ChapterPlanV3,
  type StoryKernelV3,
  type StoryStateV3,
} from '@/services/story-engine/flagship-v3';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { toGeminiResponseJsonSchema } from '@/services/story-engine/flagship/setup-response-schemas';
import { supportsGeminiThinkingLevel } from '@/services/story-engine/utils/gemini';

const detailed = (value: string) => `${value} với nguyên nhân, giới hạn và hậu quả cụ thể trong thế giới truyện.`;
const prose = (marker: string, bad = '') => `${marker} ${bad} ${Array.from({ length: 6 }, () => 'Sơn làm việc bằng đôi tay chai sần, kiểm tra từng thay đổi rồi mới gọi người nhà đến chứng kiến kết quả. '.repeat(15)).join('\n\n')}`.trim();
const paragraphs = (content: string) => content.split(/\n\s*\n/gu).map(item => item.trim()).filter(Boolean);
const writerScenes = (content: string) => {
  const parts = paragraphs(content);
  const size = Math.ceil(parts.length / plan().scenes.length);
  return plan().scenes.map((scene, index) => ({ sceneId: scene.id, paragraphs: parts.slice(index * size, (index + 1) * size) }));
};
const writerPayload = (content: string) => ({
  title: 'Mẻ Cá Qua Mưa',
  scenes: writerScenes(content),
});

function kernel(): StoryKernelV3 {
  return StoryKernelV3Schema.parse({
    schemaVersion: 3,
    pipelineVersion: 'flagship_v3',
    title: 'Trọng Sinh Về Làng Biển, Tôi Biến Cá Rẻ Thành Cơ Nghiệp Cả Nhà',
    genre: 'do-thi-nien-dai',
    concept: {
      signature: detailed('Người làm nghề biển dùng ký ức xu hướng và kỹ thuật bảo quản'),
      uniqueMechanism: detailed('Mỗi vòng thưởng biến hàng bị ép giá thành sản phẩm có đầu ra thật'),
      evidenceSignalIds: ['signal_0'],
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
        register: `${name} dùng khẩu ngữ đời thường đúng tuổi và nghề nghiệp`,
        sentenceRhythm: `${name} nói câu ngắn khi quyết định và câu vừa khi giải thích`,
        directness: 'direct',
        addressRules: 'Với người trong gia đình dùng cha, mẹ hoặc con theo đúng vai vế',
        vocabulary: 'Ưu tiên từ vựng nghề biển và giao dịch đời thường',
        stressResponse: `${name} ít lời hơn và hỏi thẳng dữ kiện khi chịu áp lực`,
        avoidances: 'Không đọc diễn văn thay tác giả hoặc kinh ngạc và ca ngợi vô cớ',
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
        exchangeAnchors: [{ itemId: 'clean_salt', name: 'Muối sạch', quantity: 2, unit: 'kg', costAmount: 100, tolerancePercent: 20 }],
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
        exchangeAnchors: [],
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
        exchangeAnchors: [],
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
        objective: 'Sơn xin cha cho dùng số muối sạch còn lại để xử lý cá.',
        obstacle: 'Cha không chấp nhận mất muối nếu dự báo mưa của Sơn sai.',
        action: 'Sơn chỉ dấu gió và đặt tiền riêng làm cam kết vật chất.',
        worldClaimIds: ['claim_0'],
        hookIntent: 'choice_forced',
        requiredDeltaIds: ['cash_spent'],
      },
      {
        id: 'scene_1_b',
        povCharacterId: 'nguyen_hai_son',
        participantIds: ['nguyen_hai_son', 'me_son'],
        locationId: 'san_nha',
        durationMinutes: 45,
        travelMinutesFromPrevious: 5,
        objective: 'Sơn xử lý xong lô cá trước khi mưa tràn vào sân.',
        obstacle: 'Mái che dột và trận mưa đến trong vòng một giờ.',
        action: 'Sơn chia cá thành lớp mỏng rồi dùng đúng hai ký muối.',
        worldClaimIds: ['claim_0'],
        hookIntent: 'threat_arrives',
        requiredDeltaIds: ['salt_spent', 'mother_learns', 'promise_advanced'],
      },
    ],
    requiredDeltas: [
      { id: 'cash_spent', kind: 'resource_numeric', resourceId: 'cash', before: 100, delta: -20, after: 80, unit: 'dong', source: 'tiền riêng của Sơn', sink: 'cam kết với cha', transactionKind: 'transfer', consideration: [], evidenceRequired: true },
      { id: 'salt_spent', kind: 'resource_numeric', resourceId: 'salt', before: 3, delta: -2, after: 1, unit: 'kg', source: 'muối sạch đã rửa', sink: 'ướp lô cá', transactionKind: 'consume', consideration: [], evidenceRequired: true },
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

const qualityGates = {
  character_voice: true,
  scene_tension: true,
  emotional_movement: true,
  domain_truth: true,
  prose_naturalness: true,
  agency: true,
  desire_to_read_next: true,
} as const;
const hardGates = {
  canon: true,
  timeline: true,
  resource_causality: true,
  character_knowledge: true,
  authority: true,
  prompt_leak: true,
  plan_fidelity: true,
};
const deltaEvidence = (_content: string) => plan().requiredDeltas.map(delta => ({ deltaId: delta.id, spanId: 'span_001' }));
const passAssessment = (content: string) => ({
  status: 'pass', hardGates, qualityGates, issues: [], revisionInstructions: [],
  realizedDeltaEvidence: deltaEvidence(content),
});

function validRollingDraft() {
  return RollingPlanWindowDraftV3Schema.parse({
    schemaVersion: 3,
    startChapter: 1,
    plans: Array.from({ length: 5 }, (_, offset) => {
      const chapterNumber = offset + 1;
      const deltaId = `promise_advance_${chapterNumber}`;
      return {
        schemaVersion: 3,
        chapterNumber,
        elapsedMinutesSincePreviousChapter: chapterNumber === 1 ? 0 : 10,
        chapterPromise: detailed(`Chương ${chapterNumber} tạo một thay đổi có nguồn`),
        preconditions: [],
        scenes: [{ ...plan().scenes[0], id: `scene_${chapterNumber}`, requiredDeltaIds: [deltaId] }],
        requiredDeltas: [{
          id: deltaId,
          kind: 'promise',
          promiseId: 'promise_0',
          statusAfter: 'advanced',
          pressureAfter: detailed(`Áp lực tiếp nối chương ${chapterNumber}`),
          evidenceRequired: true,
        }],
        nextChapterPressure: detailed(`Áp lực chuyển sang chương ${chapterNumber + 1}`),
      };
    }),
  });
}

describe('flagship v3 core engine', () => {
  it('keeps arithmetic-derived absolute scene time out of the Planner model contract', () => {
    const schema = JSON.stringify(toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema));
    expect(schema).toContain('elapsedMinutesSincePreviousChapter');
    expect(schema).not.toContain('startMinute');
    expect(schema).not.toContain('valueBefore');
    expect(schema).not.toContain('"before"');
    const parsed = toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema) as any;
    const numeric = parsed.properties.plans.items.properties.requiredDeltas.items.anyOf
      .find((branch: any) => branch.properties.kind.enum.includes('resource_numeric')).properties;
    expect(numeric).not.toHaveProperty('before');
    expect(numeric).not.toHaveProperty('after');
    expect(numeric).not.toHaveProperty('unit');
    const providerSchema = buildRollingPlannerResponseJsonSchemaV3(kernel(), state()) as any;
    const providerNumeric = providerSchema.properties.plans.items.properties.requiredDeltas.items.anyOf
      .find((branch: any) => branch.properties.kind.enum.includes('resource_numeric')).properties;
    expect(providerNumeric.consideration.items.properties.quantity).not.toHaveProperty('exclusiveMinimum');
    expect(providerSchema.properties.plans.items.properties.scenes).not.toHaveProperty('minItems');
    expect(providerSchema.properties.plans.items.properties.scenes).not.toHaveProperty('maxItems');
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

  it('blocks off-page preparation that is not grounded in committed state', () => {
    const invalid = ChapterPlanV3Schema.parse({
      ...plan(),
      scenes: plan().scenes.map((scene, index) => index === 0
        ? { ...scene, action: 'Sơn lấy thúng và lá chuối đã chuẩn bị từ trước để phủ kín mẻ cá.' }
        : scene),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ungrounded_prior_preparation' })]),
    );
  });

  it('requires a material fact when a scene gives the protagonist a carried object', () => {
    const invalid = ChapterPlanV3Schema.parse({
      ...plan(),
      scenes: plan().scenes.map((scene, index) => index === 0
        ? { ...scene, action: 'Gã Bảy được chủ tàu cho một thúng cá dạt để mang về bán.' }
        : scene),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'physical_acquisition_untracked' })]),
    );
  });

  it('requires an explicit liability fact when goods are received before payment', () => {
    const invalid = ChapterPlanV3Schema.parse({
      ...plan(),
      scenes: plan().scenes.map((scene, index) => index === 0
        ? { ...scene, action: 'Sơn nhận một thúng cá trước và cam kết sẽ trả tiền cho chủ tàu vào buổi trưa.' }
        : scene),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'physical_acquisition_untracked' }),
        expect.objectContaining({ code: 'deferred_payment_untracked' }),
      ]),
    );
    const liabilityDelta = {
      id: 'fish_payable',
      kind: 'fact' as const,
      factId: 'fish_payable',
      valueBefore: null,
      valueAfter: 'Sơn nợ chủ tàu 80 đồng tiền cá và phải trả trước buổi trưa.',
      evidenceRequired: true,
    };
    const valid = ChapterPlanV3Schema.parse({
      ...invalid,
      scenes: invalid.scenes.map((scene, index) => index === 0
        ? { ...scene, requiredDeltaIds: [...scene.requiredDeltaIds, liabilityDelta.id] }
        : scene),
      requiredDeltas: [...invalid.requiredDeltas, liabilityDelta],
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: valid }))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'deferred_payment_untracked' })]));
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: valid }))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'physical_acquisition_untracked' })]));
  });

  it('keeps melodramatic emotional direction out of relationship state', () => {
    const invalid = ChapterPlanV3Schema.parse({
      ...plan(),
      scenes: plan().scenes.map((scene, index) => index === 0
        ? { ...scene, requiredDeltaIds: [...scene.requiredDeltaIds, 'scripted_reaction'] }
        : scene),
      requiredDeltas: [
        ...plan().requiredDeltas,
        {
          id: 'scripted_reaction',
          kind: 'relationship',
          characterId: 'me_son',
          relationshipAfter: 'Vô cùng cảm động, khóc vì hạnh phúc và sững sờ trước tài năng của Sơn.',
          evidenceRequired: true,
        },
      ],
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: invalid })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'relationship_prose_directing' })]),
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

  it('blocks an economically impossible purchase before Writer and accepts the story-priced quantity', () => {
    const purchase = (quantity: number) => ChapterPlanV3Schema.parse({
      ...plan(),
      requiredDeltas: plan().requiredDeltas.map(delta => delta.id === 'cash_spent' && delta.kind === 'resource_numeric'
        ? {
            ...delta,
            transactionKind: 'purchase' as const,
            consideration: [{ itemId: 'clean_salt', name: 'Muối sạch', quantity, unit: 'kg' }],
            source: 'Sơn trả tiền mua muối sạch cho mẻ cá',
            sink: 'Người bán muối nhận tiền tại sân nhà',
          }
        : delta),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: purchase(0.4) })
      .some(issue => issue.code === 'resource_exchange_implausible')).toBe(false);
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: purchase(2) })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'resource_exchange_implausible' })]),
    );
  });

  it('does not misclassify fees or previously purchased inventory as a new purchase', () => {
    const feePlan = ChapterPlanV3Schema.parse({
      ...plan(),
      requiredDeltas: plan().requiredDeltas.map(delta => delta.id === 'cash_spent' && delta.kind === 'resource_numeric'
        ? { ...delta, transactionKind: 'fee' as const, source: 'Tiền mặt hiện có của Sơn', sink: 'Thanh toán phí sử dụng bến cá' }
        : delta.id === 'salt_spent' && delta.kind === 'resource_numeric'
          ? { ...delta, source: 'Số muối sạch đã mua từ phiên chợ trước', sink: 'Ướp lô cá đang sơ chế' }
          : delta),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: feePlan })
      .some(issue => issue.code === 'resource_purchase_untyped')).toBe(false);

    const disguisedPurchase = ChapterPlanV3Schema.parse({
      ...plan(),
      requiredDeltas: plan().requiredDeltas.map(delta => delta.id === 'cash_spent' && delta.kind === 'resource_numeric'
        ? { ...delta, transactionKind: 'transfer' as const, sink: 'Mua muối sạch từ người bán ở chợ' }
        : delta),
    });
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: state(), plan: disguisedPurchase })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'resource_purchase_untyped' })]),
    );
  });

  it('detects CJK and verbatim plan prose without a model critic', () => {
    const content = `${plan().scenes[0].objective} kim loại拼凑 lại.`;
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

  it('turns the live canary cliche cluster and zero-cash dialogue contradiction into deterministic evidence', () => {
    const zeroCashState = StoryStateV3Schema.parse({
      ...state(),
      resources: state().resources.map(resource => resource.resourceId === 'cash'
        ? { ...resource, value: { mode: 'numeric' as const, amount: 0, unit: 'dong' } }
        : resource),
    });
    const content = 'Tiếng ho xé toạc màn đêm. Anh thề cắn nát sỏi đá. Ngọn lửa bùng lên trong huyết quản. Mai nói mình cứ để tiền đó mà lo vốn liếng.';
    const evidence = runV3StructuredProsePreflight({
      content,
      scenes: [{ sceneId: 'scene_1_a', content }],
      plan: plan(),
      targetWordCount: 10,
      kernel: kernel(),
      state: zeroCashState,
    });
    expect(evidence.map(item => item.code)).toEqual(expect.arrayContaining(['ai_cliche_cluster', 'zero_cash_claim_conflict']));
  });

  it('uses a natural hard range instead of forcing a target percentage in revision', () => {
    const context = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() }).revision();
    const prompt = buildV3RevisionPrompt({
      chapterNumber: 2,
      targetWordCount: 1800,
      context,
      title: 'Bèo Tây Giữ Mẻ Cá Bạc',
      content: prose('Bản nháp ngắn.'),
      evidence: [{
        code: 'chapter_under_target', severity: 'major', message: 'Bản nháp chỉ có 975 từ.',
        start: 0, end: 10, excerpt: 'Bản nháp', local: false,
      }],
      instructions: ['Viết lại chương với đầy đủ diễn biến.'],
      repairMode: 'full_rewrite',
    });
    expect(prompt).toContain('hard range 1000-2200 từ');
    expect(prompt).not.toContain('1440');
  });

  it('gives Writer only the mechanical brief while Editor retains the full plan', () => {
    const longState: StoryStateV3 = {
      ...state(),
      timeline: Array.from({ length: 20 }, (_, chapter) => ({
        chapter: chapter + 1, startMinute: chapter * 60, durationMinutes: 60,
        locationId: 'nha_son', event: `Sự kiện đã commit ở chương ${chapter + 1}`,
      })),
      retrievalNotes: Array.from({ length: 8 }, (_, index) => `Ghi chú ${index} ${'chi tiết lịch sử '.repeat(30)}`),
    };
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: longState, plan: plan() });
    expect(contexts.writer.chars).toBeLessThan(contexts.editor.chars);
    expect(contexts.editor.chars).toBeLessThanOrEqual(contexts.editor.budget);
    expect(contexts.revision().chars).toBeLessThan(contexts.editor.chars);
    expect(contexts.revision().chars).toBeLessThanOrEqual(contexts.revision().budget);
    expect(contexts.writer.text).toContain('WRITER_BRIEF_V3');
    expect(contexts.writer.text).not.toContain(plan().chapterPromise);
    expect(contexts.writer.text).not.toContain(plan().nextChapterPressure);
    const promiseDelta = plan().requiredDeltas.find(delta => delta.kind === 'promise');
    expect(promiseDelta?.kind).toBe('promise');
    if (promiseDelta?.kind === 'promise') expect(contexts.writer.text).not.toContain(promiseDelta.pressureAfter);
    expect(contexts.editor.text).toContain(plan().chapterPromise);
    expect(contexts.editor.text).toContain(plan().nextChapterPressure);
    expect(contexts.revision().text).not.toContain('recentSummary');
    expect(contexts.revision().text).not.toContain('previousEnding');
    expect(contexts.revision().text).not.toContain('retrievalNotes');
  });

  it('keeps known contaminated setup prose out of Writer input', () => {
    const pollutedState = StoryStateV3Schema.parse({
      ...state(),
      recentSummary: 'Một tia hy vọng mỏng manh vừa mở ra trước mắt cả nhà.',
      previousEnding: 'Mình cứ để tiền đó mà lo vốn liếng.',
      promises: state().promises.map((promise, index) => index === 0
        ? { ...promise, pressure: 'Bước sang trang mới của cơ đồ tương lai.' }
        : promise),
    });
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: pollutedState, plan: plan() });
    expect(contexts.writer.manifest.find(item => item.id === 'WRITER_BRIEF_V3')?.chars).toBeLessThanOrEqual(V3_WRITER_BRIEF_MAX_CHARS + 18);
    expect(contexts.writer.text).not.toContain('Mình cứ để tiền đó');
    expect(contexts.writer.text).not.toContain('tia hy vọng mỏng manh');
    expect(contexts.writer.text).not.toContain('Bước sang trang mới');
    expect(contexts.writer.text).not.toContain('positiveExamples');
    expect(contexts.writer.text).not.toContain('endingContract');
  });

  it('uses at most 1200 exact words from the published previous chapter and blocks verbatim replay', () => {
    const published = Array.from({ length: 1_500 }, (_, index) => `từ_${index}`).join(' ');
    const tail = selectPreviousChapterTailV3(published);
    expect(tail.split(/\s+/u)).toHaveLength(1_200);
    expect(tail.startsWith('từ_300 ')).toBe(true);
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan(), previousChapterTail: tail });
    expect(contexts.writer.text).toContain('PREVIOUS_CHAPTER_TAIL');
    expect(contexts.writer.text).toContain('từ_300');

    const repeated = 'Đây là một đoạn đủ dài được xuất bản ở chương trước và tuyệt đối không được chép lại nguyên văn trong chương sau vì nó phá hỏng điểm nối tự nhiên của câu chuyện và khiến độc giả phải đọc lại cùng một diễn biến.';
    const evidence = runV3StructuredProsePreflight({
      content: repeated,
      scenes: [{ sceneId: 'scene_1_a', content: repeated }],
      plan: plan(),
      targetWordCount: 1_500,
      previousChapterTail: repeated,
    });
    expect(evidence).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'previous_chapter_verbatim_repeat' })]));
  });

  it('keeps Revision under budget when optional narrative history is very large', () => {
    const longNarrativeState: StoryStateV3 = {
      ...state(),
      recentSummary: 'Tóm tắt lịch sử '.repeat(180),
      previousEnding: 'Đoạn kết chương trước '.repeat(100),
      retrievalNotes: Array.from({ length: 4 }, () => 'Ghi chú truy hồi '.repeat(40)),
    };
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: longNarrativeState, plan: plan() });
    expect(contexts.revision().chars).toBeLessThanOrEqual(contexts.revision().budget);
    expect(contexts.revision().chars).toBeLessThanOrEqual(contexts.writer.chars);
    expect(contexts.revision().text).toContain('WRITER_BRIEF_V3');
    expect(contexts.revision().text).toContain('facts');
    expect(contexts.revision().text).toContain('resources');
  });

  it('makes POV, participant and minute fidelity explicit in role prompts', () => {
    expect(V3_ROLLING_PLANNER_RULES).toContain('participantIds chứa ít nhất povCharacterId');
    expect(V3_ROLLING_PLANNER_RULES).toContain('số dư không được thấp hơn minimumValue');
    expect(V3_ROLLING_PLANNER_RULES).toContain('Không được chi tiền/tài nguyên chưa kiếm được');
    expect(V3_ROLLING_PLANNER_RULES).toContain('chapterPromise là một câu tiếng Việt cụ thể');
    expect(V3_ROLLING_PLANNER_RULES).toContain('Promise ID chỉ xuất hiện trong delta kind=promise');
    expect(V3_WRITER_SYSTEM).toContain('tự quyết định lời văn');
    expect(V3_WRITER_SYSTEM).toContain('không kể lại hoặc sao chép');
    expect(V3_WRITER_SYSTEM).toContain('không phải giao diện trong thế giới truyện');
    expect(buildV3WriterPrompt({
      chapterNumber: 1,
      targetWordCount: 1_500,
      context: buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() }).writer,
    })).toContain('hard range 1000-2200 từ');
    expect(V3_WRITER_SYSTEM).not.toContain('bước sang trang mới');
    expect(V3_WRITER_SYSTEM).not.toContain('đó không phải');
  });

  it('recognizes Gemini 3.1 Pro as a thinking model so role budgets are not silently ignored', () => {
    expect(supportsGeminiThinkingLevel('gemini-3.1-pro-preview')).toBe(true);
    expect(supportsGeminiThinkingLevel('gemini-3-pro-preview')).toBe(true);
    expect(supportsGeminiThinkingLevel('gemini-2.5-pro')).toBe(false);
    expect(getFlagshipReleaseManifestV3().providerVersion).toBe('provider-v3.9-combined-editor-issue-budget');
  });

  it('puts numeric bounds and source rules beside current balances in the authoritative planner ledger', () => {
    const ledger = buildPlannerLedgerV3(state(), kernel()) as {
      resources: Array<{ resourceId: string; value: unknown; minimumValue: number | null; maximumValue: number | null; sourceRules: string[] }>;
    };
    expect(ledger.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resourceId: 'cash', minimumValue: 0, maximumValue: 1000000000,
        sourceRules: ['Chỉ tăng từ giao dịch có người trả tiền'],
      }),
    ]));
  });

  it('binds scene cast fields to the story-owned character IDs in the provider schema', () => {
    const schema = buildRollingPlannerResponseJsonSchemaV3(kernel(), state()) as any;
    const scene = schema.properties.plans.items.properties.scenes.items.properties;
    const precondition = schema.properties.plans.items.properties.preconditions.items.properties;
    const expectedIds = kernel().characters.map(character => character.id).sort();
    expect(scene.povCharacterId.enum).toEqual(expectedIds);
    expect(scene.participantIds.items.enum).toEqual(expectedIds);
    expect(scene.participantIds.items.enum).not.toContain('char_an');
    expect(scene.participantIds.maxItems).toBe(expectedIds.length);
    expect(schema.properties.plans.minItems).toBeUndefined();
    expect(schema.properties.plans.maxItems).toBeUndefined();
    expect(schema.properties.plans.items.properties.requiredDeltas.minItems).toBeUndefined();
    expect(schema.properties.plans.items.properties.requiredDeltas.maxItems).toBeUndefined();
    expect(schema.properties.plans.items.properties.scenes.minItems).toBeUndefined();
    expect(schema.properties.plans.items.properties.scenes.maxItems).toBeUndefined();
    expect(schema.properties.plans.items.properties.preconditions.maxItems).toBe(state().facts.length);
    expect(scene.objective).toBeDefined();
    expect(scene.desire).toBeUndefined();
    expect(precondition.factId.enum).toEqual(state().facts.map(fact => fact.id).sort());
    const deltas = schema.properties.plans.items.properties.requiredDeltas.items.anyOf;
    const byKind = (kind: string) => deltas.find((branch: any) => branch.properties.kind.enum.includes(kind)).properties;
    expect(byKind('resource_numeric').resourceId.enum).toEqual(['cash', 'salt']);
    expect(byKind('resource_state').resourceId.enum).toEqual(['buyer_access']);
    expect(byKind('promise').promiseId.enum).toEqual(['promise_0', 'promise_1', 'promise_2', 'promise_3']);
  });

  it('materializes multiple same-resource transactions sequentially within one chapter', () => {
    const initialState = StoryStateV3Schema.parse({
      ...state(),
      resources: state().resources.map(resource => resource.resourceId === 'cash'
        ? { ...resource, value: { mode: 'numeric' as const, amount: 2750, unit: 'dong' } }
        : resource),
    });
    const draft = RollingPlanWindowDraftV3Schema.parse({
      schemaVersion: 3,
      startChapter: 1,
      plans: Array.from({ length: 5 }, (_, offset) => {
        const chapterNumber = offset + 1;
        const deltas = chapterNumber === 1
          ? [
              { id: 'cash_earned', kind: 'resource_numeric', resourceId: 'cash', delta: 2500, source: detailed('Khách trả tiền cho mẻ cá'), sink: detailed('Tiền nhập vào quỹ gia đình'), transactionKind: 'gain', consideration: [], evidenceRequired: true },
              { id: 'cash_spent', kind: 'resource_numeric', resourceId: 'cash', delta: -5000, source: detailed('Quỹ gia đình sau khi bán cá'), sink: detailed('Khoản chuyển vào quỹ dự phòng'), transactionKind: 'transfer', consideration: [], evidenceRequired: true },
            ]
          : [{ id: `promise_advance_${chapterNumber}`, kind: 'promise', promiseId: 'promise_0', statusAfter: 'advanced', pressureAfter: detailed(`Áp lực tiếp nối chương ${chapterNumber}`), evidenceRequired: true }];
        return {
          schemaVersion: 3,
          chapterNumber,
          elapsedMinutesSincePreviousChapter: chapterNumber === 1 ? 0 : 10,
          chapterPromise: detailed(`Chương ${chapterNumber} tạo một thay đổi có nguồn`),
          preconditions: [],
          scenes: [{
            ...plan().scenes[0],
            id: `scene_${chapterNumber}`,
            requiredDeltaIds: deltas.map(delta => delta.id),
          }],
          requiredDeltas: deltas,
          nextChapterPressure: detailed(`Áp lực chuyển sang chương ${chapterNumber + 1}`),
        };
      }),
    });
    const window = materializeRollingWindowV3({ kernel: kernel(), arc, state: initialState, draft });
    const numeric = window.plans[0].requiredDeltas.filter(delta => delta.kind === 'resource_numeric');
    expect(numeric).toEqual([
      expect.objectContaining({ before: 2750, delta: 2500, after: 5250 }),
      expect.objectContaining({ before: 5250, delta: -5000, after: 250 }),
    ]);
  });

  it('still blocks a true same-chapter overspend after sequential materialization', () => {
    const initialState = StoryStateV3Schema.parse({
      ...state(),
      resources: state().resources.map(resource => resource.resourceId === 'cash'
        ? { ...resource, value: { mode: 'numeric' as const, amount: 2750, unit: 'dong' } }
        : resource),
    });
    const invalid = {
      ...plan(),
      requiredDeltas: [
        { id: 'cash_earned', kind: 'resource_numeric' as const, resourceId: 'cash', before: 2750, delta: 500, after: 3250, unit: 'dong', source: detailed('Khách trả tiền cho mẻ cá'), sink: detailed('Tiền nhập vào quỹ gia đình'), transactionKind: 'gain' as const, consideration: [], evidenceRequired: true as const },
        { id: 'cash_spent', kind: 'resource_numeric' as const, resourceId: 'cash', before: 3250, delta: -5000, after: -1750, unit: 'dong', source: detailed('Quỹ gia đình sau khi bán cá'), sink: detailed('Khoản chuyển vào quỹ dự phòng'), transactionKind: 'transfer' as const, consideration: [], evidenceRequired: true as const },
      ],
      scenes: [{ ...plan().scenes[0], requiredDeltaIds: ['cash_earned', 'cash_spent'] }],
    };
    expect(validateV3Artifacts({ kernel: kernel(), arc, state: initialState, plan: ChapterPlanV3Schema.parse(invalid) })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'resource_below_minimum' })]),
    );
  });

  it('gives the Planner exactly one evidence-guided repair without changing route', async () => {
    const valid = validRollingDraft();
    const invalid = RollingPlanWindowDraftV3Schema.parse({
      ...valid,
      plans: valid.plans.map((item, index) => index === 0 ? {
        ...item,
        requiredDeltas: [{ id: 'overspend_cash', kind: 'resource_numeric', resourceId: 'cash', delta: -1000, source: detailed('Tiền mặt hiện có trong gia đình'), sink: detailed('Khoản phí vượt quá số dư hiện có'), transactionKind: 'fee', consideration: [], evidenceRequired: true }],
        scenes: item.scenes.map((scene, sceneIndex) => sceneIndex === 0 ? { ...scene, requiredDeltaIds: ['overspend_cash'] } : scene),
      } : item),
    });
    const prompts: string[] = [];
    const persisted: Array<{ attempt: number; result: string; modelRoute: string }> = [];
    const generated = await generateRollingWindowWithOneRepairV3({
      kernel: kernel(), arc, state: state(), startChapter: 1,
      basePrompt: 'FIRST_ATTEMPT', roleContext: 'ROLE_CONTEXT', ledger: buildPlannerLedgerV3(state(), kernel()),
      modelRoute: 'gemini-3.1-pro-preview',
      invoke: async (prompt, attempt) => {
        prompts.push(prompt);
        return { raw: JSON.stringify(attempt === 1 ? invalid : valid), estimatedCostUsd: 0.01 };
      },
      onAttempt: async attempt => { persisted.push(attempt); },
    });
    expect(generated.window.startChapter).toBe(1);
    expect(generated.attempts).toHaveLength(2);
    expect(persisted).toEqual([
      expect.objectContaining({ attempt: 1, result: 'invalid', modelRoute: 'gemini-3.1-pro-preview' }),
      expect.objectContaining({ attempt: 2, result: 'valid', modelRoute: 'gemini-3.1-pro-preview' }),
    ]);
    expect(prompts[1]).toContain('REPAIR_ATTEMPT=2_OF_2');
    expect(prompts[1]).toContain('VALIDATION_ISSUES=');
  });

  it('uses the same single Planner repair for a syntactically valid but contract-invalid draft', async () => {
    const valid = validRollingDraft();
    const invalid = structuredClone(valid) as any;
    invalid.plans[0].requiredDeltas[0].pressureAfter = 'ngắn';
    const generated = await generateRollingWindowWithOneRepairV3({
      kernel: kernel(), arc, state: state(), startChapter: 1,
      basePrompt: 'FIRST_ATTEMPT', roleContext: 'ROLE_CONTEXT', ledger: buildPlannerLedgerV3(state(), kernel()),
      modelRoute: 'gemini-3.1-pro-preview',
      invoke: async (_prompt, attempt) => ({ raw: JSON.stringify(attempt === 1 ? invalid : valid), estimatedCostUsd: 0.01 }),
    });
    expect(generated.attempts).toEqual([
      expect.objectContaining({ attempt: 1, result: 'invalid', validationEvidence: expect.arrayContaining([
        expect.objectContaining({ code: 'planner_contract' }),
      ]) }),
      expect.objectContaining({ attempt: 2, result: 'valid' }),
    ]);
  });

  it('blocks the plan after the one allowed repair is still invalid', async () => {
    const valid = validRollingDraft();
    const invalid = RollingPlanWindowDraftV3Schema.parse({
      ...valid,
      plans: valid.plans.map((item, index) => index === 0 ? {
        ...item,
        requiredDeltas: [{ id: 'overspend_cash', kind: 'resource_numeric', resourceId: 'cash', delta: -1000, source: detailed('Tiền mặt hiện có trong gia đình'), sink: detailed('Khoản phí vượt quá số dư hiện có'), transactionKind: 'fee', consideration: [], evidenceRequired: true }],
        scenes: item.scenes.map((scene, sceneIndex) => sceneIndex === 0 ? { ...scene, requiredDeltaIds: ['overspend_cash'] } : scene),
      } : item),
    });
    let calls = 0;
    await expect(generateRollingWindowWithOneRepairV3({
      kernel: kernel(), arc, state: state(), startChapter: 1,
      basePrompt: 'FIRST_ATTEMPT', roleContext: 'ROLE_CONTEXT', ledger: buildPlannerLedgerV3(state(), kernel()),
      modelRoute: 'gemini-3.1-pro-preview',
      invoke: async () => {
        calls += 1;
        return { raw: JSON.stringify(invalid), estimatedCostUsd: 0.01 };
      },
    })).rejects.toMatchObject({ code: 'plan_blocked' });
    expect(calls).toBe(2);
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
        if (call.role === 'writer') return JSON.stringify({ ...writerPayload(content), title: 'Chương 1: Mẻ Cá Qua Mưa' });
        return JSON.stringify(passAssessment(content));
      },
    });
    expect(calls).toEqual(['writer', 'editor']);
    expect(contexts.used().map(context => context.role)).toEqual(['writer', 'editor']);
    expect(result.verdict.decision).toBe('publish');
    expect(result.title).toBe('Mẻ Cá Qua Mưa');
  });

  it('normalizes provider double-escaped line breaks without rewriting prose words', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const content = prose('Sơn trả đủ hai mươi đồng rồi dùng đúng hai ký muối cho mẻ cá.');
    const escapedParagraphs = paragraphs(content).map((item, index) => index === 0 ? `${item}\\nMột nhịp quan sát tiếp nối.` : item);
    const result = await executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => call.role === 'writer'
        ? JSON.stringify({ title: 'Mẻ Cá Qua Mưa', scenes: writerScenes(escapedParagraphs.join('\n\n')) })
        : JSON.stringify(passAssessment(content)),
    });
    expect(result.content).toContain('\n\n');
    expect(result.content).not.toContain('\\n');
    expect(result.content).toContain('Sơn trả đủ hai mươi đồng rồi dùng đúng hai ký muối cho mẻ cá.');
    expect(result.content).toContain('Một nhịp quan sát tiếp nối.');
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
        if (call.role === 'writer') return JSON.stringify({
          title: 'Mẻ Cá Qua Mưa',
          scenes: writerScenes(bad),
        });
        if (call.role === 'writer_revision') return JSON.stringify({ patches: [{ spanId: 'span_001', replacement: fixed.slice(0, 650) }] });
        if (call.role === 'editor') {
          return JSON.stringify({
            status: 'issues', hardGates, qualityGates: { ...qualityGates, prose_naturalness: false },
            issues: [{ gate: 'prose_naturalness', severity: 'moderate', message: 'Câu cục bộ phá giọng.', spanId: 'span_001', locality: 'local', repairMode: 'local_edit' }],
            revisionInstructions: ['Chỉnh sửa câu cục bộ để tuân thủ kế hoạch, giữ nguyên mọi artifact.'],
            realizedDeltaEvidence: deltaEvidence(bad),
          });
        }
        return JSON.stringify(passAssessment(fixed));
      },
    });
    expect(calls).toEqual(['writer', 'editor', 'writer_revision', 'editor_recheck']);
    expect(contexts.used().map(context => context.role)).toEqual(['writer', 'editor', 'revision']);
    expect(result.revisionLineage).toHaveLength(1);
    expect(result.content.slice(-200)).toBe(fixed.slice(-200));
  });

  it('routes a grounded local canon wording error through the single revision', () => {
    const chapterPlan = plan();
    const verdict = evaluateQualityV3({
      plan: chapterPlan,
      deterministicEvidence: [],
      editor: {
        status: 'issues',
        hardGates: { ...hardGates, canon: false },
        qualityGates,
        issues: [{
          gate: 'canon', code: 'editor_canon', severity: 'major', message: 'Sai tên dụng cụ trong một câu.',
          locality: 'local', repairMode: 'local_edit', start: 10, end: 30, excerpt: 'chiếc kính lúp nhỏ', local: true,
        }],
        revisionInstructions: ['Đổi đúng tên dụng cụ đã khóa trong kernel.'],
        realizedDeltaEvidence: chapterPlan.requiredDeltas.map(delta => ({
          deltaId: delta.id, start: 0, end: 8, excerpt: 'evidence',
        })),
      },
    });
    expect(verdict.decision).toBe('revise');
  });

  it('derives a full rewrite when required delta evidence is missing', () => {
    const chapterPlan = plan();
    const verdict = evaluateQualityV3({
      plan: chapterPlan,
      deterministicEvidence: [],
      editor: {
        status: 'pass', hardGates, qualityGates, issues: [], revisionInstructions: [],
        realizedDeltaEvidence: chapterPlan.requiredDeltas.slice(1).map(delta => ({
          deltaId: delta.id, start: 0, end: 8, excerpt: 'evidence',
        })),
      },
    });
    expect(verdict).toMatchObject({ decision: 'revise', repairMode: 'full_rewrite' });
    expect(verdict.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'required_delta_unrealized' })]));
  });

  it('makes pass structurally incompatible with issues or revision instructions', () => {
    expect(EditorAssessmentV3Schema.safeParse({
      status: 'pass', hardGates, qualityGates,
      issues: [{ gate: 'prose_naturalness', severity: 'moderate', message: 'Câu còn sáo và thiếu tự nhiên.', spanId: 'span_001', locality: 'local', repairMode: 'local_edit' }],
      revisionInstructions: ['Sửa câu sáo.'],
      realizedDeltaEvidence: deltaEvidence('content'),
    }).success).toBe(false);
    const providerSchema = JSON.stringify(buildEditorResponseJsonSchemaV3(plan()));
    expect(providerSchema).toContain('"minItems":0');
    expect(providerSchema).toContain('"maxItems":0');
    expect(providerSchema).toContain('"maxItems":3');
    expect(providerSchema).toContain('"salt_spent"');
    expect(providerSchema).not.toContain('premise_interest');
    expect(providerSchema).not.toContain('causal_surprise');
    expect(providerSchema).not.toContain('earned_pleasure');
    expect(providerSchema).not.toContain('recovery_pacing');
    const constrainedIssueSchema = JSON.stringify(buildEditorResponseJsonSchemaV3(plan(), 2));
    expect(constrainedIssueSchema).toContain('"maxItems":2');
    expect(constrainedIssueSchema).not.toContain('"maxItems":3');
  });

  it('lets deterministic preflight own evidence without forcing the Editor to duplicate it', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const contaminated = prose('Sơn đặt hai mươi đồng xuống phản gỗ rồi dùng hai ký muối cho mẻ cá.', 'ký tự收lỗi');
    const fixed = prose('Sơn đặt hai mươi đồng xuống phản gỗ rồi dùng hai ký muối cho mẻ cá.');
    const result = await executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, {
      invoke: async call => {
        if (call.role === 'writer') return JSON.stringify({
          title: 'Mẻ Cá Qua Mưa',
          scenes: writerScenes(contaminated),
        });
        if (call.role === 'writer_revision') return JSON.stringify({ patches: [{ spanId: 'span_001', replacement: fixed.slice(0, 650) }] });
        if (call.role === 'editor') {
          return JSON.stringify({
            status: 'pass', hardGates, qualityGates, issues: [],
            revisionInstructions: [],
            realizedDeltaEvidence: deltaEvidence(contaminated),
          });
        }
        return JSON.stringify(passAssessment(fixed));
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
        if (call.role === 'writer') return JSON.stringify(writerPayload(bad));
        return JSON.stringify({
          status: 'issues', hardGates, qualityGates: { ...qualityGates, prose_naturalness: false },
          issues: [{ gate: 'prose_naturalness', severity: 'moderate', message: 'Câu cục bộ phá giọng.', spanId: 'span_001', locality: 'local', repairMode: 'local_edit' }],
          revisionInstructions: ['Giữ nguyên câu này và cập nhật state tracking ở chương sau.'],
          realizedDeltaEvidence: deltaEvidence(bad),
        });
      },
    })).rejects.toThrow('mutating immutable story artifacts');
  });

  it('treats a pass assessment containing a false gate as a provider contract failure', async () => {
    const contexts = buildV3RoleContexts({ kernel: kernel(), arc, state: state(), plan: plan() });
    const content = prose('Sơn trả đủ chi phí rồi mới nhận kết quả của mẻ cá.');
    await expect(executeFlagshipV3Pipeline({
      kernel: kernel(), arc, state: state(), plan: plan(), targetWordCount: 1600, contexts,
    }, { invoke: async call => call.role === 'writer'
      ? JSON.stringify(writerPayload(content))
      : JSON.stringify({ status: 'pass', hardGates, qualityGates: { ...qualityGates, character_voice: false }, issues: [], revisionInstructions: [], realizedDeltaEvidence: deltaEvidence(content) })
    })).rejects.toThrow('violated its exact output contract');
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
      scenes: [{ ...base.scenes[0], requiredDeltaIds: [factDelta.id, knowledgeDelta.id] }],
      requiredDeltas: [factDelta, knowledgeDelta],
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
  it('fails setup when a mechanism or world claim lacks direct research provenance', () => {
    const snapshot = MarketResearchSnapshotV3Schema.parse({
      schemaVersion: 3,
      snapshotId: 'provenance_2026_07',
      genreLane: 'coastal_trade',
      refreshedAt: new Date().toISOString(),
      commission: {
        slotId: 'dt_01',
        audience: detailed('Độc giả thích nghề biển có logic và tiến bộ gia đình'),
        desiredExperience: detailed('Năng lực nghề nghiệp tạo thành quả có nguồn và có giới hạn'),
        domainOpportunity: detailed('Phân loại, làm lạnh và bán cá trong điều kiện thiếu vốn'),
        requiredMechanisms: [detailed('Phân loại cá'), detailed('Bảo quản có nguồn')],
        openingRequirements: [detailed('Main hành động sớm'), detailed('Có thành quả trước chương ba')],
        serialityRequirements: [detailed('Cơ chế đổi qua nhiều đầu ra'), detailed('Lợi thế giảm dần theo thời gian')],
        boundaries: ['không vật tư tự sinh', 'không kỹ thuật vô nguồn', 'không đối thủ ngu'],
      },
      sources: Array.from({ length: 3 }, (_, index) => ({
        id: `source_${index}`,
        url: `https://example.com/source-${index}`,
        title: `Nguồn kỹ thuật nghề biển số ${index}`,
        publisher: `Publisher ${index}`,
        observedAt: new Date().toISOString(),
      })),
      signals: Array.from({ length: 3 }, (_, index) => ({
        id: `signal_${index}`,
        claim: detailed(`Tín hiệu kỹ thuật có kiểm chứng số ${index}`),
        sourceIds: [`source_${index}`],
        confidence: 0.8,
      })),
      prohibitedDirectImitation: ['không sao chép tên', 'không sao chép nhân vật', 'không sao chép thế giới'],
    });
    const groundedKernel = StoryKernelV3Schema.parse({
      ...kernel(),
      concept: { ...kernel().concept, evidenceSignalIds: ['signal_0'] },
      worldClaims: kernel().worldClaims.map((claim, index) => ({ ...claim, sourceRef: `signal_${index % 3}` })),
    });
    const pack = {
      schemaVersion: 3 as const,
      selectedConceptId: 'candidate_grounded',
      kernel: groundedKernel,
      arc,
      initialState: state(),
      initialWindow: materializeRollingWindowV3({ kernel: groundedKernel, arc, state: state(), draft: validRollingDraft() }),
    };
    expect(() => validateLaunchPackResearchProvenanceV3(pack, snapshot)).not.toThrow();
    expect(() => validateLaunchPackResearchProvenanceV3({
      ...pack,
      kernel: StoryKernelV3Schema.parse({
        ...groundedKernel,
        concept: { ...groundedKernel.concept, evidenceSignalIds: ['unknown_signal'] },
      }),
    }, snapshot)).toThrow(/research provenance/i);
  });

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

describe('flagship v3 machine ensemble gate', () => {
  const projects = Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  const samples = projects.flatMap((projectId, projectIndex) => Array.from({ length: 10 }, (_, offset) => {
    const sampleIndex = projectIndex * 10 + offset;
    return {
      sampleId: `sample_${sampleIndex}`,
      projectId,
      chapterNumber: offset + 1,
      planDigest: 'a'.repeat(64),
      initialDraftDigest: 'b'.repeat(64),
      attempted: true,
      terminalStatus: 'publish' as const,
      sourceRunDigest: 'e'.repeat(64),
      schemaSuccess: true,
      planSuccess: true,
      infraSuccess: true,
      firstPassPublished: sampleIndex < 43,
      publishedWithinRepair: true,
      publishedCostUsd: 0.2,
      judgments: MACHINE_JUDGE_LINEAGES_V3.map(judgeLineage => ({
        judgeLineage,
        preferred: sampleIndex < 33 ? 'candidate' as const : 'control' as const,
        desireToReadNext: sampleIndex < 35,
        criticalContinuityViolation: false,
        evidence: [{ spanLabel: 'candidate' as const, excerpt: 'Một thay đổi nhân quả rõ ràng.', reason: 'Chương tạo tiến triển và áp lực đọc tiếp.' }],
      })),
    };
  }));

  it('requires a frozen 5x10 brief corpus', () => {
    const frozen = FrozenBriefCorpusV3Schema.parse({
      schemaVersion: 3,
      corpusVersion: 'frozen-v1',
      engineReleaseId: getFlagshipReleaseManifestV3().releaseId,
      launchPackDigests: Array.from({ length: 5 }, () => 'c'.repeat(64)),
      briefs: samples.map(sample => ({
        id: sample.sampleId,
        projectId: sample.projectId,
        chapterNumber: sample.chapterNumber,
        briefDigest: 'd'.repeat(64),
        planDigest: sample.planDigest,
        initialDraftDigest: sample.initialDraftDigest,
        brief: { chapterNumber: sample.chapterNumber },
      })),
    });
    expect(frozen.briefs).toHaveLength(50);
    expect(FrozenBriefCorpusV3Schema.safeParse({ ...frozen, briefs: frozen.briefs.slice(0, 49) }).success).toBe(false);
  });

  it('approves only complete three-lineage evidence with every fail-closed metric', () => {
    const corpus = MachineCalibrationCorpusV3Schema.parse({
      schemaVersion: 3,
      calibrationMode: 'machine_ensemble',
      campaignId: '10000000-0000-4000-8000-000000000001',
      corpusVersion: 'frozen-v1',
      promptVersion: 'binary-editor-v1',
      routeVersion: 'candidate-route-v1',
      engineReleaseId: getFlagshipReleaseManifestV3().releaseId,
      launchPackDigests: Array.from({ length: 5 }, () => 'c'.repeat(64)),
      samples,
    });
    expect(computeMachineCalibrationMetricsV3(corpus)).toMatchObject({
      sampleSize: 50,
      schemaSuccessRate: 1,
      planSuccessRate: 1,
      infraSuccessRate: 1,
      firstPassPublishRate: 0.86,
      withinRepairPublishRate: 1,
      candidateMajorityPreferenceRate: 0.66,
      desireToReadNextRate: 0.7,
      criticalContinuityViolations: 0,
      medianCostUsd: 0.2,
      maxCostUsd: 0.2,
      approved: true,
    });
    expect(MachineCalibrationCorpusV3Schema.safeParse({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 0
        ? { ...sample, judgments: sample.judgments.slice(0, 2) }
        : sample),
    }).success).toBe(false);
    const outage = MachineCalibrationCorpusV3Schema.parse({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 0 ? { ...sample, infraSuccess: false } : sample),
    });
    expect(computeMachineCalibrationMetricsV3(outage).approved).toBe(false);
    const critical = MachineCalibrationCorpusV3Schema.parse({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 0
        ? { ...sample, judgments: sample.judgments.map((judgment, judge) => ({ ...judgment, criticalContinuityViolation: judge < 2 })) }
        : sample),
    });
    expect(computeMachineCalibrationMetricsV3(critical).approved).toBe(false);
    const tie = MachineCalibrationCorpusV3Schema.parse({
      ...corpus,
      samples: corpus.samples.map((sample, index) => index === 0
        ? { ...sample, judgments: sample.judgments.map(judgment => ({ ...judgment, preferred: 'tie' as const })) }
        : sample),
    });
    expect(computeMachineCalibrationMetricsV3(tie)).toMatchObject({ candidateMajorityPreferenceRate: 0.64, approved: false });
  });
});

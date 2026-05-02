import {
  hasValidSetupKernel,
  shouldBlockWriterForMissingKernel,
  shouldResetUnwrittenMissingKernel,
} from '@/services/story-engine/pipeline/setup-kernel-guards';

const validKernel = {
  readerFantasy: 'Reader xem MC dùng tay nghề và dữ kiện nhỏ để thắng từng cơ hội địa phương.',
  protagonistEngine: 'MC thắng bằng năng lực nghề nghiệp, quan sát tốt và quyết định nhanh nhưng có giới hạn.',
  pleasureLoop: [
    'MC xử lý một việc thật',
    'world phản hồi bằng dữ kiện hoặc khách hàng',
    'hệ thống mở insight nhỏ',
    'MC tối ưu hành động',
    'người chứng kiến tạo công nhận/cơ hội mới',
  ],
  systemMechanic: {
    name: 'Sổ Tay Cơ Hội',
    input: 'một giao dịch hoặc nhiệm vụ thật',
    output: 'dữ kiện nhỏ có thể hành động ngay',
    limit: 'tối đa ba lần mỗi ngày',
    reward: 'doanh thu/công nhận/tài nguyên mới',
  },
  phase1Playground: {
    locations: ['quầy nhỏ', 'khu văn phòng'],
    cast: ['khách quen', 'người cung ứng'],
    resources: ['nguồn hàng', 'dữ liệu đơn hàng'],
    localAntagonists: ['đối thủ cùng phố'],
    repeatableSceneTypes: ['test sản phẩm', 'giao đơn', 'report-back khách quen'],
  },
  socialReactor: {
    witnesses: ['khách quen', 'đồng nghiệp'],
    reactionModes: ['đặt thêm', 'kể lại', 'giới thiệu'],
    reportBackCadence: 'mỗi 2-3 chương',
  },
  noveltyLadder: [
    { chapterRange: '1-20', newToy: 'đơn đầu tiên', keepsSameLane: 'vẫn phục vụ khách thật' },
    { chapterRange: '21-50', newToy: 'món mới', keepsSameLane: 'vẫn tối ưu sản phẩm' },
    { chapterRange: '51-100', newToy: 'nhân viên đầu tiên', keepsSameLane: 'vẫn mở rộng local' },
  ],
  controlRules: {
    payoffCadence: 'payoff nhỏ mỗi 1-3 chương',
    attentionGradient: 'khách quen trước, cả phố sau',
    openThreadsPerArc: 2,
    closeThreadsPerArc: 1,
  },
  patternCards: ['smooth_opportunity', 'casual_competence', 'audience_reaction'],
};

describe('setup kernel guards', () => {
  it('rejects init-write eligibility when setupKernel is missing', () => {
    expect(hasValidSetupKernel({ premise: 'thin outline' })).toBe(false);
    expect(shouldResetUnwrittenMissingKernel({
      currentChapter: 0,
      setupStage: 'ready_to_write',
      storyOutline: { premise: 'thin outline' },
    })).toBe(true);
  });

  it('accepts init-write eligibility when setupKernel is complete', () => {
    expect(hasValidSetupKernel({ setupKernel: validKernel })).toBe(true);
    expect(shouldResetUnwrittenMissingKernel({
      currentChapter: 0,
      setupStage: 'ready_to_write',
      storyOutline: { setupKernel: validKernel },
    })).toBe(false);
  });

  it('blocks chapter 1 writer preflight when setupKernel is missing', () => {
    expect(shouldBlockWriterForMissingKernel({
      currentChapter: 0,
      storyOutline: null,
    })).toBe(true);
  });

  it('blocks published missing-kernel projects without routing them to reset', () => {
    expect(shouldResetUnwrittenMissingKernel({
      currentChapter: 3,
      setupStage: 'writing',
      storyOutline: null,
    })).toBe(false);
    expect(shouldBlockWriterForMissingKernel({
      currentChapter: 3,
      storyOutline: null,
    })).toBe(true);
  });
});

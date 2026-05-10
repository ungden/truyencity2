import {
  applyFocusPresetTemplate,
  buildFocusPresetContext,
  getFocusPreset,
  validateFocusPresetContinuity,
  validateFocusPresetStorySetup,
} from '@/services/story-engine/codex-automation/focus-presets';
import { parseContinuityExtractionPayload } from '@/services/story-engine/codex-automation/contract';

function validSongXuyenSetup() {
  return {
    genres: ['di-gioi'],
    subGenres: ['isekai-trade', 'kinh-doanh', 'cultural-carry'],
    worldDescription: 'Chủ thế giới là Sài Gòn 2026 với chợ đầu mối, logistics lạnh, kiểm soát hải quan và dữ liệu giá theo ngày. Dị giới Aram có thương hội đá muối, thảo dược giữ nhiệt, luật cổng dịch chuyển giới hạn khối lượng mỗi lần và rủi ro bị quý tộc phát hiện. Hai thế giới có chênh lệch giá rõ: muối tinh, thuốc sát khuẩn, hạt giống, gia vị, vải kỹ thuật đổi lấy thảo dược, đá lưu nhiệt và hợp đồng bảo hộ. Giá biến động sau mỗi vòng giao dịch vì nguồn cung, phe phái và thương hội phản ứng.',
    setupKernel: {
      readerFantasy: 'MC song xuyên dùng trade ledger, inventory ledger, world-state ledger và logistics để buôn bán bù trừ giữa hai thế giới.',
      protagonistEngine: 'MC thắng bằng tồn kho, hậu cần, dữ liệu giá, bảo quản hàng hóa, quan hệ thương hội và kiểm soát rủi ro bị phát hiện.',
      pleasureLoop: ['phát hiện chênh lệch giá', 'gom nguồn hàng', 'vận chuyển qua cổng', 'đàm phán thương hội', 'ghi lợi nhuận và phản ứng thế giới'],
    },
    masterOutline: {
      arcs: [
        { name: 'Mở tuyến muối-thảo dược', payoff: 'ledger hai thế giới ổn định', scale: 'chợ nhỏ -> thương hội' },
        { name: 'Khủng hoảng nguồn cung', payoff: 'thương hiệu và faction trust tăng' },
      ],
    },
    storyOutline: {
      ledgers: ['trade ledger', 'inventory ledger', 'world-state drift'],
      rules: ['khối lượng cổng giới hạn', 'giá biến động nếu giao dịch lặp', 'không có hàng hóa không nguồn'],
    },
    arcPlan: [
      { chapter: 1, goal: 'mua muối tinh', conflict: 'vốn ít', payoff: 'đổi lấy thảo dược', hook: 'thương hội nghi ngờ nguồn hàng' },
      { chapter: 2, goal: 'vận chuyển đá lưu nhiệt', conflict: 'bảo quản khó', payoff: 'khách chủ thế giới trả giá cao', hook: 'giá Aram tăng' },
      { chapter: 3, goal: 'giữ bí mật cổng', conflict: 'người theo dõi', payoff: 'đổi route logistics', hook: 'phe quý tộc hỏi tên MC' },
    ],
  };
}

describe('focus presets', () => {
  it('selects the song-xuyen-trade genre/subgenre preset', () => {
    const preset = getFocusPreset('song-xuyen-trade');
    expect(preset).toMatchObject({
      primaryGenre: 'di-gioi',
      subGenres: ['isekai-trade', 'kinh-doanh', 'cultural-carry'],
    });
    expect(buildFocusPresetContext('song-xuyen-trade')).toContain('FOCUS PRESET: song-xuyen-trade');
  });

  it('applies song-xuyen-trade defaults to story templates', () => {
    const template = applyFocusPresetTemplate({ genres: ['do-thi'], coverPrompt: '' }, 'song-xuyen-trade');
    expect(template.genres).toEqual(['di-gioi']);
    expect(template.subGenres).toEqual(['isekai-trade', 'kinh-doanh', 'cultural-carry']);
    expect(template.focusKey).toBe('song-xuyen-trade');
  });

  it('passes a setup with two worlds, trade, logistics, inventory and world-state drift', () => {
    const report = validateFocusPresetStorySetup(validSongXuyenSetup(), 'song-xuyen-trade');
    expect(report.verdict).toBe('pass');
  });

  it('rejects setup missing the trade/world-state/inventory ladder', () => {
    const report = validateFocusPresetStorySetup({
      ...validSongXuyenSetup(),
      worldDescription: 'Một người xuyên qua dị giới rộng lớn, gặp nhiều cơ hội và dần mạnh lên nhờ may mắn.',
      setupKernel: { readerFantasy: 'MC mạnh dần', protagonistEngine: 'may mắn', pleasureLoop: ['gặp chuyện', 'thắng', 'nhận thưởng', 'đi tiếp'] },
      storyOutline: { premise: 'phiêu lưu' },
      masterOutline: { arcs: [{ name: 'phiêu lưu' }] },
      arcPlan: [{ chapter: 1, summary: 'khởi đầu' }],
    }, 'song-xuyen-trade');
    expect(report.verdict).toBe('revise');
    expect(report.issues.some((issue) => issue.code === 'focus_missing_trade_loop')).toBe(true);
  });

  it('blocks trade chapters when resource appears without source ledger', () => {
    const payload = parseContinuityExtractionPayload({
      summary: 'Lâm Việt mua một lô đá lưu nhiệt rồi bán lại ở chủ thế giới để lấy vốn mở tuyến giao dịch mới.',
      openingSentence: 'Cánh cổng mở ra sau lưng Lâm Việt như một vệt nước trong không khí.',
      mcState: 'Lâm Việt giữ được vốn sau giao dịch nhưng bị thương hội Aram chú ý.',
      cliffhanger: 'Giá đá lưu nhiệt ở Aram bất ngờ tăng ngay khi hắn quay lại.',
      readerPayoff: {
        tradeDividend: 'Lâm Việt có dữ liệu giá đá lưu nhiệt đầu tiên và một cơ hội lợi nhuận rõ.',
        progressionDelta: 'Hắn thêm vốn vận hành và biết giới hạn vận chuyển 12 viên mỗi lượt.',
        comfortOrSwaggerBeat: 'Hắn chốt được một vòng giao dịch nhỏ bằng ledger sạch.',
        nextProfitHook: 'Giá tăng mở cơ hội ký hợp đồng nguồn cung trước khi thương hội khóa hàng.',
      },
      characters: [{ characterName: 'Lâm Việt', status: 'alive' }],
      itemEvents: [],
      economicLedger: [],
      tradeLedger: [{
        sourceWorld: 'Aram',
        targetWorld: 'Sài Gòn',
        resourceName: 'đá lưu nhiệt',
        quantity: '12 viên',
        source: 'mua từ thương hội Aram',
        cost: '3 đồng bạc',
        expectedValue: 'bán thử cho kho lạnh',
        logisticsConstraint: 'mỗi lần chỉ mang được 12 viên',
        worldStateImpact: 'giá Aram tăng nhẹ vì thương hội chú ý',
      }],
      worldStateDeltas: [{
        worldName: 'Aram',
        deltaType: 'price',
        description: 'Thương hội tăng giá đá lưu nhiệt sau giao dịch lặp.',
        pressureChange: 'nghi ngờ nguồn cầu mới',
        relatedResources: ['đá lưu nhiệt'],
      }],
    });
    const report = validateFocusPresetContinuity(payload, 'song-xuyen-trade');
    expect(report.verdict).toBe('block');
    expect(report.issues.some((issue) => issue.code === 'focus_resource_without_source')).toBe(true);
  });

  it('passes trade continuity with item/economic/world-state ledgers', () => {
    const payload = parseContinuityExtractionPayload({
      summary: 'Lâm Việt mua đá lưu nhiệt ở Aram, ghi rõ nguồn hàng rồi bán thử cho một kho lạnh ở Sài Gòn.',
      openingSentence: 'Cánh cổng mở ra sau lưng Lâm Việt như một vệt nước trong không khí.',
      mcState: 'Lâm Việt có thêm vốn, một khách kho lạnh và áp lực bị thương hội Aram chú ý.',
      cliffhanger: 'Bảng giá đá lưu nhiệt ở Aram đổi ngay trong đêm.',
      readerPayoff: {
        tradeDividend: 'Lâm Việt lãi vòng đầu, có thêm vốn và một khách kho lạnh trả tiền thử.',
        progressionDelta: 'Hắn nâng từ thử hàng đơn lẻ lên quyền đàm phán nguồn đá lưu nhiệt.',
        comfortOrSwaggerBeat: 'Khách Sài Gòn công nhận đá lưu nhiệt giúp giảm chi phí kho lạnh.',
        nextProfitHook: 'Bảng giá Aram đổi trong đêm tạo cơ hội khóa giá bằng hợp đồng sớm.',
      },
      characters: [{ characterName: 'Lâm Việt', status: 'alive' }],
      itemEvents: [{ characterName: 'Lâm Việt', itemName: 'đá lưu nhiệt', eventType: 'picked', description: 'Mua từ thương hội Aram.', importance: 70 }],
      economicLedger: [{ entityName: 'Lâm Việt', assets: ['đá lưu nhiệt'], deltaSummary: 'Mua thử 12 viên đá lưu nhiệt để bán cho kho lạnh.', cashEstimate: 'giảm 3 đồng bạc', monthlyRevenue: null, teamSize: 0 }],
      tradeLedger: [{
        sourceWorld: 'Aram',
        targetWorld: 'Sài Gòn',
        resourceName: 'đá lưu nhiệt',
        quantity: '12 viên',
        source: 'mua từ thương hội Aram',
        cost: '3 đồng bạc',
        expectedValue: 'bán thử cho kho lạnh',
        logisticsConstraint: 'mỗi lần chỉ mang được 12 viên',
        worldStateImpact: 'giá Aram tăng nhẹ vì thương hội chú ý',
      }],
      worldStateDeltas: [{
        worldName: 'Aram',
        deltaType: 'price',
        description: 'Thương hội tăng giá đá lưu nhiệt sau giao dịch lặp.',
        pressureChange: 'nghi ngờ nguồn cầu mới',
        relatedResources: ['đá lưu nhiệt'],
      }],
    });
    expect(validateFocusPresetContinuity(payload, 'song-xuyen-trade').verdict).toBe('pass');
  });

  it('requires a visible trade/progression dividend for song-xuyen chapters', () => {
    const payload = parseContinuityExtractionPayload({
      summary: 'Lâm Việt bị thương hội nghi ngờ, bị tuần phòng hỏi giấy, bị khách ép giá và phải trì hoãn chuyến hàng.',
      openingSentence: 'Cánh cổng mở ra sau lưng Lâm Việt như một vệt nước trong không khí.',
      mcState: 'Lâm Việt chịu thêm rủi ro, áp lực tăng, hàng chưa bán và tuyến giao dịch chưa sạch.',
      cliffhanger: 'Một người lạ biết tuyến hàng của hắn.',
      characters: [{ characterName: 'Lâm Việt', status: 'alive' }],
      itemEvents: [{ characterName: 'Lâm Việt', itemName: 'đá lưu nhiệt', eventType: 'mentioned', description: 'Hàng chưa bán.', importance: 70 }],
      economicLedger: [{ entityName: 'Lâm Việt', assets: ['đá lưu nhiệt'], deltaSummary: 'Chưa bán được hàng, áp lực tăng.', cashEstimate: null, monthlyRevenue: null, teamSize: 0 }],
      tradeLedger: [{
        sourceWorld: 'Aram',
        targetWorld: 'Sài Gòn',
        resourceName: 'đá lưu nhiệt',
        quantity: '12 viên',
        source: 'mua từ thương hội Aram',
        cost: '3 đồng bạc',
        expectedValue: 'chưa rõ',
        logisticsConstraint: 'mỗi lần chỉ mang được 12 viên',
        worldStateImpact: 'thương hội nghi ngờ',
      }],
      worldStateDeltas: [{
        worldName: 'Aram',
        deltaType: 'risk',
        description: 'Thương hội nghi ngờ tuyến giao dịch.',
        pressureChange: 'áp lực tăng',
        relatedResources: ['đá lưu nhiệt'],
      }],
    });
    const report = validateFocusPresetContinuity(payload, 'song-xuyen-trade');
    expect(report.verdict).toBe('revise');
    expect(report.issues.some((issue) => issue.code === 'focus_reader_payoff_missing')).toBe(true);
  });
});

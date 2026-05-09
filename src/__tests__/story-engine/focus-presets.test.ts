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

function validThienDaoThuVienSetup() {
  return {
    genres: ['di-gioi'],
    subGenres: ['viet-van-sang-the', 'nho-dao', 'thien-dao-luu', 'vo-dao'],
    worldDescription: [
      'Đại Diễn Giới là dị giới võ đạo nơi ai cũng là võ giả, từ tiểu thương đến học sinh đều luyện khí huyết và công pháp cơ sở.',
      'Thiên Đạo Thư Viện treo trên chín tầng mây, công nhận Tác Gia qua Bạch Bút, Thanh Bút, Kim Bút, Tông Sư, Văn Thánh và Thiên Đạo Tác Gia.',
      'Sách được đăng lên thư viện; độc giả đọc sách rồi nhập tâm vào cảnh truyện để lĩnh ngộ võ công, công pháp, thân pháp, trận pháp, kiếm ý và binh pháp.',
      'Lâm Mặc xuyên qua với Vạn Văn Ký Ức, dùng kho văn minh Trái Đất gồm văn học, phim ảnh, game, thần thoại và lịch sử để tái cấu trúc bản thảo hợp luật Thiên Đạo.',
      'Văn hóa viết sách bản địa còn sơ khai, đơn nhất, văn phong bản địa thiếu hấp dẫn nên bảng xếp hạng Tân Tác Gia dễ bị chấn động bởi kỹ thuật kể chuyện hiện đại.',
      'Thiên Đạo phát điểm công nhận, danh vọng, ấn ký tác phẩm, quyền đăng và thư bình độc giả cho mỗi tác phẩm có người lĩnh ngộ.',
    ].join('\n'),
    setupKernel: {
      readerFantasy: 'Lâm Mặc dùng văn minh Trái Đất và kỹ thuật kể chuyện để làm Tác Gia được Thiên Đạo Thư Viện công nhận, khiến độc giả lĩnh ngộ võ đạo rồi trả lại danh vọng và tài nguyên.',
      protagonistEngine: 'MC thắng bằng Vạn Văn Ký Ức, chọn đúng tác phẩm, dị giới hóa bản thảo, đọc phản ứng độc giả và leo bảng Tân Tác Gia thay vì đánh nhau kéo dài.',
      pleasureLoop: ['chọn template Trái Đất', 'viết bản thảo hợp luật', 'đăng Thiên Đạo Thư Viện', 'độc giả nhập tâm lĩnh ngộ', 'bảng xếp hạng đổi', 'MC nhận điểm công nhận'],
    },
    masterOutline: {
      arcs: [
        { name: 'Bạch Bút chấn động', range: '1-50', payoff: 'Anh Hùng Xạ Điêu/Tam Quốc style giúp độc giả ngộ chưởng pháp, kiếm ý, binh pháp' },
        { name: 'Tân Tác Gia leo bảng', range: '51-150', payoff: 'Lâm Mặc có bút danh, thư bình và quyền đăng cấp cao' },
      ],
    },
    storyOutline: {
      premise: 'Tác Gia là VIP của võ đạo vì tác phẩm được Thiên Đạo Thư Viện công nhận có thể sinh võ học cho độc giả.',
      ledgers: ['tác phẩm đang viết', 'độc giả lĩnh ngộ', 'võ học phát sinh', 'danh vọng Thiên Đạo', 'bảng xếp hạng'],
      ladder: ['Bạch Bút', 'Thanh Bút', 'Kim Bút', 'Tông Sư', 'Văn Thánh', 'Thiên Đạo Tác Gia'],
    },
    arcPlan: [
      { chapter: 1, goal: 'Lâm Mặc đăng hồi đầu tiên', conflict: 'văn phong bản địa coi thường người mới', payoff: 'độc giả đầu tiên nhập tâm và ngộ chưởng pháp', hook: 'bảng Tân Tác Gia nhảy hạng' },
      { chapter: 20, goal: 'mở tuyến kiếm hiệp', conflict: 'Tác Gia cũ chê truyện quá nhiều nhân vật', payoff: 'độc giả ngộ kiếm ý', hook: 'Thiên Đạo cấp ấn ký Thanh Bút' },
      { chapter: 60, goal: 'mở binh pháp chiến tranh', conflict: 'học viện võ đạo tranh quyền diễn giải', payoff: 'faction quân viện xin quyền đọc', hook: 'bút danh của MC bị săn tìm' },
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

  it('accepts the thien-dao-thu-vien focus preset', () => {
    const preset = getFocusPreset('thien-dao-thu-vien');
    expect(preset).toMatchObject({
      primaryGenre: 'di-gioi',
      subGenres: ['viet-van-sang-the', 'nho-dao', 'thien-dao-luu', 'vo-dao'],
    });
    expect(buildFocusPresetContext('thien-dao-thu-vien')).toContain('Thiên Đạo Thư Viện');
    expect(applyFocusPresetTemplate({ genres: ['do-thi'], coverPrompt: '' }, 'thien-dao-thu-vien').focusKey).toBe('thien-dao-thu-vien');
  });

  it('passes a setup with two worlds, trade, logistics, inventory and world-state drift', () => {
    const report = validateFocusPresetStorySetup(validSongXuyenSetup(), 'song-xuyen-trade');
    expect(report.verdict).toBe('pass');
  });

  it('passes a thien-dao-thu-vien setup with author, library, reader enlightenment and martial ladders', () => {
    const report = validateFocusPresetStorySetup(validThienDaoThuVienSetup(), 'thien-dao-thu-vien');
    expect(report.verdict).toBe('pass');
  });

  it('rejects thien-dao-thu-vien setup missing library/author/reader enlightenment', () => {
    const report = validateFocusPresetStorySetup({
      ...validThienDaoThuVienSetup(),
      worldDescription: 'Lâm Mặc xuyên qua một dị giới rộng lớn rồi nhờ may mắn mạnh dần trong võ đạo.',
      setupKernel: { readerFantasy: 'MC mạnh dần', protagonistEngine: 'may mắn', pleasureLoop: ['gặp chuyện', 'thắng', 'nhận thưởng', 'đi tiếp'] },
      storyOutline: { premise: 'phiêu lưu' },
      masterOutline: { arcs: [{ name: 'phiêu lưu' }] },
      arcPlan: [{ chapter: 1, summary: 'khởi đầu' }],
    }, 'thien-dao-thu-vien');
    expect(report.verdict).toBe('revise');
    expect(report.issues.some((issue) => issue.code === 'focus_missing_heavenly_library')).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'focus_missing_reader_enlightenment')).toBe(true);
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

  it('passes thien-dao-thu-vien continuity when publication causes reader enlightenment and reputation payoff', () => {
    const payload = parseContinuityExtractionPayload({
      summary: 'Lâm Mặc đăng hồi đầu của Sơn Hà Xạ Nhật lên Thiên Đạo Thư Viện, khiến độc giả nhập tâm vào cảnh thiếu niên kéo cung và lĩnh ngộ Phá Vân Chưởng.',
      openingSentence: 'Chuông đồng của Thiên Đạo Thư Viện vang đúng lúc Lâm Mặc đặt bút xuống.',
      mcState: 'Lâm Mặc từ Bạch Bút vô danh nhận điểm công nhận đầu tiên, danh vọng tăng và có quyền đăng hồi tiếp theo.',
      cliffhanger: 'Bảng Tân Tác Gia nhảy tên Lâm Mặc lên vị trí thứ chín mươi chín.',
      readerPayoff: {
        tradeDividend: 'Lâm Mặc nhận điểm công nhận, danh vọng Bạch Bút và thư bình đầu tiên từ độc giả.',
        progressionDelta: 'Tác phẩm đầu tiên sinh ra võ học Phá Vân Chưởng, chứng minh Vạn Văn Ký Ức có thể tạo tác phẩm hợp luật Thiên Đạo.',
        comfortOrSwaggerBeat: 'Tác Gia cũ vừa chê văn phong nhiều tuyến đã thấy độc giả thật sự lĩnh ngộ.',
        nextProfitHook: 'Bảng Tân Tác Gia mở cửa cho hồi tiếp theo và kéo học viện võ đạo chú ý.',
      },
      characters: [{ characterName: 'Lâm Mặc', status: 'alive' }],
      itemEvents: [{ characterName: 'Lâm Mặc', itemName: 'Sơn Hà Xạ Nhật', eventType: 'mentioned', description: 'Tác phẩm đầu tiên được đăng lên Thiên Đạo Thư Viện.', importance: 90 }],
      economicLedger: [{ entityName: 'Lâm Mặc', assets: ['điểm công nhận', 'danh vọng Bạch Bút', 'quyền đăng hồi tiếp'], deltaSummary: 'Thiên Đạo công nhận tác phẩm đầu tiên và trao điểm công nhận.', cashEstimate: null, monthlyRevenue: null, teamSize: 0 }],
      plotThreads: [{ name: 'Sơn Hà Xạ Nhật mở màn', description: 'Tác phẩm kiếm hiệp/binh pháp đầu tiên của Lâm Mặc bắt đầu kéo độc giả nhập tâm.', priority: 'main', status: 'developing', relatedCharacters: ['Lâm Mặc'], importance: 80 }],
      worldStateDeltas: [{ worldName: 'Thiên Đạo Thư Viện', deltaType: 'culture', description: 'Một tác phẩm nhiều tuyến đầu tiên tạo lĩnh ngộ Phá Vân Chưởng cho độc giả.', pressureChange: 'văn đàn sơ khai bị chấn động', relatedResources: ['Phá Vân Chưởng', 'điểm công nhận'] }],
      factions: [{ factionName: 'Bảng Tân Tác Gia', factionType: 'guild', powerLevel: 60, description: 'Bảng xếp hạng ghi nhận tên Lâm Mặc sau lượt đọc đầu tiên.', alliances: [], rivalries: [], status: 'active', importance: 70 }],
    });
    expect(validateFocusPresetContinuity(payload, 'thien-dao-thu-vien').verdict).toBe('pass');
  });

  it('blocks thien-dao-thu-vien continuity when publication lacks reader/skill/reputation ledgers', () => {
    const payload = parseContinuityExtractionPayload({
      summary: 'Lâm Mặc đăng một tác phẩm mới lên Thiên Đạo Thư Viện rồi chờ đợi.',
      openingSentence: 'Lâm Mặc mở cửa thư viện.',
      mcState: 'Lâm Mặc vẫn là người mới chưa có phản hồi rõ.',
      cliffhanger: 'Một ánh sáng lạ hiện lên.',
      characters: [{ characterName: 'Lâm Mặc', status: 'alive' }],
      itemEvents: [],
      economicLedger: [],
      plotThreads: [],
      worldStateDeltas: [],
      factions: [],
    });
    const report = validateFocusPresetContinuity(payload, 'thien-dao-thu-vien');
    expect(report.verdict).toBe('block');
    expect(report.issues.some((issue) => issue.code === 'focus_work_delta_missing')).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'focus_reader_reaction_missing')).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'focus_skill_delta_missing')).toBe(true);
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

import type { GenreType } from '@/services/story-engine/types';
import {
  ALL_GENRE_TYPES,
  buildGenreKnowledgeContext,
  GENRE_KNOWLEDGE_PACK_VERSION,
  getGenreKnowledgePack,
  validateKnowledgeCoverage,
} from '@/services/story-engine/codex-automation/genre-knowledge';

const ALL_GENRES: GenreType[] = [
  'tien-hiep',
  'huyen-huyen',
  'do-thi',
  'kiem-hiep',
  'lich-su',
  'khoa-huyen',
  'vong-du',
  'dong-nhan',
  'mat-the',
  'linh-di',
  'quan-truong',
  'di-gioi',
  'ngon-tinh',
  'quy-tac-quai-dam',
  'ngu-thu-tien-hoa',
  'khoai-xuyen',
];

function validUrbanBusinessSetup() {
  return {
    title: 'Xưởng Mưa Đổi Vận',
    genres: ['do-thi'],
    subGenres: ['kinh-doanh'],
    worldDescription: 'Thành phố cảng An Hòa có khu phố cơ khí cũ, chợ vật tư, nhà cung cấp thép và đội khách hàng nhỏ bị ép giá theo từng hợp đồng. MC điều hành xưởng gia đình bằng dữ liệu giá, vốn lưu động, doanh thu từng đơn hàng, lợi nhuận biên và lịch giao xe. Đối thủ là đầu nậu nguyên liệu, chuỗi xưởng giá rẻ và một công ty logistics muốn khóa thị trường quận. Phase đầu xoay quanh xưởng, kho, quán cơm công nhân, khách hàng sửa máy, bảng báo giá và phản ứng cộng đồng khi MC tạo social proof bằng đơn hàng thật.',
    setupKernel: {
      readerFantasy: 'MC dùng năng lực nghề nghiệp, dữ liệu và phán đoán thị trường để cứu xưởng, tăng doanh thu và ký hợp đồng mới.',
      protagonistEngine: 'MC luôn chọn hành động đo được bằng dòng tiền, uy tín khách hàng và lợi ích cho gia đình.',
      pleasureLoop: ['nhìn thấy lỗ', 'kiểm dữ liệu', 'đàm phán', 'giao hàng', 'nhận payoff'],
      benefitLoop: { goal: 'giữ xưởng', action: 'chọn đơn hàng có biên lợi nhuận', benefit: 'doanh thu và khách quay lại', cadence: 'mỗi 1-3 chương' },
    },
    masterOutline: {
      arcs: [
        { name: 'Giữ xưởng', scale: 'cá nhân -> cửa hàng/xưởng', payoff: 'doanh thu dương' },
        { name: 'Mở chuỗi cung ứng quận', scale: 'khu phố/quận', payoff: 'hợp đồng ổn định' },
      ],
    },
    storyOutline: {
      coreLoop: 'market bottleneck -> unit-economics decision -> customer proof -> scale pressure',
      worldRules: ['không có tiền vô hạn', 'hợp đồng luôn có điều khoản trả giá'],
    },
    arcPlan: [
      { chapter: 1, goal: 'cứu hợp đồng đầu', conflict: 'giá vật tư tăng', payoff: 'giữ khách', hook: 'phát hiện dữ liệu bị sửa' },
      { chapter: 2, goal: 'đàm phán nhà cung cấp', conflict: 'vốn thiếu', payoff: 'giãn nợ', hook: 'đối thủ chặn nguồn' },
      { chapter: 3, goal: 'giao đơn thử', conflict: 'máy cũ lỗi', payoff: 'review tốt', hook: 'khách lớn gọi tới' },
    ],
  };
}

describe('genre knowledge core', () => {
  it('covers every GenreType with a knowledge pack', () => {
    expect(ALL_GENRE_TYPES).toEqual(ALL_GENRES);
    for (const genre of ALL_GENRES) {
      const pack = getGenreKnowledgePack(genre);
      expect(pack.version).toBe(GENRE_KNOWLEDGE_PACK_VERSION);
      expect(pack.benchmarkNovels.length).toBeGreaterThan(0);
      expect(pack.activationProfile.worldbuildingIngredients.length).toBeGreaterThan(2);
      expect(buildGenreKnowledgeContext(genre)).toContain('GENRE KNOWLEDGE CORE');
    }
  });

  it('merges subgenre overlays without overriding hard bans from the primary genre', () => {
    const base = getGenreKnowledgePack('do-thi');
    const merged = getGenreKnowledgePack('do-thi', ['kinh-doanh']);
    for (const ban of base.antiPatterns) {
      expect(merged.antiPatterns).toContain(ban);
    }
    expect(merged.antiPatterns.length).toBeGreaterThanOrEqual(base.antiPatterns.length);
    expect(merged.activationProfile.worldbuildingIngredients).toEqual(expect.arrayContaining(['doanh thu', 'hợp đồng', 'khách hàng']));
  });

  it('activates business metrics for do-thi + kinh-doanh', () => {
    const context = buildGenreKnowledgeContext('do-thi', ['kinh-doanh']);
    expect(context).toContain('doanh thu');
    expect(context).toContain('hợp đồng');
    expect(context).toContain('business');
    expect(validateKnowledgeCoverage(validUrbanBusinessSetup()).verdict).toBe('pass');
  });

  it('activates cultivation spine for tien-hiep', () => {
    const context = buildGenreKnowledgeContext('tien-hiep');
    expect(context).toContain('cảnh giới');
    expect(context).toContain('tông môn');
    expect(context).toContain('bí cảnh');
  });

  it('activates rule system and mystery cadence for linh-di and quy-tac-quai-dam', () => {
    const linhDi = buildGenreKnowledgeContext('linh-di');
    const quyTac = buildGenreKnowledgeContext('quy-tac-quai-dam');
    expect(linhDi).toContain('quy tắc');
    expect(linhDi).toContain('manh mối');
    expect(quyTac).toContain('quy tắc');
    expect(quyTac).toContain('puzzle');
  });

  it('rejects generic setup that does not align with the activated genre', () => {
    const report = validateKnowledgeCoverage({
      title: 'Cõi Mơ Không Tên',
      genres: ['tien-hiep'],
      worldDescription: 'Một thế giới rộng lớn có nhiều người mạnh và nhiều bí mật. Nhân vật chính đi phiêu lưu, gặp bạn bè, đánh bại kẻ thù và dần trở nên nổi tiếng.',
      setupKernel: {
        readerFantasy: 'MC mạnh dần và được nhiều người ngưỡng mộ.',
        protagonistEngine: 'MC có may mắn và luôn gặp cơ hội mới.',
        pleasureLoop: ['gặp chuyện', 'chiến đấu', 'nhận thưởng', 'đi tiếp'],
      },
      masterOutline: { arcs: [{ name: 'phiêu lưu', summary: 'đi nhiều nơi' }] },
      storyOutline: { premise: 'Một hành trình lớn.' },
      arcPlan: [{ chapter: 1, summary: 'khởi đầu' }, { chapter: 2, summary: 'gặp bạn' }, { chapter: 3, summary: 'đánh nhau' }],
    });
    expect(report.verdict).not.toBe('pass');
    expect(report.issues.some((issue) => issue.code === 'knowledge_worldbuilding_too_generic')).toBe(true);
  });

  it('blocks tired hard-ban openings at setup time', () => {
    const report = validateKnowledgeCoverage({
      ...validUrbanBusinessSetup(),
      worldDescription: `${validUrbanBusinessSetup().worldDescription} MC mất trí nhớ rồi bị đuổi khỏi nhà ở chương đầu.`,
    });
    expect(report.verdict).toBe('block');
    expect(report.issues.some((issue) => issue.code === 'knowledge_hard_ban')).toBe(true);
  });
});

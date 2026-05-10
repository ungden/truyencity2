import {
  assertFlashCheapArcRail,
  buildRoutineBrief,
  getRoutinePromptContext,
  hasFlashCheapChapterBrief,
  isFlashCheapHardCanonIssue,
  isFlashCheapHardIssue,
  parseFlashCheapWriterResponse,
  shouldUseFlashBulkCheapMode,
  trimFlashCheapContextSections,
} from '../../services/story-engine/pipeline/flash-cheap-routine';
import {
  isLikelyWorldTermCandidate,
  shouldSoftCastRosterForFocusKey,
} from '../../services/story-engine/quality/canon-enforcement';

describe('flash cheap routine', () => {
  it('parses writer JSON output', () => {
    const parsed = parseFlashCheapWriterResponse(JSON.stringify({
      title: 'Lưới Sương Thức Tỉnh',
      content: 'Lâm Duy mở Khởi Nguyên Biên Niên.\n\nMột chương dài.',
    }));
    expect(parsed.title).toBe('Lưới Sương Thức Tỉnh');
    expect(parsed.content).toContain('Lâm Duy');
  });

  it('keeps compact context within budget and preserves priority sections first', () => {
    const context = trimFlashCheapContextSections([
      { label: 'LOW', priority: 1, content: 'x'.repeat(5000) },
      { label: 'HIGH', priority: 10, content: 'important' },
    ], 1200);
    expect(context.length).toBeLessThanOrEqual(1200);
    expect(context).toContain('[HIGH]');
    expect(context.indexOf('[HIGH]')).toBeLessThan(context.indexOf('[LOW]'));
  });

  it('routes only enabled DS Flash routine chapters into cheap mode', () => {
    expect(shouldUseFlashBulkCheapMode({ flash_bulk_cheap_mode: true }, 'deepseek-v4-flash', 33, 600)).toBe(true);
    expect(shouldUseFlashBulkCheapMode({ flash_bulk_cheap_mode: true }, 'deepseek-v4-pro', 33, 600)).toBe(false);
    expect(shouldUseFlashBulkCheapMode({ flash_bulk_cheap_mode: true }, 'deepseek-v4-flash', 590, 600)).toBe(false);
  });

  it('blocks cheap mode when current arc rail is missing', () => {
    expect(() => assertFlashCheapArcRail(null, 43)).toThrow('FLASH_CHEAP_ARC_RAIL_MISSING');
  });

  it('blocks cheap mode when current chapter brief is missing', () => {
    const arc = {
      arc_number: 3,
      start_chapter: 41,
      end_chapter: 60,
      chapter_briefs: [{ chapterNumber: 42, brief: 'Previous chapter brief with enough detail.' }],
    };

    expect(hasFlashCheapChapterBrief(arc, 43)).toBe(false);
    expect(() => assertFlashCheapArcRail(arc, 43)).toThrow('FLASH_CHEAP_ARC_RAIL_INCOMPLETE');
  });

  it('allows cheap mode when current chapter brief exists', () => {
    const arc = {
      arc_number: 3,
      start_chapter: 41,
      end_chapter: 60,
      chapter_briefs: [{ chapterNumber: 43, brief: 'Current chapter has a concrete rail, payoff, and hook.' }],
    };

    expect(hasFlashCheapChapterBrief(arc, 43)).toBe(true);
    expect(() => assertFlashCheapArcRail(arc, 43)).not.toThrow();
  });

  it('uses focus-specific routine prompt context for thien-dao-thu-vien without leaking the Sang The prompt', () => {
    const context = getRoutinePromptContext({ focus_key: 'thien-dao-thu-vien' });
    expect(context).toContain('Thiên Đạo Thư Viện');
    expect(context).toContain('Tác Gia');
    expect(context).toContain('độc giả');
    expect(context).toContain('thức hải');
    expect(context).toContain('template ledger');
    expect(context).not.toContain('world-state Thần Vực');

    const brief = buildRoutineBrief({
      project: {
        id: 'project-id',
        novel_id: 'novel-id',
        world_description: 'Đại Diễn Giới có Thiên Đạo Thư Viện.',
        style_directives: { focus_key: 'thien-dao-thu-vien' },
      },
      novel: { id: 'novel-id', title: 'Thiên Đạo Thư Viện' },
      genre: 'di-gioi',
      protagonistName: 'Lâm Mặc',
      storyTitle: 'Thiên Đạo Thư Viện: Ta Dùng Văn Minh Trái Đất Phong Thần',
      nextChapter: 1,
      targetWordCount: 3000,
      totalPlanned: 1000,
      config: { model: 'deepseek-v4-flash', temperature: 0.75, maxTokens: 20000 },
      startTime: 0,
    });
    expect(brief).toContain('Vạn Văn Ký Ức');
    expect(brief).toContain('độc giả nhập tâm');
    expect(brief).toContain('giữ xương sống nguyên tác');
    expect(brief).toContain('Không nộp bản thảo vật lý');
    expect(brief).not.toContain('Khởi Nguyên Biên Niên');
  });

  it('soft gate ignores style pacing but blocks hard continuity/canon issues', () => {
    expect(isFlashCheapHardIssue({ code: 'low_dialogue', severity: 'moderate', message: 'thin' })).toBe(false);
    expect(isFlashCheapHardIssue({ code: 'severe_repetition', severity: 'major', message: 'repeated phrase' })).toBe(false);
    expect(isFlashCheapHardIssue({ code: 'low_payoff', severity: 'major', message: 'missing payoff' })).toBe(true);
    expect(isFlashCheapHardIssue({ type: 'continuity', severity: 'major', description: 'dead character returned' })).toBe(true);
    expect(isFlashCheapHardIssue({ type: 'quality', severity: 'moderate', description: 'style issue' })).toBe(false);
  });

  it('keeps cast-roster heuristic soft in cheap routine while blocking real continuity errors', () => {
    expect(isFlashCheapHardCanonIssue({
      type: 'continuity',
      severity: 'major',
      description: '17 tên nhân vật MỚI xuất hiện trong chương này không có trong cast roster: Mưu Dưới Ánh Trăng, Tần Vân, Phục Ma Thập.',
    })).toBe(false);
    expect(isFlashCheapHardCanonIssue({
      type: 'continuity',
      severity: 'critical',
      description: 'dead character returned with no established mechanism',
    })).toBe(true);
  });

  it('keeps cast-roster heuristic soft for focused long-form routine projects', () => {
    expect(shouldSoftCastRosterForFocusKey('thien-dao-thu-vien')).toBe(true);
    expect(shouldSoftCastRosterForFocusKey('sang-the-than-minh')).toBe(true);
    expect(shouldSoftCastRosterForFocusKey('song-xuyen-trade')).toBe(false);
  });

  it('filters world terms that look like capitalized character names', () => {
    expect(isLikelyWorldTermCandidate('Vạn Tượng Ký Ức')).toBe(true);
    expect(isLikelyWorldTermCandidate('Thần Vực')).toBe(true);
    expect(isLikelyWorldTermCandidate('Lưới Sương Một Giọt')).toBe(true);
    expect(isLikelyWorldTermCandidate('Sa Tinh Lưỡng Tính')).toBe(true);
    expect(isLikelyWorldTermCandidate('Hang Luyện Hỏa Cấp')).toBe(true);
    expect(isLikelyWorldTermCandidate('Hỏa Lô Cộng Đồng')).toBe(true);
    expect(isLikelyWorldTermCandidate('Khiên Hợp Kim')).toBe(true);
    expect(isLikelyWorldTermCandidate('Tinh Thể Băng')).toBe(true);
    expect(isLikelyWorldTermCandidate('Lõi Pháp Tắc Băng')).toBe(true);
    expect(isLikelyWorldTermCandidate('Băng Nguyên Sơ Thủy')).toBe(true);
    expect(isLikelyWorldTermCandidate('Xương Thú Băng')).toBe(true);
    expect(isLikelyWorldTermCandidate('Thiên Đạo Thư Viện')).toBe(true);
    expect(isLikelyWorldTermCandidate('Bạch Bút')).toBe(true);
    expect(isLikelyWorldTermCandidate('Tác Gia')).toBe(true);
    expect(isLikelyWorldTermCandidate('Trái Đất')).toBe(true);
    expect(isLikelyWorldTermCandidate('Sơn Hà Xạ Nhật')).toBe(true);
    expect(isLikelyWorldTermCandidate('Mưu Dưới Ánh Trăng')).toBe(true);
    expect(isLikelyWorldTermCandidate('Phục Ma Thập Bát Chưởng')).toBe(true);
  });
});

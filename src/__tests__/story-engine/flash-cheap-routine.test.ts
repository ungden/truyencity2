import {
  assertFlashCheapArcRail,
  hasFlashCheapChapterBrief,
  isFlashCheapHardIssue,
  parseFlashCheapWriterResponse,
  shouldUseFlashBulkCheapMode,
  trimFlashCheapContextSections,
} from '../../services/story-engine/pipeline/flash-cheap-routine';
import { isLikelyWorldTermCandidate } from '../../services/story-engine/quality/canon-enforcement';

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

  it('soft gate ignores style pacing but blocks hard continuity/canon issues', () => {
    expect(isFlashCheapHardIssue({ code: 'low_dialogue', severity: 'moderate', message: 'thin' })).toBe(false);
    expect(isFlashCheapHardIssue({ code: 'severe_repetition', severity: 'major', message: 'repeated phrase' })).toBe(false);
    expect(isFlashCheapHardIssue({ code: 'weak_ending_hook', severity: 'moderate', message: 'thin hook' })).toBe(false);
    expect(isFlashCheapHardIssue({ code: 'low_payoff', severity: 'major', message: 'missing payoff' })).toBe(true);
    expect(isFlashCheapHardIssue({ type: 'continuity', severity: 'major', description: 'dead character returned' })).toBe(true);
    expect(isFlashCheapHardIssue({ type: 'quality', severity: 'moderate', description: 'style issue' })).toBe(false);
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
    expect(isLikelyWorldTermCandidate('Thời Không Gia Tốc')).toBe(true);
    expect(isLikelyWorldTermCandidate('Mảnh Thần Cách')).toBe(true);
    expect(isLikelyWorldTermCandidate('Hỏa Diễm Thời Không')).toBe(true);
    expect(isLikelyWorldTermCandidate('State Ledger')).toBe(true);
  });

});

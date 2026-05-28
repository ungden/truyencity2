/**
 * Unit tests for the Phase-1 quality feedback additions:
 *   - quality/continuity-guardian-fast.ts  (deterministic guardian telemetry)
 *   - quality/corrective-directive.ts       (prev-chapter corrective feedback)
 *
 * Both are deterministic (no AI) and only read DB rows, so we mock getSupabase
 * with a chainable query builder whose terminal result is set per-table.
 */

// `var` so the declaration is hoisted above the jest.mock factory; the `mock`
// prefix is required for jest to allow referencing it from the factory.
var mockTableResults: Record<string, { data: unknown }> = {};

jest.mock('../../services/story-engine/utils/supabase', () => {
  const builderMethods = ['select', 'eq', 'lte', 'lt', 'gt', 'gte', 'order', 'limit', 'in', 'neq', 'or'];
  const makeBuilder = (result: { data: unknown }) => {
    const b: Record<string, unknown> = {};
    for (const m of builderMethods) b[m] = () => b;
    b.maybeSingle = () => Promise.resolve(result);
    b.single = () => Promise.resolve(result);
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return b;
  };
  return {
    getSupabase: () => ({
      from: (table: string) => makeBuilder(mockTableResults[table] ?? { data: null }),
    }),
  };
});

import { runContinuityGuardianFast } from '../../services/story-engine/quality/continuity-guardian-fast';
import { buildCorrectiveDirective } from '../../services/story-engine/quality/corrective-directive';

beforeEach(() => {
  mockTableResults = {};
});

describe('runContinuityGuardianFast', () => {
  it('returns empty before SKIP_BEFORE_CHAPTER (ch.10)', async () => {
    const report = await runContinuityGuardianFast('p1', 5, 'bất kỳ nội dung nào');
    expect(report.issues).toEqual([]);
    expect(report.contradictions).toEqual([]);
  });

  it('flags a dead character taking a living action (no flashback)', async () => {
    mockTableResults['character_states'] = {
      data: [{ character_name: 'Lý Mạnh', chapter_number: 8 }],
    };
    mockTableResults['plot_threads'] = { data: [] };
    const content = 'Lý Mạnh bước vào sảnh và nói lớn rằng hắn đã trở lại.';
    const report = await runContinuityGuardianFast('p1', 20, content);
    const dead = report.issues.find(i => i.type === 'dead_character');
    expect(dead).toBeDefined();
    expect(dead?.severity).toBe('critical');
    // telemetry-only: never auto-revises (checkConsistencyFast already raises it)
    expect(report.contradictions).toEqual([]);
  });

  it('does NOT flag a dead character mentioned only inside a flashback', async () => {
    mockTableResults['character_states'] = {
      data: [{ character_name: 'Lý Mạnh', chapter_number: 8 }],
    };
    mockTableResults['plot_threads'] = { data: [] };
    const content = 'Hồi tưởng lại năm xưa, hình bóng Lý Mạnh thoáng hiện trong ký ức của hắn.';
    const report = await runContinuityGuardianFast('p1', 20, content);
    expect(report.issues.find(i => i.type === 'dead_character')).toBeUndefined();
  });

  it('flags a resolved multi-word subplot reopened without [CALLBACK]', async () => {
    mockTableResults['character_states'] = { data: [] };
    mockTableResults['plot_threads'] = {
      data: [{ name: 'Bí mật thân thế Lương Hạo', last_active_chapter: 12 }],
    };
    const content = 'Câu chuyện hôm nay lại xoay quanh Bí mật thân thế Lương Hạo một lần nữa.';
    const report = await runContinuityGuardianFast('p1', 30, content);
    const reopen = report.issues.find(i => i.type === 'subplot_reopen');
    expect(reopen).toBeDefined();
    expect(reopen?.severity).toBe('moderate');
  });

  it('does NOT flag subplot reopen when [CALLBACK] marker is present', async () => {
    mockTableResults['character_states'] = { data: [] };
    mockTableResults['plot_threads'] = {
      data: [{ name: 'Bí mật thân thế Lương Hạo', last_active_chapter: 12 }],
    };
    const content = '[CALLBACK] Bí mật thân thế Lương Hạo được nhắc lại có chủ đích.';
    const report = await runContinuityGuardianFast('p1', 30, content);
    expect(report.issues.find(i => i.type === 'subplot_reopen')).toBeUndefined();
  });

  it('ignores short / single-word thread names (false-positive guard)', async () => {
    mockTableResults['character_states'] = { data: [] };
    mockTableResults['plot_threads'] = {
      data: [{ name: 'Thù', last_active_chapter: 12 }],
    };
    const content = 'Mối Thù xưa vẫn còn đó.';
    const report = await runContinuityGuardianFast('p1', 30, content);
    expect(report.issues.find(i => i.type === 'subplot_reopen')).toBeUndefined();
  });
});

describe('buildCorrectiveDirective', () => {
  it('returns empty string when there is no prior data', async () => {
    const out = await buildCorrectiveDirective('p1', 10);
    expect(out).toBe('');
  });

  it('returns empty for chapter 0 (nothing before it)', async () => {
    const out = await buildCorrectiveDirective('p1', 0);
    expect(out).toBe('');
  });

  it('returns empty when previous chapter scored well and no issues', async () => {
    mockTableResults['quality_metrics'] = {
      data: { chapter_number: 9, overall_score: 8, dopamine_score: 8, pacing_score: 7, ending_hook_score: 7, guardian_issues_critical: 0, contradictions_critical: 0 },
    };
    mockTableResults['voice_fingerprints'] = { data: { anti_patterns: [] } };
    const out = await buildCorrectiveDirective('p1', 9);
    expect(out).toBe('');
  });

  it('emits a corrective block naming weak dimensions on a low-scoring chapter', async () => {
    mockTableResults['quality_metrics'] = {
      data: { chapter_number: 9, overall_score: 4, dopamine_score: 3, pacing_score: 8, ending_hook_score: 8, guardian_issues_critical: 0, contradictions_critical: 0 },
    };
    mockTableResults['voice_fingerprints'] = { data: { anti_patterns: [] } };
    const out = await buildCorrectiveDirective('p1', 9);
    expect(out).toContain('[SỬA LỖI CHƯƠNG TRƯỚC');
    expect(out).toContain('tổng thể');
    expect(out).toContain('dopamine');
    expect(out).not.toContain('hook kết chương'); // ending_hook_score=8 is fine
  });

  it('flags critical guardian issues from the previous chapter', async () => {
    mockTableResults['quality_metrics'] = {
      data: { chapter_number: 9, overall_score: 7, dopamine_score: 7, pacing_score: 7, ending_hook_score: 7, guardian_issues_critical: 2, contradictions_critical: 0 },
    };
    mockTableResults['voice_fingerprints'] = { data: { anti_patterns: [] } };
    const out = await buildCorrectiveDirective('p1', 9);
    expect(out).toContain('lỗi liên tục nghiêm trọng');
  });

  it('surfaces detected voice anti-patterns', async () => {
    mockTableResults['quality_metrics'] = { data: null };
    mockTableResults['voice_fingerprints'] = { data: { anti_patterns: ['lặp cụm "ánh mắt sắc lạnh"', 'mở đầu bằng "Bỗng nhiên"'] } };
    const out = await buildCorrectiveDirective('p1', 9);
    expect(out).toContain('anti-pattern giọng văn');
    expect(out).toContain('ánh mắt sắc lạnh');
  });
});

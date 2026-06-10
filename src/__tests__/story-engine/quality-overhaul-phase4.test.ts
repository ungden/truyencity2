/**
 * Quality Overhaul Phase 4 — prompt modules + audit runner unit tests.
 *
 * Run: npm test -- quality-overhaul-phase4
 */

import { assemblePromptModules, listPromptModules } from '@/services/story-engine/pipeline/prompt-modules';
import { analyzeStructure } from '@/services/story-engine/quality/audit-runner';

describe('4.1 prompt modules', () => {
  it('registry exposes the hard-bans recap at dynamic_end', () => {
    const mods = listPromptModules();
    expect(mods.some(m => m.id === 'hard-bans-recap' && m.placement === 'dynamic_end')).toBe(true);
  });

  it('recap includes cliffhanger ban + dopamine floor', () => {
    const text = assemblePromptModules('dynamic_end', { chapterNumber: 50 });
    expect(text).toContain('RECAP CUỐI');
    expect(text).toContain('ván cờ');
    expect(text).toContain('dopamine peaks');
  });

  it('chapter 1 gets golden-chapter guidance, later chapters get bridge guidance', () => {
    const ch1 = assemblePromptModules('dynamic_end', { chapterNumber: 1 });
    expect(ch1).toContain('golden finger ACTIVE');
    const ch50 = assemblePromptModules('dynamic_end', { chapterNumber: 50 });
    expect(ch50).toContain('TIẾP DIỄN cliffhanger');
  });

  it('non-combat flag appends the no-physical-fight rule', () => {
    const text = assemblePromptModules('dynamic_end', { chapterNumber: 10, flags: { nonCombat: true } });
    expect(text).toContain('PHI-COMBAT');
    const combat = assemblePromptModules('dynamic_end', { chapterNumber: 10, flags: { nonCombat: false } });
    expect(combat).not.toContain('PHI-COMBAT');
  });

  it('returns empty string for placements with no modules', () => {
    expect(assemblePromptModules('system', { chapterNumber: 10 })).toBe('');
  });
});

describe('4.2 analyzeStructure', () => {
  it('clean structure → low risk', () => {
    const s = analyzeStructure([1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e'], new Set([1, 2, 3, 4, 5]));
    expect(s.gap_count).toBe(0);
    expect(s.missing_summary_count).toBe(0);
    expect(s.duplicate_title_count).toBe(0);
    expect(s.structural_risk).toBe('low');
  });

  it('chapter gaps → high risk', () => {
    const s = analyzeStructure([1, 2, 4, 5], ['a', 'b', 'c', 'd'], new Set([1, 2, 4, 5]));
    expect(s.gap_count).toBe(1);
    expect(s.structural_risk).toBe('high');
  });

  it('many missing summaries → medium risk', () => {
    const s = analyzeStructure([1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e'], new Set([1, 2]));
    expect(s.missing_summary_count).toBe(3);
    expect(s.structural_risk).toBe('medium');
  });

  it('counts duplicate titles', () => {
    const s = analyzeStructure([1, 2, 3], ['Trùng tên', 'Trùng tên', 'Khác'], new Set([1, 2, 3]));
    expect(s.duplicate_title_count).toBe(1);
  });
});

/**
 * Author steering directives — unit tests for formatAuthorDirectives.
 *
 * The directive is a free-text instruction (style_directives.author_directives)
 * injected into the Architect, Writer AND Critic prompts every chapter so an
 * admin can course-correct a running auto-novel without code/outline edits.
 *
 * Run: npm test -- author-directives
 */

import { formatAuthorDirectives } from '@/services/story-engine/pipeline/chapter-writer-helpers';

describe('formatAuthorDirectives', () => {
  const DIR = 'Giảm tuyến tình cảm phụ, tập trung tu luyện.';

  it('returns empty string for empty / whitespace / nullish input (no-op interpolation)', () => {
    expect(formatAuthorDirectives(undefined, 'writer')).toBe('');
    expect(formatAuthorDirectives(null, 'writer')).toBe('');
    expect(formatAuthorDirectives('', 'architect')).toBe('');
    expect(formatAuthorDirectives('   \n  ', 'critic')).toBe('');
  });

  it('includes the directive body and the AUTHOR DIRECTIVES marker when set', () => {
    const out = formatAuthorDirectives(DIR, 'writer');
    expect(out).toContain('[CHỈ ĐẠO TÁC GIẢ — AUTHOR DIRECTIVES]');
    expect(out).toContain(DIR);
  });

  it('frames architect/writer as a priority directive but critic as a compliance check', () => {
    const writer = formatAuthorDirectives(DIR, 'writer');
    const architect = formatAuthorDirectives(DIR, 'architect');
    const critic = formatAuthorDirectives(DIR, 'critic');

    expect(writer).toContain('ƯU TIÊN TUYỆT ĐỐI');
    expect(architect).toContain('ƯU TIÊN TUYỆT ĐỐI');

    expect(critic).not.toContain('ƯU TIÊN TUYỆT ĐỐI');
    expect(critic).toContain('KIỂM TRA TUÂN THỦ');
    expect(critic).toContain('requiresRewrite=true');
  });

  it('does not let a directive break canon/continuity (architect/writer carve-out)', () => {
    const out = formatAuthorDirectives(DIR, 'architect');
    expect(out).toContain('KHÔNG được phá vỡ canon/continuity');
  });

  it('truncates over-long directives so the block cannot crowd out the prompt', () => {
    const long = 'A'.repeat(5000);
    const out = formatAuthorDirectives(long, 'writer', 1500);
    expect(out).toContain('…[cắt bớt]');
    // Body capped at maxChars; full 5000 chars never appear verbatim.
    expect(out).not.toContain('A'.repeat(1600));
  });

  it('keeps short directives verbatim (no truncation marker)', () => {
    const out = formatAuthorDirectives(DIR, 'writer', 1500);
    expect(out).not.toContain('…[cắt bớt]');
  });
});

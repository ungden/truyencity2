import { capWorldDescription } from '@/services/story-engine/context/world-description-cap';

describe('capWorldDescription', () => {
  it('returns text unchanged when under budget', () => {
    const text = 'Premise ngắn gọn.\n- Quy tắc 1';
    expect(capWorldDescription(text, 8000)).toBe(text);
  });

  it('keeps late rule lines that a blind head-slice would drop', () => {
    const filler = 'x'.repeat(50);
    // 200 prose lines of filler, then a rule line at the very end.
    const proseBlock = Array.from({ length: 200 }, (_, i) => `${filler} dòng ${i}`).join('\n');
    const lateRule = '- Quy tắc tối hậu: Bàn Tay Vàng kích hoạt ở chương cuối';
    const text = `${proseBlock}\n${lateRule}`;
    const budget = 2000;

    expect(text.length).toBeGreaterThan(budget);
    const blindSlice = text.slice(0, budget);
    expect(blindSlice).not.toContain('Quy tắc tối hậu'); // proof the hazard is real

    const capped = capWorldDescription(text, budget);
    expect(capped).toContain('Quy tắc tối hậu'); // rule survives
    expect(capped.length).toBeLessThanOrEqual(budget);
  });

  it('never exceeds the budget', () => {
    const text = Array.from({ length: 500 }, (_, i) => `Phase ${i}: nội dung dài dòng ${'y'.repeat(40)}`).join('\n');
    const capped = capWorldDescription(text, 3000);
    expect(capped.length).toBeLessThanOrEqual(3000);
  });

  it('falls back to a head slice when a single line exceeds budget', () => {
    const oneLongLine = 'z'.repeat(20000); // no newlines, no rule markers
    const capped = capWorldDescription(oneLongLine, 8000);
    expect(capped).toBe(oneLongLine.slice(0, 8000));
  });

  it('preserves original line order', () => {
    const text = [
      'Mở đầu premise.',
      'x'.repeat(3000),
      '- Quy tắc A',
      'y'.repeat(3000),
      '- Quy tắc B',
    ].join('\n');
    const capped = capWorldDescription(text, 4000);
    expect(capped.indexOf('Quy tắc A')).toBeLessThan(capped.indexOf('Quy tắc B'));
  });
});

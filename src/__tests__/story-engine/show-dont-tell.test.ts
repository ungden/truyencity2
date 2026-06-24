/**
 * Show-don't-tell — deterministic backstop for CRITIC_SYSTEM S8 (raw
 * emotion-naming). Flags terse narration that STATES a feeling with no
 * body/voice/environment carrier; leaves shown emotion and dialogue alone.
 *
 * Run: npm test -- show-dont-tell
 */

import { detectRawEmotionTelling } from '@/services/story-engine/pipeline/chapter-writer-helpers';

describe('detectRawEmotionTelling', () => {
  it('flags many carrier-less telly sentences as major', () => {
    const content = [
      'Hắn cảm thấy rất vui.',
      'Nàng vô cùng tức giận.',
      'Cô rất buồn.',
      'Gã cảm thấy sợ hãi.',
      'Anh thật sự thất vọng.',
      'Hắn cực kỳ hồi hộp.',
      'Nàng cảm thấy hạnh phúc.',
      'Cô vô cùng lo lắng.',
    ].join('\n');
    const r = detectRawEmotionTelling(content);
    expect(r.severity).toBe('major');
    expect(r.count).toBeGreaterThan(7);
    expect(r.message).toContain("SHOW DON'T TELL");
  });

  it('flags a moderate amount as moderate', () => {
    const content = [
      'Hắn cảm thấy rất vui.',
      'Nàng vô cùng tức giận.',
      'Cô rất buồn.',
      'Gã cảm thấy sợ hãi.',
      'Anh thật sự thất vọng.',
    ].join('\n');
    const r = detectRawEmotionTelling(content);
    expect(r.severity).toBe('moderate');
    expect(r.count).toBe(5);
  });

  it('does NOT flag emotion shown through a physical/voice carrier', () => {
    const content = [
      'Hắn siết chặt nắm tay, rất tức giận.',
      'Tim nàng đập dồn, cô vô cùng hồi hộp.',
      'Giọng anh nghẹn lại, thật sự đau khổ.',
      'Mặt gã tái đi, cực kỳ sợ hãi.',
      'Cô cắn môi, rất buồn.',
    ].join('\n');
    const r = detectRawEmotionTelling(content);
    expect(r.severity).toBe('none');
    expect(r.count).toBe(0);
  });

  it('ignores dialogue lines (em-dash) — characters may name feelings aloud', () => {
    const content = [
      '— Tôi rất vui khi gặp lại anh.',
      '— Em vô cùng tức giận với anh đấy.',
      '— Thật sự thất vọng về cậu.',
      '— Tớ cực kỳ lo lắng.',
      '— Mình rất buồn.',
      '— Anh quá hồi hộp rồi.',
    ].join('\n');
    const r = detectRawEmotionTelling(content);
    expect(r.severity).toBe('none');
  });

  it('does NOT flag environmental tension with no person subject', () => {
    const content = [
      'Không khí vô cùng nặng nề trong căn phòng.',
      'Bầu trời rất buồn, mây xám phủ kín.',
      'Cả thành phố cực kỳ yên tĩnh.',
    ].join('\n');
    const r = detectRawEmotionTelling(content);
    // "nặng nề"/"yên tĩnh" aren't named emotions and there's no person subject.
    expect(r.count).toBe(0);
  });

  it('treats a clean shown-emotion chapter as none', () => {
    const content =
      'Hắn bước vào phòng, đặt hợp đồng lên bàn. Lương Hạo nhíu mày khi thấy con số. ' +
      'Bàn tay anh gõ nhịp lên mặt gỗ, từng tiếng đều đặn. ' +
      '— Giá này không hợp lý, anh nói, ánh nhìn khóa chặt vào đối phương.';
    const r = detectRawEmotionTelling(content);
    expect(r.severity).toBe('none');
  });
});

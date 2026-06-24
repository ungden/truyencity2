/**
 * Prose-craft deterministic gates (Phase R+):
 *   - detectSentenceRhythmMonotony — within-chapter metronomic prose
 *   - detectFlatDialogue           — undifferentiated dialogue texture
 *   - detectBlandSensoryCliche     — sensory present-but-bland
 *
 * Run: npm test -- prose-craft-gates
 */

import {
  detectSentenceRhythmMonotony,
  detectFlatDialogue,
} from '@/services/story-engine/pipeline/chapter-writer-helpers';
import { detectBlandSensoryCliche } from '@/services/story-engine/quality/sensory-balance';

describe('detectSentenceRhythmMonotony', () => {
  it('flags 40+ same-length sentences as moderate', () => {
    const sentence = 'Hắn đi tới cửa hàng nhỏ ven con đường vắng.'; // 10 words
    const content = Array.from({ length: 45 }, () => sentence).join(' ');
    const r = detectSentenceRhythmMonotony(content);
    expect(r.severity).toBe('moderate');
    expect(r.cv).toBeLessThan(0.38);
  });

  it('does NOT flag prose that mixes short and long sentences', () => {
    const short = 'Hắn dừng.';
    const long =
      'Trong căn phòng rộng lớn ngập tràn ánh nắng buổi sớm, hắn chậm rãi bước tới bên cửa sổ rồi đưa tay mở tung cánh cửa gỗ cũ kỹ ra ngoài.';
    const content = Array.from({ length: 20 }, () => `${short} ${long}`).join(' ');
    const r = detectSentenceRhythmMonotony(content);
    expect(r.severity).toBe('none');
    expect(r.cv).toBeGreaterThan(0.38);
  });

  it('skips short samples (<40 sentences)', () => {
    const r = detectSentenceRhythmMonotony('Hắn đi. Cô về. Trời mưa.');
    expect(r.severity).toBe('none');
  });
});

describe('detectFlatDialogue', () => {
  it('flags many uniform, tone-less, low-variety dialogue lines as moderate', () => {
    // Small vocabulary, all declarative, ~6 words each → low TTR, no ?/!.
    const line = '— Chúng ta cần đi tới chỗ đó.';
    const content = Array.from({ length: 14 }, () => line).join('\n');
    const r = detectFlatDialogue(content);
    expect(r.severity).toBe('moderate');
    expect(r.dialogueLines).toBe(14);
  });

  it('does NOT flag dialogue with questions, exclamations and varied lengths', () => {
    const content = [
      '— Cậu điên rồi à?!',
      '— Tôi đã suy nghĩ rất kỹ về toàn bộ kế hoạch phức tạp này từ đầu chí cuối.',
      '— Không.',
      '— Vậy anh định làm gì bây giờ, hả Lương Hạo?',
      '— Để tôi tính.',
      '— Trời ơi, sao lại thành ra thế này được chứ!',
      '— Im đi.',
      '— Anh chắc chắn chuyện này sẽ ổn thỏa chứ, hay lại hỏng bét như lần trước?',
      '— Tin tôi.',
      '— Tuyệt vời, vậy chúng ta bắt đầu ngay thôi nào các huynh đệ ơi!',
      '— Khoan đã.',
      '— Còn khoản tiền kia thì sao, ai sẽ chịu trách nhiệm đây?',
      '— Tôi lo.',
      '— Được, quyết vậy đi!',
    ].join('\n');
    const r = detectFlatDialogue(content);
    expect(r.severity).toBe('none');
  });

  it('skips short dialogue samples (<12 lines)', () => {
    const content = ['— A.', '— B.', '— C.'].join('\n');
    expect(detectFlatDialogue(content).severity).toBe('none');
  });
});

describe('detectBlandSensoryCliche', () => {
  it('flags heavy bland sensory vocabulary as major', () => {
    const content = [
      'ánh sáng vàng', 'gió nhẹ', 'hương thơm thoang thoảng', 'âm thanh vang vọng',
      'màu sắc rực rỡ', 'ánh sáng mờ ảo', 'làn gió nhẹ', 'không khí lạnh lẽo',
      'lung linh huyền ảo', 'ánh nắng vàng', 'cơn gió nhẹ',
    ].join(' ... ');
    const r = detectBlandSensoryCliche(content);
    expect(r.severity).toBe('major');
    expect(r.total).toBeGreaterThanOrEqual(10);
  });

  it('flags a moderate amount as moderate', () => {
    const content = 'ánh sáng vàng và gió nhẹ, hương thơm thoang thoảng, màu sắc rực rỡ, không khí ngột ngạt.';
    const r = detectBlandSensoryCliche(content);
    expect(r.severity).toBe('moderate');
    expect(r.total).toBeGreaterThanOrEqual(5);
    expect(r.total).toBeLessThan(10);
  });

  it('leaves vivid, specific sensory prose alone', () => {
    const content =
      'Nắng 4h chiều xuyên qua kính cường lực tòa nhà 32 tầng. Gió tây nam mang mùi muối từ cửa sông Lạch Tray. ' +
      'Tiếng còi tàu rền ba hồi dài, mùi dầu diesel khét lẹt bám vào áo.';
    const r = detectBlandSensoryCliche(content);
    expect(r.severity).toBe('none');
  });
});

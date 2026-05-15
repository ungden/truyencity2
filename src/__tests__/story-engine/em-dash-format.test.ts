import {
  cleanContent,
  normalizeDialogueMarkers,
  detectEmDashFormatBreak,
} from '@/services/story-engine/pipeline/chapter-writer-helpers';

describe('normalizeDialogueMarkers', () => {
  it('converts leading hyphen + space + dialogue to em-dash', () => {
    const input = '- Phong ơi, bọn họ ác độc vậy sao?';
    expect(normalizeDialogueMarkers(input)).toBe('— Phong ơi, bọn họ ác độc vậy sao?');
  });

  it('converts leading en-dash + space + dialogue to em-dash', () => {
    const input = '– Anh nghĩ sao về deal này?';
    expect(normalizeDialogueMarkers(input)).toBe('— Anh nghĩ sao về deal này?');
  });

  it('is idempotent on existing em-dash dialogue', () => {
    const input = '— Đây là chỗ mà sư đệ ta giới thiệu sao?';
    expect(normalizeDialogueMarkers(input)).toBe(input);
  });

  it('preserves Vietnamese diacritics on first letter', () => {
    const input = '- Ánh sáng kỳ lạ kìa.';
    expect(normalizeDialogueMarkers(input)).toBe('— Ánh sáng kỳ lạ kìa.');
  });

  it('does not touch math-like list items', () => {
    const input = '- 5 = 3 + 2';
    expect(normalizeDialogueMarkers(input)).toBe(input);
  });

  it('does not touch instruction markers', () => {
    expect(normalizeDialogueMarkers('- Note: kiểm tra lại')).toBe('- Note: kiểm tra lại');
    expect(normalizeDialogueMarkers('- Lưu ý điểm này')).toBe('- Lưu ý điểm này');
    expect(normalizeDialogueMarkers('- Ghi chú quan trọng')).toBe('- Ghi chú quan trọng');
  });

  it('does not touch hyphens inside paragraphs (compound words)', () => {
    const input = 'Đây là một thương vụ — không phải trò chơi.';
    expect(normalizeDialogueMarkers(input)).toBe(input);
  });

  it('normalizes multiple dialogue lines independently', () => {
    const input = [
      '- Lương Hạo, anh nghĩ sao?',
      'Lương Hạo gật đầu, đặt cốc xuống.',
      '- Tôi cần xem hợp đồng.',
    ].join('\n');
    const expected = [
      '— Lương Hạo, anh nghĩ sao?',
      'Lương Hạo gật đầu, đặt cốc xuống.',
      '— Tôi cần xem hợp đồng.',
    ].join('\n');
    expect(normalizeDialogueMarkers(input)).toBe(expected);
  });

  it('leaves lines too short (separators) untouched', () => {
    expect(normalizeDialogueMarkers('- a')).toBe('- a');
  });
});

describe('detectEmDashFormatBreak', () => {
  it('flags long chapters with zero em-dash markers (total fusion)', () => {
    // 20 paragraphs × ~200 chars = ~4000 chars, 0 em-dash → critical fusion
    const para = 'Tiêu Phàm đứng cạnh quầy thu ngân, nhìn ra ngoài cửa sổ phố cổ. Mưa rơi nhè nhẹ trên những mái ngói rêu phong. Anh xoay nhẹ chiếc nhẫn bạc trên ngón tay, chờ đợi vị khách tiếp theo bước vào tiệm net Khởi Nguyên.';
    const content = Array.from({ length: 20 }, () => para).join('\n\n');
    const reason = detectEmDashFormatBreak(content);
    expect(reason).toBeTruthy();
    expect(reason).toMatch(/fused|em-dash/i);
  });

  it('passes chapters with normal em-dash density', () => {
    const paragraphs = [
      '— Đây là chỗ mà sư đệ ta giới thiệu sao? — Lâm Thanh Tuyết hỏi.',
      'Tiêu Phàm gật đầu, ánh mắt bình thản như mặt hồ.',
      '— Nếu cô tới đây tìm linh khí, thì nhầm chỗ rồi.',
      'Nàng siết chặt túi tiền, ánh mắt sắc lạnh.',
    ];
    // Inflate to >3000 chars + >15 paragraphs by repeating
    const content = Array.from({ length: 6 }, () => paragraphs.join('\n\n')).join('\n\n');
    expect(detectEmDashFormatBreak(content)).toBeNull();
  });

  it('ignores short content (below minChars)', () => {
    const shortContent = 'Tiêu Phàm đứng đó im lặng.\n\n'.repeat(20);
    // 20 paragraphs but only ~500 chars
    expect(detectEmDashFormatBreak(shortContent)).toBeNull();
  });

  it('ignores chapters with too few paragraphs (below minParagraphs)', () => {
    const content = 'Một đoạn rất dài nhưng không có dialogue. '.repeat(500);
    // Long but single paragraph → not a fusion indicator
    expect(detectEmDashFormatBreak(content)).toBeNull();
  });

  it('flags relative regression when previousEmDashCount supplied', () => {
    // ~3500 chars, 20 paragraphs, only 4 em-dashes — survives mode 1, hits mode 2
    const filler = 'Trần Phong ngồi sau bàn gỗ mun, chiếc bút lông trên tay chuyển động thoăn thoắt trên cuộn giấy bản đồ. Mochi đứng nép bên cạnh, đôi mắt to tròn chăm chú nhìn theo.';
    const paragraphs = Array.from({ length: 20 }, () => filler);
    const content = paragraphs.join('\n\n') + '\n\n— Một câu thoại duy nhất.\n\n— Câu thứ hai.\n\n— Câu thứ ba.\n\n— Câu thứ tư.';
    // 4 em-dashes this chapter, previous had 30 → drop >80%
    const reason = detectEmDashFormatBreak(content, { previousEmDashCount: 30 });
    expect(reason).toBeTruthy();
    expect(reason).toMatch(/drop|regression/i);
  });

  it('does not flag when previous count is below sample threshold', () => {
    const filler = 'Trần Phong ngồi sau bàn gỗ mun, chiếc bút lông trên tay chuyển động thoăn thoắt trên cuộn giấy bản đồ. Mochi đứng nép bên cạnh, đôi mắt to tròn chăm chú nhìn theo.';
    const paragraphs = Array.from({ length: 20 }, () => filler);
    const content = paragraphs.join('\n\n') + '\n\n— Một câu thoại.\n\n— Câu nữa.\n\n— Câu thứ ba.\n\n— Câu thứ tư.\n\n— Câu thứ năm.';
    // Mode 1 needs <=3 em-dashes; this has 5 → safe
    // Mode 2: prev=10 < 15 sample threshold → won't fire
    expect(detectEmDashFormatBreak(content, { previousEmDashCount: 10 })).toBeNull();
  });
});

describe('cleanContent integration', () => {
  it('applies dialogue marker normalization end-to-end', () => {
    const input = [
      '- Phong ơi, anh có nghe thấy gì không?',
      'Trần Phong gật đầu.',
      '- Có, tiếng động từ phía Đông.',
    ].join('\n\n');

    const cleaned = cleanContent(input);
    expect(cleaned).toContain('— Phong ơi');
    expect(cleaned).toContain('— Có, tiếng động');
    expect(cleaned).not.toMatch(/^- /m);
  });

  it('preserves existing em-dash format', () => {
    const input = [
      '— Lương Hạo, anh nghĩ sao?',
      'Anh gật đầu, đặt cốc trà xuống bàn.',
      '— Tôi cần xem kỹ hơn.',
    ].join('\n\n');

    const cleaned = cleanContent(input);
    expect(cleaned).toContain('— Lương Hạo');
    expect(cleaned).toContain('— Tôi cần xem kỹ hơn');
  });
});

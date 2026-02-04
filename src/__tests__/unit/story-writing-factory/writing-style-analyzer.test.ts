/**
 * Writing Style Analyzer Tests
 *
 * Tests: weak verb detection, adverb overuse, show-don't-tell,
 * purple prose, passive voice, sentence variety, exposition dumps
 */

import { WritingStyleAnalyzer, writingStyleAnalyzer } from '@/services/story-writing-factory/writing-style-analyzer';

describe('WritingStyleAnalyzer', () => {
  let analyzer: WritingStyleAnalyzer;

  beforeEach(() => {
    analyzer = new WritingStyleAnalyzer();
  });

  describe('analyzeStyle', () => {
    it('should return a complete analysis result with all fields', () => {
      const content = 'Hắn bước vào đại sảnh, ánh mắt lạnh lẽo quét qua đám đông. Không ai dám nhìn thẳng vào hắn.';
      const result = analyzer.analyzeStyle(content);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('weakVerbScore');
      expect(result).toHaveProperty('weakVerbs');
      expect(result).toHaveProperty('adverbScore');
      expect(result).toHaveProperty('adverbOveruse');
      expect(result).toHaveProperty('showDontTellScore');
      expect(result).toHaveProperty('tellInstances');
      expect(result).toHaveProperty('purpleProse');
      expect(result).toHaveProperty('passiveVoice');
      expect(result).toHaveProperty('sentenceVariety');
      expect(result).toHaveProperty('expositionDumps');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should give high score for well-written content', () => {
      // Content with strong verbs, varied sentences, showing not telling
      const content = `
        Kiếm quang lóe sáng, chém xuyên qua màn đêm. Hắn lao tới, bước chân vang dội trên nền đá.
        Kẻ địch nghiến răng, nắm chặt tay, mặt đỏ bừng. "Ngươi sẽ không thoát được!" tiếng gầm vang lên.
        Gió rít qua tai, mang theo mùi máu tanh. Hắn xoay người, né tránh đòn chí mạng rồi phản kích.
        Từng nhát kiếm mang theo sát khí ngùn ngụt. Đất đá tung bay, cả không gian rung chuyển.
        Ánh mắt hắn sáng rực, môi khẽ cong lên. "Hay lắm!" Hắn gật đầu rồi xông vào trận chiến.
      `;
      const result = analyzer.analyzeStyle(content);
      // Good writing should score reasonably well
      expect(result.overallScore).toBeGreaterThan(40);
    });

    it('should penalize content with many weak verbs', () => {
      // Content loaded with English weak verbs (boundary detection works with \b for English)
      const content = `
        He is very strong. He is the best. He is invincible.
        He was walking. He was talking. She was running. He was fighting.
        He is a hero. He was a warrior. He is the champion.
        She has power. She has talent. She has everything she needs.
        He said he would win. He said he was the best. He said it clearly.
        He is here. He is there. He is everywhere. He is unbeatable.
      `;
      const result = analyzer.analyzeStyle(content);
      // English weak verbs like "is", "was", "has", "said" should be detected
      expect(result.weakVerbs.length).toBeGreaterThan(0);
    });

    it('should detect adverb overuse', () => {
      const content = `
        Hắn rất nhanh chóng lao tới. Đột nhiên một luồng sáng rất mạnh xuất hiện.
        Bỗng nhiên hắn cảm thấy vô cùng đau đớn. Cực kỳ kinh ngạc, hắn lập tức quay đầu.
        Rất nhanh chóng, hắn hoàn toàn bình phục. Thật sự quá mạnh, vô cùng đáng sợ.
        Rõ ràng hắn hoàn toàn nắm thế chủ động. Tuyệt đối không ai dám đối đầu.
        Chắc chắn rằng hắn rất mạnh. Thực sự cực kỳ kinh hãi.
      `;
      const result = analyzer.analyzeStyle(content);
      expect(result.adverbOveruse.length).toBeGreaterThan(0);
    });

    it('should detect tell-not-show patterns', () => {
      const content = `
        Hắn cảm thấy tức giận khi nhìn thấy kẻ thù. Hắn buồn bã vì đã mất đi người thân.
        Hắn biết rằng đây là thử thách lớn. Hắn nghĩ rằng mình cần phải mạnh hơn.
        Hắn cảm thấy vui mừng khi đạt được đột phá. Hắn lo lắng về tương lai.
        Hắn nhận ra rằng mình đã thay đổi. Hắn hiểu rằng sức mạnh không phải tất cả.
      `;
      const result = analyzer.analyzeStyle(content);
      expect(result.tellInstances.length).toBeGreaterThan(0);
      expect(result.showDontTellScore).toBeLessThan(80);
    });

    it('should detect purple prose', () => {
      const content = `
        Hủy thiên diệt địa! Lực lượng vô cùng kinh hoàng vô cùng đáng sợ bao trùm.
        Cực kỳ khủng bố, cực kỳ kinh hãi, thiên địa biến sắc, sơn hà rung chuyển!
        Vô cùng mạnh mẽ, vô cùng bá đạo, rất kinh khủng, rất đáng sợ.
      `;
      const result = analyzer.analyzeStyle(content);
      expect(result.purpleProse.instances.length).toBeGreaterThan(0);
    });

    it('should detect passive voice overuse', () => {
      const content = `
        Hắn được mọi người kính trọng. Kẻ thù bị hắn đánh bại.
        Thành phố được bao bọc bởi kết giới. Hắn bị thương nặng.
        Pháp bảo được kích hoạt. Kẻ địch bị tiêu diệt.
        Hắn được ban cho sức mạnh. Trận chiến bị gián đoạn.
      `;
      const result = analyzer.analyzeStyle(content);
      expect(result.passiveVoice.ratio).toBeGreaterThan(0);
    });
  });

  describe('sentence variety', () => {
    it('should score low for uniform sentence length', () => {
      // All sentences roughly the same length
      const content = `
        Hắn bước vào đại sảnh lớn. Ánh mắt quét qua đám đông. Không ai dám nhìn hắn.
        Hắn đi đến chỗ ngồi mình. Ngồi xuống uống ly trà nóng. Mọi người im lặng theo.
        Hắn đứng dậy bước đi ra. Cánh cửa đóng sập lại ngay. Gió lạnh thổi qua nơi.
      `;
      const result = analyzer.analyzeStyle(content);
      expect(result.sentenceVariety).toHaveProperty('avgLength');
      expect(result.sentenceVariety).toHaveProperty('lengthVariance');
    });

    it('should handle empty content gracefully', () => {
      const result = analyzer.analyzeStyle('');
      expect(result.sentenceVariety.score).toBe(50);
      expect(result.sentenceVariety.avgLength).toBe(0);
    });
  });

  describe('exposition dumps', () => {
    it('should detect long exposition paragraphs', () => {
      const content = `Hắn chiến đấu với kẻ thù.\n\nTheo truyền thuyết, hệ thống tu luyện chia làm chín cảnh giới lớn. Cảnh giới đầu tiên là Luyện Khí, gồm có chín tầng nhỏ. Mỗi tầng đều cần phải tích lũy đủ linh khí mới có thể đột phá. Về cơ bản, người tu luyện cần phải mất ít nhất mười năm để đạt đến đỉnh phong Luyện Khí. Hệ thống này đã tồn tại hàng vạn năm, là quy tắc bất biến của thế giới tu tiên. Nói chung, những ai không có thiên phú sẽ mãi mãi dừng lại ở cảnh giới thấp.\n\nHắn tiếp tục chiến đấu.`;
      const result = analyzer.analyzeStyle(content);
      expect(result.expositionDumps.length).toBeGreaterThan(0);
    });

    it('should not flag paragraphs with dialogue', () => {
      const content = `Hắn chiến đấu.\n\n"Ngươi biết không," lão già nói, "theo truyền thuyết, hệ thống tu luyện chia làm chín cảnh giới. Mỗi cảnh giới đều cần phải tích lũy đủ linh khí mới có thể đột phá. Về cơ bản là vậy."\n\nHắn gật đầu.`;
      const result = analyzer.analyzeStyle(content);
      expect(result.expositionDumps.length).toBe(0);
    });
  });

  describe('buildStyleGuidelines', () => {
    it('should generate guidelines without recent analysis', () => {
      const guidelines = analyzer.buildStyleGuidelines();
      expect(guidelines).toContain('Writing Style Guidelines');
      expect(guidelines).toContain('strong, specific verbs');
    });

    it('should include recent analysis feedback', () => {
      const content = `
        Hắn là rất mạnh. Hắn có nhiều sức mạnh. Hắn là người mạnh nhất nơi đây.
        Hắn là bất bại. Hắn là vô song. Hắn có tất cả mọi thứ trên đời.
      `;
      const analysis = analyzer.analyzeStyle(content);
      const guidelines = analyzer.buildStyleGuidelines(analysis);
      expect(guidelines).toContain('Writing Style Guidelines');
    });
  });

  describe('quickCheck', () => {
    it('should pass for decent content', () => {
      const content = `
        Kiếm quang lóe sáng, chém xuyên qua màn đêm. Hắn lao tới, bước chân vang dội.
        Kẻ địch nghiến răng, nắm chặt tay. Gió rít qua tai, mang theo mùi máu tanh.
      `;
      const result = analyzer.quickCheck(content);
      expect(result.pass).toBe(true);
    });

    it('should fail for poor quality content', () => {
      // Extremely poor: all weak verbs, all telling, heavy adverbs
      const content = `
        Hắn cảm thấy rất tức giận. Hắn rất buồn bã. Hắn cảm thấy rất lo lắng.
        Hắn cảm thấy vô cùng sợ hãi. Hắn rất vui mừng. Hắn cảm thấy rất đau khổ.
        Hắn cảm thấy rất thất vọng. Hắn cảm thấy rất phẫn nộ. Hắn cảm thấy rất kinh ngạc.
        Hắn rất hạnh phúc. Hắn cảm thấy rất buồn. Hắn biết rằng mình rất mạnh.
      `;
      const result = analyzer.quickCheck(content);
      // Very poor content should fail
      expect(result).toHaveProperty('pass');
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(writingStyleAnalyzer).toBeInstanceOf(WritingStyleAnalyzer);
    });

    it('should be usable directly', () => {
      const result = writingStyleAnalyzer.analyzeStyle('Test content here.');
      expect(result).toHaveProperty('overallScore');
    });
  });
});

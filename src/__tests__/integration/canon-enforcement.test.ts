/**
 * Canon enforcement integration test (Phase 28 TIER 6).
 *
 * Tests deterministic canon gates from quality/canon-enforcement.ts directly
 * (heuristic only — no AI mocking needed). Verifies each gate fires correctly
 * on synthetic chapter content.
 */

import { checkPovConsistency } from '../../services/story-engine/quality/pov-check';
import { analyzeSensoryBalance } from '../../services/story-engine/quality/sensory-balance';
import { evaluateHooks } from '../../services/story-engine/quality/hook-strength';

describe('Canon Enforcement Gates', () => {
  describe('POV Consistency', () => {
    it('should detect 1st-person omniscient slip', () => {
      const content = 'Tôi bước vào phòng. Nàng thầm nghĩ trong lòng đau đớn. Nàng cảm thấy buồn. Hắn nghĩ thầm rằng đây là kết thúc. Cô ấy thầm nghĩ về quá khứ. Anh ấy cảm thấy tức giận tột độ.';
      const violations = checkPovConsistency(content, {
        expectedPov: '1st',
        protagonistName: 'Lê Phong',
      });
      const omniscient = violations.filter(v => v.type === 'omniscient_slip');
      expect(omniscient.length).toBeGreaterThan(0);
    });

    it('should NOT flag 1st-person legitimate self-reflection', () => {
      const content = 'Tôi bước vào phòng. Tôi thầm nghĩ rằng đây là điều tốt. Tôi cảm thấy hạnh phúc.';
      const violations = checkPovConsistency(content, {
        expectedPov: '1st',
        protagonistName: 'Lê Phong',
      });
      const omniscient = violations.filter(v => v.type === 'omniscient_slip');
      expect(omniscient.length).toBe(0);
    });

    it('should detect mid-scene POV switch in 3rd-limited', () => {
      const content = 'Lê Phong thầm nghĩ về quê hương. Ông Nội Trầm thầm nghĩ về cháu mình. Lý Bình thầm nghĩ về tương lai.\n\n' +
        'Lê Phong cảm thấy lạnh. Ông Nội Trầm cảm thấy mệt. Lý Bình cảm thấy hối hận.\n\n' +
        'Lê Phong thầm nghĩ. Bạch Cốt cảm thấy. Hồng Diệp tự nhủ.';
      const violations = checkPovConsistency(content, {
        expectedPov: '3rd-limited',
        protagonistName: 'Lê Phong',
        allowedPovCharacters: [],
      });
      // Should detect at least one of: wrong_viewpoint or pov_switch_mid_scene
      const povIssue = violations.find(v => v.type === 'wrong_viewpoint' || v.type === 'pov_switch_mid_scene');
      expect(povIssue).toBeDefined();
    });
  });

  describe('Sensory Balance', () => {
    it('should score balanced content high', () => {
      const content = 'Tôi nhìn thấy ánh đèn rực sáng. Tôi nghe tiếng gió rì rào. Cảm giác lạnh buốt da. Vị đắng của trà. Mùi thơm của hoa. Tim đập mạnh. Hơi thở gấp gáp. Run rẩy đôi tay. Ánh mắt sáng. Tiếng vọng xa. Lạnh tê tái. Mùi nồng. Vị ngọt.';
      const report = analyzeSensoryBalance(content);
      expect(report.balanceScore).toBeGreaterThanOrEqual(6);
    });

    it('should score sight-only flat content low', () => {
      const content = 'Anh nhìn thấy cây. Anh nhìn nhà. Anh thấy người. Anh nhìn xe. Anh thấy đường. Anh nhìn trời. Anh thấy nắng. Anh nhìn sông.';
      const report = analyzeSensoryBalance(content);
      expect(report.balanceScore).toBeLessThanOrEqual(4);
      expect(report.flatSenses.length).toBeGreaterThan(0);
    });

    it('should report missing senses', () => {
      const content = 'Tôi nhìn thấy nó. Anh ấy nhìn cô ấy. Cô ấy nhìn tôi. Mắt mở to. Trông thấy. Quan sát. Liếc nhìn.';
      const report = analyzeSensoryBalance(content);
      // Sight-heavy content should miss other senses (sound, touch, taste, smell, body all needed)
      expect(report.flatSenses.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Hook Strength', () => {
    it('should score action opening high', () => {
      const content = 'Hắn vung kiếm chém vào kẻ địch. Lưỡi đâm xuống không thương tiếc. ' + 'A'.repeat(2000);
      const report = evaluateHooks(content);
      expect(report.openingType).toBe('action');
      expect(report.openingScore).toBeGreaterThanOrEqual(7);
    });

    it('should score boring weather opening low', () => {
      const content = 'Hôm nay là một ngày trời nắng đẹp. Bầu trời xanh trong. ' + 'A'.repeat(2000);
      const report = evaluateHooks(content);
      expect(report.openingScore).toBeLessThanOrEqual(5);
    });

    it('should score cliffhanger ending high', () => {
      const content = 'A'.repeat(2000) + 'Bỗng một tiếng động vang lên rung chuyển cả căn phòng — chuyện gì xảy ra?!';
      const report = evaluateHooks(content);
      expect(report.closingScore).toBeGreaterThanOrEqual(7);
    });

    it('should score boring resolution ending low', () => {
      const content = 'A'.repeat(2000) + 'Ngày hôm sau bắt đầu.';
      const report = evaluateHooks(content);
      expect(report.closingScore).toBeLessThanOrEqual(5);
    });
  });
});

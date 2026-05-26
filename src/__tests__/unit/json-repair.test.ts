import { parseJSON, escapeLiteralNewlines } from '../../services/story-engine/utils/json-repair';

describe('JSON Repair & Newline Escaping', () => {
  describe('escapeLiteralNewlines', () => {
    it('should escape literal newlines inside double-quoted string values', () => {
      const input = '{\n  "key": "value with\nnewline and \ttab"\n}';
      const escaped = escapeLiteralNewlines(input);
      expect(escaped).toBe('{\n  "key": "value with\\nnewline and \\ttab"\n}');
    });

    it('should NOT escape newlines outside double-quoted strings', () => {
      const input = '{\n  "key": "value"\n}';
      const escaped = escapeLiteralNewlines(input);
      expect(escaped).toBe('{\n  "key": "value"\n}');
    });

    it('should handle escaped quotes inside string values correctly', () => {
      const input = '{\n  "key": "value \\"with\\"\nnewline"\n}';
      const escaped = escapeLiteralNewlines(input);
      expect(escaped).toBe('{\n  "key": "value \\"with\\"\\nnewline"\n}');
    });
  });

  describe('parseJSON with literal newlines', () => {
    it('should successfully parse valid JSON containing literal newlines in values', () => {
      const text = '{\n  "worldDescription": "### STORY KERNEL SUMMARY\\n\\nSome multi-line\\ncontent here with literal\\nnewlines."\n}';
      const parsed = parseJSON<{ worldDescription: string }>(text);
      expect(parsed).not.toBeNull();
      expect(parsed!.worldDescription).toContain('### STORY KERNEL SUMMARY');
      expect(parsed!.worldDescription).toContain('literal\nnewlines');
    });

    it('should unwrap single-element arrays', () => {
      const text = '[{\n  "key": "value"\n}]';
      const parsed = parseJSON<{ key: string }>(text);
      expect(parsed).not.toBeNull();
      expect(parsed!.key).toBe('value');
    });
  });
});

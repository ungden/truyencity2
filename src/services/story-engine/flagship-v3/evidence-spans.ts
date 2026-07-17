export interface V3ProseSpan {
  id: string;
  start: number;
  end: number;
  text: string;
}

const MAX_SPAN_CHARS = 700;
const MIN_BREAK_CHARS = 350;

export function buildV3ProseSpans(content: string): V3ProseSpan[] {
  const spans: V3ProseSpan[] = [];
  const paragraphs = [...content.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g)];
  for (const paragraph of paragraphs) {
    const base = paragraph.index || 0;
    let offset = 0;
    while (offset < paragraph[0].length) {
      let end = Math.min(paragraph[0].length, offset + MAX_SPAN_CHARS);
      if (end < paragraph[0].length) {
        const window = paragraph[0].slice(offset + MIN_BREAK_CHARS, end);
        const lastBreak = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '), window.lastIndexOf(' '));
        if (lastBreak >= 0) end = offset + MIN_BREAK_CHARS + lastBreak + 1;
      }
      const text = paragraph[0].slice(offset, end);
      spans.push({
        id: `span_${String(spans.length + 1).padStart(3, '0')}`,
        start: base + offset,
        end: base + end,
        text,
      });
      offset = end;
    }
  }
  return spans;
}

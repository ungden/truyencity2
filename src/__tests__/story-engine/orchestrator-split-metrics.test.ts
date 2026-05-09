import { readFileSync } from 'fs';
import path from 'path';
import { splitChapterContent } from '@/services/story-engine/pipeline/orchestrator';

describe('orchestrator split and metrics guardrails', () => {
  it('loads style_directives with the project row so disable_chapter_split can work', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/services/story-engine/pipeline/orchestrator.ts'),
      'utf8',
    );

    expect(source).toContain('style_directives,novels!');
    expect(source).toContain('const disableChapterSplit = projectStyleDirectives?.disable_chapter_split === true');
  });

  it('does not split when numParts is 1', () => {
    const content = [
      'Đoạn mở đầu có đủ thông tin để người đọc hiểu tình thế.',
      'Đoạn giữa đẩy conflict và payoff của chương.',
      'Đoạn cuối giữ lại một câu hỏi cho chương sau.',
    ].join('\n\n');

    expect(splitChapterContent(content, 'Một Chương', 1)).toEqual([
      { title: 'Một Chương', content },
    ]);
  });

  it('splits long logical content into reader chapters with continuation titles', () => {
    const paragraphs = Array.from({ length: 120 }, (_, idx) =>
      `Đoạn ${idx + 1} có nhiều chữ để tạo một logical chapter dài và có ranh giới đoạn tự nhiên cho splitter xử lý.`
    );
    const content = paragraphs.join('\n\n');

    const parts = splitChapterContent(content, 'Bước Ngoặt', 2);

    expect(parts).toHaveLength(2);
    expect(parts[0].title).toBe('Bước Ngoặt');
    expect(parts[1].title).toBe('Bước Ngoặt (Tiếp)');
    expect(parts[0].content.length).toBeGreaterThan(500);
    expect(parts[1].content.length).toBeGreaterThan(500);
  });
});

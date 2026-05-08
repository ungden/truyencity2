import { evaluateChapterQuality, evaluateWindowQuality } from '@/services/story-engine/quality/quality-contract';

function repeatSentence(sentence: string, count: number): string {
  return Array.from({ length: count }, () => sentence).join(' ');
}

const baseContext = {
  title: 'Đơn Hàng Sau Cơn Mưa',
  protagonistName: 'Nguyễn An Bình',
  targetWords: 500,
  minWords: 350,
  genre: 'do-thi',
  worldDescription: 'Phượng Đô, Đại Nam, một con phố kinh doanh nhỏ.',
};

describe('quality contract', () => {
  it('passes a chapter with enough length, agency, payoff, dialogue, and hook', () => {
    const content = [
      'Mùi bơ nóng lan khỏi mặt chảo. Tiếng mưa gõ lên mái tôn. Nguyễn An Bình đặt khay bánh xuống, nhìn bảng đơn hàng và nhận ra buổi sáng này không thể làm theo cách cũ.',
      'Trong lòng hắn vẫn còn nỗi sợ làm hỏng đơn lớn đầu tiên, nhưng tâm trí lại bình tĩnh tách từng việc: nướng bánh, đóng gói, gọi người giao. Sâu hơn nữa, hắn muốn chứng minh quầy nhỏ này có thể sống bằng tay nghề thật.',
      '— Cô Hòa, cô giữ giúp cháu mười phút được không?',
      'Cô Hòa lau tay vào khăn, không hỏi ngay. Bà chỉ nhìn hàng khách đang trú mưa dưới mái hiên.',
      '— Cháu định nhận hết đơn phòng kế toán?',
      'Nguyễn An Bình gật đầu. Hắn quyết định đổi thứ tự nướng, đặt phần pate ít béo lên trước, rồi mở sổ ghi từng phản hồi của khách quen.',
      '— Nếu hỏng thì sao?',
      '— Thì cháu tự ăn bánh hỏng cả tuần.',
      'Cô Hòa bật cười. Không khí căng như dây đàn bỗng mềm xuống một nhịp.',
      repeatSentence('Ánh sáng ướt trên mặt đường phản chiếu qua tủ kính, hơi nóng bám vào đầu ngón tay, còn vị tiêu mới xay làm khách đứng gần phải nuốt khan.', 12),
      repeatSentence('Kết quả đến ngay trước chín giờ: hai mươi suất giao đủ, phòng kế toán nhắn đặt thêm ngày mai, doanh thu buổi sáng tăng rõ và uy tín của quầy được công nhận bằng một lời giới thiệu mới.', 8),
      'Khi Nguyễn An Bình vừa đóng sổ, điện thoại rung lên. Trên màn hình là một tin nhắn từ số lạ: “Ngày mai anh có đủ sức làm năm mươi suất không?”',
    ].join('\n\n');

    const report = evaluateChapterQuality(content, baseContext);

    expect(report.verdict).toBe('pass');
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.metrics.dialogueLines).toBeGreaterThanOrEqual(3);
  });

  it('marks a short chapter as revise', () => {
    const content = [
      'Nguyễn An Bình nhìn đơn hàng và quyết định thử cách mới.',
      '— Làm thôi.',
      'Kết quả tốt hơn dự đoán, ngày mai sẽ còn nhiều chuyện hơn.',
    ].join('\n');

    const report = evaluateChapterQuality(content, baseContext);

    expect(report.verdict).toBe('revise');
    expect(report.issues.some((issue) => issue.code === 'word_count_low')).toBe(true);
  });

  it('blocks prompt leakage and missing protagonist', () => {
    const content = repeatSentence('Theo [WORLD DESCRIPTION], nhân vật sẽ gọi DeepSeek API rồi viết tiếp phần prompt này.', 40);

    const report = evaluateChapterQuality(content, baseContext);

    expect(report.verdict).toBe('block');
    expect(report.issues.some((issue) => issue.code === 'model_or_prompt_leak')).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'context_leak')).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'protagonist_absent')).toBe(true);
  });

  it('marks severe repetition as revise', () => {
    const repeated = repeatSentence('Nguyễn An Bình bắt đầu đặt bánh, bắt đầu ghi sổ, bắt đầu gọi khách, bắt đầu tính toán kết quả và doanh thu.', 35);
    const content = [
      repeated,
      '— Đơn này ổn chứ?',
      '— Ổn.',
      '— Vậy ngày mai tiếp tục.',
      'Mùi bánh còn nóng, tiếng mưa chưa tạnh, và câu hỏi mới nằm trong tin nhắn cuối ngày.',
    ].join('\n');

    const report = evaluateChapterQuality(content, baseContext);

    expect(report.verdict).toBe('revise');
    expect(report.issues.some((issue) => issue.code === 'severe_repetition')).toBe(true);
  });

  it('summarizes window-level supreme goals', () => {
    const passContent = [
      repeatSentence('Nguyễn An Bình quyết định đổi quy trình, nhận đơn hàng, tạo kết quả, tăng doanh thu và được khách công nhận.', 40),
      '— Mai làm tiếp chứ?',
      '— Làm.',
      'Tiếng mưa, mùi bánh, hơi nóng và ánh sáng cuối ngày giữ lại một câu hỏi mới.',
    ].join('\n');
    const blockedContent = repeatSentence('Theo [CONTEXT], nhân vật phụ sẽ dùng Gemini để sửa prompt.', 45);

    const report = evaluateWindowQuality('project-1', [
      { chapterNumber: 1, title: 'Một', content: passContent },
      { chapterNumber: 2, title: 'Hai', content: blockedContent },
    ], baseContext);

    expect(report.trend.blockCount).toBe(1);
    expect(report.supremeGoals.coherence).toBe('red');
    expect(report.nextActions[0]).toContain('block');
  });
});

import { writeChapter } from '../../services/story-engine/pipeline/chapter-writer';
import { callGemini } from '../../services/story-engine/utils/gemini';

jest.mock('../../services/story-engine/utils/gemini');
const mockCallGemini = callGemini as jest.MockedFunction<typeof callGemini>;

/**
 * Generate mock Vietnamese content that passes chapter-writer's hard enforcement checks:
 * - Word count ≥ 70% of target (avoids requestContinuation)
 * - Word count ≥ 60% of target (avoids forced rewrite)
 * - Has ≥2 cliffhanger signals in last 500 chars (avoids hasCliffhangerSignal failure)
 * - Uses varied vocabulary (avoids detectSevereRepetition)
 */
function generateMockContent(targetWords: number): string {
  const sentences = [
    'Trần Phong ngồi trong căn phòng trọ chật hẹp nhìn ra ngoài cửa sổ.',
    'Ánh nắng chiều xuyên qua tấm rèm cũ kỹ chiếu lên bàn làm việc.',
    'Hắn cầm tờ giấy ghi chép kế hoạch kinh doanh đọc đi đọc lại.',
    'Mỗi con số trên trang giấy đều được tính toán cẩn thận từng li.',
    'Tiếng xe cộ ngoài đường vọng vào phá vỡ sự tĩnh lặng của căn phòng.',
    'Hắn đứng dậy rót một ly nước lạnh uống một hơi cạn sạch.',
    'Kế hoạch này nếu thành công sẽ thay đổi hoàn toàn cuộc đời hắn.',
    'Nhưng rủi ro cũng không hề nhỏ nếu thất bại sẽ mất tất cả.',
    'Hắn nhắm mắt hít một hơi thật sâu rồi từ từ thở ra.',
    'Quyết định rồi không có gì có thể ngăn cản hắn được nữa.',
    'Hắn lấy điện thoại ra gọi cho người bạn cũ đã lâu không liên lạc.',
    'Cuộc gọi kết nối sau ba hồi chuông vang lên liên tục.',
    'Giọng nói quen thuộc vang lên từ đầu dây bên kia ngạc nhiên.',
    'Hai người nói chuyện hàng giờ về kế hoạch và tương lai phía trước.',
    'Khi kết thúc cuộc gọi trời đã tối hẳn ngoài cửa sổ.',
    'Hắn nhìn bản kế hoạch trên bàn với ánh mắt kiên quyết.',
    'Hắn thầm nghĩ mình nghèo đến mức cốc mì cũng thành xa xỉ, rồi tự giễu vì ý nghĩ ấy.',
    'Người bạn im lặng vài giây, chỉ cười rồi đổi chủ đề như đang che giấu điều gì.',
    'Đêm nay hắn không ngủ được vì quá nhiều suy nghĩ trong đầu.',
    'Từng bước một hắn sẽ xây dựng đế chế kinh doanh của riêng mình.',
    'Không ai tin một thanh niên nghèo có thể làm được điều phi thường.',
    'Nhưng hắn biết rõ khả năng của bản thân hơn bất kỳ ai khác.',
  ];

  const parts: string[] = [];
  let wordCount = 0;
  let i = 0;
  while (wordCount < targetWords) {
    parts.push(sentences[i % sentences.length]);
    wordCount += sentences[i % sentences.length].split(/\s+/).length;
    i++;
  }

  // Ending with cliffhanger signals: "chờ đợi", "kết quả", "mong đợi", "?" (needs ≥2 in last 500 chars)
  parts.push('Sáng mai mọi chuyện sẽ bắt đầu. Hắn chờ đợi kết quả với sự mong đợi khôn tả. Rốt cuộc liệu số phận có mỉm cười với hắn?');

  return parts.join('\n');
}

const MOCK_CHAPTER_CONTENT = generateMockContent(2800);

describe('Story Engine Prompts', () => {
  beforeEach(() => {
    mockCallGemini.mockImplementation(async (_prompt: string, config: { systemPrompt?: string }) => {
      if (config.systemPrompt?.includes('ARCHITECT')) {
        return {
          content: JSON.stringify({
            chapterNumber: 1,
            title: "Kế Hoạch Khởi Nghiệp Bất Ngờ?",
            summary: "MC gặp khó khăn về tiền bạc và quyết định kinh doanh.",
            pov: "Trần Phong",
            location: "Khu ổ chuột",
            scenes: [
              { order: 1, setting: "Phòng trọ", characters: ["Trần Phong"], goal: "Tìm cách kiếm tiền", conflict: "Không có vốn", resolution: "Nghĩ ra ý tưởng", estimatedWords: 2800, pov: "Trần Phong" }
            ],
            tensionLevel: 6,
            dopaminePoints: [{type: "business_success", scene: 1, description: "Nghĩ ra ý tưởng tỉ đô", intensity: 7, setup: "Nghèo", payoff: "Có hi vọng"}],
            emotionalArc: { opening: "tuyệt vọng", midpoint: "quyết tâm", climax: "bừng sáng", closing: "mong chờ" },
            cliffhanger: "Sáng mai, liệu mọi chuyện có như dự tính?",
            targetWordCount: 2800
          }),
          finishReason: 'stop' as const,
          promptTokens: 100,
          completionTokens: 100
        };
      }

      if (config.systemPrompt?.includes('WRITER')) {
        return {
          content: MOCK_CHAPTER_CONTENT,
          finishReason: 'stop' as const,
          promptTokens: 100,
          completionTokens: 100
        };
      }

      if (config.systemPrompt?.includes('CRITIC')) {
        return {
          content: JSON.stringify({
            overallScore: 8,
            dopamineScore: 7,
            pacingScore: 8,
            endingHookScore: 8,
            issues: [],
            approved: true,
            requiresRewrite: false,
            rewriteInstructions: ""
          }),
          finishReason: 'stop' as const,
          promptTokens: 100,
          completionTokens: 100
        };
      }

      return { content: "", finishReason: "stop" as const, promptTokens: 0, completionTokens: 0 };
    });
  });

  it('should generate correctly structured prompts', async () => {
    const result = await writeChapter(
      1,
      "Context string mocked...",
      "do-thi",
      2800,
      [],
      { model: 'gemini-3-flash-preview', temperature: 0.7, maxTokens: 4000 },
      1,
      {
        protagonistName: "Trần Phong",
        topicId: "do-thi-kinh-doanh-khoi-nghiep",
        isFinalArc: false
      }
    );
    
    expect(result).toBeDefined();
    expect(result.criticReport?.approved).toBe(true);
  });
});

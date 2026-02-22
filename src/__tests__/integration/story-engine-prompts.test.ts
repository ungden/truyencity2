import { writeChapter } from '../../services/story-engine/pipeline/chapter-writer';

jest.mock('../../services/story-engine/utils/gemini', () => ({
  callGemini: jest.fn().mockImplementation(async (prompt, config) => {
    console.log(`\n=================== SYSTEM PROMPT ===================\n${config.systemPrompt}\n`);
    console.log(`\n=================== PROMPT ===================\n${prompt}\n`);
    
    // Determine which agent is calling based on system prompt
    if (config.systemPrompt?.includes('ARCHITECT')) {
      return {
        content: JSON.stringify({
          chapterNumber: 1,
          title: "Kế Hoạch Khởi Nghiệp Bất Ngờ?",
          summary: "MC gặp khó khăn về tiền bạc và quyết định kinh doanh.",
          pov: "Trần Phong",
          location: "Khu ổ chuột",
          scenes: [
            { order: 1, setting: "Phòng trọ", characters: ["Trần Phong"], goal: "Tìm cách kiếm tiền", conflict: "Không có vốn", resolution: "Nghĩ ra ý tưởng", estimatedWords: 900, pov: "Trần Phong" }
          ],
          tensionLevel: 6,
          dopaminePoints: [{type: "business_success", scene: 1, description: "Nghĩ ra ý tưởng tỉ đô", intensity: 7, setup: "Nghèo", payoff: "Có hi vọng"}],
          emotionalArc: { opening: "tuyệt vọng", midpoint: "quyết tâm", climax: "bừng sáng", closing: "mong chờ" },
          cliffhanger: "Sáng mai, liệu mọi chuyện có như dự tính?",
          targetWordCount: 2800
        }),
        finishReason: 'stop',
        promptTokens: 100,
        completionTokens: 100
      };
    }
    
    if (config.systemPrompt?.includes('WRITER')) {
      return {
        content: "Đây là nội dung chương 1 do Writer viết...",
        finishReason: 'stop',
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
        finishReason: 'stop',
        promptTokens: 100,
        completionTokens: 100
      };
    }
    
    return { content: "", finishReason: "stop", promptTokens: 0, completionTokens: 0 };
  })
}));

describe('Story Engine Prompts', () => {
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
import { geminiProvider } from '@/services/story-factory/provider';

describe('Story Factory provider timeout', () => {
  test('returns control when fetch ignores its abort signal', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    (global.fetch as jest.Mock).mockImplementation(() => new Promise<Response>(() => {}));

    await expect(geminiProvider.text({
      model: 'gemini-3.5-flash',
      system: 'test',
      prompt: 'test',
      timeoutMs: 1,
    })).rejects.toThrow('Provider request exceeded 1ms.');
  }, 10_000);
});

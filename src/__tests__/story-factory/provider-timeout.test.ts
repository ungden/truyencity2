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
      transportRetryLimit: 0,
    })).rejects.toThrow('Provider request exceeded 1ms.');
  }, 10_000);

  test('can fail fast without hidden transport retries', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    (global.fetch as jest.Mock).mockResolvedValue(new Response('busy', { status: 429 }));

    await expect(geminiProvider.text({
      model: 'gemini-3.5-flash',
      system: 'test',
      prompt: 'test',
      transportRetryLimit: 0,
    })).rejects.toThrow('Gemini gemini-3.5-flash 429');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('parks an invalid Gemini credential as revivable infrastructure without spending retry budget', async () => {
    process.env.GEMINI_API_KEY = 'revoked-gemini-key';
    (global.fetch as jest.Mock).mockResolvedValue(new Response(JSON.stringify({
      error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] },
    }), { status: 400 }));

    await expect(geminiProvider.text({
      model: 'gemini-3.5-flash',
      system: 'test',
      prompt: 'test',
      transportRetryLimit: 2,
    })).rejects.toMatchObject({
      code: 'infra_blocked',
      message: expect.stringContaining('GEMINI_API_KEY'),
      evidence: expect.objectContaining({ providerCredential: true }),
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

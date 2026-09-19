import {
  COVER_IMAGE_MODEL, OPENAI_COVER_SIZE, coverInstruction, generateCoverBackdrop, isOpenAiCoverModel,
} from '@/services/story-factory/cover-image';
import { StoryFactoryError } from '@/services/story-factory/contracts';

jest.mock('@/services/gemini-usage-ledger', () => ({
  recordGeminiUsageEvent: jest.fn(async () => undefined),
}));

const PIXEL = Buffer.from('iVBORw0KGgo=', 'base64').toString('base64');

function mockFetch(handler: (url: string, init: RequestInit) => unknown) {
  const spy = jest.fn(async (url: string, init: RequestInit) => {
    const body = handler(url, init);
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
  });
  global.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe('cover image model dispatch', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  test('the default is the premium OpenAI tier, and dispatch follows the model id', () => {
    expect(COVER_IMAGE_MODEL).toBe('gpt-image-2.5-sunburst');
    expect(isOpenAiCoverModel('gpt-image-2.5-sunburst')).toBe(true);
    expect(isOpenAiCoverModel('gpt-image-2.5-flare')).toBe(true);
    expect(isOpenAiCoverModel('gemini-3-pro-image')).toBe(false);
  });

  test('the portrait size is exactly 2:3 with both edges divisible by 16', () => {
    const [width, height] = OPENAI_COVER_SIZE.split('x').map(Number);
    expect(width % 16).toBe(0);
    expect(height % 16).toBe(0);
    expect(height / width).toBeCloseTo(1.5, 10);
    // Comfortably inside OpenAI's 655,360–8,294,400 pixel window.
    expect(width * height).toBeGreaterThan(655_360);
    expect(width * height).toBeLessThan(8_294_400);
    // Larger than the 1200x1800 canvas, so sharp downsamples rather than stretches.
    expect(width).toBeGreaterThanOrEqual(1_200);
    expect(height).toBeGreaterThanOrEqual(1_800);
  });

  test('every backend is told not to draw text, because the title is composited later', () => {
    const instruction = coverInstruction('A harbour at dusk');
    expect(instruction).toMatch(/A harbour at dusk/);
    expect(instruction).toMatch(/Absolutely no text, letters, logos, symbols, signature or watermark/);
  });

  test('an OpenAI cover posts the images endpoint with the portrait size and quality', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const spy = mockFetch(() => ({ data: [{ b64_json: PIXEL }], usage: { output_tokens: 4_000 } }));

    const result = await generateCoverBackdrop({ prompt: 'A harbour at dusk' });

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/images/generations');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: 'gpt-image-2.5-sunburst', size: OPENAI_COVER_SIZE, output_format: 'png', n: 1 });
    expect(body.prompt).toMatch(/A harbour at dusk/);
    expect(result.model).toBe('gpt-image-2.5-sunburst');
    // Reported tokens beat the published tier price: 4,000 × $30/1M.
    expect(result.costUsd).toBeCloseTo(0.12, 4);
    expect(result.costBasis).toBe('reported_tokens');
  });

  test('without reported tokens the published tier price is used, and labelled as such', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.COVER_IMAGE_QUALITY = 'xhigh';
    jest.resetModules();
    const fresh = await import('@/services/story-factory/cover-image');
    mockFetch(() => ({ data: [{ b64_json: PIXEL }] }));

    const result = await fresh.generateCoverBackdrop({ prompt: 'A harbour at dusk' });
    expect(result.costUsd).toBeCloseTo(0.094, 4);
    expect(result.costBasis).toBe('published_tier');
  });

  test('a Gemini cover still uses generateContent with a 2:3 2K image config', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test';
    const spy = mockFetch(() => ({
      candidates: [{ content: { parts: [{ inlineData: { data: PIXEL, mimeType: 'image/png' } }] } }],
    }));

    const result = await generateCoverBackdrop({ prompt: 'A harbour at dusk', model: 'gemini-3-pro-image' });

    const [url, init] = spy.mock.calls[0];
    expect(url).toContain('/models/gemini-3-pro-image:generateContent');
    expect(JSON.parse(init.body as string).generationConfig.imageConfig)
      .toEqual({ aspectRatio: '2:3', imageSize: '2K' });
    // Gemini image spend is itemised in the usage ledger, so it is not counted twice here.
    expect(result.costUsd).toBe(0);
    expect(result.costBasis).toBe('gemini_ledger');
  });

  test('a missing key names the variable and the way back to the other vendor', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(generateCoverBackdrop({ prompt: 'x' })).rejects.toThrow(StoryFactoryError);
    await expect(generateCoverBackdrop({ prompt: 'x' })).rejects
      .toThrow(/needs OPENAI_API_KEY[\s\S]*COVER_IMAGE_MODEL=gemini-3-pro-image/);
  });

  test('a provider error is infra_blocked and carries the status', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    global.fetch = (async () => ({
      ok: false, status: 429, text: async () => 'rate limited',
    })) as unknown as typeof fetch;
    await expect(generateCoverBackdrop({ prompt: 'x' })).rejects.toThrow(/failed with 429/);
  });

  test('an empty response is an error, not a blank cover', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockFetch(() => ({ data: [] }));
    await expect(generateCoverBackdrop({ prompt: 'x' })).rejects.toThrow(/returned no image/);
  });
});

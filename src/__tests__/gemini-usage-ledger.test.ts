import { calculateGeminiUsageCost } from '@/services/gemini-usage-ledger';

describe('Gemini usage ledger pricing', () => {
  test('separates cached prompt, candidate, and thinking tokens for Flash', () => {
    const usage = calculateGeminiUsageCost({
      model: 'gemini-3.5-flash',
      usageMetadata: {
        promptTokenCount: 1_000,
        cachedContentTokenCount: 200,
        candidatesTokenCount: 100,
        thoughtsTokenCount: 50,
        totalTokenCount: 1_150,
      },
      groundingSearchQueries: 2,
    });

    expect(usage).toMatchObject({
      promptTokens: 1_000,
      cachedInputTokens: 200,
      candidateTokens: 100,
      candidateTextTokens: 100,
      thinkingTokens: 50,
      totalTokens: 1_150,
      tokenCostUsd: 0.00258,
      groundingCostUpperUsd: 0.028,
      priceStatus: 'priced',
    });
  });

  test('charges native image output at the image rate instead of the text rate', () => {
    const usage = calculateGeminiUsageCost({
      model: 'gemini-3-pro-image',
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 1_150,
        thoughtsTokenCount: 10,
        candidatesTokensDetails: [
          { modality: 'TEXT', tokenCount: 30 },
          { modality: 'IMAGE', tokenCount: 1_120 },
        ],
      },
    });

    expect(usage).toMatchObject({
      candidateTokens: 1_150,
      candidateTextTokens: 30,
      candidateImageTokens: 1_120,
      thinkingTokens: 10,
      tokenCostUsd: 0.13508,
    });
  });

  test('selects the over-200k Pro price band and never falls back for unknown models', () => {
    const pro = calculateGeminiUsageCost({
      model: 'gemini-3.1-pro-preview',
      usageMetadata: { promptTokenCount: 200_001, candidatesTokenCount: 1 },
    });
    const unknown = calculateGeminiUsageCost({
      model: 'gemini-unpriced-future-model',
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
    });

    expect(pro.tokenCostUsd).toBeCloseTo((200_001 * 4 + 18) / 1_000_000, 12);
    expect(pro.pricing.promptPricingBand).toBe('over_200k');
    expect(unknown).toMatchObject({ priceStatus: 'unpriced', tokenCostUsd: null });
  });
});

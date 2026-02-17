/**
 * AI Provider Service
 * Unified interface for multiple AI providers: DeepSeek, OpenRouter, OpenAI, Claude, Gemini
 */

import {
  AIProviderType,
  AIRequestOptions,
  AIResponse,
  AIMessage,
  AI_PROVIDERS,
} from '@/lib/types/ai-providers';

export class AIProviderService {
  private apiKeys: Partial<Record<AIProviderType, string>> = {};

  // Token bucket rate limiter for Gemini API (shared across all parallel projects in one cron tick)
  // Tier 3 Gemini Flash = 20,000 RPM; we use 2,000 RPM (10%) to leave safe headroom
  private static geminiRateLimit = {
    tokens: 2000,
    maxTokens: 2000,
    refillRate: 2000 / 60, // ~33.3 tokens/second
    lastRefill: Date.now(),
  };

  constructor(apiKeys?: Partial<Record<AIProviderType, string>>) {
    this.apiKeys = apiKeys || {};
  }

  /**
   * Wait for a Gemini rate limit token before making an API call.
   * Uses a static token bucket shared across all AIProviderService instances.
   */
  private async waitForGeminiRateLimit(): Promise<void> {
    const rl = AIProviderService.geminiRateLimit;
    const now = Date.now();
    const elapsed = (now - rl.lastRefill) / 1000;
    rl.tokens = Math.min(rl.maxTokens, rl.tokens + elapsed * rl.refillRate);
    rl.lastRefill = now;

    if (rl.tokens < 1) {
      const waitMs = Math.ceil((1 - rl.tokens) / rl.refillRate * 1000);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      rl.tokens = 1;
      rl.lastRefill = Date.now();
    }

    rl.tokens -= 1;
  }

  setApiKey(provider: AIProviderType, apiKey: string) {
    this.apiKeys[provider] = apiKey;
  }

  getApiKey(provider: AIProviderType): string | undefined {
    return this.apiKeys[provider];
  }

  async chat(options: AIRequestOptions): Promise<AIResponse> {
    const { provider, model, messages, temperature = 0.7, maxTokens = 4096, apiKey } = options;

    const effectiveApiKey = apiKey || this.apiKeys[provider];

    if (!effectiveApiKey) {
      return {
        success: false,
        error: `API key not configured for provider: ${provider}. Please set GEMINI_API_KEY env var or provide it in settings.`,
      };
    }

    try {
      switch (provider) {
        case 'deepseek':
          return await this.callDeepSeek(effectiveApiKey, model, messages, temperature, maxTokens);
        case 'openrouter':
          return await this.callOpenRouter(effectiveApiKey, model, messages, temperature, maxTokens);
        case 'openai':
          return await this.callOpenAI(effectiveApiKey, model, messages, temperature, maxTokens);
        case 'claude':
          return await this.callClaude(effectiveApiKey, model, messages, temperature, maxTokens);
        case 'gemini':
          return await this.callGemini(effectiveApiKey, model, messages, temperature, maxTokens);
        default:
          return {
            success: false,
            error: `Unknown provider: ${provider}`,
          };
      }
    } catch (error) {
      console.error(`[AIProviderService] Error calling ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async callDeepSeek(
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    // Official Docs: https://api.deepseek.com/chat/completions
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false, // Explicitly set stream to false as per user example
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      provider: 'deepseek',
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  private async callOpenRouter(
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TruyenCity AI Writer',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      provider: 'openrouter',
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      provider: 'openai',
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  private async callClaude(
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content || undefined,
        messages: nonSystemMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Claude returns content as an array of content blocks
    const content = data.content?.map((block: { type: string; text?: string }) =>
      block.type === 'text' ? block.text : ''
    ).join('') || '';

    return {
      success: true,
      content,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
      provider: 'claude',
      finishReason: data.stop_reason,
    };
  }

  private async callGemini(
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    // Wait for rate limit token before making the request
    await this.waitForGeminiRateLimit();

    // Convert messages to Gemini format
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    // Build contents array for Gemini
    const contents = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
        frequencyPenalty: 0.4,
        presencePenalty: 0.1,
      },
    };

    // Add system instruction if present
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    // Retry with exponential backoff for rate limit (429) and server errors (503)
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || 10000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Extract content from Gemini response
        const content = data.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text || '')
          .join('') || '';

        return {
          success: true,
          content,
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
          model,
          provider: 'gemini',
          finishReason: data.candidates?.[0]?.finishReason,
        };
      }

      // Retryable errors: 429 (rate limit) and 503 (server overload)
      if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
        // Drain rate limit tokens on 429 to slow down all concurrent callers
        if (response.status === 429) {
          AIProviderService.geminiRateLimit.tokens = Math.max(0, AIProviderService.geminiRateLimit.tokens - 10);
        }
        const errorText = await response.text();
        lastError = new Error(`Gemini API error: ${response.status} - ${errorText}`);
        continue;
      }

      // Non-retryable error or final attempt — throw immediately
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // Should not reach here, but safety net
    throw lastError || new Error('Gemini API: max retries exceeded');
  }

  // Streaming support for real-time output
  async *chatStream(options: AIRequestOptions): AsyncGenerator<{ content: string; done: boolean }> {
    const { provider, apiKey } = options;

    const effectiveApiKey = apiKey || this.apiKeys[provider];

    if (!effectiveApiKey) {
      yield { content: `Error: API key not configured for provider: ${provider}`, done: true };
      return;
    }

    try {
      // For now, use non-streaming and yield the result
      // TODO: Implement true streaming for each provider
      const result = await this.chat(options);

      if (result.success && result.content) {
        // Simulate streaming by yielding chunks
        const words = result.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          yield {
            content: words[i] + (i < words.length - 1 ? ' ' : ''),
            done: i === words.length - 1
          };
        }
      } else {
        yield { content: result.error || 'Unknown error', done: true };
      }
    } catch (error) {
      yield {
        content: error instanceof Error ? error.message : 'Unknown error',
        done: true
      };
    }
  }

  // Get available models for a provider
  getModels(provider: AIProviderType) {
    return AI_PROVIDERS[provider]?.models || [];
  }

  // Get provider configuration
  getProviderConfig(provider: AIProviderType) {
    return AI_PROVIDERS[provider];
  }

  // Get all providers
  getAllProviders() {
    return Object.values(AI_PROVIDERS);
  }

  // Validate API key by making a test request
  async validateApiKey(provider: AIProviderType, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await this.chat({
        provider,
        model: AI_PROVIDERS[provider].defaultModel,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0,
        maxTokens: 10,
        apiKey,
      });

      return { valid: result.success, error: result.error };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }
}

// Singleton instance for server-side use
let serverInstance: AIProviderService | null = null;

export function getAIProviderService(): AIProviderService {
  if (!serverInstance) {
    serverInstance = new AIProviderService({
      gemini: process.env.GEMINI_API_KEY,
    });
  }
  return serverInstance;
}

/**
 * Gemini Client for Story Factory
 * Wrapper for Google Gemini API for text generation
 */

import { GeminiGenerateOptions, ServiceResult } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(options?: {
    apiKey?: string;
    defaultModel?: string;
    defaultTemperature?: number;
    defaultMaxTokens?: number;
  }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = options?.defaultModel || 'gemini-2.0-flash-exp';
    this.defaultTemperature = options?.defaultTemperature || 0.8;
    this.defaultMaxTokens = options?.defaultMaxTokens || 8192;

    if (!this.apiKey) {
      console.warn('[GeminiClient] No API key provided. Set GEMINI_API_KEY env var.');
    }
  }

  /**
   * Generate text content using Gemini
   */
  async generate(
    prompt: string,
    options?: GeminiGenerateOptions
  ): Promise<ServiceResult<GeminiResponse>> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxOutputTokens = options?.maxOutputTokens || this.defaultMaxTokens;

    try {
      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          topP: options?.topP ?? 0.95,
          topK: options?.topK ?? 40,
        },
      };

      // Add system instruction if provided
      if (options?.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiClient] API error:', response.status, errorText);
        return {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorText}`,
          errorCode: `GEMINI_${response.status}`,
        };
      }

      const data = await response.json();

      // Check for blocked content
      if (data.promptFeedback?.blockReason) {
        return {
          success: false,
          error: `Content blocked: ${data.promptFeedback.blockReason}`,
          errorCode: 'GEMINI_BLOCKED',
        };
      }

      // Extract content
      const content =
        data.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text || '')
          .join('') || '';

      if (!content) {
        return {
          success: false,
          error: 'No content generated',
          errorCode: 'GEMINI_NO_CONTENT',
        };
      }

      return {
        success: true,
        data: {
          content,
          finishReason: data.candidates?.[0]?.finishReason || 'UNKNOWN',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        },
      };
    } catch (error) {
      console.error('[GeminiClient] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GEMINI_EXCEPTION',
      };
    }
  }

  /**
   * Generate with chat history (multi-turn conversation)
   */
  async chat(
    messages: GeminiMessage[],
    options?: GeminiGenerateOptions
  ): Promise<ServiceResult<GeminiResponse>> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxOutputTokens = options?.maxOutputTokens || this.defaultMaxTokens;

    try {
      const requestBody: Record<string, unknown> = {
        contents: messages,
        generationConfig: {
          temperature,
          maxOutputTokens,
          topP: options?.topP ?? 0.95,
          topK: options?.topK ?? 40,
        },
      };

      if (options?.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorText}`,
          errorCode: `GEMINI_${response.status}`,
        };
      }

      const data = await response.json();

      if (data.promptFeedback?.blockReason) {
        return {
          success: false,
          error: `Content blocked: ${data.promptFeedback.blockReason}`,
          errorCode: 'GEMINI_BLOCKED',
        };
      }

      const content =
        data.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text || '')
          .join('') || '';

      if (!content) {
        return {
          success: false,
          error: 'No content generated',
          errorCode: 'GEMINI_NO_CONTENT',
        };
      }

      return {
        success: true,
        data: {
          content,
          finishReason: data.candidates?.[0]?.finishReason || 'UNKNOWN',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        },
      };
    } catch (error) {
      console.error('[GeminiClient] Chat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GEMINI_EXCEPTION',
      };
    }
  }

  /**
   * Generate JSON structured output
   */
  async generateJSON<T>(
    prompt: string,
    options?: GeminiGenerateOptions
  ): Promise<ServiceResult<T>> {
    // Add JSON instruction to prompt
    const jsonPrompt = `${prompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.`;

    const result = await this.generate(jsonPrompt, {
      ...options,
      temperature: options?.temperature ?? 0.7, // Lower temperature for JSON
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      };
    }

    try {
      // Try to extract JSON from response
      let jsonStr = result.data.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr) as T;
      return {
        success: true,
        data: parsed,
      };
    } catch (parseError) {
      console.error('[GeminiClient] JSON parse error:', parseError);
      console.error('[GeminiClient] Raw content:', result.data.content);
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        errorCode: 'GEMINI_JSON_PARSE',
      };
    }
  }

  /**
   * Generate with retry logic
   */
  async generateWithRetry(
    prompt: string,
    options?: GeminiGenerateOptions & { maxRetries?: number; retryDelay?: number }
  ): Promise<ServiceResult<GeminiResponse>> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 1000;

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.generate(prompt, options);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Don't retry if content was blocked
      if (result.errorCode === 'GEMINI_BLOCKED') {
        return result;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        console.warn(`[GeminiClient] Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      errorCode: 'GEMINI_MAX_RETRIES',
    };
  }

  /**
   * Count tokens in text (approximate)
   */
  async countTokens(text: string): Promise<ServiceResult<number>> {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${this.defaultModel}:countTokens?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
          }),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Token count failed: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.totalTokens || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instance
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient();
  }
  return geminiClientInstance;
}

export function createGeminiClient(options?: {
  apiKey?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}): GeminiClient {
  return new GeminiClient(options);
}

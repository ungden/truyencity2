/**
 * Gemini Image Service for Story Factory
 * Uses Google Imagen 3 for cover image generation
 */

import { GeminiImageOptions, GeminiImageResult, ServiceResult } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  options?: GeminiImageOptions;
}

export class GeminiImageService {
  private apiKey: string;
  private defaultModel: string;

  constructor(options?: { apiKey?: string; defaultModel?: string }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = options?.defaultModel || 'imagen-3.0-generate-001';

    if (!this.apiKey) {
      console.warn('[GeminiImageService] No API key provided. Set GEMINI_API_KEY env var.');
    }
  }

  /**
   * Generate image using Imagen 3
   */
  async generateImage(request: ImageGenerationRequest): Promise<ServiceResult<GeminiImageResult>> {
    const { prompt, negativePrompt, options } = request;
    const model = options?.model || this.defaultModel;

    try {
      const requestBody: Record<string, unknown> = {
        instances: [
          {
            prompt: this.buildImagePrompt(prompt, negativePrompt),
          },
        ],
        parameters: {
          sampleCount: options?.numberOfImages || 1,
          aspectRatio: options?.aspectRatio || '3:4', // Default book cover ratio
          personGeneration: options?.personGeneration || 'allow_adult',
          safetyFilterLevel: options?.safetyFilterLevel || 'block_medium_and_above',
        },
      };

      // Imagen 3 uses a different endpoint structure
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:predict?key=${this.apiKey}`,
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
        console.error('[GeminiImageService] API error:', response.status, errorText);

        // Check for specific error types
        if (response.status === 400 && errorText.includes('SAFETY')) {
          return {
            success: false,
            error: 'Image generation blocked by safety filters',
            errorCode: 'IMAGE_SAFETY_BLOCK',
          };
        }

        return {
          success: false,
          error: `Imagen API error: ${response.status} - ${errorText}`,
          errorCode: `IMAGEN_${response.status}`,
        };
      }

      const data = await response.json();

      // Extract images from response
      const images =
        data.predictions?.map((pred: { bytesBase64Encoded?: string; mimeType?: string }) => ({
          base64: pred.bytesBase64Encoded || '',
          mimeType: pred.mimeType || 'image/png',
        })) || [];

      if (images.length === 0) {
        return {
          success: false,
          error: 'No images generated',
          errorCode: 'IMAGEN_NO_OUTPUT',
        };
      }

      return {
        success: true,
        data: {
          success: true,
          images,
        },
      };
    } catch (error) {
      console.error('[GeminiImageService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'IMAGEN_EXCEPTION',
      };
    }
  }

  /**
   * Generate a book cover image
   */
  async generateBookCover(
    title: string,
    genre: string,
    description: string,
    style?: string
  ): Promise<ServiceResult<GeminiImageResult>> {
    const prompt = this.buildCoverPrompt(title, genre, description, style);

    return this.generateImage({
      prompt,
      negativePrompt: 'text, words, letters, watermark, signature, blurry, low quality, distorted',
      options: {
        aspectRatio: '3:4', // Book cover ratio
        numberOfImages: 1,
        personGeneration: 'allow_adult',
        safetyFilterLevel: 'block_medium_and_above',
      },
    });
  }

  /**
   * Build image prompt with optional negative prompt
   */
  private buildImagePrompt(prompt: string, negativePrompt?: string): string {
    if (negativePrompt) {
      return `${prompt}. Avoid: ${negativePrompt}`;
    }
    return prompt;
  }

  /**
   * Build a prompt for book cover generation
   */
  private buildCoverPrompt(
    title: string,
    genre: string,
    description: string,
    style?: string
  ): string {
    const genreStyles = this.getGenreStyle(genre);
    const baseStyle = style || genreStyles.style;

    return `Book cover art for "${title}". 
Genre: ${genre}. 
Style: ${baseStyle}, professional book cover design, high quality illustration, dramatic lighting, cinematic composition.
Scene: ${description}
${genreStyles.elements}
No text, no title, no words - image only. Ultra detailed, 8k quality, trending on artstation.`;
  }

  /**
   * Get genre-specific style elements
   */
  private getGenreStyle(genre: string): { style: string; elements: string } {
    const styles: Record<string, { style: string; elements: string }> = {
      'system-litrpg': {
        style: 'fantasy RPG game art',
        elements:
          'holographic UI elements, status windows, gaming interface aesthetic, glowing effects',
      },
      'urban-modern': {
        style: 'modern urban photography style',
        elements:
          'city skyline, modern architecture, sleek corporate aesthetic, neon lights, luxury cars',
      },
      romance: {
        style: 'romantic illustration',
        elements:
          'soft lighting, emotional atmosphere, beautiful characters, dreamy bokeh, warm colors',
      },
      'huyen-huyen': {
        style: 'Chinese fantasy xuanhuan art',
        elements:
          'mystical creatures, floating mountains, magical auras, ancient Chinese architecture, celestial themes',
      },
      'action-adventure': {
        style: 'action movie poster',
        elements:
          'dynamic poses, explosions, intense lighting, dramatic composition, epic scale',
      },
      historical: {
        style: 'historical painting',
        elements:
          'period-accurate costumes, ancient architecture, traditional art style, rich textures',
      },
      'tien-hiep': {
        style: 'Chinese cultivation fantasy art',
        elements:
          'immortal cultivators, sword qi, floating pavilions, clouds, celestial atmosphere, yin-yang symbolism',
      },
      'sci-fi-apocalypse': {
        style: 'sci-fi concept art',
        elements:
          'futuristic technology, post-apocalyptic landscapes, cyberpunk elements, alien worlds, space ships',
      },
      'horror-mystery': {
        style: 'dark gothic art',
        elements:
          'atmospheric shadows, eerie lighting, mysterious silhouettes, fog, haunting imagery',
      },
    };

    return (
      styles[genre] || {
        style: 'professional book cover art',
        elements: 'high quality illustration, dramatic lighting',
      }
    );
  }

  /**
   * Convert base64 image to data URL
   */
  base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Upload image to storage and return URL
   * This is a placeholder - implement with your storage solution
   */
  async uploadImage(
    base64: string,
    filename: string,
    bucket: string = 'covers'
  ): Promise<ServiceResult<string>> {
    // This would be implemented with Supabase Storage or similar
    // For now, return a placeholder
    console.log(`[GeminiImageService] Would upload ${filename} to ${bucket}`);

    // TODO: Implement actual upload
    // const supabase = createServerClient();
    // const { data, error } = await supabase.storage
    //   .from(bucket)
    //   .upload(filename, Buffer.from(base64, 'base64'), {
    //     contentType: 'image/png',
    //   });

    return {
      success: false,
      error: 'Image upload not implemented - use Supabase storage',
      errorCode: 'NOT_IMPLEMENTED',
    };
  }

  /**
   * Generate cover with retry and fallback
   */
  async generateCoverWithRetry(
    title: string,
    genre: string,
    description: string,
    maxRetries: number = 3
  ): Promise<ServiceResult<GeminiImageResult>> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.generateBookCover(title, genre, description);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // If safety blocked, try with modified prompt
      if (result.errorCode === 'IMAGE_SAFETY_BLOCK' && attempt < maxRetries) {
        console.warn(`[GeminiImageService] Safety block on attempt ${attempt}, modifying prompt...`);
        // Simplify the description for next attempt
        const simplifiedDescription = this.sanitizeDescription(description);
        const retryResult = await this.generateBookCover(
          title,
          genre,
          simplifiedDescription,
          'abstract artistic'
        );
        if (retryResult.success) {
          return retryResult;
        }
      }

      if (attempt < maxRetries) {
        console.warn(`[GeminiImageService] Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      errorCode: 'IMAGEN_MAX_RETRIES',
    };
  }

  /**
   * Sanitize description to avoid safety filters
   */
  private sanitizeDescription(description: string): string {
    // Remove potentially problematic words
    const safeDescription = description
      .replace(/blood|gore|death|kill|murder|violent|weapon/gi, '')
      .replace(/sexy|nude|naked|erotic/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return safeDescription || 'dramatic fantasy scene with magical elements';
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

// Singleton instance
let imageServiceInstance: GeminiImageService | null = null;

export function getGeminiImageService(): GeminiImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new GeminiImageService();
  }
  return imageServiceInstance;
}

export function createGeminiImageService(options?: {
  apiKey?: string;
  defaultModel?: string;
}): GeminiImageService {
  return new GeminiImageService(options);
}

/**
 * Gemini Image Service for Story Factory
 * Uses Gemini 3 Pro Image Preview (gemini-3-pro-image-preview) ONLY
 * 
 * Features:
 * - Best quality image generation with 4K support
 * - Advanced text rendering (can render Vietnamese titles natively)
 * - Thinking mode for refined composition
 * - Upload to Supabase Storage
 * - Job-based async processing for long operations
 * 
 * IMPORTANT: NEVER use gemini-2.0-flash-preview-image-generation.
 * The correct model is gemini-3-pro-image-preview.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  GeminiImageOptions, 
  GeminiImageResult, 
  ServiceResult,
  ImageAspectRatio,
  ImageResolution 
} from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-3-pro-image-preview';

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  options?: GeminiImageOptions;
}

export interface ImageJobResult {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  resultUrl?: string;
  errorMessage?: string;
}

export class GeminiImageService {
  private apiKey: string;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: { 
    apiKey?: string; 
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || '';
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!this.apiKey) {
      console.warn('[GeminiImageService] No API key provided. Set GEMINI_API_KEY env var.');
    }
  }

  private getSupabase(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Generate image using Gemini 3 Pro Image Preview
   */
  async generateImage(request: ImageGenerationRequest): Promise<ServiceResult<GeminiImageResult>> {
    const { prompt, negativePrompt, options } = request;

    try {
      const fullPrompt = this.buildImagePrompt(prompt, negativePrompt);

      const generationConfig: Record<string, unknown> = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: options?.aspectRatio || '3:4',
          imageSize: options?.imageSize || '2K',
        },
      };

      const requestBody: Record<string, unknown> = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig,
      };

      if (options?.useGoogleSearch) {
        requestBody.tools = [{ google_search: {} }];
      }

      console.log(`[GeminiImageService] Generating with ${MODEL}...`);

      const response = await fetch(
        `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiImageService] API error:', response.status, errorText);

        if (response.status === 400 && errorText.includes('SAFETY')) {
          return {
            success: false,
            error: 'Image generation blocked by safety filters',
            errorCode: 'IMAGE_SAFETY_BLOCK',
          };
        }

        return {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorText}`,
          errorCode: `GEMINI_${response.status}`,
        };
      }

      const data = await response.json();

      const images: Array<{ base64: string; mimeType: string }> = [];
      let responseText = '';

      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.thought) continue;
        if (part.text) {
          responseText += part.text;
        } else if (part.inlineData) {
          images.push({
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          });
        }
      }

      if (images.length === 0) {
        return {
          success: false,
          error: 'No images generated',
          errorCode: 'GEMINI_NO_IMAGE_OUTPUT',
        };
      }

      console.log(`[GeminiImageService] Generated ${images.length} image(s)`);

      return {
        success: true,
        data: {
          success: true,
          images,
          text: responseText || undefined,
        },
      };
    } catch (error) {
      console.error('[GeminiImageService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GEMINI_EXCEPTION',
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
    style?: string,
    options?: {
      resolution?: ImageResolution;
      aspectRatio?: ImageAspectRatio;
    }
  ): Promise<ServiceResult<GeminiImageResult>> {
    const prompt = this.buildCoverPrompt(title, genre, description, style);

    return this.generateImage({
      prompt,
      negativePrompt: 'watermark, signature, blurry, low quality, distorted, deformed',
      options: {
        aspectRatio: options?.aspectRatio || '3:4',
        imageSize: options?.resolution || '2K',
        numberOfImages: 1,
      },
    });
  }

  /**
   * Generate cover with high resolution (4K)
   */
  async generateHighResCover(
    title: string,
    genre: string,
    description: string,
    style?: string
  ): Promise<ServiceResult<GeminiImageResult>> {
    return this.generateBookCover(title, genre, description, style, {
      resolution: '4K'
    });
  }

  /**
   * Generate cover and upload to Supabase Storage
   */
  async generateAndUploadCover(
    title: string,
    genre: string,
    description: string,
    options?: {
      resolution?: ImageResolution;
      aspectRatio?: ImageAspectRatio;
      bucket?: string;
      filePrefix?: string;
    }
  ): Promise<ServiceResult<{ publicUrl: string; fileName: string }>> {
    const result = await this.generateBookCover(title, genre, description, undefined, {
      resolution: options?.resolution || '2K',
      aspectRatio: options?.aspectRatio || '3:4',
    });

    if (!result.success || !result.data?.images?.[0]) {
      return {
        success: false,
        error: result.error || 'Failed to generate image',
        errorCode: result.errorCode,
      };
    }

    const image = result.data.images[0];
    return this.uploadToStorage(
      image.base64,
      image.mimeType,
      options?.bucket || 'covers',
      options?.filePrefix || 'cover'
    );
  }

  /**
   * Upload base64 image to Supabase Storage
   */
  async uploadToStorage(
    base64Data: string,
    mimeType: string,
    bucket: string = 'covers',
    filePrefix: string = 'ai'
  ): Promise<ServiceResult<{ publicUrl: string; fileName: string }>> {
    try {
      const supabase = this.getSupabase();
      
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `${filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const buffer = Buffer.from(base64Data, 'base64');

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error('[GeminiImageService] Upload error:', uploadError);
        return {
          success: false,
          error: `Storage upload failed: ${uploadError.message}`,
          errorCode: 'STORAGE_UPLOAD_ERROR',
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        return {
          success: false,
          error: 'Failed to get public URL',
          errorCode: 'STORAGE_URL_ERROR',
        };
      }

      console.log(`[GeminiImageService] Uploaded to ${bucket}/${fileName}`);

      return {
        success: true,
        data: { publicUrl, fileName },
      };
    } catch (error) {
      console.error('[GeminiImageService] Upload exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STORAGE_EXCEPTION',
      };
    }
  }

  /**
   * Create an image generation job for async processing
   */
  async createImageJob(
    prompt: string,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResult<{ jobId: string }>> {
    try {
      const supabase = this.getSupabase();

      const { data, error } = await supabase
        .from('ai_image_jobs')
        .insert({
          prompt,
          status: 'pending',
          metadata,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create job: ${error.message}`,
          errorCode: 'JOB_CREATE_ERROR',
        };
      }

      return {
        success: true,
        data: { jobId: data.id },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'JOB_EXCEPTION',
      };
    }
  }

  /**
   * Process an image job (for use in Edge Functions)
   */
  async processImageJob(jobId: string): Promise<ServiceResult<ImageJobResult>> {
    const supabase = this.getSupabase();

    try {
      const { data: job, error: fetchError } = await supabase
        .from('ai_image_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !job) {
        return {
          success: false,
          error: 'Job not found',
          errorCode: 'JOB_NOT_FOUND',
        };
      }

      await supabase
        .from('ai_image_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', jobId);

      const result = await this.generateImage({
        prompt: job.prompt,
        options: job.metadata?.options || {},
      });

      if (!result.success || !result.data?.images?.[0]) {
        await supabase
          .from('ai_image_jobs')
          .update({ 
            status: 'failed', 
            error_message: result.error,
            updated_at: new Date().toISOString() 
          })
          .eq('id', jobId);

        return {
          success: false,
          error: result.error,
          data: { jobId, status: 'failed', errorMessage: result.error },
        };
      }

      const image = result.data.images[0];
      const uploadResult = await this.uploadToStorage(
        image.base64,
        image.mimeType,
        job.metadata?.bucket || 'covers',
        job.metadata?.filePrefix || 'ai'
      );

      if (!uploadResult.success || !uploadResult.data) {
        await supabase
          .from('ai_image_jobs')
          .update({ 
            status: 'failed', 
            error_message: uploadResult.error,
            updated_at: new Date().toISOString() 
          })
          .eq('id', jobId);

        return {
          success: false,
          error: uploadResult.error,
          data: { jobId, status: 'failed', errorMessage: uploadResult.error },
        };
      }

      await supabase
        .from('ai_image_jobs')
        .update({ 
          status: 'completed', 
          result_url: uploadResult.data.publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('id', jobId);

      return {
        success: true,
        data: { 
          jobId, 
          status: 'completed', 
          resultUrl: uploadResult.data.publicUrl 
        },
      };
    } catch (error) {
      console.error(`[GeminiImageService] Job ${jobId} error:`, error);
      
      await supabase
        .from('ai_image_jobs')
        .update({ 
          status: 'failed', 
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString() 
        })
        .eq('id', jobId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { jobId, status: 'failed' },
      };
    }
  }

  private buildImagePrompt(prompt: string, negativePrompt?: string): string {
    if (negativePrompt) {
      return `${prompt}. Avoid: ${negativePrompt}`;
    }
    return prompt;
  }

  private buildCoverPrompt(
    title: string,
    genre: string,
    description: string,
    style?: string
  ): string {
    const genreStyles = this.getGenreStyle(genre);
    const baseStyle = style || genreStyles.style;

    return `Create a stunning professional webnovel book cover.

GENRE: ${genre}
STYLE: ${baseStyle}

SCENE DESCRIPTION:
${description}

VISUAL REQUIREMENTS:
- ${genreStyles.elements}
- Professional book cover composition, vertical 3:4
- Dramatic cinematic lighting with rich colors
- High detail and ultra-sharp focus
- Atmospheric depth and mood
- Visually striking and eye-catching design

TEXT ON COVER (MUST render these exactly):
- Title text must be exactly: "${title}". Place at the top-center in large bold serif font, high contrast, perfectly readable.
- At the bottom-center, include small text: "Truyencity.com"
- No other text besides the title and Truyencity.com

IMPORTANT:
- No watermarks or signatures besides Truyencity.com
- Create a complete, publication-ready cover illustration`;
  }

  private getGenreStyle(genre: string): { style: string; elements: string } {
    const styles: Record<string, { style: string; elements: string }> = {
      'system-litrpg': {
        style: 'epic fantasy RPG game art with holographic UI elements',
        elements: 'Glowing status windows, magical interface elements, gaming aesthetic, fantasy world with modern UI overlays',
      },
      'urban-modern': {
        style: 'sleek modern urban photography with cinematic color grading',
        elements: 'City skyline, modern architecture, luxury aesthetic, neon lights reflecting on wet streets, high contrast',
      },
      romance: {
        style: 'romantic soft-focus illustration with dreamy atmosphere',
        elements: 'Soft golden hour lighting, emotional atmosphere, beautiful characters, dreamy bokeh, warm pastel colors',
      },
      'huyen-huyen': {
        style: 'Chinese xuanhuan fantasy art with ethereal quality',
        elements: 'Mystical creatures, floating mountains in clouds, magical auras, ancient Chinese architecture, celestial themes',
      },
      'action-adventure': {
        style: 'dynamic action movie poster with explosive energy',
        elements: 'Dynamic poses in motion, dramatic lighting effects, intense composition, epic sense of scale',
      },
      historical: {
        style: 'classical oil painting with historical accuracy',
        elements: 'Period-accurate costumes and architecture, traditional art techniques, rich detailed textures, golden age lighting',
      },
      'tien-hiep': {
        style: 'Chinese cultivation fantasy with celestial atmosphere',
        elements: 'Immortal cultivators with flowing robes, sword qi energy, floating pavilions in clouds, yin-yang symbolism, ethereal mist',
      },
      'sci-fi-apocalypse': {
        style: 'cyberpunk sci-fi concept art with dystopian atmosphere',
        elements: 'Futuristic technology, post-apocalyptic landscapes, neon holographics, alien worlds, massive spacecraft',
      },
      'horror-mystery': {
        style: 'dark gothic atmospheric art with unsettling mood',
        elements: 'Deep shadows and atmospheric fog, eerie dramatic lighting, mysterious silhouettes, haunting imagery',
      },
    };

    return styles[genre] || {
      style: 'professional fantasy book cover art',
      elements: 'High quality dramatic illustration, cinematic lighting, atmospheric depth',
    };
  }

  base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Generate cover with retry
   */
  async generateCoverWithRetry(
    title: string,
    genre: string,
    description: string,
    maxRetries: number = 3
  ): Promise<ServiceResult<GeminiImageResult>> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[GeminiImageService] Attempt ${attempt}/${maxRetries}...`);
      
      const result = await this.generateBookCover(title, genre, description, undefined, {
        resolution: '2K'
      });

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (result.errorCode === 'IMAGE_SAFETY_BLOCK') {
        console.warn(`[GeminiImageService] Safety block, modifying prompt...`);
        const simplifiedDescription = this.sanitizeDescription(description);
        const retryResult = await this.generateBookCover(
          title, genre, simplifiedDescription, 'abstract artistic'
        );
        if (retryResult.success) {
          return retryResult;
        }
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      errorCode: 'GEMINI_MAX_RETRIES',
    };
  }

  /**
   * Generate cover and upload with retry
   */
  async generateCoverWithUpload(
    title: string,
    genre: string,
    description: string,
    options?: {
      bucket?: string;
      maxRetries?: number;
    }
  ): Promise<ServiceResult<string>> {
    const result = await this.generateCoverWithRetry(
      title, genre, description, options?.maxRetries || 3
    );

    if (!result.success || !result.data?.images?.[0]) {
      return {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      };
    }

    const image = result.data.images[0];
    const uploadResult = await this.uploadToStorage(
      image.base64, image.mimeType, options?.bucket || 'covers', 'cover'
    );

    if (!uploadResult.success || !uploadResult.data) {
      return {
        success: false,
        error: uploadResult.error,
        errorCode: uploadResult.errorCode,
      };
    }

    return {
      success: true,
      data: uploadResult.data.publicUrl,
    };
  }

  private sanitizeDescription(description: string): string {
    const safeDescription = description
      .replace(/blood|gore|death|kill|murder|violent|weapon/gi, '')
      .replace(/sexy|nude|naked|erotic/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return safeDescription || 'dramatic fantasy scene with magical elements';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  getModelInfo(): { id: string; name: string; description: string } {
    return {
      id: MODEL,
      name: 'Gemini 3 Pro Image Preview',
      description: 'High quality image generation with native text rendering and 4K support'
    };
  }
}

// Singleton
let imageServiceInstance: GeminiImageService | null = null;

export function getGeminiImageService(): GeminiImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new GeminiImageService();
  }
  return imageServiceInstance;
}

export function createGeminiImageService(options?: {
  apiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}): GeminiImageService {
  return new GeminiImageService(options);
}

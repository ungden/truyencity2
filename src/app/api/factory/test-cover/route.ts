/**
 * Test Cover Generation API
 * Endpoint to test the Gemini 3 Pro Image Preview integration
 * 
 * Features:
 * - Generate and return base64 image (quick test)
 * - Generate and upload to Supabase Storage (production use)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiImageService } from '@/services/factory';
import { factoryAuth, finalizeResponse } from '../_auth';

export const maxDuration = 120; // 2 minutes for image generation

// Only Gemini 3 Pro Image Preview (gemini-3-pro-image-preview)

export async function POST(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/test-cover');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { 
      title = 'Thiên Đạo Vô Song',
      genre = 'tien-hiep',
      description = 'Thiếu niên tu luyện đứng giữa mây trắng, kiếm khí xung thiên, áo trắng phất phơ trong gió',
      // model is always gemini-3-pro-image-preview
      resolution = '2K',
      aspectRatio = '3:4',
      uploadToStorage = false,  // Set true to upload to Supabase Storage
      bucket = 'covers'
    } = body;

    console.log('[Test Cover] Starting generation with Gemini 3 Pro Image...');
    console.log(`  Title: ${title}`);
    console.log(`  Genre: ${genre}`);
    console.log(`  Resolution: ${resolution}`);
    console.log(`  Upload: ${uploadToStorage}`);

    const imageService = getGeminiImageService();

    if (!imageService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY not configured',
      }, { status: 500 });
    }

    const startTime = Date.now();

    // Option 1: Generate and upload to storage
    if (uploadToStorage) {
      const result = await imageService.generateCoverWithUpload(
        title,
        genre,
        description,
        { bucket, maxRetries: 2 }
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        console.error('[Test Cover] Generation/Upload failed:', result.error);
        return NextResponse.json({
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          duration,
        }, { status: 400 });
      }

      console.log(`[Test Cover] Success! Generated and uploaded in ${duration}ms`);

      return finalizeResponse(NextResponse.json({
        success: true,
        data: {
          publicUrl: result.data,
          model: 'gemini-3-pro-image-preview',
          duration,
          uploaded: true,
        }
      }), auth, '/api/factory/test-cover', 'POST');
    }

    // Option 2: Generate and return base64 (no upload)
    const result = await imageService.generateBookCover(
      title,
      genre,
      description,
      undefined,
      {
        resolution: resolution as '1K' | '2K' | '4K',
        aspectRatio: aspectRatio as any
      }
    );

    const duration = Date.now() - startTime;

    if (!result.success || !result.data?.images?.[0]) {
      console.error('[Test Cover] Generation failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        duration,
      }, { status: 400 });
    }

    const image = result.data.images[0];
    const dataUrl = imageService.base64ToDataUrl(image.base64, image.mimeType);

    console.log(`[Test Cover] Success! Generated in ${duration}ms`);
    console.log(`  Image size: ${Math.round(image.base64.length / 1024)}KB`);

    return finalizeResponse(NextResponse.json({
      success: true,
      data: {
        imageDataUrl: dataUrl,
        mimeType: image.mimeType,
        sizeKB: Math.round(image.base64.length / 1024),
        text: result.data.text,
        model: 'gemini-3-pro-image-preview',
        duration,
        uploaded: false,
      }
    }), auth, '/api/factory/test-cover', 'POST');

  } catch (error) {
    console.error('[Test Cover] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await factoryAuth(request, '/api/factory/test-cover');
    if (!auth.success) return auth.response;

    const imageService = getGeminiImageService();
  
    return finalizeResponse(NextResponse.json({
      configured: imageService.isConfigured(),
      model: imageService.getModelInfo(),
      supportedResolutions: ['1K', '2K', '4K'],
      supportedAspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      usage: {
        endpoint: 'POST /api/factory/test-cover',
        body: {
          title: 'string (optional) - Book title',
          genre: 'string (optional) - tien-hiep, huyen-huyen, urban-modern, etc.',
          description: 'string (optional) - Scene description for cover',
          resolution: '1K | 2K (default) | 4K',
          aspectRatio: '3:4 (book cover default)',
          uploadToStorage: 'boolean - Set true to upload to Supabase Storage',
          bucket: 'string - Storage bucket name (default: covers)'
        },
        examples: {
          quickTest: {
            title: 'Thiên Đạo Vô Song',
            genre: 'tien-hiep',
            description: 'Thiếu niên tu luyện đứng giữa mây trắng'
          },
          withUpload: {
            title: 'Thiên Đạo Vô Song',
            genre: 'tien-hiep', 
            description: 'Thiếu niên tu luyện đứng giữa mây trắng',
            uploadToStorage: true
          },
          highRes: {
            title: 'Thiên Đạo Vô Song',
            genre: 'tien-hiep',
            description: 'Thiếu niên tu luyện đứng giữa mây trắng',
            resolution: '4K'
          }
        }
      }
    }), auth, '/api/factory/test-cover', 'GET');
  } catch (error) {
    console.error('[API] Test Cover GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

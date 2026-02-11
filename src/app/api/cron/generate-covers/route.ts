/**
 * Cron: Generate Covers for novels without cover_url
 *
 * Called by pg_cron via net.http_get every 10 minutes.
 *
 * Flow:
 *   1. Query novels where cover_url IS NULL, ordered by created_at ASC
 *   2. For each novel, use its pre-saved cover_prompt (from seeding)
 *      or fall back to GeminiImageService.generateCoverWithUpload()
 *   3. Upload to Supabase Storage "covers" bucket
 *   4. Update novels.cover_url
 *
 * Rate: ~15 covers per 5-minute tick (each cover takes ~10-20s)
 * Total: 200 novels × ~15/tick × 10min = ~2.5 hours for all covers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GeminiImageService } from '@/services/factory/gemini-image';

// Process up to 20 covers per tick, 4 in parallel (~15-20s each = ~1-1.5 min per wave)
const BATCH_SIZE = 20;
const PARALLEL_CONCURRENCY = 4;

export const maxDuration = 300; // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic';

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const imageService = new GeminiImageService({ apiKey: geminiKey });

  try {
    // Find novels without covers, prefer those with cover_prompt already saved
    const { data: novels, error: queryErr } = await supabase
      .from('novels')
      .select('id, title, description, genres, cover_prompt')
      .is('cover_url', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryErr) {
      return NextResponse.json({ success: false, error: queryErr.message }, { status: 500 });
    }

    if (!novels || novels.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All novels have covers',
        generated: 0,
        durationSeconds: 0,
      });
    }

    const results: Array<{
      id: string;
      title: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process a single novel's cover
    type NovelRow = NonNullable<typeof novels>[0];
    async function processOneCover(novel: NovelRow): Promise<{
      id: string; title: string; success: boolean; error?: string;
    }> {
      const genre = Array.isArray(novel.genres) && novel.genres.length > 0
        ? novel.genres[0]
        : 'tien-hiep';
      const desc = String(novel.description || novel.title).slice(0, 500);
      const title = String(novel.title);

      let coverUrl: string | null = null;

      if (novel.cover_prompt) {
        // Use pre-saved cover prompt — inject Truyencity.com branding if missing
        let coverPrompt = novel.cover_prompt;
        if (!coverPrompt.toLowerCase().includes('truyencity')) {
          coverPrompt += `\n\nIMPORTANT: At the bottom-center of the cover, include small text: "Truyencity.com". No other text besides the title and Truyencity.com. No watermarks or signatures besides Truyencity.com.`;
        }
        const result = await imageService.generateImage({
          prompt: coverPrompt,
          negativePrompt: 'watermark, signature, blurry, low quality, distorted, deformed',
          options: { aspectRatio: '3:4', imageSize: '2K', numberOfImages: 1 },
        });

        if (result.success && result.data?.images?.[0]) {
          const image = result.data.images[0];
          const uploadResult = await imageService.uploadToStorage(
            image.base64, image.mimeType, 'covers', 'cover'
          );
          if (uploadResult.success && uploadResult.data) {
            coverUrl = uploadResult.data.publicUrl;
          }
        } else if (result.errorCode === 'IMAGE_SAFETY_BLOCK') {
          const fallback = await imageService.generateCoverWithUpload(
            title, genre, desc, { bucket: 'covers', maxRetries: 2 }
          );
          if (fallback.success && fallback.data) {
            coverUrl = fallback.data;
          }
        }
      } else {
        const result = await imageService.generateCoverWithUpload(
          title, genre, desc, { bucket: 'covers', maxRetries: 2 }
        );
        if (result.success && result.data) {
          coverUrl = result.data;
        }
      }

      if (coverUrl) {
        const { error: updateErr } = await supabase
          .from('novels')
          .update({ cover_url: coverUrl })
          .eq('id', novel.id);
        if (updateErr) {
          return { id: novel.id, title, success: false, error: `DB update failed: ${updateErr.message}` };
        }
        return { id: novel.id, title, success: true };
      }
      return { id: novel.id, title, success: false, error: 'Image generation failed' };
    }

    // Process novels in parallel waves of PARALLEL_CONCURRENCY
    for (let i = 0; i < novels.length; i += PARALLEL_CONCURRENCY) {
      // Check time budget: stop if we've used > 260s (leave 40s buffer)
      if (Date.now() - startTime > 260_000) {
        break;
      }

      const wave = novels.slice(i, i + PARALLEL_CONCURRENCY);
      const waveResults = await Promise.allSettled(
        wave.map(novel => processOneCover(novel))
      );

      for (let j = 0; j < waveResults.length; j++) {
        const r = waveResults[j];
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          const novel = wave[j];
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          results.push({ id: novel.id, title: novel.title, success: false, error: msg });
          console.error(`[CoverCron] Exception for ${novel.id.slice(0, 8)}: ${msg}`);
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const duration = (Date.now() - startTime) / 1000;

    // Count remaining novels without covers
    const { count: remaining } = await supabase
      .from('novels')
      .select('*', { count: 'exact', head: true })
      .is('cover_url', null);

    return NextResponse.json({
      success: true,
      generated: succeeded,
      failed,
      remaining: remaining || 0,
      durationSeconds: Math.round(duration),
      results,
    });
  } catch (error) {
    console.error('[CoverCron] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

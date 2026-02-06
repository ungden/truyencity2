// @ts-nocheck
/* deno-lint-ignore-file */
/**
 * Gemini Cover Generation Edge Function
 * Uses Gemini 2.0 Flash Preview Image Generation for high-quality book covers
 * 
 * Supports:
 * - Job-based async processing (avoids timeouts)
 * - Direct generation (for quick operations)
 * - Upload to Supabase Storage
 */

// @ts-ignore - Deno URL import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

declare const Deno: {
  env: { get(name: string): string | undefined }
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Genre-specific style elements for cover generation
const GENRE_STYLES: Record<string, { style: string; elements: string }> = {
  'system-litrpg': {
    style: 'epic fantasy RPG game art with holographic UI elements',
    elements: 'Glowing status windows, magical interface elements, gaming aesthetic'
  },
  'urban-modern': {
    style: 'sleek modern urban photography with cinematic color grading',
    elements: 'City skyline, modern architecture, luxury aesthetic, neon lights'
  },
  'romance': {
    style: 'romantic soft-focus illustration with dreamy atmosphere',
    elements: 'Soft golden hour lighting, emotional atmosphere, warm pastel colors'
  },
  'huyen-huyen': {
    style: 'Chinese xuanhuan fantasy art with ethereal quality',
    elements: 'Mystical creatures, floating mountains, magical auras, celestial themes'
  },
  'action-adventure': {
    style: 'dynamic action movie poster with explosive energy',
    elements: 'Dynamic poses, dramatic lighting effects, epic sense of scale'
  },
  'historical': {
    style: 'classical oil painting with historical accuracy',
    elements: 'Period-accurate costumes, traditional art techniques, rich textures'
  },
  'tien-hiep': {
    style: 'Chinese cultivation fantasy with celestial atmosphere',
    elements: 'Immortal cultivators, sword qi energy, floating pavilions, ethereal mist'
  },
  'sci-fi-apocalypse': {
    style: 'cyberpunk sci-fi concept art with dystopian atmosphere',
    elements: 'Futuristic technology, post-apocalyptic landscapes, neon holographics'
  },
  'horror-mystery': {
    style: 'dark gothic atmospheric art with unsettling mood',
    elements: 'Deep shadows, eerie lighting, mysterious silhouettes'
  }
};

function getGenreStyle(genre: string) {
  return GENRE_STYLES[genre] || {
    style: 'professional fantasy book cover art',
    elements: 'High quality dramatic illustration, cinematic lighting'
  };
}

function buildCoverPrompt(title: string, genre: string, description: string) {
  const genreStyle = getGenreStyle(genre);
  
  return `Create a stunning professional book cover illustration.

TITLE: "${title}"
GENRE: ${genre}
STYLE: ${genreStyle.style}

SCENE DESCRIPTION:
${description}

VISUAL REQUIREMENTS:
- ${genreStyle.elements}
- Professional book cover composition
- Dramatic cinematic lighting with rich colors
- High detail and ultra-sharp focus
- Atmospheric depth and mood
- Visually striking and eye-catching design

IMPORTANT: 
- Generate ONLY the visual artwork, NO text or title on the cover
- No watermarks or signatures
- Create a complete, publication-ready cover illustration

Avoid: text, words, letters, watermark, signature, blurry, low quality, distorted, deformed`;
}

async function updateJobStatus(supabase: any, jobId: string, status: string, data: Record<string, any> = {}) {
  await supabase
    .from('ai_image_jobs')
    .update({ status, ...data, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

const MODEL = 'gemini-2.0-flash-preview-image-generation';

async function generateWithGemini(
  apiKey: string, 
  prompt: string, 
  options: { aspectRatio?: string; imageSize?: string } = {}
): Promise<{ success: boolean; base64?: string; mimeType?: string; error?: string }> {

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    }
  };

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] API error:', response.status, errorText);
    return { success: false, error: `Gemini API Error: ${response.status} - ${errorText}` };
  }

  const data = await response.json();

  // Extract image from response (skip thought parts)
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.thought) continue;
    if (part.inlineData) {
      return {
        success: true,
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png'
      };
    }
  }

  return { success: false, error: 'No image generated in response' };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const { 
    jobId,           // For job-based processing
    prompt,          // Direct prompt (used if no jobId)
    title,           // For building cover prompt
    genre,
    description,
    aspectRatio = '3:4',
    imageSize = '2K',
    bucket = 'covers'
  } = body;

  // Validate input
  if (!jobId && !prompt && (!title || !description)) {
    return new Response(JSON.stringify({ 
      error: 'Either jobId, prompt, or (title + description) is required' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');

  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Job-based processing
    if (jobId) {
      await updateJobStatus(supabase, jobId, 'running');

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('ai_image_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      const jobPrompt = job.prompt || buildCoverPrompt(
        job.metadata?.title || 'Untitled',
        job.metadata?.genre || 'fantasy',
        job.metadata?.description || 'Epic fantasy scene'
      );

      // Generate image
      const result = await generateWithGemini(geminiKey, jobPrompt, {
        aspectRatio: job.metadata?.aspectRatio || aspectRatio,
        imageSize: job.metadata?.imageSize || imageSize
      });

      if (!result.success || !result.base64) {
        throw new Error(result.error || 'Image generation failed');
      }

      // Upload to storage
      const ext = result.mimeType?.includes('png') ? 'png' : 'jpg';
      const fileName = `cover-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const targetBucket = job.metadata?.bucket || bucket;

      const buffer = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      
      const { error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(fileName, buffer, {
          contentType: result.mimeType,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');

      // Update job as completed
      await updateJobStatus(supabase, jobId, 'completed', { result_url: publicUrl });

      return new Response(JSON.stringify({ 
        success: true, 
        jobId,
        status: 'completed',
        resultUrl: publicUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Direct generation (no job)
    const finalPrompt = prompt || buildCoverPrompt(title, genre || 'fantasy', description);
    
    const result = await generateWithGemini(geminiKey, finalPrompt, {
      aspectRatio,
      imageSize
    });

    if (!result.success || !result.base64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: result.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Upload to storage
    const ext = result.mimeType?.includes('png') ? 'png' : 'jpg';
    const fileName = `cover-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: result.mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ 
      success: true, 
      resultUrl: publicUrlData?.publicUrl,
      fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Gemini Generate] Error:', error);

    // Update job if processing failed
    if (jobId) {
      await updateJobStatus(supabase, jobId, 'failed', { 
        error_message: error.message 
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

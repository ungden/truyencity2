// @ts-nocheck
/* deno-lint-ignore-file */
// Edge function: gemini-cover-generate
// Uses Gemini 3 Pro Image Preview (Nano Banana Pro) to generate novel cover art.
// Supports Vietnamese title text rendering on covers.
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno URL import; valid at Edge runtime but not in local TS checker
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

declare const Deno: {
  env: { get(name: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

async function updateJobStatus(supabase, jobId, status, data = {}) {
  await supabase
    .from('ai_image_jobs')
    .update({ status, ...data, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

function extractImagePart(parts: any[]): { base64: string; mimeType: string } | null {
  for (const part of parts || []) {
    if (part?.thought) continue;

    // REST style: inline_data
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      return {
        base64: inlineData.data,
        mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png',
      };
    }
  }
  return null;
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const body = await req.json().catch(() => ({}))
  const { jobId, prompt } = body;

  if (!jobId || !prompt) {
    return new Response(JSON.stringify({ error: 'jobId and prompt are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Use service role key to bypass RLS for background processing
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    await updateJobStatus(supabase, jobId, 'running');

    // Get novel_id (optional) to update novels.cover_url after generation
    let novelId: string | null = null;
    try {
      const { data: jobRow } = await supabase
        .from('ai_image_jobs')
        .select('novel_id')
        .eq('id', jobId)
        .maybeSingle();
      novelId = jobRow?.novel_id || null;
    } catch {
      // ignore
    }

    // Gemini Nano Banana Pro
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not set');

    const model = 'gemini-3-pro-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '2K',
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API Error: ${geminiRes.status} - ${errText}`);
    }

    const geminiJson = await geminiRes.json();
    const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
    const imagePart = extractImagePart(parts);
    if (!imagePart) throw new Error('No image data found in Gemini response');

    const contentType = imagePart.mimeType || 'image/png';
    const bytes = base64ToBytes(imagePart.base64);

    // 3) Upload to Supabase Storage
    const bucket = 'covers';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, bytes, {
      contentType,
      upsert: true
    });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error('Failed to get public URL');

    // 4) Update job as completed
    await updateJobStatus(supabase, jobId, 'completed', { result_url: publicUrl });

    // 5) If job is tied to a novel, update novel.cover_url
    if (novelId) {
      const { error: novelUpdateErr } = await supabase
        .from('novels')
        .update({ cover_url: publicUrl })
        .eq('id', novelId);
      if (novelUpdateErr) {
        console.error(`[Job ${jobId}] Failed to update novel cover_url:`, novelUpdateErr.message);
      }
    }

  } catch (e) {
    console.error(`[Job ${jobId}] Error:`, e);
    await updateJobStatus(supabase, jobId, 'failed', { error_message: e.message });
  }

  // Return immediately to prevent client timeout
  return new Response(JSON.stringify({ success: true, message: "Job processing started" }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
})

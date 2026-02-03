// @ts-nocheck
/* deno-lint-ignore-file */
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

    const apiKey = Deno.env.get('IDEOGRAM_API_KEY')
    if (!apiKey) throw new Error('IDEOGRAM_API_KEY is not set');

    // 1) Call Ideogram API (Updated to new endpoint and format)
    const ideogramResponse = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: { 
        'Api-Key': apiKey, // Use Api-Key header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "image_request": {
          prompt,
          aspect_ratio: "ASPECT_3_4", // Use new aspect ratio format
          model: "V_2",
          magic_prompt_option: "AUTO"
        }
      })
    });

    if (!ideogramResponse.ok) {
      const errorText = await ideogramResponse.text();
      // Try to parse error JSON for better logging
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.title || errorJson.detail || JSON.stringify(errorJson);
      } catch {
        // Not a JSON error, use raw text
      }
      throw new Error(`Ideogram API Error: ${ideogramResponse.status} - ${errorDetail}`);
    }

    const result = await ideogramResponse.json();
    // Response format changed from result.results to result.data
    const remoteUrl = result?.data?.[0]?.url;
    if (!remoteUrl) throw new Error('Image URL not found in Ideogram response');

    // 2) Download image bytes
    const imageRes = await fetch(remoteUrl);
    if (!imageRes.ok) throw new Error(`Failed to download generated image: ${imageRes.status}`);
    
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buf = await imageRes.arrayBuffer();

    // 3) Upload to Supabase Storage
    const bucket = 'covers';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, buf, {
      contentType,
      upsert: true
    });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error('Failed to get public URL');

    // 4) Update job as completed
    await updateJobStatus(supabase, jobId, 'completed', { result_url: publicUrl });

  } catch (e) {
    console.error(`[Job ${jobId}] Error:`, e);
    await updateJobStatus(supabase, jobId, 'failed', { error_message: e.message });
  }

  // Return immediately to prevent client timeout
  return new Response(JSON.stringify({ success: true, message: "Job processing started" }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
})
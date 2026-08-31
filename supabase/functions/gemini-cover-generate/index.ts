// @ts-nocheck
/* deno-lint-ignore-file */
// Edge function: gemini-cover-generate
// Uses Gemini 3 Pro Image Preview to generate novel cover art with native Vietnamese text rendering.
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

function tokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function modalityTokens(details: unknown, modality: string): number {
  if (!Array.isArray(details)) return 0;
  return details.reduce((total, detail) => {
    if (!detail || typeof detail !== 'object') return total;
    return (detail as { modality?: unknown }).modality === modality
      ? total + tokenCount((detail as { tokenCount?: unknown }).tokenCount)
      : total;
  }, 0);
}

async function recordGeminiUsage(supabase, input: {
  jobId: string;
  userId: string;
  novelId: string | null;
  model: string;
  payload: any;
  succeeded: boolean;
}) {
  const metadata = input.payload?.usageMetadata || {};
  const promptTokens = tokenCount(metadata.promptTokenCount);
  const cachedInputTokens = Math.min(promptTokens, tokenCount(metadata.cachedContentTokenCount));
  const candidateTokens = tokenCount(metadata.candidatesTokenCount);
  const candidateImageTokens = Math.min(candidateTokens, modalityTokens(metadata.candidatesTokensDetails, 'IMAGE'));
  const candidateTextTokens = Math.max(0, candidateTokens - candidateImageTokens);
  const thinkingTokens = tokenCount(metadata.thoughtsTokenCount);
  const toolUsePromptTokens = tokenCount(metadata.toolUsePromptTokenCount);
  const totalTokens = tokenCount(metadata.totalTokenCount) || promptTokens + candidateTokens + thinkingTokens;
  // Gemini 3 Pro Image Standard: text/image input $2/M, text+thinking output
  // $12/M, image output $120/M. Cache storage and invoice-level adjustments are
  // intentionally excluded from the per-response estimate.
  const tokenCostUsd = (
    (promptTokens - cachedInputTokens) * 2
    + cachedInputTokens * 2
    + (candidateTextTokens + thinkingTokens) * 12
    + candidateImageTokens * 120
  ) / 1_000_000;
  const responseId = typeof input.payload?.responseId === 'string' ? input.payload.responseId : null;
  const sourceKey = responseId ? `gemini:${responseId}` : `gemini:ai_image_job:${input.jobId}:${crypto.randomUUID()}`;
  const { error } = await supabase.from('gemini_usage_events').insert({
    provider: 'gemini',
    model: input.model,
    model_version: typeof input.payload?.modelVersion === 'string' ? input.payload.modelVersion : null,
    operation: 'ai_image_job',
    source_type: 'ai_image_job',
    source_id: input.jobId,
    source_key: sourceKey,
    novel_id: input.novelId,
    user_id: input.userId,
    status: input.succeeded ? 'succeeded' : 'blocked',
    prompt_tokens: promptTokens,
    cached_input_tokens: cachedInputTokens,
    candidate_tokens: candidateTokens,
    candidate_text_tokens: candidateTextTokens,
    candidate_image_tokens: candidateImageTokens,
    thinking_tokens: thinkingTokens,
    tool_use_prompt_tokens: toolUsePromptTokens,
    total_tokens: totalTokens,
    grounding_search_queries: 0,
    token_cost_usd: tokenCostUsd,
    grounding_cost_upper_usd: 0,
    price_status: 'priced',
    pricing: {
      version: 'google-ai-developer-api-2026-08-30-standard',
      tier: 'STANDARD',
      inputUsdPerMillion: 2,
      cachedInputUsdPerMillion: 2,
      outputTextAndThinkingUsdPerMillion: 12,
      imageOutputUsdPerMillion: 120,
      excludes: ['context_cache_storage', 'invoice_credits', 'taxes'],
    },
  });
  if (error && error.code !== '23505') {
    console.error(`[Job ${input.jobId}] Gemini usage ledger write failed:`, error.message);
  }
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
  const { jobId } = body;

  if (typeof jobId !== 'string') {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Use service role key to bypass RLS for background processing
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Claim once before spending on Gemini. An owner can otherwise invoke this
  // public Edge Function repeatedly with the same job id and buy duplicate
  // images. The pending -> running transition is the idempotency boundary.
  const { data: job, error: jobError } = await supabase
    .from('ai_image_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', authData.user.id)
    .eq('status', 'pending')
    .select('id,user_id,novel_id,prompt,status')
    .maybeSingle();
  if (jobError) {
    console.error(`[Job ${jobId}] Could not claim image generation:`, jobError.message);
    return new Response(JSON.stringify({ error: 'Could not claim image job' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!job) {
    return new Response(JSON.stringify({ error: 'Image job not found' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const novelId = job.novel_id || null;

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not set');

    const model = 'gemini-3-pro-image';
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
          parts: [{ text: job.prompt }],
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
    await recordGeminiUsage(supabase, {
      jobId,
      userId: authData.user.id,
      novelId,
      model,
      payload: geminiJson,
      succeeded: !!imagePart,
    });
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

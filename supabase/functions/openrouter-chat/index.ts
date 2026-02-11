// deno-lint-ignore-file

// @ts-ignore - Deno std import is valid at Edge runtime, not in local TS checker
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - ESM import is valid at Edge runtime, not in local TS checker
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Allow TypeScript to compile in Node project context
declare const Deno: {
  env: { get(name: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth guard: require valid JWT ────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // ── End auth guard ──────────────────────────────────────────────────

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OPENROUTER_API_KEY is not set in Edge Functions secrets' 
      }), {
        status: 200, // Return 200 so the detailed error passes through `invoke`
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action as string | undefined

    const openRouterHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': body?.referer || 'https://truyencity.com',
      'X-Title': body?.title || 'TruyenCity AI Writer',
    };

    if (action === 'models') {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: openRouterHeaders
      });
      
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return new Response(JSON.stringify({ success: false, error: `OpenRouter models error: ${r.status}`, detail: t.slice(0, 400) }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const data = await r.json();
      return new Response(JSON.stringify({ success: true, modelsCount: data.data?.length ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default: chat completions
    const { model, messages, response_format, temperature, max_tokens } = body || {}
    if (!model || !messages) {
      return new Response(JSON.stringify({ success: false, error: 'Missing model or messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify({
        model,
        messages,
        ...(response_format ? { response_format } : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(typeof max_tokens === 'number' ? { max_tokens } : {}),
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    })

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return new Response(JSON.stringify({ success: false, error: `OpenRouter API Error: ${r.status} ${r.statusText}`, detail: t.slice(0, 400) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await r.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error in Edge Function' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})

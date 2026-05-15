/**
 * Debug Gia Tộc Tu Tiên world stage — call Gemini directly + log raw response
 * to identify why it returns 0 chars.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'c59e72fc-e82b-4d4d-9cf0-798a7270e9c6';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function callViaWrapper() {
  const { callGemini } = await import('@/services/story-engine/utils/gemini');
  const { data: p } = await s
    .from('ai_story_projects')
    .select('story_outline,novels(title)')
    .eq('id', PROJECT_ID)
    .single();
  const novel = Array.isArray(p?.novels) ? p.novels[0] : p?.novels;
  const idea = (p?.story_outline as { __stage_idea?: { premise?: string; themes?: string[]; mainConflict?: string; setupKernel?: unknown } } | null)?.__stage_idea;
  const kernel = idea?.setupKernel;
  const prompt = `Tạo world_description cho tiểu thuyết DỰA TRÊN IDEA đã có.\n\nTên truyện: "${novel?.title}"\nThể loại: tien-hiep\nPremise: ${idea?.premise}\nThemes: ${idea?.themes?.join(', ')}\nMainConflict: ${idea?.mainConflict}\n\nSTORY KERNEL:\n${JSON.stringify(kernel, null, 2)}\n\nTrả về JSON: {"worldDescription":"<800-1500 từ>"}`;

  const sysPrompt = 'Bạn là Modern Sảng Văn Architect 2026 — thiết kế webnovel Việt Nam. World ngây thơ về MC.';
  console.log(`\n[WRAPPER] prompt=${prompt.length} chars + sys=${sysPrompt.length} chars`);
  const res = await callGemini(prompt, {
    model: 'gemini-3.1-flash-lite',
    temperature: 0.4,
    maxTokens: 16384,
    systemPrompt: sysPrompt,
  }, { jsonMode: true, tracking: { projectId: PROJECT_ID, task: 'stage_world', chapterNumber: 0 } });
  console.log(`[WRAPPER] response: content=${res.content?.length || 0} chars, finishReason=${res.finishReason}`);
  console.log(`[WRAPPER] first 500:`, (res.content || '').slice(0, 500));
}

async function main() {
  console.log('=== TEST 1: callGemini wrapper with minimal sys prompt ===');
  await callViaWrapper().catch(e => console.error('wrapper failed:', e instanceof Error ? e.message : e));
  console.log('\n=== TEST 2: direct Gemini fetch (no wrapper) ===');
  const { data: p } = await s
    .from('ai_story_projects')
    .select('story_outline,novels(title)')
    .eq('id', PROJECT_ID)
    .single();
  const novel = Array.isArray(p?.novels) ? p.novels[0] : p?.novels;
  const idea = (p?.story_outline as { __stage_idea?: { premise?: string; themes?: string[]; mainConflict?: string; setupKernel?: unknown } } | null)?.__stage_idea;
  const kernel = idea?.setupKernel;

  const prompt = `Tạo world_description cho tiểu thuyết DỰA TRÊN IDEA đã có.

Tên truyện: "${novel?.title}"
Thể loại: tien-hiep
Premise: ${idea?.premise}
Themes: ${idea?.themes?.join(', ')}
MainConflict: ${idea?.mainConflict}

STORY KERNEL (CANON, KHÔNG REWRITE ENGINE — chỉ expand thành world):
${JSON.stringify(kernel, null, 2)}

Trả về JSON: {"worldDescription":"<800-1500 từ tuân blueprint 10-section, mở đầu BẮT BUỘC bằng ### STORY KERNEL SUMMARY>"}`;

  console.log(`Prompt length: ${prompt.length} chars`);

  // Direct Gemini call
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  console.log('━━━━ RAW GEMINI RESPONSE ━━━━');
  console.log(JSON.stringify(data, null, 2).slice(0, 3000));

  // Check candidates
  const candidates = (data as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> }; safetyRatings?: unknown[] }> }).candidates;
  if (candidates && candidates[0]) {
    const c = candidates[0];
    console.log('\n━━━━ CANDIDATE 0 ━━━━');
    console.log('finishReason:', c.finishReason);
    console.log('content parts:', c.content?.parts?.length || 0);
    console.log('content text length:', c.content?.parts?.[0]?.text?.length || 0);
    console.log('safetyRatings:', JSON.stringify(c.safetyRatings, null, 2));
  }
  if ((data as { promptFeedback?: unknown }).promptFeedback) {
    console.log('\n━━━━ PROMPT FEEDBACK ━━━━');
    console.log(JSON.stringify((data as { promptFeedback?: unknown }).promptFeedback, null, 2));
  }
}
main().catch(e => { console.error(e); process.exit(1); });

/**
 * Minimal routing smoke test — verifies globalThis routing works
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';
process.env.DEBUG_ROUTING = '1';

import { callGemini } from '@/services/story-engine/utils/gemini';

async function main() {
  console.log('[test] Setting routing...');
  (globalThis as { __MODEL_ROUTING__?: Record<string, string> }).__MODEL_ROUTING__ = {
    test_task: 'deepseek-v4-flash',
  };
  console.log('[test] Global now:', (globalThis as { __MODEL_ROUTING__?: Record<string, string> }).__MODEL_ROUTING__);

  console.log('[test] Calling with task=test_task...');
  const res = await callGemini('Say hi in 3 words', {
    model: 'gemini-3-flash-preview',
    temperature: 0.5,
    maxTokens: 4000,
  }, { tracking: { projectId: '00000000-0000-0000-0000-000000000000', task: 'test_task' } });

  console.log('[test] Response:');
  console.log('  content:', JSON.stringify(res.content).slice(0, 300));
  console.log('  promptTokens:', res.promptTokens);
  console.log('  completionTokens:', res.completionTokens);
  console.log('  finishReason:', res.finishReason);
}

main().catch(e => { console.error(e); process.exit(1); });

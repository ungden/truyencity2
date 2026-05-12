/**
 * Probe Pro response for stage_idea — dump raw content to see what Pro emits.
 * Mirrors runStageIdea prompt to isolate the "themes count 0 < 3" failure.
 */
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { installModelTierRouting } from '@/services/story-engine/utils/model-tier';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';

async function main() {
  installModelTierRouting();
  process.env.DEBUG_ROUTING = '1';

  // Minimal prompt — just ask Pro for the JSON shape with themes
  const prompt = `Tạo IDEA gốc cho tiểu thuyết.

Tên truyện: "Toàn Cầu Thủ Hộ: Khai Cục Nhận Được Thần Cấp Lãnh Địa"
Thể loại: vong-du

Trả về JSON:
{
  "premise": "<2-3 câu hook>",
  "setupKernel": {
    "readerFantasy": "<...>",
    "protagonistEngine": "<...>",
    "pleasureLoop": ["beat 1", "beat 2", "beat 3", "beat 4"],
    "systemMechanic": {"name":"","input":"","output":"","limit":"","reward":""},
    "mcSecret": {"secret":"","outsideWorldKnowledge":"","revealRule":""},
    "benefitLoop": {"goal":"","action":"","benefit":"","cadence":""},
    "interventionRule": "<...>",
    "phase1Playground": {"locations":[],"cast":[],"resources":[],"localAntagonists":[],"repeatableSceneTypes":[]},
    "socialReactor": {"witnesses":[],"reactionModes":[],"reportBackCadence":""},
    "noveltyLadder": [],
    "controlRules": {"payoffCadence":"","attentionGradient":"","openThreadsPerArc":2,"closeThreadsPerArc":1},
    "patternCards": ["smooth_opportunity","casual_competence","audience_reaction","resource_unlock"]
  },
  "themes": ["theme 1","theme 2","theme 3","theme 4"],
  "mainConflict": "<1-2 câu>",
  "tensionAxis": "<...>"
}`;

  const res = await callGemini(prompt, {
    model: 'deepseek-v4-flash', temperature: 0.85, maxTokens: 8192,
    systemPrompt: 'Stage IDEA. JSON only.',
  }, { jsonMode: true, tracking: { projectId: '1ef4aba8-12b3-4b42-bf8d-15d19f04804b', task: 'stage_idea' } });

  console.log(`prompt tokens: ${res.promptTokens}, completion tokens: ${res.completionTokens}, finish: ${res.finishReason}`);
  console.log(`content length: ${res.content.length}`);
  console.log('---- RAW CONTENT (first 3000 chars) ----');
  console.log(res.content.slice(0, 3000));
  console.log('---- TAIL (last 1500 chars) ----');
  console.log(res.content.slice(-1500));

  fs.mkdirSync('tmp/probe', { recursive: true });
  fs.writeFileSync('tmp/probe/pro-idea-raw.json', res.content);
  console.log('\nWrote tmp/probe/pro-idea-raw.json');

  const parsed = parseJSON(res.content);
  console.log('\n---- parsed structure ----');
  if (!parsed) console.log('parseJSON returned null');
  else {
    const p = parsed as Record<string, unknown>;
    console.log(`premise: ${typeof p.premise === 'string' ? `len=${p.premise.length}` : typeof p.premise}`);
    console.log(`themes: ${Array.isArray(p.themes) ? `len=${p.themes.length} → ${JSON.stringify(p.themes)}` : typeof p.themes}`);
    console.log(`mainConflict: ${typeof p.mainConflict === 'string' ? `len=${p.mainConflict.length}` : typeof p.mainConflict}`);
    console.log(`tensionAxis: ${typeof p.tensionAxis === 'string' ? p.tensionAxis : typeof p.tensionAxis}`);
    console.log(`setupKernel keys: ${p.setupKernel ? Object.keys(p.setupKernel as object).join(',') : 'missing'}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

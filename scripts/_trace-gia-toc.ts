import * as dotenv from 'dotenv';
dotenv.config({path:'/Users/alexle/Documents/truyencity/.env.runtime',quiet:true});
dotenv.config({path:'/Users/alexle/Documents/truyencity/.env.local',quiet:true,override:true});

import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PROJECT_ID = 'c59e72fc-e82b-4d4d-9cf0-798a7270e9c6';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Replicate exact setup-pipeline world stage call
async function main() {
  const { data: project } = await s.from('ai_story_projects').select('story_outline,novels(title)').eq('id', PROJECT_ID).single();
  const novel = Array.isArray(project?.novels) ? project.novels[0] : project?.novels;
  const idea = (project?.story_outline as any)?.__stage_idea;
  const kernel = idea?.setupKernel;

  // Replicate
  const { default: setupPipeline } = await import('@/services/story-engine/pipeline/setup-pipeline');
  const setupModule = await import('@/services/story-engine/pipeline/setup-pipeline');
  console.log('exports:', Object.keys(setupModule));

  // Import SANG_VAN_DNA + helpers — they're private. Get text via building prompt manually.
  const { buildSeedBlueprintInstructions } = await import('@/services/story-engine/plan/seed-blueprint');
  const { formatPlaybookForWorldStage } = await import('@/services/story-engine/templates/genre-setup-playbooks');

  const genre = 'tien-hiep';
  const blueprintInstructions = buildSeedBlueprintInstructions(genre);
  const playbookSection = formatPlaybookForWorldStage(genre);

  const userPrompt = `Tạo world_description cho tiểu thuyết DỰA TRÊN IDEA đã có.

Tên truyện: "${(novel as any)?.title}"
Thể loại: ${genre}
Premise: ${idea.premise}
Themes: ${idea.themes.join(', ')}
MainConflict: ${idea.mainConflict}

STORY KERNEL (CANON, KHÔNG REWRITE ENGINE — chỉ expand thành world):
${JSON.stringify(kernel, null, 2)}

${playbookSection}

${blueprintInstructions}

Trả về JSON: {"worldDescription":"<800-1500 từ tuân blueprint 10-section, mở đầu BẮT BUỘC bằng ### STORY KERNEL SUMMARY>"}`;

  console.log(`userPrompt chars: ${userPrompt.length}`);
  console.log(`playbookSection chars: ${playbookSection.length}`);
  console.log(`blueprintInstructions chars: ${blueprintInstructions.length}`);

  // Get sysPrompt from setup-pipeline.ts source
  const fs = await import('node:fs');
  const src = fs.readFileSync('/Users/alexle/Documents/truyencity/src/services/story-engine/pipeline/setup-pipeline.ts', 'utf8');
  const match = src.match(/const SANG_VAN_DNA = `([\s\S]+?)`;/);
  const SANG_VAN_DNA = match ? match[1] : '';
  console.log(`SANG_VAN_DNA chars: ${SANG_VAN_DNA.length}`);

  const sysPrompt = SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: WORLD. Build world_description theo StoryKernel + 10-section blueprint. Section đầu là ### STORY KERNEL SUMMARY. World ngây thơ về MC, antagonist Phase 1 LOCAL only.';

  // Direct Gemini call
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: sysPrompt }] },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
      topP: 0.95,
      topK: 40,
    },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  console.log(`\nfinishReason: ${data?.candidates?.[0]?.finishReason}`);
  console.log(`content text length: ${data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0}`);
  console.log(`safetyRatings: ${JSON.stringify(data?.candidates?.[0]?.safetyRatings)}`);
  console.log(`promptFeedback: ${JSON.stringify(data?.promptFeedback)}`);
  console.log(`usageMetadata: ${JSON.stringify(data?.usageMetadata)}`);
  if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.log('FULL RESPONSE:', JSON.stringify(data, null, 2).slice(0, 2000));
  }
}
main().catch(e => { console.error(e); process.exit(1); });

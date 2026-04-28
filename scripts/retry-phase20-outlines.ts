import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig, StoryOutline } from '@/services/story-engine/types';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Project IDs from spawn-phase20 first run
const PROJECT_IDS = [
  '07d8e372-8b2b-4740-be41-b90bc4c0826e',
  '75def185-9700-4cc0-b030-a53b26823812',
  '2734472e-53a6-4e82-9766-0482ed8462af',
  '39794189-d762-4436-a3bb-804db4054f6b',
  'e5df2801-9d5e-4538-a47c-8a2a3540eda6',
  'b4deb176-2cba-4ade-90c6-6cbeec1f64f0',
  '6d6d8629-742d-49e7-83d2-cc67c037c60c',
  'ea0f68d1-6f5a-4875-bbfe-680d461d03c5',
  'b0f39bfe-ef26-4c50-b410-9456375aecf8',
  '43cf1dd8-1d9a-47f7-b92e-537745cb40a2',
];

async function genStoryOutline(projectId: string, title: string, genre: string, premise: string, world: string, planned: number): Promise<void> {
  const targetArcs = Math.ceil(planned / 20);
  const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${title}
GENRE: ${genre}
PREMISE: ${premise}

WORLD CONTEXT:
${world.slice(0, 4000)}

TARGET: ${planned} chương, ${targetArcs} arcs

Trả về JSON đầy đủ các trường: id, title, genre, premise, themes (array 3+), mainConflict, targetChapters, protagonist (name, startingState, endGoal, characterArc), majorPlotPoints (array 6+ với chapter+event), endingVision, uniqueHooks (array 3+).`;

  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'Bạn là STORY ARCHITECT chuyên thiết kế webnovel TQ-style. CHỈ trả về JSON, không thêm text.',
  };
  const res = await callGemini(prompt, cfg, {
    jsonMode: true,
    tracking: { projectId, task: 'story_outline' },
  });
  const outline = parseJSON<StoryOutline>(res.content);
  if (!outline) throw new Error('story_outline parse failed');
  await s.from('ai_story_projects').update({ story_outline: outline as unknown as Record<string, unknown> }).eq('id', projectId);
}

async function main(): Promise<void> {
  for (const pid of PROJECT_IDS) {
    const { data: p } = await s.from('ai_story_projects')
      .select('id,genre,total_planned_chapters,world_description,story_outline,master_outline,status,novels!ai_story_projects_novel_id_fkey(title,description)')
      .eq('id', pid)
      .single();
    if (!p) {
      console.log(`✗ project ${pid} not found`);
      continue;
    }
    const novel: any = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(`\n▶ ${novel?.title} [${p.genre}]`);

    try {
      if (!p.story_outline) {
        console.log(`  → story_outline...`);
        await genStoryOutline(p.id as string, novel?.title, p.genre as string, novel?.description, p.world_description as string, p.total_planned_chapters as number);
        console.log(`  ✓ story_outline saved`);
      } else {
        console.log(`  ✓ story_outline already exists`);
      }

      if (!p.master_outline) {
        console.log(`  → master_outline...`);
        const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
        const m = await generateMasterOutline(
          p.id as string,
          novel?.title,
          p.genre as any,
          p.world_description as string,
          p.total_planned_chapters as number,
          cfg,
        );
        if (!m) throw new Error('master_outline returned null');
        console.log(`  ✓ master_outline saved (${m.majorArcs.length} arcs)`);
      } else {
        console.log(`  ✓ master_outline already exists`);
      }

      if (p.status !== 'active') {
        await s.from('ai_story_projects').update({ status: 'active' }).eq('id', pid);
        console.log(`  ✓ activated`);
      } else {
        console.log(`  ✓ already active`);
      }
    } catch (e) {
      console.error(`  ✗ failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const { count } = await s.from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .in('id', PROJECT_IDS)
    .eq('status', 'active');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ACTIVATED: ${count}/${PROJECT_IDS.length} projects`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}
main().catch(console.error);

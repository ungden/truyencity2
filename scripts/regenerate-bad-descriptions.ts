/**
 * Regenerate descriptions for 5 novels whose hand-typed seed.description
 * leaked engineering jargon (face-slap, Tone:, KHÔNG-combat-flag-list,
 * ex-QA AAA, MC=AUTHOR formula, etc.) — caught by the validator after
 * user complaint 2026-04-29.
 *
 * Uses the new shared generateNovelDescription() utility which has
 * built-in validator that throws on jargon leak. Idempotent: safe to
 * re-run if a regen attempt produces another bad description.
 *
 * Usage: ./node_modules/.bin/tsx scripts/regenerate-bad-descriptions.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateNovelDescription } from '@/services/story-engine/utils/description-generator';
import type { GenreType } from '@/services/story-engine/types';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SLUGS = [
  'aniki-dau-bep-yakuza-trong-sinh-sai-gon',
  'van-si-toan-nang-tu-si-van-gioi-doc-tam-quoc-dot-pha-canh-gioi',
  'lap-trinh-game-cuu-the-gioi-con-ac-mong-cua-tap-doan-p2w',
  'he-thong-co-hoi-neet-van-khoa-khoi-nghiep-phuong-do',
  'he-thong-do-thi-dau-bep-phuong-do-khoi-nghiep-fb',
];

async function regenerate(slug: string): Promise<void> {
  console.log(`\n▶ ${slug}`);

  const { data: novel } = await s.from('novels').select('id, title').eq('slug', slug).maybeSingle();
  if (!novel?.id) {
    console.log(`  ✗ Novel not found`);
    return;
  }
  const { data: project } = await s.from('ai_story_projects')
    .select('genre, sub_genres, main_character, world_description, style_directives')
    .eq('novel_id', novel.id).maybeSingle();
  if (!project) {
    console.log(`  ✗ Project not found`);
    return;
  }

  const styleDir = (project.style_directives || {}) as Record<string, string>;

  console.log(`  Title: ${novel.title}`);
  console.log(`  Generating new description...`);

  try {
    const desc = await generateNovelDescription({
      title: novel.title as string,
      genre: project.genre as GenreType,
      subGenres: (project.sub_genres || []) as string[],
      mainCharacter: project.main_character as string,
      worldDescription: (project.world_description as string) || '',
      toneProfile: styleDir.tone_profile,
      startingArchetype: styleDir.starting_archetype,
    });

    console.log(`  ✓ Generated ${desc.length} chars`);
    console.log(`  Preview: ${desc.slice(0, 200)}...`);

    await s.from('novels').update({ description: desc, updated_at: new Date().toISOString() }).eq('id', novel.id);
    console.log(`  ✓ Saved to DB`);
  } catch (e) {
    console.error(`  ✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  REGENERATE: ${SLUGS.length} bad descriptions (jargon leak)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const slug of SLUGS) {
    await regenerate(slug);
  }

  console.log(`\n✓ Done.`);
}

main().catch(console.error);

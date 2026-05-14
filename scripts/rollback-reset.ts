/**
 * Phase S rollback (2026-05-15).
 *
 * Restore the most recent archived setup for a novel that was reset.
 * Reads from ai_story_projects.style_directives.archived_setups[] and
 * writes the latest archive back to project fields.
 *
 * Does NOT restore deleted chapters or canon tables — those are gone.
 * Use this only when the new setup produced worse output than original
 * AND no critical chapters were written under the new setup.
 *
 * Usage:
 *   npx tsx scripts/rollback-reset.ts <novel_id>             # dry-run
 *   npx tsx scripts/rollback-reset.ts <novel_id> --apply     # commit
 *   npx tsx scripts/rollback-reset.ts <novel_id> --apply --archive-index 1  # rollback to 2nd most recent
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface ArchivedSetup {
  timestamp: string;
  archived_at: string;
  main_character: string;
  master_outline: unknown;
  story_outline: unknown;
  story_bible: unknown;
  worldbuilding_canon: unknown;
  power_system_canon: unknown;
  world_description: string;
  setup_kernel: unknown;
  description: string;
  target_chapter_length: number;
  setup_stage: string;
  ai_model: string;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const novelId = args.find(a => /^[0-9a-f]{8}-/.test(a));
  let archiveIndex = 0; // 0 = most recent
  const idxFlag = args.indexOf('--archive-index');
  if (idxFlag >= 0) archiveIndex = parseInt(args[idxFlag + 1], 10) || 0;

  if (!novelId) {
    console.error('Usage: rollback-reset.ts <novel_id> [--apply] [--archive-index N]');
    process.exit(1);
  }

  const { data: novel } = await s
    .from('novels')
    .select('title')
    .eq('id', novelId)
    .maybeSingle();
  const novelTitle = (novel?.title as string) || `(novel ${novelId})`;

  const { data: project } = await s
    .from('ai_story_projects')
    .select('id, style_directives')
    .eq('novel_id', novelId)
    .maybeSingle();
  if (!project) {
    console.error(`No project for novel ${novelId}`);
    process.exit(1);
  }
  const projectId = project.id as string;
  const styleDirectives = (project.style_directives as Record<string, unknown>) || {};
  const archives = (styleDirectives.archived_setups as ArchivedSetup[]) || [];

  console.log(`████ ${novelTitle} ████  project=${projectId.slice(0, 8)}  ${apply ? 'APPLY' : 'DRY'}`);
  console.log(`Found ${archives.length} archived setup(s).`);
  if (archives.length === 0) {
    console.error('No archives to roll back to.');
    process.exit(1);
  }

  // Show available archives
  for (let i = 0; i < archives.length; i++) {
    const a = archives[archives.length - 1 - i]; // newest first
    console.log(`  [${i}] ${a.timestamp} — archived ${a.archived_at} (MC=${a.main_character}, stage=${a.setup_stage})`);
  }

  if (archiveIndex >= archives.length) {
    console.error(`--archive-index ${archiveIndex} out of range (max ${archives.length - 1}).`);
    process.exit(1);
  }

  const targetArchive = archives[archives.length - 1 - archiveIndex];
  console.log(`\nRestoring archive [${archiveIndex}] timestamp=${targetArchive.timestamp}...`);

  if (!apply) {
    console.log(`\nFields that would be restored:`);
    console.log(`  main_character: ${targetArchive.main_character}`);
    console.log(`  setup_stage: ${targetArchive.setup_stage}`);
    console.log(`  ai_model: ${targetArchive.ai_model}`);
    console.log(`  target_chapter_length: ${targetArchive.target_chapter_length}`);
    console.log(`  world_description: ${(targetArchive.world_description || '').length} chars`);
    console.log(`  description: ${(targetArchive.description || '').length} chars`);
    console.log(`  master_outline: ${targetArchive.master_outline ? 'YES' : 'null'}`);
    console.log(`  story_outline: ${targetArchive.story_outline ? 'YES' : 'null'}`);
    console.log(`  story_bible: ${targetArchive.story_bible ? 'YES' : 'null'}`);
    console.log(`  setup_kernel: ${targetArchive.setup_kernel ? 'YES' : 'null'}`);
    console.log(`  worldbuilding_canon: ${targetArchive.worldbuilding_canon ? 'YES' : 'null'}`);
    console.log(`  power_system_canon: ${targetArchive.power_system_canon ? 'YES' : 'null'}`);
    console.log(`\nDRY-RUN. Re-run with --apply to commit.`);
    console.log(`\n⚠️  Rollback does NOT restore deleted chapters or canon tables — those are permanently gone.`);
    console.log(`⚠️  Use only if the new setup is clearly worse AND no critical chapters written yet.`);
    return;
  }

  // Apply rollback
  const restorePayload: Record<string, unknown> = {
    main_character: targetArchive.main_character,
    master_outline: targetArchive.master_outline,
    story_outline: targetArchive.story_outline,
    story_bible: targetArchive.story_bible,
    worldbuilding_canon: targetArchive.worldbuilding_canon,
    power_system_canon: targetArchive.power_system_canon,
    world_description: targetArchive.world_description,
    setup_kernel: targetArchive.setup_kernel,
    description: targetArchive.description,
    target_chapter_length: targetArchive.target_chapter_length,
    setup_stage: targetArchive.setup_stage,
    ai_model: targetArchive.ai_model,
  };

  // Update style_directives to mark rollback + keep archive history
  const updatedDirectives = {
    ...styleDirectives,
    rolled_back_at: new Date().toISOString(),
    rolled_back_to_timestamp: targetArchive.timestamp,
    production_enabled: false, // safer: keep paused after rollback for manual review
  };
  restorePayload.style_directives = updatedDirectives;

  const { error } = await s.from('ai_story_projects').update(restorePayload).eq('id', projectId);
  if (error) {
    console.error(`Restore failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Rollback applied. Project paused for manual verification.`);
  console.log(`To resume production: npx tsx scripts/toggle-production.ts ${novelId} on`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

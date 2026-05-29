/**
 * Track 2b — Hide low-coherence legacy novels from reader surfaces (2026-05-29).
 *
 * Track 2a (retro-score-legacy.ts) persisted a read-only foundation score into
 * `ai_story_projects.style_directives.retro_foundation_score` for the ~349 legacy
 * chapter-writing novels that never ran the real setup gate. This script reads
 * those scores, applies a totalScore cutoff, and flips `novels.hidden=true` on the
 * worst ones so they drop out of discovery (home/browse/ranking/genre/author/search)
 * WITHOUT being deleted — they stay reachable by direct slug/id link.
 *
 * The cutoff is chosen from the 2a distribution. Legacy novels universally fail the
 * binary `passed` (no factions/voice_anchors rows → cast/voice dims floor low), so we
 * gate on coherence totalScore, NOT `passed`.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/hide-low-coherence.ts --cutoff=70 --dry-run   # preview
 *   ./node_modules/.bin/tsx scripts/hide-low-coherence.ts --cutoff=70             # apply
 *   ./node_modules/.bin/tsx scripts/hide-low-coherence.ts --cutoff=70 --unhide    # reverse: unhide ≥cutoff
 *
 * Always run --dry-run first and eyeball the list before applying.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.runtime' });
dotenvConfig({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.runtime');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RetroScore {
  totalScore: number;
  avgScore: number;
  minDimScore: number;
  passed: boolean;
  scoredAt: string;
}

interface Row {
  id: string;
  novel_id: string;
  genre: string | null;
  current_chapter: number | null;
  style_directives: Record<string, unknown> | null;
}

async function main() {
  const args = process.argv.slice(2);
  const cutoffArg = args.find(a => a.startsWith('--cutoff='));
  const dryRun = args.includes('--dry-run');
  const unhide = args.includes('--unhide');
  if (!cutoffArg) {
    console.error('Required: --cutoff=<totalScore>. Run retro-score-legacy.ts first, then pick a cutoff from its distribution.');
    process.exit(1);
  }
  const cutoff = parseInt(cutoffArg.split('=')[1], 10);
  if (Number.isNaN(cutoff)) { console.error('--cutoff must be a number'); process.exit(1); }

  console.log(`[hide] ${unhide ? 'UNHIDE ≥' : 'HIDE <'}${cutoff}/140${dryRun ? ' DRY-RUN' : ''}`);

  // Page through every project carrying a retro score (filter in JS — the score is
  // nested in style_directives JSONB, awkward to filter server-side reliably).
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('ai_story_projects')
      .select('id,novel_id,genre,current_chapter,style_directives')
      .not('style_directives->retro_foundation_score', 'is', null)
      .range(offset, offset + PAGE - 1);
    if (error) { console.error('[hide] query failed:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  console.log(`[hide] ${rows.length} projects carry a retro_foundation_score`);

  const targets: { novelId: string; projectId: string; genre: string | null; ch: number | null; score: number }[] = [];
  for (const r of rows) {
    const blob = (r.style_directives?.retro_foundation_score as RetroScore | undefined);
    if (!blob || typeof blob.totalScore !== 'number') continue;
    if (!r.novel_id) continue;
    const below = blob.totalScore < cutoff;
    // hide mode wants below-cutoff; unhide mode wants at-or-above-cutoff.
    if (unhide ? !below : below) {
      targets.push({ novelId: r.novel_id, projectId: r.id, genre: r.genre, ch: r.current_chapter, score: blob.totalScore });
    }
  }

  targets.sort((a, b) => a.score - b.score);
  console.log(`[hide] ${targets.length} novels ${unhide ? 'to unhide (≥' : 'to hide (<'}${cutoff})`);
  targets.slice(0, 50).forEach(t =>
    console.log(`  ${t.score}/140  novel=${t.novelId.slice(0, 8)} (${t.genre}, ch.${t.ch})`));
  if (targets.length > 50) console.log(`  ... and ${targets.length - 50} more`);

  if (dryRun) { console.log('[hide] DRY-RUN — no writes.'); return; }
  if (targets.length === 0) { console.log('[hide] Nothing to do.'); return; }

  const novelIds = targets.map(t => t.novelId);
  let updated = 0;
  for (let i = 0; i < novelIds.length; i += 200) {
    const batch = novelIds.slice(i, i + 200);
    const { error, count } = await supabase
      .from('novels')
      .update({ hidden: !unhide }, { count: 'exact' })
      .in('id', batch);
    if (error) { console.error(`[hide] update batch failed: ${error.message}`); continue; }
    updated += count ?? batch.length;
  }
  console.log(`[hide] DONE — set hidden=${!unhide} on ${updated} novels.`);
}

main().catch(e => { console.error('[hide] fatal:', e); process.exit(1); });

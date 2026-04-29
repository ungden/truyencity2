/**
 * Wipe + reset all novels that were touched by Phase 20A audit fixes.
 * After wipe, cron will rewrite from chapter 1 with the full set of new
 * engine guards active:
 *   - Pre-flight metadata validation (orchestrator step 1b)
 *   - VND currency hard check + math sanity (Critic)
 *   - Anti-monologue-repetition (Critic + Writer-side rule)
 *   - Auto-sync total_planned ↔ master_outline arc coverage
 *
 * Why wipe instead of patching: the existing chapters were written under
 * older/looser engine rules. Patching them in place leaves residue (wrong
 * MC name, fake currency, repetitive monologue, slow pacing) that future
 * RAG retrieval will surface as "previously established" facts. Wipe is
 * the only way to start clean under the new rules.
 *
 * Preserved data: project metadata (genre, topic, sub_genres, mc_archetype,
 * world_description, story_outline, master_outline). Cleared: chapters,
 * memory tables, current_chapter pointer.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// All 13 novels we touched (10 Phase 20A + 3 reset gap fixes from earlier).
// Trở Lại 1995 + Đoạn Tuyệt already wiped — script is idempotent so safe to re-run.
const SLUGS_TO_WIPE = [
  // Phase 20A representatives — chapters used wrong MC name (synced via fix-phase20-mc-sync but chapters not regen'd)
  'van-phong-13-quy-tac-sinh-ton-sau-6h-toi',
  'slime-cua-ta-nuot-ca-rong',
  'he-thong-lai-phai-ta-di-cuu-phao-hoi',
  'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong',
  'de-che-van-hoa-ta-mang-chau-kiet-luan-sang-di-gioi',
  'group-chat-van-gioi-ta-la-admin-kiem-ca-map',
  'tro-lai-1995-de-che-bat-dong-san-hai-long-do',
  'be-quan-1-van-nam-tu-truong-bo-lac-da-hoa-cat-bui',
  'lao-to-cua-ta-de-tu-mang-phu-lai-keo-aggro',
  'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen',
  // Earlier reset-gap novels (had MC consistency issues, deserve fresh start under new rules)
  'tro-ve-nam-2000-ta-co-ky-uc-25-nam',
  'trong-sinh-1991-dao-dien-david-tran-tai-hollywood',
  // Pacing-fixed but chapters preserved (now wipe so they regen with anti-repetition rule)
  'trong-sinh-1992-ngu-dan-van-ninh-khoi-nghiep-hai-san',
];

const MAX_PLANNED = 600;

async function wipe(slug: string): Promise<void> {
  const { data: n } = await s.from('novels').select('id,title').eq('slug', slug).maybeSingle();
  if (!n) {
    console.log(`✗ NOT FOUND: ${slug}`);
    return;
  }
  const novelId = n.id as string;
  const { data: p } = await s.from('ai_story_projects').select('id,total_planned_chapters,master_outline').eq('novel_id', novelId).maybeSingle();
  if (!p) {
    console.log(`✗ no project: ${n.title}`);
    return;
  }
  const projectId = p.id as string;

  console.log(`\n▶ ${n.title}`);

  // 1. Pause first
  await s.from('ai_story_projects').update({ status: 'paused' }).eq('id', projectId);

  // 2. Wipe chapters
  const { count: chBefore } = await s.from('chapters').select('id', { count: 'exact', head: true }).eq('novel_id', novelId);
  await s.from('chapters').delete().eq('novel_id', novelId);
  console.log(`  ✓ wiped ${chBefore ?? 0} chapters`);

  // 3. Wipe memory tables (these table names exist per migration 0152 et al)
  const memTables = [
    'chapter_summaries',
    'character_states',
    'story_memory_chunks',
    'beat_usage',
    'foreshadowing_hints',
    'character_arcs',
    'character_signature_traits',
    'mc_power_states',
    'voice_fingerprints',
    'pacing_blueprints',
    'world_locations',
    'location_bibles',
    'plot_threads',
    'world_rules_index',
    'volume_summaries',
    'economic_ledger',
    'character_knowledge',
    'relationship_tracker',
  ];
  let memCleared = 0;
  for (const t of memTables) {
    const { error } = await s.from(t).delete().eq('project_id', projectId);
    if (!error) memCleared++;
  }
  console.log(`  ✓ cleared ${memCleared}/${memTables.length} memory tables`);

  // 4. Cap total_planned to MAX_PLANNED if currently above (root fix for slow pacing)
  const updates: Record<string, unknown> = {
    current_chapter: 0,
    status: 'active',
  };
  const currentTotal = p.total_planned_chapters as number;
  if (currentTotal > MAX_PLANNED) {
    updates.total_planned_chapters = MAX_PLANNED;
    console.log(`  ✓ total_planned_chapters: ${currentTotal} → ${MAX_PLANNED} (cap)`);
    // Also compress master_outline arcs proportionally if needed
    const master = p.master_outline as { majorArcs?: Array<{ startChapter: number; endChapter: number; arcName: string; description?: string; keyMilestone?: string }> } | null;
    if (master?.majorArcs?.length) {
      const oldMaxEnd = Math.max(...master.majorArcs.map(a => a.endChapter || 0));
      if (oldMaxEnd > MAX_PLANNED) {
        const scale = MAX_PLANNED / oldMaxEnd;
        const newArcs = master.majorArcs.map((a, idx) => {
          const start = idx === 0 ? 1 : Math.round((master.majorArcs![idx - 1].endChapter * scale)) + 1;
          const end = Math.round(a.endChapter * scale);
          return { ...a, startChapter: start, endChapter: end };
        });
        updates.master_outline = { ...master, majorArcs: newArcs } as unknown as Record<string, unknown>;
        console.log(`  ✓ master_outline arcs compressed (×${scale.toFixed(2)})`);
      }
    }
  }

  await s.from('ai_story_projects').update(updates).eq('id', projectId);
  console.log(`  ✓ current_chapter=0, status=active — cron will rewrite from ch.1`);

  // 5. Reset today's daily quota row — wipe leaves stale "20/20 completed" → cron skips novel.
  //    Reset written_chapters to 0 + status to 'active' so cron picks up immediately.
  //    (Constraint: status ∈ {'active','completed','failed'}, NOT 'pending'.)
  //    VN date = UTC+7 today.
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const { error: quotaErr } = await s
    .from('project_daily_quotas')
    .update({
      written_chapters: 0,
      status: 'active',
      next_due_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('vn_date', vnDate);
  if (quotaErr) {
    console.log(`  ⚠ quota reset failed (${quotaErr.message}) — cron may skip novel today`);
  } else {
    console.log(`  ✓ daily quota for ${vnDate} reset to 0/20 — cron will pick up next tick`);
  }
}

async function main(): Promise<void> {
  console.log(`━━━ WIPE + RESET ${SLUGS_TO_WIPE.length} NOVELS ━━━`);
  for (const slug of SLUGS_TO_WIPE) {
    await wipe(slug);
  }
  console.log(`\n✓ Done. Cron will rewrite all ${SLUGS_TO_WIPE.length} novels from chapter 1 under new engine rules.`);
}
main().catch(console.error);

/**
 * Track 2a — Read-only retro-score of the legacy catalog (2026-05-29).
 *
 * The đại-thần setup quality machinery (Phase 27 canon + Phase S 14-dim
 * foundation review) only ever touched ~5 of the 354 chapter-writing novels a
 * reader can browse. The other ~349 were mass-spawned via ContentSeeder with a
 * thin world_description and no canon, and never ran the foundation gate. This
 * is the "dỏm" feeling — good machinery, never applied to the catalog.
 *
 * This script runs `runFoundationReview` as a SCORER ONLY over those legacy
 * novels. It writes NO content — it persists only a score blob into
 * `style_directives.retro_foundation_score` (separate from the canonical
 * `foundation_review_latest` gate field, so Track 1's write gate is untouched).
 * Track 2b then hides novels below a coherence cutoff chosen from this
 * distribution.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/retro-score-legacy.ts                 # all legacy, default cap
 *   ./node_modules/.bin/tsx scripts/retro-score-legacy.ts <projectId>      # single project
 *   ./node_modules/.bin/tsx scripts/retro-score-legacy.ts --limit=50       # cap to 50
 *   ./node_modules/.bin/tsx scripts/retro-score-legacy.ts --sample=10      # random 10 (verification)
 *   ./node_modules/.bin/tsx scripts/retro-score-legacy.ts --dry-run        # score, print, don't persist
 *
 * Cost: ~$0.01-0.02 per novel on gemini-3.1-flash-lite. 349 novels ≈ $3-7.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

// Secrets (Supabase service key + Gemini key) live in .env.runtime here; .env.local
// holds only the Vercel OIDC token. Load runtime first, then local as override.
dotenvConfig({ path: '.env.runtime' });
dotenvConfig({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ProjectRow {
  id: string;
  novel_id: string;
  genre: string | null;
  main_character: string | null;
  world_description: string | null;
  master_outline: unknown;
  story_outline: unknown;
  worldbuilding_canon: unknown;
  power_system_canon: unknown;
  current_chapter: number | null;
  status: string;
  style_directives: Record<string, unknown> | null;
}

interface ScoreStats {
  scanned: number;
  scored: number;
  persisted: number;
  failed: number;
  distribution: number[]; // totalScore per scored novel
  errors: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const args = process.argv.slice(2);
  const singleProjectId = args.find(a => !a.startsWith('--'));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const sampleArg = args.find(a => a.startsWith('--sample='));
  const dryRun = args.includes('--dry-run');
  // --rescore re-scores novels that already carry a retro_foundation_score.
  // Default (resume) skips them — makes a killed run cheap to finish.
  const rescore = args.includes('--rescore');
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 400;
  const sample = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 0;

  console.log(`[retro-score] Start. ${singleProjectId ? `single=${singleProjectId}` : `limit=${limit}`}${sample ? ` sample=${sample}` : ''}${dryRun ? ' DRY-RUN' : ''}${rescore ? ' RESCORE' : ' (resume: skip already-scored)'}`);

  // Legacy chapter-writing set: wrote ≥1 chapter, no worldbuilding_canon (the 5
  // canon novels already ran the real gate, exclude them).
  let query = supabase
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,worldbuilding_canon,power_system_canon,current_chapter,status,style_directives')
    .gte('current_chapter', 1)
    .is('worldbuilding_canon', null)
    .order('current_chapter', { ascending: false });

  if (singleProjectId) {
    query = supabase
      .from('ai_story_projects')
      .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,worldbuilding_canon,power_system_canon,current_chapter,status,style_directives')
      .eq('id', singleProjectId);
  } else {
    query = query.limit(Math.max(limit, sample || 0));
  }

  const { data: rawProjects, error } = await query;
  if (error) { console.error('[retro-score] query failed:', error.message); process.exit(1); }

  let projects = (rawProjects || []) as ProjectRow[];
  // Resume: drop novels already scored (unless --rescore). Persisted scores let a
  // killed run pick up where it left off without re-spending on the same novels.
  if (!rescore && !singleProjectId) {
    const before = projects.length;
    projects = projects.filter(p => !(p.style_directives as Record<string, unknown> | null)?.retro_foundation_score);
    if (before !== projects.length) console.log(`[retro-score] resume: skipping ${before - projects.length} already-scored, ${projects.length} remaining`);
  }
  if (sample && projects.length > sample) projects = shuffle(projects).slice(0, sample);

  if (projects.length === 0) {
    console.log('[retro-score] No legacy chapter-writing novels matched.');
    return;
  }
  console.log(`[retro-score] Scoring ${projects.length} novels...`);

  const { runFoundationReview } = await import('../src/services/story-engine/quality/foundation-reviewer');
  const reviewConfig = { model: 'gemini-3.1-flash-lite', temperature: 0.2, maxTokens: 6144 };

  // Mirror of setup-pipeline's private getSetupKernelFromOutline.
  const getSetupKernelFromOutline = (storyOutline: unknown): unknown => {
    if (!storyOutline || typeof storyOutline !== 'object') return undefined;
    const o = storyOutline as { setupKernel?: unknown; __stage_idea?: { setupKernel?: unknown } };
    return o.setupKernel || o.__stage_idea?.setupKernel;
  };

  const stats: ScoreStats = { scanned: 0, scored: 0, persisted: 0, failed: 0, distribution: [], errors: [] };

  for (const p of projects) {
    stats.scanned++;
    const tag = `[${stats.scanned}/${projects.length}] ${p.id.slice(0, 8)} (${p.genre}, ch.${p.current_chapter})`;

    try {
      // Load ch.1-3 actual content as trial chapters → enables warmth/opening dims.
      const { data: chapters } = await supabase
        .from('chapters')
        .select('chapter_number,content')
        .eq('novel_id', p.novel_id)
        .lte('chapter_number', 3)
        .order('chapter_number', { ascending: true });
      const trialChapters = (chapters || [])
        .map((c: { content: string | null }) => (c.content || '').slice(0, 6000))
        .filter(Boolean);

      const [factions, voiceAnchors] = await Promise.all([
        supabase.from('factions').select('*').eq('project_id', p.id),
        supabase.from('voice_anchors').select('*').eq('project_id', p.id),
      ]);

      const reviewInput = {
        projectId: p.id,
        artifacts: {
          kernel: getSetupKernelFromOutline(p.story_outline),
          worldDescription: (p.world_description || '').trim(),
          worldCanon: p.worldbuilding_canon,
          castRoster: factions.data,
          masterOutline: p.master_outline,
          storyOutline: p.story_outline,
          voiceAnchors: voiceAnchors.data,
          trialChapters: trialChapters.length > 0 ? trialChapters : undefined,
        },
      };

      // The reviewer fail-closes to total=0 / dimensions=[] on a JSON parse or
      // API error. That is NOT a genuine low score — retry so a transient bad
      // generation doesn't get a novel hidden by Track 2b. Real low scores keep
      // their (≤14) dimensions populated.
      let result = await runFoundationReview(reviewInput, reviewConfig);
      let attempt = 1;
      while (result.dimensions.length === 0 && attempt < 3) {
        attempt++;
        console.warn(`${tag} → unparseable review (attempt ${attempt - 1}), retrying...`);
        result = await runFoundationReview(reviewInput, reviewConfig);
      }
      if (result.dimensions.length === 0) {
        stats.failed++;
        stats.errors.push(`${p.id}: review unparseable after 3 attempts (${result.overallFeedback.slice(0, 120)})`);
        console.warn(`${tag} → FAILED: unparseable after 3 attempts (excluded from distribution)`);
        continue;
      }

      stats.scored++;
      stats.distribution.push(result.totalScore);
      console.log(`${tag} → total=${result.totalScore}/140 avg=${result.avgScore} min=${result.minDimScore} passed=${result.passed}`);

      if (!dryRun) {
        const styleDir = (p.style_directives as Record<string, unknown>) || {};
        const scoreBlob = {
          totalScore: result.totalScore,
          avgScore: result.avgScore,
          minDimScore: result.minDimScore,
          passed: result.passed,
          scoredAt: new Date().toISOString(),
          dimensions: result.dimensions.map(d => ({ name: d.name, score: d.score })),
          overallFeedback: result.overallFeedback,
        };
        const { error: updErr } = await supabase
          .from('ai_story_projects')
          .update({ style_directives: { ...styleDir, retro_foundation_score: scoreBlob } })
          .eq('id', p.id);
        if (updErr) { stats.errors.push(`${p.id}: persist ${updErr.message}`); }
        else { stats.persisted++; }
      }
    } catch (e) {
      stats.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      stats.errors.push(`${p.id}: ${msg}`);
      console.warn(`${tag} → FAILED: ${msg}`);
    }
  }

  // Distribution summary — drives the Track 2b cutoff decision.
  const d = stats.distribution.sort((a, b) => a - b);
  const pct = (q: number) => (d.length ? d[Math.min(d.length - 1, Math.floor(q * d.length))] : 0);
  console.log('\n[retro-score] DONE');
  console.log(`  scanned=${stats.scanned} scored=${stats.scored} persisted=${stats.persisted} failed=${stats.failed}`);
  if (d.length) {
    const mean = (d.reduce((s, x) => s + x, 0) / d.length).toFixed(1);
    console.log(`  totalScore distribution (out of 140): min=${d[0]} p10=${pct(0.1)} p25=${pct(0.25)} median=${pct(0.5)} p75=${pct(0.75)} p90=${pct(0.9)} max=${d[d.length - 1]} mean=${mean}`);
    console.log(`  passed (≥80 & all dims ≥6): ${stats.distribution.filter(x => x >= 80).length}/${d.length}`);
  }
  if (stats.errors.length) {
    console.log(`  errors (${stats.errors.length}):`);
    stats.errors.slice(0, 20).forEach(e => console.log(`    - ${e}`));
  }
}

main().catch(e => { console.error('[retro-score] fatal:', e); process.exit(1); });

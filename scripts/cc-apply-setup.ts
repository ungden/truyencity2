// Claude Code setup applier — persists a hand-authored novel setup into the DB.
//
// Background (2026-05-29): gemini-3.1-flash-lite chapters were "lởm" vs deepseek-v4-pro,
// so per-chapter writing is now pinned to deepseek-v4-pro. The one-time per-novel SETUP
// (idea/world/canon/outline/foundation) is instead authored locally by Claude Code (Max
// 20× subscription → $0 marginal API) and applied to the DB by THIS script — bypassing
// the model-API setup-pipeline stages entirely. After apply, the standard write-chapters
// cron picks the novel up at setup_stage='ready_to_write' and DeepSeek V4 Pro writes ch.1.
//
// Usage:
//   npx tsx scripts/cc-apply-setup.ts <projectId> <blueprintName> [--apply]
//
//   <projectId>      ai_story_projects.id (uuid)
//   <blueprintName>  folder under blueprints/ — artifacts read from blueprints/<name>/setup/
//   --apply          actually write to DB. Without it, runs a DRY RUN (validate + print plan).
//
// Artifacts expected under blueprints/<blueprintName>/setup/:
//   world.md            → ai_story_projects.world_description     (REQUIRED, ≥500 chars)
//   character.json      → { mainCharacter }                       (REQUIRED, ≥2 chars)
//   description.md      → novels.description (reader pitch)        (REQUIRED, no AI mentions)
//   master-outline.json → ai_story_projects.master_outline        (REQUIRED, object)
//   story-outline.json  → ai_story_projects.story_outline          (REQUIRED, must hold setupKernel)
//   canon.json          → { power_system, worldbuilding,           (power_system+worldbuilding REQUIRED)
//                           factions?, plot_twists?, themes?,
//                           voice_anchors?, foreshadowing? }
//   arc-plan.json       → arc_plans (arc_number=1)                 (REQUIRED)
//   foundation.json     → style_directives.foundation_review_latest (REQUIRED, passed===true)
//
// Idempotent: re-running replaces this project's setup-owned child rows (factions,
// plot_twists, story_themes, voice_anchors[ch0], foreshadowing_plans, arc_plans[arc1]).
// Safe only BEFORE any chapter is written (current_chapter must be 0).
//
// After apply, activate the per-chapter blueprint separately (chapter_blueprints):
//   PROJECT_ID=<projectId> BLUEPRINT=<blueprintName> npx tsx scripts/sync-blueprint.ts --activate

import * as dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { hasValidSetupKernel, extractSetupKernel } from '../src/services/story-engine/pipeline/setup-kernel-guards';
import { detectOriginContradiction } from '../src/services/story-engine/plan/origin-guard';
import type { StoryKernel } from '../src/services/story-engine/types';

const REPO_ROOT = '/Users/alexle/Documents/truyencity';

interface CanonArtifact {
  power_system: Record<string, unknown>;
  worldbuilding: Record<string, unknown>;
  factions?: Array<Record<string, unknown>>;
  plot_twists?: Array<Record<string, unknown>>;
  themes?: Array<Record<string, unknown>>;
  voice_anchors?: Array<Record<string, unknown>>;
  foreshadowing?: Array<Record<string, unknown>>;
}

interface FoundationArtifact {
  passed: boolean;
  totalScore?: number;
  avgScore?: number;
  minDimScore?: number;
  dimensions?: unknown[];
  overallFeedback?: string;
}

interface ArcPlanArtifact {
  arc_number?: number;
  start_chapter: number;
  end_chapter: number;
  arc_theme?: string;
  plan_text: string;
  chapter_briefs?: unknown;
  threads_to_advance?: string[];
  threads_to_resolve?: string[];
  new_threads?: string[];
  sub_arcs?: unknown;
}

interface SetupBundle {
  worldDescription: string;
  mainCharacter: string;
  description: string;
  masterOutline: Record<string, unknown>;
  storyOutline: Record<string, unknown>;
  canon: CanonArtifact;
  arcPlan: ArcPlanArtifact;
  foundation: FoundationArtifact;
  kernel: StoryKernel;
}

function readText(file: string): string {
  return fs.readFileSync(file, 'utf-8');
}
function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}
function requireFile(file: string, label: string): void {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required artifact: ${label} (${file})`);
  }
}

function importanceToInt(s: unknown): number {
  const v = String(s || '').toLowerCase();
  if (v === 'critical' || v === 'cosmic' || v.includes('crit')) return 10;
  if (v === 'major' || v.includes('major')) return 7;
  if (v === 'moderate' || v.includes('mod')) return 5;
  if (v === 'minor' || v.includes('minor')) return 3;
  const n = Number(s);
  if (Number.isFinite(n)) return Math.max(1, Math.min(10, n));
  return 5;
}
function normHintType(s: unknown): string {
  const v = String(s || '').toLowerCase();
  if (v.includes('dialog')) return 'dialogue';
  if (v.includes('item') || v.includes('object') || v.includes('artifact')) return 'object';
  if (v.includes('behav') || v.includes('character')) return 'character_behavior';
  if (v.includes('env') || v.includes('world') || v.includes('place') || v.includes('rule')) return 'environmental';
  return 'event';
}
function normThemeRole(s: unknown): string {
  return String(s || '').toLowerCase().includes('main') ? 'main' : 'supporting';
}

function loadBundle(setupDir: string): SetupBundle {
  const f = (name: string) => path.join(setupDir, name);
  for (const [name, label] of [
    ['world.md', 'world.md'],
    ['character.json', 'character.json'],
    ['description.md', 'description.md'],
    ['master-outline.json', 'master-outline.json'],
    ['story-outline.json', 'story-outline.json'],
    ['canon.json', 'canon.json'],
    ['arc-plan.json', 'arc-plan.json'],
    ['foundation.json', 'foundation.json'],
  ] as const) {
    requireFile(f(name), label);
  }

  const worldDescription = readText(f('world.md')).trim();
  const character = readJson<{ mainCharacter?: string }>(f('character.json'));
  const mainCharacter = (character.mainCharacter || '').trim();
  const description = readText(f('description.md')).trim();
  const masterOutline = readJson<Record<string, unknown>>(f('master-outline.json'));
  const storyOutline = readJson<Record<string, unknown>>(f('story-outline.json'));
  const canon = readJson<CanonArtifact>(f('canon.json'));
  const arcPlan = readJson<ArcPlanArtifact>(f('arc-plan.json'));
  const foundation = readJson<FoundationArtifact>(f('foundation.json'));
  const kernel = extractSetupKernel(storyOutline) as StoryKernel;

  return { worldDescription, mainCharacter, description, masterOutline, storyOutline, canon, arcPlan, foundation, kernel };
}

function validateBundle(b: SetupBundle): string[] {
  const errors: string[] = [];

  if (b.worldDescription.length < 500) {
    errors.push(`world.md too short (${b.worldDescription.length} < 500 chars) — write-chapters hasFullSetup gate fails`);
  }
  if (b.mainCharacter.length < 2) {
    errors.push(`character.json mainCharacter too short ("${b.mainCharacter}") — must be ≥2 chars`);
  }
  if (!b.description) errors.push('description.md is empty');
  if (!b.masterOutline || typeof b.masterOutline !== 'object') {
    errors.push('master-outline.json is not a non-null object');
  }
  if (!hasValidSetupKernel(b.storyOutline)) {
    errors.push('story-outline.json missing a valid setupKernel (hasValidSetupKernel failed) — chapter writer will be blocked');
  }
  if (!b.canon?.power_system || typeof b.canon.power_system !== 'object') {
    errors.push('canon.json power_system missing/invalid — power_system_canon must be non-null (Track1 gate)');
  }
  if (!b.canon?.worldbuilding || typeof b.canon.worldbuilding !== 'object') {
    errors.push('canon.json worldbuilding missing/invalid — worldbuilding_canon must be non-null (Track1 gate)');
  }
  if (b.foundation?.passed !== true) {
    errors.push('foundation.json passed!==true — foundation_review_latest.passed must be true (Track1 gate)');
  }
  if (!b.arcPlan?.plan_text || !Number.isFinite(b.arcPlan.start_chapter) || !Number.isFinite(b.arcPlan.end_chapter)) {
    errors.push('arc-plan.json must have plan_text + numeric start_chapter + end_chapter');
  }

  // Origin-consistency guard (reuse engine guard) — kernel mcOrigin must not contradict outlines.
  const oc1 = detectOriginContradiction(b.kernel, b.masterOutline);
  if (oc1) errors.push(`origin contradiction (master-outline): ${oc1}`);
  const oc2 = detectOriginContradiction(b.kernel, b.storyOutline);
  if (oc2) errors.push(`origin contradiction (story-outline): ${oc2}`);

  return errors;
}

async function apply(db: SupabaseClient, projectId: string, b: SetupBundle): Promise<void> {
  // Load project (need novel_id + style_directives to merge) and assert no chapters yet.
  const { data: proj, error: projErr } = await db
    .from('ai_story_projects')
    .select('id,novel_id,current_chapter,style_directives')
    .eq('id', projectId)
    .single();
  if (projErr || !proj) throw new Error(`Project ${projectId} not found: ${projErr?.message}`);
  if ((proj.current_chapter || 0) > 0) {
    throw new Error(`Project already has ${proj.current_chapter} chapters — refusing to overwrite setup. cc-apply-setup is pre-write only.`);
  }
  const novelId = proj.novel_id as string;
  const sd = (proj.style_directives as Record<string, unknown>) || {};
  const history = ((sd.foundation_review_history as unknown[]) || []).slice(-9);

  // 1. ai_story_projects core columns + canon + setup_stage + style_directives
  const updatedStyle = {
    ...sd,
    setup_source: 'claude_code',
    foundation_review_latest: b.foundation,
    foundation_review_history: [...history, { ...b.foundation, timestamp: new Date().toISOString(), source: 'claude_code' }],
  };
  {
    const { error } = await db
      .from('ai_story_projects')
      .update({
        world_description: b.worldDescription,
        main_character: b.mainCharacter,
        master_outline: b.masterOutline,
        story_outline: b.storyOutline,
        power_system_canon: b.canon.power_system,
        worldbuilding_canon: b.canon.worldbuilding,
        setup_stage: 'ready_to_write',
        status: 'active',
        pause_reason: null,
        style_directives: updatedStyle,
      })
      .eq('id', projectId);
    if (error) throw new Error(`ai_story_projects update failed: ${error.message}`);
  }

  // 2. novels.description
  {
    const { error } = await db.from('novels').update({ description: b.description }).eq('id', novelId);
    if (error) throw new Error(`novels.description update failed: ${error.message}`);
  }

  // 3. arc_plans (arc 1) — delete-then-insert for idempotency
  {
    const arcNumber = b.arcPlan.arc_number ?? 1;
    await db.from('arc_plans').delete().eq('project_id', projectId).eq('arc_number', arcNumber);
    const { error } = await db.from('arc_plans').insert({
      project_id: projectId,
      arc_number: arcNumber,
      start_chapter: b.arcPlan.start_chapter,
      end_chapter: b.arcPlan.end_chapter,
      arc_theme: b.arcPlan.arc_theme || null,
      plan_text: b.arcPlan.plan_text,
      chapter_briefs: b.arcPlan.chapter_briefs ?? null,
      threads_to_advance: b.arcPlan.threads_to_advance ?? [],
      threads_to_resolve: b.arcPlan.threads_to_resolve ?? [],
      new_threads: b.arcPlan.new_threads ?? [],
      sub_arcs: b.arcPlan.sub_arcs ?? null,
    });
    if (error) throw new Error(`arc_plans insert failed: ${error.message}`);
  }

  // 4. factions (setup-owned → replace all)
  const factions = b.canon.factions ?? [];
  await db.from('factions').delete().eq('project_id', projectId);
  if (factions.length > 0) {
    const rows = factions.map(fc => ({
      project_id: projectId,
      faction_name: String(fc.name || fc.faction_name || ''),
      faction_type: String(fc.type || fc.faction_type || 'unknown'),
      power_level: Number(fc.power_level) || 5,
      description: [
        String(fc.summary || fc.description || ''),
        fc.territory ? `Lãnh thổ: ${fc.territory}` : '',
        fc.mc_relation ? `MC: ${fc.mc_relation}` : '',
        Array.isArray(fc.key_members) ? `Thành viên chính: ${JSON.stringify(fc.key_members).slice(0, 200)}` : '',
      ].filter(Boolean).join(' | '),
      alliances: Array.isArray(fc.alliances) ? fc.alliances : [],
      rivalries: Array.isArray(fc.conflicts) ? fc.conflicts : (Array.isArray(fc.rivalries) ? fc.rivalries : []),
      status: 'active',
      importance: Number(fc.importance) || 7,
      first_seen_chapter: Number(fc.introduce_arc) ? Number(fc.introduce_arc) * 30 : (Number(fc.first_seen_chapter) || null),
    }));
    const { error } = await db.from('factions').insert(rows);
    if (error) throw new Error(`factions insert failed: ${error.message}`);
  }

  // 5. plot_twists (setup-owned → replace all)
  const twists = b.canon.plot_twists ?? [];
  await db.from('plot_twists').delete().eq('project_id', projectId);
  if (twists.length > 0) {
    const rows = twists.map(t => ({
      project_id: projectId,
      twist_name: String(t.summary || t.twist_name || '').slice(0, 200),
      twist_type: String(t.payoff_type || t.twist_type || 'unknown'),
      description: String(t.summary || t.description || ''),
      setup_chapters: Array.isArray(t.setup_chapters) ? t.setup_chapters : [],
      reveal_chapter: Number(t.twist_chapter || t.reveal_chapter) || 1,
      status: 'planned',
      importance: importanceToInt(t.reader_impact || t.importance),
      volume_number: Number(t.arc_number || t.volume_number) || 1,
    }));
    const { error } = await db.from('plot_twists').insert(rows);
    if (error) throw new Error(`plot_twists insert failed: ${error.message}`);
  }

  // 6. story_themes (setup-owned → replace all)
  const themes = b.canon.themes ?? [];
  await db.from('story_themes').delete().eq('project_id', projectId);
  if (themes.length > 0) {
    const rows = themes.map(t => ({
      project_id: projectId,
      theme_name: String(t.name || t.theme_name || ''),
      theme_role: normThemeRole(t.type || t.theme_role),
      description: String(t.description || ''),
      motifs: Array.isArray(t.motifs) ? t.motifs : [],
      importance: Number(t.importance) || 7,
    }));
    const { error } = await db.from('story_themes').insert(rows);
    if (error) throw new Error(`story_themes insert failed: ${error.message}`);
  }

  // 7. voice_anchors (setup-time = chapter_number 0 → replace ch0)
  const anchors = b.canon.voice_anchors ?? [];
  await db.from('voice_anchors').delete().eq('project_id', projectId).eq('chapter_number', 0);
  if (anchors.length > 0) {
    const rows = anchors.map(a => {
      const proseText = String(a.prose_text || a.snippet_text || '');
      const sentences = proseText.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.length > 0 ? proseText.length / sentences.length : 0;
      const emDashCount = (proseText.match(/—/g) || []).length;
      return {
        project_id: projectId,
        chapter_number: 0,
        snippet_type: String(a.snippet_type || 'opening'),
        snippet_text: proseText,
        voice_metrics: {
          avgSentenceLength: Math.round(avgSentenceLength),
          emDashCount,
          dialogueRatio: proseText.includes('—') ? 0.5 : 0,
          exclamationRatio: (proseText.match(/!/g) || []).length / Math.max(1, sentences.length),
          keyTraits: Array.isArray(a.key_traits) ? a.key_traits : [],
        },
      };
    });
    const { error } = await db.from('voice_anchors').insert(rows);
    if (error) throw new Error(`voice_anchors insert failed: ${error.message}`);
  }

  // 8. foreshadowing_plans (setup-owned → replace all)
  const fore = b.canon.foreshadowing ?? [];
  await db.from('foreshadowing_plans').delete().eq('project_id', projectId);
  if (fore.length > 0) {
    const rows = fore.map(e => ({
      project_id: projectId,
      hint_id: globalThis.crypto?.randomUUID?.() || `hint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      hint_text: String(e.hintText || e.hint_text || ''),
      hint_type: normHintType(e.category || e.hint_type),
      plant_chapter: Number(e.plantCh || e.plant_chapter) || 1,
      payoff_chapter: Number(e.pickupCh || e.payoff_chapter) || 30,
      payoff_description: String(e.payoffDescription || e.payoff_description || ''),
      status: 'planned',
      arc_number: Math.max(1, Math.ceil((Number(e.plantCh || e.plant_chapter) || 1) / 100)),
    }));
    const { error } = await db.from('foreshadowing_plans').insert(rows);
    if (error) throw new Error(`foreshadowing_plans insert failed: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const projectId = args[0];
  const blueprintName = args[1];
  const doApply = process.argv.includes('--apply');

  if (!projectId || !blueprintName) {
    console.error('Usage: npx tsx scripts/cc-apply-setup.ts <projectId> <blueprintName> [--apply]');
    process.exit(1);
  }

  const setupDir = path.join(REPO_ROOT, 'blueprints', blueprintName, 'setup');
  if (!fs.existsSync(setupDir)) {
    console.error(`Setup dir not found: ${setupDir}`);
    process.exit(1);
  }

  console.log(`Loading setup artifacts from ${setupDir} ...`);
  const bundle = loadBundle(setupDir);

  const errors = validateBundle(bundle);
  if (errors.length > 0) {
    console.error(`\n✗ Validation FAILED (${errors.length} issue${errors.length > 1 ? 's' : ''}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('\n✓ Validation passed. Plan:');
  console.log(`  world_description   : ${bundle.worldDescription.length} chars`);
  console.log(`  main_character      : ${bundle.mainCharacter}`);
  console.log(`  novels.description  : ${bundle.description.length} chars`);
  console.log(`  master_outline      : ${Object.keys(bundle.masterOutline).length} top-level keys`);
  console.log(`  story_outline kernel: mcOrigin=${bundle.kernel.mcOrigin || 'unset'}`);
  console.log(`  power_system_canon  : ${Object.keys(bundle.canon.power_system).length} keys`);
  console.log(`  worldbuilding_canon : ${Object.keys(bundle.canon.worldbuilding).length} keys`);
  console.log(`  factions            : ${(bundle.canon.factions ?? []).length}`);
  console.log(`  plot_twists         : ${(bundle.canon.plot_twists ?? []).length}`);
  console.log(`  themes              : ${(bundle.canon.themes ?? []).length}`);
  console.log(`  voice_anchors       : ${(bundle.canon.voice_anchors ?? []).length}`);
  console.log(`  foreshadowing       : ${(bundle.canon.foreshadowing ?? []).length}`);
  console.log(`  arc_plans[1]        : ch ${bundle.arcPlan.start_chapter}-${bundle.arcPlan.end_chapter}`);
  console.log(`  foundation.passed   : ${bundle.foundation.passed} (total=${bundle.foundation.totalScore ?? '?'}/140)`);

  if (!doApply) {
    console.log('\n[DRY RUN] No DB writes. Re-run with --apply to persist.');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (.env.runtime / .env.local)');
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`\nApplying to project ${projectId} ...`);
  await apply(db, projectId, bundle);
  console.log('✓ Setup applied. setup_source=claude_code, setup_stage=ready_to_write, status=active.');
  console.log('\nNext: activate per-chapter blueprint (chapter_blueprints):');
  console.log(`  PROJECT_ID=${projectId} BLUEPRINT=${blueprintName} npx tsx scripts/sync-blueprint.ts --activate`);
  console.log('Then the write-chapters cron writes ch.1 via deepseek-v4-pro.');
}

main().catch((e) => { console.error(e); process.exit(1); });

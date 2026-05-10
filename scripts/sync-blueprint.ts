// Generic blueprint sync CLI — UNIFIED.
//
// Usage:
//   PROJECT_ID=<uuid> BLUEPRINT=<novel-id> [VERSION=N] npx tsx scripts/sync-blueprint.ts [--activate]
//
// Where BLUEPRINT matches a folder under `blueprints/<name>/index.ts` exporting
// a NovelBlueprint named in UPPER_SNAKE_CASE (e.g., VAN_LINH_PHO_BLUEPRINT).
//
// Flags:
//   --activate    flip writer over to chapter_blueprints path by setting
//                 style_directives.require_full_chapter_blueprint=true.
//                 Requires coverage=ok (all 1..totalChapters covered).
//
// What it does:
//   1. Loads blueprint module from `blueprints/<name>/index.ts`
//   2. Upserts 1 row per chapter into `chapter_blueprints` table (Codex schema)
//   3. Upserts arc_plans.plan_text + sub_arcs (legacy arc-level context)
//   4. Recomputes coverage and upserts story_blueprint_runs row
//   5. If --activate and coverage OK, sets style_directives flags

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { syncBlueprintToDb } from '../src/services/story-engine/blueprint/sync';
import type { NovelBlueprint } from '../src/services/story-engine/blueprint/types';

async function loadBlueprint(name: string): Promise<NovelBlueprint> {
  const blueprintPath = path.resolve(process.cwd(), 'blueprints', name, 'index.ts');
  const mod = await import(blueprintPath) as Record<string, unknown>;
  const blueprint = Object.values(mod).find((v): v is NovelBlueprint => {
    return typeof v === 'object' && v !== null && 'arcs' in v && 'totalChapters' in v;
  });
  if (!blueprint) throw new Error(`Blueprint not found in ${blueprintPath}. Expected an export of type NovelBlueprint.`);
  return blueprint;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const projectId = process.env.PROJECT_ID;
  const blueprintName = process.env.BLUEPRINT;
  const version = Number(process.env.VERSION || '1');
  const activate = hasFlag('activate');

  if (!projectId) { console.error('PROJECT_ID env required'); process.exit(1); }
  if (!blueprintName) { console.error('BLUEPRINT env required (folder name under blueprints/)'); process.exit(1); }

  const blueprint = await loadBlueprint(blueprintName);
  console.log(`Loaded blueprint: ${blueprint.title} (${blueprint.totalChapters} ch, ${blueprint.arcs.length} arcs)`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await syncBlueprintToDb(db, projectId, blueprint, { activate, version });
  console.log(`✓ Synced ${result.arcsSynced}/${blueprint.arcs.length} arcs (${result.briefsSynced} chapter blueprints upserted, ${result.arcsSkipped} arcs skipped — empty briefs).`);
  console.log(`  coverage=${result.coverageOk ? 'OK' : 'INCOMPLETE'} missing=${result.missingChapters.length} invalid=${result.invalidChapters.length}`);
  if (!result.coverageOk) {
    console.log(`  first missing: ${result.missingChapters.slice(0, 10).join(',')}`);
    if (activate) {
      console.error('✗ Activate aborted — coverage incomplete. Sync remaining arcs first.');
      process.exit(1);
    }
  }
  if (activate && result.coverageOk) {
    console.log('✓ Activated: writer will gate via chapter_blueprints (require_full_chapter_blueprint=true).');
  } else if (!activate) {
    console.log('  (not activated — pass --activate flag to flip writer over)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

// Generic blueprint sync — sync a NovelBlueprint to arc_plans table.
//
// Usage:
//   PROJECT_ID=<uuid> BLUEPRINT=van-linh-pho npx tsx scripts/sync-blueprint.ts
//
// Where BLUEPRINT matches a folder under `blueprints/<name>/index.ts`
// exporting a NovelBlueprint named in UPPER_SNAKE_CASE_BLUEPRINT.

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

async function main() {
  const projectId = process.env.PROJECT_ID;
  const blueprintName = process.env.BLUEPRINT;
  if (!projectId) { console.error('PROJECT_ID env required'); process.exit(1); }
  if (!blueprintName) { console.error('BLUEPRINT env required (folder name under blueprints/)'); process.exit(1); }

  const blueprint = await loadBlueprint(blueprintName);
  console.log(`Loaded blueprint: ${blueprint.title} (${blueprint.totalChapters} ch, ${blueprint.arcs.length} arcs)`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  const result = await syncBlueprintToDb(db, projectId, blueprint, { preserveBriefsBelow: 5 });
  console.log(`✓ Synced ${result.arcsSynced}/${blueprint.arcs.length} arcs (${result.briefsTotal} briefs total). ${result.arcsSkipped} arcs skipped (empty briefs).`);
}

main().catch((e) => { console.error(e); process.exit(1); });

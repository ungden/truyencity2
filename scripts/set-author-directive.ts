/**
 * Author steering directive — set / clear / read a free-text instruction that
 * the story engine injects into the Architect, Writer AND Critic prompts on
 * every subsequent chapter (style_directives.author_directives).
 *
 * Lets you course-correct a RUNNING auto-novel without editing code, outlines,
 * or the master plan — the engine's equivalent of ainovel-cli's persistent
 * `user_directives.json` + real-time steering.
 *
 * Usage:
 *   npx tsx scripts/set-author-directive.ts <projectId> set "Giảm tuyến tình cảm phụ, tập trung tu luyện."
 *   npx tsx scripts/set-author-directive.ts <projectId> get
 *   npx tsx scripts/set-author-directive.ts <projectId> clear
 *   npx tsx scripts/set-author-directive.ts list            # all projects with a directive set
 *
 * The directive applies from the NEXT chapter the cron writes — already-written
 * chapters are not retroactively changed.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });
dotenv.config({ path: '.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const MAX_DIRECTIVE_CHARS = 1500;

function novelTitleOf(row: { novels?: unknown }): string | undefined {
  const n = Array.isArray(row.novels) ? row.novels[0] : row.novels;
  return (n as { title?: string } | undefined)?.title;
}

async function listWithDirective() {
  const r = await s.from('ai_story_projects')
    .select('id, status, current_chapter, style_directives, novels!ai_story_projects_novel_id_fkey(title)')
    .not('style_directives->>author_directives', 'is', null)
    .order('updated_at', { ascending: false });
  if (r.error) { console.error(r.error.message); process.exit(1); }
  const rows = (r.data || []).filter((p) => {
    const sd = p.style_directives as Record<string, unknown> | null;
    return typeof sd?.author_directives === 'string' && sd.author_directives.trim();
  });
  console.log(`━━ ${rows.length} project(s) with an author directive ━━`);
  for (const p of rows) {
    const sd = p.style_directives as Record<string, unknown> | null;
    const dir = String(sd?.author_directives || '').replace(/\s+/g, ' ');
    const preview = dir.length > 90 ? dir.slice(0, 90) + '…' : dir;
    console.log(`  ${p.id} | ${p.status?.padEnd(8)} | ch.${p.current_chapter} | ${novelTitleOf(p)}\n      ↳ "${preview}"`);
  }
}

async function loadProject(projectId: string) {
  const { data, error } = await s.from('ai_story_projects')
    .select('id, status, current_chapter, style_directives, novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', projectId)
    .single();
  if (error || !data) {
    console.error(`Project ${projectId} not found: ${error?.message}`);
    process.exit(1);
  }
  return data;
}

async function getDirective(projectId: string) {
  const cur = await loadProject(projectId);
  const sd = (cur.style_directives as Record<string, unknown> | null) || {};
  const dir = typeof sd.author_directives === 'string' ? sd.author_directives.trim() : '';
  console.log(`Project ${projectId} (${novelTitleOf(cur)}) — ch.${cur.current_chapter}`);
  console.log(dir ? `\nAuthor directive:\n${dir}` : '\n(no author directive set)');
}

async function setDirective(projectId: string, text: string | null) {
  const cur = await loadProject(projectId);
  const existing = (cur.style_directives as Record<string, unknown> | null) || {};
  const next: Record<string, unknown> = { ...existing };

  const trimmed = (text || '').trim();
  if (trimmed) {
    if (trimmed.length > MAX_DIRECTIVE_CHARS) {
      console.warn(`(directive ${trimmed.length} chars > ${MAX_DIRECTIVE_CHARS}; the engine truncates it in-prompt)`);
    }
    next.author_directives = trimmed;
  } else {
    delete next.author_directives;
  }

  const upd = await s.from('ai_story_projects').update({ style_directives: next }).eq('id', projectId);
  if (upd.error) { console.error(upd.error.message); process.exit(1); }

  if (trimmed) {
    console.log(`✓ Author directive set for ${projectId} (${novelTitleOf(cur)}).`);
    console.log(`  Applies from chapter ${(cur.current_chapter ?? 0) + 1} onward.\n  "${trimmed}"`);
  } else {
    console.log(`✓ Author directive cleared for ${projectId} (${novelTitleOf(cur)}).`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'list') {
    await listWithDirective();
    return;
  }

  const projectId = cmd;
  const action = (args[1] || '').toLowerCase();
  if (!projectId.match(/^[0-9a-f-]{36}$/i)) {
    console.error('Usage: npx tsx scripts/set-author-directive.ts <uuid> set|get|clear ["directive text"]');
    process.exit(1);
  }

  if (action === 'get') {
    await getDirective(projectId);
  } else if (action === 'clear') {
    await setDirective(projectId, null);
  } else if (action === 'set') {
    const text = args.slice(2).join(' ');
    if (!text.trim()) {
      console.error('`set` needs directive text. Wrap it in quotes.');
      process.exit(1);
    }
    await setDirective(projectId, text);
  } else {
    console.error(`Action must be set | get | clear. Got "${action}".`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

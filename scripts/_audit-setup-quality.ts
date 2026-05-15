import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SetupMetrics {
  novel_id: string;
  title: string;
  world_desc_chars: number;
  master_outline_volumes: number;
  master_outline_sub_arcs: number;
  master_outline_scenes: number;
  has_antagonist_schedule: boolean;
  has_foreshadowing_schedule: boolean;
  has_climax_ladder: boolean;
  kernel_fields_filled: number;
  kernel_fields_total: number;
  story_outline_present: boolean;
  story_bible_chars: number;
  story_bible_sections: number;
  char_arcs_rows: number;
  char_sig_traits_rows: number;
  foreshadowing_agenda_rows: number;
  voice_anchors_rows: number;
  power_system_canon_rows: number;
  factions_rows: number;
  plot_twists_rows: number;
  story_themes_rows: number;
  worldbuilding_canon_rows: number;
}

async function getProjectMetrics(projectId: string, title: string): Promise<SetupMetrics | null> {
  // Get project details
  const proj = await s
    .from('ai_story_projects')
    .select('world_description,master_outline,story_outline,story_bible')
    .eq('novel_id', projectId)
    .single();

  if (!proj.data) return null;

  const {
    world_description,
    master_outline,
    story_outline,
    story_bible,
  } = proj.data;

  // World description
  const world_desc_chars = (world_description || '').length;

  // Master outline parsing
  let master_outline_volumes = 0;
  let master_outline_sub_arcs = 0;
  let master_outline_scenes = 0;
  let has_antagonist_schedule = false;
  let has_foreshadowing_schedule = false;
  let has_climax_ladder = false;

  if (master_outline && typeof master_outline === 'object') {
    if (Array.isArray(master_outline.volumes)) {
      master_outline_volumes = master_outline.volumes.length;
      master_outline.volumes.forEach((v: any) => {
        if (Array.isArray(v.subArcs)) master_outline_sub_arcs += v.subArcs.length;
        if (Array.isArray(v.scenes)) master_outline_scenes += v.scenes.length;
      });
    }
    has_antagonist_schedule = !!master_outline.antagonist_schedule;
    has_foreshadowing_schedule = !!master_outline.foreshadowing_schedule;
    has_climax_ladder = !!master_outline.climax_ladder;
  }

  // Story outline / kernel parsing
  let kernel_fields_filled = 0;
  let kernel_fields_total = 4;
  let story_outline_present = !!story_outline;

  if (story_outline && typeof story_outline === 'object') {
    const kernel = story_outline.setupKernel || {};
    if (kernel.readerFantasy) kernel_fields_filled++;
    if (kernel.pleasureLoop) kernel_fields_filled++;
    if (kernel.systemMechanic) kernel_fields_filled++;
    if (kernel.mcSecret) kernel_fields_filled++;
  }

  // Story bible
  const story_bible_chars = story_bible ? JSON.stringify(story_bible).length : 0;
  const story_bible_sections = story_bible && typeof story_bible === 'object' ? Object.keys(story_bible).length : 0;

  // Count supporting table rows
  const counts = await Promise.all([
    s.from('character_arcs').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('character_signature_traits').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('foreshadowing_agenda').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('voice_anchors').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('power_system_canon').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('factions').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('plot_twists').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('story_themes').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
    s.from('worldbuilding_canon').select('id', { count: 'exact', head: true }).eq('novel_id', projectId),
  ]);

  return {
    novel_id: projectId,
    title,
    world_desc_chars,
    master_outline_volumes,
    master_outline_sub_arcs,
    master_outline_scenes,
    has_antagonist_schedule,
    has_foreshadowing_schedule,
    has_climax_ladder,
    kernel_fields_filled,
    kernel_fields_total,
    story_outline_present,
    story_bible_chars,
    story_bible_sections,
    char_arcs_rows: counts[0].count || 0,
    char_sig_traits_rows: counts[1].count || 0,
    foreshadowing_agenda_rows: counts[2].count || 0,
    voice_anchors_rows: counts[3].count || 0,
    power_system_canon_rows: counts[4].count || 0,
    factions_rows: counts[5].count || 0,
    plot_twists_rows: counts[6].count || 0,
    story_themes_rows: counts[7].count || 0,
    worldbuilding_canon_rows: counts[8].count || 0,
  };
}

async function main() {
  console.log('🔍 Auditing SETUP QUALITY for production-enabled novels...\n');

  // Fetch all projects and filter by production_enabled in client
  const res = await s
    .from('ai_story_projects')
    .select('asp.novel_id, n.title, asp.style_directives')
    .eq('asp.user_id', process.env.SUPABASE_SERVICE_ROLE_KEY ? undefined : undefined);

  // Use raw RPC or just get all and filter in code
  const allProjects = await s
    .from('ai_story_projects')
    .select('novel_id, style_directives')
    .order('novel_id');

  if (!allProjects.data) {
    console.log('Failed to fetch projects');
    return;
  }

  // Filter for production_enabled = true
  const productionProjects = allProjects.data.filter(p => 
    p.style_directives && 
    typeof p.style_directives === 'object' && 
    (p.style_directives as any).production_enabled === true
  );

  console.log(`Found ${productionProjects.length} production-enabled novels. Fetching titles and auditing...\n`);

  if (productionProjects.length === 0) {
    console.log('No production-enabled novels found.');
    return;
  }

  // Get titles from novels table
  const novelIds = productionProjects.map(p => p.novel_id);
  const novelsRes = await s
    .from('novels')
    .select('id, title')
    .in('id', novelIds);

  const titleMap = new Map<string, string>();
  if (novelsRes.data) {
    novelsRes.data.forEach(n => titleMap.set(n.id, n.title));
  }

  const metrics: SetupMetrics[] = [];

  for (const proj of productionProjects) {
    const title = titleMap.get(proj.novel_id) || proj.novel_id.substring(0, 8);
    const m = await getProjectMetrics(proj.novel_id, title);
    if (m) metrics.push(m);
  }

  // Sort by title for readability
  metrics.sort((a, b) => a.title.localeCompare(b.title));

  // Output compact table
  console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('SETUP QUALITY AUDIT TABLE');
  console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n');

  console.log(
    'NOVEL | world | master_outline | kernel | bible | char_arcs | char_traits | foreshadow | voice | power | factions | plot | themes | world'
  );
  console.log(
    '------|-------|-----------------|--------|-------|-----------|-------------|-----------|-------|-------|----------|------|--------|------'
  );

  for (const m of metrics) {
    const world = `${m.world_desc_chars}c`;
    let master = m.master_outline_volumes ? `${m.master_outline_volumes}v/${m.master_outline_sub_arcs}sa` : 'NONE';
    if (master !== 'NONE') {
      const flags = [];
      if (!m.has_antagonist_schedule) flags.push('!A');
      if (!m.has_foreshadowing_schedule) flags.push('!F');
      if (!m.has_climax_ladder) flags.push('!C');
      if (flags.length > 0) master += ' ' + flags.join(',');
    }
    const kernel = `${m.kernel_fields_filled}/${m.kernel_fields_total}`;
    const bible = `${m.story_bible_chars}c`;
    const arcs = m.char_arcs_rows;
    const traits = m.char_sig_traits_rows;
    const foreshadow = m.foreshadowing_agenda_rows;
    const voice = m.voice_anchors_rows;
    const power = m.power_system_canon_rows;
    const factions = m.factions_rows;
    const twists = m.plot_twists_rows;
    const themes = m.story_themes_rows;
    const world_build = m.worldbuilding_canon_rows;

    const truncatedTitle = m.title.length > 14 ? m.title.substring(0, 11) + '...' : m.title;
    console.log(
      `${truncatedTitle.padEnd(14)} | ${world.padEnd(7)} | ${master.padEnd(15)} | ${kernel.padEnd(6)} | ${bible.padEnd(7)} | ${String(arcs).padEnd(9)} | ${String(traits).padEnd(11)} | ${String(foreshadow).padEnd(9)} | ${String(voice).padEnd(5)} | ${String(power).padEnd(5)} | ${String(factions).padEnd(8)} | ${String(twists).padEnd(4)} | ${String(themes).padEnd(6)} | ${String(world_build).padEnd(5)}`
    );
  }

  console.log(
    '═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n'
  );

  // Detailed per-novel summary
  console.log('DETAILED METRICS:\n');
  for (const m of metrics) {
    console.log(`📖 ${m.title}`);
    console.log(`   world_desc: ${m.world_desc_chars} chars`);
    if (m.master_outline_volumes > 0) {
      console.log(`   master_outline: ${m.master_outline_volumes} volumes, ${m.master_outline_sub_arcs} sub-arcs, ${m.master_outline_scenes} scenes`);
      console.log(`   schedule coverage: antagonist=${m.has_antagonist_schedule ? 'Y' : 'N'}, foreshadowing=${m.has_foreshadowing_schedule ? 'Y' : 'N'}, climax=${m.has_climax_ladder ? 'Y' : 'N'}`);
    } else {
      console.log(`   master_outline: NONE`);
    }
    console.log(`   kernel: ${m.kernel_fields_filled}/${m.kernel_fields_total} fields filled`);
    console.log(`   bible: ${m.story_bible_chars} chars, ${m.story_bible_sections} sections`);
    console.log(`   rows: arcs=${m.char_arcs_rows}, traits=${m.char_sig_traits_rows}, foreshadow=${m.foreshadowing_agenda_rows}, voice=${m.voice_anchors_rows}, power=${m.power_system_canon_rows}, factions=${m.factions_rows}, twists=${m.plot_twists_rows}, themes=${m.story_themes_rows}, worldbuild=${m.worldbuilding_canon_rows}`);
    console.log();
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});

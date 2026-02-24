/**
 * Quality Check v2 — Post-fix system health audit
 * Checks: chapter quality, rewrite rates, character names, foreshadowing, content samples
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jxhpejyowuihvjpqwarm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHBlanlvd3VpaHZqcHF3YXJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU5MjU3NiwiZXhwIjoyMDcyMTY4NTc2fQ.Xcc1Izxn1e2U2SBTb09Mhis9KJ1QV0OelQK4QyHHNqY'
);

async function main() {
  console.log('Quality Check v2 — ' + new Date().toISOString());
  console.log('='.repeat(80));

  // 1. Recent chapters (last 50) with basic stats
  console.log('\n═══ 1. RECENT CHAPTERS (last 50) ═══');
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, novel_id, chapter_number, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!chapters?.length) { console.log('No chapters found'); return; }

  const wordCounts = chapters.map(c => (c.content || '').split(/\s+/).filter(Boolean).length);
  const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
  const minWords = Math.min(...wordCounts);
  const maxWords = Math.max(...wordCounts);
  const under2000 = wordCounts.filter(w => w < 2000).length;
  const under1500 = wordCounts.filter(w => w < 1500).length;

  console.log(`Total: ${chapters.length} chapters`);
  console.log(`Word count: avg=${avgWords}, min=${minWords}, max=${maxWords}`);
  console.log(`Under 2000 words: ${under2000}/${chapters.length} (${Math.round(under2000 / chapters.length * 100)}%)`);
  console.log(`Under 1500 words: ${under1500}/${chapters.length} (${Math.round(under1500 / chapters.length * 100)}%)`);
  console.log(`Date range: ${chapters[chapters.length - 1].created_at} → ${chapters[0].created_at}`);

  // Per-novel stats
  const byNovel = new Map<string, typeof chapters>();
  for (const c of chapters) {
    if (!byNovel.has(c.novel_id)) byNovel.set(c.novel_id, []);
    byNovel.get(c.novel_id)!.push(c);
  }

  // Get novel titles
  const novelIds = [...byNovel.keys()];
  const { data: novels } = await supabase
    .from('novels')
    .select('id, title')
    .in('id', novelIds);
  const novelMap = new Map((novels || []).map(n => [n.id, n.title]));

  console.log(`\nNovels: ${byNovel.size}`);
  for (const [nid, chs] of byNovel) {
    const chNums = chs.map(c => c.chapter_number).sort((a, b) => a - b);
    const words = chs.map(c => (c.content || '').split(/\s+/).filter(Boolean).length);
    const avgW = Math.round(words.reduce((a, b) => a + b, 0) / words.length);
    console.log(`  "${(novelMap.get(nid) || nid).slice(0, 40)}": ${chs.length} ch (${chNums[0]}-${chNums[chNums.length - 1]}), avg ${avgW} words`);
  }

  // 2. Chapter summaries coverage
  console.log('\n═══ 2. CHAPTER SUMMARIES COVERAGE ═══');
  // Try matching by novel_id first
  let { data: projects } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter, status, genre')
    .in('novel_id', novelIds);

  if (!projects?.length) {
    console.log('No projects matched by novel_id directly. Trying all active projects...');
    const { data: allActive, error: projErr } = await supabase
      .from('ai_story_projects')
      .select('id, novel_id, current_chapter, status, genre')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (projErr) console.log('Error:', projErr.message);
    console.log(`Fetched ${allActive?.length || 0} projects. Statuses: ${[...new Set((allActive || []).map(p => p.status))].join(', ')}`);
    projects = allActive;
  }

  if (!projects?.length) { console.log('No projects found at all'); return; }
  console.log(`Found ${projects.length} projects`);

  const projectIds = projects.map(p => p.id);
  const projNovelMap = new Map(projects.map((p: any) => [p.id, { novelId: p.novel_id, genre: p.genre, ch: p.current_chapter }]));

  const { data: summaries } = await supabase
    .from('chapter_summaries')
    .select('project_id, chapter_number, cliffhanger, mc_state, summary')
    .in('project_id', projectIds)
    .order('chapter_number', { ascending: false })
    .limit(100);

  const summaryCount = summaries?.length || 0;
  const withCliffhanger = (summaries || []).filter(s => s.cliffhanger?.trim()).length;
  const withMcState = (summaries || []).filter(s => s.mc_state?.trim()).length;
  const withSummary = (summaries || []).filter(s => s.summary?.trim() && s.summary.length > 20).length;
  const degradedSummaries = (summaries || []).filter(s => {
    const sum = s.summary?.trim() || '';
    return sum.length < 20 || sum.startsWith('{') || sum.startsWith('[');
  }).length;

  console.log(`Summaries found: ${summaryCount}`);
  console.log(`  with cliffhanger: ${withCliffhanger}/${summaryCount} (${Math.round(withCliffhanger / summaryCount * 100)}%)`);
  console.log(`  with mc_state: ${withMcState}/${summaryCount} (${Math.round(withMcState / summaryCount * 100)}%)`);
  console.log(`  with good summary (>20ch): ${withSummary}/${summaryCount} (${Math.round(withSummary / summaryCount * 100)}%)`);
  console.log(`  degraded (JSON/empty): ${degradedSummaries}/${summaryCount} (${Math.round(degradedSummaries / summaryCount * 100)}%)`);

  // 3. Character states quality
  console.log('\n═══ 3. CHARACTER STATES DATA QUALITY ═══');
  const { data: charStates } = await supabase
    .from('character_states')
    .select('project_id, character_name, status, chapter_number, personality_quirks')
    .in('project_id', projectIds)
    .order('chapter_number', { ascending: false })
    .limit(500);

  if (charStates?.length) {
    const uniqueNames = new Set(charStates.map(c => c.character_name));
    const garbageNames = [...uniqueNames].filter(n => {
      if (!n || n.length < 2 || n.length > 50) return true;
      if (/^\d+$/.test(n)) return true;
      if (/^[^a-zA-ZÀ-ỹ\u4e00-\u9fff]+$/.test(n)) return true;
      const generic = ['unknown', 'null', 'none', 'n/a', 'unnamed', 'nhân vật', 'npc',
        'người lạ', 'tên', 'character', 'protagonist', 'mc', 'main character',
        'nhân vật chính', 'phản diện', 'villain', 'boss'];
      if (generic.includes(n.toLowerCase())) return true;
      if (/^\d{2,}/.test(n)) return true;
      return false;
    });

    const withQuirks = charStates.filter(c => c.personality_quirks?.trim()).length;
    const uniqueWithQuirks = new Set(charStates.filter(c => c.personality_quirks?.trim()).map(c => c.character_name));

    console.log(`Total rows: ${charStates.length}`);
    console.log(`Unique names: ${uniqueNames.size}`);
    console.log(`Garbage names: ${garbageNames.length}/${uniqueNames.size} (${Math.round(garbageNames.length / uniqueNames.size * 100)}%)`);
    if (garbageNames.length > 0) {
      console.log(`  Examples: ${garbageNames.slice(0, 15).join(', ')}`);
    }
    console.log(`Names with personality_quirks: ${uniqueWithQuirks.size}/${uniqueNames.size}`);

    // Sample valid names
    const validNames = [...uniqueNames].filter(n => !garbageNames.includes(n)).slice(0, 20);
    console.log(`Valid name samples: ${validNames.join(', ')}`);
  } else {
    console.log('No character_states found');
  }

  // 4. Foreshadowing plans lifecycle
  console.log('\n═══ 4. FORESHADOWING PLANS LIFECYCLE ═══');
  const { data: fhPlans } = await supabase
    .from('foreshadowing_plans')
    .select('project_id, hint_id, status, plant_chapter, payoff_chapter, hint_text, hint_type')
    .in('project_id', projectIds);

  if (fhPlans?.length) {
    const statusCounts: Record<string, number> = {};
    for (const p of fhPlans) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }
    console.log(`Total hints: ${fhPlans.length}`);
    console.log(`Status: ${JSON.stringify(statusCounts)}`);

    // Type distribution
    const typeCounts: Record<string, number> = {};
    for (const p of fhPlans) {
      typeCounts[p.hint_type] = (typeCounts[p.hint_type] || 0) + 1;
    }
    console.log(`Types: ${JSON.stringify(typeCounts)}`);

    // Overdue check
    const maxChapter = Math.max(...chapters.map(c => c.chapter_number));
    const overduePlant = fhPlans.filter(p => p.status === 'planned' && p.plant_chapter < maxChapter - 10);
    const overduePayoff = fhPlans.filter(p => p.status === 'planted' && p.payoff_chapter < maxChapter - 20);
    console.log(`Current max chapter: ${maxChapter}`);
    console.log(`Overdue plant (planned, >10ch past window): ${overduePlant.length}`);
    console.log(`Overdue payoff (planted, >20ch past deadline): ${overduePayoff.length}`);

    // Sample hints
    const planted = fhPlans.filter(p => p.status === 'planted').slice(0, 3);
    if (planted.length > 0) {
      console.log('\nSample planted hints:');
      for (const h of planted) {
        console.log(`  [${h.hint_type}] ch.${h.plant_chapter}→${h.payoff_chapter}: ${h.hint_text.slice(0, 100)}`);
      }
    }
  } else {
    console.log('No foreshadowing plans found');
  }

  // 5. Quality modules population
  console.log('\n═══ 5. QUALITY MODULE TABLES ═══');
  const tables = ['character_arcs', 'arc_pacing_blueprints', 'voice_fingerprints', 'mc_power_states', 'location_bibles'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds);
    const icon = (count && count > 0) ? '✓' : '✗';
    console.log(`  ${icon} ${table}: ${error ? 'ERROR: ' + error.message : `${count || 0} rows`}`);
  }

  // 6. Health check history
  console.log('\n═══ 6. HEALTH CHECK HISTORY ═══');
  const { data: healthChecks } = await supabase
    .from('health_checks')
    .select('score, status, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (healthChecks?.length) {
    for (const hc of healthChecks) {
      const date = new Date(hc.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      console.log(`  [${date}] Score: ${hc.score}/100 Status: ${hc.status}`);
      console.log(`    ${hc.summary}`);
    }
  } else {
    console.log('  No health checks found');
  }

  // 7. Content quality spot check — 3 recent chapters
  console.log('\n═══ 7. CONTENT QUALITY SPOT CHECK (3 chapters) ═══');

  for (const ch of chapters.slice(0, 3)) {
    const content = ch.content || '';
    const words = content.split(/\s+/).filter(Boolean).length;
    const dialogueLines = (content.match(/^—/gm) || []).length;
    const paragraphs = content.split(/\n\n+/).filter(Boolean).length;
    const dialogueRatio = Math.round(dialogueLines / Math.max(paragraphs, 1) * 100);

    // Repetition check
    const text = content.toLowerCase();
    const repetitionChecks: Record<string, { variants: string[]; category: string }> = {
      'tím sẫm': { variants: ['tím sẫm', 'tím đen', 'sắc tím'], category: 'generic' },
      'vàng kim': { variants: ['vàng kim', 'ánh vàng kim'], category: 'generic' },
      'kinh hoàng': { variants: ['kinh hoàng', 'kinh hãi', 'kinh ngạc'], category: 'generic' },
      'rỉ sét': { variants: ['rỉ sét'], category: 'plot' },
      'pixel hóa': { variants: ['pixel hóa', 'pixel'], category: 'plot' },
      'đột nhiên': { variants: ['đột nhiên'], category: 'banned' },
      'bùng phát': { variants: ['bùng phát', 'bùng nổ'], category: 'generic' },
    };

    const repetitions: string[] = [];
    for (const [group, { variants }] of Object.entries(repetitionChecks)) {
      let total = 0;
      for (const v of variants) {
        const m = text.match(new RegExp(v, 'gi'));
        if (m) total += m.length;
      }
      if (total >= 3) repetitions.push(`${group}(${total})`);
    }

    // Comedy detection
    const comedySignals = [
      'tự giễu', 'mỉa mai', 'khô khan', 'ngớ ngẩn', 'buồn cười', 'nội tâm',
      'não bổ', 'vô sỉ', 'tỉnh bơ', 'lật lọng', 'hắn thầm nghĩ', 'cô thầm rủa',
      'điên rồi', 'phá lệ', 'dở khóc dở cười', 'ngượng', 'xấu hổ',
    ];
    const comedyCount = comedySignals.filter(s => text.includes(s)).length;

    // Inner monologue detection
    const innerSignals = ['thầm nghĩ', 'trong lòng', 'tâm trí', 'nội tâm', 'sâu thẳm', 'không dám thừa nhận', 'ký ức', 'nỗi sợ'];
    const innerCount = innerSignals.filter(s => text.includes(s)).length;

    // Slow scene detection (rough)
    const slowSignals = ['nhìn bầu trời', 'ăn', 'uống trà', 'nghỉ ngơi', 'yên tĩnh', 'bình yên', 'hít thở', 'gió nhẹ', 'mỉm cười', 'nhắm mắt'];
    const slowCount = slowSignals.filter(s => text.includes(s)).length;

    const novelTitle = (novelMap.get(ch.novel_id) || '').slice(0, 30);
    console.log(`\n--- "${novelTitle}" Ch.${ch.chapter_number}: "${ch.title}" ---`);
    console.log(`  Words: ${words} | Paragraphs: ${paragraphs} | Dialogue lines: ${dialogueLines} (${dialogueRatio}%)`);
    console.log(`  Repetition: ${repetitions.length > 0 ? repetitions.join(', ') : 'none detected'}`);
    console.log(`  Comedy signals: ${comedyCount} | Inner monologue: ${innerCount} | Slow scene: ${slowCount}`);

    // Print opening and ending
    console.log(`\n  OPENING (500 chars):`);
    console.log(`  ${content.slice(0, 500).replace(/\n/g, '\n  ')}`);
    console.log(`\n  ENDING (500 chars):`);
    console.log(`  ${content.slice(-500).replace(/\n/g, '\n  ')}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('QUALITY CHECK COMPLETE');
}

main().catch(console.error);

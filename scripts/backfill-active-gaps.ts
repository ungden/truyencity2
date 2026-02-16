import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { ChapterWriter } from '@/services/story-writing-factory/chapter';
import { ContextLoader, saveChapterSummary } from '@/services/story-writing-factory/context-loader';
import {
  summarizeChapter,
} from '@/services/story-writing-factory/context-generators';
import { getStyleByGenre, getPowerSystemByGenre } from '@/services/story-writing-factory/templates';
import type { FactoryConfig, GenreType, ArcTheme, StoryArc, WorldBible } from '@/services/story-writing-factory/types';
import type { SynopsisData, ArcPlanData } from '@/services/story-writing-factory/context-loader';

dotenv.config({ path: '.env.local' });

const ARC_SIZE = 20;

type ProjectRow = {
  id: string;
  novel_id: string;
  main_character: string | null;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  world_description: string | null;
  temperature: number | null;
  target_chapter_length: number | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function buildDynamicWorldBible(
  projectId: string,
  title: string,
  protagonistName: string,
  genre: GenreType,
  synopsis: SynopsisData | null,
): WorldBible {
  const powerSystem = getPowerSystemByGenre(genre);
  const mcState = synopsis?.mcCurrentState || '';
  const allies = synopsis?.activeAllies || [];
  const enemies = synopsis?.activeEnemies || [];
  const openThreads = synopsis?.openThreads || [];

  const realmMatch = mcState.match(/[Cc]ảnh giới[:\s]*([^,.\n]+)/);
  const currentRealm = realmMatch?.[1]?.trim() || powerSystem.realms[0].name;

  const npcRelationships = [
    ...allies.map((name, i) => ({ name, role: 'ally' as const, affinity: 70, description: 'đồng minh', firstAppearance: i + 1 })),
    ...enemies.map((name, i) => ({ name, role: 'enemy' as const, affinity: -50, description: 'kẻ thù', firstAppearance: i + 1 })),
  ];

  const plotThreads = openThreads.map((t, i) => ({
    id: `thread-${i}`,
    name: t.slice(0, 50),
    description: t,
    priority: 'sub' as const,
    status: 'open' as const,
    startChapter: 1,
  }));

  return {
    projectId,
    storyTitle: title,
    powerSystem,
    protagonist: {
      name: protagonistName,
      realm: currentRealm,
      level: 1,
      age: 18,
      traits: ['kiên trì', 'mưu trí', 'quyết tâm'],
      abilities: [],
      inventory: [],
      goals: openThreads.length > 0 ? openThreads.slice(0, 3) : ['Trở thành cường giả tối thượng'],
      status: 'active',
    },
    npcRelationships,
    locations: [],
    openPlotThreads: plotThreads,
    resolvedPlotThreads: [],
    foreshadowing: [],
    worldRules: ['Sức mạnh quyết định địa vị', 'Cảnh giới cao áp chế cảnh giới thấp'],
  };
}

function buildArcContextFromDB(
  projectId: string,
  chapterNumber: number,
  totalPlannedChapters: number,
  arcPlan: ArcPlanData | null,
): StoryArc {
  const arcNumber = Math.ceil(chapterNumber / ARC_SIZE);
  const startChapter = (arcNumber - 1) * ARC_SIZE + 1;
  const endChapter = arcNumber * ARC_SIZE;
  const structuralFinalArc = endChapter >= totalPlannedChapters;

  let theme: ArcTheme;
  let arcTitle: string;

  if (arcPlan && arcPlan.arcTheme) {
    const themeMap: Record<string, ArcTheme> = {
      foundation: 'foundation', conflict: 'conflict', growth: 'growth',
      betrayal: 'betrayal', redemption: 'redemption', revelation: 'revelation',
      war: 'war', triumph: 'triumph', tournament: 'tournament',
      exploration: 'exploration', revenge: 'revenge', romance: 'romance',
      finale: 'finale',
    };
    const lowerTheme = arcPlan.arcTheme.toLowerCase();
    const key = Object.keys(themeMap).find((k) => lowerTheme.includes(k));
    theme = key ? themeMap[key] : structuralFinalArc ? 'finale' : 'conflict';
    arcTitle = arcPlan.arcTheme;
  } else {
    const themes: ArcTheme[] = ['foundation', 'conflict', 'growth', 'betrayal', 'revelation', 'war', 'triumph', 'tournament', 'exploration', 'revenge'];
    theme = structuralFinalArc ? 'finale' : themes[(arcNumber - 1) % themes.length];
    arcTitle = `Arc ${arcNumber}`;
  }

  return {
    id: `arc-${arcNumber}`,
    projectId,
    arcNumber,
    title: arcTitle,
    theme,
    startChapter,
    endChapter,
    tensionCurve: [3, 4, 5, 6, 5, 6, 7, 8, 7, 8, 9, 8, 7, 8, 9, 10, 9, 8, 7, 6],
    climaxChapter: startChapter + Math.floor(ARC_SIZE * 0.75),
    status: 'in_progress',
    isFinalArc: structuralFinalArc,
  };
}

async function findFirstGap(chapterNumbers: number[]): Promise<number | null> {
  if (chapterNumbers.length === 0) return null;
  const sorted = [...chapterNumbers].sort((a, b) => a - b);
  const set = new Set(sorted);
  for (let n = 1; n <= sorted[sorted.length - 1]; n++) {
    if (!set.has(n)) return n;
  }
  return null;
}

async function main() {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const aiService = new AIProviderService({ gemini: getEnv('GEMINI_API_KEY') });

  const { data: projects, error: pErr } = await supabase
    .from('ai_story_projects')
    .select(`
      id, novel_id, main_character, genre, current_chapter, total_planned_chapters,
      world_description, temperature, target_chapter_length,
      novels!ai_story_projects_novel_id_fkey (id, title)
    `)
    .eq('status', 'active');

  if (pErr) throw new Error(`Load projects failed: ${pErr.message}`);

  const projectRows = (projects || []) as ProjectRow[];
  const novelIds = projectRows.map((p) => p.novel_id);

  const { data: chapterRows, error: cErr } = await supabase
    .from('chapters')
    .select('novel_id,chapter_number')
    .in('novel_id', novelIds)
    .order('chapter_number', { ascending: true });

  if (cErr) throw new Error(`Load chapters failed: ${cErr.message}`);

  const byNovel = new Map<string, number[]>();
  for (const row of chapterRows || []) {
    if (!byNovel.has(row.novel_id)) byNovel.set(row.novel_id, []);
    byNovel.get(row.novel_id)!.push(row.chapter_number as number);
  }

  const gapTargets: Array<{ project: ProjectRow; missing: number }> = [];
  for (const p of projectRows) {
    const seq = byNovel.get(p.novel_id) || [];
    const missing = await findFirstGap(seq);
    if (missing) gapTargets.push({ project: p, missing });
  }

  if (gapTargets.length === 0) {
    console.log('No active project has chapter gaps.');
    return;
  }

  console.log(`Found ${gapTargets.length} projects with gaps. Backfilling one missing chapter per project...`);

  for (const target of gapTargets) {
    const p = target.project;
    const missing = target.missing;
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    if (!novel?.id || !novel.title) {
      console.log(`[SKIP ${p.id.slice(0, 8)}] Missing novel relation`);
      continue;
    }

    try {
      const genre = (p.genre || 'tien-hiep') as GenreType;
      const protagonistName = p.main_character || 'MC';

      const factoryConfig: Partial<FactoryConfig> = {
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        temperature: p.temperature || 1.0,
        maxTokens: 32768,
        targetWordCount: p.target_chapter_length || 2500,
        genre,
        minQualityScore: 5,
        maxRetries: 2,
        use3AgentWorkflow: true,
      };

      const chapterWriter = new ChapterWriter(factoryConfig, aiService);
      const styleBible = getStyleByGenre(genre);
      const contextLoader = new ContextLoader(p.id, p.novel_id);

      const payload = await contextLoader.load(missing);
      const previousSummary = ContextLoader.assembleContext(payload, missing);
      const arc = buildArcContextFromDB(
        p.id,
        missing,
        p.total_planned_chapters || 1500,
        payload.arcPlan,
      );
      const worldBible = buildDynamicWorldBible(p.id, novel.title, protagonistName, genre, payload.synopsis);

      const result = await chapterWriter.writeChapter(missing, {
        worldBible,
        styleBible,
        currentArc: arc,
        previousSummary,
        previousTitles: payload.previousTitles,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'writeChapter failed');
      }

      const { error: upErr } = await supabase
        .from('chapters')
        .upsert(
          {
            novel_id: p.novel_id,
            chapter_number: missing,
            title: result.data.title,
            content: result.data.content,
          },
          { onConflict: 'novel_id,chapter_number' },
        );
      if (upErr) throw new Error(`upsert chapter failed: ${upErr.message}`);

      const summaryResult = await summarizeChapter(
        aiService,
        p.id,
        missing,
        result.data.title,
        result.data.content,
        protagonistName,
      );
      await saveChapterSummary(
        p.id,
        missing,
        result.data.title,
        summaryResult.summary,
        summaryResult.openingSentence,
        summaryResult.mcState,
        summaryResult.cliffhanger,
      );

      console.log(`[OK ${p.id.slice(0, 8)}] Backfilled chapter ${missing}: ${result.data.title.slice(0, 70)}`);
    } catch (err) {
      console.error(
        `[FAIL ${p.id.slice(0, 8)}] chapter ${missing}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const { data: activeProjects } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id')
    .eq('status', 'active');
  const allNovelIds = (activeProjects || []).map((r) => r.novel_id);
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('novel_id,chapter_number')
    .in('novel_id', allNovelIds)
    .order('chapter_number', { ascending: true });

  const allByNovel = new Map<string, number[]>();
  for (const c of allChapters || []) {
    if (!allByNovel.has(c.novel_id)) allByNovel.set(c.novel_id, []);
    allByNovel.get(c.novel_id)!.push(c.chapter_number as number);
  }

  let gapProjects = 0;
  for (const p of activeProjects || []) {
    const seq = allByNovel.get(p.novel_id) || [];
    const miss = await findFirstGap(seq);
    if (miss) gapProjects++;
  }

  console.log(`Done. Remaining active projects with gaps: ${gapProjects}`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

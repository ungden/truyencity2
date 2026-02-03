import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StoryPlanner } from '@/services/story-writing-factory/planner';
import { GenreType, WorldBible, PowerRealm } from '@/services/story-writing-factory/types';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes max for planning

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// Default power system template based on genre
function getDefaultPowerSystem(genre: GenreType, customSystem?: string): WorldBible['powerSystem'] {
  const defaultRealms: Record<string, PowerRealm[]> = {
    'tien-hiep': [
      { name: 'Luyện Khí', rank: 1, subLevels: 9, description: 'Cảnh giới nhập môn', abilities: ['Ngự khí'], breakthroughDifficulty: 'easy' },
      { name: 'Trúc Cơ', rank: 2, subLevels: 3, description: 'Xây dựng nền móng', abilities: ['Phi hành ngắn'], breakthroughDifficulty: 'medium' },
      { name: 'Kim Đan', rank: 3, subLevels: 3, description: 'Kết đan', abilities: ['Thần thức mở rộng'], breakthroughDifficulty: 'hard' },
      { name: 'Nguyên Anh', rank: 4, subLevels: 3, description: 'Nguyên Anh hình thành', abilities: ['Phân thân'], breakthroughDifficulty: 'hard' },
      { name: 'Hóa Thần', rank: 5, subLevels: 3, description: 'Thần hồn hợp nhất', abilities: ['Thông thiên triệt địa'], breakthroughDifficulty: 'bottleneck' },
    ],
    'huyen-huyen': [
      { name: 'Đấu Giả', rank: 1, subLevels: 9, description: 'Cảnh giới nhập môn', abilities: ['Đấu kỹ cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Đấu Sư', rank: 2, subLevels: 9, description: 'Có thể thi triển đấu kỹ', abilities: ['Đấu kỹ nâng cao'], breakthroughDifficulty: 'medium' },
      { name: 'Đại Đấu Sư', rank: 3, subLevels: 9, description: 'Làm chủ đấu khí', abilities: ['Đấu khí ngoại phóng'], breakthroughDifficulty: 'medium' },
      { name: 'Đấu Linh', rank: 4, subLevels: 9, description: 'Linh hồn giác ngộ', abilities: ['Phi hành'], breakthroughDifficulty: 'hard' },
      { name: 'Đấu Vương', rank: 5, subLevels: 9, description: 'Vương giả phong phạm', abilities: ['Không gian phong ấn'], breakthroughDifficulty: 'bottleneck' },
    ],
  };

  const realms = defaultRealms[genre] || defaultRealms['tien-hiep'];

  return {
    name: customSystem || (genre === 'tien-hiep' ? 'Tu Tiên' : 'Đấu Khí'),
    realms,
    resources: ['Linh thạch', 'Đan dược', 'Thiên tài địa bảo'],
    techniqueGrades: ['Phàm cấp', 'Huyền cấp', 'Địa cấp', 'Thiên cấp'],
    itemGrades: ['Phàm khí', 'Linh khí', 'Bảo khí', 'Thần khí'],
    currencies: [
      { name: 'Linh thạch', value: 1, description: 'Tiền tệ cơ bản' },
      { name: 'Trung phẩm linh thạch', value: 100, description: 'Tiền tệ trung cấp' },
    ],
  };
}

// Build WorldBible from project data
function buildWorldBible(project: any): WorldBible {
  const genre = project.genre as GenreType;
  const customSystem = project.cultivation_system || project.magic_system;

  return {
    projectId: project.id,
    storyTitle: project.novel?.title || 'Untitled',
    powerSystem: getDefaultPowerSystem(genre, customSystem),
    protagonist: {
      name: project.main_character,
      realm: 'Luyện Khí',
      level: 1,
      age: 16,
      traits: ['Kiên định', 'Thông minh'],
      abilities: [],
      inventory: [],
      goals: ['Trở nên mạnh mẽ', 'Bảo vệ người thân'],
      status: 'active',
    },
    npcRelationships: [],
    locations: [],
    openPlotThreads: [],
    resolvedPlotThreads: [],
    foreshadowing: [],
    worldRules: [
      'Mạnh được yếu thua',
      'Tài nguyên có hạn',
      'Thiên đạo vô tình',
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      targetChapters = 100,
      chaptersPerArc = 20,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get project data
    const { data: project, error: projectError } = await getSupabaseAdmin()
      .from('ai_story_projects')
      .select(`
        *,
        novel:novels(id, title, author, cover_url, description)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build world bible from project
    const worldBible = buildWorldBible(project);

    // Initialize planner
    const planner = new StoryPlanner({
      provider: 'openrouter',
      model: project.ai_model || 'deepseek/deepseek-chat-v3-0324',
      genre: project.genre as GenreType,
    });

    // Step 1: Generate story outline
    const storyResult = await planner.planStory({
      title: project.novel?.title || 'Untitled',
      protagonistName: project.main_character,
      genre: project.genre as GenreType,
      premise: project.world_description,
      targetChapters,
      chaptersPerArc,
    });

    if (!storyResult.success || !storyResult.data) {
      return NextResponse.json({
        error: 'Failed to generate story outline',
        detail: storyResult.error,
      }, { status: 500 });
    }

    const storyOutline = storyResult.data;

    // Step 2: Generate all arc outlines
    const arcsResult = await planner.planAllArcs(storyOutline, worldBible);

    if (!arcsResult.success || !arcsResult.data) {
      return NextResponse.json({
        error: 'Failed to generate arc outlines',
        detail: arcsResult.error,
      }, { status: 500 });
    }

    const arcOutlines = arcsResult.data;

    // Save to story_outlines table
    const { data: savedOutline, error: outlineError } = await getSupabaseAdmin()
      .from('story_outlines')
      .upsert({
        user_id: project.user_id,
        ai_project_id: projectId,
        novel_id: project.novel_id,
        title: storyOutline.title,
        tagline: storyOutline.premise,
        genre: project.genre,
        main_character_name: storyOutline.protagonist.name,
        main_character_description: storyOutline.protagonist.startingState,
        main_character_motivation: storyOutline.protagonist.endGoal,
        world_description: project.world_description,
        power_system: worldBible.powerSystem.name,
        total_planned_chapters: targetChapters,
        arc_outlines: arcOutlines.map(arc => ({
          arc_number: arc.arcNumber,
          title: arc.title,
          description: arc.premise,
          start_chapter: arc.startChapter,
          end_chapter: arc.endChapter,
          key_events: [arc.incitingIncident, arc.midpoint, arc.climax],
          climax: arc.climax,
          theme: arc.theme,
        })),
        chapter_outlines: arcOutlines.flatMap(arc =>
          arc.chapterOutlines.map(ch => ({
            chapter_number: ch.chapterNumber,
            title: ch.title,
            summary: ch.purpose,
            key_points: ch.keyEvents,
            tension_level: ch.tensionLevel,
            dopamine_type: ch.dopamineType,
          }))
        ),
        story_hooks: storyOutline.uniqueHooks,
        main_conflicts: [storyOutline.mainConflict],
        status: 'approved',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'ai_project_id',
      })
      .select()
      .single();

    if (outlineError) {
      console.error('Error saving outline:', outlineError);
      // Continue even if save fails - return the generated data
    }

    // Save to plot_arcs table
    for (const arc of arcOutlines) {
      await getSupabaseAdmin()
        .from('plot_arcs')
        .upsert({
          project_id: projectId,
          arc_number: arc.arcNumber,
          start_chapter: arc.startChapter,
          end_chapter: arc.endChapter,
          arc_title: arc.title,
          arc_description: arc.premise,
          tension_curve: arc.tensionCurve,
          climax_chapter: arc.startChapter + Math.floor(arc.chapterCount * 0.75),
          climax_description: arc.climax,
          theme: arc.theme,
          main_goal: arc.protagonistGrowth,
          status: 'planning',
        }, {
          onConflict: 'project_id,arc_number',
        });
    }

    // Update project total_planned_chapters
    await getSupabaseAdmin()
      .from('ai_story_projects')
      .update({
        total_planned_chapters: targetChapters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return NextResponse.json({
      success: true,
      storyOutline,
      arcOutlines,
      savedOutlineId: savedOutline?.id,
      summary: {
        totalArcs: arcOutlines.length,
        totalChapters: targetChapters,
        chaptersPerArc,
      },
    });
  } catch (error) {
    console.error('Story Factory Plan API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Fetch existing outline for a project
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Get story outline
    const { data: outline, error: outlineError } = await getSupabaseAdmin()
      .from('story_outlines')
      .select('*')
      .eq('ai_project_id', projectId)
      .single();

    // Get plot arcs
    const { data: arcs, error: arcsError } = await getSupabaseAdmin()
      .from('plot_arcs')
      .select('*')
      .eq('project_id', projectId)
      .order('arc_number', { ascending: true });

    if (outlineError && arcsError) {
      return NextResponse.json({
        exists: false,
        outline: null,
        arcs: [],
      });
    }

    return NextResponse.json({
      exists: !!outline || (arcs && arcs.length > 0),
      outline,
      arcs: arcs || [],
    });
  } catch (error) {
    console.error('Error fetching outline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

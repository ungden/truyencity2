import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ContextLoader } from '@/services/story-writing-factory/context-loader';

// Claude Code Integration API
// This endpoint allows Claude Code to interact with the AI Writer system

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Claude Code tasks for the user
    const { data: tasks, error } = await supabase
      .from('claude_code_tasks')
      .select(`
        *,
        project:ai_story_projects(
          id,
          novel:novels(id, title),
          current_chapter,
          genre
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Claude Code API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, projectId, taskType, prompt, chapterCount } = body;

    switch (action) {
      case 'create_task':
        return await createTask(supabase, user.id, { projectId, taskType, prompt, chapterCount });

      case 'get_context':
        return await getProjectContext(supabase, projectId);

      case 'submit_chapter':
        return await submitChapter(supabase, user.id, body);

      case 'get_prompt_template':
        return await getPromptTemplate(supabase, projectId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Claude Code API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createTask(supabase: any, userId: string, params: any) {
  const { projectId, taskType, prompt, chapterCount = 1 } = params;

  // Validate project belongs to user
  const { data: project } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter, genre')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Create task
  const { data: task, error } = await supabase
    .from('claude_code_tasks')
    .insert({
      user_id: userId,
      project_id: projectId,
      task_type: taskType || 'write_chapter',
      status: 'pending',
      prompt: prompt || null,
      chapter_count: chapterCount,
      metadata: {
        start_chapter: project.current_chapter + 1,
        genre: project.genre,
      },
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    task,
    message: `Task created. Claude Code can now process this task.`,
  });
}

async function getProjectContext(supabase: any, projectId: string) {
  // Get project with novel info
  const { data: project } = await supabase
    .from('ai_story_projects')
    .select(`
      *,
      novel:novels(id, title, description, genres)
    `)
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const nextChapterNumber = (project.current_chapter || 0) + 1;
  let canonicalContext: unknown = null;

  try {
    if (project.novel_id) {
      const payload = await new ContextLoader(projectId, project.novel_id).load(nextChapterNumber);
      canonicalContext = {
        nextChapter: nextChapterNumber,
        hasStoryBible: payload.hasStoryBible,
        synopsis: payload.synopsis,
        arcPlan: payload.arcPlan,
        recentChapters: payload.recentChapters,
        previousTitles: payload.previousTitles,
        recentOpenings: payload.recentOpenings,
        recentCliffhangers: payload.recentCliffhangers,
      };
    }
  } catch {
    canonicalContext = null;
  }

  const { data: recentChapters } = await supabase
    .from('chapters')
    .select('chapter_number, title')
    .eq('novel_id', project.novel_id)
    .order('chapter_number', { ascending: false })
    .limit(5);

  return NextResponse.json({
    project: {
      id: project.id,
      novel: project.novel,
      genre: project.genre,
      main_character: project.main_character,
      cultivation_system: project.cultivation_system,
      magic_system: project.magic_system,
      world_description: project.world_description,
      writing_style: project.writing_style,
      target_chapter_length: project.target_chapter_length,
      current_chapter: project.current_chapter,
    },
    recentChapters: recentChapters?.reverse() || [],
    canonicalContext,
    nextChapterNumber,
  });
}

async function getPromptTemplate(supabase: any, projectId: string) {
  // Get project info
  const { data: project } = await supabase
    .from('ai_story_projects')
    .select('genre')
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get prompt template for genre
  const { data: template } = await supabase
    .from('ai_prompt_templates')
    .select('template, variables')
    .eq('category', project.genre)
    .eq('is_default', true)
    .single();

  return NextResponse.json({
    template: template?.template || getDefaultTemplate(project.genre),
    variables: template?.variables || [],
    genre: project.genre,
  });
}

async function submitChapter(supabase: any, userId: string, params: any) {
  const { projectId, taskId, chapterNumber, title, content } = params;

  // Validate project
  const { data: project } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Insert chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      novel_id: project.novel_id,
      chapter_number: chapterNumber,
      title: title,
      content: content,
    })
    .select()
    .single();

  if (chapterError) {
    return NextResponse.json({ error: chapterError.message }, { status: 500 });
  }

  // Update project current chapter
  await supabase
    .from('ai_story_projects')
    .update({ current_chapter: chapterNumber })
    .eq('id', projectId);

  // Update task if provided
  if (taskId) {
    await supabase
      .from('claude_code_tasks')
      .update({
        status: 'completed',
        result_chapter_id: chapter.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }

  return NextResponse.json({
    success: true,
    chapter: {
      id: chapter.id,
      chapter_number: chapter.chapter_number,
      title: chapter.title,
    },
  });
}

function getDefaultTemplate(genre: string): string {
  const templates: Record<string, string> = {
    'tien-hiep': `Viết chương {{CHAPTER_NUMBER}} cho tiểu thuyết tu tiên.
Nhân vật chính: {{MAIN_CHARACTER}}
Hệ thống tu luyện: {{CULTIVATION_SYSTEM}}
Bối cảnh thế giới: {{WORLD_DESCRIPTION}}

Yêu cầu:
- Viết khoảng {{TARGET_LENGTH}} từ
- Sử dụng văn phong tiểu thuyết tu tiên kinh điển
- Mô tả chi tiết các cảnh chiến đấu và đột phá
- Tạo cliffhanger cuối chương
- Không sử dụng markdown`,

    'huyen-huyen': `Viết chương {{CHAPTER_NUMBER}} cho tiểu thuyết huyền huyễn.
Nhân vật chính: {{MAIN_CHARACTER}}
Hệ thống năng lực: {{MAGIC_SYSTEM}}
Thế giới: {{WORLD_DESCRIPTION}}

Yêu cầu:
- Viết khoảng {{TARGET_LENGTH}} từ
- Sử dụng yếu tố kỳ ảo và thần bí
- Phát triển nhân vật qua tình huống
- Không sử dụng markdown`,

    default: `Viết chương {{CHAPTER_NUMBER}}.
Nhân vật chính: {{MAIN_CHARACTER}}
Thế giới: {{WORLD_DESCRIPTION}}

Yêu cầu:
- Viết khoảng {{TARGET_LENGTH}} từ
- Văn phong phù hợp với thể loại
- Không sử dụng markdown`,
  };

  return templates[genre] || templates.default;
}

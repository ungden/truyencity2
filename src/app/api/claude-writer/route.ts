import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { getAIProviderService } from '@/services/ai-provider';
import { AIProviderType } from '@/lib/types/ai-providers';
import type { SupabaseClient } from '@supabase/supabase-js';

type WriterAction = 'write_chapter' | 'write_batch' | 'get_status';

interface WriterConfig {
  provider?: AIProviderType;
  model?: string;
}

interface WriterRequestBody {
  action: WriterAction;
  projectId: string;
  customPrompt?: string;
  chapterCount?: number;
  config?: WriterConfig;
  jobId?: string;
}

interface NovelInfo {
  title?: string | null;
  description?: string | null;
  author?: string | null;
}

interface AIStoryProjectRow {
  id: string;
  user_id: string;
  novel_id: string;
  genre: string;
  main_character: string;
  current_chapter: number;
  target_chapter_length?: number | null;
  cultivation_system?: string | null;
  magic_system?: string | null;
  world_description?: string | null;
  writing_style?: string | null;
  temperature?: number | null;
  ai_model?: string | null;
  novel?: NovelInfo | null;
}

interface RecentChapterRow {
  chapter_number: number;
  title: string | null;
  content: string | null;
}

interface StoryGraphNodeRow {
  chapter_number: number;
  summary: string | null;
  key_events?: unknown;
}

// Claude Writer API (Now AI Agent Writer)
// Viết truyện trực tiếp bằng AI Provider Service

export async function POST(request: NextRequest) {
  try {
    // Changed from createServerClient to createSupabaseFromAuthHeader to support Bearer token
    const { client: supabase } = createSupabaseFromAuthHeader(request);
    
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as WriterRequestBody;
    const { action, projectId, customPrompt, chapterCount = 1, config } = body;

    switch (action) {
      case 'write_chapter':
        return await writeChapter(supabase, user.id, projectId, customPrompt, config);

      case 'write_batch':
        return await writeBatch(supabase, user.id, projectId, chapterCount, customPrompt, config);

      case 'get_status':
        if (!body.jobId) {
          return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
        }
        return await getWritingStatus(supabase, user.id, body.jobId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Writer API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function writeChapter(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  customPrompt?: string,
  config?: WriterConfig
) {
  // Get project info
  const { data: project, error: projectError } = await supabase
    .from('ai_story_projects')
    .select(`
      *,
      novel:novels(id, title, description, author)
    `)
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  const typedProject = project as unknown as AIStoryProjectRow | null;

  if (projectError || !typedProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const nextChapter = typedProject.current_chapter + 1;

  // Get recent chapters for context
  const { data: recentChapters } = await supabase
    .from('chapters')
    .select('chapter_number, title, content')
    .eq('novel_id', typedProject.novel_id)
    .order('chapter_number', { ascending: false })
    .limit(3);

  // Get story graph for context
  const { data: storyGraph } = await supabase
    .from('story_graph_nodes')
    .select('chapter_number, summary, key_events')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: false })
    .limit(5);

  // Build the prompt
  const prompt = buildWritingPrompt(
    typedProject,
    nextChapter,
    (recentChapters as unknown as RecentChapterRow[]) || [],
    (storyGraph as unknown as StoryGraphNodeRow[]) || [],
    customPrompt
  );

  // Use AI Provider Service
  const aiService = getAIProviderService();
  const provider = config?.provider || 'gemini';
  const model = config?.model || typedProject.ai_model || 'gemini-3-flash-preview';

  try {
    const result = await aiService.chat({
      provider,
      model,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(typedProject.genre),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: typedProject.temperature || 0.7,
      maxTokens: 8000,
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Failed to generate content');
    }

    const chapterContent = result.content;

    // Parse chapter title from content
    const { title, content } = parseChapterContent(chapterContent, nextChapter);

    // Save chapter to database
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        novel_id: typedProject.novel_id,
        chapter_number: nextChapter,
        title: title,
        content: content,
      })
      .select()
      .single();

    if (chapterError) {
      console.error('Error saving chapter:', chapterError);
      return NextResponse.json({ error: 'Failed to save chapter' }, { status: 500 });
    }

    // Update project current chapter
    await supabase
      .from('ai_story_projects')
      .update({ current_chapter: nextChapter })
      .eq('id', projectId);

    // Update story graph (simplified)
    await updateStoryGraph(supabase, projectId, nextChapter, title, content);

    return NextResponse.json({
      success: true,
      chapter: {
        id: chapter.id,
        chapter_number: nextChapter,
        title: title,
        wordCount: content.split(/\s+/).length,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown AI error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function writeBatch(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  count: number,
  customPrompt?: string,
  config?: WriterConfig
) {
  const results = [];

  for (let i = 0; i < count; i++) {
    try {
      const result = await writeChapter(supabase, userId, projectId, customPrompt, config);
      const data = await result.json();
      results.push(data);

      if (!data.success) {
        break; // Stop on first error
      }
    } catch (error) {
      results.push({ success: false, error: 'Failed to write chapter' });
      break;
    }
  }

  return NextResponse.json({
    success: true,
    results,
    completed: results.filter(r => r.success).length,
    total: count,
  });
}

async function getWritingStatus(supabase: SupabaseClient, userId: string, jobId: string) {
  const { data: job } = await supabase
    .from('ai_writing_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  return NextResponse.json({ job });
}

function buildWritingPrompt(
  project: AIStoryProjectRow,
  chapterNumber: number,
  recentChapters: RecentChapterRow[],
  storyGraph: StoryGraphNodeRow[],
  customPrompt?: string
): string {
  let prompt = `Viết chương ${chapterNumber} cho tiểu thuyết "${project.novel?.title}".

**Thể loại:** ${project.genre}
**Nhân vật chính:** ${project.main_character}
`;

  if (project.cultivation_system) {
    prompt += `**Hệ thống tu luyện:** ${project.cultivation_system}\n`;
  }
  if (project.magic_system) {
    prompt += `**Hệ thống phép thuật:** ${project.magic_system}\n`;
  }
  if (project.world_description) {
    prompt += `**Thế giới:** ${project.world_description}\n`;
  }

  // Add recent chapters context
  if (recentChapters.length > 0) {
    prompt += `\n**Các chương gần đây:**\n`;
    recentChapters.reverse().forEach(ch => {
      const summary = ch.content?.substring(0, 500) || '';
      prompt += `- Chương ${ch.chapter_number} "${ch.title}": ${summary}...\n`;
    });
  }

  // Add story graph context
  if (storyGraph.length > 0) {
    prompt += `\n**Tóm tắt cốt truyện:**\n`;
    storyGraph.reverse().forEach(node => {
      prompt += `- Chương ${node.chapter_number}: ${node.summary}\n`;
    });
  }

  // Add custom prompt if provided
  if (customPrompt) {
    prompt += `\n**Yêu cầu đặc biệt:** ${customPrompt}\n`;
  }

  prompt += `
**Yêu cầu viết:**
- Độ dài: ${project.target_chapter_length || 2500} từ
- KHÔNG sử dụng markdown (**, #, -, etc.)
- Tiêu đề chương: "Chương ${chapterNumber}: [Tên chương hấp dẫn]"
- Tiếp nối mạch truyện từ chương trước
- Tạo cliffhanger hoặc điểm nhấn cuối chương
- Phát triển nhân vật tự nhiên
- Văn phong ${project.writing_style || 'sinh động, hấp dẫn'}

Bắt đầu viết:`;

  return prompt;
}

function getSystemPrompt(genre: string): string {
  const prompts: Record<string, string> = {
    'tien-hiep': `Bạn là tác giả tiểu thuyết tu tiên chuyên nghiệp. Văn phong của bạn mạnh mẽ, hào sảng, với những cảnh chiến đấu mãnh liệt và quá trình tu luyện chi tiết. Bạn giỏi tạo ra các cảnh đột phá cảnh giới đầy kịch tính.`,

    'huyen-huyen': `Bạn là tác giả tiểu thuyết huyền huyễn. Bạn sáng tạo các hệ thống sức mạnh độc đáo, thế giới quan rộng lớn với nhiều chủng tộc và thế lực. Văn phong thần bí, hấp dẫn.`,

    'do-thi': `Bạn là tác giả tiểu thuyết đô thị. Bạn giỏi viết về cuộc sống hiện đại, tình cảm, thương trường. Văn phong gần gũi, đời thường nhưng vẫn hấp dẫn.`,

    'vo-hiep': `Bạn là tác giả tiểu thuyết võ hiệp cổ điển. Bạn giỏi mô tả chiêu thức, giang hồ, và những mối ân oán tình thù. Văn phong cổ điển, bay bổng.`,
  };

  return prompts[genre] || `Bạn là tác giả tiểu thuyết chuyên nghiệp. Văn phong sinh động, hấp dẫn, tạo được cảm xúc cho người đọc.`;
}

function parseChapterContent(content: string, chapterNumber: number): { title: string; content: string } {
  // Try to extract title from content
  const titleMatch = content.match(/^Chương\s*\d+[:\s]*(.+?)[\n\r]/i);

  let title = `Chương ${chapterNumber}`;
  let cleanContent = content;

  if (titleMatch) {
    title = titleMatch[1].trim();
    // Remove the title line from content
    cleanContent = content.replace(/^Chương\s*\d+[:\s]*.+?[\n\r]+/i, '').trim();
  }

  // Clean up remaining markdown
  cleanContent = cleanContent
    .replace(/\*\*/g, '')
    .replace(/##?\s*/g, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();

  return { title, content: cleanContent };
}

async function updateStoryGraph(
  supabase: SupabaseClient,
  projectId: string,
  chapterNumber: number,
  title: string,
  content: string
) {
  // Create a simple summary (first 200 chars)
  const summary = content.substring(0, 200) + '...';

  await supabase
    .from('story_graph_nodes')
    .upsert({
      project_id: projectId,
      chapter_number: chapterNumber,
      chapter_title: title,
      summary: summary,
      key_events: [],
      character_states: [],
      plot_threads: [],
    }, {
      onConflict: 'project_id,chapter_number',
    });
}

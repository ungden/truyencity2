import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import type { z } from 'zod';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/security/rate-limiter';
import {
  validateInput,
  ValidationError,
  createValidationErrorResponse,
  ExternalAPISchema,
  UUIDSchema,
} from '@/lib/security/validation';
import { logger, getRequestContext, createTimer } from '@/lib/security/logger';

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

type ValidatedExternalBody = z.infer<typeof ExternalAPISchema>;
type SubmitChapterBody = Extract<ValidatedExternalBody, { action: 'submit_chapter' }>;

interface AIStoryProjectRow {
  id: string;
  novel_id: string;
  genre: string;
  main_character: string;
  current_chapter: number;
  target_chapter_length?: number | null;
  cultivation_system?: string | null;
  magic_system?: string | null;
  world_description?: string | null;
  writing_style?: string | null;
  novel?: {
    title?: string | null;
    description?: string | null;
  } | null;
}

interface ChapterRow {
  chapter_number: number;
  title: string | null;
  content: string | null;
}

// External API for Claude Code Integration
// Allows Claude Code CLI to submit chapters using API token
// NOTE: Credentials moved to environment variables for security

// Verify API token and get user
async function verifyToken(supabase: SupabaseServerClient, authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer tc_')) {
    return null;
  }

  const rawToken = authHeader.replace('Bearer tc_', '');
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  const { data: tokenData, error } = await supabase
    .from('user_api_tokens')
    .select('user_id, expires_at')
    .eq('token_hash', hashedToken)
    .single();

  if (error || !tokenData) {
    return null;
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('user_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', hashedToken);

  return tokenData.user_id;
}

export async function GET(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    // Rate limiting check (before auth to prevent enumeration attacks)
    const clientId = getClientIdentifier(request);
    const rateCheck = rateLimiter.check(clientId, RATE_LIMIT_CONFIGS.external);

    if (!rateCheck.allowed) {
      logger.securityEvent('rate_limit_exceeded', requestContext.ip || 'unknown', {
        endpoint: '/api/external/claude-code',
        method: 'GET',
      });
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const supabase = await createServerClient();
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(supabase, authHeader);

    if (!userId) {
      logger.securityEvent('auth_failed', requestContext.ip || 'unknown', {
        endpoint: '/api/external/claude-code',
        reason: 'invalid_token',
      });
      return NextResponse.json({
        error: 'Invalid or expired token',
        hint: 'Lấy token mới tại: /admin/settings → API Tokens'
      }, { status: 401 });
    }

    const action = request.nextUrl.searchParams.get('action') || 'projects';

    let response: NextResponse;
    switch (action) {
      case 'projects':
        response = await getProjects(supabase, userId);
        break;
      case 'context':
        const projectId = request.nextUrl.searchParams.get('projectId');
        if (!projectId) {
          return NextResponse.json({ error: 'projectId required' }, { status: 400 });
        }
        // Validate projectId format
        try {
          validateInput(UUIDSchema, projectId);
        } catch (err) {
          return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
        }
        response = await getContext(supabase, userId, projectId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    logger.apiRequest('GET', '/api/external/claude-code', response.status, timer(), {
      userId,
      action,
    });

    return addRateLimitHeaders(response, rateCheck.remaining, rateCheck.resetIn);
  } catch (error) {
    logger.error('Claude Code API error', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const timer = createTimer();
  const requestContext = getRequestContext(request);

  try {
    // Rate limiting check
    const clientId = getClientIdentifier(request);
    const rateCheck = rateLimiter.check(clientId, RATE_LIMIT_CONFIGS.external);

    if (!rateCheck.allowed) {
      logger.securityEvent('rate_limit_exceeded', requestContext.ip || 'unknown', {
        endpoint: '/api/external/claude-code',
        method: 'POST',
      });
      return createRateLimitResponse(rateCheck.resetIn);
    }

    const supabase = await createServerClient();
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(supabase, authHeader);

    if (!userId) {
      logger.securityEvent('auth_failed', requestContext.ip || 'unknown', {
        endpoint: '/api/external/claude-code',
        reason: 'invalid_token',
      });
      return NextResponse.json({
        error: 'Invalid or expired token',
        hint: 'Lấy token mới tại: /admin/settings → API Tokens'
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    let validatedBody: ValidatedExternalBody;
    try {
      validatedBody = validateInput(ExternalAPISchema, body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return createValidationErrorResponse(err);
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let response: NextResponse;
    switch (validatedBody.action) {
      case 'submit_chapter':
        response = await submitChapter(supabase, userId, validatedBody);
        break;
      case 'get_prompt':
        response = await getWritingPrompt(supabase, userId, validatedBody.projectId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    logger.apiRequest('POST', '/api/external/claude-code', response.status, timer(), {
      userId,
      action: validatedBody.action,
    });

    return addRateLimitHeaders(response, rateCheck.remaining, rateCheck.resetIn);
  } catch (error) {
    logger.error('Claude Code API error', error as Error, requestContext);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getProjects(supabase: SupabaseServerClient, userId: string) {
  const { data: projects, error } = await supabase
    .from('ai_story_projects')
    .select(`
      id,
      genre,
      main_character,
      current_chapter,
      target_chapter_length,
      novel:novels(id, title)
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: projects || [],
    usage: `
# Cách sử dụng với Claude Code:

1. Xem danh sách dự án:
   GET /api/external/claude-code?action=projects

2. Lấy context để viết:
   GET /api/external/claude-code?action=context&projectId=xxx

3. Gửi chương đã viết:
   POST /api/external/claude-code
   { "action": "submit_chapter", "projectId": "xxx", "title": "...", "content": "..." }
`
  });
}

async function getContext(supabase: SupabaseServerClient, userId: string, projectId: string) {
  // Get project
  const { data: project, error: projectError } = await supabase
    .from('ai_story_projects')
    .select(`
      *,
      novel:novels(id, title, description)
    `)
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  const typedProject = project as unknown as AIStoryProjectRow | null;

  if (projectError || !typedProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get recent chapters
  const { data: recentChapters } = await supabase
    .from('chapters')
    .select('chapter_number, title, content')
    .eq('novel_id', typedProject.novel_id)
    .order('chapter_number', { ascending: false })
    .limit(3);

  // Get story graph
  const { data: storyGraph } = await supabase
    .from('story_graph_nodes')
    .select('chapter_number, summary')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: false })
    .limit(5);

  const nextChapter = typedProject.current_chapter + 1;

  return NextResponse.json({
    project: {
      id: typedProject.id,
      novelTitle: typedProject.novel?.title,
      genre: typedProject.genre,
      mainCharacter: typedProject.main_character,
      cultivationSystem: typedProject.cultivation_system,
      magicSystem: typedProject.magic_system,
      worldDescription: typedProject.world_description,
      writingStyle: typedProject.writing_style,
      targetLength: typedProject.target_chapter_length || 2500,
      currentChapter: typedProject.current_chapter,
      nextChapter: nextChapter,
    },
    recentChapters: ((recentChapters as unknown as ChapterRow[]) || []).reverse().map((ch) => ({
      number: ch.chapter_number,
      title: ch.title,
      summary: (ch.content?.substring(0, 300) || '') + '...',
    })),
    storyGraph: (storyGraph || []).reverse(),
    prompt: buildPromptForClaude(typedProject, nextChapter, ((recentChapters as unknown as ChapterRow[]) || [])),
  });
}

async function submitChapter(supabase: SupabaseServerClient, userId: string, body: SubmitChapterBody) {
  const { projectId, title, content, chapterNumber } = body;

  if (!projectId || !content) {
    return NextResponse.json({ error: 'projectId and content required' }, { status: 400 });
  }

  // Verify project belongs to user
  const { data: project, error: projectError } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const nextChapter = chapterNumber || project.current_chapter + 1;

  // Parse title from content if not provided
  let chapterTitle = title;
  if (!chapterTitle) {
    const titleMatch = content.match(/^Chương\s*\d+[:\s]*(.+?)[\n\r]/i);
    chapterTitle = titleMatch ? titleMatch[1].trim() : `Chương ${nextChapter}`;
  }

  // Clean content (remove markdown if present)
  const cleanContent = content
    .replace(/^Chương\s*\d+[:\s]*.+?[\n\r]+/i, '') // Remove title line
    .replace(/\*\*/g, '')
    .replace(/##?\s*/g, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();

  // Insert chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      novel_id: project.novel_id,
      chapter_number: nextChapter,
      title: chapterTitle,
      content: cleanContent,
    })
    .select()
    .single();

  if (chapterError) {
    console.error('Error saving chapter:', chapterError);
    return NextResponse.json({ error: 'Failed to save chapter' }, { status: 500 });
  }

  // Update project
  await supabase
    .from('ai_story_projects')
    .update({ current_chapter: nextChapter })
    .eq('id', projectId);

  // Update story graph
  await supabase
    .from('story_graph_nodes')
    .upsert({
      project_id: projectId,
      chapter_number: nextChapter,
      chapter_title: chapterTitle,
      summary: cleanContent.substring(0, 200) + '...',
      key_events: [],
      character_states: [],
      plot_threads: [],
    }, {
      onConflict: 'project_id,chapter_number',
    });

  return NextResponse.json({
    success: true,
    chapter: {
      id: chapter.id,
      number: nextChapter,
      title: chapterTitle,
      wordCount: cleanContent.split(/\s+/).length,
    },
    message: `Đã lưu Chương ${nextChapter}: ${chapterTitle}`,
  });
}

async function getWritingPrompt(supabase: SupabaseServerClient, userId: string, projectId: string) {
  const contextResponse = await getContext(supabase, userId, projectId);
  const context = await contextResponse.json();

  if (context.error) {
    return NextResponse.json(context, { status: 404 });
  }

  return NextResponse.json({
    prompt: context.prompt,
    instructions: `
Sử dụng prompt trên để viết chương. Sau khi viết xong, gửi lại bằng:

POST /api/external/claude-code
{
  "action": "submit_chapter",
  "projectId": "${projectId}",
  "content": "[Nội dung chương đã viết]"
}
`,
  });
}

function buildPromptForClaude(project: AIStoryProjectRow, nextChapter: number, recentChapters: ChapterRow[]): string {
  let prompt = `Viết Chương ${nextChapter} cho tiểu thuyết "${project.novel?.title}".

**Thông tin cơ bản:**
- Thể loại: ${project.genre}
- Nhân vật chính: ${project.main_character}
${project.cultivation_system ? `- Hệ thống tu luyện: ${project.cultivation_system}` : ''}
${project.magic_system ? `- Hệ thống phép thuật: ${project.magic_system}` : ''}
${project.world_description ? `- Thế giới: ${project.world_description}` : ''}

**Các chương gần đây:**
`;

  recentChapters.reverse().forEach(ch => {
    prompt += `- Chương ${ch.chapter_number} "${ch.title}": ${ch.content?.substring(0, 200)}...\n`;
  });

  prompt += `
**Yêu cầu viết:**
1. Độ dài: ${project.target_chapter_length || 2500} từ
2. KHÔNG sử dụng markdown (**, #, -, etc.)
3. Tiêu đề: "Chương ${nextChapter}: [Tên chương hấp dẫn]"
4. Tiếp nối mạch truyện từ chương trước
5. Tạo cliffhanger cuối chương
6. Văn phong: ${project.writing_style || 'sinh động, hấp dẫn'}

Bắt đầu viết:`;

  return prompt;
}

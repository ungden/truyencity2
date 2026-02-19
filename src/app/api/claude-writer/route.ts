import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { writeChapterForProject } from '@/services/story-engine';

type WriterAction = 'write_chapter' | 'write_batch' | 'get_status';

interface WriterConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  targetWordCount?: number;
}

interface WriterRequestBody {
  action: WriterAction;
  projectId: string;
  customPrompt?: string;
  chapterCount?: number;
  config?: WriterConfig;
}

export async function POST(request: NextRequest) {
  try {
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

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (action === 'get_status') {
      return NextResponse.json(
        { error: 'get_status was removed.' },
        { status: 410 },
      );
    }

    if (action === 'write_chapter') {
      const v2 = await writeChapterForProject({
        projectId,
        customPrompt,
        temperature: config?.temperature,
        targetWordCount: config?.targetWordCount,
        model: config?.model,
      });
      const result = { chapterNumber: v2.chapterNumber, title: v2.title, wordCount: v2.wordCount };

      return NextResponse.json({
        success: true,
        chapter: {
          chapter_number: result.chapterNumber,
          title: result.title,
          wordCount: result.wordCount,
        },
      });
    }

    if (action === 'write_batch') {
      const maxCount = Math.min(Math.max(chapterCount, 1), 20);
      const results: Array<{ success: boolean; chapter?: { chapter_number: number; title: string; wordCount: number }; error?: string }> = [];

      for (let i = 0; i < maxCount; i++) {
        try {
          const v2 = await writeChapterForProject({
            projectId,
            customPrompt,
            temperature: config?.temperature,
            targetWordCount: config?.targetWordCount,
            model: config?.model,
          });
          const result = { chapterNumber: v2.chapterNumber, title: v2.title, wordCount: v2.wordCount };

          results.push({
            success: true,
            chapter: {
              chapter_number: result.chapterNumber,
              title: result.title,
              wordCount: result.wordCount,
            },
          });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to write chapter',
          });
          break;
        }
      }

      return NextResponse.json({
        success: true,
        results,
        completed: results.filter((r) => r.success).length,
        total: maxCount,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Story Writing Tool API
 * Chat-based interface for AI story writing, similar to Claude Code CLI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StoryWritingSessionService } from '@/services/story-writing-session';
import { AIProviderService } from '@/services/ai-provider';
import { AI_PROVIDERS, AIProviderType } from '@/lib/types/ai-providers';

// Initialize Supabase admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Get user from request
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseAdmin();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

// GET - List sessions or get session details
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const projectId = searchParams.get('projectId');

    const supabase = getSupabaseAdmin();
    const sessionService = new StoryWritingSessionService(supabase, user.id);

    if (sessionId) {
      // Get specific session
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ session });
    }

    if (projectId) {
      // Get sessions for project
      const sessions = await sessionService.getProjectSessions(projectId);
      return NextResponse.json({ sessions });
    }

    // Get all user's sessions
    const { data: sessions, error } = await supabase
      .from('story_writing_sessions')
      .select('*, project:ai_story_projects(*, novel:novels(id, title))')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[story-writing-tool] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// POST - Create session, send message, or execute actions
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, projectId, message, config, apiKeys } = body;

    const supabase = getSupabaseAdmin();

    // Initialize AI Provider with user's API keys if provided
    const aiProvider = new AIProviderService();
    if (apiKeys) {
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key) aiProvider.setApiKey(provider as AIProviderType, key as string);
      }
    }

    const sessionService = new StoryWritingSessionService(supabase, user.id, aiProvider);

    switch (action) {
      case 'create_session': {
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const defaultConfig = {
          provider: config?.provider || 'gemini' as AIProviderType,
          model: config?.model || AI_PROVIDERS['gemini'].defaultModel,
          temperature: config?.temperature || 0.7,
          targetWordCount: config?.targetWordCount || 2500,
          useAgents: config?.useAgents || false, // Capture the flag
        };

        const session = await sessionService.createSession(projectId, defaultConfig);

        // Add welcome message
        const welcomeMsg = defaultConfig.useAgents 
          ? `Welcome to Agent Mode (Architect-Writer-Critic)!\n\nProject loaded. Current chapter: ${body.currentChapter || 0}\n\nI will plan, write, and critique each chapter to ensure high quality.`
          : `Welcome to Story Writing Tool!\n\nProject loaded. Current chapter: ${body.currentChapter || 0}\n\nType /help to see available commands.`;

        await sessionService.addMessage(session.id, 'assistant', welcomeMsg);

        // Refresh session with welcome message
        const updatedSession = await sessionService.getSession(session.id);

        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'send_message': {
        if (!sessionId || !message) {
          return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
        }

        const result = await sessionService.processUserInput(
          sessionId,
          message,
          apiKeys?.[config?.provider || 'gemini']
        );

        const session = await sessionService.getSession(sessionId);

        return NextResponse.json({
          success: true,
          response: result.response,
          action: result.action,
          data: result.data,
          session,
        });
      }

      case 'get_providers': {
        const providers = Object.values(AI_PROVIDERS).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          models: p.models,
          defaultModel: p.defaultModel,
        }));

        return NextResponse.json({ providers });
      }

      case 'validate_api_key': {
        const { provider, apiKey } = body;
        if (!provider || !apiKey) {
          return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
        }

        const result = await aiProvider.validateApiKey(provider, apiKey);
        return NextResponse.json(result);
      }

      case 'get_user_settings': {
        const { data: settings } = await supabase
          .from('ai_provider_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        return NextResponse.json({ settings: settings || null });
      }

      case 'save_user_settings': {
        const { providerConfigs, defaultProvider, defaultModel } = body;

        const { data: existing } = await supabase
          .from('ai_provider_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existing) {
          await supabase
            .from('ai_provider_settings')
            .update({
              provider_configs: providerConfigs,
              default_provider: defaultProvider,
              default_model: defaultModel,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('ai_provider_settings')
            .insert({
              user_id: user.id,
              provider_configs: providerConfigs,
              default_provider: defaultProvider,
              default_model: defaultModel,
            });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[story-writing-tool] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete session
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('story_writing_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[story-writing-tool] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
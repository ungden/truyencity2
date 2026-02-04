/**
 * Story Writing Session Service
 * Manages chat-based writing sessions similar to Claude Code CLI
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AIProviderService } from './ai-provider';
import { AIStoryWriter } from './_legacy/ai-story-writer';
import { createDopamineOptimizer } from './dopamine-writing-optimizer';
import {
  AIProviderType,
  SessionMessage,
  SessionStatus,
  WritingSession,
  PlanningOutline,
  PlanningArc,
  PlanningCharacter,
  AI_PROVIDERS,
} from '@/lib/types/ai-providers';
import { AIStoryProject } from '@/lib/types/ai-writer';
import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';

interface SessionConfig {
  provider: AIProviderType;
  model: string;
  temperature: number;
  targetWordCount: number;
  apiKey?: string;
  useAgents?: boolean; // New flag for 3-agent workflow
}

export class StoryWritingSessionService {
  private supabase: SupabaseClient;
  private aiProvider: AIProviderService;
  private userId: string;

  constructor(supabaseClient: SupabaseClient, userId: string, aiProvider?: AIProviderService) {
    this.supabase = supabaseClient;
    this.userId = userId;
    this.aiProvider = aiProvider || new AIProviderService();
  }

  // Create a new writing session
  async createSession(projectId: string, config: SessionConfig): Promise<WritingSession> {
    const { data, error } = await this.supabase
      .from('story_writing_sessions')
      .insert({
        user_id: this.userId,
        project_id: projectId,
        status: 'idle',
        messages: [],
        progress: 0,
        config: {
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          targetWordCount: config.targetWordCount,
          useAgents: config.useAgents || false,
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);

    return this.mapToWritingSession(data);
  }

  // Get session by ID
  async getSession(sessionId: string): Promise<WritingSession | null> {
    const { data, error } = await this.supabase
      .from('story_writing_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', this.userId)
      .single();

    if (error || !data) return null;
    return this.mapToWritingSession(data);
  }

  // Get active sessions for a project
  async getProjectSessions(projectId: string): Promise<WritingSession[]> {
    const { data, error } = await this.supabase
      .from('story_writing_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) return [];
    return data.map(this.mapToWritingSession);
  }

  // Add a message to the session
  async addMessage(
    sessionId: string,
    type: SessionMessage['type'],
    content: string,
    metadata?: SessionMessage['metadata']
  ): Promise<SessionMessage> {
    const message: SessionMessage = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
      metadata,
    };

    const { data: session } = await this.supabase
      .from('story_writing_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();

    const messages = [...(session?.messages || []), message];

    await this.supabase
      .from('story_writing_sessions')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return message;
  }

  // Update session status
  async updateStatus(
    sessionId: string,
    status: SessionStatus,
    progress?: number,
    currentStep?: string,
    error?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (progress !== undefined) updates.progress = progress;
    if (currentStep !== undefined) updates.current_step = currentStep;
    if (error !== undefined) updates.error_message = error;

    await this.supabase
      .from('story_writing_sessions')
      .update(updates)
      .eq('id', sessionId);
  }

  // Process user input and generate response
  async processUserInput(
    sessionId: string,
    input: string,
    apiKey?: string
  ): Promise<{ response: string; action?: string; data?: unknown }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Add user message
    await this.addMessage(sessionId, 'user', input);

    // Parse command or message
    const command = this.parseCommand(input);

    if (command) {
      return await this.executeCommand(sessionId, command, apiKey);
    }

    // Regular chat - generate AI response
    return await this.generateChatResponse(sessionId, input, apiKey);
  }

  // Parse commands like /plan, /write, /status, etc.
  private parseCommand(input: string): { name: string; args: string[] } | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return null;

    const parts = trimmed.slice(1).split(/\s+/);
    return {
      name: parts[0].toLowerCase(),
      args: parts.slice(1),
    };
  }

  // Execute parsed commands
  private async executeCommand(
    sessionId: string,
    command: { name: string; args: string[] },
    apiKey?: string
  ): Promise<{ response: string; action?: string; data?: unknown }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    switch (command.name) {
      case 'plan':
        return await this.executePlanCommand(sessionId, command.args, apiKey);

      case 'write':
        return await this.executeWriteCommand(sessionId, command.args, apiKey);

      case 'batch':
        return await this.executeBatchCommand(sessionId, command.args, apiKey);

      case 'status':
        return await this.executeStatusCommand(sessionId);

      case 'context':
        return await this.executeContextCommand(sessionId);

      case 'outline':
        return await this.executeOutlineCommand(sessionId);

      case 'help':
        return this.executeHelpCommand();

      case 'provider':
        return await this.executeProviderCommand(sessionId, command.args);

      case 'model':
        return await this.executeModelCommand(sessionId, command.args);

      default:
        return {
          response: `Unknown command: /${command.name}. Type /help for available commands.`,
        };
    }
  }

  // /plan command - Create story outline
  private async executePlanCommand(
    sessionId: string,
    args: string[],
    apiKey?: string
  ): Promise<{ response: string; action?: string; data?: unknown }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    await this.updateStatus(sessionId, 'planning', 10, 'Analyzing project...');
    await this.addMessage(sessionId, 'progress', 'Starting story planning...', { progress: 10 });

    // Get project details
    const { data: project } = await this.supabase
      .from('ai_story_projects')
      .select('*, novel:novels(*)')
      .eq('id', session.projectId)
      .single();

    if (!project) {
      await this.updateStatus(sessionId, 'error', 0, undefined, 'Project not found');
      return { response: 'Error: Project not found' };
    }

    await this.updateStatus(sessionId, 'planning', 30, 'Generating outline...');

    // Generate outline using AI
    const outline = await this.generateOutline(project, session.config, apiKey);

    await this.updateStatus(sessionId, 'planning', 80, 'Saving outline...');

    // Save outline to database
    const { data: savedOutline, error } = await this.supabase
      .from('story_writing_outlines')
      .insert({
        user_id: this.userId,
        project_id: session.projectId,
        title: outline.title,
        synopsis: outline.synopsis,
        total_chapters: outline.totalChapters,
        arcs: outline.arcs,
        characters: outline.characters,
        world_building: outline.worldBuilding,
        themes: outline.themes,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      await this.updateStatus(sessionId, 'error', 0, undefined, error.message);
      return { response: `Error saving outline: ${error.message}` };
    }

    await this.updateStatus(sessionId, 'idle', 100, 'Planning complete');
    await this.addMessage(sessionId, 'assistant', this.formatOutline(outline));

    return {
      response: this.formatOutline(outline),
      action: 'outline_created',
      data: savedOutline,
    };
  }

  // /write command - Write next chapter
  private async executeWriteCommand(
    sessionId: string,
    args: string[],
    apiKey?: string
  ): Promise<{ response: string; action?: string; data?: unknown }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const customPrompt = args.join(' ');
    // @ts-ignore
    const useAgents = session.config.useAgents === true;

    await this.updateStatus(sessionId, 'writing', 5, 'Initializing writer...');
    await this.addMessage(sessionId, 'progress', useAgents ? 'Starting 3-Agent Workflow (Architect -> Writer -> Critic)...' : 'Starting chapter writing...', { progress: 5 });

    // Get project
    const { data: project } = await this.supabase
      .from('ai_story_projects')
      .select('*, novel:novels(*)')
      .eq('id', session.projectId)
      .single();

    if (!project) {
      await this.updateStatus(sessionId, 'error', 0, undefined, 'Project not found');
      return { response: 'Error: Project not found' };
    }

    try {
      // Create a writing job
      const { data: job } = await this.supabase
        .from('ai_writing_jobs')
        .insert({
          project_id: session.projectId,
          user_id: this.userId,
          status: 'running',
          progress: 0,
          step_message: 'Initializing...',
        })
        .select()
        .single();

      if (!job) throw new Error('Failed to create writing job');

      // --- NEW AGENT WORKFLOW ---
      if (useAgents) {
        // Initialize Dopamine Optimizer
        const optimizer = createDopamineOptimizer(this.aiProvider, project.id);
        
        // Pass API Key if available
        const effectiveKey = apiKey || this.aiProvider.getApiKey(session.config.provider);
        if (effectiveKey) this.aiProvider.setApiKey(session.config.provider, effectiveKey);

        const nextChapter = project.current_chapter + 1;
        
        // Step 1: Architect
        await this.updateStatus(sessionId, 'writing', 20, 'Architect is planning...');
        await this.addMessage(sessionId, 'progress', 'Architect Agent: Creating blueprint...', { progress: 20 });

        // Get context summary (simplified for now)
        const prevSummary = `Chapter ${project.current_chapter} ended.`; // TODO: Fetch real summary

        const result = await optimizer.orchestrator.writeChapter(
          nextChapter,
          prevSummary,
          customPrompt
        );

        if (!result.success) {
          throw new Error(result.error || 'Agent workflow failed');
        }

        // Output Critic Report
        if (result.criticReport) {
           const score = result.criticReport.overallScore;
           const badge = score >= 80 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Improvement';
           const criticMsg = `Critic Report:
- Overall Score: ${score}/100 (${badge})
- Dopamine: ${result.criticReport.dopamineScore}/100
- Pacing: ${result.criticReport.pacingScore}/100
- Suggestions: ${result.criticReport.suggestions.join(', ')}`;
           
           await this.addMessage(sessionId, 'system', criticMsg);
        }

        // Save content using classic flow methods (reusing save logic for now)
        // In a real implementation, we should move saving logic to a shared service
        // For now, we update status and return content
        await this.updateStatus(sessionId, 'idle', 100, 'Chapter written successfully');

        const responseText = `Successfully wrote Chapter ${nextChapter}\n\n${result.content}`;
        await this.addMessage(sessionId, 'assistant', responseText, {
          chapterNumber: nextChapter,
          wordCount: result.content?.split(/\s+/).length || 0,
        });

        return {
          response: responseText,
          action: 'chapter_written',
          data: {
            title: `Chapter ${nextChapter}`,
            wordCount: result.content?.split(/\s+/).length || 0,
            content: result.content
          },
        };

      } else {
        // --- CLASSIC FLOW ---
        const writer = new AIStoryWriter(project, job.id, this.supabase);

        await this.updateStatus(sessionId, 'writing', 20, 'Getting story context...');
        await this.addMessage(sessionId, 'progress', 'Analyzing story context...', { progress: 20 });

        const result = await writer.writeNextChapter();

        if (result) {
          await this.updateStatus(sessionId, 'idle', 100, 'Chapter written successfully');

          const responseText = `Successfully wrote Chapter ${project.current_chapter + 1}: ${result.title}\n\nWord count: ${result.wordCount}\n\nSummary: ${result.summary}`;

          await this.addMessage(sessionId, 'assistant', responseText, {
            chapterNumber: project.current_chapter + 1,
            wordCount: result.wordCount,
          });

          return {
            response: responseText,
            action: 'chapter_written',
            data: result,
          };
        } else {
          throw new Error('Writing failed - no result returned');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateStatus(sessionId, 'error', 0, undefined, errorMessage);
      await this.addMessage(sessionId, 'system', `Error: ${errorMessage}`, { error: errorMessage });
      return { response: `Error writing chapter: ${errorMessage}` };
    }
  }

  // /batch command - Write multiple chapters
  private async executeBatchCommand(
    sessionId: string,
    args: string[],
    apiKey?: string
  ): Promise<{ response: string; action?: string; data?: unknown }> {
    const count = parseInt(args[0]) || 5;
    const maxCount = Math.min(count, 20);

    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    await this.addMessage(sessionId, 'assistant', `Starting batch writing of ${maxCount} chapters...`);

    const results: Array<{ chapter: number; title: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < maxCount; i++) {
      await this.updateStatus(sessionId, 'writing', Math.round(((i + 1) / maxCount) * 100), `Writing chapter ${i + 1}/${maxCount}...`);
      await this.addMessage(sessionId, 'progress', `Writing chapter ${i + 1} of ${maxCount}...`, { progress: Math.round(((i + 1) / maxCount) * 100) });

      try {
        const result = await this.executeWriteCommand(sessionId, [], apiKey);

        if (result.action === 'chapter_written' && result.data) {
          const data = result.data as { title: string };
          results.push({
            chapter: i + 1,
            title: data.title,
            success: true,
          });
        } else {
          results.push({
            chapter: i + 1,
            title: '',
            success: false,
            error: 'Unknown error',
          });
          break;
        }
      } catch (error) {
        results.push({
          chapter: i + 1,
          title: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        break;
      }
    }

    await this.updateStatus(sessionId, 'idle', 100, 'Batch writing complete');

    const summary = results.map(r =>
      r.success
        ? `- Chapter ${r.chapter}: ${r.title}`
        : `- Chapter ${r.chapter}: FAILED - ${r.error}`
    ).join('\n');

    const responseText = `Batch writing complete!\n\nResults:\n${summary}\n\nTotal: ${results.filter(r => r.success).length}/${maxCount} chapters written successfully.`;
    await this.addMessage(sessionId, 'assistant', responseText);

    return {
      response: responseText,
      action: 'batch_complete',
      data: results,
    };
  }

  // /status command - Show current status
  private async executeStatusCommand(sessionId: string): Promise<{ response: string }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const { data: project } = await this.supabase
      .from('ai_story_projects')
      .select('*, novel:novels(*)')
      .eq('id', session.projectId)
      .single();

    if (!project) {
      return { response: 'Project not found' };
    }

    // @ts-ignore
    const useAgents = session.config.useAgents === true;

    const status = `
Project Status
==============
Novel: ${project.novel?.title || 'Untitled'}
Genre: ${project.genre}
Current Chapter: ${project.current_chapter}
Target Chapters: ${project.total_planned_chapters}
Main Character: ${project.main_character}

Session Status
==============
Status: ${session.status}
Progress: ${session.progress}%
Provider: ${session.config.provider}
Model: ${session.config.model}
Agent Mode: ${useAgents ? 'ON (Architect-Writer-Critic)' : 'OFF (Standard)'}
Messages: ${session.messages.length}
    `.trim();

    await this.addMessage(sessionId, 'assistant', status);
    return { response: status };
  }

  // /context command - Show story context
  private async executeContextCommand(sessionId: string): Promise<{ response: string }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Get recent chapters
    const { data: project } = await this.supabase
      .from('ai_story_projects')
      .select('*, novel:novels(*)')
      .eq('id', session.projectId)
      .single();

    if (!project) {
      return { response: 'Project not found' };
    }

    const { data: recentChapters } = await this.supabase
      .from('chapters')
      .select('chapter_number, title, content')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: false })
      .limit(3);

    const { data: storyNodes } = await this.supabase
      .from('story_graph_nodes')
      .select('*')
      .eq('project_id', session.projectId)
      .order('chapter_number', { ascending: false })
      .limit(3);

    let contextText = 'Story Context\n=============\n\n';

    if (recentChapters && recentChapters.length > 0) {
      contextText += 'Recent Chapters:\n';
      for (const ch of recentChapters.reverse()) {
        contextText += `- Chapter ${ch.chapter_number}: ${ch.title}\n`;
      }
      contextText += '\n';
    }

    if (storyNodes && storyNodes.length > 0) {
      contextText += 'Story Graph Summaries:\n';
      for (const node of storyNodes.reverse()) {
        contextText += `- Chapter ${node.chapter_number}: ${node.summary}\n`;
      }
    }

    await this.addMessage(sessionId, 'assistant', contextText);
    return { response: contextText };
  }

  // /outline command - Show current outline
  private async executeOutlineCommand(sessionId: string): Promise<{ response: string }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const { data: outline } = await this.supabase
      .from('story_writing_outlines')
      .select('*')
      .eq('project_id', session.projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!outline) {
      return { response: 'No outline found. Use /plan to create one.' };
    }

    const formattedOutline = this.formatOutline({
      id: outline.id,
      projectId: outline.project_id,
      title: outline.title,
      synopsis: outline.synopsis,
      totalChapters: outline.total_chapters,
      arcs: outline.arcs as PlanningArc[],
      characters: outline.characters as PlanningCharacter[],
      worldBuilding: outline.world_building,
      themes: outline.themes,
      createdAt: new Date(outline.created_at),
    });

    await this.addMessage(sessionId, 'assistant', formattedOutline);
    return { response: formattedOutline };
  }

  // /help command
  private executeHelpCommand(): { response: string } {
    const helpText = `
Available Commands
==================

/plan [instructions]    - Create a story outline with arcs and characters
/write [instructions]   - Write the next chapter
/batch <count>         - Write multiple chapters (max 20)
/status                - Show project and session status
/context               - Show recent story context
/outline               - Show current story outline
/provider <name>       - Switch AI provider (deepseek, openrouter, openai, claude)
/model <name>          - Switch AI model
/help                  - Show this help message

Tips
====
- Check "Agent Settings" to enable High Quality Mode (3-Agent Workflow).
- Add instructions after /write to guide the chapter content
- Use /context before writing to review story state
    `.trim();

    return { response: helpText };
  }

  // /provider command - Switch provider
  private async executeProviderCommand(
    sessionId: string,
    args: string[]
  ): Promise<{ response: string }> {
    const providerName = args[0]?.toLowerCase() as AIProviderType;

    if (!providerName || !AI_PROVIDERS[providerName]) {
      const providers = Object.keys(AI_PROVIDERS).join(', ');
      return { response: `Invalid provider. Available: ${providers}` };
    }

    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const newConfig = {
      ...session.config,
      provider: providerName,
      model: AI_PROVIDERS[providerName].defaultModel,
    };

    await this.supabase
      .from('story_writing_sessions')
      .update({ config: newConfig })
      .eq('id', sessionId);

    const response = `Switched to ${AI_PROVIDERS[providerName].name}. Default model: ${AI_PROVIDERS[providerName].defaultModel}`;
    await this.addMessage(sessionId, 'assistant', response);
    return { response };
  }

  // /model command - Switch model
  private async executeModelCommand(
    sessionId: string,
    args: string[]
  ): Promise<{ response: string }> {
    const modelName = args.join(' ');

    if (!modelName) {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const models = AI_PROVIDERS[session.config.provider].models;
      const modelList = models.map(m => `- ${m.id}: ${m.name}`).join('\n');
      return { response: `Available models for ${session.config.provider}:\n${modelList}` };
    }

    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const newConfig = {
      ...session.config,
      model: modelName,
    };

    await this.supabase
      .from('story_writing_sessions')
      .update({ config: newConfig })
      .eq('id', sessionId);

    const response = `Model changed to: ${modelName}`;
    await this.addMessage(sessionId, 'assistant', response);
    return { response };
  }

  // Generate chat response for non-command messages
  private async generateChatResponse(
    sessionId: string,
    input: string,
    apiKey?: string
  ): Promise<{ response: string }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const { data: project } = await this.supabase
      .from('ai_story_projects')
      .select('*, novel:novels(*)')
      .eq('id', session.projectId)
      .single();

    const systemPrompt = `You are a helpful AI writing assistant for the story "${project?.novel?.title || 'Untitled'}".
You help with planning, writing, and improving the story.
The story is in Vietnamese, genre: ${project?.genre || 'unknown'}.
Main character: ${project?.main_character || 'unknown'}.

Available commands the user can use:
- /plan - Create story outline
- /write - Write next chapter
- /batch <count> - Write multiple chapters
- /status - Show status
- /context - Show story context
- /help - Show help

Answer questions about the story, provide suggestions, and help with creative decisions.`;

    // Build message history
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...session.messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .slice(-10)
        .map(m => ({
          role: m.type as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const result = await this.aiProvider.chat({
      provider: session.config.provider,
      model: session.config.model,
      messages,
      temperature: session.config.temperature,
      maxTokens: 2000,
      apiKey,
    });

    if (result.success && result.content) {
      await this.addMessage(sessionId, 'assistant', result.content);
      return { response: result.content };
    } else {
      const errorMsg = result.error || 'Failed to generate response';
      await this.addMessage(sessionId, 'system', `Error: ${errorMsg}`, { error: errorMsg });
      return { response: `Error: ${errorMsg}` };
    }
  }

  // Generate story outline using AI
  private async generateOutline(
    project: AIStoryProject,
    config: SessionConfig,
    apiKey?: string
  ): Promise<PlanningOutline> {
    const genreConfig = GENRE_CONFIG[project.genre as GenreKey];

    const prompt = `Create a detailed story outline for the following project:

Title: ${project.novel?.title || 'Untitled'}
Genre: ${genreConfig?.name || project.genre}
Main Character: ${project.main_character}
World Description: ${project.world_description || 'Not specified'}
Total Planned Chapters: ${project.total_planned_chapters}

Please provide:
1. A compelling synopsis (2-3 paragraphs)
2. 3-5 major story arcs with:
   - Arc name
   - Description
   - Start and end chapters
   - 3-5 key events per arc
3. 4-6 main characters with:
   - Name
   - Role (protagonist, antagonist, supporting)
   - Description
   - Goals
   - Character arc
4. Key themes (3-5 themes)
5. World-building notes

Format your response as JSON with this structure:
{
  "synopsis": "...",
  "arcs": [{"name": "...", "description": "...", "startChapter": 1, "endChapter": 20, "keyEvents": ["...", "..."]}],
  "characters": [{"name": "...", "role": "protagonist", "description": "...", "goals": ["..."], "arc": "..."}],
  "themes": ["..."],
  "worldBuilding": "..."
}`;

    const result = await this.aiProvider.chat({
      provider: config.provider,
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a professional story planner. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 4000,
      apiKey,
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Failed to generate outline');
    }

    // Parse JSON from response
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: crypto.randomUUID(),
        projectId: project.id,
        title: project.novel?.title || 'Untitled',
        synopsis: parsed.synopsis || '',
        totalChapters: project.total_planned_chapters,
        arcs: (parsed.arcs || []).map((arc: PlanningArc, index: number) => ({
          id: crypto.randomUUID(),
          name: arc.name,
          description: arc.description,
          startChapter: arc.startChapter || index * 20 + 1,
          endChapter: arc.endChapter || (index + 1) * 20,
          keyEvents: arc.keyEvents || [],
          tensionCurve: 'rising' as const,
        })),
        characters: (parsed.characters || []).map((char: PlanningCharacter) => ({
          id: crypto.randomUUID(),
          name: char.name,
          role: char.role || 'supporting',
          description: char.description || '',
          goals: char.goals || [],
          arc: char.arc || '',
        })),
        worldBuilding: parsed.worldBuilding || '',
        themes: parsed.themes || [],
        createdAt: new Date(),
      };
    } catch (parseError) {
      console.error('Failed to parse outline JSON:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  // Format outline for display
  private formatOutline(outline: PlanningOutline): string {
    let text = `
Story Outline: ${outline.title}
${'='.repeat(40)}

Synopsis
--------
${outline.synopsis}

Story Arcs (${outline.arcs.length})
----------`;

    for (const arc of outline.arcs) {
      text += `
${arc.name} (Ch. ${arc.startChapter}-${arc.endChapter})
${arc.description}
Key Events:
${arc.keyEvents.map(e => `  - ${e}`).join('\n')}
`;
    }

    text += `
Main Characters (${outline.characters.length})
---------------`;

    for (const char of outline.characters) {
      text += `
${char.name} (${char.role})
${char.description}
Goals: ${char.goals.join(', ')}
Arc: ${char.arc}
`;
    }

    text += `
Themes
------
${outline.themes.map(t => `- ${t}`).join('\n')}

World Building
--------------
${outline.worldBuilding}
`;

    return text.trim();
  }

  // Helper to map database row to WritingSession
  private mapToWritingSession(data: Record<string, unknown>): WritingSession {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      status: data.status as SessionStatus,
      messages: (data.messages as SessionMessage[]) || [],
      currentStep: data.current_step as string | undefined,
      progress: (data.progress as number) || 0,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      config: data.config as {
        provider: AIProviderType;
        model: string;
        temperature: number;
        targetWordCount: number;
        useAgents?: boolean;
      },
    };
  }
}
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AIStoryProject,
  StoryGraphNode,
  StoryContext,
  ChapterResult,
  KeyEvent,
  CharacterState,
  PlotThread,
  WritingStep
} from '@/lib/types/ai-writer';
import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';
import { PlotArcManager } from './plot-arc-manager';

// Get Supabase config from environment variables
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { url, serviceRoleKey };
};

export class AIStoryWriter {
  private project: AIStoryProject;
  private jobId: string;
  private supabaseServiceRoleClient: SupabaseClient | null = null;
  private externalClient: SupabaseClient | null = null;
  private plotArcManager: PlotArcManager;

  constructor(project: AIStoryProject, jobId: string, client?: SupabaseClient) {
    this.project = project;
    this.jobId = jobId;
    this.externalClient = client || null;
    this.plotArcManager = new PlotArcManager(project.id, client);
  }

  private async getClient(): Promise<SupabaseClient> {
    if (this.externalClient) {
      return this.externalClient;
    }
    if (this.supabaseServiceRoleClient) {
      return this.supabaseServiceRoleClient;
    }

    const { url, serviceRoleKey } = getSupabaseConfig();
    this.supabaseServiceRoleClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return this.supabaseServiceRoleClient;
  }

  async writeNextChapter(): Promise<ChapterResult | null> {
    try {
      await this.updateProgress('running', 'initializing', 5, 'Kiểm tra và đồng bộ dự án...');
      await this.syncProjectWithActualChapters();
      await this.checkIfStopped();

      await this.updateProgress('running', 'analyzing', 10, 'Phân tích bối cảnh truyện...');
      const context = await this.getStoryContext();
      await this.checkIfStopped();

      await this.updateProgress('running', 'generating_prompt', 25, 'Tạo prompt tự động...');
      const prompt = await this.generatePrompt(context);
      await this.checkIfStopped();

      await this.updateProgress('running', 'writing', 40, 'AI đang viết chương...');
      const rawContent = await this.callAI(prompt);
      await this.checkIfStopped();

      await this.updateProgress('running', 'refining', 65, 'Kiểm tra và cải thiện nội dung...');
      const refinedContent = await this.refineContent(rawContent);
      await this.checkIfStopped();

      // Ghi ảnh chụp bố cục sau refine
      const compFinal = this.estimateComposition(refinedContent);
      await this.updateProgress(
        'running',
        'refining',
        70,
        `Bố cục: ĐT ${compFinal.dialogue}% | MT ${compFinal.description}% | NT ${compFinal.inner}%`
      );

      await this.updateProgress('running', 'updating_graph', 80, 'Cập nhật Story Graph...');
      const analysis = await this.analyzeChapterContent(refinedContent);
      await this.checkIfStopped();

      await this.updateProgress('running', 'saving', 90, 'Lưu chương vào database...');
      const result = await this.saveChapter(refinedContent, analysis);

      // Post-save: Track arcs, twists, character development
      await this.postSaveTracking(analysis);

      // Send notification to users who bookmarked this novel
      await this.sendChapterNotification(result.chapterId, analysis.title);

      await this.updateProgress('completed', 'completed', 100, 'Hoàn thành!', null, result.chapterId);
      return result.chapterResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      console.error(`[Job ${this.jobId}] CRITICAL FAILURE in writeNextChapter:`, error);
      if (errorMessage === 'Job stopped by user.') {
        console.log(`[Job ${this.jobId}] Process stopped gracefully.`);
        return null;
      }
      await this.updateProgress('failed', 'failed', 0, 'Có lỗi xảy ra', errorMessage);
      throw error;
    }
  }

  private async sendChapterNotification(chapterId: string, chapterTitle: string): Promise<void> {
    const supabase = await this.getClient();
    const nextChapter = this.project.current_chapter + 1;

    await supabase.functions.invoke('notify-new-chapter', {
      body: {
        novelId: this.project.novel_id,
        chapterId,
        chapterNumber: nextChapter,
        chapterTitle,
      }
    });
  }

  /**
   * Post-save tracking: Character arcs, twists, arc completion
   */
  private async postSaveTracking(analysis: {
    characterStates: CharacterState[];
  }): Promise<void> {
    const chapterNumber = this.project.current_chapter + 1;

    try {
      // 1. Track character milestones if power level changed significantly
      const mainCharState = analysis.characterStates.find(
        (cs) => cs.name.toLowerCase().includes(this.project.main_character.toLowerCase())
      );
      if (mainCharState) {
        // Ensure character arc exists
        await this.plotArcManager.ensureCharacterArcExists(
          this.project.main_character,
          'Starting out', // Can be improved with project metadata
          'Peak of power' // Can be improved with project metadata
        );

        // Add milestone every 5 chapters or on major cultivation/magic level change
        if (
          chapterNumber % 5 === 0 ||
          mainCharState.cultivation_level ||
          mainCharState.magic_level
        ) {
          const powerLevel = mainCharState.cultivation_level || mainCharState.magic_level || '';
          const milestone = `Chương ${chapterNumber}: ${mainCharState.emotional_state}${
            powerLevel ? `, ${powerLevel}` : ''
          }`;
          await this.plotArcManager.addCharacterMilestone(
            this.project.main_character,
            chapterNumber,
            milestone,
            mainCharState.emotional_state
          );
        }
      }

      // 2. Check for twists revealed
      const upcomingTwists = await this.plotArcManager.getUpcomingTwists(chapterNumber);
      for (const twist of upcomingTwists) {
        if (twist.target_chapter === chapterNumber && twist.status !== 'revealed') {
          await this.plotArcManager.markTwistRevealed(twist.id, chapterNumber);
          console.log(`[PlotArcManager] Twist "${twist.twist_type}" revealed at chapter ${chapterNumber}`);
        }
      }

      // 3. Check if arc completed (every 10 chapters)
      if (chapterNumber % 10 === 0) {
        const currentArc = await this.plotArcManager.getCurrentArc(chapterNumber);
        if (currentArc && currentArc.end_chapter === chapterNumber) {
          // Mark arc as completed
          const supabase = await this.getClient();
          await supabase
            .from('plot_arcs')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', currentArc.id);

          // Generate hierarchical summary
          await this.plotArcManager.generateArcSummary(currentArc.id);
          console.log(`[PlotArcManager] Arc ${currentArc.arc_number} completed at chapter ${chapterNumber}`);
        }
      }
    } catch (error) {
      console.error('[AIStoryWriter] Error in postSaveTracking:', error);
      // Don't throw - this is non-critical
    }
  }

  private async checkIfStopped(): Promise<void> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from('ai_writing_jobs')
      .select('status')
      .eq('id', this.jobId)
      .single();
    
    if (data?.status === 'stopped') {
      throw new Error('Job stopped by user.');
    }
  }

  private async updateProgress(status: string, step: WritingStep, progress: number, message: string, error?: string | null, chapterId?: string | null) {
    const supabase = await this.getClient();
    await supabase
      .from('ai_writing_jobs')
      .update({
        status,
        progress,
        step_message: message,
        error_message: error,
        result_chapter_id: chapterId,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.jobId);
  }

  private async syncProjectWithActualChapters(): Promise<void> {
    const supabase = await this.getClient();
    const { data: actualChapters } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('novel_id', this.project.novel_id)
      .order('chapter_number', { ascending: false })
      .limit(1);
    const actualMaxChapter = actualChapters?.[0]?.chapter_number || 0;
    if (this.project.current_chapter !== actualMaxChapter) {
      await supabase
        .from('ai_story_projects')
        .update({ current_chapter: actualMaxChapter, updated_at: new Date().toISOString() })
        .eq('id', this.project.id);
      this.project.current_chapter = actualMaxChapter;
    }
  }

  private async getStoryContext(): Promise<StoryContext> {
    const supabase = await this.getClient();
    const nextChapter = this.project.current_chapter + 1;

    // OPTIMIZATION: Use hierarchical summaries for older arcs to save tokens
    let recentNodes: StoryGraphNode[] = [];

    if (nextChapter > 10) {
      // Get arc summaries from previous completed arcs (save tokens!)
      const arcSummaries = await this.plotArcManager.getRelevantArcSummaries(nextChapter, 2);

      // Convert arc summaries to pseudo-nodes for backward compatibility
      const arcNodes: StoryGraphNode[] = arcSummaries.map((arcSummary) => ({
        id: arcSummary.id,
        project_id: arcSummary.project_id,
        chapter_number: arcSummary.start_chapter,
        chapter_title: `Arc ${arcSummary.level_number} Summary`,
        summary: arcSummary.summary,
        key_events: arcSummary.key_events,
        character_states: [],
        plot_threads: [],
        created_at: arcSummary.created_at,
      }));

      // Get only 3 most recent chapters (instead of 5) since we have arc summaries
      const { data: recentChapterNodes } = await supabase
        .from('story_graph_nodes')
        .select('*')
        .eq('project_id', this.project.id)
        .order('chapter_number', { ascending: false })
        .limit(3);

      recentNodes = [...(recentChapterNodes || []), ...arcNodes];
    } else {
      // For early chapters (<= 10), just get recent nodes as before
      const { data } = await supabase
        .from('story_graph_nodes')
        .select('*')
        .eq('project_id', this.project.id)
        .order('chapter_number', { ascending: false })
        .limit(5);
      recentNodes = data || [];
    }

    const openThreads = await this.getOpenPlotThreads();
    const characterStates = await this.getCurrentCharacterStates();

    return {
      recentChapters: recentNodes,
      openPlotThreads: openThreads,
      characterStates,
      worldState: {},
    };
  }

  private async getOpenPlotThreads(): Promise<PlotThread[]> {
    const supabase = await this.getClient();
    const { data: latestNode } = await supabase
      .from('story_graph_nodes')
      .select('plot_threads')
      .eq('project_id', this.project.id)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .single();
    if (latestNode?.plot_threads) {
      return (latestNode.plot_threads as PlotThread[]).filter((thread) =>
        thread.status === 'open' || thread.status === 'developing'
      );
    }
    return [];
  }

  private async getCurrentCharacterStates(): Promise<CharacterState[]> {
    const supabase = await this.getClient();
    const { data: latestNode } = await supabase
      .from('story_graph_nodes')
      .select('character_states')
      .eq('project_id', this.project.id)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .single();
    if (latestNode?.character_states) {
      return latestNode.character_states as CharacterState[];
    }
    return [{
      name: this.project.main_character,
      cultivation_level: this.project.genre === 'tien-hiep' ? 'Khởi điểm' : undefined,
      health_status: 'healthy',
      emotional_state: 'determined',
      relationships: {},
      abilities: []
    }];
  }

  private async generatePrompt(context: StoryContext): Promise<string> {
    const supabase = await this.getClient();
    const category = GENRE_CONFIG[this.project.genre as GenreKey]?.aiPromptCategory || 'cultivation';
    const { data: template } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('category', category)
      .eq('is_default', true)
      .single();

    const nextChapterNum = this.project.current_chapter + 1;

    const earlyChapterGuidance = nextChapterNum <= 3
      ? "\n\nQUY TẮC CHƯƠNG ĐẦU: Trong 3 chương đầu, hãy để nhân vật chính chủ động (qua hành động/hội thoại) giới thiệu bối cảnh, luật lệ, hệ thống sức mạnh để người đọc nắm rõ, ngắn gọn, tự nhiên (tránh info dump)."
      : "";

    const progressionGuidance = (() => {
      if (this.project.genre === 'tien-hiep') {
        if (this.project.cultivation_system && this.project.cultivation_system.trim().length > 0) {
          return `\n\nHỆ SỨC MẠNH: Sử dụng hệ tu luyện đã chỉ định: ${this.project.cultivation_system}. Bảo đảm tiến bậc rõ ràng, mỗi lần 'đột phá' phải gắn với mốc cốt truyện.`;
        }
        return "\n\nHỆ SỨC MẠNH: Tự thiết kế hệ tu luyện độc đáo phù hợp thế giới; tránh dùng các tên rập khuôn như 'Luyện Khí/Trúc Cơ/Kim Đan/...'. Chỉ cần bảo đảm tiến bậc và mạnh lên dần rõ ràng.";
      }
      return "\n\nHỆ SỨC MẠNH: Bảo đảm có tiến bậc tăng trưởng sức mạnh rõ ràng qua thời gian (level up).";
    })();

    const composition = (GENRE_CONFIG[this.project.genre as GenreKey] as any)?.compositionTargets || {
      dialogue: [35, 50],
      description: [35, 50],
      inner: [10, 20],
    };
    const compositionHint =
      `\n\nMỤC TIÊU BỐ CỤC: Đối thoại ${composition.dialogue[0]}–${composition.dialogue[1]}%, ` +
      `Miêu tả ${composition.description[0]}–${composition.description[1]}%, ` +
      `Nội tâm ${composition.inner[0]}–${composition.inner[1]}%.`;

    // Series Bible + Context Pack
    const bible = await this.buildSeriesBible(context.characterStates);
    const pack = await this.buildContextPack(context);
    const prefix = [
      `SERIES BIBLE (CỰC CÔ ĐỌNG – DÙNG ĐỂ GIỮ NHẤT QUÁN):`,
      bible,
      ``,
      `CONTEXT PACK (DÙNG PHẦN LIÊN QUAN, KHÔNG KỂ LẠI DÀI DÒNG):`,
      pack,
      ``,
      `YÊU CẦU BẮT BUỘC:`,
      `- Dùng ĐÚNG tên theo name map.`,
      `- Không dùng tên địa danh/tổ chức/người có thật (thế giới song song).`,
      `- Viết VĂN BẢN THUẦN (không Markdown).`
    ].join('\n');

    let prompt = '';
    if (template) {
      prompt = template.template;
      const replacements: Record<string, string> = {
        CHAPTER_NUMBER: String(nextChapterNum),
        NOVEL_TITLE: this.project.novel?.title || 'Truyện chưa có tên',
        RECENT_CONTEXT: this.formatRecentContext(context.recentChapters),
        MAIN_CHARACTER: this.project.main_character,
        WORLD_DESCRIPTION: this.project.world_description || 'Thế giới truyện',
        PLOT_OBJECTIVES: await this.generatePlotObjectives(context),
        TARGET_LENGTH: String(this.project.target_chapter_length),
      };
      switch (this.project.genre) {
        case 'tien-hiep': replacements['CULTIVATION_SYSTEM'] = this.project.cultivation_system || 'Hệ thống tu luyện (tự thiết kế, tránh rập khuôn)'; break;
        case 'huyen-huyen': replacements['MAGIC_SYSTEM'] = this.project.magic_system || 'Hệ thống phép thuật phù hợp thế giới'; break;
        case 'do-thi': replacements['MODERN_SETTING'] = this.project.modern_setting || 'Bối cảnh đô thị'; break;
        case 'khoa-huyen': replacements['TECH_LEVEL'] = this.project.tech_level || 'Cấp độ công nghệ'; break;
        case 'lich-su': replacements['HISTORICAL_PERIOD'] = this.project.historical_period || 'Thời kỳ lịch sử'; break;
        case 'dong-nhan': replacements['ORIGINAL_WORK'] = this.project.original_work || 'Tác phẩm gốc (tham chiếu)'; break;
        case 'vong-du': replacements['GAME_SYSTEM'] = this.project.game_system || 'Hệ thống game'; break;
      }
      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        prompt = prompt.replace(regex, value);
      });
      prompt += compositionHint + earlyChapterGuidance + progressionGuidance + "\n\nĐỊNH DẠNG: Viết văn bản thuần, không Markdown.";
      prompt = `${prefix}\n\n${prompt}`;
    } else {
      prompt = this.generateFallbackPrompt(context, nextChapterNum, earlyChapterGuidance, progressionGuidance) + compositionHint;
      prompt = `${prefix}\n\n${prompt}`;
    }
    return prompt;
  }

  private generateFallbackPrompt(context: StoryContext, chapterNumber: number, earlyChapterGuidance: string, progressionGuidance: string): string {
    const recentContext = this.formatRecentContext(context.recentChapters);
    const genreConfig = GENRE_CONFIG[this.project.genre as GenreKey] || GENRE_CONFIG['tien-hiep'];
    return `Hãy viết chương ${chapterNumber} của truyện "${this.project.novel?.title || 'Truyện chưa có tên'}" với các yêu cầu sau:

- Thể loại: ${genreConfig.name}
- Nhân vật chính: ${this.project.main_character}
- Bối cảnh: ${this.project.world_description || 'Thế giới truyện'}
- Độ dài: khoảng ${this.project.target_chapter_length} từ
- Phong cách: webnovel hiện đại, nhiều hội thoại, miêu tả sinh động.
${progressionGuidance}
${earlyChapterGuidance}

Bối cảnh các chương trước:
${recentContext}

Cấu trúc:
1) Tiêu đề chương (ví dụ: "Chương ${chapterNumber}: [Tên chương]")
2) Nội dung chương (ưu tiên show, hạn chế info dump)

MỤC TIÊU BỐ CỤC: Giữ tỉ lệ đối thoại/miêu tả/nội tâm theo thể loại; nếu lệch, hãy tự điều chỉnh.

ĐỊNH DẠNG: Chỉ viết văn bản thuần túy, KHÔNG sử dụng Markdown.`;
  }

  private formatRecentContext(recentChapters: StoryGraphNode[]): string {
    if (recentChapters.length === 0) return 'Đây là chương đầu tiên của truyện.';
    return recentChapters.reverse().map((chapter) => `- Chương ${chapter.chapter_number}: ${chapter.summary}`).join('\n');
  }

  private async generatePlotObjectives(context: StoryContext): Promise<string> {
    const chapterNumber = this.project.current_chapter + 1;

    // Ensure arc exists and get intelligent plot objectives from PlotArcManager
    try {
      await this.plotArcManager.ensureArcExists(chapterNumber);
      const intelligentObjectives = await this.plotArcManager.generatePlotObjectives(chapterNumber);

      // Add open plot threads if any
      let objectives = intelligentObjectives;
      if (context.openPlotThreads.length > 0) {
        const highPriorityThreads = context.openPlotThreads
          .filter((thread) => thread.priority === 'high')
          .slice(0, 2);
        if (highPriorityThreads.length > 0) {
          objectives += '\n- Threads quan trọng cần giải quyết:\n';
          objectives += highPriorityThreads.map((thread) => `  + ${thread.description}`).join('\n');
        }
      }

      return objectives;
    } catch (error) {
      console.error('[AIStoryWriter] Error generating plot objectives from PlotArcManager:', error);
      // Fallback to simple objectives
      return this.generateSimplePlotObjectives(chapterNumber);
    }
  }

  private generateSimplePlotObjectives(chapterNumber: number): string {
    switch (this.project.genre) {
      case 'tien-hiep':
        return chapterNumber <= 5
          ? '- Giới thiệu thế giới tu luyện\n- Tạo xung đột ban đầu\n- Thiết lập mục tiêu tu luyện'
          : chapterNumber <= 20
          ? '- Phát triển kỹ năng tu luyện\n- Gặp gỡ nhân vật phụ quan trọng\n- Vượt qua thử thách'
          : '- Đột phá (cảnh giới/hệ) phù hợp hệ đã chọn\n- Giải quyết xung đột chính\n- Tiết lộ bí mật tu luyện';
      case 'do-thi':
        return chapterNumber <= 5
          ? '- Giới thiệu bối cảnh đô thị\n- Thiết lập mối quan hệ xã hội\n- Xung đột nghề nghiệp'
          : chapterNumber <= 20
          ? '- Phát triển sự nghiệp\n- Xử lý các mối quan hệ phức tạp\n- Thử thách xã hội'
          : '- Đạt thành tựu lớn\n- Giải quyết xung đột chính\n- Định hình lại cuộc sống';
      case 'lich-su':
        return chapterNumber <= 5
          ? '- Giới thiệu thời kỳ lịch sử\n- Thiết lập bối cảnh chính trị\n- Giới thiệu nhân vật lịch sử'
          : chapterNumber <= 20
          ? '- Tham gia sự kiện lịch sử\n- Xây dựng quan hệ nhân vật\n- Thách thức lịch sử'
          : '- Ảnh hưởng dòng chảy lịch sử\n- Giải quyết xung đột chính\n- Để lại di sản';
      default:
        return chapterNumber <= 5
          ? '- Giới thiệu thế giới\n- Tạo xung đột ban đầu\n- Thiết lập mục tiêu'
          : chapterNumber <= 20
          ? '- Phát triển cốt truyện\n- Giới thiệu nhân vật phụ quan trọng\n- Tạo thử thách mới'
          : '- Đẩy cao xung đột chính\n- Phát triển quan hệ nhân vật\n- Tiết lộ bí mật quan trọng';
    }
  }

  private cleanMarkdown(text: string): string {
    return text
      .replace(/^(#+)\s*(.*)$/gm, '$2')
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .split('\n')
      .map(line => line.trim())
      .filter((line, index, arr) => line !== '' || (arr[index - 1] && arr[index - 1] !== ''))
      .join('\n')
      .trim();
  }

  // Add retry/backoff around Supabase Edge Function invocation
  private async callAI(prompt: string): Promise<string> {
    const supabase = await this.getClient();

    const maxAttempts = 3;
    const baseDelayMs = 800;

    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('openrouter-chat', {
          body: {
            model: this.project.ai_model,
            temperature: this.project.temperature,
            max_tokens: 8000,
            messages: [
              { role: "system", content: await this.getSystemPromptForGenre() },
              { role: "user", content: prompt }
            ]
          }
        });

        if (error) {
          throw new Error(error.message || 'Edge invoke error');
        }

        const d: any = data;
        if (d && d.success === false) {
          throw new Error(d.error || 'OpenRouter invocation error');
        }

        const content = d?.choices?.[0]?.message?.content as string | undefined;
        if (!content || !content.trim()) {
          throw new Error('No content generated');
        }

        return this.cleanMarkdown(content.trim());
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error('OpenRouter invocation failed');
  }

  private async getSystemPromptForGenre(): Promise<string> {
    const supabase = await this.getClient();
    let authorPersona = '';
    if (this.project.novel?.author) {
      const { data } = await supabase.from('ai_authors').select('ai_prompt_persona').eq('name', this.project.novel.author).single();
      if (data?.ai_prompt_persona) authorPersona = data.ai_prompt_persona + '\n\n';
    }
    const parallelWorldNote = "\n\nLưu ý: Bối cảnh truyện là một thế giới song song hư cấu, mọi tên riêng (nhân vật, địa danh, tổ chức) đều không có thật.";
    const markdownInstruction = "\n\nQUY TẮC ĐỊNH DẠNG: Chỉ viết văn bản thuần túy. KHÔNG sử dụng bất kỳ định dạng Markdown nào.";
    const flexibility = "\n\nTIẾN BẬC SỨC MẠNH: Bảo đảm tăng trưởng sức mạnh theo thời gian. Nếu không có hệ tu luyện cụ thể được cung cấp, tránh dùng tên cấp độ rập khuôn (ví dụ: 'Luyện Khí/Trúc Cơ/Kim Đan/...') và hãy tạo hệ đặt tên độc đáo, nhất quán.";
    let genrePrompt = '';
    switch (this.project.genre) {
      case 'tien-hiep': genrePrompt = "Bạn là tác giả webnovel tu tiên chuyên nghiệp. Văn phong sinh động, nhiều hội thoại và miêu tả chi tiết. Viết bằng tiếng Việt phong cách webnovel hiện đại."; break;
      default: genrePrompt = "Bạn là tác giả webnovel chuyên nghiệp. Văn phong sinh động, nhiều hội thoại và miêu tả chi tiết. Viết bằng tiếng Việt phong cách webnovel hiện đại.";
    }
    return authorPersona + genrePrompt + parallelWorldNote + flexibility + markdownInstruction;
  }

  private countWords(text: string): number { return text.trim().split(/\s+/).length; }
  private countDialogue(text: string): number { const matches = text.match(/["“”]|^[-–•]\s/mg); return matches ? Math.ceil(matches.length / 2) : 0; }

  private estimateComposition(text: string): { dialogue: number; inner: number; description: number } {
    const totalChars = Math.max(1, text.length);
    const dialogueBlocks = (text.match(/(^|\n)\s*(?:["“][\s\S]+?["”]|-\s+.+)/gm) || []).join('\n');
    const dialogueChars = dialogueBlocks.length;

    const innerKeywords = ['nghĩ', 'tự nhủ', 'trong lòng', 'cảm thấy', 'thầm', 'tự hỏi'];
    const innerMatches = innerKeywords
      .map(k => (text.match(new RegExp(`\\b${k}\\b`, 'gi')) || []).length)
      .reduce((a, b) => a + b, 0);
    const innerChars = Math.min(totalChars - dialogueChars, Math.floor((innerMatches / 10) * totalChars));

    const rest = Math.max(0, totalChars - dialogueChars - innerChars);
    const toPercent = (n: number) => Math.max(0, Math.min(100, Math.round((n / totalChars) * 100)));

    return {
      dialogue: toPercent(dialogueChars),
      inner: toPercent(innerChars),
      description: toPercent(rest),
    };
  }

  private withinRange(value: number, range: [number, number]): boolean {
    return value >= range[0] && value <= range[1];
  }

  private async rebalanceComposition(content: string): Promise<string> {
    const targets = (GENRE_CONFIG[this.project.genre as GenreKey] as any)?.compositionTargets || {
      dialogue: [35, 50],
      description: [35, 50],
      inner: [10, 20],
    };

    const prompt = `Nội dung sau cần được cân đối lại bố cục để đạt mục tiêu:
- Đối thoại: ${targets.dialogue[0]}–${targets.dialogue[1]}%
- Miêu tả: ${targets.description[0]}–${targets.description[1]}%
- Nội tâm: ${targets.inner[0]}–${targets.inner[1]}%

Yêu cầu:
- Giữ nguyên ý nghĩa và mạch sự kiện, KHÔNG thay đổi fact quan trọng.
- Nếu cần tăng tỉ lệ đối thoại: chuyển một phần thông tin miêu tả thành hội thoại tự nhiên.
- Nếu cần tăng nội tâm: thêm suy nghĩ hợp lý của nhân vật (ngắn gọn, đúng giọng).
- Viết tiếng Việt tự nhiên, mạch lạc, không dùng Markdown.

Nội dung:
${content}

Phiên bản đã cân đối (văn bản thuần):`;
    return await this.callAI(prompt);
  }

  private async rewriteForFluency(content: string): Promise<string> {
    const style = this.project.writing_style || 'webnovel_chinese';
    const prompt = `Hãy viết lại đoạn văn sau cho tự nhiên, trôi chảy như tác giả giỏi, giữ nguyên ý:
- Tránh câu quá dài liên tiếp; đan xen câu ngắn–dài để tạo nhịp.
- Hạn chế lặp cấu trúc câu và từ ngữ.
- Không dùng sáo rỗng; tránh "đột nhiên", "không thể tin nổi" lặp lại nhiều lần.
- Phong cách: ${style}. Viết tiếng Việt. Không dùng Markdown.

Đoạn gốc:
${content}

Phiên bản cải thiện độ mượt (văn bản thuần):`;
    return await this.callAI(prompt);
  }

  private qualityGatePass(text: string): boolean {
    const wc = this.countWords(text);
    if (wc < Math.floor(this.project.target_chapter_length * 0.8)) return false;

    const dialogueSegments = this.countDialogue(text);
    if (dialogueSegments < 3) return false;

    const targets = (GENRE_CONFIG[this.project.genre as GenreKey] as any)?.compositionTargets || {
      dialogue: [35, 50],
      description: [35, 50],
      inner: [10, 20],
    };
    const comp = this.estimateComposition(text);
    const ok =
      this.withinRange(comp.dialogue, targets.dialogue) &&
      this.withinRange(comp.description, targets.description) &&
      this.withinRange(comp.inner, targets.inner);
    return ok;
  }

  private async refineContent(content: string): Promise<string> {
    const wordCount = this.countWords(content);
    const targetLength = this.project.target_chapter_length;
    let current = content;

    if (wordCount < targetLength * 0.8) {
      current = await this.expandContent(current);
    }

    const dialogueCount = this.countDialogue(current);
    if (dialogueCount < 3) {
      current = await this.addDialogue(current);
    }

    const targets = (GENRE_CONFIG[this.project.genre as GenreKey] as any)?.compositionTargets || {
      dialogue: [35, 50],
      description: [35, 50],
      inner: [10, 20],
    };
    const comp = this.estimateComposition(current);
    const needRebalance =
      !this.withinRange(comp.dialogue, targets.dialogue) ||
      !this.withinRange(comp.description, targets.description) ||
      !this.withinRange(comp.inner, targets.inner);

    if (needRebalance) {
      current = await this.rebalanceComposition(current);
    }

    current = await this.rewriteForFluency(current);

    if (!this.qualityGatePass(current)) {
      current = await this.rebalanceComposition(current);
      current = await this.rewriteForFluency(current);
    }

    return current;
  }

  private async expandContent(content: string): Promise<string> {
    const expandPrompt = `Hãy mở rộng đoạn văn sau thành ${this.project.target_chapter_length} từ bằng cách thêm:
- Miêu tả chi tiết hơn về môi trường, cảnh vật
- Miêu tả cảm xúc và suy nghĩ của nhân vật
- Thêm chi tiết về hành động và chuyển động

Nội dung gốc:
${content}

Nội dung mở rộng (không dùng Markdown):`;
    return await this.callAI(expandPrompt);
  }

  private async addDialogue(content: string): Promise<string> {
    const dialoguePrompt = `Hãy thêm 2–3 đoạn hội thoại tự nhiên vào đoạn văn sau để làm cho nó sinh động hơn. Hội thoại phải phù hợp với bối cảnh và tính cách nhân vật:

${content}

Nội dung có thêm hội thoại (không dùng Markdown):`;
    return await this.callAI(dialoguePrompt);
  }

  private async analyzeChapterContent(content: string): Promise<{ title: string; summary: string; keyEvents: KeyEvent[]; characterStates: CharacterState[]; plotThreads: PlotThread[]; }> {
    const title = await this.generateChapterTitle(content);
    const summary = await this.generateSummary(content);
    const keyEvents: KeyEvent[] = [];
    const characterStates = await this.getCurrentCharacterStates();
    const plotThreads = await this.getOpenPlotThreads();
    return { title, summary, keyEvents, characterStates, plotThreads };
  }

  private async generateChapterTitle(content: string): Promise<string> {
    const titleMatch = content.match(/^Chương\s+\d+:\s*(.+)$/m);
    if (titleMatch) return titleMatch[1].trim();
    const titlePrompt = `Dựa vào nội dung chương sau, hãy tạo một tiêu đề ngắn gọn, hấp dẫn theo phong cách webnovel (ví dụ: "Đột phá cảnh giới", "Gặp gỡ bí ẩn", "Trận chiến sinh tử"):

${content.substring(0, 500)}...

Chỉ trả về tiêu đề, không có "Chương X:" ở đầu, không dùng Markdown:`;
    const title = await this.callAI(titlePrompt);
    return title.replace(/"/g, '').replace(/^Chương\s+\d+:\s*/, '').trim();
  }

  private async generateSummary(content: string): Promise<string> {
    const summaryPrompt = `Tóm tắt nội dung chương sau thành 2–3 câu ngắn gọn, tập trung vào sự kiện chính, không dùng Markdown:

${content}

Tóm tắt:`;
    return await this.callAI(summaryPrompt);
  }

  private async updateStoryGraph(analysis: { title: string; summary: string; keyEvents: KeyEvent[]; characterStates: CharacterState[]; plotThreads: PlotThread[]; }): Promise<void> {
    const supabase = await this.getClient();
    const nextChapter = this.project.current_chapter + 1;
    const nodeData: any = { project_id: this.project.id, chapter_number: nextChapter, chapter_title: analysis.title, summary: analysis.summary, key_events: analysis.keyEvents, character_states: analysis.characterStates, plot_threads: analysis.plotThreads };
    switch (this.project.genre) {
      case 'tien-hiep': nodeData.cultivation_level = this.extractCultivationLevel(analysis.summary); break;
      case 'huyen-huyen': nodeData.magic_level = this.extractMagicLevel(analysis.summary); break;
      case 'do-thi': nodeData.social_status = this.extractSocialStatus(analysis.summary); break;
    }
    await supabase.from('story_graph_nodes').insert(nodeData);
    if (this.project.current_chapter > 0) {
      await supabase.from('story_graph_edges').insert({ project_id: this.project.id, from_chapter: this.project.current_chapter, to_chapter: nextChapter, relationship_type: 'continues', description: 'Tiếp nối cốt truyện' });
    }
    await supabase.from('ai_story_projects').update({ current_chapter: nextChapter, updated_at: new Date().toISOString() }).eq('id', this.project.id);
  }

  private extractCultivationLevel(summary: string): string | undefined {
    const text = summary || '';
    const patterns = [
      /đột phá\s+(?:lên|tới|đến)?\s*([A-ZĐ][^.,;()\n]*)/i,
      /bước vào\s+([A-ZĐ][^.,;()\n]*)/i,
      /tấn thăng\s+(?:lên|tới|đến)?\s*([A-ZĐ][^.,;()\n]*)/i,
      /(cảnh giới|tầng|bậc|cấp)\s+([A-ZĐ][^.,;()\n]*)/i
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return (m[2] || m[1]).trim();
    }
    return undefined;
  }
  private extractMagicLevel(summary: string): string | undefined {
    const text = summary || '';
    const m = text.match(/(bậc|cấp|tầng)\s+pháp\s*(?:lực|thuật)?\s+([A-ZĐ][^.,;()\n]*)/i);
    return m ? (m[2] || '').trim() : undefined;
  }
  private extractSocialStatus(summary: string): string | undefined {
    const text = summary || '';
    const m = text.match(/(địa vị|thân phận|đẳng cấp)\s+([A-ZĐ][^.,;()\n]*)/i);
    return m ? (m[2] || '').trim() : undefined;
  }

  private async saveChapter(content: string, analysis: { title: string; summary: string; keyEvents: KeyEvent[]; characterStates: CharacterState[]; plotThreads: PlotThread[]; }): Promise<{ chapterId: string, chapterResult: ChapterResult }> {
    const supabase = await this.getClient();
    const nextChapter = this.project.current_chapter + 1;

    const { data: existing } = await supabase
      .from('chapters')
      .select('id')
      .eq('novel_id', this.project.novel_id)
      .eq('chapter_number', nextChapter)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      throw new Error(`Chương ${nextChapter} đã tồn tại — dừng lưu để tránh trùng lặp`);
    }

    const { data: newChapter, error } = await supabase.from('chapters').insert({
      novel_id: this.project.novel_id,
      chapter_number: nextChapter,
      title: analysis.title,
      content
    }).select('id').single();
    if (error || !newChapter) throw new Error('Failed to save chapter');

    return {
      chapterId: newChapter.id,
      chapterResult: {
        content,
        title: analysis.title,
        wordCount: this.countWords(content),
        summary: analysis.summary,
        keyEvents: analysis.keyEvents,
        characterStates: analysis.characterStates,
        plotThreads: analysis.plotThreads
      }
    };
  }

  // Series Bible + Context Pack helpers
  private async getAuthorMeta(): Promise<{ persona?: string; style?: string }> {
    const supabase = await this.getClient();
    if (!this.project.novel?.author) return {};
    const { data } = await supabase
      .from('ai_authors')
      .select('ai_prompt_persona, writing_style_description')
      .eq('name', this.project.novel.author)
      .single();
    return {
      persona: data?.ai_prompt_persona || undefined,
      style: data?.writing_style_description || undefined,
    };
  }

  private summarizeCharacterStates(states: CharacterState[]): string {
    const unique = new Map<string, CharacterState>();
    states.forEach(s => {
      if (!unique.has(s.name)) unique.set(s.name, s);
    });
    const list = Array.from(unique.values()).slice(0, 6);
    return list.map(s => {
      const parts: string[] = [];
      parts.push(`- ${s.name}`);
      if (s.cultivation_level) parts.push(`cảnh giới: ${s.cultivation_level}`);
      if (s.magic_level) parts.push(`cấp ma pháp: ${s.magic_level}`);
      if (s.health_status) parts.push(`sức khỏe: ${s.health_status}`);
      if (s.emotional_state) parts.push(`tâm trạng: ${s.emotional_state}`);
      return parts.join(' | ');
    }).join('\n');
  }

  private buildWorldRules(): string {
    const p = this.project;
    const rules: string[] = [];
    if (p.genre === 'tien-hiep' && p.cultivation_system) {
      rules.push(`Hệ tu luyện: ${p.cultivation_system}`);
    }
    if (p.genre === 'huyen-huyen' && p.magic_system) {
      rules.push(`Hệ phép thuật: ${p.magic_system}`);
    }
    if (p.genre === 'do-thi' && p.modern_setting) {
      rules.push(`Bối cảnh đô thị: ${p.modern_setting}`);
    }
    if (p.genre === 'khoa-huyen' && p.tech_level) {
      rules.push(`Cấp công nghệ: ${p.tech_level}`);
    }
    if (p.genre === 'lich-su' && p.historical_period) {
      rules.push(`Thời kỳ lịch sử: ${p.historical_period}`);
    }
    if (p.genre === 'dong-nhan' && p.original_work) {
      rules.push(`Tác phẩm gốc (tham chiếu): ${p.original_work}`);
    }
    if (p.genre === 'vong-du' && p.game_system) {
      rules.push(`Hệ thống game: ${p.game_system}`);
    }
    if (p.world_description) {
      rules.push(`Ghi chú thế giới: ${p.world_description}`);
    }
    return rules.length ? rules.join('\n') : '—';
  }

  private buildNameMap(states: CharacterState[]): string {
    const names = new Set<string>();
    names.add(this.project.main_character);
    states.forEach(s => names.add(s.name));
    const list = Array.from(names).slice(0, 12);
    return list.map(n => `- ${n} → ${n}`).join('\n');
  }

  private async buildSeriesBible(states: CharacterState[]): Promise<string> {
    const author = await this.getAuthorMeta();
    const characters = this.summarizeCharacterStates(states);
    const world = this.buildWorldRules();
    const styleGuide = author.style || this.project.writing_style || 'webnovel hiện đại';
    const title = this.project.novel?.title || 'Truyện';
    return [
      `Tiêu đề: ${title}`,
      `Giọng tác giả: ${styleGuide}`,
      `Nhắc nhở: BỐI CẢNH THẾ GIỚI SONG SONG, KHÔNG dùng tên có thật.`,
      `Nhân vật chủ chốt:`,
      characters || '- (chưa có)',
      `Luật thế giới (cô đọng):`,
      world,
      `Name map (bắt buộc dùng đúng):`,
      this.buildNameMap(states)
    ].join('\n');
  }

  private limitRecentSummaries(recent: StoryGraphNode[], take: number): string {
    const nodes = [...recent].slice(-take);
    return nodes.map(c => `- Chương ${c.chapter_number}: ${c.summary}`).join('\n');
  }

  private async buildContextPack(context: StoryContext): Promise<string> {
    const objective = await this.generatePlotObjectives(context);
    const threads = context.openPlotThreads
      .filter(t => t.status !== 'resolved')
      .sort((a, b) => (a.priority === 'high' ? -1 : 1))
      .slice(0, 3)
      .map(t => `- [${t.priority}] ${t.title}: ${t.description}`)
      .join('\n') || '- (chưa có)';
    const states = this.summarizeCharacterStates(context.characterStates);
    const rulesFocused = this.buildWorldRules();
    const recap = this.limitRecentSummaries(context.recentChapters, 3);
    return [
      `Mục tiêu chương (ngắn gọn):`,
      objective,
      `Threads đang mở (ưu tiên cao):`,
      threads,
      `Trạng thái nhân vật liên quan:`,
      states || '- (chưa có)',
      `Luật cần dùng ngay:`,
      rulesFocused,
      `Tóm tắt 3 chương gần nhất:`,
      recap
    ].join('\n');
  }
}
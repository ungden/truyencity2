import { ChapterWriter } from './chapter';
import { POWER_SYSTEMS, GENRE_STYLES } from './templates';
import { createFullQCGating } from './qc-gating';
import { getSupabase } from './supabase-helper';
import { GenreType, StyleBible, WorldBible } from './types';
import { logger } from '@/lib/security/logger';

type ProjectRow = {
  id: string;
  novel_id: string;
  genre: string | null;
  main_character: string | null;
  world_description: string | null;
  current_chapter: number | null;
  status: string;
};

type ChapterRow = {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type EditorScanResult = {
  scannedProjects: number;
  scannedChapters: number;
  lowQualityCount: number;
  queuedJobs: number;
};

type RewriteWorkerResult = {
  processedJobs: number;
  rewrittenChapters: number;
  failedJobs: number;
  message: string;
};

const LOW_SCORE_THRESHOLD = 65;
const REWRITE_ACCEPT_THRESHOLD = 65;

const KNOWN_GENRES: GenreType[] = [
  'tien-hiep',
  'huyen-huyen',
  'do-thi',
  'kiem-hiep',
  'mat-the',
  'khoa-huyen',
  'lich-su',
  'dong-nhan',
  'vong-du',
  'ngon-tinh',
  'linh-di',
  'quan-truong',
  'di-gioi',
];

function normalizeGenre(genre: string | null | undefined): GenreType {
  if (!genre) return 'huyen-huyen';
  return (KNOWN_GENRES.includes(genre as GenreType) ? genre : 'huyen-huyen') as GenreType;
}

function mapPowerSystemByGenre(genre: GenreType) {
  if (genre === 'do-thi' || genre === 'khoa-huyen' || genre === 'vong-du') {
    return POWER_SYSTEMS.urban_system;
  }
  if (genre === 'kiem-hiep' || genre === 'lich-su') {
    return POWER_SYSTEMS.martial_world;
  }
  return POWER_SYSTEMS.cultivation_standard;
}

function summarizeText(content: string, maxWords: number = 220): string {
  const tokens = content.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= maxWords) {
    return tokens.join(' ');
  }
  return `${tokens.slice(0, maxWords).join(' ')}...`;
}

export class AIEditorService {
  async runDailyScan(options?: {
    maxProjects?: number;
    lowScoreThreshold?: number;
  }): Promise<EditorScanResult> {
    const supabase = getSupabase();
    const maxProjects = options?.maxProjects ?? 250;
    const lowScoreThreshold = options?.lowScoreThreshold ?? LOW_SCORE_THRESHOLD;

    const { data: projects, error: projectsError } = await supabase
      .from('ai_story_projects')
      .select('id, novel_id, genre, main_character, world_description, current_chapter, status')
      .eq('status', 'active')
      .gt('current_chapter', 5)
      .order('updated_at', { ascending: false })
      .limit(maxProjects);

    if (projectsError) {
      throw new Error(`AI Editor scan failed loading projects: ${projectsError.message}`);
    }

    const activeProjects = (projects || []) as ProjectRow[];
    let scannedChapters = 0;
    let lowQualityCount = 0;
    let queuedJobs = 0;

    for (const project of activeProjects) {
      const latestChapter = await this.getLatestChapter(project.novel_id);
      if (!latestChapter) {
        continue;
      }

      const existingToday = await this.hasRecentReview(project.id, latestChapter.id);
      if (existingToday) {
        continue;
      }

      scannedChapters += 1;

      const qcResult = await this.evaluateChapter(project, latestChapter);
      const overallScore = qcResult.scores.overall;

      const { data: reviewRow, error: reviewError } = await supabase
        .from('editor_reviews')
        .insert({
          project_id: project.id,
          novel_id: project.novel_id,
          chapter_id: latestChapter.id,
          chapter_number: latestChapter.chapter_number,
          overall_score: overallScore,
          action: qcResult.action,
          failures: qcResult.failures,
          warnings: qcResult.warnings,
          details: {
            scores: qcResult.scores,
            detail: qcResult.details,
          },
          scanned_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (reviewError) {
        logger.warn('AI Editor failed to persist review', {
          projectId: project.id,
          chapterNumber: latestChapter.chapter_number,
          error: reviewError.message,
        });
        continue;
      }

      if (overallScore < lowScoreThreshold) {
        lowQualityCount += 1;
        const queued = await this.queueRewriteJobIfNeeded(
          project,
          latestChapter.chapter_number,
          reviewRow.id
        );
        if (queued) queuedJobs += 1;
      }
    }

    return {
      scannedProjects: activeProjects.length,
      scannedChapters,
      lowQualityCount,
      queuedJobs,
    };
  }

  async processRewriteWorker(options?: {
    maxJobs?: number;
    maxChaptersPerJob?: number;
  }): Promise<RewriteWorkerResult> {
    const maxJobs = options?.maxJobs ?? 1;
    const maxChaptersPerJob = options?.maxChaptersPerJob ?? 2;

    let processedJobs = 0;
    let rewrittenChapters = 0;
    let failedJobs = 0;

    for (let i = 0; i < maxJobs; i++) {
      const job = await this.claimNextRewriteJob();
      if (!job) break;

      processedJobs += 1;
      const result = await this.processSingleJob(job, maxChaptersPerJob);
      rewrittenChapters += result.rewritten;
      failedJobs += result.failed ? 1 : 0;
    }

    return {
      processedJobs,
      rewrittenChapters,
      failedJobs,
      message: processedJobs === 0 ? 'No rewrite jobs available' : 'AI Editor worker completed',
    };
  }

  async getDashboard(limit: number = 25) {
    const supabase = getSupabase();
    const safeLimit = Math.max(1, Math.min(200, limit));
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [jobsRes, reviewsRes, lowRes, runningRes] = await Promise.all([
      supabase
        .from('rewrite_chain_jobs')
        .select('id, project_id, novel_id, start_chapter, end_chapter, current_chapter, status, rewritten_count, failed_count, created_at, updated_at, completed_at, last_error')
        .order('updated_at', { ascending: false })
        .limit(safeLimit),
      supabase
        .from('editor_reviews')
        .select('id, project_id, novel_id, chapter_number, overall_score, action, scanned_at')
        .gte('scanned_at', dayAgoIso)
        .order('scanned_at', { ascending: false })
        .limit(safeLimit),
      supabase
        .from('editor_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', dayAgoIso)
        .lt('overall_score', LOW_SCORE_THRESHOLD),
      supabase
        .from('rewrite_chain_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'running']),
    ]);

    if (jobsRes.error) throw new Error(jobsRes.error.message);
    if (reviewsRes.error) throw new Error(reviewsRes.error.message);
    if (lowRes.error) throw new Error(lowRes.error.message);
    if (runningRes.error) throw new Error(runningRes.error.message);

    const novelIds = [
      ...new Set([
        ...(jobsRes.data || []).map((j) => j.novel_id),
        ...(reviewsRes.data || []).map((r) => r.novel_id),
      ]),
    ];

    const { data: novels } = novelIds.length > 0
      ? await supabase.from('novels').select('id, title').in('id', novelIds)
      : { data: [] as Array<{ id: string; title: string }> };
    const titleMap = new Map((novels || []).map((n) => [n.id, n.title]));

    return {
      summary: {
        lowReviewsLast24h: lowRes.count || 0,
        openJobs: runningRes.count || 0,
        reviewsLast24h: (reviewsRes.data || []).length,
      },
      jobs: (jobsRes.data || []).map((j) => ({
        ...j,
        title: titleMap.get(j.novel_id) || 'Unknown title',
      })),
      reviews: (reviewsRes.data || []).map((r) => ({
        ...r,
        title: titleMap.get(r.novel_id) || 'Unknown title',
      })),
    };
  }

  private async processSingleJob(
    job: {
      id: string;
      project_id: string;
      novel_id: string;
      start_chapter: number;
      end_chapter: number;
      current_chapter: number;
      rewritten_count: number;
      failed_count: number;
      status: string;
    },
    maxChaptersPerJob: number
  ): Promise<{ rewritten: number; failed: boolean }> {
    const supabase = getSupabase();

    const project = await this.getProject(job.project_id);
    if (!project) {
      await this.failJob(job.id, 'Project not found');
      return { rewritten: 0, failed: true };
    }

    let rewritten = 0;
    let chapterCursor = job.current_chapter;

    for (let i = 0; i < maxChaptersPerJob; i++) {
      if (chapterCursor > job.end_chapter) {
        await supabase
          .from('rewrite_chain_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', job.id);
        return { rewritten, failed: false };
      }

      const chapter = await this.getChapterByNumber(job.novel_id, chapterCursor);
      if (!chapter) {
        await this.upsertChainItem(job.id, chapterCursor, null, {
          status: 'skipped',
          failure_reason: 'Chapter not found',
          attempts: 1,
        });
        chapterCursor += 1;
        continue;
      }

      const beforeQC = await this.evaluateChapter(project, chapter);
      await this.saveChapterVersion(chapter, 'original', beforeQC.scores.overall, {
        jobId: job.id,
      });

      const rewriteOutput = await this.rewriteChapter(project, chapter);
      if (!rewriteOutput.success) {
        await this.upsertChainItem(job.id, chapter.chapter_number, chapter.id, {
          status: 'failed',
          before_score: beforeQC.scores.overall,
          attempts: 1,
          failure_reason: rewriteOutput.error,
        });
        await this.failJob(job.id, rewriteOutput.error || 'Rewrite failed');
        return { rewritten, failed: true };
      }

      const afterQC = await this.evaluateRawContent(project, chapter.chapter_number, rewriteOutput.content);
      const acceptable =
        afterQC.scores.overall >= REWRITE_ACCEPT_THRESHOLD ||
        afterQC.scores.overall >= beforeQC.scores.overall;

      if (!acceptable) {
        await this.upsertChainItem(job.id, chapter.chapter_number, chapter.id, {
          status: 'failed',
          before_score: beforeQC.scores.overall,
          after_score: afterQC.scores.overall,
          attempts: 1,
          failure_reason: 'Rewrite score did not improve enough',
          details: {
            beforeAction: beforeQC.action,
            afterAction: afterQC.action,
          },
        });
        await this.failJob(job.id, 'Rewrite score did not improve enough');
        return { rewritten, failed: true };
      }

      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          title: rewriteOutput.title,
          content: rewriteOutput.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapter.id);

      if (updateError) {
        await this.failJob(job.id, `Failed updating chapter ${chapter.chapter_number}: ${updateError.message}`);
        return { rewritten, failed: true };
      }

      await this.saveChapterVersion(
        {
          ...chapter,
          title: rewriteOutput.title,
          content: rewriteOutput.content,
        },
        'auto_rewrite',
        afterQC.scores.overall,
        { jobId: job.id }
      );

      await this.upsertChainItem(job.id, chapter.chapter_number, chapter.id, {
        status: 'rewritten',
        before_score: beforeQC.scores.overall,
        after_score: afterQC.scores.overall,
        attempts: 1,
      });

      chapterCursor += 1;
      rewritten += 1;

      await supabase
        .from('rewrite_chain_jobs')
        .update({
          current_chapter: chapterCursor,
          rewritten_count: (job.rewritten_count || 0) + rewritten,
          status: chapterCursor > job.end_chapter ? 'completed' : 'running',
          completed_at: chapterCursor > job.end_chapter ? new Date().toISOString() : null,
        })
        .eq('id', job.id);
    }

    return { rewritten, failed: false };
  }

  private async claimNextRewriteJob() {
    const supabase = getSupabase();

    const { data: running } = await supabase
      .from('rewrite_chain_jobs')
      .select('id, project_id, novel_id, start_chapter, end_chapter, current_chapter, rewritten_count, failed_count, status, attempts')
      .eq('status', 'running')
      .order('updated_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (running) return running;

    const { data: pending } = await supabase
      .from('rewrite_chain_jobs')
      .select('id, project_id, novel_id, start_chapter, end_chapter, current_chapter, rewritten_count, failed_count, status, attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pending) return null;

    await supabase
      .from('rewrite_chain_jobs')
      .update({ status: 'running', attempts: (pending.attempts || 0) + 1 })
      .eq('id', pending.id);

    return {
      ...pending,
      status: 'running',
    };
  }

  private async hasRecentReview(projectId: string, chapterId: string): Promise<boolean> {
    const supabase = getSupabase();
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('editor_reviews')
      .select('id')
      .eq('project_id', projectId)
      .eq('chapter_id', chapterId)
      .gte('scanned_at', dayAgoIso)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  }

  private async queueRewriteJobIfNeeded(project: ProjectRow, startChapter: number, reviewId: string): Promise<boolean> {
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('rewrite_chain_jobs')
      .select('id')
      .eq('project_id', project.id)
      .in('status', ['pending', 'running'])
      .limit(1)
      .maybeSingle();

    if (existing) {
      return false;
    }

    const endChapter = Math.max(project.current_chapter || startChapter, startChapter);
    const { error } = await supabase
      .from('rewrite_chain_jobs')
      .insert({
        project_id: project.id,
        novel_id: project.novel_id,
        trigger_review_id: reviewId,
        start_chapter: startChapter,
        end_chapter: endChapter,
        current_chapter: startChapter,
        status: 'pending',
        metadata: {
          trigger: 'daily_scan',
        },
      });

    if (error) {
      logger.warn('AI Editor failed to queue rewrite chain', {
        projectId: project.id,
        startChapter,
        error: error.message,
      });
      return false;
    }

    return true;
  }

  private async evaluateChapter(project: ProjectRow, chapter: ChapterRow) {
    return this.evaluateRawContent(project, chapter.chapter_number, chapter.content);
  }

  private async evaluateRawContent(project: ProjectRow, chapterNumber: number, content: string) {
    const qc = createFullQCGating(project.id);
    const mainCharacter = project.main_character || 'Nhân vật chính';
    return qc.evaluateFull(chapterNumber, content, {
      charactersInvolved: [mainCharacter],
    });
  }

  private async rewriteChapter(project: ProjectRow, chapter: ChapterRow): Promise<{ success: boolean; title: string; content: string; error?: string }> {
    const supabase = getSupabase();
    const genre = normalizeGenre(project.genre);
    const styleBible = GENRE_STYLES[genre] as StyleBible;

    const worldBible = await this.buildWorldBible(project);
    const previousSummary = await this.buildRewriteContext(project.novel_id, chapter.chapter_number, chapter);
    const previousTitles = await this.getPreviousTitles(project.novel_id, chapter.chapter_number);

    const writer = new ChapterWriter({
      genre,
      use3AgentWorkflow: false,
      maxRetries: 2,
      targetWordCount: 2800,
    });

    const result = await writer.writeChapterSimple(chapter.chapter_number, {
      worldBible,
      styleBible,
      previousSummary,
      previousTitles,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        title: chapter.title,
        content: chapter.content,
        error: result.error || 'Rewrite generation failed',
      };
    }

    const title = result.data.title?.trim() || chapter.title;
    const content = result.data.content?.trim();
    if (!content) {
      return {
        success: false,
        title: chapter.title,
        content: chapter.content,
        error: 'Rewrite returned empty content',
      };
    }

    const { error: qcPersistError } = await supabase
      .from('qc_results')
      .upsert(
        {
          project_id: project.id,
          chapter_number: chapter.chapter_number,
          overall_score: Math.round((result.data.qualityScore || 0) * 10),
          action: 'auto_rewrite',
          passed: true,
          rewrite_count: 1,
        },
        { onConflict: 'project_id,chapter_number' }
      );

    if (qcPersistError) {
      logger.warn('AI Editor rewrite could not persist qc_results', {
        projectId: project.id,
        chapterNumber: chapter.chapter_number,
        error: qcPersistError.message,
      });
    }

    return {
      success: true,
      title,
      content,
    };
  }

  private async buildWorldBible(project: ProjectRow): Promise<WorldBible> {
    const genre = normalizeGenre(project.genre);
    const powerSystem = mapPowerSystemByGenre(genre);
    const protagonistName = project.main_character || 'Nhân vật chính';

    return {
      projectId: project.id,
      storyTitle: `Project ${project.id.slice(0, 8)}`,
      powerSystem,
      protagonist: {
        name: protagonistName,
        realm: powerSystem.realms[0]?.name || 'Phàm Nhân',
        level: 1,
        age: 20,
        traits: ['kiên định', 'quyết đoán'],
        abilities: ['thích nghi'],
        inventory: [],
        goals: ['mạnh lên để sống sót'],
        status: 'active',
      },
      npcRelationships: [],
      locations: [
        {
          name: 'Bối cảnh hiện tại',
          type: 'city',
          description: project.world_description || 'Thế giới webnovel nhiều xung đột và cơ duyên.',
          significance: 'Nơi diễn ra các biến cố chính.',
          visitHistory: [],
        },
      ],
      openPlotThreads: [],
      resolvedPlotThreads: [],
      foreshadowing: [],
      worldRules: [project.world_description || 'Giữ logic thế giới nhất quán.'],
    };
  }

  private async buildRewriteContext(novelId: string, chapterNumber: number, chapter: ChapterRow): Promise<string> {
    const previous = await this.getChapterByNumber(novelId, chapterNumber - 1);
    const previousPart = previous
      ? `Tóm tắt chương trước (đã là bản mới nhất): ${summarizeText(previous.content, 180)}`
      : 'Không có chương trước.';

    return [
      'NHIỆM VỤ: VIẾT LẠI CHƯƠNG HIỆN TẠI VỚI CHẤT LƯỢNG CAO HƠN.',
      'GIỮ NGUYÊN mạch truyện và các sự kiện then chốt. Không được retcon.',
      'BẮT BUỘC dùng lời thoại chuẩn dấu gạch ngang dài (—) ở đầu dòng.',
      'Tăng độ mượt văn phong, giảm lặp, tăng miêu tả hành động và cảm xúc.',
      'Nếu có cliffhanger gốc thì giữ hoặc làm mạnh hơn.',
      previousPart,
      `Tiêu đề hiện tại: ${chapter.title}`,
      'Nội dung chương cần rewrite:',
      chapter.content,
    ].join('\n\n');
  }

  private async getProject(projectId: string): Promise<ProjectRow | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('ai_story_projects')
      .select('id, novel_id, genre, main_character, world_description, current_chapter, status')
      .eq('id', projectId)
      .maybeSingle();
    return (data as ProjectRow | null) || null;
  }

  private async getLatestChapter(novelId: string): Promise<ChapterRow | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('chapters')
      .select('id, novel_id, chapter_number, title, content, created_at, updated_at')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ChapterRow | null) || null;
  }

  private async getChapterByNumber(novelId: string, chapterNumber: number): Promise<ChapterRow | null> {
    const supabase = getSupabase();
    if (chapterNumber <= 0) return null;
    const { data } = await supabase
      .from('chapters')
      .select('id, novel_id, chapter_number, title, content, created_at, updated_at')
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle();
    return (data as ChapterRow | null) || null;
  }

  private async getPreviousTitles(novelId: string, chapterNumber: number): Promise<string[]> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('chapters')
      .select('title')
      .eq('novel_id', novelId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(50);

    return (data || []).map((row) => row.title).filter(Boolean);
  }

  private async saveChapterVersion(
    chapter: ChapterRow,
    source: 'original' | 'auto_rewrite' | 'manual_rewrite',
    qualityScore: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('chapter_versions').insert({
      chapter_id: chapter.id,
      chapter_number: chapter.chapter_number,
      source,
      title: chapter.title,
      content: chapter.content,
      quality_score: qualityScore,
      metadata: metadata || {},
    });
  }

  private async upsertChainItem(
    jobId: string,
    chapterNumber: number,
    chapterId: string | null,
    payload: Record<string, unknown>
  ): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('rewrite_chain_items').upsert(
      {
        job_id: jobId,
        chapter_id: chapterId,
        chapter_number: chapterNumber,
        ...payload,
      },
      { onConflict: 'job_id,chapter_number' }
    );
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    const supabase = getSupabase();
    await supabase
      .from('rewrite_chain_jobs')
      .update({
        status: 'failed',
        failed_count: 1,
        last_error: errorMessage,
      })
      .eq('id', jobId);
  }
}

export const aiEditorService = new AIEditorService();

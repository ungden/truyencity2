import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  PlotArc,
  PlannedTwist,
  CharacterArc,
  HierarchicalSummary,
  AIStoryProject,
  TwistType,
  CharacterArcType,
} from '@/lib/types/ai-writer';

// Get Supabase config from environment variables
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { url, serviceRoleKey };
};

/**
 * PlotArcManager - Quản lý cao trào, twist, và character development
 *
 * Nhiệm vụ:
 * 1. Tự động tạo plot arcs mỗi 10-15 chương
 * 2. Tính toán tension curve (cao trào dần, đỉnh ở chương 7-8, giải quyết ở 9-10)
 * 3. Lập kế hoạch twists mỗi 10-15 chương
 * 4. Theo dõi character development
 * 5. Tạo hierarchical summaries để tiết kiệm token
 */
export class PlotArcManager {
  private projectId: string;
  private supabaseServiceRoleClient: SupabaseClient | null = null;
  private externalClient: SupabaseClient | null = null;

  constructor(projectId: string, client?: SupabaseClient) {
    this.projectId = projectId;
    this.externalClient = client || null;
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
        persistSession: false,
      },
    });
    return this.supabaseServiceRoleClient;
  }

  // ============================================================================
  // PLOT ARC MANAGEMENT
  // ============================================================================

  /**
   * Lấy arc hiện tại cho chương đang viết
   */
  async getCurrentArc(chapterNumber: number): Promise<PlotArc | null> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from('plot_arcs')
      .select('*')
      .eq('project_id', this.projectId)
      .lte('start_chapter', chapterNumber)
      .gte('end_chapter', chapterNumber)
      .single();

    return data as PlotArc | null;
  }

  /**
   * Tạo arc mới tự động nếu chưa có
   */
  async ensureArcExists(chapterNumber: number): Promise<PlotArc> {
    let arc = await this.getCurrentArc(chapterNumber);

    if (!arc) {
      // Tính arc number dựa trên chapter (mỗi arc 10 chương)
      const arcNumber = Math.floor((chapterNumber - 1) / 10) + 1;
      const startChapter = (arcNumber - 1) * 10 + 1;
      const endChapter = arcNumber * 10;

      // Tạo tension curve mặc định: rise → climax → fall
      const tensionCurve = this.generateDefaultTensionCurve(10);
      const climaxChapter = startChapter + 7; // Cao trào ở chương 8 của arc

      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('plot_arcs')
        .insert({
          project_id: this.projectId,
          arc_number: arcNumber,
          start_chapter: startChapter,
          end_chapter: endChapter,
          arc_title: `Arc ${arcNumber}`,
          arc_description: `Automatically generated arc ${arcNumber}`,
          tension_curve: tensionCurve,
          climax_chapter: climaxChapter,
          theme: this.suggestArcTheme(arcNumber),
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) {
        console.error('[PlotArcManager] Error creating arc:', error);
        throw error;
      }

      arc = data as PlotArc;

      // Tạo twist cho arc mới
      await this.planTwistsForArc(arc);
    }

    return arc;
  }

  /**
   * Generate tension curve mặc định
   * Pattern: [30, 40, 50, 60, 70, 80, 90, 95, 70, 50]
   * - Chương 1-6: Tăng dần
   * - Chương 7-8: Cao trào (90-95)
   * - Chương 9-10: Giải quyết, hạ xuống
   */
  private generateDefaultTensionCurve(arcLength: number): number[] {
    const curve: number[] = [];
    const climaxIndex = Math.floor(arcLength * 0.7); // 70% of arc length

    for (let i = 0; i < arcLength; i++) {
      if (i < climaxIndex) {
        // Rising action: 30 → 90
        curve.push(30 + (i / climaxIndex) * 60);
      } else if (i === climaxIndex) {
        // Climax
        curve.push(95);
      } else {
        // Falling action: 95 → 50
        const fallProgress = (i - climaxIndex) / (arcLength - climaxIndex);
        curve.push(95 - fallProgress * 45);
      }
    }

    return curve.map((v) => Math.round(v));
  }

  /**
   * Gợi ý theme cho arc dựa trên số thứ tự
   */
  private suggestArcTheme(arcNumber: number): string {
    const themes = [
      'foundation', // Arc 1: Nền tảng, giới thiệu
      'conflict', // Arc 2: Xung đột đầu tiên
      'growth', // Arc 3: Tăng trưởng sức mạnh
      'betrayal', // Arc 4: Phản bội
      'redemption', // Arc 5: Chuộc lỗi
      'revelation', // Arc 6: Tiết lộ bí mật
      'war', // Arc 7: Chiến tranh
      'triumph', // Arc 8: Chiến thắng
    ];
    return themes[(arcNumber - 1) % themes.length];
  }

  /**
   * Lấy tension target cho chương hiện tại
   */
  async getTensionTarget(chapterNumber: number): Promise<number> {
    const arc = await this.getCurrentArc(chapterNumber);
    if (!arc || !arc.tension_curve) {
      return 50; // Default medium tension
    }

    const chapterIndex = chapterNumber - arc.start_chapter;
    if (chapterIndex < 0 || chapterIndex >= arc.tension_curve.length) {
      return 50;
    }

    return arc.tension_curve[chapterIndex];
  }

  /**
   * Generate plot objectives dựa trên tension và arc theme
   */
  async generatePlotObjectives(chapterNumber: number): Promise<string> {
    const arc = await this.getCurrentArc(chapterNumber);
    const tension = await this.getTensionTarget(chapterNumber);
    const upcomingTwists = await this.getUpcomingTwists(chapterNumber);

    let objectives = '';

    // 1. Tension guidance
    if (tension < 40) {
      objectives += '- Nhịp độ: Chậm rãi, xây dựng bối cảnh, giới thiệu nhân vật mới\n';
    } else if (tension < 70) {
      objectives += '- Nhịp độ: Vừa phải, có xung đột nhỏ, chuẩn bị cho cao trào\n';
    } else if (tension < 90) {
      objectives += '- Nhịp độ: Nhanh, căng thẳng tăng cao, xung đột gay gắt\n';
    } else {
      objectives += '- Nhịp độ: CỰC NHANH, CAO TRÀO, chiến đấu quyết liệt hoặc tiết lộ bí mật lớn\n';
    }

    // 2. Arc theme guidance
    if (arc?.theme) {
      const themeGuidance: Record<string, string> = {
        foundation: 'Xây dựng nền tảng, giới thiệu thế giới, nhân vật, hệ thống',
        conflict: 'Tạo xung đột với kẻ thù, thách thức đầu tiên',
        growth: 'Nhân vật tăng trưởng sức mạnh, học kỹ năng mới, đột phá',
        betrayal: 'Người thân phản bội, hoặc phát hiện sự thật đau lòng',
        redemption: 'Chuộc lỗi, sửa sai, hoặc cứu người',
        revelation: 'Tiết lộ bí mật lớn, sự thật ẩn giấu',
        war: 'Chiến tranh quy mô lớn, liên minh, chiến lược',
        triumph: 'Chiến thắng vẻ vang, đạt mục tiêu lớn',
      };
      objectives += `- Chủ đề arc: ${themeGuidance[arc.theme] || 'Phát triển cốt truyện'}\n`;
    }

    // 3. Twist foreshadowing
    if (upcomingTwists.length > 0) {
      const nextTwist = upcomingTwists[0];
      const chaptersUntilTwist = nextTwist.target_chapter - chapterNumber;

      if (chaptersUntilTwist <= 3 && nextTwist.status === 'planned') {
        objectives += `- Foreshadowing: Chuẩn bị cho twist "${nextTwist.twist_type}" ở chương ${nextTwist.target_chapter}. `;
        objectives += `Thêm gợi ý tinh tế (nhân vật hành động lạ, chi tiết nhỏ bất thường)\n`;
      }
    }

    // 4. Climax guidance
    if (arc && chapterNumber === arc.climax_chapter) {
      objectives += '- ĐÂY LÀ CHƯƠNG CAO TRÀO CỦA ARC! Phải có:\n';
      objectives += '  + Chiến đấu hoặc đối đầu gay gắt nhất\n';
      objectives += '  + Quyết định quan trọng của nhân vật chính\n';
      objectives += '  + Cảm xúc mãnh liệt (phấn khích, bi thương, phẫn nộ)\n';
      objectives += '  + Kết thúc bằng cliffhanger hoặc victory moment\n';
    }

    // 5. Character development
    const characterMilestone = await this.getCharacterMilestoneForChapter(chapterNumber);
    if (characterMilestone) {
      objectives += `- Character development: ${characterMilestone}\n`;
    }

    return objectives || '- Tiếp tục phát triển cốt truyện một cách tự nhiên\n';
  }

  // ============================================================================
  // TWIST MANAGEMENT
  // ============================================================================

  /**
   * Lập kế hoạch twists cho arc
   * Mỗi arc (10 chương) nên có 1-2 twist lớn
   */
  private async planTwistsForArc(arc: PlotArc): Promise<void> {
    const supabase = await this.getClient();

    // Twist 1: Ở chương 4-5 (40-50% arc)
    const twist1Chapter = arc.start_chapter + Math.floor(Math.random() * 2) + 3; // Chapter 4 or 5
    const twist1Type = this.randomTwistType(['revelation', 'alliance', 'power_up']);

    // Twist 2: Ở chương 8-9 (80-90% arc, gần climax)
    const twist2Chapter = arc.start_chapter + Math.floor(Math.random() * 2) + 7; // Chapter 8 or 9
    const twist2Type = this.randomTwistType(['betrayal', 'plot_reversal', 'hidden_identity']);

    await supabase.from('planned_twists').insert([
      {
        project_id: this.projectId,
        arc_id: arc.id,
        target_chapter: twist1Chapter,
        twist_type: twist1Type,
        twist_description: `Automatically planned ${twist1Type} twist for arc ${arc.arc_number}`,
        impact_level: 60,
        status: 'planned',
      },
      {
        project_id: this.projectId,
        arc_id: arc.id,
        target_chapter: twist2Chapter,
        twist_type: twist2Type,
        twist_description: `Automatically planned ${twist2Type} twist for arc ${arc.arc_number}`,
        impact_level: 80,
        status: 'planned',
      },
    ]);
  }

  private randomTwistType(options: TwistType[]): TwistType {
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Lấy twists sắp tới (trong vòng 5 chương)
   */
  async getUpcomingTwists(chapterNumber: number): Promise<PlannedTwist[]> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from('planned_twists')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('target_chapter', chapterNumber)
      .lte('target_chapter', chapterNumber + 5)
      .in('status', ['planned', 'foreshadowed'])
      .order('target_chapter', { ascending: true });

    return (data as PlannedTwist[]) || [];
  }

  /**
   * Mark twist as revealed
   */
  async markTwistRevealed(twistId: string, chapterNumber: number): Promise<void> {
    const supabase = await this.getClient();
    await supabase
      .from('planned_twists')
      .update({
        status: 'revealed',
        revealed_at_chapter: chapterNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', twistId);
  }

  // ============================================================================
  // CHARACTER ARC MANAGEMENT
  // ============================================================================

  /**
   * Ensure character arc exists
   */
  async ensureCharacterArcExists(
    characterName: string,
    startState: string,
    targetState: string
  ): Promise<CharacterArc> {
    const supabase = await this.getClient();

    // Check if exists
    const { data: existing } = await supabase
      .from('character_arcs')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('character_name', characterName)
      .single();

    if (existing) {
      return existing as CharacterArc;
    }

    // Create new
    const { data, error } = await supabase
      .from('character_arcs')
      .insert({
        project_id: this.projectId,
        character_name: characterName,
        start_state: startState,
        current_state: startState,
        target_state: targetState,
        arc_type: 'growth',
        current_chapter: 1,
        milestones: [],
      })
      .select()
      .single();

    if (error) {
      console.error('[PlotArcManager] Error creating character arc:', error);
      throw error;
    }

    return data as CharacterArc;
  }

  /**
   * Add character milestone
   */
  async addCharacterMilestone(
    characterName: string,
    chapterNumber: number,
    event: string,
    change: string
  ): Promise<void> {
    const supabase = await this.getClient();

    const { data: arc } = await supabase
      .from('character_arcs')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('character_name', characterName)
      .single();

    if (!arc) return;

    const milestones = (arc.milestones as any[]) || [];
    milestones.push({ chapter: chapterNumber, event, change });

    await supabase
      .from('character_arcs')
      .update({
        milestones,
        current_chapter: chapterNumber,
        current_state: change,
        updated_at: new Date().toISOString(),
      })
      .eq('id', arc.id);
  }

  /**
   * Get character milestone guidance for chapter
   */
  private async getCharacterMilestoneForChapter(chapterNumber: number): Promise<string | null> {
    // Every 5 chapters, suggest character development
    if (chapterNumber % 5 === 0) {
      return 'Nhân vật chính nên có sự thay đổi rõ ràng (tư duy, kỹ năng, hoặc mối quan hệ)';
    }

    // Every 10 chapters, major milestone
    if (chapterNumber % 10 === 0) {
      return 'MILESTONE LỚN: Nhân vật đạt mục tiêu quan trọng hoặc thay đổi tầm nhìn về cuộc sống';
    }

    return null;
  }

  // ============================================================================
  // HIERARCHICAL SUMMARIES
  // ============================================================================

  /**
   * Generate arc summary khi arc hoàn thành
   */
  async generateArcSummary(arcId: string): Promise<HierarchicalSummary | null> {
    const supabase = await this.getClient();

    // Get arc info
    const { data: arc } = await supabase
      .from('plot_arcs')
      .select('*')
      .eq('id', arcId)
      .single();

    if (!arc) return null;

    // Get all chapter summaries in this arc
    const { data: chapters } = await supabase
      .from('story_graph_nodes')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('chapter_number', arc.start_chapter)
      .lte('chapter_number', arc.end_chapter)
      .order('chapter_number', { ascending: true });

    if (!chapters || chapters.length === 0) return null;

    // Combine summaries
    const combinedSummary = chapters.map((ch: any) => ch.summary).join(' ');
    const keyEvents = chapters.flatMap((ch: any) => ch.key_events || []);

    // Create hierarchical summary
    const { data, error } = await supabase
      .from('hierarchical_summaries')
      .upsert({
        project_id: this.projectId,
        level: 'arc',
        level_number: arc.arc_number,
        start_chapter: arc.start_chapter,
        end_chapter: arc.end_chapter,
        summary: combinedSummary.substring(0, 1000), // Limit to 1000 chars
        key_events: keyEvents,
        word_count: combinedSummary.split(' ').length,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[PlotArcManager] Error creating hierarchical summary:', error);
      return null;
    }

    return data as HierarchicalSummary;
  }

  /**
   * Get relevant arc summaries (instead of all chapter summaries) to save tokens
   */
  async getRelevantArcSummaries(currentChapter: number, lookbackArcs: number = 2): Promise<HierarchicalSummary[]> {
    const supabase = await this.getClient();
    const currentArcNumber = Math.floor((currentChapter - 1) / 10) + 1;

    const { data } = await supabase
      .from('hierarchical_summaries')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('level', 'arc')
      .gte('level_number', Math.max(1, currentArcNumber - lookbackArcs))
      .lt('level_number', currentArcNumber)
      .order('level_number', { ascending: false });

    return (data as HierarchicalSummary[]) || [];
  }
}

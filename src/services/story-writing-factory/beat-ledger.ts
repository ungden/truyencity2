/**
 * Beat Ledger - Track plot/emotional/setting beats with rotation rules
 *
 * Beats are categorized into:
 * 1. Plot Beats: Story events (tournament, auction, secret realm...)
 * 2. Emotional Beats: Reader emotions (humiliation, revenge, triumph...)
 * 3. Setting Beats: Locations/contexts (sect, wilderness, city...)
 *
 * Each arc has a "beat budget" and rotation rules to prevent repetition.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Beat Categories
export type BeatCategory = 'plot' | 'emotional' | 'setting';

// Plot Beat Types (Story Events)
export type PlotBeat =
  | 'tournament'           // Đại hội, tỷ thí
  | 'auction'              // Đấu giá
  | 'secret_realm'         // Bí cảnh, di tích
  | 'sect_conflict'        // Xung đột tông môn
  | 'family_reunion'       // Đoàn tụ gia đình
  | 'treasure_hunt'        // Tìm bảo vật
  | 'assassination'        // Ám sát, bị truy sát
  | 'breakthrough'         // Đột phá cảnh giới
  | 'rescue_mission'       // Cứu người
  | 'betrayal'             // Bị phản bội
  | 'alliance'             // Kết minh
  | 'war'                  // Chiến tranh lớn
  | 'trial'                // Thử thách, khảo nghiệm
  | 'inheritance'          // Nhận truyền thừa
  | 'revelation'           // Tiết lộ bí mật lớn
  | 'duel'                 // Đấu tay đôi
  | 'training'             // Tu luyện
  | 'merchant'             // Mua bán, giao dịch
  | 'investigation'        // Điều tra
  | 'escape';              // Trốn chạy

// Emotional Beat Types (Reader Emotions)
export type EmotionalBeat =
  | 'humiliation'          // Bị sỉ nhục
  | 'revenge'              // Báo thù
  | 'triumph'              // Chiến thắng vinh quang
  | 'despair'              // Tuyệt vọng
  | 'hope'                 // Hy vọng
  | 'shock'                // Bất ngờ, sốc
  | 'romance'              // Lãng mạn
  | 'sacrifice'            // Hy sinh
  | 'loyalty'              // Trung thành
  | 'growth'               // Trưởng thành
  | 'loss'                 // Mất mát
  | 'reunion'              // Hội ngộ
  | 'tension'              // Căng thẳng
  | 'relief'               // Nhẹ nhõm
  | 'curiosity'            // Tò mò
  | 'anger'                // Phẫn nộ
  | 'satisfaction';        // Thỏa mãn

// Setting Beat Types (Locations/Contexts)
export type SettingBeat =
  | 'sect_grounds'         // Trong tông môn
  | 'wilderness'           // Hoang dã
  | 'city'                 // Thành phố
  | 'ancient_ruins'        // Di tích cổ
  | 'mortal_realm'         // Phàm trần
  | 'divine_realm'         // Thần giới
  | 'underworld'           // Âm giới
  | 'mountain'             // Núi thiêng
  | 'ocean'                // Biển, hải vực
  | 'sky'                  // Thiên không
  | 'cave'                 // Động phủ
  | 'palace'               // Cung điện
  | 'marketplace'          // Chợ, phố
  | 'battlefield'          // Chiến trường
  | 'prison';              // Ngục tù

// Beat Entry
export interface BeatEntry {
  id: string;
  projectId: string;
  chapterNumber: number;
  arcNumber: number;
  category: BeatCategory;
  beatType: PlotBeat | EmotionalBeat | SettingBeat;
  intensity: number;       // 1-10 how prominent this beat is
  description?: string;
  characters?: string[];
  cooldownUntil: number;   // Chapter number when this can be reused
}

// Arc Beat Budget
export interface ArcBeatBudget {
  arcNumber: number;
  plotBeats: Map<PlotBeat, { max: number; used: number }>;
  emotionalBeats: Map<EmotionalBeat, { max: number; used: number }>;
  settingBeats: Map<SettingBeat, { max: number; used: number }>;
}

// Beat Recommendation
export interface BeatRecommendation {
  suggested: Array<PlotBeat | EmotionalBeat | SettingBeat>;
  avoid: Array<PlotBeat | EmotionalBeat | SettingBeat>;
  reason: string;
}

// Default cooldowns (chapters before reuse)
const BEAT_COOLDOWNS: Record<string, number> = {
  // Plot beats
  tournament: 30,
  auction: 25,
  secret_realm: 20,
  sect_conflict: 15,
  assassination: 20,
  breakthrough: 8,     // Breakthroughs can happen more often
  rescue_mission: 15,
  betrayal: 40,        // Betrayals should be rare
  alliance: 20,
  war: 50,             // Wars are major events
  trial: 12,
  inheritance: 35,
  revelation: 25,
  duel: 10,            // Duels can happen often
  training: 5,         // Training is common
  merchant: 8,
  investigation: 12,
  escape: 15,
  family_reunion: 30,
  treasure_hunt: 18,

  // Emotional beats
  humiliation: 20,     // Don't overdo humiliation
  revenge: 25,         // Revenge needs buildup
  triumph: 12,
  despair: 15,
  hope: 8,
  shock: 10,
  romance: 15,
  sacrifice: 40,       // Sacrifices are rare
  loyalty: 10,
  growth: 8,
  loss: 25,
  reunion: 20,
  tension: 5,          // Tension is constant
  relief: 8,
  curiosity: 5,
  anger: 8,
  satisfaction: 10,

  // Setting beats
  sect_grounds: 3,     // Can be in sect often
  wilderness: 5,
  city: 5,
  ancient_ruins: 20,
  mortal_realm: 15,
  divine_realm: 25,
  underworld: 30,
  mountain: 8,
  ocean: 15,
  sky: 12,
  cave: 10,
  palace: 12,
  marketplace: 6,
  battlefield: 20,
  prison: 25,
};

// Arc beat limits (max times per arc of ~20 chapters)
const ARC_BEAT_LIMITS: Partial<Record<PlotBeat | EmotionalBeat, number>> = {
  tournament: 1,
  auction: 1,
  secret_realm: 2,
  betrayal: 1,
  war: 1,
  inheritance: 1,
  humiliation: 2,
  revenge: 2,
  sacrifice: 1,
};

// Beat detection patterns
const BEAT_PATTERNS: Record<string, RegExp[]> = {
  // Plot beats
  tournament: [/thi đấu|đại hội|võ đài|tỷ thí|tranh đoạt|đấu trường/gi],
  auction: [/đấu giá|phiên đấu|ra giá|trả giá cao/gi],
  secret_realm: [/bí cảnh|di tích|thám hiểm|cổ mộ|phế tích|hang động cổ/gi],
  sect_conflict: [/tông môn xung đột|môn phái tranh chấp|thù địch giữa/gi],
  assassination: [/ám sát|truy sát|giết thuê|thích khách/gi],
  breakthrough: [/đột phá|thăng cấp|tiến nhập cảnh giới|bước vào/gi],
  rescue_mission: [/cứu người|giải cứu|ra tay cứu|bảo vệ/gi],
  betrayal: [/phản bội|bội tín|phản đồ|quay lưng/gi],
  alliance: [/kết minh|liên minh|đồng minh|hợp tác/gi],
  war: [/chiến tranh|đại chiến|huyết chiến|giao tranh/gi],
  trial: [/thử thách|khảo nghiệm|thử luyện|kiểm tra/gi],
  inheritance: [/truyền thừa|kế thừa|nhận được di sản/gi],
  revelation: [/tiết lộ|bí mật là|hóa ra|thì ra/gi],
  duel: [/đấu tay đôi|so tài|giao đấu|đối đầu/gi],
  training: [/tu luyện|luyện công|bế quan|thiền định/gi],
  merchant: [/mua bán|giao dịch|trao đổi|thương nhân/gi],
  investigation: [/điều tra|tìm hiểu|manh mối|dấu vết/gi],
  escape: [/trốn chạy|thoát thân|chạy trốn|rút lui/gi],
  treasure_hunt: [/tìm bảo vật|săn kho báu|linh vật|thần khí/gi],
  family_reunion: [/đoàn tụ|gặp lại gia đình|cha mẹ|huynh đệ/gi],

  // Emotional beats
  humiliation: [/sỉ nhục|khinh thường|cười nhạo|khinh bỉ|xem thường/gi],
  revenge: [/báo thù|trả thù|rửa hận|thanh toán|đền tội/gi],
  triumph: [/chiến thắng|vinh quang|thành công|thắng lợi/gi],
  despair: [/tuyệt vọng|chán nản|sụp đổ|vô vọng/gi],
  hope: [/hy vọng|tin tưởng|ánh sáng|cơ hội/gi],
  shock: [/bất ngờ|sốc|không thể tin|kinh ngạc/gi],
  romance: [/tình cảm|yêu thương|hẹn hò|đắm say/gi],
  sacrifice: [/hy sinh|cống hiến|chịu chết|bảo vệ bằng mọi giá/gi],
  loyalty: [/trung thành|theo đến cùng|không phản bội/gi],
  growth: [/trưởng thành|học được|hiểu ra|lĩnh ngộ/gi],
  loss: [/mất mát|qua đời|chia ly|biệt ly/gi],
  reunion: [/hội ngộ|gặp lại|trùng phùng/gi],

  // Setting beats
  sect_grounds: [/tông môn|môn phái|sơn môn|đạo quán/gi],
  wilderness: [/hoang dã|rừng rậm|núi hoang|không người/gi],
  city: [/thành phố|kinh thành|phố thị|đô thị/gi],
  ancient_ruins: [/di tích cổ|phế tích|cổ mộ|tàn tích/gi],
  cave: [/động phủ|hang động|thạch động|địa huyệt/gi],
  palace: [/cung điện|vương phủ|đại điện|hoàng cung/gi],
  marketplace: [/chợ|phố buôn|thương phố|sầm uất/gi],
  battlefield: [/chiến trường|sa trường|trận địa/gi],
};

export class BeatLedger {
  private projectId: string;
  private entries: BeatEntry[] = [];
  private currentArc: number = 1;
  private arcBudgets: Map<number, ArcBeatBudget> = new Map();

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Initialize by loading existing beat history
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    const { data: usages } = await supabase
      .from('beat_usage')
      .select('*')
      .eq('project_id', this.projectId)
      .order('chapter_number', { ascending: true });

    if (usages) {
      this.entries = usages.map(u => ({
        id: u.id,
        projectId: u.project_id,
        chapterNumber: u.chapter_number,
        arcNumber: u.arc_number || 1,
        category: u.beat_category,
        beatType: u.beat_type,
        intensity: u.intensity || 5,
        description: u.description,
        cooldownUntil: u.cooldown_until,
      }));
    }

    // Get current arc
    const { data: arc } = await supabase
      .from('plot_arcs')
      .select('arc_number')
      .eq('project_id', this.projectId)
      .eq('status', 'in_progress')
      .single();

    if (arc) {
      this.currentArc = arc.arc_number;
    }

    // Build arc budgets
    this.rebuildArcBudgets();
  }

  /**
   * Rebuild arc budgets from entries
   */
  private rebuildArcBudgets(): void {
    this.arcBudgets.clear();

    for (const entry of this.entries) {
      if (!this.arcBudgets.has(entry.arcNumber)) {
        this.arcBudgets.set(entry.arcNumber, this.createEmptyBudget(entry.arcNumber));
      }

      const budget = this.arcBudgets.get(entry.arcNumber)!;

      if (entry.category === 'plot') {
        const current = budget.plotBeats.get(entry.beatType as PlotBeat);
        if (current) {
          current.used++;
        }
      } else if (entry.category === 'emotional') {
        const current = budget.emotionalBeats.get(entry.beatType as EmotionalBeat);
        if (current) {
          current.used++;
        }
      }
    }
  }

  /**
   * Create empty budget for an arc
   */
  private createEmptyBudget(arcNumber: number): ArcBeatBudget {
    const budget: ArcBeatBudget = {
      arcNumber,
      plotBeats: new Map(),
      emotionalBeats: new Map(),
      settingBeats: new Map(),
    };

    // Initialize plot beat limits
    const plotBeats: PlotBeat[] = [
      'tournament', 'auction', 'secret_realm', 'sect_conflict', 'assassination',
      'breakthrough', 'rescue_mission', 'betrayal', 'alliance', 'war',
      'trial', 'inheritance', 'revelation', 'duel', 'training', 'merchant',
      'investigation', 'escape', 'treasure_hunt', 'family_reunion'
    ];

    for (const beat of plotBeats) {
      budget.plotBeats.set(beat, {
        max: ARC_BEAT_LIMITS[beat] || 3,
        used: 0,
      });
    }

    // Initialize emotional beat limits
    const emotionalBeats: EmotionalBeat[] = [
      'humiliation', 'revenge', 'triumph', 'despair', 'hope', 'shock',
      'romance', 'sacrifice', 'loyalty', 'growth', 'loss', 'reunion',
      'tension', 'relief', 'curiosity', 'anger', 'satisfaction'
    ];

    for (const beat of emotionalBeats) {
      budget.emotionalBeats.set(beat, {
        max: ARC_BEAT_LIMITS[beat] || 5,
        used: 0,
      });
    }

    return budget;
  }

  /**
   * Detect beats in chapter content
   */
  detectBeats(content: string): Array<{
    category: BeatCategory;
    beatType: PlotBeat | EmotionalBeat | SettingBeat;
    intensity: number;
  }> {
    const detected: Array<{
      category: BeatCategory;
      beatType: PlotBeat | EmotionalBeat | SettingBeat;
      intensity: number;
    }> = [];

    for (const [beatType, patterns] of Object.entries(BEAT_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          // Determine category
          let category: BeatCategory = 'plot';
          if (['humiliation', 'revenge', 'triumph', 'despair', 'hope', 'shock',
            'romance', 'sacrifice', 'loyalty', 'growth', 'loss', 'reunion',
            'tension', 'relief', 'curiosity', 'anger', 'satisfaction'].includes(beatType)) {
            category = 'emotional';
          } else if (['sect_grounds', 'wilderness', 'city', 'ancient_ruins',
            'cave', 'palace', 'marketplace', 'battlefield'].includes(beatType)) {
            category = 'setting';
          }

          // Intensity based on match count
          const intensity = Math.min(10, matches.length * 2);

          detected.push({
            category,
            beatType: beatType as PlotBeat | EmotionalBeat | SettingBeat,
            intensity,
          });
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Check if a beat can be used (not on cooldown, within budget)
   */
  canUseBeat(
    beatType: PlotBeat | EmotionalBeat | SettingBeat,
    chapterNumber: number
  ): { allowed: boolean; reason?: string } {
    // Check cooldown
    const recentUsage = this.entries.find(
      e => e.beatType === beatType && e.cooldownUntil > chapterNumber
    );

    if (recentUsage) {
      return {
        allowed: false,
        reason: `"${beatType}" on cooldown until chapter ${recentUsage.cooldownUntil}`,
      };
    }

    // Check arc budget
    const budget = this.arcBudgets.get(this.currentArc);
    if (budget) {
      const plotLimit = budget.plotBeats.get(beatType as PlotBeat);
      if (plotLimit && plotLimit.used >= plotLimit.max) {
        return {
          allowed: false,
          reason: `"${beatType}" exceeded arc budget (${plotLimit.used}/${plotLimit.max})`,
        };
      }

      const emotionalLimit = budget.emotionalBeats.get(beatType as EmotionalBeat);
      if (emotionalLimit && emotionalLimit.used >= emotionalLimit.max) {
        return {
          allowed: false,
          reason: `"${beatType}" exceeded arc budget (${emotionalLimit.used}/${emotionalLimit.max})`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record beat usage
   */
  async recordBeat(
    chapterNumber: number,
    beatType: PlotBeat | EmotionalBeat | SettingBeat,
    category: BeatCategory,
    intensity: number = 5,
    description?: string
  ): Promise<{ success: boolean; warning?: string }> {
    const supabase = getSupabase();
    const cooldown = BEAT_COOLDOWNS[beatType] || 10;
    const cooldownUntil = chapterNumber + cooldown;

    const entry: BeatEntry = {
      id: `beat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: this.projectId,
      chapterNumber,
      arcNumber: this.currentArc,
      category,
      beatType,
      intensity,
      description,
      cooldownUntil,
    };

    this.entries.push(entry);

    // Update arc budget
    if (!this.arcBudgets.has(this.currentArc)) {
      this.arcBudgets.set(this.currentArc, this.createEmptyBudget(this.currentArc));
    }
    const budget = this.arcBudgets.get(this.currentArc)!;

    if (category === 'plot') {
      const limit = budget.plotBeats.get(beatType as PlotBeat);
      if (limit) limit.used++;
    } else if (category === 'emotional') {
      const limit = budget.emotionalBeats.get(beatType as EmotionalBeat);
      if (limit) limit.used++;
    }

    // Persist
    try {
      await supabase
        .from('beat_usage')
        .insert({
          project_id: this.projectId,
          chapter_number: chapterNumber,
          arc_number: this.currentArc,
          beat_category: category,
          beat_type: beatType,
          intensity,
          description,
          cooldown_until: cooldownUntil,
        });
    } catch (e) {
      console.warn('Failed to persist beat usage:', e);
    }

    // Check for warnings
    const check = this.canUseBeat(beatType, chapterNumber + 1);
    if (!check.allowed) {
      return { success: true, warning: check.reason };
    }

    return { success: true };
  }

  /**
   * Get beat recommendations for a chapter
   */
  getRecommendations(chapterNumber: number): BeatRecommendation {
    const suggested: Array<PlotBeat | EmotionalBeat | SettingBeat> = [];
    const avoid: Array<PlotBeat | EmotionalBeat | SettingBeat> = [];

    // Find beats that are allowed and haven't been used recently
    const allPlotBeats: PlotBeat[] = [
      'tournament', 'auction', 'secret_realm', 'duel', 'training',
      'trial', 'revelation', 'breakthrough', 'merchant', 'investigation'
    ];

    const allEmotionalBeats: EmotionalBeat[] = [
      'triumph', 'growth', 'hope', 'tension', 'curiosity', 'satisfaction'
    ];

    for (const beat of [...allPlotBeats, ...allEmotionalBeats]) {
      const check = this.canUseBeat(beat, chapterNumber);
      if (check.allowed) {
        // Check if not used in last 5 chapters
        const recentUse = this.entries.find(
          e => e.beatType === beat && e.chapterNumber >= chapterNumber - 5
        );
        if (!recentUse) {
          suggested.push(beat);
        }
      } else {
        avoid.push(beat);
      }
    }

    // Prioritize variety - suggest beats that balance the arc
    const budget = this.arcBudgets.get(this.currentArc);
    if (budget) {
      // Find underused beats
      for (const [beat, limit] of budget.plotBeats) {
        if (limit.used === 0 && !avoid.includes(beat)) {
          // Move to front of suggestions
          const idx = suggested.indexOf(beat);
          if (idx > 0) {
            suggested.splice(idx, 1);
            suggested.unshift(beat);
          }
        }
      }
    }

    return {
      suggested: suggested.slice(0, 5),
      avoid: avoid.slice(0, 10),
      reason: `Based on cooldowns and arc budget for arc ${this.currentArc}`,
    };
  }

  /**
   * Build context for chapter writing
   */
  buildBeatContext(chapterNumber: number): string {
    const recommendations = this.getRecommendations(chapterNumber);

    const lines = [
      '## Beat Guidelines:',
      '',
      '### Suggested beats for this chapter:',
      ...recommendations.suggested.map(b => `- ${b}`),
      '',
      '### Avoid these beats (on cooldown or overused):',
      ...recommendations.avoid.map(b => `- ${b}`),
      '',
      '### Recent beats used:',
    ];

    const recentBeats = this.entries
      .filter(e => e.chapterNumber >= chapterNumber - 5)
      .slice(-5);

    for (const beat of recentBeats) {
      lines.push(`- Chapter ${beat.chapterNumber}: ${beat.beatType} (${beat.category})`);
    }

    return lines.join('\n');
  }

  /**
   * Get arc statistics
   */
  getArcStats(arcNumber?: number): {
    plotUsage: Record<string, { used: number; max: number }>;
    emotionalUsage: Record<string, { used: number; max: number }>;
    totalBeats: number;
    uniqueBeats: number;
  } {
    const arc = arcNumber || this.currentArc;
    const budget = this.arcBudgets.get(arc) || this.createEmptyBudget(arc);

    const plotUsage: Record<string, { used: number; max: number }> = {};
    const emotionalUsage: Record<string, { used: number; max: number }> = {};

    for (const [beat, limit] of budget.plotBeats) {
      plotUsage[beat] = { used: limit.used, max: limit.max };
    }

    for (const [beat, limit] of budget.emotionalBeats) {
      emotionalUsage[beat] = { used: limit.used, max: limit.max };
    }

    const arcEntries = this.entries.filter(e => e.arcNumber === arc);
    const uniqueBeats = new Set(arcEntries.map(e => e.beatType)).size;

    return {
      plotUsage,
      emotionalUsage,
      totalBeats: arcEntries.length,
      uniqueBeats,
    };
  }
}

export function createBeatLedger(projectId: string): BeatLedger {
  return new BeatLedger(projectId);
}

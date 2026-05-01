import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';
import { getGenreSetupRequirements, getGenreArchitectGuide } from '../templates/genre-process-blueprints';

/** Sub-arc within a volume — matches the old "majorArc" granularity (~20-30 chapters). */
export interface SubArcOutline {
  arcName: string;
  arcNumber?: number;
  startChapter: number;
  endChapter: number;
  description: string;
  keyMilestone: string;
  /** Multi-axis: thematic register driving the arc — vd "khám phá", "đối kháng", "trưởng thành", "phục thù". */
  theme?: string;
  /** Multi-axis: dominant mood of the arc — vd "warm-buildup", "tense-conflict", "tragic", "triumphant", "melancholic". */
  mood?: string;
  /** Biggest setpiece of the arc (1-2 sentences): the cinematic centerpiece scene readers will remember. */
  biggestSetpiece?: string;
  /** What does MC change about themselves during this arc — internal arc beat. */
  characterArcBeat?: string;
  /** What new region/faction/world layer is revealed or unlocked in this arc. */
  worldExpansion?: string;
  /** Pacing target — vd "fast-action", "balanced", "introspective-slow", "climax-dense". */
  pacingTarget?: string;
  /** Phase 26: medium-climax chapter (sub-arc-level reveal/turn). Defaults to last 1/3 of arc. */
  mediumClimaxAt?: number;
}

/**
 * Phase 26: Volume — đại thần workflow's organizing unit (卷宗) for 1000+ chapter novels.
 * Each volume ~50-150 chapters, has its own theme/conflict/villain/climax. The novel's
 * 1000-chapter arc is divided into 5-15 volumes; each volume into 4-6 sub-arcs.
 */
export interface VolumeOutline {
  volumeNumber: number;          // 1-indexed
  name: string;                  // vd "Cuốn 1: Sơ Nhập Sư Môn"
  startChapter: number;
  endChapter: number;
  theme: string;                 // overall theme of the volume
  primaryConflict: string;       // what MC is fighting / building / chasing this volume
  primaryVillain?: string;       // optional, only if combat/antagonist genre
  keyPayoffsOpened: string[];    // promises planted in this volume that pay off later
  keyPayoffsClosed: string[];    // promises (planted earlier) that resolve in this volume
  volumeClimaxAt: number;        // chapter of the volume's major-climax setpiece
  subArcs: SubArcOutline[];      // 4-6 sub-arcs within this volume
}

/** Backward-compat alias: legacy code reads `majorArcs` as a flat list. */
export type MajorArc = SubArcOutline;

export interface MasterOutline {
  mainPlotline: string;
  finalBossOrGoal: string;
  worldMapProgression: string[];
  /**
   * Phase 26 hierarchical structure: 5-15 volumes, each with 4-6 sub-arcs.
   * For backward compat, `majorArcs` (below) is auto-populated as a flat list of
   * all sub-arcs across all volumes.
   */
  volumes?: VolumeOutline[];
  /**
   * Legacy flat list of arcs. Pre-Phase-26 novels have this populated directly.
   * Phase 26+ novels: auto-derived from volumes (flattened sub-arcs).
   * Always present so downstream code that reads `majorArcs` keeps working.
   */
  majorArcs: MajorArc[];
}

// Genre-aware framing for master outline. Urban/business genres use proactive
// goal-driven framing (achievement, market scale) instead of villain-first.
// P3 alignment: imported from templates.ts (single source of truth).
import { PROACTIVE_GENRES, isProactiveGenre } from '../templates';

// Combat-leaning vocabulary that LEAKS into non-combat genres — flag and sanitize.
const COMBAT_LEAK_PATTERNS = [
  /trùm cuối/i, /kẻ thù cuối/i, /đại chiến/i, /đánh bại.*kẻ thù/i,
  /giết.*kẻ thù/i, /chinh phạt/i, /chiến tranh/i, /huyết chiến/i,
  /diệt.*ma/i, /phong sát/i, /trảm.*ma/i, /thí kiếm/i,
];

const POWER_LEAK_PATTERNS = [
  /đột phá.*cảnh giới/i, /thu phục.*dị/i, /tu vi/i, /pháp bảo/i,
  /linh khí/i, /đan dược/i, /nguyên anh/i, /kim đan/i,
];

/**
 * Validate master outline doesn't leak combat/power tropes into non-combat genres.
 * Returns list of issues (empty = clean).
 */
function validateMasterOutlineForGenre(outline: MasterOutline, genre: GenreType): string[] {
  if (!isProactiveGenre(genre)) return []; // combat genres can have these

  const issues: string[] = [];
  const allText = JSON.stringify(outline).toLowerCase();

  for (const pat of COMBAT_LEAK_PATTERNS) {
    if (pat.test(allText)) issues.push(`Combat leak: ${pat.source}`);
  }
  for (const pat of POWER_LEAK_PATTERNS) {
    if (pat.test(allText)) issues.push(`Power-system leak: ${pat.source}`);
  }
  return issues;
}

/**
 * Sanitize final goal: replace combat villain framing with proactive milestone.
 */
function sanitizeFinalGoal(goal: string, genre: GenreType): string {
  if (!goal) return goal;
  let s = goal;
  // Replace common combat phrasing with milestone-style
  s = s.replace(/trùm cuối/gi, 'cột mốc tối thượng');
  s = s.replace(/kẻ thù cuối cùng/gi, 'mục tiêu cuối cùng');
  s = s.replace(/đánh bại/gi, 'vượt qua');
  s = s.replace(/diệt/gi, 'hoàn thành');
  if (genre === 'do-thi') {
    s = s.replace(/giết/gi, 'cạnh tranh thắng');
  } else if (genre === 'ngon-tinh') {
    s = s.replace(/giết/gi, 'vượt qua');
  } else if (genre === 'quan-truong') {
    s = s.replace(/giết/gi, 'hạ bệ');
  }
  return s;
}

/**
 * Sanitize milestone: remove combat keywords, replace with achievement-style.
 */
function sanitizeMilestone(milestone: string, genre: GenreType): string {
  if (!milestone) return milestone;
  let s = milestone;
  s = s.replace(/đột phá.*cảnh giới/gi, 'đạt cấp độ mới');
  s = s.replace(/thu phục.*dị/gi, 'có được tài nguyên quan trọng');
  s = s.replace(/giết kẻ thù/gi, 'vượt qua đối thủ');
  if (genre === 'do-thi') {
    s = s.replace(/đánh bại/gi, 'vượt mặt');
  }
  return s;
}

export async function generateMasterOutline(
  projectId: string,
  title: string,
  genre: GenreType,
  synopsis: string,
  totalPlannedChapters: number,
  config: GeminiConfig
): Promise<MasterOutline | null> {
  const isProactive = isProactiveGenre(genre);

  const goalGuidance = isProactive
    ? `MỤC TIÊU TỐI THƯỢỢNG cho thể loại proactive (do-thi/kinh-doanh/quan-truong/ngon-tinh): tập trung vào MILESTONE/ACHIEVEMENT của MC (xây đế chế kinh doanh đa quốc gia, leo lên đỉnh chính trường, đạt được người yêu trọn vẹn). KHÔNG ép define "kẻ thù cuối cùng" — đối thủ chỉ là COMPETITOR phản ứng theo từng giai đoạn, KHÔNG phải antagonist xuyên suốt.`
    : `MỤC TIÊU TỐI THƯỢỢNG cho thể loại fantasy/wuxia/horror: có thể là kẻ thù cuối cùng (Trùm cuối) HOẶC cảnh giới tối cao cần đạt được. Trùm cuối được giấu mặt từ đầu, rải rác manh mối.`;

  const finalGoalExample = isProactive
    ? `"Cột mốc tối thượng cuối truyện (VD: Tập đoàn đa quốc gia top 100 thế giới, Vị trí lãnh đạo cao nhất ngành, Cuộc sống gia đình hạnh phúc với người yêu)"`
    : `"Kẻ thù cuối cùng hoặc Cảnh giới tối cao cần đạt được ở cuối truyện (Được giấu mặt từ đầu nhưng rải rác manh mối)"`;

  const worldMapExample = isProactive
    ? `["Khởi nghiệp địa phương", "Mở rộng cấp tỉnh/thành", "Vươn ra cấp quốc gia", "Thâm nhập thị trường khu vực", "Đa quốc gia / dẫn đầu toàn cầu"]`
    : `["Tân thủ thôn", "Học viện", "Kinh thành", "Vực ngoại", "Thần giới"]`;

  const milestoneExample = isProactive
    ? `"Thành tựu cụ thể MC đạt được cuối Arc (VD: Mở chuỗi 50 cửa hàng, Doanh thu 100 tỷ, Ký được hợp đồng quốc tế đầu tiên, Trở thành CEO trẻ nhất ngành)"`
    : `"Thành tựu MC đạt được cuối Arc (Đột phá cảnh giới, Thu phục dị hỏa, Giết kẻ thù A)"`;

  const proactiveRule = isProactive
    ? `\n4. PROACTIVE NARRATIVE: Mỗi Arc tập trung vào HÀNH ĐỘNG + KẾT QUẢ của MC (xây dựng, đạt được, mở rộng), KHÔNG dựa vào "kẻ thù xuất hiện đe dọa MC". Đối thủ kinh doanh/chính trị chỉ REACT sau khi MC đã có thành tựu cụ thể, KHÔNG chủ động hãm hại MC trước.`
    : '';

  const genreSetup = getGenreSetupRequirements(genre);
  const genreArchGuide = getGenreArchitectGuide(genre);

  // Phase 26: volume hierarchy. Recommend 5-15 volumes × 50-150ch each, sub-divided into 4-6 sub-arcs of 20-30ch.
  const targetVolumeCount = Math.max(5, Math.min(15, Math.round(totalPlannedChapters / 100)));
  const targetSubArcsPerVolume = totalPlannedChapters >= 1000 ? '4-6 sub-arcs' : '3-5 sub-arcs';
  const targetVolumeChapters = totalPlannedChapters >= 1000 ? '80-150 chương' : '50-100 chương';

  const prompt = `Bạn là Trưởng Biên Tập (Chief Editor) chuyên quy hoạch Đại cương truyện dài kỳ (Master Outline) cho một bộ Webnovel Trung Quốc.

Nhiệm vụ của bạn là quy hoạch lộ trình tổng thể cho bộ truyện: "${title}"
Thể loại: ${genre}
${genreSetup}${genreArchGuide}
Độ dài dự kiến: ${totalPlannedChapters} chương
Tóm tắt ý tưởng gốc (Synopsis): ${synopsis}

${goalGuidance}

╔══════════════════════════════════════════════════════════════════════╗
║ ĐẠI THẦN WORKFLOW — VOLUME STRUCTURE (卷宗) cho 1000-chương novels  ║
╚══════════════════════════════════════════════════════════════════════╝

Top web novel đại thần (Mèo Béo / Phàm Nhân Tu Tiên, Nhĩ Căn / Quỷ Bí Chi Chủ,
Thiên Tằm Thổ Đậu / Đấu Phá, Ất Bí / Toàn Chức Cao Thủ) KHÔNG plan flat 8-12 arcs.
Họ tổ chức truyện thành **CUỐN (Volume)** — đơn vị tự nhiên cho narrative arc:

  - Mỗi VOLUME (Cuốn) ~${targetVolumeChapters}, có theme/conflict/villain/climax riêng
  - Mỗi volume chia thành ${targetSubArcsPerVolume} (story unit ~20-30ch)
  - Volume mở conflict mới + đóng promise cũ — biến truyện dài thành chuỗi mini-novel có closure

Hãy quy hoạch ${totalPlannedChapters} chương thành **${targetVolumeCount} volumes** với hierarchy:
  Volume 1 (~${Math.round(totalPlannedChapters / targetVolumeCount)}ch) → 4-6 sub-arcs → ...
  Volume 2 → ...
  ...
  Volume ${targetVolumeCount} → climax + finale

CHẤT LƯỢNG ĐẠI THẦN — MULTI-AXIS SUB-ARC DESCRIPTION:
Mỗi SUB-ARC PHẢI mô tả theo 6 trục:
1. theme: "khám phá", "đối kháng đầu tiên", "phản phục thù", "trưởng thành cảm xúc", "thử thách niềm tin"
2. mood: "warm-buildup", "tense-conflict", "tragic-loss", "triumphant", "melancholic", "comedic-relief"
3. biggestSetpiece: SCENE ĐINH 1-2 câu cinematic (CỤ THỂ, không generic)
4. characterArcBeat: MC thay đổi gì BÊN TRONG (internal arc, không chỉ skill upgrade)
5. worldExpansion: Vùng/thế lực/tầng thế giới mới mở ra
6. pacingTarget: "fast-action" / "balanced" / "introspective-slow" / "buildup" / "climax-dense"
7. mediumClimaxAt: Chương trong sub-arc nơi medium-climax xảy ra (sub-arc-level reveal/turn)

VOLUME-LEVEL FIELDS (NEW):
- name: tên volume nghe đại thần ("Cuốn 1: Sơ Nhập Sư Môn", "Cuốn 2: Sấm Trời Bí Cảnh")
- theme: chủ đề tổng thể volume
- primaryConflict: xung đột chính volume (concrete)
- primaryVillain: đối thủ chính volume (chỉ nếu combat/antagonist genre — non-combat genre có thể null)
- keyPayoffsOpened: 2-4 promise/foreshadowing planted in volume này, payoff ở volumes sau
- keyPayoffsClosed: 1-3 promise (planted volumes trước) RESOLVED trong volume này
- volumeClimaxAt: chương major-climax của volume (thường ~85-95% volume length)

Trả về ĐÚNG định dạng JSON sau:
{
  "mainPlotline": "Mục tiêu tối thượng xuyên suốt truyện của MC",
  "finalBossOrGoal": ${finalGoalExample},
  "worldMapProgression": ${worldMapExample},
  "volumes": [
    {
      "volumeNumber": 1,
      "name": "Cuốn 1: <tên đại thần style>",
      "startChapter": 1,
      "endChapter": 80,
      "theme": "<chủ đề volume>",
      "primaryConflict": "<conflict chính volume, concrete>",
      "primaryVillain": "<chỉ nếu có villain xuyên suốt volume; non-combat = null>",
      "keyPayoffsOpened": ["promise 1 planted volume này", "promise 2"],
      "keyPayoffsClosed": [],
      "volumeClimaxAt": 75,
      "subArcs": [
        {
          "arcName": "Sub-arc 1.1: <tên>",
          "arcNumber": 1,
          "startChapter": 1,
          "endChapter": 20,
          "description": "Nội dung sub-arc 80-120 từ — concrete events.",
          "keyMilestone": ${milestoneExample},
          "theme": "khám phá",
          "mood": "warm-buildup",
          "biggestSetpiece": "...",
          "characterArcBeat": "...",
          "worldExpansion": "...",
          "pacingTarget": "balanced",
          "mediumClimaxAt": 18
        }
      ]
    }
  ]
}

QUY TẮC PHÂN VOLUME (BẮT BUỘC):
1. SỐ VOLUME: ${targetVolumeCount} volumes cho ${totalPlannedChapters} chương. Cộng dồn endChapter của volume cuối phải = ${totalPlannedChapters}.
2. MỖI VOLUME ${targetSubArcsPerVolume}. Sub-arcs trong 1 volume nối liền: subArc[0].endChapter + 1 = subArc[1].startChapter.
3. Volume KHÔNG được dài quá 150 chương — bestseller modern không có "volume 200ch". Chia thêm volume nếu cần.
4. VOLUME 1 (early): warm-buildup hoặc balanced mood — KHÔNG tragic/loss. Reader cần engagement trước khi tin loss.
5. VOLUME CUỐI: climax-dense pacing, mood triumphant hoặc bittersweet-final.
6. characterArcBeat xuyên ${targetVolumeCount} volumes PHẢI form 1 đường cong character development chính thống.
7. keyPayoffsOpened ở volume sớm phải có volume sau closes — KHÔNG được orphan promise (mở mà không bao giờ đóng).
8. ARC 1 SẢNG VĂN HARD RULES:
   - Volume 1 description chỉ MAX 1 antagonist active LOCAL scale.
   - ZERO mysterious organization tracking MC trong volume 1-2. Tổ chức bí ẩn defer volume 3+.
   - WARM BASELINE 5 chương đầu: ZERO active threat, MC làm việc routine trong domain nhỏ.
   - ANTAGONIST PROGRESSION LADDER (volume by volume — KHÔNG NHẢY CÓC):
     * Volume 1-2: TÂN THỦ MAP — local antagonist (hàng xóm/khu phố/sư huynh)
     * Volume 3-5: HUYỆN/CITY — mid-tier (đối thủ kinh doanh huyện/quan huyện)
     * Volume 6-8: TỈNH/NATIONAL — institutional (tập đoàn lớn/quan tỉnh)
     * Volume 9+: COSMIC/WORLD — endgame (Đại đế/AI Tối Thượng/world threat)
     Cosmic tier CHỈ unlock từ volume 6+, KHÔNG mention volume 1-2.${proactiveRule}`;

  try {
    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.7,
      // Phase 23 fix: bumped 2048 → 8192. 2026-04-30 multi-axis upgrade: bumped
      // to 16384 to fit 8-12 arcs × 6 axes (theme/mood/setpiece/charArcBeat/
      // worldExpansion/pacingTarget) without truncation. Pro tier handles 16K easily.
      maxTokens: 16384,
      systemPrompt: "Bạn là Master Architect chuyên lập Đại cương tổng thể cho tiểu thuyết mạng.",
    }, { jsonMode: true, tracking: { projectId, task: 'master_outline' } });

    const parsed = parseJSON<MasterOutline>(res.content);

    if (!parsed) {
      console.error('Failed to parse master outline JSON — skipping DB save');
      return null;
    }

    // Phase 26: validate volume hierarchy. Either `volumes` (new) or `majorArcs`
    // (legacy fallback if model returned old shape) must be present + non-empty.
    const hasVolumes = Array.isArray(parsed.volumes) && parsed.volumes.length > 0;
    const hasFlatArcs = Array.isArray(parsed.majorArcs) && parsed.majorArcs.length > 0;

    if (!hasVolumes && !hasFlatArcs) {
      console.error('Master outline missing both `volumes` and `majorArcs` — DeepSeek returned incomplete shape, skipping DB save');
      return null;
    }

    // Phase 26: backward compat — flatten volumes' sub-arcs into top-level
    // majorArcs so legacy code that reads `masterOutline.majorArcs` keeps working.
    if (hasVolumes) {
      const flattened: MajorArc[] = [];
      let globalArcNumber = 1;
      for (const vol of parsed.volumes!) {
        if (!Array.isArray(vol.subArcs)) continue;
        for (const sub of vol.subArcs) {
          flattened.push({
            ...sub,
            arcNumber: sub.arcNumber ?? globalArcNumber,
          });
          globalArcNumber++;
        }
      }
      // Only overwrite majorArcs if model didn't already emit it AND we successfully flattened.
      if (flattened.length > 0) {
        parsed.majorArcs = flattened;
      }
    }

    if (!Array.isArray(parsed.majorArcs) || parsed.majorArcs.length === 0) {
      console.error('Master outline has volumes but flatten produced no majorArcs — skipping DB save');
      return null;
    }

    // Genre-aware validation: detect combat/villain leakage in non-combat genres
    const validationIssues = validateMasterOutlineForGenre(parsed, genre);
    if (validationIssues.length > 0) {
      console.warn(`[MasterOutline] Genre validation issues for ${genre}: ${validationIssues.join('; ')}`);
      // Sanitize: remove combat-leaning content for non-combat genres
      if (isProactive) {
        parsed.finalBossOrGoal = sanitizeFinalGoal(parsed.finalBossOrGoal, genre);
        parsed.majorArcs = parsed.majorArcs.map(a => ({
          ...a,
          keyMilestone: sanitizeMilestone(a.keyMilestone, genre),
        }));
      }
    }

    // Save to DB
    const db = getSupabase();
    await db.from('ai_story_projects')
      .update({ master_outline: parsed as unknown as Record<string, unknown> })
      .eq('id', projectId);

    return parsed;
  } catch (error) {
    console.error('Failed to generate master outline:', error);
    return null;
  }
}

/**
 * Story Engine — Foundation Reviewer (Phase S, 2026-05-15).
 *
 * Inspired by InkOS foundation-reviewer.ts: scored multi-dimension
 * setup quality gate that runs after all setup stages complete (before
 * trial chapter spawn). Replaces boolean pass/fail with 14-dimension
 * scoring + retry recommendation.
 *
 * Pass threshold: total ≥80/140 (avg 5.7+) AND all dims ≥6/10
 * If fail → returns retryRecommendation pointing to the stage that
 * scored worst. Caller (setup-pipeline.ts) loops max 3 attempts.
 *
 * Dimensions (each scored 0-10 by AI):
 *
 *  Idea/Kernel (3 dims):
 *   1. kernel.specificity      — every kernel field cites benchmark + diff
 *   2. kernel.dopamineClarity  — pleasureLoop has 4-6 concrete beats
 *   3. kernel.secretAirtight   — mcSecret has explicit no-leak rules
 *
 *  World (2 dims):
 *   4. world.databaseRichness  — ≥6 module types populated
 *   5. world.sustainability    — playground supports 100+ chapters
 *
 *  Cast (2 dims):
 *   6. cast.distinctness       — 4-6 chars, unique voice + intersect
 *   7. cast.intersectClarity   — each char's conflict with MC is concrete
 *
 *  Master outline (3 dims):
 *   8. outline.pacingHealth    — volume sizes consistent, climax at 2/3
 *   9. outline.antagonistLadder— peer→faction→region→world with milestones
 *  10. outline.foreshadowingPlanning — ≥6 schedule entries with pickup ch
 *
 *  Story outline (2 dims):
 *  11. story.dopamineContract  — per-chapter cadence number specified
 *  12. story.antiTropeConcreteness — ≥3 concrete + cross-validated
 *
 *  Voice & opening (2 dims):
 *  13. voice.anchorPresent     — 3 anchors generated matching genre tone
 *  14. opening.warmthCheck     — ch.1 has warm baseline, no rock-bottom
 *
 * Total: 14 dims × 0-10 = 0-140. Pass = ≥80 (avg ≥5.7) AND all dims ≥6.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import type { GeminiConfig } from '../types';

export interface FoundationDimension {
  readonly name: string;
  readonly score: number;       // 0-10
  readonly weight: number;       // 1-3 importance (currently all 1, future-proof)
  readonly feedback: string;     // why this score, what's lacking
  readonly stage: string;        // which setup stage this dim audits
}

export interface FoundationReviewResult {
  readonly passed: boolean;
  readonly totalScore: number;      // 0-140
  readonly avgScore: number;        // 0-10
  readonly minDimScore: number;
  readonly dimensions: FoundationDimension[];
  readonly overallFeedback: string;
  readonly retryRecommendation?: {
    readonly stage: string;
    readonly instruction: string;
    readonly priority: 'critical' | 'high' | 'medium';
  };
}

const PASS_THRESHOLD = 80;        // out of 140
const DIMENSION_FLOOR = 6;        // each dim must score ≥6

const FOUNDATION_REVIEWER_SYSTEM = `Bạn là Foundation Reviewer cho TruyenCity setup pipeline. Mục tiêu: chấm điểm chất lượng setup (kernel + world + cast + outline) ở 14 chiều, đưa ra điểm 0-10 cho mỗi chiều + retry recommendation nếu fail.

Tiêu chuẩn ngắn gọn:
- 9-10: outstanding — high-tier production quality (top 起点 standards)
- 7-8: good — production ready
- 5-6: passable — có issue cần fix
- 3-4: weak — re-generation needed
- 0-2: broken — fundamental design flaw

Mỗi dimension: chấm điểm + feedback CỤ THỂ (không vague), nêu rõ điểm nào lacking + cần fix gì.`;

export interface FoundationReviewInput {
  readonly projectId: string;
  /** Setup artifacts to review */
  readonly artifacts: {
    readonly positioning?: unknown;
    readonly kernel?: unknown;
    readonly worldDescription?: string;
    readonly worldCanon?: unknown;     // factions / power-system / etc.
    readonly castRoster?: unknown;
    readonly masterOutline?: unknown;
    readonly storyOutline?: unknown;
    readonly voiceAnchors?: unknown;
    readonly trialChapters?: string[];  // ch.1-3 trial text for opening warmth
  };
  /** Benchmark IDs loaded during positioning, for diff verification */
  readonly benchmarkIds?: string[];
}

const DIMENSION_DEFS: Array<{ name: string; stage: string; rubric: string }> = [
  {
    name: 'kernel.specificity',
    stage: 'idea',
    rubric: '4 kernel fields (readerFantasy/pleasureLoop/systemMechanic/mcSecret) đều CỤ THỂ, không vague; mỗi field có thể cite được benchmark differentiation contract',
  },
  {
    name: 'kernel.dopamineClarity',
    stage: 'idea',
    rubric: 'pleasureLoop có 4-6 beat rõ ràng theo cadence (vd "trigger → setup → action → payoff → tier-up"); mỗi beat <30 từ và actionable',
  },
  {
    name: 'kernel.secretAirtight',
    stage: 'idea',
    rubric: 'mcSecret có rule no-leak rõ (Phase 1-2 absolute / Phase 3+ controlled); reveal sẽ gây gì cụ thể; tại sao chưa lộ giải thích được',
  },
  {
    name: 'world.databaseRichness',
    stage: 'world',
    rubric: '≥6 module types populated: realm map / faction registry / power-system tier list / economy resources / culture-etiquette / tech-aesthetic; mỗi module có concrete detail',
  },
  {
    name: 'world.sustainability',
    stage: 'world',
    rubric: 'Phase 1 playground (locations + cast + antagonists) đủ sustain 80-100 chapters mà không repeat; novelty ladder cover toàn bộ 1000 chương target',
  },
  {
    name: 'cast.distinctness',
    stage: 'cast',
    rubric: '4-6 characters, mỗi person có distinct voice + signature trait + verbal tic; dialogue blind test phân biệt được ai nói',
  },
  {
    name: 'cast.intersectClarity',
    stage: 'cast',
    rubric: 'Mỗi character có conflict/intersect cụ thể với MC (không chung chung "ally" / "friend"); concrete shared scene + goal misalignment',
  },
  {
    name: 'outline.pacingHealth',
    stage: 'master_outline',
    rubric: 'Volume sizes ổn (8-15 volumes × 4-6 sub-arcs); mỗi sub-arc ≥10 chương; volume climax ở chương 2/3 mark of volume; total chapter spec matches target',
  },
  {
    name: 'outline.antagonistLadder',
    stage: 'master_outline',
    rubric: 'antagonist_schedule có 4 tier theo Phase: peer (Phase 1) → faction (Phase 2) → region (Phase 3) → world (Phase 4); mỗi tier có chapter milestone + tên cụ thể',
  },
  {
    name: 'outline.foreshadowingPlanning',
    stage: 'master_outline',
    rubric: 'foreshadowing_schedule có ≥6 entries {plantCh, pickupCh, hint, payoff}; spread across volumes; mỗi entry ý nghĩa cụ thể, không generic',
  },
  {
    name: 'story.dopamineContract',
    stage: 'story_outline',
    rubric: 'dopamineContract specify per-chapter cadence number (vd 2 small wow / 1 big wow per 3-5 chapters); type breakdown (face-slap / harvest / recognition / breakthrough); aligns với genre expectations',
  },
  {
    name: 'story.antiTropeConcreteness',
    stage: 'story_outline',
    rubric: '≥3 anti-tropes concrete (không "no harem" chung), không conflict với premise; specify scene-level bans không genre-level',
  },
  {
    name: 'voice.anchorPresent',
    stage: 'voice_anchor',
    rubric: '3 voice anchors generated (opening / dialogue / action); mỗi anchor 50-80 từ; tone match genre; samples có em-dash dialogue + concrete sensory detail',
  },
  {
    name: 'opening.warmthCheck',
    stage: 'trial',
    rubric: 'ch.1 trial: MC ở identity tier "established competent", golden finger active hoặc trigger trong scene 1, hook = OPPORTUNITY-driven (cơ hội tới) không THREAT-driven (MC starving); KHÔNG rock-bottom (đói lạnh / bị đuổi / ngất xỉu / amnesia)',
  },
];

export async function runFoundationReview(
  input: FoundationReviewInput,
  config: GeminiConfig,
): Promise<FoundationReviewResult> {
  const artifactsSummary = summarizeArtifacts(input.artifacts);

  const prompt = `${FOUNDATION_REVIEWER_SYSTEM}

## Setup Artifacts to Review

${artifactsSummary}

## 14 Dimensions to Score

${DIMENSION_DEFS.map((d, i) => `${i + 1}. **${d.name}** (stage: ${d.stage}) — ${d.rubric}`).join('\n')}

## Output Format (JSON)

\`\`\`json
{
  "dimensions": [
    {
      "name": "kernel.specificity",
      "score": <0-10>,
      "feedback": "<specific, actionable feedback>"
    },
    ... 13 more (in exact order above)
  ],
  "overallFeedback": "<3-5 sentence summary highlighting strongest + weakest dims + key concern>",
  "retryRecommendation": {
    "stage": "<stage name from list: idea | world | cast | master_outline | story_outline | voice_anchor | trial>",
    "instruction": "<specific, actionable instruction for re-running that stage>",
    "priority": "<critical (fundamental flaw) | high (significant lacking) | medium (improvement opportunity)>"
  }
}
\`\`\`

retryRecommendation chỉ include nếu có dim < 6 hoặc total < 80. Stage = stage với điểm thấp nhất.

Trả về JSON chính xác theo schema trên.`;

  try {
    const res = await callGemini(
      prompt,
      {
        ...config,
        temperature: 0.2,
        maxTokens: 6144,
        systemPrompt: FOUNDATION_REVIEWER_SYSTEM,
      },
      {
        jsonMode: true,
        tracking: { projectId: input.projectId, task: 'foundation_review', chapterNumber: 0 },
      },
    );

    const parsed = parseJSON<{
      dimensions: Array<{ name: string; score: number; feedback: string }>;
      overallFeedback: string;
      retryRecommendation?: { stage: string; instruction: string; priority: 'critical' | 'high' | 'medium' };
    }>(res.content);

    if (!parsed?.dimensions || parsed.dimensions.length === 0) {
      // Failed to parse — return failure with retry on idea stage
      return createFailClosedResult('AI returned invalid foundation review output');
    }

    // Phase F (2026-05-15) — validate AI returned 14 dimensions in expected
    // order. AI sometimes drops or merges dims → silent partial scoring would
    // pass projects with incomplete review. Add 0-score for missing dims.
    //
    // EXCEPTION: dims with stage='trial' require an actual ch.1 trial chapter
    // to evaluate (warmth check, opening hook). When the review runs pre-trial
    // (canon_spawn → foundation_review → ready_to_write order, no trial stage
    // in between), AI correctly omits these dims. Treat as N/A — exclude from
    // total/avg/min calculations instead of fail-closing at 0.
    const hasTrialContent = Boolean(input.artifacts.trialChapters && input.artifacts.trialChapters.length > 0);
    const dimensions: FoundationDimension[] = DIMENSION_DEFS.map(def => {
      const found = parsed.dimensions.find(d => d.name === def.name);
      if (!found) {
        const isTrialOnlyDim = def.stage === 'trial';
        if (isTrialOnlyDim && !hasTrialContent) {
          return {
            name: def.name,
            score: -1, // sentinel: N/A — excluded from aggregation
            weight: 0,
            feedback: `Dim "${def.name}" skipped: no trial chapter content available pre-write`,
            stage: def.stage,
          };
        }
        return {
          name: def.name,
          score: 0, // missing dim = 0 — fail-closed
          weight: 1,
          feedback: `Dim "${def.name}" missing from AI response — fail-closed at score 0`,
          stage: def.stage,
        };
      }
      return {
        name: def.name,
        score: Math.max(0, Math.min(10, found.score || 0)),
        weight: 1,
        feedback: found.feedback || '',
        stage: def.stage,
      };
    });

    // Aggregate only over scored dims (exclude N/A sentinels).
    const scoredDims = dimensions.filter(d => d.score >= 0);
    const totalScore = scoredDims.reduce((s, d) => s + d.score, 0);
    const avgScore = scoredDims.length > 0 ? totalScore / scoredDims.length : 0;
    const minDimScore = scoredDims.length > 0 ? Math.min(...scoredDims.map(d => d.score)) : 0;
    // Scale threshold proportionally when some dims are N/A (e.g. 13/14 scored
    // → 80 * 13/14 ≈ 74). Floor stays absolute per-dim.
    const scaledThreshold = Math.round((PASS_THRESHOLD * scoredDims.length) / DIMENSION_DEFS.length);
    const passed = totalScore >= scaledThreshold && minDimScore >= DIMENSION_FLOOR;

    let retryRecommendation = parsed.retryRecommendation;
    if (!passed && !retryRecommendation) {
      // Auto-build retry recommendation from worst-scoring dim
      const sorted = [...dimensions].sort((a, b) => a.score - b.score);
      const worst = sorted[0];
      retryRecommendation = {
        stage: worst.stage,
        instruction: `Re-run ${worst.stage} stage to address ${worst.name} score ${worst.score}: ${worst.feedback.slice(0, 200)}`,
        priority: worst.score <= 3 ? 'critical' : worst.score <= 5 ? 'high' : 'medium',
      };
    }

    return {
      passed,
      totalScore,
      avgScore: Math.round(avgScore * 10) / 10,
      minDimScore,
      dimensions,
      overallFeedback: parsed.overallFeedback || '',
      retryRecommendation: passed ? undefined : retryRecommendation,
    };
  } catch (e) {
    return createFailClosedResult(
      `Foundation review threw: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function summarizeArtifacts(artifacts: FoundationReviewInput['artifacts']): string {
  const parts: string[] = [];

  if (artifacts.positioning) {
    parts.push('### Positioning');
    parts.push(JSON.stringify(artifacts.positioning, null, 2).slice(0, 4000));
    parts.push('');
  }
  if (artifacts.kernel) {
    parts.push('### Kernel');
    parts.push(JSON.stringify(artifacts.kernel, null, 2).slice(0, 4000));
    parts.push('');
  }
  if (artifacts.worldDescription) {
    parts.push('### World description');
    parts.push(artifacts.worldDescription.slice(0, 6000));
    parts.push('');
  }
  if (artifacts.worldCanon) {
    parts.push('### World canon (factions / power-system / etc.)');
    parts.push(JSON.stringify(artifacts.worldCanon, null, 2).slice(0, 6000));
    parts.push('');
  }
  if (artifacts.castRoster) {
    parts.push('### Cast roster');
    parts.push(JSON.stringify(artifacts.castRoster, null, 2).slice(0, 5000));
    parts.push('');
  }
  if (artifacts.masterOutline) {
    parts.push('### Master outline');
    parts.push(JSON.stringify(artifacts.masterOutline, null, 2).slice(0, 8000));
    parts.push('');
  }
  if (artifacts.storyOutline) {
    parts.push('### Story outline');
    parts.push(JSON.stringify(artifacts.storyOutline, null, 2).slice(0, 5000));
    parts.push('');
  }
  if (artifacts.voiceAnchors) {
    parts.push('### Voice anchors');
    parts.push(JSON.stringify(artifacts.voiceAnchors, null, 2).slice(0, 3000));
    parts.push('');
  }
  if (artifacts.trialChapters && artifacts.trialChapters.length > 0) {
    parts.push('### Trial chapters (ch.1-3 opening review)');
    for (let i = 0; i < artifacts.trialChapters.length; i++) {
      const ch = artifacts.trialChapters[i];
      parts.push(`#### Trial ch.${i + 1} (first 2000 chars only)`);
      parts.push(ch.slice(0, 2000));
      parts.push('');
    }
  }

  return parts.join('\n');
}

function createFailClosedResult(reason: string): FoundationReviewResult {
  return {
    passed: false,
    totalScore: 0,
    avgScore: 0,
    minDimScore: 0,
    dimensions: [],
    overallFeedback: `Foundation review failed: ${reason}`,
    retryRecommendation: {
      stage: 'idea',
      instruction: `Re-run idea stage. Reviewer error: ${reason}`,
      priority: 'critical',
    },
  };
}

/**
 * Persist a foundation review result to ai_story_projects.style_directives
 * for admin dashboard visibility + history.
 */
export async function persistFoundationReview(
  projectId: string,
  result: FoundationReviewResult,
): Promise<void> {
  try {
    const db = getSupabase();
    const { data: row } = await db
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', projectId)
      .maybeSingle();
    const styleDirectives = (row?.style_directives as Record<string, unknown>) || {};
    const history = ((styleDirectives.foundation_review_history as unknown[]) || []).slice(-9);
    const updated = {
      ...styleDirectives,
      foundation_review_latest: result,
      foundation_review_history: [
        ...history,
        { ...result, timestamp: new Date().toISOString() },
      ],
    };
    const { error } = await db
      .from('ai_story_projects')
      .update({ style_directives: updated })
      .eq('id', projectId);
    if (error) {
      console.warn(
        `[FoundationReview] persist failed for ${projectId}: ${error.message}`,
      );
    }
  } catch (e) {
    console.warn(
      `[FoundationReview] persist threw for ${projectId}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

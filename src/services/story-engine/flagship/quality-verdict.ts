import type { ChapterPlanV2, StorySpecV2 } from './contracts';
import { validateChapterPlanSemantics } from './contracts';

export type QualityDecisionV2 = 'publish' | 'revise' | 'reject';
export type QualityAxisV2 =
  | 'premise_interest'
  | 'character_voice'
  | 'scene_tension'
  | 'causal_surprise'
  | 'emotional_movement'
  | 'domain_truth'
  | 'prose_naturalness'
  | 'desire_to_read_next';

export interface QualityEvidenceV2 {
  code: string;
  severity: 'critical' | 'major' | 'moderate';
  message: string;
  start: number;
  end: number;
  excerpt: string;
}

export interface CalibratedAxisInput {
  scores: Partial<Record<QualityAxisV2, number>>;
  source: 'independent_model' | 'human_blind_review' | 'golden_corpus';
  confidence: number;
}

export interface QualityVerdictV2 {
  version: 2;
  decision: QualityDecisionV2;
  confidence: number;
  hardGatePassed: boolean;
  planFidelity: number;
  axes: Record<QualityAxisV2, number>;
  evidence: QualityEvidenceV2[];
  calibratedBy: CalibratedAxisInput['source'] | 'deterministic_only';
}

const AXES: QualityAxisV2[] = [
  'premise_interest', 'character_voice', 'scene_tension', 'causal_surprise',
  'emotional_movement', 'domain_truth', 'prose_naturalness', 'desire_to_read_next',
];

const HARD_LEAKS: Array<[string, RegExp]> = [
  ['prompt_leak', /\b(?:system prompt|deepseek|gemini|api key)\b/i],
  ['context_leak', /\[(?:WORLD DESCRIPTION|CONTEXT|STORY KERNEL|VOLUME CONTEXT)/i],
  ['placeholder_leak', /<(?:MC|LOVE|CITY|COMPANY|NUMBER|TITLE|SKILL)>/],
];

function clamp(value: number): number {
  return Number(Math.max(0, Math.min(10, value)).toFixed(2));
}

function addMatches(content: string, definitions: Array<[string, RegExp]>, severity: QualityEvidenceV2['severity'], message: string): QualityEvidenceV2[] {
  const evidence: QualityEvidenceV2[] = [];
  for (const [code, pattern] of definitions) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const match of content.matchAll(globalPattern)) {
      const start = match.index || 0;
      evidence.push({
        code,
        severity,
        message,
        start,
        end: start + match[0].length,
        excerpt: match[0].slice(0, 240),
      });
    }
  }
  return evidence;
}

export function evaluateFlagshipQuality(input: {
  content: string;
  storySpec: StorySpecV2;
  chapterPlan: ChapterPlanV2;
  calibrated?: CalibratedAxisInput;
  editorEvidence?: QualityEvidenceV2[];
  hardGates?: Record<string, boolean>;
  planFidelityScore?: number;
}): QualityVerdictV2 {
  const { content, storySpec, chapterPlan, calibrated } = input;
  const evidence: QualityEvidenceV2[] = [...(input.editorEvidence || [])];
  evidence.push(...addMatches(content, HARD_LEAKS, 'critical', 'Pipeline artifact leaked into prose.'));

  if (!content.includes(storySpec.protagonist.name)) {
    evidence.push({
      code: 'protagonist_absent', severity: 'critical', message: 'Canonical protagonist is absent.',
      start: 0, end: 0, excerpt: storySpec.protagonist.name,
    });
  }
  for (const issue of validateChapterPlanSemantics(chapterPlan)) {
    evidence.push({ code: 'invalid_scene_change', severity: 'critical', message: issue.message, start: 0, end: 0, excerpt: issue.path });
  }

  const fidelity = clamp(input.planFidelityScore ?? 0);

  const missingCalibration = AXES.filter(axis => calibrated?.scores[axis] == null);
  if (!calibrated || missingCalibration.length > 0) {
    evidence.push({
      code: 'story_specific_calibration_missing', severity: 'critical',
      message: `Independent story-specific scores are required for every axis; missing: ${missingCalibration.join(',') || 'all'}.`,
      start: 0, end: 0, excerpt: storySpec.title,
    });
  }

  for (const [gate, passed] of Object.entries(input.hardGates || {})) {
    if (!passed) {
      evidence.push({ code: `hard_gate_${gate}`, severity: 'critical', message: `Independent editor failed hard gate: ${gate}.`, start: 0, end: 0, excerpt: gate });
    }
  }

  const calibratedBy = calibrated?.source || 'deterministic_only';
  const axes = Object.fromEntries(AXES.map(axis => [
    axis,
    clamp(calibrated?.scores[axis] ?? 0),
  ])) as Record<QualityAxisV2, number>;

  const critical = evidence.some(item => item.severity === 'critical');
  const major = evidence.some(item => item.severity === 'major');
  const minAxis = Math.min(...Object.values(axes));
  const independentlyCalibrated = calibrated && calibrated.confidence >= 0.65;
  const decision: QualityDecisionV2 = critical
    ? 'reject'
    : major || minAxis < 7.5 || !independentlyCalibrated
      ? 'revise'
      : 'publish';

  return {
    version: 2,
    decision,
    confidence: calibrated ? clamp(calibrated.confidence * 10) / 10 : 0.55,
    hardGatePassed: !critical,
    planFidelity: fidelity,
    axes,
    evidence,
    calibratedBy,
  };
}

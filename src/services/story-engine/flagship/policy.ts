import type { StyleDirectives } from '../types';
import type { QualityVerdictV2 } from './quality-verdict';

export function isFlagshipV2(style: StyleDirectives | null | undefined): boolean {
  return style?.pipeline_version === 'flagship_v2';
}

export function getFlagshipPublicationPolicy(style: StyleDirectives | null | undefined): {
  allowSoftGate: false;
  allowGoldenFallback: false;
  requireIndependentCalibration: true;
  publicationMode: 'automatic' | 'human_gate' | 'offline_only';
  isolatedRolePrompts: true;
} {
  return {
    allowSoftGate: false,
    allowGoldenFallback: false,
    requireIndependentCalibration: true,
    publicationMode: style?.publication_mode === 'offline_only' ? 'offline_only'
      : style?.publication_mode === 'automatic' && style.factory_enabled === true ? 'automatic' : 'human_gate',
    isolatedRolePrompts: true,
  };
}

export function canPublishFlagshipChapter(input: {
  verdict: QualityVerdictV2;
  chapterNumber: number;
  style: StyleDirectives | null | undefined;
}): { allowed: boolean; reason: string } {
  if (!isFlagshipV2(input.style)) return { allowed: false, reason: 'project is not flagship_v2' };
  if (input.verdict.decision !== 'publish') return { allowed: false, reason: `quality decision=${input.verdict.decision}` };
  if (input.style?.publication_mode === 'offline_only') return { allowed: false, reason: 'publication_mode=offline_only' };

  // Autonomous factory projects are still held to the exact same independent
  // editor verdict and hard gates.  They simply do not require a human chat
  // checkpoint on every story.  Opt-in is explicit and scoped per project;
  // absence of the flag keeps the existing human-gated pilot behaviour.
  if (input.style?.publication_mode === 'automatic' && input.style.factory_enabled === true) {
    return { allowed: true, reason: 'quality passed; autonomous factory enabled' };
  }

  const gate = input.style?.flagship_human_gate;
  const required = input.chapterNumber <= 3 ? 'story_spec'
    : input.chapterNumber <= 10 ? 'chapter_3'
      : input.chapterNumber <= 30 ? 'chapter_10'
        : input.chapterNumber <= 50 ? 'chapter_30'
          : 'chapter_50';
  const order = ['concept', 'story_spec', 'chapter_3', 'chapter_10', 'chapter_30', 'chapter_50'];
  if (!gate || order.indexOf(gate) < order.indexOf(required)) {
    return { allowed: false, reason: `human gate ${required} not approved` };
  }
  return { allowed: true, reason: 'quality and human gates passed' };
}

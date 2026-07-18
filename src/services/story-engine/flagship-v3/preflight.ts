import type { ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';
import { V3_CHAPTER_LENGTH_POLICY } from './prompts';

export interface V3Evidence {
  code: string;
  severity: 'critical' | 'major' | 'moderate';
  message: string;
  start: number;
  end: number;
  excerpt: string;
  local: boolean;
}

const PATTERNS: Array<{
  code: string;
  severity: V3Evidence['severity'];
  message: string;
  pattern: RegExp;
  local: boolean;
}> = [
  {
    code: 'foreign_cjk_text',
    severity: 'major',
    message: 'Prose contains CJK characters outside Vietnamese text.',
    pattern: /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g,
    local: true,
  },
  {
    code: 'foreign_script_text',
    severity: 'major',
    message: 'Prose contains characters from a foreign script outside natural Vietnamese text.',
    pattern: /[\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Georgian}\p{Script=Armenian}]+/gu,
    local: true,
  },
  {
    code: 'pipeline_leak',
    severity: 'critical',
    message: 'Pipeline, schema or model artifact leaked into prose.',
    pattern: /\b(?:system prompt|chapterplan|storykernel|schemaVersion|gemini|deepseek|openai|api key)\b/gi,
    local: true,
  },
  {
    code: 'placeholder_leak',
    severity: 'critical',
    message: 'Unresolved placeholder leaked into prose.',
    pattern: /<(?:MC|CHARACTER|LOCATION|RESOURCE|PROMISE|TITLE|NUMBER)>/g,
    local: true,
  },
  {
    code: 'robotic_status_prose',
    severity: 'major',
    message: 'Narration reads like a task or state report.',
    pattern: /(?:công đoạn|quá trình|nhiệm vụ|mục tiêu).{0,45}(?:đã hoàn thành|đã bắt đầu|được bảo vệ an toàn)/gi,
    local: true,
  },
];

function matches(content: string): V3Evidence[] {
  return PATTERNS.flatMap(definition => [...content.matchAll(definition.pattern)].map(match => ({
    code: definition.code,
    severity: definition.severity,
    message: definition.message,
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
    excerpt: match[0],
    local: definition.local,
  })));
}

function planPhrases(plan: ChapterPlanV3): string[] {
  return [
    plan.chapterPromise,
    plan.nextChapterPressure,
    ...plan.scenes.flatMap(scene => [
      scene.objective,
      scene.obstacle,
      scene.action,
    ]),
  ].map(value => value.trim()).filter(value => value.length >= 36);
}

export function runV3ProsePreflight(content: string, plan: ChapterPlanV3): V3Evidence[] {
  const evidence = matches(content);
  for (const phrase of planPhrases(plan)) {
    const start = content.indexOf(phrase);
    if (start >= 0) {
      evidence.push({
        code: 'plan_verbatim_leak',
        severity: 'critical',
        message: 'Writer copied a planning sentence verbatim instead of dramatizing it.',
        start,
        end: start + phrase.length,
        excerpt: phrase,
        local: true,
      });
    }
  }
  return evidence;
}

export function runV3StructuredProsePreflight(input: {
  content: string;
  scenes: Array<{ sceneId: string; content: string }>;
  plan: ChapterPlanV3;
  targetWordCount: number;
  previousChapterTail?: string;
  kernel?: StoryKernelV3;
  state?: StoryStateV3;
}): V3Evidence[] {
  const evidence = runV3ProsePreflight(input.content, input.plan);
  const words = input.content.trim().split(/\s+/u).filter(Boolean).length;
  const minimumWords = V3_CHAPTER_LENGTH_POLICY.hardMinWords;
  if (words < V3_CHAPTER_LENGTH_POLICY.hardMinWords) {
    evidence.push({
      code: 'chapter_under_target', severity: 'major',
      message: `Chapter has ${words} words; deterministic floor is ${minimumWords}.`,
      start: 0, end: input.content.length, excerpt: input.content.slice(0, 240), local: false,
    });
  }
  if (words > V3_CHAPTER_LENGTH_POLICY.hardMaxWords) {
    evidence.push({
      code: 'chapter_over_limit', severity: 'major',
      message: `Chapter has ${words} words; deterministic ceiling is ${V3_CHAPTER_LENGTH_POLICY.hardMaxWords}.`,
      start: 0, end: input.content.length, excerpt: input.content.slice(-240), local: false,
    });
  }

  if (input.previousChapterTail) {
    const reusableSegments = input.previousChapterTail
      .split(/(?:\n\s*\n|(?<=[.!?…])\s+)/u)
      .map(item => item.trim())
      .filter(item => item.length >= 120 && item.split(/\s+/u).length >= 20);
    for (const segment of reusableSegments) {
      const start = input.content.indexOf(segment);
      if (start >= 0) {
        evidence.push({
          code: 'previous_chapter_verbatim_repeat', severity: 'major',
          message: 'Writer repeated a long span from the published previous chapter instead of continuing it.',
          start, end: start + segment.length, excerpt: segment, local: true,
        });
        break;
      }
    }
  }
  let offset = 0;
  const perSceneFloor = Math.max(100, Math.floor(minimumWords / Math.max(1, input.scenes.length) * 0.35));
  for (const scene of input.scenes) {
    const start = input.content.indexOf(scene.content, offset);
    const sceneStart = start >= 0 ? start : offset;
    const sceneEnd = sceneStart + scene.content.length;
    const sceneWords = scene.content.trim().split(/\s+/u).filter(Boolean).length;
    if (sceneWords < perSceneFloor) {
      evidence.push({
        code: 'scene_underdeveloped', severity: 'major',
        message: `Scene ${scene.sceneId} has only ${sceneWords} words and is not a complete dramatic unit.`,
        start: sceneStart, end: sceneEnd, excerpt: scene.content.slice(0, 240), local: false,
      });
    }
    const paragraphs = scene.content.split(/\n\s*\n/u).filter(part => part.trim().length > 0);
    if (scene.content.length >= 1_500 && paragraphs.length < 3) {
      evidence.push({
        code: 'scene_wall_of_text', severity: 'major',
        message: `Scene ${scene.sceneId} is a wall of text instead of readable dramatized prose.`,
        start: sceneStart, end: sceneEnd, excerpt: scene.content.slice(0, 240), local: false,
      });
    }
    offset = sceneEnd;
  }

  const clichePatterns = [
    /xé toạc (?:màn đêm|không khí)/giu,
    /cắn nát sỏi đá/giu,
    /(?:đau|day dứt|cắn rứt) (?:đến|tận) tâm can/giu,
    /ngọn lửa.{0,50}huyết quản/giu,
    /mỏ vàng (?:bị )?chôn vùi/giu,
    /tia hy vọng.{0,60}(?:tăm tối|tuyệt vọng)/giu,
    /linh hồn (?:cựu binh|lão luyện).{0,30}(?:thương trường|tái sinh)/giu,
    /ánh mắt.{0,50}(?:ngọn hải đăng|sắc như dao)/giu,
  ];
  const cliches = clichePatterns.flatMap(pattern => [...input.content.matchAll(pattern)]);
  if (cliches.length >= 3) {
    const first = Math.min(...cliches.map(match => match.index || 0));
    const last = Math.max(...cliches.map(match => (match.index || 0) + match[0].length));
    evidence.push({
      code: 'ai_cliche_cluster', severity: 'major',
      message: `Chapter contains a cluster of ${cliches.length} high-signal formulaic AI metaphors.`,
      start: first, end: last, excerpt: input.content.slice(first, Math.min(last, first + 500)), local: false,
    });
  }

  if (input.kernel && input.state) {
    const definitions = new Map(input.kernel.resources.map(resource => [resource.id, resource]));
    const cashIsZero = input.state.resources.some(resource => {
      const definition = definitions.get(resource.resourceId);
      return resource.value.mode === 'numeric'
        && resource.value.amount === 0
        && !!definition
        && /(?:tiền|đồng|vnd|cash)/iu.test(`${definition.name} ${definition.unit || ''}`);
    });
    if (cashIsZero) {
      for (const match of input.content.matchAll(/(?:mình|nhà|ta|anh|em).{0,18}(?:để|giữ|còn)\s+(?:số\s+)?tiền\s+(?:đó|lại)|(?:vẫn|còn)\s+(?:số\s+)?tiền\b/giu)) {
        evidence.push({
          code: 'zero_cash_claim_conflict', severity: 'major',
          message: 'Prose claims the household still has money although the committed cash ledger is zero.',
          start: match.index || 0, end: (match.index || 0) + match[0].length, excerpt: match[0], local: true,
        });
      }
    }
  }
  return evidence;
}

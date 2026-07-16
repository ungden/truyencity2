import type { ChapterPlanV3 } from './contracts';

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
      scene.desire,
      scene.opposition,
      scene.tactic,
      scene.cost,
      scene.payoff,
      scene.irreversibleChange,
      scene.informationDelta,
      scene.unresolvedQuestion,
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

import type { CriticIssue, StoryRules, StyleDirectives } from '../types';

export interface RuleViolation {
  rule: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  detail: string;
  count?: number;
}

const DEFAULT_RULES: Required<Pick<StoryRules, 'chapter_words' | 'forbidden_phrases' | 'fatigue_words' | 'required_currency'>> = {
  chapter_words: { min: 1200, max: 2600 },
  forbidden_phrases: [
    'động cơ cốt lõi',
    'lợi ích tối đa',
    'ranh giới thông tin',
    'độc giả có thể',
  ],
  fatigue_words: {
    'đột nhiên': 4,
    'có lẽ': 4,
    'dường như': 4,
    'không ngờ': 3,
  },
  required_currency: 'VND',
};

export function resolveStoryRules(styleDirectives?: StyleDirectives | null): StoryRules {
  const raw = styleDirectives?.story_rules || {};
  return {
    chapter_words: {
      min: sanitizePositiveInt(raw.chapter_words?.min) ?? DEFAULT_RULES.chapter_words.min,
      max: sanitizePositiveInt(raw.chapter_words?.max) ?? DEFAULT_RULES.chapter_words.max,
    },
    forbidden_phrases: uniqueStrings([
      ...DEFAULT_RULES.forbidden_phrases,
      ...(Array.isArray(raw.forbidden_phrases) ? raw.forbidden_phrases : []),
    ]),
    fatigue_words: {
      ...DEFAULT_RULES.fatigue_words,
      ...(raw.fatigue_words && typeof raw.fatigue_words === 'object' ? raw.fatigue_words : {}),
    },
    required_currency: raw.required_currency || DEFAULT_RULES.required_currency,
    preferences: typeof raw.preferences === 'string' ? raw.preferences.trim() : undefined,
  };
}

export function formatStoryRulesForPrompt(rules: StoryRules): string {
  const lines = ['[PROJECT STORY RULES — LUẬT CỤ THỂ CỦA TRUYỆN]'];
  if (rules.chapter_words?.min || rules.chapter_words?.max) {
    lines.push(`Chapter words: ${rules.chapter_words.min ?? '?'}-${rules.chapter_words.max ?? '?'} từ.`);
  }
  if (rules.required_currency && rules.required_currency !== 'auto') {
    lines.push(`Currency: dùng ${rules.required_currency}; tránh đơn vị tiền sai setting.`);
  }
  if (rules.forbidden_phrases?.length) {
    lines.push(`Forbidden phrases: ${rules.forbidden_phrases.slice(0, 20).join(' | ')}`);
  }
  if (rules.fatigue_words && Object.keys(rules.fatigue_words).length > 0) {
    lines.push(`Fatigue caps: ${Object.entries(rules.fatigue_words).slice(0, 20).map(([word, cap]) => `${word}<=${cap}`).join(' | ')}`);
  }
  if (rules.preferences) lines.push(`Preferences: ${rules.preferences}`);
  lines.push('→ Critic phải coi các violation này là facts: sửa prose, không bào chữa.');
  return lines.join('\n');
}

export function validateStoryRules(content: string, rules: StoryRules, wordCount?: number): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const words = wordCount ?? countWords(content);
  const min = rules.chapter_words?.min;
  const max = rules.chapter_words?.max;
  if (min && words < min) {
    violations.push({
      rule: 'chapter_words.min',
      severity: words < min * 0.75 ? 'major' : 'moderate',
      detail: `Chapter too short: ${words} words < min ${min}`,
      count: words,
    });
  }
  if (max && words > max) {
    violations.push({
      rule: 'chapter_words.max',
      severity: words > max * 1.25 ? 'major' : 'moderate',
      detail: `Chapter too long: ${words} words > max ${max}`,
      count: words,
    });
  }

  const lower = content.toLowerCase();
  for (const phrase of rules.forbidden_phrases || []) {
    const normalized = phrase.trim().toLowerCase();
    if (!normalized) continue;
    const count = countOccurrences(lower, normalized);
    if (count > 0) {
      violations.push({
        rule: 'forbidden_phrases',
        severity: 'critical',
        detail: `Forbidden phrase "${phrase}" appears ${count} time(s)`,
        count,
      });
    }
  }

  for (const [word, cap] of Object.entries(rules.fatigue_words || {})) {
    const normalized = word.trim().toLowerCase();
    const limit = sanitizePositiveInt(cap);
    if (!normalized || !limit) continue;
    const count = countOccurrences(lower, normalized);
    if (count > limit) {
      violations.push({
        rule: 'fatigue_words',
        severity: count > limit * 2 ? 'major' : 'moderate',
        detail: `Fatigue word "${word}" appears ${count} times > cap ${limit}`,
        count,
      });
    }
  }

  if (rules.required_currency === 'VND') {
    const wrongCurrency = content.match(/\b\d[\d.,]*\s*(?:xu|nguyên|rmb|usd|dollar|đô la)\b/gi) || [];
    if (wrongCurrency.length > 0) {
      violations.push({
        rule: 'required_currency',
        severity: 'major',
        detail: `Possible non-VND currency terms: ${wrongCurrency.slice(0, 5).join(', ')}`,
        count: wrongCurrency.length,
      });
    }
  }

  return violations;
}

export function ruleViolationsToCriticIssues(violations: RuleViolation[]): CriticIssue[] {
  return violations.map((v) => ({
    type: 'quality',
    severity: v.severity,
    description: `[story_rules/${v.rule}] ${v.detail}`,
    suggestion: 'Sửa chương để tuân thủ project story_rules trước khi publish.',
  }));
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function sanitizePositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean))];
}

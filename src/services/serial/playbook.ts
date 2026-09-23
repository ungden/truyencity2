import { z } from 'zod';
import raw from './playbook.json';

/**
 * Craft that dates, kept as data.
 *
 * The prompts used to carry these rules as hard-coded prose. Three separate craft
 * corrections in one afternoon — advantages that punish their owner, business that
 * crawls instead of jumping, gimmick conditions bolted onto the premise — each meant
 * editing TypeScript, re-running the suite and shipping a deploy to change a sentence
 * about taste. Taste moves faster than that.
 *
 * The seam: code owns contracts and invariants, this playbook owns taste. A rule
 * carries the evidence it came from and the date it was last checked, so a stale rule
 * is visible instead of quietly wrong.
 */

const PayoffKindSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9_]{2,32}$/),
  name: z.string().trim().min(1).max(60),
  note: z.string().trim().min(1).max(400),
  addedAt: z.string().trim().optional(),
  evidence: z.string().trim().optional(),
}).strict();

export const CRAFT_ROLES = ['writer', 'premise', 'planner', 'judge'] as const;
export type CraftRole = (typeof CRAFT_ROLES)[number];

const CraftRuleSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9_]{3,48}$/),
  role: z.enum(['shared', ...CRAFT_ROLES]),
  status: z.enum(['active', 'retired']),
  /** When the evidence behind this rule was last checked, not when it was written. */
  observedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence: z.string().trim().min(3),
  text: z.string().trim().min(20),
  supersedes: z.string().trim().optional(),
}).strict();

/**
 * Directions that forbid the payoffs the genre is read for. Each one was written as a
 * reasonable-sounding fix — "don't add transactions just to look like progress", "don't
 * penalise a chapter for lacking a payoff" — and each time the engine obeyed it into
 * chapters where nothing happened (2026-08 factory, 2026-09-21 lived-causality). A
 * playbook containing one is rejected at load, whether it comes from this file or a
 * database row later. Fix a weak chapter at premise or plan, never by forbidding events.
 * See docs/WRITING_SYSTEM_AUDIT_2026-09-23.md.
 */
export const ANTI_PAYOFF_PATTERNS: RegExp[] = [
  /không (?:tự )?thêm (?:khách hàng|giao dịch|cấp bậc|đám đông|tên mới)/iu,
  /không (?:phạt|trừ điểm)[^.\n]{0,60}(?:thiếu|chưa có) (?:giao dịch|tăng cấp|tên mới|payoff|phần thưởng|nhân chứng|hook)/iu,
  /không đòi[^.\n]{0,40}(?:kiếm tiền|cấp bậc|tên mới|người chứng kiến|payoff)/iu,
  /không khóa số chương phải (?:bán hàng|lên cấp)/iu,
  /chưa phải lúc ép payoff/iu,
  /(?:được phép|có thể) (?:là trọng tâm|có trọng lượng) dù chưa (?:kiếm tiền|lên cấp)/iu,
];

export function antiPayoffViolations(text: string): string[] {
  return ANTI_PAYOFF_PATTERNS.filter(pattern => pattern.test(text)).map(pattern => pattern.source);
}

export const PlaybookSchema = z.object({
  version: z.string().trim().min(3),
  note: z.string().trim().optional(),
  /**
   * Genre conventions the convert-novel reader already knows: realm ladders, spirit
   * stone denominations, sect and market structures, and — the one that bit us — how
   * goods from the other world actually become money on Earth. Free-form on purpose:
   * it is reference the premise writer reads, not a contract anything validates.
   */
  genreCanon: z.record(z.unknown()).optional(),
  payoffKinds: z.array(PayoffKindSchema).min(5),
  rules: z.array(CraftRuleSchema).min(1),
}).strict().superRefine((book, ctx) => {
  book.rules.forEach((rule, index) => {
    const violations = antiPayoffViolations(rule.text);
    if (violations.length) ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rules', index, 'text'],
      message: `Rule ${rule.id} forbids a payoff (${violations.join(', ')}). Fix weak chapters at premise or plan instead.`,
    });
  });
});

export type Playbook = z.infer<typeof PlaybookSchema>;
export type CraftRule = z.infer<typeof CraftRuleSchema>;

let override: Playbook | null = null;

/** Lets a caller swap the playbook — a test fixture today, a database row later. */
export function setPlaybook(next: Playbook | null): void {
  override = next ? PlaybookSchema.parse(next) : null;
}

export function playbook(): Playbook {
  return override ?? PlaybookSchema.parse(raw);
}

export function activeRules(role: CraftRole): CraftRule[] {
  return playbook().rules.filter(rule => (rule.role === 'shared' || rule.role === role) && rule.status === 'active');
}

/** Shared editorial direction and role-specific craft, each included once. */
export function craftBlock(role: CraftRole): string {
  return activeRules(role).map(rule => rule.text).join('\n\n');
}

/** Genre reference handed to the premise writer so it stops inventing broken economics. */
export function genreCanonBlock(): string {
  const canon = playbook().genreCanon;
  return canon ? JSON.stringify(canon, null, 1) : '';
}

/** Open registry: a new beat kind is a data edit, never a schema migration. */
export function payoffKindIds(): string[] {
  return playbook().payoffKinds.map(kind => kind.id);
}

export function isPayoffKind(value: string): boolean {
  return payoffKindIds().includes(value);
}

/** Rules whose evidence has not been rechecked in `days`. Surfaced by `npm run craft:audit`. */
export function staleRules(days = 120, now = new Date()): Array<CraftRule & { ageDays: number }> {
  return playbook().rules.filter(rule => rule.status === 'active')
    .map(rule => ({
      ...rule,
      ageDays: Math.floor((now.getTime() - new Date(rule.observedAt).getTime()) / 86_400_000),
    }))
    .filter(rule => rule.ageDays >= days)
    .sort((a, b) => b.ageDays - a.ageDays);
}

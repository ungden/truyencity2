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
  role: z.enum(CRAFT_ROLES),
  status: z.enum(['active', 'retired']),
  /** When the evidence behind this rule was last checked, not when it was written. */
  observedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence: z.string().trim().min(3),
  text: z.string().trim().min(20),
  supersedes: z.string().trim().optional(),
}).strict();

export const PlaybookSchema = z.object({
  version: z.string().trim().min(3),
  note: z.string().trim().optional(),
  payoffKinds: z.array(PayoffKindSchema).min(5),
  rules: z.array(CraftRuleSchema).min(1),
}).strict();

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
  return playbook().rules.filter(rule => rule.role === role && rule.status === 'active');
}

/** The rules for one role, joined into the block a prompt appends. */
export function craftBlock(role: CraftRole): string {
  return activeRules(role).map(rule => rule.text).join('\n\n');
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
  return activeRules('writer').concat(activeRules('premise'), activeRules('planner'), activeRules('judge'))
    .map(rule => ({
      ...rule,
      ageDays: Math.floor((now.getTime() - new Date(rule.observedAt).getTime()) / 86_400_000),
    }))
    .filter(rule => rule.ageDays >= days)
    .sort((a, b) => b.ageDays - a.ageDays);
}

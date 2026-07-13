import { z } from 'zod';
import { PortfolioSlotIdV1Schema, type PortfolioManifestV1 } from './portfolio';

const concrete = z.string().trim().min(20);
const named = z.string().trim().min(2);
export const ChineseBenchmarkIdV1Schema = z.string().regex(/^benchmark_(hx|th|dt)_\d{2}$/);

const OfficialChineseSourceUrlSchema = z.string().url().superRefine((value, ctx) => {
  const hostname = new URL(value).hostname.replace(/^www\./, '');
  const allowed = ['qidian.com', 'chinawriter.com.cn', 'cssn.cn'];
  if (!allowed.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Benchmark source must be an official platform or research publisher, got ${hostname}.` });
  }
});

export const ChineseComparableWorkV1Schema = z.object({
  title: named,
  author: z.string().trim().min(1),
  transferableMechanism: concrete,
  doNotCopy: concrete,
}).strict();

export const ChineseBenchmarkPackV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: ChineseBenchmarkIdV1Schema,
  slotId: PortfolioSlotIdV1Schema,
  researchedAt: z.string().datetime(),
  usage: z.literal('upstream_concept_lab_only'),
  mustNeverReachChapterRoles: z.literal(true),
  inspirationMode: z.literal('mechanisms_not_expression'),
  sourceUrls: z.array(OfficialChineseSourceUrlSchema).min(3).max(8),
  comparables: z.array(ChineseComparableWorkV1Schema).min(6).max(10),
  mechanismConvergences: z.array(concrete).min(3).max(8),
  differentiationMandates: z.array(concrete).min(3).max(8),
  saturationRisks: z.array(concrete).min(3).max(8),
  worldProofTests: z.array(concrete).min(4).max(8),
  vietnamizationQuestions: z.array(concrete).min(3).max(8),
}).strict().superRefine((pack, ctx) => {
  if (pack.id !== `benchmark_${pack.slotId.toLowerCase().replace('-', '_')}`) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['id'], message: 'Benchmark id must be derived from slotId.' });
  }
  if (new Set(pack.sourceUrls).size !== pack.sourceUrls.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceUrls'], message: 'Benchmark source URLs must be unique.' });
  }
  const titles = pack.comparables.map(work => work.title.trim().toLocaleLowerCase('zh-CN'));
  if (new Set(titles).size !== titles.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['comparables'], message: 'Comparable titles must be unique inside a benchmark pack.' });
  }
});

export const ChineseBenchmarkRegistryV1Schema = z.object({
  schemaVersion: z.literal(1),
  portfolioId: z.literal('flagship-first-30'),
  packs: z.array(ChineseBenchmarkPackV1Schema).length(9),
}).strict().superRefine((registry, ctx) => {
  const ids = new Set<string>();
  const slots = new Set<string>();
  registry.packs.forEach((pack, index) => {
    if (ids.has(pack.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packs', index, 'id'], message: 'Duplicate benchmark id.' });
    if (slots.has(pack.slotId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packs', index, 'slotId'], message: 'Duplicate benchmark slot.' });
    ids.add(pack.id);
    slots.add(pack.slotId);
  });
});

export const BenchmarkConceptGuidanceV1Schema = z.object({
  benchmarkId: ChineseBenchmarkIdV1Schema,
  mechanismConvergences: z.array(concrete).min(3).max(8),
  differentiationMandates: z.array(concrete).min(3).max(8),
  saturationRisks: z.array(concrete).min(3).max(8),
  worldProofTests: z.array(concrete).min(4).max(8),
  vietnamizationQuestions: z.array(concrete).min(3).max(8),
}).strict();

export type ChineseBenchmarkPackV1 = z.infer<typeof ChineseBenchmarkPackV1Schema>;
export type ChineseBenchmarkRegistryV1 = z.infer<typeof ChineseBenchmarkRegistryV1Schema>;
export type BenchmarkConceptGuidanceV1 = z.infer<typeof BenchmarkConceptGuidanceV1Schema>;

export function distillBenchmarkForConceptLab(pack: ChineseBenchmarkPackV1): BenchmarkConceptGuidanceV1 {
  return BenchmarkConceptGuidanceV1Schema.parse({
    benchmarkId: pack.id,
    mechanismConvergences: pack.mechanismConvergences,
    differentiationMandates: pack.differentiationMandates,
    saturationRisks: pack.saturationRisks,
    worldProofTests: pack.worldProofTests,
    vietnamizationQuestions: pack.vietnamizationQuestions,
  });
}

export function validateBenchmarkCoverage(
  manifest: PortfolioManifestV1,
  registryInput: unknown,
): ChineseBenchmarkRegistryV1 {
  const registry = ChineseBenchmarkRegistryV1Schema.parse(registryInput);
  const expected = manifest.slots
    .filter(slot => slot.promotionCohort === 'opening_tournament')
    .map(slot => slot.slotId)
    .sort();
  const actual = registry.packs.map(pack => pack.slotId).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`Chinese benchmark coverage mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}.`);
  }
  return registry;
}

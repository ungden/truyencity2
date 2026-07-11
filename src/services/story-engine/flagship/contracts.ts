import { z } from 'zod';

const nonGeneric = z.string().trim().min(20);
const namedText = z.string().trim().min(2);

export const StorySpecV2Schema = z.object({
  schemaVersion: z.literal(2),
  pipelineVersion: z.literal('flagship_v2'),
  title: namedText,
  genre: z.enum([
    'tien-hiep', 'huyen-huyen', 'do-thi', 'kiem-hiep', 'lich-su', 'khoa-huyen',
    'vong-du', 'dong-nhan', 'mat-the', 'linh-di', 'quan-truong', 'di-gioi',
    'ngon-tinh', 'quy-tac-quai-dam', 'ngu-thu-tien-hoa', 'khoai-xuyen',
  ]),
  storyIdentity: z.object({
    uniqueMechanism: nonGeneric,
    emotionalCore: nonGeneric,
    domainTruthSources: z.array(nonGeneric).min(3).max(10),
    forbiddenGenericMoves: z.array(nonGeneric).min(5).max(20),
    similarityRisks: z.array(nonGeneric).min(3).max(10),
  }).strict(),
  readerFantasy: nonGeneric,
  premise: nonGeneric,
  endingDirection: nonGeneric,
  protagonist: z.object({
    name: namedText,
    publicIdentity: nonGeneric,
    desire: nonGeneric,
    contradiction: nonGeneric,
    competence: nonGeneric,
    blindSpot: nonGeneric,
    voiceContract: nonGeneric,
  }),
  cast: z.array(z.object({
    name: namedText,
    agenda: nonGeneric,
    leverage: nonGeneric,
    conflictWithProtagonist: nonGeneric,
    voiceContract: nonGeneric,
    firstAppearanceChapter: z.number().int().min(1).max(30),
  })).min(4).max(8),
  causalWorldRules: z.array(z.object({
    rule: nonGeneric,
    consequence: nonGeneric,
    evidenceSource: nonGeneric,
  })).min(4).max(12),
  resourceEconomy: z.array(z.object({
    resource: namedText,
    source: nonGeneric,
    spendRule: nonGeneric,
    scarcity: nonGeneric,
  })).min(3).max(10),
  conflictLadder: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    actor: namedText,
    stake: nonGeneric,
    escalationCause: nonGeneric,
    resolutionChanges: nonGeneric,
  })).min(3).max(6),
  promisePayoffLedger: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
    promise: nonGeneric,
    plantedByChapter: z.number().int().min(1).max(30),
    payoffWindow: z.string().regex(/^\d+-\d+$/),
    payoff: nonGeneric,
  })).min(5).max(15),
  runway30: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    irreversibleChange: nonGeneric,
    protagonistChoice: nonGeneric,
    payoff: nonGeneric,
  })).min(5).max(10),
  volumeSpine: z.array(z.object({
    name: namedText,
    direction: nonGeneric,
    terminalChange: nonGeneric,
  })).min(3).max(8),
}).strict();

export type StorySpecV2 = z.infer<typeof StorySpecV2Schema>;

export const ArcPlanV2Schema = z.object({
  schemaVersion: z.literal(2),
  arcId: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
  startChapter: z.number().int().min(1),
  endChapter: z.number().int().min(1),
  direction: nonGeneric,
  terminalChange: nonGeneric,
  activeConflicts: z.array(z.object({
    actor: namedText,
    objective: nonGeneric,
    leverage: nonGeneric,
    nextMove: nonGeneric,
  }).strict()).min(1).max(8),
  duePromises: z.array(z.string().regex(/^[a-z0-9][a-z0-9_-]+$/)).max(10),
  rollingBeats: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    pressure: nonGeneric,
    causalChange: nonGeneric,
  }).strict()).min(2).max(10),
}).strict().superRefine((arc, ctx) => {
  if (arc.endChapter < arc.startChapter || arc.endChapter - arc.startChapter > 29) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endChapter'], message: 'Arc must cover 1-30 ordered chapters.' });
  }
});

export type ArcPlanV2 = z.infer<typeof ArcPlanV2Schema>;

export const StoryStateV2Schema = z.object({
  schemaVersion: z.literal(2),
  chapterNumber: z.number().int().min(0),
  facts: z.record(z.string(), z.string()),
  timeline: z.array(z.object({
    chapter: z.number().int().min(0),
    event: nonGeneric,
  }).strict()).max(80),
  cast: z.array(z.object({
    name: namedText,
    status: z.enum(['alive', 'dead', 'missing', 'unknown']),
    location: z.string().trim().min(2),
    knowledge: z.array(z.string().trim().min(5)).max(20),
    relationshipToProtagonist: z.string().trim().min(5),
  }).strict()).max(20),
  resources: z.array(z.object({
    resource: namedText,
    amount: z.string().trim().min(1),
    source: z.string().trim().min(5),
    lastChangedChapter: z.number().int().min(0),
  }).strict()).max(20),
  promises: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
    status: z.enum(['open', 'advanced', 'paid', 'broken']),
    currentPressure: z.string().trim().min(5),
  }).strict()).max(30),
  recentSummary: z.string().max(5000),
  previousEnding: z.string().max(6000),
  retrievalNotes: z.array(z.string().trim().min(10)).max(12),
}).strict();

export type StoryStateV2 = z.infer<typeof StoryStateV2Schema>;

export const ChapterSceneV2Schema = z.object({
  id: z.string().regex(/^scene_[a-z0-9_-]+$/),
  pov: namedText,
  desire: nonGeneric,
  opposition: nonGeneric,
  tactic: nonGeneric,
  irreversibleChange: nonGeneric,
  informationDelta: nonGeneric,
  cost: nonGeneric,
  payoff: nonGeneric,
  exitHook: nonGeneric,
}).strict();

export const ChapterPlanV2Schema = z.object({
  schemaVersion: z.literal(2),
  chapterNumber: z.number().int().min(1),
  chapterPromise: nonGeneric,
  stateBefore: z.record(z.string(), z.string()),
  scenes: z.array(ChapterSceneV2Schema).min(2).max(5),
  stateAfter: z.record(z.string(), z.string()),
  promisesAdvanced: z.array(z.string()).max(5),
  promisesPaid: z.array(z.string()).max(3),
  nextChapterPressure: nonGeneric,
  stateDelta: z.object({
    facts: z.record(z.string(), z.string()),
    cast: z.array(z.object({
      name: namedText,
      status: z.enum(['alive', 'dead', 'missing', 'unknown']).optional(),
      location: z.string().trim().min(2).optional(),
      learned: z.array(z.string().trim().min(5)).max(10),
      relationshipChange: z.string().trim().min(5).optional(),
    }).strict()).max(12),
    resources: z.array(z.object({
      resource: namedText,
      amountAfter: z.string().trim().min(1),
      source: z.string().trim().min(5),
    }).strict()).max(12),
    promises: z.array(z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
      status: z.enum(['open', 'advanced', 'paid', 'broken']),
      currentPressure: z.string().trim().min(5),
    }).strict()).max(10),
  }).strict(),
}).strict();

export type ChapterPlanV2 = z.infer<typeof ChapterPlanV2Schema>;
export type ChapterSceneV2 = z.infer<typeof ChapterSceneV2Schema>;

export interface ContractIssue {
  path: string;
  message: string;
}

export function parseStorySpecV2(input: unknown): { success: true; data: StorySpecV2 } | { success: false; issues: ContractIssue[] } {
  const result = StorySpecV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  };
}

export function parseChapterPlanV2(input: unknown): { success: true; data: ChapterPlanV2 } | { success: false; issues: ContractIssue[] } {
  const result = ChapterPlanV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  };
}

export function parseArcPlanV2(input: unknown): { success: true; data: ArcPlanV2 } | { success: false; issues: ContractIssue[] } {
  const result = ArcPlanV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) };
}

export function parseStoryStateV2(input: unknown): { success: true; data: StoryStateV2 } | { success: false; issues: ContractIssue[] } {
  const result = StoryStateV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) };
}

export function sceneCreatesStateChange(scene: ChapterSceneV2): boolean {
  const normalized = `${scene.irreversibleChange} ${scene.informationDelta} ${scene.cost} ${scene.payoff}`.toLowerCase();
  const emptySignals = [
    'không có gì thay đổi', 'mọi thứ như cũ', 'chỉ để giới thiệu', 'không đáng kể',
    'none', 'n/a', 'không có chi phí', 'không có payoff',
  ];
  if (emptySignals.some(signal => normalized.includes(signal))) return false;
  return new Set([
    scene.irreversibleChange.trim().toLowerCase(),
    scene.informationDelta.trim().toLowerCase(),
    scene.cost.trim().toLowerCase(),
    scene.payoff.trim().toLowerCase(),
  ]).size >= 3;
}

export function validateChapterPlanSemantics(plan: ChapterPlanV2): ContractIssue[] {
  const issues: ContractIssue[] = [];
  for (const [index, scene] of plan.scenes.entries()) {
    if (!sceneCreatesStateChange(scene)) {
      issues.push({ path: `scenes.${index}`, message: 'Scene does not create a concrete state change.' });
    }
  }
  const before = JSON.stringify(plan.stateBefore);
  const after = JSON.stringify(plan.stateAfter);
  if (before === after) {
    issues.push({ path: 'stateAfter', message: 'Chapter stateAfter must differ from stateBefore.' });
  }
  return issues;
}

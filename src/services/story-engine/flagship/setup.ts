import { z } from 'zod';
import { computeFoundationScoreV2, type FoundationScoreV2 } from './foundation-score';
import {
  CausalWorldV2Schema,
  CharacterDesignV2Schema,
  ConceptBatchV2Schema,
  ConceptRankingV2Schema,
  ConceptTournamentArtifactV2Schema,
  FlagshipLaunchPackV2Schema,
  HumanConceptSelectionV2Schema,
  OpeningTrialV2Schema,
  OpeningTrialTransportV2Schema,
  type ConceptCandidateV2,
  type ConceptTournamentArtifactV2,
  type FlagshipLaunchPackV2,
  type FlagshipSetupBriefV2,
  type HumanConceptSelectionV2,
} from './setup-contracts';
import {
  CAUSAL_WORLD_SYSTEM,
  CHARACTER_DESIGNER_SYSTEM,
  CONCEPT_JUDGE_SYSTEM,
  CONCEPT_LAB_SYSTEM,
  FLAGSHIP_SETUP_PROMPT_VERSION,
  LAUNCH_ARCHITECT_SYSTEM,
  OPENING_SIMULATOR_SYSTEM,
  buildCausalWorldPrompt,
  buildCharacterDesignPrompt,
  buildConceptJudgePrompt,
  buildConceptLabPrompt,
  buildLaunchPackPrompt,
  buildOpeningSimulationPrompt,
} from './setup-prompts';
import { conceptSimilarity } from './concept-tournament';
import { validateChapterPlanSemantics, validatePleasureWindow } from './contracts';

export type FlagshipSetupRole = 'concept_lab' | 'concept_judge' | 'opening_simulator' | 'character_designer' | 'causal_world' | 'launch_architect';

export interface FlagshipSetupCall {
  role: FlagshipSetupRole;
  systemPrompt: string;
  userPrompt: string;
  jsonMode: true;
  candidateId?: string;
}

export interface FlagshipSetupDependencies {
  invoke(call: FlagshipSetupCall): Promise<string>;
}

export class FlagshipSetupError extends Error {
  constructor(
    public readonly code: 'setup_blocked' | 'infra_blocked' | 'human_gate',
    message: string,
    public readonly detail?: unknown,
  ) {
    super(`${code.toUpperCase()}: ${message}`);
    this.name = 'FlagshipSetupError';
  }
}

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch (error) {
    throw new FlagshipSetupError('setup_blocked', `${label} returned invalid JSON.`, { error: String(error) });
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new FlagshipSetupError('setup_blocked', `${label} violated its typed contract.`, parsed.error.issues);
  return parsed.data;
}

function uniqueIds(candidates: ConceptCandidateV2[]): void {
  const ids = new Set(candidates.map(candidate => candidate.id));
  if (ids.size !== candidates.length) throw new FlagshipSetupError('setup_blocked', 'Concept Lab returned duplicate ids.');
}

function removeNearDuplicates(candidates: ConceptCandidateV2[]): { unique: ConceptCandidateV2[]; rejected: string[] } {
  const unique: ConceptCandidateV2[] = [];
  const rejected: string[] = [];
  for (const candidate of candidates) {
    const comparable = { id: candidate.id, premise: candidate.premise, protagonistEngine: candidate.protagonistContradiction, conflictEngine: candidate.conflictEngine, domain: candidate.domainMechanism };
    if (unique.some(item => conceptSimilarity(comparable, { id: item.id, premise: item.premise, protagonistEngine: item.protagonistContradiction, conflictEngine: item.conflictEngine, domain: item.domainMechanism }) >= 0.62)) rejected.push(candidate.id);
    else unique.push(candidate);
  }
  return { unique, rejected };
}

function validateRanking(ranking: z.infer<typeof ConceptRankingV2Schema>, candidates: ConceptCandidateV2[]): void {
  const allowed = new Set(candidates.map(candidate => candidate.id));
  const referenced = [...ranking.matches.flatMap(match => [match.leftId, match.rightId, match.winnerId]), ...ranking.ranking.map(item => item.id), ...ranking.finalistIds];
  const unknown = referenced.filter(id => !allowed.has(id));
  if (unknown.length) throw new FlagshipSetupError('setup_blocked', 'Concept Judge referenced unknown candidates.', { unknown: [...new Set(unknown)] });
  if (new Set(ranking.finalistIds).size !== 3) throw new FlagshipSetupError('setup_blocked', 'Concept Judge did not return three distinct finalists.');
  const rankedIds = new Set(ranking.ranking.map(item => item.id));
  const unranked = candidates.map(candidate => candidate.id).filter(id => !rankedIds.has(id));
  const unpaired = candidates.map(candidate => candidate.id).filter(id => !ranking.matches.some(match => match.leftId === id || match.rightId === id));
  if (rankedIds.size !== candidates.length || unranked.length) throw new FlagshipSetupError('setup_blocked', 'Concept Judge did not rank every distinct candidate exactly once.', { unranked });
  if (unpaired.length) throw new FlagshipSetupError('setup_blocked', 'Concept Judge did not compare every distinct candidate.', { unpaired });
  for (const finalist of ranking.finalistIds) {
    if (!ranking.matches.some(match => match.winnerId === finalist)) {
      throw new FlagshipSetupError('setup_blocked', `Finalist ${finalist} never won a direct comparison.`);
    }
  }
}

export async function generateConceptTournamentV2(
  brief: FlagshipSetupBriefV2,
  dependencies: FlagshipSetupDependencies,
): Promise<{ artifact: ConceptTournamentArtifactV2; callRoles: FlagshipSetupRole[] }> {
  const callRoles: FlagshipSetupRole[] = [];
  const invoke = async (call: FlagshipSetupCall) => {
    callRoles.push(call.role);
    if (callRoles.length > 5) throw new FlagshipSetupError('setup_blocked', 'Concept tournament call budget exceeded.');
    return dependencies.invoke(call);
  };

  const batch = parseJson(await invoke({ role: 'concept_lab', systemPrompt: CONCEPT_LAB_SYSTEM, userPrompt: buildConceptLabPrompt(brief), jsonMode: true }), ConceptBatchV2Schema, 'Concept Lab');
  uniqueIds(batch.candidates);
  const deduped = removeNearDuplicates(batch.candidates);
  if (deduped.unique.length < 3) throw new FlagshipSetupError('setup_blocked', 'Concept Lab produced fewer than three mechanically distinct concepts.', { rejected: deduped.rejected });

  const ranking = parseJson(await invoke({ role: 'concept_judge', systemPrompt: CONCEPT_JUDGE_SYSTEM, userPrompt: buildConceptJudgePrompt(brief, deduped.unique), jsonMode: true }), ConceptRankingV2Schema, 'Concept Judge');
  validateRanking(ranking, deduped.unique);
  const byId = new Map(deduped.unique.map(candidate => [candidate.id, candidate]));
  const openings = await Promise.all(ranking.finalistIds.map(async candidateId => {
    const candidate = byId.get(candidateId)!;
    const transport = parseJson(await invoke({ role: 'opening_simulator', candidateId, systemPrompt: OPENING_SIMULATOR_SYSTEM, userPrompt: buildOpeningSimulationPrompt(brief, candidate), jsonMode: true }), OpeningTrialTransportV2Schema, `Opening Simulator ${candidateId}`);
    const trial = OpeningTrialV2Schema.parse({
      ...transport,
      chapters: transport.chapters.map(({ proseParagraphs, ...chapter }) => ({
        ...chapter,
        prose: proseParagraphs.join('\n\n'),
      })),
    });
    if (trial.candidateId !== candidateId) throw new FlagshipSetupError('setup_blocked', `Opening Simulator changed candidate identity from ${candidateId} to ${trial.candidateId}.`);
    return trial;
  }));

  const artifact = ConceptTournamentArtifactV2Schema.parse({
    schemaVersion: 2,
    promptVersion: FLAGSHIP_SETUP_PROMPT_VERSION,
    concepts: deduped.unique,
    rejectedNearDuplicateIds: deduped.rejected,
    ranking,
    openings,
    status: 'awaiting_human_selection',
  });
  return { artifact, callRoles };
}

export async function materializeFlagshipLaunchPackV2(input: {
  brief: FlagshipSetupBriefV2;
  tournament: ConceptTournamentArtifactV2;
  selection: HumanConceptSelectionV2;
}, dependencies: FlagshipSetupDependencies): Promise<{
  launchPack: FlagshipLaunchPackV2;
  foundationScore: FoundationScoreV2;
  callRoles: FlagshipSetupRole[];
}> {
  validateRanking(input.tournament.ranking, input.tournament.concepts);
  const selection = HumanConceptSelectionV2Schema.parse(input.selection);
  if (!input.tournament.ranking.finalistIds.includes(selection.candidateId)) {
    throw new FlagshipSetupError('human_gate', 'Human selection must choose one of the three finalists.');
  }
  const candidate = input.tournament.concepts.find(item => item.id === selection.candidateId);
  const opening = input.tournament.openings.find(item => item.candidateId === selection.candidateId);
  if (!candidate || !opening) throw new FlagshipSetupError('setup_blocked', 'Selected finalist is missing its immutable concept or opening artifact.');

  const callRoles: FlagshipSetupRole[] = [];
  const invoke = async (call: FlagshipSetupCall) => {
    callRoles.push(call.role);
    if (callRoles.length > 3) throw new FlagshipSetupError('setup_blocked', 'Launch pack call budget exceeded.');
    return dependencies.invoke(call);
  };
  const characters = parseJson(await invoke({ role: 'character_designer', systemPrompt: CHARACTER_DESIGNER_SYSTEM, userPrompt: buildCharacterDesignPrompt(input.brief, candidate, opening), jsonMode: true }), CharacterDesignV2Schema, 'Character Designer');
  const world = parseJson(await invoke({ role: 'causal_world', systemPrompt: CAUSAL_WORLD_SYSTEM, userPrompt: buildCausalWorldPrompt(input.brief, candidate, opening, characters), jsonMode: true }), CausalWorldV2Schema, 'Causal World');
  const launchPack = parseJson(await invoke({ role: 'launch_architect', systemPrompt: LAUNCH_ARCHITECT_SYSTEM, userPrompt: buildLaunchPackPrompt({ ...input, selection, candidate, opening, characters, world }), jsonMode: true }), FlagshipLaunchPackV2Schema, 'Launch Architect');
  if (launchPack.selectedConceptId !== selection.candidateId) throw new FlagshipSetupError('setup_blocked', 'Launch Architect changed the human-selected concept.');
  const identityChanges: string[] = [];
  if (launchPack.storySpec.title !== candidate.workingTitle) identityChanges.push('title');
  if (JSON.stringify(launchPack.storySpec.pleasureProfile) !== JSON.stringify(input.brief.pleasureProfile)) identityChanges.push('pleasureProfile');
  if (launchPack.storySpec.readerFantasy !== candidate.readerFantasy) identityChanges.push('readerFantasy');
  if (launchPack.storySpec.premise !== candidate.premise) identityChanges.push('premise');
  if (JSON.stringify(launchPack.storySpec.protagonist) !== JSON.stringify(characters.protagonist)) identityChanges.push('protagonist');
  if (JSON.stringify(launchPack.storySpec.cast) !== JSON.stringify(characters.cast)) identityChanges.push('cast');
  if (JSON.stringify(launchPack.storySpec.causalWorldRules) !== JSON.stringify(world.rules)) identityChanges.push('causalWorldRules');
  if (JSON.stringify(launchPack.storySpec.resourceEconomy) !== JSON.stringify(world.resources)) identityChanges.push('resourceEconomy');
  if (identityChanges.length) throw new FlagshipSetupError('setup_blocked', `Launch Architect rewrote approved artifacts: ${identityChanges.join(', ')}.`);

  for (const chapter of opening.chapters) {
    const plan = launchPack.rollingChapterPlans.find(item => item.chapterNumber === chapter.chapterNumber);
    if (!plan || !JSON.stringify(plan).includes(chapter.requiredPlanAnchor)) {
      throw new FlagshipSetupError('setup_blocked', `ChapterPlan ${chapter.chapterNumber} dropped approved opening anchor.`);
    }
  }

  const planIssues = launchPack.rollingChapterPlans.flatMap((plan, index) => validateChapterPlanSemantics(plan).map(issue => ({ ...issue, path: `rollingChapterPlans.${index}.${issue.path}` })));
  planIssues.push(...validatePleasureWindow(launchPack.rollingChapterPlans, launchPack.storySpec.pleasureProfile));
  if (planIssues.length) throw new FlagshipSetupError('setup_blocked', 'Launch Architect returned inert scenes or unchanged chapter state.', planIssues);
  const foundationScore = computeFoundationScoreV2(launchPack.storySpec);
  if (!foundationScore.passed) throw new FlagshipSetupError('setup_blocked', 'Computed foundation score did not pass.', foundationScore);
  return { launchPack, foundationScore, callRoles };
}

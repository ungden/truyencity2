import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type ContinuityAuditReport,
  type ContinuityExtractionPayload,
  type ContinuityHealthIssue,
  type ContinuityHealthReport,
} from './contract';

interface ContinuityEvaluationContext {
  projectId: string;
  chapterNumber: number;
  protagonistName: string;
  previousCharacters?: Array<{
    character_name: string;
    status: string | null;
    power_realm_index?: number | null;
    chapter_number?: number | null;
  }>;
  previousTimeline?: {
    days_elapsed_since_start?: number | null;
    mc_age?: number | null;
  } | null;
  currentItems?: Set<string>;
}

export interface ContinuityPersistInput {
  db: SupabaseClient;
  projectId: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  protagonistName: string;
  payload: ContinuityExtractionPayload;
}

const REVIVAL_REASON_RE = /(hồi sinh|cứu sống|giả chết|phân thân|linh hồn|khôi phục|tái sinh|clone|ý thức dự phòng)/i;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function protagonistVariants(name: string): string[] {
  const normalized = normalizeText(name);
  const parts = normalized.split(/\s+/).filter((part) => part.length >= 2);
  return Array.from(new Set([normalized, ...parts]));
}

function mentionsProtagonist(value: string, protagonistName: string): boolean {
  const lower = normalizeText(value);
  return protagonistVariants(protagonistName).some((variant) => lower.includes(variant));
}

function issue(
  issues: ContinuityHealthIssue[],
  code: string,
  severity: ContinuityHealthIssue['severity'],
  message: string,
): void {
  issues.push({ code, severity, message });
}

export function evaluateContinuityExtraction(
  payload: ContinuityExtractionPayload,
  context: ContinuityEvaluationContext,
): ContinuityHealthReport {
  const issues: ContinuityHealthIssue[] = [];

  if (!mentionsProtagonist(payload.summary, context.protagonistName) && !mentionsProtagonist(payload.mcState, context.protagonistName)) {
    issue(issues, 'mc_missing_from_continuity', 'critical', `continuity.json không neo rõ MC "${context.protagonistName}" trong summary hoặc mcState.`);
  }

  const hasMcCharacter = payload.characters.some((character) => mentionsProtagonist(character.characterName, context.protagonistName));
  if (!hasMcCharacter) {
    issue(issues, 'mc_missing_from_character_state', 'critical', `characters phải có trạng thái cho MC "${context.protagonistName}".`);
  }

  const previousByName = new Map(
    (context.previousCharacters || []).map((character) => [normalizeText(character.character_name), character]),
  );
  for (const character of payload.characters) {
    const previous = previousByName.get(normalizeText(character.characterName));
    if (previous?.status === 'dead' && character.status === 'alive') {
      const explanation = `${character.notes || ''} ${character.powerLevel || ''}`;
      if (!REVIVAL_REASON_RE.test(explanation)) {
        issue(
          issues,
          'dead_character_resurrection',
          'critical',
          `${character.characterName} đã chết ở chương ${previous.chapter_number || '?'} nhưng continuity.json ghi alive mà không có lý do hồi sinh.`,
        );
      }
    }
    if (
      typeof previous?.power_realm_index === 'number' &&
      typeof character.powerRealmIndex === 'number' &&
      character.powerRealmIndex < previous.power_realm_index
    ) {
      issue(
        issues,
        'power_regression',
        'major',
        `${character.characterName} tụt powerRealmIndex ${previous.power_realm_index} -> ${character.powerRealmIndex}; cần notes giải thích rõ.`,
      );
    }
  }

  const previousDays = context.previousTimeline?.days_elapsed_since_start;
  const currentDays = payload.timeline?.daysElapsedSinceStart;
  if (typeof previousDays === 'number' && typeof currentDays === 'number' && currentDays < previousDays) {
    issue(
      issues,
      'timeline_rollback',
      'critical',
      `Timeline rollback: daysElapsedSinceStart ${currentDays} nhỏ hơn chương trước ${previousDays}.`,
    );
  }

  const previousAge = context.previousTimeline?.mc_age;
  const currentAge = payload.timeline?.mcAge;
  if (typeof previousAge === 'number' && typeof currentAge === 'number' && currentAge < previousAge) {
    issue(issues, 'mc_age_regression', 'critical', `MC age rollback: ${currentAge} nhỏ hơn chương trước ${previousAge}.`);
  }

  const currentItems = context.currentItems || new Set<string>();
  const heldThisChapter = new Set(currentItems);
  for (const event of payload.itemEvents) {
    const itemKey = normalizeText(`${event.characterName}:${event.itemName}`);
    if (event.eventType === 'picked' || event.eventType === 'equipped' || event.eventType === 'mentioned') {
      heldThisChapter.add(itemKey);
      continue;
    }
    if (!heldThisChapter.has(itemKey)) {
      issue(
        issues,
        'impossible_item_event',
        'critical',
        `${event.characterName} ${event.eventType} "${event.itemName}" nhưng item chưa từng được sở hữu trong ledger.`,
      );
    }
    if (event.eventType === 'used' || event.eventType === 'lost' || event.eventType === 'gifted' || event.eventType === 'destroyed') {
      heldThisChapter.delete(itemKey);
    }
  }

  const critical = issues.some((item) => item.severity === 'critical');
  const major = issues.some((item) => item.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    issues,
    memoryRowsWritten: {},
    blockedNextChapterReason: critical || major ? issues.map((item) => item.message).join('; ') : null,
  };
}

function chunkChapter(content: string): string[] {
  const paragraphs = content
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 50);
  const chunks: string[] = [];
  let buffer = '';
  let words = 0;
  for (const paragraph of paragraphs) {
    buffer += `${buffer ? '\n\n' : ''}${paragraph}`;
    words += paragraph.split(/\s+/).filter(Boolean).length;
    if (words >= 400) {
      chunks.push(buffer.slice(0, 2000));
      buffer = '';
      words = 0;
    }
  }
  if (buffer.length >= 50) chunks.push(buffer.slice(0, 2000));
  return chunks;
}

function slugId(projectId: string, name: string): string {
  const slug = normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'thread';
  return `codex-${projectId.slice(0, 8)}-${slug}`;
}

export async function loadContinuityEvaluationContext(
  db: SupabaseClient,
  projectId: string,
  chapterNumber: number,
  protagonistName: string,
): Promise<ContinuityEvaluationContext> {
  const [charactersRes, timelineRes, itemsRes] = await Promise.all([
    db
      .from('character_states')
      .select('character_name,status,power_realm_index,chapter_number')
      .eq('project_id', projectId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(300),
    db
      .from('story_timeline')
      .select('days_elapsed_since_start,mc_age')
      .eq('project_id', projectId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('item_events')
      .select('character_name,item_name,event_type,chapter_number')
      .eq('project_id', projectId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: true })
      .limit(1000),
  ]);

  const latestByCharacter = new Map<string, {
    character_name: string;
    status: string | null;
    power_realm_index?: number | null;
    chapter_number?: number | null;
  }>();
  for (const character of charactersRes.data || []) {
    const key = normalizeText(character.character_name);
    if (!latestByCharacter.has(key)) latestByCharacter.set(key, character);
  }

  const currentItems = new Set<string>();
  for (const event of itemsRes.data || []) {
    const key = normalizeText(`${event.character_name}:${event.item_name}`);
    if (event.event_type === 'picked' || event.event_type === 'equipped' || event.event_type === 'mentioned') {
      currentItems.add(key);
    } else if (event.event_type === 'used' || event.event_type === 'lost' || event.event_type === 'gifted' || event.event_type === 'destroyed') {
      currentItems.delete(key);
    }
  }

  return {
    projectId,
    chapterNumber,
    protagonistName,
    previousCharacters: Array.from(latestByCharacter.values()),
    previousTimeline: timelineRes.data || null,
    currentItems,
  };
}

export async function persistContinuityMemory(input: ContinuityPersistInput): Promise<Record<string, number>> {
  const { db, projectId, novelId, chapterNumber, title, content, payload } = input;
  void novelId;
  const counts: Record<string, number> = {
    chapter_summaries: 0,
    character_states: 0,
    story_memory_chunks: 0,
    story_timeline: 0,
    item_events: 0,
    plot_threads: 0,
    character_relationships: 0,
    economic_ledger: 0,
    trade_ledger: 0,
    world_state_deltas: 0,
    factions: 0,
  };

  const { error: summaryError } = await db.from('chapter_summaries').upsert({
    project_id: projectId,
    chapter_number: chapterNumber,
    title,
    summary: payload.summary,
    opening_sentence: payload.openingSentence,
    mc_state: payload.mcState,
    cliffhanger: payload.cliffhanger,
  }, { onConflict: 'project_id,chapter_number' });
  if (summaryError) throw summaryError;
  counts.chapter_summaries = 1;

  const characterRows = payload.characters.map((character) => ({
    project_id: projectId,
    chapter_number: chapterNumber,
    character_name: character.characterName,
    status: character.status,
    power_level: character.powerLevel || null,
    power_realm_index: character.powerRealmIndex ?? null,
    location: character.location || null,
    personality_quirks: character.personalityQuirks || null,
    notes: character.notes || null,
  }));
  const { error: characterError } = await db.from('character_states').upsert(characterRows, {
    onConflict: 'project_id,chapter_number,character_name',
  });
  if (characterError) throw characterError;
  counts.character_states = characterRows.length;

  await db.from('story_memory_chunks').delete().eq('project_id', projectId).eq('chapter_number', chapterNumber);
  const chunks = [
    {
      project_id: projectId,
      chapter_number: chapterNumber,
      chunk_type: 'key_event',
      content: `Ch.${chapterNumber} "${title}": ${payload.summary}`.slice(0, 2000),
      metadata: { provider: 'codex_automation', title, characters: payload.characters.map((character) => character.characterName) },
    },
    ...payload.tradeLedger.map((trade, index) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      chunk_type: 'key_event',
      content: `Trade ${index + 1}: ${trade.sourceWorld} -> ${trade.targetWorld}, ${trade.resourceName}, source=${trade.source}, cost=${trade.cost}, expectedValue=${trade.expectedValue}, logistics=${trade.logisticsConstraint}, impact=${trade.worldStateImpact}`.slice(0, 2000),
      metadata: {
        provider: 'codex_automation',
        semantic_type: 'trade_ledger',
        title,
        trade,
      },
    })),
    ...payload.worldStateDeltas.map((delta, index) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      chunk_type: 'world_detail',
      content: `World delta ${index + 1}: ${delta.worldName} ${delta.deltaType} - ${delta.description}; pressure=${delta.pressureChange || 'n/a'}; resources=${delta.relatedResources.join(', ')}`.slice(0, 2000),
      metadata: {
        provider: 'codex_automation',
        semantic_type: 'world_state_delta',
        title,
        delta,
      },
    })),
    ...chunkChapter(content).map((chunk, index) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      chunk_type: index === 0 ? 'scene' : 'plot_point',
      content: chunk,
      metadata: {
        provider: 'codex_automation',
        title,
        chunk_index: index + 1,
        characters: payload.characters.filter((character) => chunk.includes(character.characterName)).map((character) => character.characterName),
      },
    })),
  ];
  const { error: chunkError } = await db.from('story_memory_chunks').insert(chunks);
  if (chunkError) throw chunkError;
  counts.story_memory_chunks = chunks.length;
  counts.trade_ledger = payload.tradeLedger.length;
  counts.world_state_deltas = payload.worldStateDeltas.length;

  if (payload.timeline) {
    const { error: timelineError } = await db.from('story_timeline').upsert({
      project_id: projectId,
      chapter_number: chapterNumber,
      in_world_date_text: payload.timeline.inWorldDateText || null,
      days_elapsed_since_start: payload.timeline.daysElapsedSinceStart ?? null,
      season: payload.timeline.season || null,
      mc_age: payload.timeline.mcAge ?? null,
      explicit_in_chapter: payload.timeline.explicitInChapter || false,
      notes: payload.timeline.notes || null,
    }, { onConflict: 'project_id,chapter_number' });
    if (timelineError) throw timelineError;
    counts.story_timeline = 1;
  }

  if (payload.itemEvents.length > 0) {
    await db.from('item_events').delete().eq('project_id', projectId).eq('chapter_number', chapterNumber);
    const { error: itemError } = await db.from('item_events').insert(payload.itemEvents.map((event) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      character_name: event.characterName,
      item_name: event.itemName,
      event_type: event.eventType,
      description: event.description || null,
      importance: event.importance,
    })));
    if (itemError) throw itemError;
    counts.item_events = payload.itemEvents.length;
  }

  for (const thread of payload.plotThreads) {
    const id = thread.id || slugId(projectId, thread.name);
    const row = {
      id,
      project_id: projectId,
      name: thread.name,
      description: thread.description,
      priority: thread.priority,
      status: thread.status,
      start_chapter: chapterNumber,
      target_payoff_chapter: thread.targetPayoffChapter ?? null,
      resolved_chapter: thread.status === 'resolved' ? chapterNumber : null,
      last_active_chapter: chapterNumber,
      related_characters: thread.relatedCharacters,
      payoff_description: thread.payoffDescription || null,
      importance: thread.importance,
      updated_at: new Date().toISOString(),
    };
    const { error: threadError } = await db.from('plot_threads').upsert(row, { onConflict: 'id' });
    if (threadError) throw threadError;
    counts.plot_threads++;
  }

  if (payload.relationships.length > 0) {
    const { error: relationshipError } = await db.from('character_relationships').insert(payload.relationships.map((relationship) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      character_a: relationship.characterA,
      character_b: relationship.characterB,
      relationship_type: relationship.relationshipType,
      intensity: relationship.intensity ?? null,
      notes: relationship.notes || null,
    })));
    if (relationshipError) throw relationshipError;
    counts.character_relationships = payload.relationships.length;
  }

  if (payload.economicLedger.length > 0) {
    const { error: economicError } = await db.from('economic_ledger').insert(payload.economicLedger.map((entry) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      entity_name: entry.entityName,
      entity_type: entry.entityType || null,
      cash_estimate: entry.cashEstimate || null,
      assets: entry.assets,
      monthly_revenue: entry.monthlyRevenue || null,
      team_size: entry.teamSize ?? null,
      delta_summary: entry.deltaSummary,
      notes: entry.notes || null,
    })));
    if (economicError) throw economicError;
    counts.economic_ledger = payload.economicLedger.length;
  }

  for (const faction of payload.factions) {
    const { error: factionError } = await db.from('factions').upsert({
      project_id: projectId,
      faction_name: faction.factionName,
      faction_type: faction.factionType,
      power_level: faction.powerLevel,
      description: faction.description || null,
      alliances: faction.alliances,
      rivalries: faction.rivalries,
      status: faction.status,
      first_seen_chapter: chapterNumber,
      last_active_chapter: chapterNumber,
      importance: faction.importance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,faction_name' });
    if (factionError) throw factionError;
    counts.factions++;
  }

  return counts;
}

export async function auditContinuityWindow(
  db: SupabaseClient,
  projectId: string,
  novelId: string,
  recent: number,
): Promise<ContinuityAuditReport> {
  const { data: chapters, error } = await db
    .from('chapters')
    .select('chapter_number,title')
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending: false })
    .limit(recent);
  if (error) throw error;

  const ordered = (chapters || []).map((chapter) => chapter.chapter_number).sort((a, b) => a - b);
  const missingByChapter: Record<number, string[]> = {};
  const issues: ContinuityHealthIssue[] = [];

  for (const chapterNumber of ordered) {
    const [summaryRes, charactersRes, chunksRes, metricsRes] = await Promise.all([
      db.from('chapter_summaries').select('chapter_number').eq('project_id', projectId).eq('chapter_number', chapterNumber).maybeSingle(),
      db.from('character_states').select('character_name', { count: 'exact', head: false }).eq('project_id', projectId).eq('chapter_number', chapterNumber),
      db.from('story_memory_chunks').select('id', { count: 'exact', head: false }).eq('project_id', projectId).eq('chapter_number', chapterNumber),
      db.from('quality_metrics').select('meta').eq('project_id', projectId).eq('chapter_number', chapterNumber).maybeSingle(),
    ]);
    const missing: string[] = [];
    if (!summaryRes.data) missing.push('chapter_summaries');
    if ((charactersRes.data?.length || 0) === 0) missing.push('character_states');
    if ((chunksRes.data?.length || 0) === 0) missing.push('story_memory_chunks');
    const meta = metricsRes.data?.meta as { continuity_health?: ContinuityHealthReport } | null | undefined;
    if (!meta?.continuity_health) missing.push('quality_metrics.meta.continuity_health');
    if (missing.length > 0) {
      missingByChapter[chapterNumber] = missing;
      issue(issues, 'missing_memory_rows', 'major', `Ch.${chapterNumber} thiếu ${missing.join(', ')}.`);
    }
  }

  const hasMajor = issues.some((item) => item.severity === 'major' || item.severity === 'critical');
  return {
    projectId,
    checkedChapters: ordered,
    verdict: hasMajor ? 'revise' : 'pass',
    issues,
    missingByChapter,
  };
}

export function buildHeuristicContinuityPayload(
  title: string,
  content: string,
  protagonistName: string,
): ContinuityExtractionPayload {
  const compact = content.replace(/\s+/g, ' ').trim();
  const openingSentence = compact.match(/^(.{20,220}?[.!?。！？])/)?.[1] || compact.slice(0, 180);
  const paragraphs = content.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const cliffhanger = (paragraphs.at(-1) || compact.slice(-500)).slice(0, 700);
  return {
    summary: compact.slice(0, 900) || `Chương "${title}" tiếp tục tuyến truyện của ${protagonistName}.`,
    openingSentence,
    mcState: `${protagonistName} tiếp tục ở trạng thái sau chương "${title}"; cần Codex audit sâu nếu chương này có biến động lớn.`,
    cliffhanger: cliffhanger || `Tuyến truyện của ${protagonistName} còn tiếp tục sau chương "${title}".`,
    characters: [{
      characterName: protagonistName,
      status: 'alive',
      powerLevel: null,
      powerRealmIndex: null,
      location: null,
      personalityQuirks: null,
      notes: 'Heuristic continuity repair from existing chapter content; should be refined by Codex deep audit when needed.',
    }],
    itemEvents: [],
    plotThreads: [],
    relationships: [],
    economicLedger: [],
    tradeLedger: [],
    worldStateDeltas: [],
    factions: [],
  };
}

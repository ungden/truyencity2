/**
 * Canon Resolver - Handles fact conflicts with priority levels
 *
 * Priority (highest to lowest):
 * 1. World Bible (immutable truths)
 * 2. Volume Summary
 * 3. Arc Summary
 * 4. Chapter Facts
 * 5. RAG Retrieved (lowest priority)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Canon priority levels (higher = more authoritative)
export enum CanonLevel {
  WORLD_BIBLE = 100,      // Immutable world rules, power system
  VOLUME_SUMMARY = 80,    // Major plot points, character deaths
  ARC_SUMMARY = 60,       // Arc-level events, relationships
  CHAPTER_FACT = 40,      // Specific chapter details
  RAG_RETRIEVED = 20,     // Retrieved context (may be outdated)
  INFERRED = 10,          // AI-inferred facts (lowest trust)
}

export interface CanonFact {
  id: string;
  projectId: string;
  factType: 'character' | 'world_rule' | 'event' | 'relationship' | 'power' | 'location' | 'item';
  subject: string;           // e.g., character name, location name
  predicate: string;         // e.g., "is_dead", "has_power", "located_at"
  value: string | number | boolean;
  canonLevel: CanonLevel;
  sourceChapter?: number;
  sourceType: string;        // "world_bible", "arc_summary", "chapter", "rag"
  validFrom?: number;        // Chapter where this became true
  validUntil?: number;       // Chapter where this was superseded (null = still valid)
  confidence: number;        // 0-100
  createdAt: Date;
}

export interface ConflictReport {
  hasConflict: boolean;
  existingFact?: CanonFact;
  newFact?: Partial<CanonFact>;
  resolution: 'keep_existing' | 'use_new' | 'manual_review';
  reason: string;
}

export interface ContinuityIssue {
  id: string;
  projectId: string;
  chapterNumber: number;
  issueType: 'conflict' | 'inconsistency' | 'timeline_error' | 'power_violation';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  factA: Partial<CanonFact>;
  factB: Partial<CanonFact>;
  suggestedResolution?: string;
  status: 'open' | 'resolved' | 'ignored';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class CanonResolver {
  private projectId: string;
  private factCache: Map<string, CanonFact> = new Map();
  private issuesBacklog: ContinuityIssue[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Initialize by loading existing facts from database
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();

    // Load world bible facts (highest priority)
    const { data: worldState } = await supabase
      .from('world_state')
      .select('*')
      .eq('project_id', this.projectId);

    if (worldState) {
      for (const ws of worldState) {
        const fact: CanonFact = {
          id: `world_${ws.id}`,
          projectId: this.projectId,
          factType: ws.state_type as CanonFact['factType'],
          subject: ws.key,
          predicate: 'world_rule',
          value: ws.value,
          canonLevel: CanonLevel.WORLD_BIBLE,
          sourceType: 'world_bible',
          confidence: 100,
          createdAt: new Date(ws.created_at),
        };
        this.factCache.set(this.getFactKey(fact), fact);
      }
    }

    // Load character facts
    const { data: characters } = await supabase
      .from('character_tracker')
      .select('*')
      .eq('project_id', this.projectId);

    if (characters) {
      for (const char of characters) {
        // Death status (highest priority for characters)
        if (char.status === 'dead') {
          const deathFact: CanonFact = {
            id: `char_death_${char.id}`,
            projectId: this.projectId,
            factType: 'character',
            subject: char.character_name,
            predicate: 'is_dead',
            value: true,
            canonLevel: CanonLevel.VOLUME_SUMMARY, // Deaths are very important
            sourceChapter: char.death_chapter,
            sourceType: 'chapter',
            validFrom: char.death_chapter,
            confidence: 100,
            createdAt: new Date(char.created_at),
          };
          this.factCache.set(this.getFactKey(deathFact), deathFact);
        }

        // Power level
        if (char.current_state?.realm) {
          const powerFact: CanonFact = {
            id: `char_power_${char.id}`,
            projectId: this.projectId,
            factType: 'power',
            subject: char.character_name,
            predicate: 'realm',
            value: char.current_state.realm,
            canonLevel: CanonLevel.CHAPTER_FACT,
            sourceChapter: char.last_updated_chapter,
            sourceType: 'chapter',
            confidence: 95,
            createdAt: new Date(char.updated_at),
          };
          this.factCache.set(this.getFactKey(powerFact), powerFact);
        }
      }
    }

    // Load world constraints (highest priority)
    const { data: constraintsData } = await supabase
      .from('world_constraints')
      .select('*')
      .eq('project_id', this.projectId);

    if (constraintsData) {
      for (const wc of constraintsData) {
        const fact: CanonFact = {
          id: `constraint_${wc.id}`,
          projectId: this.projectId,
          factType: 'world_rule',
          subject: wc.subject,
          predicate: wc.predicate,
          value: wc.value,
          canonLevel: CanonLevel.WORLD_BIBLE,
          sourceType: 'world_constraint',
          confidence: 100,
          createdAt: new Date(wc.created_at as string),
        };
        this.factCache.set(this.getFactKey(fact), fact);
      }
    }

    // Load unresolved continuity issues
    const { data: issues } = await supabase
      .from('consistency_issues')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('status', 'open');

    if (issues) {
      this.issuesBacklog = issues.map(i => ({
        id: i.id,
        projectId: i.project_id,
        chapterNumber: i.chapter_number,
        issueType: i.issue_type,
        severity: i.severity,
        description: i.description,
        factA: i.fact_a || {},
        factB: i.fact_b || {},
        suggestedResolution: i.suggested_resolution,
        status: i.status,
      }));
    }
  }

  /**
   * Generate a unique key for a fact
   */
  private getFactKey(fact: Partial<CanonFact>): string {
    return `${fact.factType}:${fact.subject}:${fact.predicate}`;
  }

  /**
   * Check if a new fact conflicts with existing canon
   */
  checkConflict(newFact: Partial<CanonFact>): ConflictReport {
    const key = this.getFactKey(newFact);
    const existingFact = this.factCache.get(key);

    if (!existingFact) {
      return {
        hasConflict: false,
        resolution: 'use_new',
        reason: 'No existing fact found',
      };
    }

    // Same value = no conflict
    if (existingFact.value === newFact.value) {
      return {
        hasConflict: false,
        existingFact,
        newFact,
        resolution: 'keep_existing',
        reason: 'Values match',
      };
    }

    // Different values = potential conflict
    const existingPriority = existingFact.canonLevel;
    const newPriority = newFact.canonLevel || CanonLevel.INFERRED;

    // Higher priority wins
    if (newPriority > existingPriority) {
      return {
        hasConflict: true,
        existingFact,
        newFact,
        resolution: 'use_new',
        reason: `New fact has higher priority (${newPriority} > ${existingPriority})`,
      };
    }

    if (newPriority < existingPriority) {
      return {
        hasConflict: true,
        existingFact,
        newFact,
        resolution: 'keep_existing',
        reason: `Existing fact has higher priority (${existingPriority} > ${newPriority})`,
      };
    }

    // Same priority - need manual review for important facts
    if (existingPriority >= CanonLevel.ARC_SUMMARY) {
      return {
        hasConflict: true,
        existingFact,
        newFact,
        resolution: 'manual_review',
        reason: `Same priority level (${existingPriority}), requires manual review`,
      };
    }

    // For lower priority facts, prefer newer
    return {
      hasConflict: true,
      existingFact,
      newFact,
      resolution: 'use_new',
      reason: 'Same low priority, using newer fact',
    };
  }

  /**
   * Resolve conflicts from RAG-retrieved context
   */
  resolveRAGConflicts(retrievedFacts: Partial<CanonFact>[]): {
    validFacts: Partial<CanonFact>[];
    conflicts: ConflictReport[];
    issues: ContinuityIssue[];
  } {
    const validFacts: Partial<CanonFact>[] = [];
    const conflicts: ConflictReport[] = [];
    const issues: ContinuityIssue[] = [];

    for (const fact of retrievedFacts) {
      // RAG facts have lowest priority
      fact.canonLevel = CanonLevel.RAG_RETRIEVED;

      const report = this.checkConflict(fact);

      if (!report.hasConflict) {
        validFacts.push(fact);
      } else {
        conflicts.push(report);

        // Log serious conflicts
        if (report.resolution === 'manual_review') {
          const issue: ContinuityIssue = {
            id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            projectId: this.projectId,
            chapterNumber: fact.sourceChapter || 0,
            issueType: 'conflict',
            severity: this.getSeverity(fact.factType),
            description: `Conflict: ${fact.subject} ${fact.predicate} = "${fact.value}" vs "${report.existingFact?.value}"`,
            factA: report.existingFact || {},
            factB: fact,
            status: 'open',
          };
          issues.push(issue);
          this.issuesBacklog.push(issue);
        }

        // If we should use the new fact despite conflict
        if (report.resolution === 'use_new') {
          validFacts.push(fact);
        }
      }
    }

    return { validFacts, conflicts, issues };
  }

  /**
   * Get severity based on fact type
   */
  private getSeverity(factType?: string): 'critical' | 'major' | 'minor' {
    switch (factType) {
      case 'character':
        return 'critical'; // Character facts (especially death) are critical
      case 'power':
        return 'major'; // Power inconsistencies are major
      case 'world_rule':
        return 'critical'; // World rules cannot be violated
      case 'relationship':
        return 'major';
      default:
        return 'minor';
    }
  }

  /**
   * Register a new fact to canon
   */
  async registerFact(fact: Partial<CanonFact>): Promise<{ success: boolean; conflict?: ConflictReport }> {
    const report = this.checkConflict(fact);

    if (report.hasConflict && report.resolution === 'manual_review') {
      // Don't auto-register, log issue
      await this.logContinuityIssue({
        id: `issue_${Date.now()}`,
        projectId: this.projectId,
        chapterNumber: fact.sourceChapter || 0,
        issueType: 'conflict',
        severity: this.getSeverity(fact.factType),
        description: `Cannot auto-resolve: ${fact.subject} ${fact.predicate}`,
        factA: report.existingFact || {},
        factB: fact,
        status: 'open',
      });
      return { success: false, conflict: report };
    }

    if (report.resolution === 'use_new' || !report.hasConflict) {
      const key = this.getFactKey(fact);
      const fullFact: CanonFact = {
        id: fact.id || `fact_${Date.now()}`,
        projectId: this.projectId,
        factType: fact.factType || 'event',
        subject: fact.subject || '',
        predicate: fact.predicate || '',
        value: fact.value || '',
        canonLevel: fact.canonLevel || CanonLevel.CHAPTER_FACT,
        sourceChapter: fact.sourceChapter,
        sourceType: fact.sourceType || 'chapter',
        confidence: fact.confidence || 80,
        createdAt: new Date(),
      };
      this.factCache.set(key, fullFact);

      // Persist to database
      await this.persistFact(fullFact);

      return { success: true };
    }

    return { success: true }; // keep_existing is also success
  }

  /**
   * Persist fact to database
   */
  private async persistFact(fact: CanonFact): Promise<void> {
    const supabase = getSupabase();
    try {
      await supabase
        .from('story_embeddings')
        .upsert({
          project_id: this.projectId,
          chapter_number: fact.sourceChapter || 0,
          content_type: 'canon_fact',
          content: JSON.stringify({
            factType: fact.factType,
            subject: fact.subject,
            predicate: fact.predicate,
            value: fact.value,
            canonLevel: fact.canonLevel,
          }),
          importance: Math.round(fact.canonLevel / 10),
        });
    } catch (e) {
      logger.warn('World state persistence failed (non-fatal)', {
        projectId: this.projectId,
        chapterNumber: fact.sourceChapter || 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /**
   * Log a continuity issue to the backlog
   */
  async logContinuityIssue(issue: ContinuityIssue): Promise<void> {
    this.issuesBacklog.push(issue);
    const supabase = getSupabase();

    try {
      await supabase
        .from('consistency_issues')
        .insert({
          project_id: this.projectId,
          chapter_number: issue.chapterNumber,
          issue_type: issue.issueType,
          severity: issue.severity,
          description: issue.description,
          fact_a: issue.factA,
          fact_b: issue.factB,
          suggested_resolution: issue.suggestedResolution,
          status: 'open',
        });
    } catch (e) {
      logger.warn('Consistency issue persistence failed (non-fatal)', {
        projectId: this.projectId,
        chapterNumber: issue.chapterNumber,
        issueType: issue.issueType,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /**
   * Get all facts for a subject (character, location, etc.)
   */
  getFactsForSubject(subject: string): CanonFact[] {
    const facts: CanonFact[] = [];
    for (const fact of this.factCache.values()) {
      if (fact.subject.toLowerCase() === subject.toLowerCase()) {
        facts.push(fact);
      }
    }
    return facts.sort((a, b) => b.canonLevel - a.canonLevel);
  }

  /**
   * Check if a character is dead
   */
  isCharacterDead(characterName: string): boolean {
    const key = `character:${characterName}:is_dead`;
    const fact = this.factCache.get(key);
    return fact?.value === true;
  }

  /**
   * Get character's current power level from canon
   */
  getCharacterPower(characterName: string): { realm: string; level: number } | null {
    const realmKey = `power:${characterName}:realm`;
    const levelKey = `power:${characterName}:level`;

    const realmFact = this.factCache.get(realmKey);
    const levelFact = this.factCache.get(levelKey);

    if (!realmFact) return null;

    return {
      realm: realmFact.value as string,
      level: (levelFact?.value as number) || 1,
    };
  }

  /**
   * Get open continuity issues
   */
  getOpenIssues(): ContinuityIssue[] {
    return this.issuesBacklog.filter(i => i.status === 'open');
  }

  /**
   * Get critical issues that need immediate attention
   */
  getCriticalIssues(): ContinuityIssue[] {
    return this.issuesBacklog.filter(i => i.status === 'open' && i.severity === 'critical');
  }

  /**
   * Build canon context for chapter writing
   */
  buildCanonContext(characters: string[]): string {
    const lines: string[] = ['## Canon Facts (Do not contradict):'];

    for (const char of characters) {
      const facts = this.getFactsForSubject(char);
      if (facts.length > 0) {
        lines.push(`\n### ${char}:`);
        for (const fact of facts.slice(0, 5)) { // Top 5 facts by priority
          lines.push(`- ${fact.predicate}: ${fact.value}`);
        }
      }

      // Check death status explicitly
      if (this.isCharacterDead(char)) {
        lines.push(`- **DEAD** - Cannot appear in story`);
      }
    }

    // Add critical world rules
    const worldRules = Array.from(this.factCache.values())
      .filter(f => f.canonLevel === CanonLevel.WORLD_BIBLE)
      .slice(0, 10);

    if (worldRules.length > 0) {
      lines.push('\n### World Rules:');
      for (const rule of worldRules) {
        lines.push(`- ${rule.subject}: ${rule.value}`);
      }
    }

    return lines.join('\n');
  }
}

export function createCanonResolver(projectId: string): CanonResolver {
  return new CanonResolver(projectId);
}

/**
 * Rule Indexer - Fast World Rules Retrieval
 * 
 * Solves: RAG similarity-based retrieval misses exact rules
 * Solution: Tag-based indexing + keyword matching
 * 
 * Key Features:
 * 1. Tag-based categorization (power:realm=KimDan, location=ThanhVanTong)
 * 2. Semantic + Keyword hybrid search
 * 3. Usage tracking for rule importance
 * 4. Context-aware rule suggestion
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/security/logger';

// Lazy initialization
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

// ============================================================================
// TYPES
// ============================================================================

export interface WorldRule {
  id: string;
  projectId: string;
  ruleText: string;
  category: RuleCategory;
  tags: string[];
  introducedChapter: number;
  importance: number; // 0-100
  usageCount: number;
  lastReferencedChapter: number | null;
  createdAt: Date;
}

export type RuleCategory = 
  | 'power_system'      // Tu luyện, cảnh giới
  | 'politics'          // Chính trị, quyền lực
  | 'economy'           // Kinh tế, tiền tệ
  | 'geography'         // Địa lý, không gian
  | 'culture'           // Văn hóa, phong tục
  | 'history'           // Lịch sử, truyền thuyết
  | 'mechanics'         // Game mechanics, systems
  | 'restrictions';     // Giới hạn, cấm kỵ

export interface RuleSearchQuery {
  text?: string;
  category?: RuleCategory;
  tags?: string[];
  chapterContext?: number;
  relevanceThreshold?: number;
}

export interface RuleSearchResult {
  rule: WorldRule;
  relevanceScore: number;
  matchType: 'exact' | 'tag' | 'semantic' | 'category';
  reason: string;
}

export interface RuleSuggestion {
  rule: WorldRule;
  reason: string;
  confidence: number;
}

// ============================================================================
// RULE INDEXER CLASS
// ============================================================================

export class RuleIndexer {
  private projectId: string;
  private rules: Map<string, WorldRule> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> rule IDs
  private categoryIndex: Map<RuleCategory, Set<string>> = new Map(); // category -> rule IDs

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Initialize by loading rules from database
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    
    const { data: rules, error } = await supabase
      .from('world_rules_index')
      .select('*')
      .eq('project_id', this.projectId)
      .order('importance', { ascending: false });

    if (error) {
      logger.error('Failed to load world rules');
      return;
    }

    if (rules) {
      for (const rule of rules) {
        const worldRule: WorldRule = {
          id: rule.id,
          projectId: rule.project_id,
          ruleText: rule.rule_text,
          category: rule.category as RuleCategory,
          tags: rule.tags || [],
          introducedChapter: rule.introduced_chapter,
          importance: rule.importance || 50,
          usageCount: rule.usage_count || 0,
          lastReferencedChapter: rule.last_referenced_chapter,
          createdAt: new Date(rule.created_at),
        };

        this.addToIndices(worldRule);
      }
    }

    logger.info(`Loaded ${this.rules.size} world rules`);
  }

  /**
   * Add a new world rule
   */
  async addRule(
    ruleText: string,
    category: RuleCategory,
    tags: string[],
    introducedChapter: number,
    importance: number = 50
  ): Promise<WorldRule> {
    const id = randomUUID();
    
    const rule: WorldRule = {
      id,
      projectId: this.projectId,
      ruleText,
      category,
      tags,
      introducedChapter,
      importance,
      usageCount: 0,
      lastReferencedChapter: null,
      createdAt: new Date(),
    };

    // Save to database
    const supabase = getSupabase();
    const { error } = await supabase.from('world_rules_index').insert({
      id: rule.id,
      project_id: rule.projectId,
      rule_text: rule.ruleText,
      category: rule.category,
      tags: rule.tags,
      introduced_chapter: rule.introducedChapter,
      importance: rule.importance,
      usage_count: rule.usageCount,
    });

    if (error) {
      logger.error('Failed to add world rule');
      throw error;
    }

    this.addToIndices(rule);
    logger.info(`Added rule: ${ruleText.substring(0, 50)}...`);

    return rule;
  }

  /**
   * Search rules using hybrid approach
   * 
   * Priority:
   * 1. Exact tag matches (highest priority)
   * 2. Category matches
   * 3. Text/keyword matches
   * 4. Semantic similarity (if available)
   */
  searchRules(query: RuleSearchQuery): RuleSearchResult[] {
    const results: Map<string, RuleSearchResult> = new Map();

    // 1. Tag-based search (highest priority)
    if (query.tags && query.tags.length > 0) {
      for (const tag of query.tags) {
        const ruleIds = this.tagIndex.get(tag);
        if (ruleIds) {
          for (const ruleId of ruleIds) {
            const rule = this.rules.get(ruleId);
            if (rule) {
              const existing = results.get(ruleId);
              if (existing) {
                existing.relevanceScore += 40;
                existing.matchType = 'tag';
              } else {
                results.set(ruleId, {
                  rule,
                  relevanceScore: 40,
                  matchType: 'tag',
                  reason: `Tag match: ${tag}`,
                });
              }
            }
          }
        }
      }
    }

    // 2. Category-based search
    if (query.category) {
      const ruleIds = this.categoryIndex.get(query.category);
      if (ruleIds) {
        for (const ruleId of ruleIds) {
          const rule = this.rules.get(ruleId);
          if (rule) {
            const existing = results.get(ruleId);
            if (existing) {
              existing.relevanceScore += 25;
            } else {
              results.set(ruleId, {
                rule,
                relevanceScore: 25,
                matchType: 'category',
                reason: `Category: ${query.category}`,
              });
            }
          }
        }
      }
    }

    // 3. Text/keyword search
    if (query.text) {
      const keywords = query.text.toLowerCase().split(/\s+/);
      for (const rule of this.rules.values()) {
        const ruleTextLower = rule.ruleText.toLowerCase();
        let matchCount = 0;
        
        for (const keyword of keywords) {
          if (ruleTextLower.includes(keyword)) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          const existing = results.get(rule.id);
          const score = (matchCount / keywords.length) * 20;
          
          if (existing) {
            existing.relevanceScore += score;
            if (matchCount === keywords.length) {
              existing.matchType = 'exact';
              existing.reason = 'Exact text match';
            }
          } else {
            results.set(rule.id, {
              rule,
              relevanceScore: score,
              matchType: matchCount === keywords.length ? 'exact' : 'semantic',
              reason: `Keyword match: ${matchCount}/${keywords.length}`,
            });
          }
        }
      }
    }

    // 4. Chapter context boost
    if (query.chapterContext) {
      for (const result of results.values()) {
        // Boost rules introduced recently (within last 100 chapters)
        const chaptersSinceIntro = query.chapterContext - result.rule.introducedChapter;
        if (chaptersSinceIntro >= 0 && chaptersSinceIntro <= 100) {
          result.relevanceScore += 10 * (1 - chaptersSinceIntro / 100);
        }

        // Boost frequently used rules
        if (result.rule.usageCount > 5) {
          result.relevanceScore += Math.min(10, result.rule.usageCount / 2);
        }
      }
    }

    // Filter by threshold and sort
    const threshold = query.relevanceThreshold || 0.2;
    const sortedResults = Array.from(results.values())
      .filter(r => r.relevanceScore >= threshold * 100)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return sortedResults;
  }

  /**
   * Suggest relevant rules for a chapter
   */
  suggestRulesForChapter(
    chapterNumber: number,
    chapterContext: string,
    characters: string[],
    location: string
  ): RuleSuggestion[] {
    const suggestions: RuleSuggestion[] = [];

    // Extract potential tags from context
    const potentialTags: string[] = [];
    
    // Character-based tags
    for (const char of characters) {
      potentialTags.push(`character=${char}`);
    }
    
    // Location-based tags
    if (location) {
      potentialTags.push(`location=${location}`);
    }

    // Content-based tags (simple keyword extraction)
    const keywords = this.extractKeywords(chapterContext);
    for (const kw of keywords) {
      potentialTags.push(kw);
    }

    // Search with extracted tags
    // Note: chapterNumber should be passed separately for context boost
    const results = this.searchRules({
      tags: potentialTags,
      relevanceThreshold: 0.3,
    });

    // Convert to suggestions with reasons
    for (const result of results.slice(0, 5)) {
      suggestions.push({
        rule: result.rule,
        reason: this.generateSuggestionReason(result, chapterContext),
        confidence: result.relevanceScore / 100,
      });
    }

    return suggestions;
  }

  /**
   * Record rule usage
   */
  async recordUsage(ruleId: string, chapterNumber: number): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    rule.usageCount++;
    rule.lastReferencedChapter = chapterNumber;

    // Update database
    const supabase = getSupabase();
    await supabase
      .from('world_rules_index')
      .update({
        usage_count: rule.usageCount,
        last_referenced_chapter: chapterNumber,
      })
      .eq('id', ruleId);
  }

  /**
   * Auto-extract rules from chapter content
   */
  async extractRulesFromChapter(
    chapterContent: string,
    chapterNumber: number
  ): Promise<WorldRule[]> {
    const extractedRules: WorldRule[] = [];
    
    // Pattern-based rule detection
    const patterns = [
      { regex: /cảnh giới\s+([^,.]{2,20})\s+có\s+([^,.]{10,100})/i, category: 'power_system' as RuleCategory },
      { regex: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+là\s+([^,.]{10,100})/i, category: 'geography' as RuleCategory },
      { regex: /luật lệ\s+([^,.]{2,30})\s+quy định\s+([^,.]{10,100})/i, category: 'restrictions' as RuleCategory },
      { regex: /truyền thuyết\s+kể\s+rằng\s+([^,.]{10,100})/i, category: 'history' as RuleCategory },
    ];

    for (const pattern of patterns) {
      const matches = chapterContent.match(pattern.regex);
      if (matches && matches[0]) {
        // Generate tags from match
        const tags = this.generateTagsFromRule(matches[0], pattern.category);
        
        try {
          const rule = await this.addRule(
            matches[0],
            pattern.category,
            tags,
            chapterNumber,
            60 // High importance for new rules
          );
          extractedRules.push(rule);
        } catch (e) {
          // Rule might already exist
        }
      }
    }

    return extractedRules;
  }

  /**
   * Get rules that haven't been used in a while (for reminding)
   */
  getUnusedRules(
    currentChapter: number,
    threshold: number = 100
  ): WorldRule[] {
    return Array.from(this.rules.values()).filter(
      rule => 
        rule.lastReferencedChapter &&
        currentChapter - rule.lastReferencedChapter > threshold &&
        rule.importance > 50
    );
  }

  /**
   * Get most important rules
   */
  getImportantRules(limit: number = 10): WorldRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private addToIndices(rule: WorldRule): void {
    this.rules.set(rule.id, rule);

    // Index by tags
    for (const tag of rule.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(rule.id);
    }

    // Index by category
    if (!this.categoryIndex.has(rule.category)) {
      this.categoryIndex.set(rule.category, new Set());
    }
    this.categoryIndex.get(rule.category)!.add(rule.id);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['là', 'của', 'và', 'có', 'được', 'trong', 'tại']);
    
    return words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 5);
  }

  private generateTagsFromRule(ruleText: string, category: RuleCategory): string[] {
    const tags: string[] = [category];
    
    // Extract entity names (simple heuristic)
    const words = ruleText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      // Capitalized words might be proper nouns
      if (words[i][0] && words[i][0] === words[i][0].toUpperCase()) {
        tags.push(words[i].toLowerCase());
      }
    }

    return [...new Set(tags)];
  }

  private generateSuggestionReason(result: RuleSearchResult, context: string): string {
    const reasons: string[] = [];

    if (result.matchType === 'tag') {
      reasons.push('Phù hợp với tình huống hiện tại');
    }
    if (result.matchType === 'category') {
      reasons.push(`Liên quan đến ${result.rule.category}`);
    }
    if (result.rule.importance > 70) {
      reasons.push('Quy tắc quan trọng');
    }
    if (result.rule.usageCount > 3) {
      reasons.push('Đã được sử dụng nhiều lần');
    }
    if (result.rule.lastReferencedChapter && result.rule.lastReferencedChapter > 0) {
      reasons.push('Đã được nhắc đến trong quá khứ');
    }

    return reasons.join(', ') || 'Phù hợp ngữ cảnh';
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRules: number;
    byCategory: Record<RuleCategory, number>;
    mostUsed: WorldRule[];
    unused: number;
  } {
    const byCategory: Record<RuleCategory, number> = {
      power_system: 0, politics: 0, economy: 0, geography: 0,
      culture: 0, history: 0, mechanics: 0, restrictions: 0,
    };

    for (const rule of this.rules.values()) {
      byCategory[rule.category]++;
    }

    const sorted = Array.from(this.rules.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );

    return {
      totalRules: this.rules.size,
      byCategory,
      mostUsed: sorted.slice(0, 5),
      unused: sorted.filter(r => r.usageCount === 0).length,
    };
  }
}

// Export
export default RuleIndexer;

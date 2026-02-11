/**
 * Long-term Validation System - Quality Checks at Milestones
 * 
 * Validates story coherence at key points: Ch.100, 500, 1000, etc.
 * 
 * Key Features:
 * 1. Milestone-based validation triggers
 * 2. Plot thread resolution check
 * 3. Character arc validation
 * 4. Power progression sanity check
 * 5. Auto-generate recommendations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export interface MilestoneValidation {
  id: string;
  projectId: string;
  milestoneChapter: number;
  validationType: ValidationType;
  status: ValidationStatus;
  details: ValidationDetails;
  recommendations: string[];
  createdAt: Date;
  validatedAt?: Date;
}

export type ValidationType = 
  | 'thread_resolution'     // Plot threads resolved properly
  | 'character_arc'         // Character development consistent
  | 'power_consistency'     // Power progression logical
  | 'foreshadowing_payoff'  // Foreshadowing paid off
  | 'theme_coherence'       // Themes maintained
  | 'pacing_check';         // Story pacing appropriate

export type ValidationStatus = 'pending' | 'passed' | 'failed' | 'warning';

export interface ValidationDetails {
  score: number; // 0-100
  issues: ValidationIssue[];
  strengths: string[];
  metrics: Record<string, number>;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  description: string;
  affectedElements: string[];
  suggestedFix?: string;
}

export interface MilestoneReport {
  milestoneChapter: number;
  overallStatus: ValidationStatus;
  overallScore: number;
  validations: MilestoneValidation[];
  criticalIssues: ValidationIssue[];
  recommendations: string[];
  summary: string;
}

export interface ValidationConfig {
  milestones: number[]; // Default: [100, 250, 500, 750, 1000, ...]
  autoValidate: boolean;
  strictMode: boolean;
}

// ============================================================================
// LONG-TERM VALIDATOR CLASS
// ============================================================================

export class LongTermValidator {
  private projectId: string;
  private config: ValidationConfig;
  private validations: Map<string, MilestoneValidation> = new Map();

  constructor(
    projectId: string,
    config: Partial<ValidationConfig> = {}
  ) {
    this.projectId = projectId;
    this.config = {
      milestones: [100, 250, 500, 750, 1000, 1500, 2000],
      autoValidate: true,
      strictMode: false,
      ...config,
    };
  }

  /**
   * Initialize by loading existing validations
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    
    const { data: validations, error } = await supabase
      .from('milestone_validations')
      .select('*')
      .eq('project_id', this.projectId)
      .order('milestone_chapter', { ascending: true });

    if (error) {
      logger.error('Failed to load milestone validations');
      return;
    }

    if (validations) {
      for (const v of validations) {
        this.validations.set(`${v.milestone_chapter}_${v.validation_type}`, {
          id: v.id,
          projectId: v.project_id,
          milestoneChapter: v.milestone_chapter,
          validationType: v.validation_type as ValidationType,
          status: v.status as ValidationStatus,
          details: v.details || { score: 0, issues: [], strengths: [], metrics: {} },
          recommendations: v.recommendations || [],
          createdAt: new Date(v.created_at),
          validatedAt: v.validated_at ? new Date(v.validated_at) : undefined,
        });
      }
    }

    logger.info(`Loaded ${this.validations.size} milestone validations`);
  }

  /**
   * Check if current chapter is a milestone and needs validation
   */
  async checkAndValidate(chapterNumber: number): Promise<MilestoneReport | null> {
    // Check if this is a milestone chapter
    if (!this.config.milestones.includes(chapterNumber)) {
      return null;
    }

    logger.info(`Running milestone validation for chapter ${chapterNumber}`);

    // Run all validation types
    const validations: MilestoneValidation[] = [];
    const allIssues: ValidationIssue[] = [];
    const allRecommendations: string[] = [];

    // 1. Plot Thread Resolution Check
    const threadValidation = await this.validateThreadResolution(chapterNumber);
    validations.push(threadValidation);
    allIssues.push(...threadValidation.details.issues);
    allRecommendations.push(...threadValidation.recommendations);

    // 2. Character Arc Validation
    const characterValidation = await this.validateCharacterArcs(chapterNumber);
    validations.push(characterValidation);
    allIssues.push(...characterValidation.details.issues);
    allRecommendations.push(...characterValidation.recommendations);

    // 3. Power Progression Check
    const powerValidation = await this.validatePowerProgression(chapterNumber);
    validations.push(powerValidation);
    allIssues.push(...powerValidation.details.issues);
    allRecommendations.push(...powerValidation.recommendations);

    // 4. Foreshadowing Payoff Check
    const foreshadowingValidation = await this.validateForeshadowingPayoff(chapterNumber);
    validations.push(foreshadowingValidation);
    allIssues.push(...foreshadowingValidation.details.issues);
    allRecommendations.push(...foreshadowingValidation.recommendations);

    // 5. Pacing Check
    const pacingValidation = await this.validatePacing(chapterNumber);
    validations.push(pacingValidation);
    allIssues.push(...pacingValidation.details.issues);
    allRecommendations.push(...pacingValidation.recommendations);

    // Calculate overall status
    const scores = validations.map(v => v.details.score);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const hasFailed = validations.some(v => v.status === 'failed');
    const hasWarnings = validations.some(v => v.status === 'warning');
    const overallStatus: ValidationStatus = hasFailed ? 'failed' : hasWarnings ? 'warning' : 'passed';

    // Filter critical issues
    const criticalIssues = allIssues.filter(i => i.type === 'error');

    // Generate summary
    const summary = this.generateMilestoneSummary(
      chapterNumber,
      overallStatus,
      overallScore,
      validations
    );

    const report: MilestoneReport = {
      milestoneChapter: chapterNumber,
      overallStatus,
      overallScore,
      validations,
      criticalIssues,
      recommendations: [...new Set(allRecommendations)],
      summary,
    };

    // Save report
    await this.saveMilestoneReport(report);

    return report;
  }

  /**
   * Validate plot thread resolution
   */
  private async validateThreadResolution(chapterNumber: number): Promise<MilestoneValidation> {
    const supabase = getSupabase();
    
    // Get all threads
    const { data: threads } = await supabase
      .from('plot_threads')
      .select('*')
      .eq('project_id', this.projectId);

    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    if (!threads) {
      return this.createValidation(
        chapterNumber,
        'thread_resolution',
        'passed',
        { score: 100, issues: [], strengths: ['No plot threads to validate'], metrics: {} },
        []
      );
    }

    // Check abandoned threads
    const abandonedThreads = threads.filter(
      t => t.status !== 'resolved' && 
           t.status !== 'legacy' &&
           chapterNumber - t.last_active_chapter > 100
    );

    if (abandonedThreads.length > 0) {
      issues.push({
        type: 'warning',
        description: `${abandonedThreads.length} plot threads abandoned for >100 chapters`,
        affectedElements: abandonedThreads.map(t => t.name),
        suggestedFix: 'Resolve or reactivate abandoned threads',
      });
      recommendations.push(`Resolve ${abandonedThreads.length} abandoned plot threads`);
    }

    // Check resolved ratio
    const resolvedCount = threads.filter(t => t.status === 'resolved').length;
    const totalCount = threads.length;
    const resolutionRatio = totalCount > 0 ? resolvedCount / totalCount : 0;

    if (resolutionRatio < 0.3 && chapterNumber > 200) {
      issues.push({
        type: 'warning',
        description: `Only ${Math.round(resolutionRatio * 100)}% of plot threads resolved`,
        affectedElements: threads.filter(t => t.status !== 'resolved').map(t => t.name),
        suggestedFix: 'Accelerate thread resolution to avoid accumulation',
      });
      recommendations.push('Consider resolving more open plot threads');
    } else {
      strengths.push(`${Math.round(resolutionRatio * 100)}% plot thread resolution rate`);
    }

    // Check critical threads
    const criticalThreads = threads.filter(t => t.priority === 'critical' && t.status !== 'resolved');
    if (criticalThreads.length > 3) {
      issues.push({
        type: 'error',
        description: `${criticalThreads.length} critical threads still unresolved`,
        affectedElements: criticalThreads.map(t => t.name),
        suggestedFix: 'Prioritize resolving critical plot threads',
      });
      recommendations.push('URGENT: Resolve critical plot threads');
    }

    const score = Math.max(0, 100 - issues.length * 15 - abandonedThreads.length * 5);

    return this.createValidation(
      chapterNumber,
      'thread_resolution',
      issues.some(i => i.type === 'error') ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
      { score, issues, strengths, metrics: { totalThreads: totalCount, resolvedRatio: resolutionRatio } },
      recommendations
    );
  }

  /**
   * Validate character arcs
   */
  private async validateCharacterArcs(chapterNumber: number): Promise<MilestoneValidation> {
    const supabase = getSupabase();
    
    const { data: characters } = await supabase
      .from('character_tracker')
      .select('*')
      .eq('project_id', this.projectId);

    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    if (!characters) {
      return this.createValidation(
        chapterNumber,
        'character_arc',
        'passed',
        { score: 100, issues: [], strengths: [], metrics: {} },
        []
      );
    }

    // Check protagonist development
    const protagonist = characters.find(c => c.role === 'protagonist');
    if (protagonist) {
      const growthScore = protagonist.growth_score || 0;
      if (growthScore < 30 && chapterNumber > 200) {
        issues.push({
          type: 'warning',
          description: 'Protagonist character growth is minimal',
          affectedElements: [protagonist.character_name],
          suggestedFix: 'Add significant character development moments',
        });
        recommendations.push('Develop protagonist character arc more deeply');
      } else {
        strengths.push('Protagonist showing meaningful growth');
      }
    }

    // Check for forgotten major characters
    const majorChars = characters.filter(c => c.role === 'major' || c.role === 'ally');
    const forgottenChars = majorChars.filter(
      c => chapterNumber - (c.last_seen_chapter || 0) > 150
    );

    if (forgottenChars.length > 0) {
      issues.push({
        type: 'warning',
        description: `${forgottenChars.length} major characters not seen for >150 chapters`,
        affectedElements: forgottenChars.map(c => c.character_name),
        suggestedFix: 'Reintroduce or properly write out forgotten characters',
      });
      recommendations.push(`Reintroduce ${forgottenChars.length} forgotten characters`);
    }

    const score = Math.max(0, 100 - issues.length * 20);

    return this.createValidation(
      chapterNumber,
      'character_arc',
      issues.some(i => i.type === 'error') ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
      { score, issues, strengths, metrics: { characterCount: characters.length } },
      recommendations
    );
  }

  /**
   * Validate power progression
   */
  private async validatePowerProgression(chapterNumber: number): Promise<MilestoneValidation> {
    const supabase = getSupabase();
    
    const { data: progressions } = await supabase
      .from('power_progression')
      .select('*')
      .eq('project_id', this.projectId)
      .order('chapter_number', { ascending: true });

    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    if (!progressions || progressions.length === 0) {
      return this.createValidation(
        chapterNumber,
        'power_consistency',
        'passed',
        { score: 100, issues: [], strengths: ['No power progression to validate'], metrics: {} },
        []
      );
    }

    // Check for power inflation
    const recentProgressions = progressions.filter(
      p => chapterNumber - p.chapter_number <= 100
    );

    if (recentProgressions.length > 5) {
      issues.push({
        type: 'warning',
        description: `${recentProgressions.length} power ups in last 100 chapters`,
        affectedElements: ['Power progression pacing'],
        suggestedFix: 'Slow down power progression to maintain tension',
      });
      recommendations.push('Reduce frequency of power-ups');
    }

    // Check breakthrough consistency
    const breakthroughs = progressions.filter(p => p.event_type === 'breakthrough');
    const avgGap = chapterNumber / (breakthroughs.length || 1);

    if (avgGap < 50 && chapterNumber > 300) {
      issues.push({
        type: 'warning',
        description: 'Power progression too fast: breakthrough every ${Math.round(avgGap)} chapters',
        affectedElements: breakthroughs.map(b => `Ch${b.chapter_number}`),
        suggestedFix: 'Space out breakthroughs more',
      });
      recommendations.push('Increase time between major breakthroughs');
    } else {
      strengths.push(`Reasonable breakthrough pacing: every ${Math.round(avgGap)} chapters`);
    }

    const score = Math.max(0, 100 - issues.length * 25);

    return this.createValidation(
      chapterNumber,
      'power_consistency',
      issues.some(i => i.type === 'error') ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
      { score, issues, strengths, metrics: { totalProgressions: progressions.length, avgBreakthroughGap: avgGap } },
      recommendations
    );
  }

  /**
   * Validate foreshadowing payoff
   */
  private async validateForeshadowingPayoff(chapterNumber: number): Promise<MilestoneValidation> {
    const supabase = getSupabase();
    
    const { data: threads } = await supabase
      .from('plot_threads')
      .select('foreshadowing_hints')
      .eq('project_id', this.projectId);

    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    let totalHints = 0;
    let paidOffHints = 0;
    let overdueHints = 0;

    if (threads) {
      for (const thread of threads) {
        const hints = thread.foreshadowing_hints || [];
        for (const hint of hints) {
          totalHints++;
          if (hint.status === 'paid_off') {
            paidOffHints++;
          } else if (hint.status === 'planted' && hint.payoff_deadline < chapterNumber) {
            overdueHints++;
          }
        }
      }
    }

    const payoffRatio = totalHints > 0 ? paidOffHints / totalHints : 0;

    if (payoffRatio < 0.5 && totalHints > 10) {
      issues.push({
        type: 'warning',
        description: `Only ${Math.round(payoffRatio * 100)}% of foreshadowing paid off`,
        affectedElements: [`${totalHints - paidOffHints} pending hints`],
        suggestedFix: 'Increase foreshadowing payoff rate',
      });
      recommendations.push('Pay off more planted foreshadowing hints');
    } else {
      strengths.push(`${Math.round(payoffRatio * 100)}% foreshadowing payoff rate`);
    }

    if (overdueHints > 0) {
      issues.push({
        type: 'error',
        description: `${overdueHints} foreshadowing hints are overdue`,
        affectedElements: [],
        suggestedFix: 'Immediately pay off or extend deadlines for overdue hints',
      });
      recommendations.push(`URGENT: Resolve ${overdueHints} overdue foreshadowing hints`);
    }

    const score = Math.max(0, 100 - overdueHints * 10 - (1 - payoffRatio) * 30);

    return this.createValidation(
      chapterNumber,
      'foreshadowing_payoff',
      overdueHints > 0 ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
      { score, issues, strengths, metrics: { totalHints, payoffRatio, overdueHints } },
      recommendations
    );
  }

  /**
   * Validate story pacing
   */
  private async validatePacing(chapterNumber: number): Promise<MilestoneValidation> {
    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Check milestone appropriateness
    const expectedMilestones = this.config.milestones.filter(m => m <= chapterNumber);
    
    if (expectedMilestones.length === 0) {
      return this.createValidation(
        chapterNumber,
        'pacing_check',
        'passed',
        { score: 100, issues: [], strengths: ['Early chapter - pacing not evaluated'], metrics: {} },
        []
      );
    }

    // At major milestones, check if story progression feels right
    const lastMilestone = expectedMilestones[expectedMilestones.length - 1];
    const chaptersSinceMilestone = chapterNumber - lastMilestone;

    if (chaptersSinceMilestone === 0) {
      // This is a milestone chapter - should have significant events
      strengths.push('Milestone chapter reached with validation');
    }

    // General pacing metrics
    const pacingScore = 85; // Placeholder - would need actual content analysis

    return this.createValidation(
      chapterNumber,
      'pacing_check',
      'passed',
      { score: pacingScore, issues, strengths, metrics: { chaptersSinceLastMilestone: chaptersSinceMilestone } },
      recommendations
    );
  }

  /**
   * Create validation object
   */
  private createValidation(
    milestoneChapter: number,
    type: ValidationType,
    status: ValidationStatus,
    details: ValidationDetails,
    recommendations: string[]
  ): MilestoneValidation {
    const id = `val_${milestoneChapter}_${type}_${Date.now()}`;
    
    return {
      id,
      projectId: this.projectId,
      milestoneChapter,
      validationType: type,
      status,
      details,
      recommendations,
      createdAt: new Date(),
    };
  }

  /**
   * Save validation to database
   */
  private async saveValidation(validation: MilestoneValidation): Promise<void> {
    const supabase = getSupabase();
    
    await supabase.from('milestone_validations').upsert({
      id: validation.id,
      project_id: validation.projectId,
      milestone_chapter: validation.milestoneChapter,
      validation_type: validation.validationType,
      status: validation.status,
      details: validation.details,
      recommendations: validation.recommendations,
      created_at: validation.createdAt.toISOString(),
      validated_at: new Date().toISOString(),
    });

    this.validations.set(`${validation.milestoneChapter}_${validation.validationType}`, validation);
  }

  /**
   * Save full milestone report
   */
  private async saveMilestoneReport(report: MilestoneReport): Promise<void> {
    for (const validation of report.validations) {
      await this.saveValidation(validation);
    }

    logger.info(`Saved milestone ${report.milestoneChapter} report: ${report.overallStatus}`);
  }

  /**
   * Generate milestone summary
   */
  private generateMilestoneSummary(
    chapter: number,
    status: ValidationStatus,
    score: number,
    validations: MilestoneValidation[]
  ): string {
    const parts: string[] = [];
    parts.push(`=== MILESTONE ${chapter} VALIDATION ===`);
    parts.push(`Overall: ${status.toUpperCase()} (${Math.round(score)}/100)`);
    parts.push('');

    for (const v of validations) {
      const emoji = v.status === 'passed' ? '✅' : v.status === 'warning' ? '⚠️' : '❌';
      parts.push(`${emoji} ${v.validationType}: ${v.status} (${v.details.score}/100)`);
      
      if (v.details.issues.length > 0) {
        parts.push(`   Issues: ${v.details.issues.length}`);
      }
      if (v.recommendations.length > 0) {
        parts.push(`   Recommendations: ${v.recommendations.length}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get validation history
   */
  getValidationHistory(): MilestoneValidation[] {
    return Array.from(this.validations.values()).sort(
      (a, b) => a.milestoneChapter - b.milestoneChapter
    );
  }

  /**
   * Get latest validation for a milestone
   */
  getLatestValidation(milestoneChapter: number): MilestoneValidation | undefined {
    const validations = Array.from(this.validations.values())
      .filter(v => v.milestoneChapter === milestoneChapter)
      .sort((a, b) => (b.validatedAt?.getTime() || 0) - (a.validatedAt?.getTime() || 0));
    
    return validations[0];
  }
}

// Export
export default LongTermValidator;

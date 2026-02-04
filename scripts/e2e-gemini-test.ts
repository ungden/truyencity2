/**
 * E2E Test: Story Writing Factory with Gemini 3 Flash Preview
 *
 * Runs the full pipeline:
 *   StoryPlanner.planStory() -> planAllArcs() -> ChapterWriter (3-agent) -> QC
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/e2e-gemini-test.ts
 *
 * Requires:
 *   GEMINI_API_KEY in .env.local or environment
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for quality trackers
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local before any imports that might use env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig } from '@/services/story-writing-factory/types';

// ============================================================================
// CONFIG
// ============================================================================

const GEMINI_MODEL = 'gemini-2.0-flash';
const TARGET_CHAPTERS = 2;
const CHAPTERS_PER_ARC = 2;

const STORY_INPUT = {
  title: 'Vạn Cổ Kiếm Thần',
  protagonistName: 'Lâm Phong',
  genre: 'tien-hiep' as const,
  premise:
    'Lâm Phong, thiếu niên bị phế kinh mạch trong gia tộc, tình cờ nhặt được mảnh vỡ thần kiếm thượng cổ. ' +
    'Từ kẻ bị khinh thường nhất, hắn từng bước đi trên con đường trở thành Kiếm Thần vô thượng.',
  targetChapters: TARGET_CHAPTERS,
  chaptersPerArc: CHAPTERS_PER_ARC,
};

// ============================================================================
// HELPERS
// ============================================================================

function timestamp(): string {
  return new Date().toISOString().substring(11, 23);
}

function log(label: string, msg: string): void {
  console.log(`[${timestamp()}] [${label}] ${msg}`);
}

function separator(title: string): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

// ============================================================================
// QUICK SMOKE TEST: Direct Gemini API call
// ============================================================================

async function smokeTestGemini(aiService: AIProviderService): Promise<boolean> {
  log('SMOKE', 'Testing Gemini API connection...');

  const response = await aiService.chat({
    provider: 'gemini',
    model: GEMINI_MODEL,
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Reply in Vietnamese.' },
      { role: 'user', content: 'Nói "Xin chào" và cho biết bạn là model gì.' },
    ],
    temperature: 1.0,
    maxTokens: 100,
  });

  if (!response.success) {
    log('SMOKE', `FAILED: ${response.error}`);
    return false;
  }

  log('SMOKE', `OK: ${response.content?.substring(0, 120)}...`);
  log('SMOKE', `Tokens: prompt=${response.usage?.promptTokens} completion=${response.usage?.completionTokens}`);
  return true;
}

// ============================================================================
// MAIN E2E TEST
// ============================================================================

async function main(): Promise<void> {
  const overallStart = Date.now();

  separator('E2E TEST: Story Writing Factory + Gemini');
  log('INIT', `Model: ${GEMINI_MODEL}`);
  log('INIT', `Story: "${STORY_INPUT.title}" by ${STORY_INPUT.protagonistName}`);
  log('INIT', `Target: ${TARGET_CHAPTERS} chapters, ${CHAPTERS_PER_ARC} per arc`);

  // ---- Check env vars ----
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('ERROR: GEMINI_API_KEY not set. Create .env.local or export it.');
    process.exit(1);
  }
  log('INIT', `GEMINI_API_KEY: ${geminiKey.substring(0, 10)}...`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  log('INIT', `Supabase URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  log('INIT', `Supabase Key: ${supabaseKey ? 'SET' : 'NOT SET'}`);

  // ---- Create AI service with Gemini key ----
  const aiService = new AIProviderService({ gemini: geminiKey });

  // ---- Smoke test ----
  separator('Phase 0: Smoke Test');
  const smokeOk = await smokeTestGemini(aiService);
  if (!smokeOk) {
    console.error('Smoke test failed. Aborting.');
    process.exit(1);
  }

  // ---- Create runner ----
  separator('Phase 1: Initialize Runner');

  const factoryConfig: Partial<FactoryConfig> = {
    provider: 'gemini',
    model: GEMINI_MODEL,
    temperature: 1.0, // Gemini recommended
    maxTokens: 8192,
    targetWordCount: 2000, // Shorter for E2E test
    genre: 'tien-hiep',
    minQualityScore: 5, // Lenient for testing
    maxRetries: 2,
    use3AgentWorkflow: true,
  };

  const runnerConfig: Partial<RunnerConfig> = {
    delayBetweenChapters: 1000,
    delayBetweenArcs: 2000,
    maxChapterRetries: 2,
    autoSaveEnabled: true,
    autoSaveInterval: 1, // Save every chapter for testing
    minQualityToProgress: 5,
    pauseOnError: false, // Don't pause in E2E, just log
    pauseAfterArc: false,
  };

  const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);

  // Set callbacks for logging
  runner.setCallbacks({
    onStoryPlanned: (outline) => {
      log('PLAN', `Story planned: "${outline.title}"`);
      log('PLAN', `Premise: ${outline.premise.substring(0, 150)}...`);
      log('PLAN', `Arcs: ${outline.targetArcs}, Chapters: ${outline.targetChapters}`);
      log('PLAN', `Protagonist arc: ${outline.protagonist.characterArc}`);
      log('PLAN', `Plot points: ${outline.majorPlotPoints.map(p => p.name).join(', ')}`);
    },

    onArcPlanned: (arc) => {
      log('ARC', `Arc ${arc.arcNumber}: "${arc.title}" (${arc.theme}) - ${arc.chapterCount} chapters`);
    },

    onArcStarted: (arcNum, arc) => {
      separator(`Writing Arc ${arcNum}: ${arc.title}`);
    },

    onArcCompleted: (arcNum, arc) => {
      log('ARC', `Arc ${arcNum} completed: ${arc.chapterOutlines.length} chapters`);
    },

    onChapterStarted: (chNum) => {
      log('WRITE', `--- Starting Chapter ${chNum} ---`);
    },

    onChapterCompleted: (chNum, result) => {
      if (result.data) {
        log('WRITE', `Chapter ${chNum}: "${result.data.title}"`);
        log('WRITE', `  Words: ${result.data.wordCount} | Quality: ${result.data.qualityScore}/10 | Status: ${result.data.status}`);
        log('WRITE', `  Duration: ${formatDuration(result.duration)}`);
        if (result.criticReport) {
          log('CRITIC', `  Overall: ${result.criticReport.overallScore} | Dopamine: ${result.criticReport.dopamineScore} | Pacing: ${result.criticReport.pacingScore}`);
          if (result.criticReport.issues.length > 0) {
            log('CRITIC', `  Issues: ${result.criticReport.issues.map(i => `[${i.severity}] ${i.description}`).join('; ')}`);
          }
        }
        // Print first 300 chars of content
        log('PREVIEW', `  "${result.data.content.substring(0, 300)}..."`);
      }
    },

    onChapterFailed: (chNum, error) => {
      log('FAIL', `Chapter ${chNum} FAILED: ${error}`);
    },

    onProgress: (state) => {
      const pct = state.totalChapters > 0
        ? Math.round((state.chaptersWritten / state.totalChapters) * 100)
        : 0;
      log('PROGRESS', `${state.chaptersWritten}/${state.totalChapters} (${pct}%) | Words: ${state.totalWords} | Failed: ${state.chaptersFailed}`);
    },

    onStatusChange: (status, message) => {
      log('STATUS', `[${status}] ${message}`);
    },

    onCompleted: (state) => {
      separator('COMPLETED');
      log('DONE', `Total chapters: ${state.chaptersWritten}`);
      log('DONE', `Total words: ${state.totalWords}`);
      log('DONE', `Average words/chapter: ${state.averageWordsPerChapter}`);
      log('DONE', `Failed chapters: ${state.chaptersFailed}`);
    },

    onError: (error) => {
      log('ERROR', error);
    },
  });

  // ---- Run the story ----
  separator('Phase 2: Running Story Pipeline');
  log('RUN', 'Starting full pipeline: Plan Story -> Plan Arcs -> Write Chapters');

  const result = await runner.run(STORY_INPUT);

  // ---- Results ----
  separator('Final Results');

  if (result.success) {
    log('RESULT', 'SUCCESS');
  } else {
    log('RESULT', `FAILED: ${result.error}`);
  }

  log('RESULT', `Status: ${result.state.status}`);
  log('RESULT', `Chapters written: ${result.state.chaptersWritten}/${result.state.totalChapters}`);
  log('RESULT', `Total words: ${result.state.totalWords}`);
  log('RESULT', `Average: ${result.state.averageWordsPerChapter} words/chapter`);
  log('RESULT', `Failed: ${result.state.chaptersFailed}`);

  // ---- Quality Systems Report ----
  const qualitySystems = runner.getQualitySystems();
  if (qualitySystems.lastQCResult) {
    separator('Quality Report (Last Chapter)');
    const qc = qualitySystems.lastQCResult;
    log('QC', `Overall: ${qc.scores.overall}/100`);
    log('QC', `Action: ${qc.action}`);
    if (qc.warnings.length > 0) {
      log('QC', `Warnings: ${qc.warnings.join('; ')}`);
    }
    if (qc.failures.length > 0) {
      log('QC', `Failures: ${qc.failures.join('; ')}`);
    }
  }

  // ---- Cost Report ----
  const costReport = runner.getCostReport();
  separator('Cost Report');
  log('COST', `Total calls: ${costReport.totalCalls}`);
  log('COST', `Total tokens: ${costReport.totalTokens}`);
  log('COST', `Estimated cost: $${costReport.estimatedCost.toFixed(4)}`);

  // ---- Print written chapters ----
  const chapters = runner.getWrittenChapters();
  if (chapters.size > 0) {
    separator('Written Chapters Summary');
    for (const [num, ch] of chapters) {
      console.log(`\n--- Chapter ${num}: ${ch.title} (${ch.wordCount} words, quality: ${ch.qualityScore}) ---`);
      console.log(ch.content.substring(0, 500) + '...\n');
    }
  }

  // ---- Timing ----
  const totalTime = Date.now() - overallStart;
  separator('Timing');
  log('TIME', `Total: ${formatDuration(totalTime)}`);
  log('TIME', `Start: ${new Date(result.state.startedAt).toISOString()}`);
  log('TIME', `End: ${new Date().toISOString()}`);

  // Exit
  process.exit(result.success ? 0 : 1);
}

// ============================================================================
// RUN
// ============================================================================

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(2);
});

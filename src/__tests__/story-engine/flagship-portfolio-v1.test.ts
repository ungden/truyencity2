import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  FLAGSHIP_FIRST_30_MANIFEST,
  FLAGSHIP_MARKET_RESEARCH_V1,
} from '@/services/story-engine/flagship/portfolio-data';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '@/services/story-engine/flagship/catalogue-data';
import { FLAGSHIP_OPENING_COHORT_BRIEFS_V2 } from '@/services/story-engine/flagship/portfolio-setup-briefs-data';
import { BlindSlotReviewV1Schema, rankBlindSlotReview } from '@/services/story-engine/flagship/portfolio-opening-review';
import {
  FLAGSHIP_CHINESE_BENCHMARKS_V1,
  buildConceptLabPrompt,
  distillBenchmarkForConceptLab,
  FlagshipSetupBriefV2Schema,
  ConceptTournamentArtifactV2Schema,
  generateConceptTournamentV2,
  getChineseBenchmarkPack,
  validateBenchmarkCoverage,
  validateFlagshipCatalogue,
  validatePortfolioResearch,
} from '@/services/story-engine/flagship';

describe('flagship first-30 portfolio', () => {
  const validated = validatePortfolioResearch(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1);
  const benchmarks = validateBenchmarkCoverage(validated.manifest, FLAGSHIP_CHINESE_BENCHMARKS_V1);
  const catalogue = validateFlagshipCatalogue(validated.manifest, FLAGSHIP_FIRST_30_CATALOGUE_V1).catalogue;

  it('locks the 30-story allocation and 30-to-9 cohort', () => {
    const slots = validated.manifest.slots;
    expect(slots).toHaveLength(30);
    expect(slots.filter(slot => slot.audience === 'male')).toHaveLength(30);
    expect(slots.every(slot => /^(HX|TH|DT)-\d{2}$/.test(slot.slotId))).toBe(true);
    expect(slots.filter(slot => slot.portfolioGroup === 'fantasy')).toHaveLength(12);
    expect(slots.filter(slot => slot.portfolioGroup === 'urban_era_dual_world')).toHaveLength(18);
    expect(slots.filter(slot => slot.promotionCohort === 'opening_tournament')).toHaveLength(9);
  });

  it('keeps all lanes and causal fingerprints distinct', () => {
    const slots = validated.manifest.slots;
    expect(new Set(slots.map(slot => slot.genreLane)).size).toBe(30);
    expect(new Set(slots.map(slot => slot.distinctnessFingerprint)).size).toBe(30);
  });

  it('prepares one distinct concept package for every portfolio slot without materializing StorySpec', () => {
    expect(catalogue.packages).toHaveLength(30);
    expect(new Set(catalogue.packages.map(item => item.title)).size).toBe(30);
    expect(new Set(catalogue.packages.map(item => item.visualFingerprint)).size).toBe(30);
    expect(catalogue.packages.every(item => item.status === 'concept_package_ready')).toBe(true);
    expect(catalogue.packages.every(item => item.storySpecStatus === 'not_materialized')).toBe(true);
    expect(catalogue.packages.every(item => item.writerIsolation)).toBe(true);
  });

  it('keeps ImageGen art-only and makes ratio, Vietnamese title and watermark deterministic', () => {
    for (const item of catalogue.packages) {
      expect(item.coverArt.imagePrompt).toContain('strict 3:4 portrait composition');
      expect(item.coverArt.imagePrompt).toContain('no sparkles');
      expect(item.coverArt.imagePrompt).toContain('no bokeh');
      expect(item.coverArt.imagePrompt).toContain('no text, no letters, no typography, no watermark');
      expect(item.coverArt.imagePrompt).not.toContain(item.title);
      expect(item.coverArt.imagePrompt).not.toContain('truyencity.com');
      expect(item.coverArt.renderSpec).toEqual({
        width: 1086,
        height: 1448,
        title: item.title,
        watermark: 'truyencity.com',
      });
    }
  });

  it('ships all 30 reproducible source illustrations and rendered 3:4 covers', async () => {
    validateFlagshipCatalogue(validated.manifest, catalogue, { requireCoverFiles: true, workspaceRoot: process.cwd() });
    for (const item of catalogue.packages) {
      const cover = readFileSync(path.join(process.cwd(), 'public', item.coverArt.assetPath.replace(/^\//, '')));
      const source = readFileSync(path.join(process.cwd(), 'public', item.coverArt.sourceAssetPath.replace(/^\//, '')));
      expect(source.length).toBeGreaterThan(100_000);
      expect(cover.subarray(0, 4).toString('ascii')).toBe('RIFF');
      const metadata = await sharp(cover).metadata();
      expect(metadata).toMatchObject({ format: 'webp', width: 1086, height: 1448 });
    }
  });

  it('uses the bounded advantage mix instead of one universal setup', () => {
    const counts = validated.manifest.slots.reduce<Record<string, number>>((result, slot) => {
      result[slot.advantageFamily] = (result[slot.advantageFamily] || 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ native: 11, bounded_system: 3, transmigration: 4, rebirth: 6, simulation_loop: 2, script_awareness: 2, dual_world: 2 });
  });

  it('gives every selected lane source-backed upstream cards', () => {
    const cards = new Map(validated.registry.cards.map(card => [card.id, card]));
    for (const slot of validated.manifest.slots) {
      for (const cardId of slot.laneCardIds) {
        expect(cards.get(cardId)?.sourceIds.length).toBeGreaterThanOrEqual(3);
        expect(cards.get(cardId)).toMatchObject({ usage: 'upstream_concept_lab_only', mustNeverReachWriter: true });
      }
    }
  });

  it('requires a six-work Chinese benchmark pack for every opening lane', () => {
    expect(benchmarks.packs).toHaveLength(9);
    for (const pack of benchmarks.packs) {
      expect(pack.comparables.length).toBeGreaterThanOrEqual(6);
      expect(pack.sourceUrls.length).toBeGreaterThanOrEqual(3);
      expect(pack).toMatchObject({
        usage: 'upstream_concept_lab_only',
        mustNeverReachChapterRoles: true,
        inspirationMode: 'mechanisms_not_expression',
      });
    }
  });

  it('gives all nine opening lanes a valid story-specific setup brief', () => {
    const briefs = Object.values(FLAGSHIP_OPENING_COHORT_BRIEFS_V2);
    expect(briefs).toHaveLength(9);
    expect(new Set(briefs.map(brief => brief.portfolioSlotId)).size).toBe(9);
    expect(new Set(briefs.map(brief => brief.domain)).size).toBe(9);
    expect(new Set(briefs.map(brief => brief.pleasureProfile.advantage)).size).toBe(9);
    expect(briefs.every(brief => brief.promotionCohort === 'opening_tournament')).toBe(true);
    expect(briefs.every(brief => brief.researchNotes.length >= 3)).toBe(true);
    expect(briefs.every(brief => brief.boundaries.length >= 7)).toBe(true);
    expect(briefs.every(brief => brief.pleasureProfile.setbackRecoveryWindow <= 3)).toBe(true);
    for (const brief of briefs) {
      const slot = validated.manifest.slots.find(item => item.slotId === brief.portfolioSlotId)!;
      expect(FlagshipSetupBriefV2Schema.parse(brief)).toEqual(brief);
      expect(brief.genreLane).toBe(slot.genreLane);
      expect(brief.distinctnessFingerprint).toBe(slot.distinctnessFingerprint);
      expect(brief.pleasureProfile.realityMode).toBe(slot.worldMode);
    }
  });

  it('ships nine schema-valid tournaments and nine blind editorial reviews without materializing stories', () => {
    const slotIds = Object.keys(FLAGSHIP_OPENING_COHORT_BRIEFS_V2).sort();
    let concepts = 0;
    let openings = 0;
    let chapters = 0;
    for (const slotId of slotIds) {
      const directory = path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/tournaments', slotId.toLowerCase());
      const tournament = ConceptTournamentArtifactV2Schema.parse(JSON.parse(readFileSync(path.join(directory, 'tournament.json'), 'utf8')));
      const review = BlindSlotReviewV1Schema.parse(JSON.parse(readFileSync(path.join(directory, 'editorial-review.json'), 'utf8')));
      expect(tournament.status).toBe('awaiting_human_selection');
      expect(review.ballots.map(item => item.blindCode).sort()).toEqual([
        `${slotId.replace('-', '')}-A`,
        `${slotId.replace('-', '')}-B`,
        `${slotId.replace('-', '')}-C`,
      ]);
      concepts += tournament.concepts.length;
      openings += tournament.openings.length;
      chapters += tournament.openings.reduce((total, opening) => total + opening.chapters.length, 0);
    }
    expect({ tournaments: slotIds.length, concepts, openings, chapters }).toEqual({ tournaments: 9, concepts: 180, openings: 27, chapters: 81 });

    const recommendation = JSON.parse(readFileSync(path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/portfolio-recommendation.json'), 'utf8'));
    expect(recommendation).toMatchObject({
      status: 'awaiting_human_portfolio_selection',
      reviewedSlots: 9,
      humanGateRequired: true,
      storySpecsMaterialized: 0,
      productionWrites: 0,
    });
    expect(recommendation.recommendedFinalists.map((item: { slotId: string }) => item.slotId)).toEqual(['HX-04', 'TH-01', 'DT-11']);
  });

  it('distills mechanisms for Concept Lab without exposing titles, authors or source URLs', () => {
    const pack = getChineseBenchmarkPack('DT-03')!;
    const guidance = distillBenchmarkForConceptLab(pack);
    const serialized = JSON.stringify(guidance);
    for (const comparable of pack.comparables) {
      expect(serialized).not.toContain(comparable.title);
      expect(serialized).not.toContain(comparable.author);
    }
    for (const url of pack.sourceUrls) expect(serialized).not.toContain(url);

    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'blueprints/flagship-coastal-era-pilot/setup-brief-v2.json'), 'utf8'));
    const brief = FlagshipSetupBriefV2Schema.parse({
      ...raw,
      portfolioSlotId: 'DT-03',
      genreLane: 'era_industrial',
      laneCardIds: ['market_era_livelihood', 'market_urban_professional'],
      promotionCohort: 'opening_tournament',
    });
    const prompt = buildConceptLabPrompt(brief, guidance);
    expect(prompt).toContain(pack.id);
    expect(prompt).toContain('worldProof');
    expect(prompt).toContain('tuyệt đối không trả bare array');
    for (const comparable of pack.comparables) expect(prompt).not.toContain(comparable.title);
  });

  it('blocks an opening tournament before any model call when its benchmark pack is missing', async () => {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'blueprints/flagship-coastal-era-pilot/setup-brief-v2.json'), 'utf8'));
    const brief = FlagshipSetupBriefV2Schema.parse({ ...raw, promotionCohort: 'opening_tournament' });
    let calls = 0;
    await expect(generateConceptTournamentV2(brief, { invoke: async () => { calls += 1; return '{}'; } }))
      .rejects.toMatchObject({ code: 'setup_blocked' });
    expect(calls).toBe(0);
  });

  it('forbids portfolio and market-card modules from the chapter role prompts', () => {
    const prompts = readFileSync(path.join(process.cwd(), 'src/services/story-engine/flagship/prompts.ts'), 'utf8');
    expect(prompts).not.toContain("from './portfolio'");
    expect(prompts).not.toContain("from './portfolio-data'");
    expect(prompts).not.toContain("from './catalogue'");
    expect(prompts).not.toContain("from './catalogue-data'");
    expect(prompts).not.toContain('MARKET_CARD');
    expect(prompts).not.toContain('PORTFOLIO_SLOT');
    expect(prompts).not.toContain('chinese-benchmark');
    expect(prompts).not.toContain('BENCHMARK_MECHANISMS_ONLY');
  });

  it('keeps the two old pilot briefs as lab references outside the first 30', () => {
    for (const directory of ['flagship-coastal-era-pilot', 'flagship-urban-business-pilot']) {
      const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'blueprints', directory, 'setup-brief-v2.json'), 'utf8'));
      const brief = FlagshipSetupBriefV2Schema.parse(raw);
      expect(brief.promotionCohort).toBe('lab_reference');
    }
  });

  it('has no production mutation in the preparation commands', () => {
    const promote = readFileSync(path.join(process.cwd(), 'scripts/flagship-portfolio-promote.ts'), 'utf8');
    const tournaments = readFileSync(path.join(process.cwd(), 'scripts/flagship-portfolio-tournaments.ts'), 'utf8');
    const review = readFileSync(path.join(process.cwd(), 'scripts/flagship-portfolio-review-openings.ts'), 'utf8');
    expect(promote).toContain('databaseWrites: 0');
    expect(promote).toContain('SETUP_BLOCKED');
    expect(promote).not.toContain('getSupabase');
    expect(tournaments).toContain('productionWrites: 0');
    expect(tournaments).toContain('checkpoint');
    expect(tournaments).not.toContain('getSupabase');
    expect(tournaments).not.toContain('chapter-writer');
    expect(tournaments).not.toContain('orchestrator');
    expect(review).toContain('productionWrites: 0');
    expect(review).toContain('humanGateRequired: true');
    expect(review).not.toContain('getSupabase');
    expect(review).not.toContain('chapter-writer');
    expect(review).not.toContain('orchestrator');
  });

  it('ranks blind openings by reading quality and applies explicit critical penalties', () => {
    const ballot = (blindCode: string, score: number, criticalFails: string[] = []) => ({
      blindCode,
      axes: { opening_pull: score, world_specificity: score, protagonist_agency: score, causal_reward: score, character_life: score, seriality_30: score, prose_naturalness: score, read_chapter_4: score },
      criticalFails,
      evidence: [
        { axis: 'opening_pull', chapterNumber: 1, span: 'Một evidence span đủ dài', reason: 'Lựa chọn này tạo hậu quả trực tiếp cho chương tiếp theo.' },
        { axis: 'read_chapter_4', chapterNumber: 3, span: 'Một evidence span thứ hai', reason: 'Áp lực chưa giải quyết tạo nhu cầu đọc tiếp có nguyên nhân.' },
      ],
      confidence: 0.8,
      summary: 'Opening được chấm từ prose và thay đổi trạng thái thực tế, không dựa vào concept score.',
    });
    const review = BlindSlotReviewV1Schema.parse({ schemaVersion: 1, ballots: [ballot('HX01-A', 5, ['ai_sounding_prose']), ballot('HX01-B', 4), ballot('HX01-C', 3)] });
    expect(rankBlindSlotReview(review)[0].blindCode).toBe('HX01-B');
  });
});

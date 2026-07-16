#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { MarketResearchSnapshotV3Schema } from '../src/services/story-engine/flagship-v3';

type SetupBriefV2 = {
  portfolioSlotId: string;
  genreLane: string;
  audience: string;
  desiredExperience: string;
  domain: string;
  pleasureProfile: { primaryRewardLoop: string[] };
  boundaries: string[];
  researchQuestions: string[];
  researchNotes: Array<{ source: string; finding: string }>;
  seedConstraints: string[];
};

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const setupPath = value('--setup-brief');
const outputPath = value('--output');
if (!setupPath || !outputPath) throw new Error('--setup-brief and --output are required.');

const brief = JSON.parse(readFileSync(path.resolve(setupPath), 'utf8')) as SetupBriefV2;
const slotId = brief.portfolioSlotId.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const refreshedAt = new Date().toISOString();
const sources = brief.researchNotes.map((note, index) => {
  const match = note.source.match(/https?:\/\/[^\s—]+/);
  if (!match) throw new Error(`Research note ${index} has no URL.`);
  const url = match[0].replace(/[.,;]+$/, '');
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  return {
    id: `source_${index + 1}`,
    url,
    title: `Nguồn nghiên cứu ${brief.portfolioSlotId} số ${index + 1}: ${hostname}`,
    publisher: hostname,
    observedAt: refreshedAt,
  };
});
const openingRequirements = brief.seedConstraints.filter(item =>
  /chương\s*(?:1|một|3|ba)|opening|mở đầu/i.test(item),
);
const serialityRequirements = brief.seedConstraints.filter(item =>
  /30|ba mươi|vòng thưởng|trục|biến hóa|hệ quả/i.test(item),
);
const snapshot = MarketResearchSnapshotV3Schema.parse({
  schemaVersion: 3,
  snapshotId: `${slotId}_research_2026_07`,
  genreLane: brief.genreLane,
  refreshedAt,
  commission: {
    slotId,
    audience: brief.audience,
    desiredExperience: brief.desiredExperience,
    domainOpportunity: brief.domain,
    requiredMechanisms: brief.pleasureProfile.primaryRewardLoop.slice(0, 10),
    openingRequirements: (openingRequirements.length >= 2 ? openingRequirements : brief.seedConstraints).slice(0, 10),
    serialityRequirements: (serialityRequirements.length >= 2 ? serialityRequirements : brief.researchQuestions).slice(0, 10),
    boundaries: brief.boundaries.slice(0, 20),
  },
  sources,
  signals: brief.researchNotes.map((note, index) => ({
    id: `signal_${index + 1}`,
    claim: note.finding,
    sourceIds: [`source_${index + 1}`],
    confidence: 0.8,
  })),
  prohibitedDirectImitation: brief.boundaries.slice(0, 20),
});

mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
writeFileSync(path.resolve(outputPath), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({
  valid: true,
  slotId,
  sources: snapshot.sources.length,
  signals: snapshot.signals.length,
  output: path.resolve(outputPath),
}, null, 2));

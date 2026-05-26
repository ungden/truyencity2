import type { CriticIssue, GenreType } from '../types';
import { getGenreContract, type GenreContractCode } from '../templates/genre-contracts';

export interface GenreContractIssue {
  code: GenreContractCode;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
  evidence?: string;
}

export interface GenreSetupValidationInput {
  genre: GenreType;
  worldDescription?: string | null;
  setupKernel?: unknown;
  masterOutline?: unknown;
  storyOutline?: unknown;
  arcPlan?: unknown;
}

export interface GenreChapterValidationInput {
  genre: GenreType;
  chapterNumber: number;
  content: string;
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(text: string, keyword: string): boolean {
  const nText = normalize(text);
  const nKeyword = normalize(keyword).trim();
  if (!nKeyword) return false;
  if (nKeyword.includes(' ')) return nText.includes(nKeyword);
  // Avoid substring false positives like "huyện" matching "chuyện".
  return new RegExp(`(^|[^\\p{L}])${escapeRegExp(nKeyword)}(?=$|[^\\p{L}])`, 'u').test(nText);
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => containsKeyword(text, keyword));
}

function firstRegexEvidence(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0].slice(0, 180);
  }
  return undefined;
}

export function validateGenreSetupContract(input: GenreSetupValidationInput): GenreContractIssue[] {
  const contract = getGenreContract(input.genre);
  if (!contract) return [];

  const text = [
    input.worldDescription || '',
    asText(input.setupKernel),
    asText(input.masterOutline),
    asText(input.storyOutline),
    asText(input.arcPlan),
  ].join('\n');

  const issues: GenreContractIssue[] = [];
  for (const requirement of contract.setupMustHave) {
    if (!hasAny(text, requirement.keywords)) {
      issues.push({
        code: requirement.code,
        severity: requirement.severity,
        message: requirement.message,
        evidence: `Missing any of: ${requirement.keywords.slice(0, 12).join(', ')}`,
      });
    }
  }

  for (const forbidden of contract.forbidden) {
    const evidence = firstRegexEvidence(text, forbidden.patterns);
    if (evidence) {
      issues.push({
        code: forbidden.code,
        severity: forbidden.severity,
        message: forbidden.message,
        evidence,
      });
    }
  }

  return issues;
}

export function validateGenreChapterContract(input: GenreChapterValidationInput): GenreContractIssue[] {
  const contract = getGenreContract(input.genre);
  if (!contract) return [];

  const issues: GenreContractIssue[] = [];
  const text = input.content || '';
  const minLengthForSignalGate = text.length >= 1200;

  for (const forbidden of contract.forbidden) {
    const evidence = firstRegexEvidence(text, forbidden.patterns);
    if (evidence) {
      issues.push({
        code: forbidden.code,
        severity: forbidden.severity,
        message: forbidden.message,
        evidence,
      });
    }
  }

  if (!minLengthForSignalGate) return issues;

  for (const requirement of contract.chapterMustHave) {
    if (!hasAny(text, requirement.keywords)) {
      issues.push({
        code: requirement.code,
        severity: requirement.severity,
        message: requirement.message,
        evidence: `Missing any of: ${requirement.keywords.slice(0, 12).join(', ')}`,
      });
    }
  }

  return issues;
}

export function genreContractIssuesToCriticIssues(issues: GenreContractIssue[]): CriticIssue[] {
  return issues.map((issue): CriticIssue => ({
    type: issue.code === 'wrong_conflict_channel' ? 'pacing' : issue.code === 'secret_leak' ? 'continuity' : 'quality',
    severity: issue.severity,
    description: `[genre_contract:${issue.code}] ${issue.message}${issue.evidence ? ` Evidence: ${issue.evidence}` : ''}`,
  }));
}

export function formatGenreContractReport(issues: GenreContractIssue[]): string {
  if (issues.length === 0) return 'Genre contract deterministic report: pass';
  return [
    'Genre contract deterministic report: fail',
    ...issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}${issue.evidence ? ` Evidence: ${issue.evidence}` : ''}`),
  ].join('\n');
}

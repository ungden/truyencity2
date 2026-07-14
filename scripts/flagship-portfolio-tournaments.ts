import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { callGemini } from '../src/services/story-engine/utils/gemini';
import { ConceptTournamentArtifactV2Schema, FlagshipSetupBriefV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { generateConceptTournamentV2, type FlagshipSetupCall } from '../src/services/story-engine/flagship/setup';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import { FLAGSHIP_OPENING_COHORT_BRIEFS_V2 } from '../src/services/story-engine/flagship/portfolio-setup-briefs-data';

const root = process.cwd();
const outputRoot = path.join(root, 'blueprints/flagship-portfolio-v1/tournaments');
const routesPath = path.join(root, 'blueprints/flagship-portfolio-v1/model-routes-v2.json');
const requested = process.argv.find(value => value.startsWith('--slot='))?.slice('--slot='.length) || 'all';
const dryRun = process.argv.includes('--dry-run');
const exportOnly = process.argv.includes('--export-review-only');

const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(routesPath, 'utf8')));
const allSlotIds = Object.keys(FLAGSHIP_OPENING_COHORT_BRIEFS_V2).sort();
const slotIds = requested === 'all' ? allSlotIds : requested.split(',').map(value => value.trim()).filter(Boolean);
for (const slotId of slotIds) {
  if (!FLAGSHIP_OPENING_COHORT_BRIEFS_V2[slotId]) throw new Error(`Unknown opening cohort slot ${slotId}. Expected one of ${allSlotIds.join(', ')}.`);
}

function jsonFile(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hashCall(call: FlagshipSetupCall, model: string): string {
  return createHash('sha256').update(JSON.stringify({ role: call.role, candidateId: call.candidateId || null, model, thinkingLevel: thinkingLevelFor(call), maxTokens: maxTokensFor(call), responseJsonSchema: call.responseJsonSchema, systemPrompt: call.systemPrompt, userPrompt: call.userPrompt })).digest('hex');
}

function thinkingLevelFor(call: FlagshipSetupCall): 'low' | 'medium' | 'high' {
  return call.role === 'concept_lab' ? 'low' : call.role === 'concept_judge' ? 'high' : 'medium';
}

function maxTokensFor(call: FlagshipSetupCall): number {
  return ['concept_lab', 'concept_judge', 'opening_simulator', 'launch_architect'].includes(call.role) ? 32768 : 24576;
}

function cachePath(slotId: string, call: FlagshipSetupCall): string {
  const suffix = call.candidateId ? `-${call.candidateId}` : '';
  return path.join(outputRoot, slotId.toLowerCase(), 'checkpoints', `${call.role}${suffix}.json`);
}

async function invokeWithCheckpoint(slotId: string, call: FlagshipSetupCall): Promise<string> {
  const model = call.role === 'concept_judge' ? routes.setupJudge : routes.setupCreative;
  const promptHash = hashCall(call, model);
  const filePath = cachePath(slotId, call);
  if (existsSync(filePath)) {
    const cached = JSON.parse(readFileSync(filePath, 'utf8')) as { promptHash?: string; model?: string; content?: string };
    if (cached.promptHash === promptHash && cached.model === model && typeof cached.content === 'string') {
      console.log(`[${slotId}] checkpoint ${call.role}${call.candidateId ? `:${call.candidateId}` : ''}`);
      return cached.content;
    }
  }
  console.log(`[${slotId}] call ${call.role}${call.candidateId ? `:${call.candidateId}` : ''} via ${model}`);
  const response = await callGemini(call.userPrompt, {
    model,
    temperature: call.role === 'opening_simulator' ? 0.7 : 0.35,
    maxTokens: maxTokensFor(call),
    thinkingLevel: thinkingLevelFor(call),
    responseJsonSchema: call.responseJsonSchema,
    systemPrompt: call.systemPrompt,
  }, { jsonMode: true, disableRouting: true });
  if (response.finishReason === 'MAX_TOKENS') throw new Error(`${slotId} ${call.role} hit MAX_TOKENS before the typed artifact completed; classified as infra_blocked and no content fallback is allowed.`);
  if (!response.content.trim()) throw new Error(`${slotId} ${call.role} returned empty content; no fallback is allowed.`);
  jsonFile(filePath, {
    schemaVersion: 1,
    slotId,
    role: call.role,
    candidateId: call.candidateId || null,
    model,
    promptHash,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    finishReason: response.finishReason,
    content: response.content,
  });
  return response.content;
}

function blindCode(slotId: string, index: number): string {
  return `${slotId.replace('-', '')}-${String.fromCharCode(65 + index)}`;
}

function exportReviewPacket(): void {
  const indexLines = [
    '# Flagship opening blind review — 9 → 3',
    '',
    'Không hiển thị model, điểm Concept Judge, tên concept hoặc thứ hạng nội bộ. Mỗi hồ sơ gồm ba opening liền chương 1–3.',
    '',
    '## Rubric bắt buộc (1–5)',
    '',
    '- `opening_pull`: chương một buộc muốn đọc tiếp bằng lựa chọn và hậu quả, không chỉ bí ẩn từ khóa.',
    '- `world_specificity`: cảnh chỉ có thể xảy ra trong thế giới này; đổi tên bối cảnh là không dùng lại được.',
    '- `protagonist_agency`: main tự nhận ra, chọn chiến thuật và trả giá.',
    '- `causal_reward`: payoff có nguồn và làm đổi tài sản, quan hệ, quyền lực hoặc hiểu biết.',
    '- `character_life`: nhân vật phụ có nhu cầu, giọng và phản ứng riêng.',
    '- `seriality_30`: ba chương mở ra động cơ biến hóa ít nhất 30 chương.',
    '- `prose_naturalness`: văn và thoại Việt tự nhiên, không sáo AI hoặc giọng thuyết minh checklist.',
    '- `read_chapter_4`: mức muốn đọc chương bốn.',
    '',
    'Critical fail: canon/logic vỡ, tiền-vật tư vô nguồn, main bị dắt mũi kéo dài, đối thủ ngu để bị vả, hoặc thế giới chỉ là đổi tên trope.',
    '',
    'Mỗi slot chọn tối đa một opening. Sau đó chọn đúng ba slot: một huyền huyễn, một tiên hiệp và một commercial winner.',
    '',
    '## Hồ sơ',
    '',
  ];
  const privateMap: Array<{ blindCode: string; slotId: string; candidateId: string }> = [];
  let exported = 0;
  for (const slotId of allSlotIds) {
    const artifactPath = path.join(outputRoot, slotId.toLowerCase(), 'tournament.json');
    if (!existsSync(artifactPath)) continue;
    const artifact = ConceptTournamentArtifactV2Schema.parse(JSON.parse(readFileSync(artifactPath, 'utf8')));
    const slotLines = [`# Blind review ${slotId}`, '', 'Chấm từng opening độc lập trước khi so sánh ba bản.', ''];
    artifact.openings.forEach((opening, index) => {
      const code = blindCode(slotId, index);
      privateMap.push({ blindCode: code, slotId, candidateId: opening.candidateId });
      slotLines.push(`## ${code}`, '');
      for (const chapter of [...opening.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)) {
        slotLines.push(`### Chương ${chapter.chapterNumber}: ${chapter.title}`, '', chapter.prose, '');
      }
      slotLines.push('### Phiếu chấm', '', '| Trục | Điểm 1–5 | Evidence ngắn |', '| --- | ---: | --- |', '| opening_pull |  |  |', '| world_specificity |  |  |', '| protagonist_agency |  |  |', '| causal_reward |  |  |', '| character_life |  |  |', '| seriality_30 |  |  |', '| prose_naturalness |  |  |', '| read_chapter_4 |  |  |', '| critical_fail | yes/no |  |', '');
    });
    const reviewPath = path.join(outputRoot, slotId.toLowerCase(), 'blind-review.md');
    writeFileSync(reviewPath, `${slotLines.join('\n').trimEnd()}\n`, 'utf8');
    indexLines.push(`- [${slotId}](./tournaments/${slotId.toLowerCase()}/blind-review.md)`);
    exported += 1;
  }
  indexLines.push('', `Đã xuất ${exported}/9 hồ sơ tournament.`, '');
  writeFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/blind-review-index.md'), `${indexLines.join('\n').trimEnd()}\n`, 'utf8');
  jsonFile(path.join(outputRoot, 'private-candidate-map.json'), { schemaVersion: 1, mappings: privateMap });
}

async function main(): Promise<void> {
  mkdirSync(outputRoot, { recursive: true });
  if (!exportOnly) {
    for (const slotId of slotIds) {
      const brief = FlagshipSetupBriefV2Schema.parse(FLAGSHIP_OPENING_COHORT_BRIEFS_V2[slotId]);
      const slotRoot = path.join(outputRoot, slotId.toLowerCase());
      jsonFile(path.join(slotRoot, 'setup-brief-v2.json'), brief);
      if (dryRun) {
        console.log(`[${slotId}] brief valid; dry run skips model calls.`);
        continue;
      }
      const tournamentPath = path.join(slotRoot, 'tournament.json');
      if (existsSync(tournamentPath)) {
        ConceptTournamentArtifactV2Schema.parse(JSON.parse(readFileSync(tournamentPath, 'utf8')));
        console.log(`[${slotId}] tournament already complete.`);
        continue;
      }
      const result = await generateConceptTournamentV2(brief, { invoke: call => invokeWithCheckpoint(slotId, call) });
      jsonFile(tournamentPath, result.artifact);
      jsonFile(path.join(slotRoot, 'run-manifest.json'), {
        schemaVersion: 1,
        slotId,
        status: result.artifact.status,
        promptVersion: result.artifact.promptVersion,
        benchmarkId: result.artifact.benchmarkId,
        callRoles: result.callRoles,
        modelRoutes: { setupCreative: routes.setupCreative, setupJudge: routes.setupJudge },
        databaseWrites: 0,
        productionProjectsChanged: false,
      });
      console.log(`[${slotId}] saved three openings; awaiting blind review.`);
    }
  }
  exportReviewPacket();
  console.log(JSON.stringify({ requestedSlots: slotIds, dryRun, exportOnly, outputRoot, productionWrites: 0 }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
